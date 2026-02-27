// Entry point. Checks FTUE flag, boots FTUE or Game
import './visuals/styles.css'
import './visuals/styles/chamber.css'
import { State } from './state.js'
import * as gameLoop from './gameLoop.js'
import { init as initInput } from './core/inputHandler.js'
import { initPowerups } from './powerups/powerupManager.js'
import { ftueManager } from './ftue/ftueManager.js'
import { resetGame, fillAmmoQueue } from './core/orbManager.js'
import { FLOOR_OFFSET, SPAWN_Y } from './config.js'
import { LeaderboardManager } from './leaderboard/leaderboardManager.js'
import { LeaderboardUI } from './leaderboard/ui/leaderboardUI.js'
import { GearBackground } from './visuals/Background/GearBackground.js'
import { GearSystem } from './systems/GearSystem.js'
import { SystemBot } from './ui/systemBot.js'
import { initLoadingOption1 } from './ui/loading-opt1.js'

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

  // Init leaderboard (non-blocking - game starts regardless)
  LeaderboardManager.init().catch(err => {
    console.warn('[Leaderboard] Init failed silently:', err)
  })
  LeaderboardUI.init()

  // Wire leaderboard toggle button
  const lbToggleBtn = document.getElementById('lb-toggle-btn')
  if (lbToggleBtn) {
    lbToggleBtn.addEventListener('click', () => LeaderboardUI.toggle())
  }

  // Init gear background (SVG, full-screen, persistent)
  GearBackground.init()
  GearSystem.init()
  SystemBot.init()
  initLoadingOption1()

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
  const uiOffset = 140 // reserve top space for score and progression bar

  if (container.clientWidth > 600) {
    State.canvas.width = 400
    State.canvas.height = Math.max(300, (container.clientHeight * 0.95) - uiOffset)
  } else {
    State.canvas.width = container.clientWidth
    State.canvas.height = Math.max(300, container.clientHeight - uiOffset)
  }
  State.canvas.style.marginTop = `${uiOffset}px`
  State.gameWidth = State.canvas.width
  State.gameHeight = State.canvas.height
  State.mainFloorY = State.gameHeight - FLOOR_OFFSET
  State.scale = State.canvas.width / 500
  State.shooterPos = { x: State.canvas.width / 2, y: SPAWN_Y }

  // Position vertical heat bar and chamber-ui perfectly on the canvas
  const hc = document.getElementById('vertical-heat-container')
  const chamberUI = document.getElementById('chamber-ui')
  if (chamberUI) {
    chamberUI.style.left = State.canvas.offsetLeft + 'px'
    chamberUI.style.width = State.canvas.width + 'px'
    chamberUI.style.top = (State.canvas.offsetTop + State.mainFloorY) + 'px'
  }
  if (hc) {
    hc.style.left = State.canvas.offsetLeft + 'px'
    hc.style.top = State.canvas.offsetTop + 'px'
    hc.style.height = State.canvas.height + 'px'
  }

  // Restrict frosted glass exactly to game bucket bounds
  const bd = document.getElementById('glass-backdrop')
  if (bd) {
    bd.style.left = State.canvas.offsetLeft + 'px'
    bd.style.top = State.canvas.offsetTop + 'px'
    bd.style.width = State.canvas.width + 'px'
    bd.style.height = State.canvas.height + 'px'
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// ─── REQUISITION POPUP (Handled in powerupManager.js) ───────────────────