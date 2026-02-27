// Silent FTUE Manager - No text, no popups, no pausing
import { State } from '../state.js'
import { EventBus } from '../eventBus.js'
import { placeFTUEOrbs, clearFTUEOrbs } from '../core/orbManager.js'
import { ftueOverlay } from './ftueOverlay.js'
import { startShutterFTUE } from './ftue-shutter.js'

const FTUE_KEY = 'neonStrike_ftueComplete'

// ─── PUBLIC API ──────────────────────────────────────

export const ftueManager = {

  shouldRun() {
    return !localStorage.getItem(FTUE_KEY)
  },

  start() {
    State.ftueActive = true

    // Start the FTUE shutter sequence - this blocks the game until player
    // clicks Supply Energy and the gear is unlocked
    startShutterFTUE()

    // The FTUE orbs and shooter pulse will be triggered after the shutter opens
    // via the 'shutter:opened' event listener below

    // Listen for the first merge event
    // If it happens → complete FTUE with celebration
    // This is a ONE-TIME listener. If player never merges, game
    // just continues normally — FTUE completes silently on first shot.
    EventBus.once('orb:merged', () => {
      ftueManager.complete()
    })

    // Fallback: if player fires 3 shots without a merge happening,
    // just complete FTUE silently. Don't hold the game hostage.
    let shotsFired = 0
    const shotWatcher = () => {
      shotsFired++
      if (shotsFired >= 3) {
        EventBus.off('orb:spawned', shotWatcher)
        ftueManager.complete()
      }
    }
    EventBus.on('orb:spawned', shotWatcher)

    // Store the watcher ref so complete() can clean it up
    State._ftueShotWatcher = shotWatcher

    // Listen for the shutter to open - then start orbs and pulse
    EventBus.once('shutter:opened', () => {
      console.log('[FTUE] Shutter opened, starting orbs and pulse')
      placeFTUEOrbs()
      ftueOverlay.startShooterPulse()
    })
  },

  complete() {
    if (!State.ftueActive) return   // Guard against double-fire
    State.ftueActive = false

    // Clean up listeners
    EventBus.off('orb:spawned', State._ftueShotWatcher)
    State._ftueShotWatcher = null

    // Stop pulse
    ftueOverlay.stopShooterPulse()

    // Mark done permanently
    localStorage.setItem(FTUE_KEY, 'true')

    // Clear FTUE orbs that weren't merged
    // (if player fired wide and didn't trigger merge, tidy up)
    clearFTUEOrbs()

    // No screen transition. No popup. Game is already running.
    // This function does nothing else. That's intentional.
  },

  reset() {
    // Dev helper — call from console to re-trigger FTUE
    localStorage.removeItem(FTUE_KEY)
    console.log('[FTUE] Reset. Refresh to replay.')
  }
}

// Export named functions for backward compatibility with main.js
export function shouldShowFTUE() {
  return ftueManager.shouldRun()
}

export function startFTUE() {
  return ftueManager.start()
}

// Expose globally for dev console access
if (typeof window !== 'undefined') {
  window.ftueManager = ftueManager
}

export default ftueManager
