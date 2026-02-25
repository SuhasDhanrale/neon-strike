// resolveCollisions() only. Pure physics math.
import { State } from '../state.js'
import { EventBus } from '../eventBus.js'
import { ORB_TYPES, AMMO_TYPES } from '../config.js'
import { Orb, spawnChamberBatch, awardAmmo } from './orbManager.js'
import { addEnergy, addScore, handleCombo } from './scoring.js'
import { createParticles, createFloatingText } from '../visuals/particleSystem.js'
import { showCombo, hideCombo } from '../visuals/uiRenderer.js'
import { THEME } from '../visuals/theme.js'

export function resolveCollisions() {
  for (let i = 0; i < State.orbs.length; i++) {
    for (let j = i + 1; j < State.orbs.length; j++) {
      let o1 = State.orbs[i]
      let o2 = State.orbs[j]

      // Chamber Segregation - Chamber orbs cannot collide with active bucket orbs
      if (o1.inChamber !== o2.inChamber) continue
      if (o1.isHydraulicLifting || o2.isHydraulicLifting) continue

      // Piercing ghost ignores collisions
      if ((o1.ammoType === 'PIERCE' && o1.ghostTimer > 0) ||
        (o2.ammoType === 'PIERCE' && o2.ghostTimer > 0)) {
        continue
      }

      let dx = o2.x - o1.x
      let dy = o2.y - o1.y
      let distSq = dx * dx + dy * dy
      let rSum = o1.radius + o2.radius

      if (distSq < rSum * rSum) {
        let rvx = o2.vx - o1.vx
        let rvy = o2.vy - o1.vy
        let vRel = Math.sqrt(rvx * rvx + rvy * rvy)

        // Geode Cracking
        if (o1.isGeode || o2.isGeode) {
          if (vRel > 15) {
            if (o1.isGeode) o1.hp--
            if (o2.isGeode) o2.hp--
            createParticles((o1.x + o2.x) / 2, (o1.y + o2.y) / 2, '#fff')
            State.screenShake += 5
            if (o1.isGeode && o1.hp <= 0) {
              o1.markedForDeletion = true
              createFloatingText(o1.x, o1.y, "CRACKED!", THEME.floatingTextColors.cracked, 36)
              addEnergy(20)
              awardAmmo(AMMO_TYPES.PIERCE)
              EventBus.emit('orb:geode_cracked', o1)
            }
            if (o2.isGeode && o2.hp <= 0) {
              o2.markedForDeletion = true
              createFloatingText(o2.x, o2.y, "CRACKED!", THEME.floatingTextColors.cracked, 36)
              addEnergy(20)
              awardAmmo(AMMO_TYPES.PIERCE)
              EventBus.emit('orb:geode_cracked', o2)
            }
          }
        }

        // Merge Logic (ONLY if neither is Frosted and neither is Geode)
        if (!o1.isFrosted && !o2.isFrosted && !o1.isGeode && !o2.isGeode &&
          o1.typeIndex === o2.typeIndex && !o1.markedForDeletion && !o2.markedForDeletion) {

          const mx = (o1.x + o2.x) / 2
          const my = (o1.y + o2.y) / 2
          o1.markedForDeletion = true
          o2.markedForDeletion = true

          let newType = Math.min(o1.typeIndex + 1, ORB_TYPES.length - 1)
          createParticles(mx, my, ORB_TYPES[newType].color)
          State.screenShake = Math.min(State.screenShake + newType * 3, 25)

          if (newType > State.maxUnlockedOrbIndex) {
            State.maxUnlockedOrbIndex = newType
            EventBus.emit('unlocked:orb', { typeIndex: newType, x: mx, y: my })
          }

          let baseScore = ORB_TYPES[newType].value
          addEnergy(baseScore / 4)

          // Combo handling - use scoring module
          baseScore = handleCombo(baseScore)
          addEnergy(5)

          addScore(baseScore)

          // Visual feedback through uiRenderer
          if (State.comboCount > 1) {
            showCombo(State.comboCount)
            createFloatingText(mx, my, `×${State.comboCount}`, THEME.floatingTextColors.combo, 72)
          } else {
            hideCombo()
            createFloatingText(mx, my, `+${baseScore}`, THEME.floatingTextColors.score, 28)
          }

          setTimeout(() => {
            let newOrb = new Orb(mx, my, newType, false, AMMO_TYPES.STANDARD)
            newOrb.vx = (o1.vx + o2.vx) * 0.5
            newOrb.vy = -3
            newOrb.hasCollided = true
            State.orbs.push(newOrb)
            EventBus.emit('orb:merged', { newOrb, x: mx, y: my })
          }, 0)

          continue
        }

        // Physics Response (Bounce)
        let dist = Math.sqrt(distSq)
        let overlap = rSum - dist
        let nx = dx / dist
        let ny = dy / dist
        let moveX = nx * overlap * 0.5
        let moveY = ny * overlap * 0.5

        let m1 = o1.mass
        let m2 = o2.mass
        let totalM = m1 + m2
        let r1 = m2 / totalM
        let r2 = m1 / totalM

        o1.x -= moveX * r1 * 2
        o1.y -= moveY * r1 * 2
        o2.x += moveX * r2 * 2
        o2.y += moveY * r2 * 2

        let velAlongNormal = rvx * nx + rvy * ny
        if (velAlongNormal > 0) continue

        let e = 0.5
        if (o1.isFrosted || o2.isFrosted) e = 0.3

        let jVal = -(1 + e) * velAlongNormal
        jVal /= (1 / m1 + 1 / m2)

        let impulseX = jVal * nx
        let impulseY = jVal * ny

        o1.vx -= impulseX / m1
        o1.vy -= impulseY / m1
        o2.vx += impulseX / m2
        o2.vy += impulseY / m2
      }
    }
  }
}
