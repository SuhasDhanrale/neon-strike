// Entry point. Checks FTUE flag, boots FTUE or Game
import './visuals/styles.css'
import { State } from './state.js'
import * as gameLoop from './gameLoop.js'
import { init as initInput } from './core/inputHandler.js'
import { initPowerups } from './powerups/powerupManager.js'
import { ftueManager } from './ftue/ftueManager.js'
import { resetGame, fillAmmoQueue } from './core/orbManager.js'
import { FLOOR_OFFSET, SPAWN_Y } from './config.js'

function init() {
  // Canvas setup
  State.canvas = document.getElementById('gameCanvas')
  State.ctx = State.canvas.getContext('2d')

  // Initial resize
  handleResize()
  window.addEventListener('resize', handleResize)

  // Wire up skill buttons to powerupManager
  initPowerups()
  
  // Wire input
  initInput(State.canvas)
  
  // Expose resetGame globally for the game-over button
  window.resetGame = resetGame

  // Check FTUE
  if (ftueManager.shouldRun()) {
    // Start FTUE mode:
    // - resetGame() runs normally (sets up ammo queue, geodes, chamber batch)
    // - THEN placeFTUEOrbs() adds the two demo orbs on top
    // - THEN shooter pulse starts
    // The game loop is already running. Nothing is paused.
    resetGame()
    ftueManager.start()
  } else {
    resetGame()
  }

  // Start loop
  gameLoop.start()
}

function handleResize() {
  const container = document.getElementById('game-container')
  if (container.clientWidth > 600) {
    State.canvas.width = 400
    State.canvas.height = container.clientHeight * 0.95
  } else {
    State.canvas.width = container.clientWidth
    State.canvas.height = container.clientHeight
  }
  State.gameWidth = State.canvas.width
  State.gameHeight = State.canvas.height
  State.mainFloorY = State.gameHeight - FLOOR_OFFSET
  State.scale = State.canvas.width / 500
  State.shooterPos = { x: State.canvas.width / 2, y: SPAWN_Y }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}