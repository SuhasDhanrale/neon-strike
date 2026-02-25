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

  if (prevHeat < 80 && State.systemHeat >= 80) {
    EventBus.emit('state:heat_critical')
  }

  if (prevHeat < ERUPTION_HEAT_THRESHOLD && State.systemHeat >= ERUPTION_HEAT_THRESHOLD) {
    triggerEruption()
  }

  return true
}

export function coolHeat(amount) {
  const prevHeat = State.systemHeat
  State.systemHeat -= amount
  State.systemHeat = Math.max(0, Math.min(100, State.systemHeat))

  if (prevHeat >= 80 && State.systemHeat < 80) {
    EventBus.emit('state:heat_stable')
  }
}

export function triggerEruption() {
  State.systemHeat = 0
  EventBus.emit('state:heat_stable')
  State.graceMoves = GRACE_MOVES_AFTER_ERUPTION
  State.eruptionLiftPending = 0

  // Clear any existing screen shake for smooth hydraulic motion
  State.screenShake = 0

  let thawedCount = 0

  // 1. Do NOT launch active orbs - they stay where they are
  // No explosive effects, just hydraulic lift

  // 2. Thaw and queue Chamber Orbs for staged hydraulic lift
  State.orbs.forEach(orb => {
    if (orb.inChamber) {
      orb.isFrosted = false
      orb.mass = ORB_TYPES[orb.typeIndex].radius * State.scale

      // Keep in chamber while pistons extend, then release in Orb.update().
      // Slow, intentional hydraulic lift - 3x slower than before
      orb.hydraulicLiftFrame = 0
      orb.hydraulicLiftDuration = 150 + Math.floor(Math.random() * 60) // 2.5-3.5 seconds at 60fps
      orb.hydraulicStartY = orb.y
      orb.hydraulicTargetY = State.mainFloorY - orb.radius - (10 + Math.random() * 14)
      orb.hydraulicReleaseVy = -3 - (Math.random() * 2) // Gentle release, not explosive
      orb.isHydraulicLifting = true
      orb.vy = 0
      orb.vx = 0 // No horizontal drift - clean lift

      thawedCount++
      // No particles - clean hydraulic motion
    }
  })

  // 3. Refill the chamber after all hydraulic lifts finish
  if (thawedCount > 0) {
    State.eruptionLiftPending = thawedCount
  } else {
    spawnChamberBatch()
  }

  // No visual effects - just the hydraulic lift
  // No screen shake, no eruption class, no floating text, no toast

  updateUI()
  EventBus.emit('eruption:triggered')
}
