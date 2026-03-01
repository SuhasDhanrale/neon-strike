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
import { initLoadingOption1, startLoadingSequence } from './ui/loading-opt1.js'
import { initFtueShutter } from './ftue/ftue-shutter.js'
import { SoundManager } from './systems/SoundManager.js'

function init() {
  // Canvas setup
  State.canvas = document.getElementById('gameCanvas')
  State.ctx = State.canvas.getContext('2d')

  // Initial resize
  handleResize()
  window.addEventListener('resize', handleResize)

  // Handle orientation change on mobile devices
  window.addEventListener('orientationchange', () => {
    // Delay to allow orientation to complete and DOM to settle
    setTimeout(handleResize, 100)
  })

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
  initFtueShutter()

  // Init sound system (AudioContext unlocked on first user gesture)
  SoundManager.init()

  // Wire mute button
  const muteBtn = document.getElementById('mute-btn')
  if (muteBtn) {
    const updateMuteVisuals = (isMuted) => {
      muteBtn.textContent = isMuted ? '🔇' : '🔊'
      if (isMuted) {
        muteBtn.classList.add('muted')
      } else {
        muteBtn.classList.remove('muted')
      }
    }
    updateMuteVisuals(SoundManager.isMuted())

    muteBtn.addEventListener('click', () => {
      const nowMuted = SoundManager.toggleMute()
      updateMuteVisuals(nowMuted)
    })
  }

  // Start the loading sequence - game will start after it completes
  startLoadingSequence(() => {
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

    // Start background music (after first interaction, AudioContext already unlocked)
    SoundManager.playMusic('bg_music')

    // Start loop
    gameLoop.start()
  })
}

// ============================================
// RESPONSIVE SCALING - Height-based only
// Reference resolution: 1200px height (game canvas height)
// ============================================
const REF_HEIGHT = 650
const MIN_SCALE = 0.5  // Prevent orbs from being too small on tiny screens
const MAX_SCALE = 1   // Prevent orbs from being too large on huge screens

/**
 * Calculate scale factor based on screen HEIGHT only.
 * Height is used because orbs fall vertically - it's the limiting factor.
 * Clamps to MIN_SCALE/MAX_SCALE bounds for consistent gameplay.
 */
function calculateResponsiveScale() {
  // Scale based on height only - more predictable for vertical gameplay
  const rawScale = State.gameHeight / REF_HEIGHT

  // Clamp to prevent extreme sizes
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale))
}

function handleResize() {
  const container = document.getElementById('game-container')
  const uiOffset = 140 // reserve top space for score and progression bar

  // Use window dimensions for more reliable resize detection
  const winWidth = window.innerWidth
  const winHeight = window.innerHeight

  if (winWidth > 600) {
    State.canvas.width = 400
    State.canvas.height = Math.max(300, (winHeight * 0.95) - uiOffset)
  } else {
    State.canvas.width = winWidth
    State.canvas.height = Math.max(300, winHeight - uiOffset)
  }
  State.canvas.style.marginTop = `${uiOffset}px`
  State.gameWidth = State.canvas.width
  State.gameHeight = State.canvas.height
  State.mainFloorY = State.gameHeight - FLOOR_OFFSET

  // Calculate responsive scale based on reference resolution
  State.scale = calculateResponsiveScale()

  // Update all existing orb sizes on resize
  // This ensures orbs resize when window changes
  State.orbs.forEach(orb => {
    if (orb.isGeode) {
      orb.radius = 40 * State.scale
    } else {
      // Recalculate from base radius to ensure accuracy
      const baseRadius = [40, 45, 50, 55, 60, 65, 75, 80, 85, 90, 95][orb.typeIndex] || 40
      orb.radius = baseRadius * State.scale
    }
    // Update mass to match new radius
    orb.mass = orb.isGeode ? orb.radius * 2 : orb.radius
  })

  State.shooterPos = { x: State.canvas.width / 2, y: SPAWN_Y }

  // Position chamber-ui perfectly on the canvas
  const chamberUI = document.getElementById('chamber-ui')
  if (chamberUI) {
    chamberUI.style.left = State.canvas.offsetLeft + 'px'
    chamberUI.style.width = State.canvas.width + 'px'
    chamberUI.style.top = (State.canvas.offsetTop + State.mainFloorY) + 'px'
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