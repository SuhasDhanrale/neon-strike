// requestAnimationFrame orchestrator. Calls update() then draw()
import { State } from './state.js'
import { resolveCollisions } from './core/physics.js'
import { updateParticles } from './visuals/particleSystem.js'
import { updateScreenShake } from './visuals/vfxHelpers.js'
import { updateComboTimer } from './core/scoring.js'
import { draw } from './visuals/renderer.js'
import { SUBSTEPPING_ITERATIONS } from './config.js'
import { GearBackground } from './visuals/Background/GearBackground.js'
import { GearSystem } from './systems/GearSystem.js'
import { uiRenderer } from './visuals/uiRenderer.js'

let running = false
let lastTime = 0

function update() {
  if (State.isGameOver || State.isPaused) return

  // Sub-stepping for physics stability
  for (let s = 0; s < SUBSTEPPING_ITERATIONS; s++) {
    State.orbs.forEach(orb => orb.update())
    resolveCollisions()
  }

  // Remove deleted orbs
  State.orbs = State.orbs.filter(orb => !orb.markedForDeletion)

  // Update particles
  updateParticles()

  // Update combo timer
  updateComboTimer()

  // Update shot cooldown
  if (State.shotCooldown > 0) State.shotCooldown--

  // Update screen shake
  updateScreenShake()

  // Increment frame count
  State.frameCount++
}

function loop(timestamp) {
  if (!running) return

  update()
  draw()

  // Update gear background each frame (driven by GearSystem)
  GearBackground.update(GearSystem.getActiveGears())

  // Process energy drain animation even when the game is paused
  if (GearSystem.isDrainingEnergy()) {
    GearSystem.tickUI()
    uiRenderer.updateEnergyBar()
  }

  requestAnimationFrame(loop)
}

export function start() {
  if (running) return
  running = true
  requestAnimationFrame(loop)
}

export function stop() {
  running = false
}

export function isRunning() {
  return running
}

export default { start, stop, isRunning }