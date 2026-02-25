// systemHeat logic, triggerEruption(), spawnChamberBatch()
import { State } from '../state.js'
import { EventBus } from '../eventBus.js'
import { ORB_TYPES, GRACE_MOVES_AFTER_ERUPTION, ERUPTION_HEAT_THRESHOLD } from '../config.js'
import { spawnChamberBatch } from './orbManager.js'
import { createParticles, createFloatingText } from '../visuals/particleSystem.js'
import { showLevelToast, updateUI } from '../visuals/uiRenderer.js'
import { THEME } from '../visuals/theme.js'

export function addHeat(amount) {
  // Grace period is a hard pressure lock: heat cannot increase.
  if (amount > 0 && State.graceMoves > 0) {
    return false
  }
  
  const prevHeat = State.systemHeat
  State.systemHeat += amount
  State.systemHeat = Math.max(0, Math.min(100, State.systemHeat))
  
  if (prevHeat < ERUPTION_HEAT_THRESHOLD && State.systemHeat >= ERUPTION_HEAT_THRESHOLD) {
    triggerEruption()
  }
  
  return true
}

export function coolHeat(amount) {
  State.systemHeat -= amount
  State.systemHeat = Math.max(0, Math.min(100, State.systemHeat))
}

export function triggerEruption() {
  State.systemHeat = 0
  State.graceMoves = GRACE_MOVES_AFTER_ERUPTION
  State.eruptionLiftPending = 0
  
  let thawedCount = 0
  
  // 1. Launch active orbs
  State.orbs.forEach(orb => {
    if (!orb.inChamber) {
      orb.vy = -18 - (Math.random() * 10)
      orb.vx += (Math.random() - 0.5) * 10
    }
  })

  // 2. Thaw and queue Chamber Orbs for staged hydraulic lift
  State.orbs.forEach(orb => {
    if (orb.inChamber) {
      orb.isFrosted = false
      orb.mass = ORB_TYPES[orb.typeIndex].radius * State.scale
      
      // Keep in chamber while pistons extend, then release in Orb.update().
      orb.hydraulicLiftFrame = 0
      orb.hydraulicLiftDuration = 48 + Math.floor(Math.random() * 18)
      orb.hydraulicStartY = orb.y
      orb.hydraulicTargetY = State.mainFloorY - orb.radius - (10 + Math.random() * 14)
      orb.hydraulicReleaseVy = -12 - (Math.random() * 6)
      orb.isHydraulicLifting = true
      orb.vy = 0
      orb.vx += (Math.random() - 0.5) * 1.2
      
      thawedCount++
      createParticles(orb.x, orb.y, 'var(--frost-color)')
    }
  })
  
  // 3. Refill the chamber after all hydraulic lifts finish
  if (thawedCount > 0) {
    State.eruptionLiftPending = thawedCount
  } else {
    spawnChamberBatch()
  }
  
  // Visuals
  const container = document.getElementById('game-container')
  container.classList.add('eruption')
  setTimeout(() => container.classList.remove('eruption'), 1100)
  
  State.screenShake = 24
  createFloatingText(State.canvas.width / 2, 300, "ERUPTION!", THEME.floatingTextColors.eruption, 60)
  showLevelToast("GEOTHERMAL FLUSH", `HYDRAULIC LIFT x${thawedCount}`)
  
  updateUI()
  EventBus.emit('eruption:triggered')
}
