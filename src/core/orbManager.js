// Orb class definition + spawnOrb() + fillAmmoQueue()
import { State } from '../state.js'
import { EventBus } from '../eventBus.js'
import {
  ORB_TYPES, AMMO_TYPES, GEODE_SPAWN_CHANCE, SHOT_COOLDOWN_MS,
  SHOT_COOLDOWN_FRAMES, FRICTION, NORMAL_GRAVITY,
  HEAT_THRESHOLDS, DANGER_LINE_Y, GAME_OVER_SETTLE_SPEED, GAME_OVER_SETTLE_FRAMES
} from '../config.js'
import { addHeat } from './heatSystem.js'
import { updateUI } from '../visuals/uiRenderer.js'
import { LeaderboardManager } from '../leaderboard/leaderboardManager.js'
import { LeaderboardUI } from '../leaderboard/ui/leaderboardUI.js'
import { GearSystem } from '../systems/GearSystem.js'

export class Orb {
  constructor(x, y, typeIndex, isGeode = false, ammoConfig = AMMO_TYPES.STANDARD) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.typeIndex = typeIndex

    this.isGeode = isGeode

    // Chamber Status
    this.inChamber = false
    this.isFrosted = false

    this.ammoType = ammoConfig.id
    this.ghostTimer = 0
    this.hasCollided = false
    this.dangerRestFrames = 0

    // Eruption hydraulic-lift runtime state
    this.hydraulicLiftFrame = 0
    this.hydraulicLiftDuration = 0
    this.hydraulicStartY = 0
    this.hydraulicTargetY = 0
    this.hydraulicReleaseVy = -8
    this.isHydraulicLifting = false

    if (isGeode) {
      this.radius = 40 * State.scale
      this.color = '#555'
      this.glow = '#000'
      this.value = 0
      this.mass = this.radius * 2
      this.hp = 2
    } else {
      this.radius = ORB_TYPES[typeIndex].radius * State.scale
      this.color = ORB_TYPES[typeIndex].color
      this.glow = ORB_TYPES[typeIndex].glow
      this.value = ORB_TYPES[typeIndex].value
      this.mass = this.radius
    }

    if (this.ammoType === 'PIERCE') {
      this.ghostTimer = 60
      this.glow = '#ff00ff'
    }

    this.markedForDeletion = false
  }

  update() {
    if (this.hydraulicLiftDuration > 0) {
      this.runHydraulicLiftStep()
      return
    }

    this.vy += NORMAL_GRAVITY
    this.vx *= FRICTION
    this.vy *= FRICTION
    this.x += this.vx
    this.y += this.vy

    if (this.ghostTimer > 0) this.ghostTimer--

    // Dynamic Floor Check
    let targetFloorY = this.inChamber ? State.gameHeight : State.mainFloorY

    if (this.y + this.radius > targetFloorY) {
      this.y = targetFloorY - this.radius
      this.vy *= -0.5
      this.vx *= 0.9
      this.hasCollided = true
      this.ghostTimer = 0
    }

    // Walls
    if (this.x - this.radius < 0) {
      this.x = this.radius
      this.vx *= -0.5
      this.ghostTimer = 0
    } else if (this.x + this.radius > State.canvas.width) {
      this.x = State.canvas.width - this.radius
      this.vx *= -0.5
      this.ghostTimer = 0
    }

    // Ceiling Bounce
    if (this.y - this.radius < 0) {
      this.y = this.radius
      this.vy *= -0.5
    }

    // Game Over Logic: orb must be settled above danger line for sustained frames.
    const isNearRest =
      Math.abs(this.vx) < GAME_OVER_SETTLE_SPEED &&
      Math.abs(this.vy) < GAME_OVER_SETTLE_SPEED
    const isAboveDangerLine = this.y + this.radius < DANGER_LINE_Y

    if (!this.inChamber && isNearRest && isAboveDangerLine && !State.isAiming && this.hasCollided) {
      this.dangerRestFrames++
      if (this.dangerRestFrames >= GAME_OVER_SETTLE_FRAMES) {
        if (State.orbs.filter(o => !o.inChamber).length > 5 && State.shotCooldown <= 0) {
          endGame()
        }
      }
    } else {
      this.dangerRestFrames = 0
    }
  }

  runHydraulicLiftStep() {
    this.hydraulicLiftFrame++
    this.dangerRestFrames = 0
    const t = Math.min(1, this.hydraulicLiftFrame / this.hydraulicLiftDuration)
    // Smooth ease-in-out for slow, deliberate mechanical motion
    const eased = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2

    this.y = this.hydraulicStartY + ((this.hydraulicTargetY - this.hydraulicStartY) * eased)
    this.vx *= 0.95 // Less horizontal dampening for smoother motion
    this.x += this.vx

    // Keep lifted orb inside horizontal bounds while pistons are active
    if (this.x - this.radius < 0) {
      this.x = this.radius
      this.vx *= -0.2
    } else if (this.x + this.radius > State.canvas.width) {
      this.x = State.canvas.width - this.radius
      this.vx *= -0.2
    }

    if (t >= 1) {
      this.hydraulicLiftDuration = 0
      this.hydraulicLiftFrame = 0
      this.hydraulicStartY = 0
      this.hydraulicTargetY = 0
      this.isHydraulicLifting = false

      // Release into main bucket - no pop, just place on floor
      this.inChamber = false
      this.hasCollided = true
      this.vy = 0 // No upward velocity - just place on floor
      this.vx = 0 // No horizontal velocity

      if (State.eruptionLiftPending > 0) {
        State.eruptionLiftPending--
        if (State.eruptionLiftPending === 0) {
          spawnChamberBatch()
        }
      }
    }
  }

  getDrawData() {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius,
      color: this.color,
      glow: this.glow,
      value: this.value,
      typeIndex: this.typeIndex,
      isGeode: this.isGeode,
      isFrosted: this.isFrosted,
      ammoType: this.ammoType,
      ghostTimer: this.ghostTimer,
      hp: this.hp
    }
  }
}

export function fillAmmoQueue() {
  while (State.ammoQueue.length < 3) {
    State.ammoQueue.push({
      config: AMMO_TYPES.STANDARD,
      orbType: Math.floor(Math.random() * 3)
    })
  }
  updateAmmoUI()
}

export function awardAmmo(type) {
  State.ammoQueue.unshift({
    config: type,
    orbType: Math.floor(Math.random() * 3)
  })
  if (State.ammoQueue.length > 3) State.ammoQueue.pop()
  updateAmmoUI()
  // Import createFloatingText dynamically to avoid circular dependency
  import('../visuals/particleSystem.js').then(({ createFloatingText }) => {
    import('../visuals/theme.js').then(({ THEME }) => {
      createFloatingText(State.shooterPos.x, State.shooterPos.y + 50, "PIERCING ROUND!", THEME.floatingTextColors.piercing, 36)
    })
  })
  State.screenShake = 10
}

function updateAmmoUI() {
  // Ammo UI is now handled by uiRenderer.updateNextShot()
  // This function is kept as a stub to avoid breaking existing calls
  // from fillAmmoQueue() and awardAmmo()
}

export function spawnOrb(angle, power) {
  if (!State.canFire) return

  let shotData = State.ammoQueue.shift()

  // Defensive fallback if queue data is missing
  if (!shotData) {
    fillAmmoQueue()
    shotData = State.ammoQueue.shift()
  }

  fillAmmoQueue()

  let isGeode = Math.random() < GEODE_SPAWN_CHANCE

  const orb = new Orb(State.shooterPos.x, State.shooterPos.y, shotData.orbType, isGeode, shotData.config)
  orb.vx = Math.cos(angle) * power
  orb.vy = Math.sin(angle) * power

  State.orbs.push(orb)
  State.canFire = false
  State.shotCooldown = SHOT_COOLDOWN_FRAMES

  // Geothermal Heat Mechanic
  if (State.graceMoves > 0) {
    State.graceMoves--
  } else {
    // Calculate Population Density (ignore Geodes and Chamber orbs)
    let activeCount = State.orbs.filter(o => !o.isGeode && !o.inChamber).length

    if (activeCount >= HEAT_THRESHOLDS.CRITICAL_COUNT) {
      addHeat(HEAT_THRESHOLDS.CRITICAL_HEAT)
    } else if (activeCount >= HEAT_THRESHOLDS.HOT_COUNT) {
      addHeat(HEAT_THRESHOLDS.HOT_HEAT)
    } else if (activeCount < HEAT_THRESHOLDS.COOL_COUNT) {
      addHeat(-HEAT_THRESHOLDS.COOL_REDUCTION)
    }
  }

  updateUI()
  EventBus.emit('orb:spawned', orb)

  setTimeout(() => { State.canFire = true }, SHOT_COOLDOWN_MS)
}

async function endGame() {
  State.isGameOver = true
  if (State.score > State.bestScore) {
    State.bestScore = State.score
    localStorage.setItem('neonDropBest', State.bestScore)
  }
  document.getElementById('final-score').innerText = State.score
  document.getElementById('game-over-screen').classList.add('active')
  EventBus.emit('game:over')

  // Submit score to leaderboard (fire and forget)
  LeaderboardManager.submit(State.score, {
    heat: State.systemHeat
  }).catch(err => {
    console.warn('[Leaderboard] Submit failed:', err)
  })

  // Show leaderboard after brief delay
  setTimeout(() => {
    LeaderboardUI.showWithScore(State.score)
  }, 800)
}

export function resetGame() {
  State.orbs = []
  State.particles = []
  State.floatingTexts = []
  State.score = 0

  // Do not reset currentEnergy or maxEnergy. They are persistent across games.
  // maxEnergy is managed by GearSystem based on the next gear cost.

  State.comboCount = 0
  State.systemHeat = 0
  State.graceMoves = 0
  State.eruptionLiftPending = 0
  State.isGameOver = false

  for (let k in State.skills) {
    State.skills[k].currentCost = State.skills[k].baseCost
  }

  document.getElementById('score').innerText = '0'
  document.getElementById('game-over-screen').classList.remove('active')

  State.ammoQueue = []
  fillAmmoQueue()

  // Spawn Geodes in Main Area
  for (let i = 0; i < 3; i++) {
    let g = new Orb(
      Math.random() * State.canvas.width,
      State.mainFloorY - 100 - Math.random() * 200,
      0, true
    )
    State.orbs.push(g)
  }

  // Spawn Frosted Bedrock in Chamber
  spawnChamberBatch()

  updateUI()
}

export function spawnChamberBatch() {
  for (let i = 0; i < 5; i++) {
    let typeIdx = Math.floor(Math.random() * 4)
    let spaceX = State.canvas.width / 5
    let nx = (spaceX * i) + (spaceX / 2)

    // Spawn them securely below the main floor line
    let newFrost = new Orb(nx, State.gameHeight - 20, typeIdx, false, AMMO_TYPES.STANDARD)
    newFrost.inChamber = true
    newFrost.isFrosted = true
    newFrost.mass *= 2
    State.orbs.push(newFrost)
  }
}

// ─── FTUE ORB PLACEMENT ──────────────────────────────

export function placeFTUEOrbs() {
  // Two orbs, same type (value: 2, typeIndex: 0)
  // Placed at horizontal center, vertical mid-screen
  // Close enough together that almost any shot toward center causes a merge
  // NOT near the danger line. NOT near the bottom. Center stage.

  const cx = State.canvas.width / 2
  const cy = State.canvas.height * 0.52    // Just below center — in the action zone
  const gap = 52 * State.scale             // Slightly more than one orb diameter apart

  const leftOrb = new Orb(cx - gap, cy, 0, false, AMMO_TYPES.STANDARD)
  const rightOrb = new Orb(cx + gap, cy, 0, false, AMMO_TYPES.STANDARD)

  // Give them a tiny resting velocity so they look alive, not frozen
  leftOrb.vx = 0.3
  rightOrb.vx = -0.3
  leftOrb.vy = 0
  rightOrb.vy = 0

  // Tag them so clearFTUEOrbs() can find them later
  leftOrb._isFtueOrb = true
  rightOrb._isFtueOrb = true

  // Mark as already collided so game-over detection ignores them immediately
  leftOrb.hasCollided = true
  rightOrb.hasCollided = true

  State.orbs.push(leftOrb, rightOrb)
}

export function clearFTUEOrbs() {
  // Remove any unmerged FTUE orbs quietly — no particles, no score
  State.orbs = State.orbs.filter(orb => !orb._isFtueOrb)
}
