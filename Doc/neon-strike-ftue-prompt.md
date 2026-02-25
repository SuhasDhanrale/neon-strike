# 🎮 NEON STRIKE — FTUE IMPLEMENTATION PROMPT
### VS Code AI Agent — Silent First-Run Experience

> **SCOPE:** This prompt covers ONLY the FTUE system. The game architecture refactor and HUD redesign are handled in separate prompts. Do not touch game logic, physics, scoring, or HUD files.

---

## 🎯 THE CONCEPT IN ONE SENTENCE

On first launch, two identical orbs are pre-placed at mid-screen. The shooter pulses. The player fires. The merge explodes. The game begins. No text. No popups. No pausing.

---

## 📐 WHAT THIS TEACHES (WITHOUT WORDS)

| What happens | What the player learns |
|---|---|
| Shooter pulses on load | "That's where I interact" |
| Two identical orbs waiting | "Something is already here" |
| Player fires near them | Agency established |
| Merge fires with big pop + score float | "Same value + collision = reward" |
| Game continues without interruption | "I'm already playing" |

**Nothing else is taught. Everything else is discovered through play.**

---

## 📁 FILES TO CREATE / MODIFY

```
src/ftue/ftueManager.js     ← Create. Owns all FTUE logic.
src/ftue/ftueOverlay.js     ← Create. Shooter pulse visual only.
src/main.js                 ← Modify. Check FTUE flag on boot.
src/core/orbManager.js      ← Modify. Add placeFTUEOrbs() function.
src/visuals/orbRenderer.js  ← Modify. Add shooter pulse render.
```

**Do NOT touch:** `state.js`, `config.js`, `physics.js`, `heatSystem.js`, `scoring.js`, `uiRenderer.js`, `styles.css`

---

## ⚙️ FULL IMPLEMENTATION SPEC

---

### STEP 1 — `src/ftue/ftueManager.js`

```js
import { State } from '../state.js'
import { EventBus } from '../eventBus.js'
import { placeFTUEOrbs, clearFTUEOrbs } from '../core/orbManager.js'
import { ftueOverlay } from './ftueOverlay.js'

const FTUE_KEY = 'neonStrike_ftueComplete'

// ─── PUBLIC API ──────────────────────────────────────

export const ftueManager = {

  shouldRun() {
    return !localStorage.getItem(FTUE_KEY)
  },

  start() {
    State.ftueActive = true
    placeFTUEOrbs()
    ftueOverlay.startShooterPulse()

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
```

---

### STEP 2 — `src/ftue/ftueOverlay.js`

This file does exactly ONE visual thing: pulses the shooter dot.

No scrim. No tooltip card. No highlight boxes. No DOM overlays.
The pulse is drawn directly onto the game canvas by `orbRenderer.js` reading a state flag.

```js
import { State } from '../state.js'

export const ftueOverlay = {

  startShooterPulse() {
    State.shooterPulseActive = true
    State.shooterPulseFrame = 0
  },

  stopShooterPulse() {
    State.shooterPulseActive = false
    State.shooterPulseFrame = 0
  }
}
```

That's the entire file. The rendering lives in `shooterRenderer.js`.

---

### STEP 3 — `src/core/orbManager.js` — ADD TWO FUNCTIONS

Add these two functions. Do not change anything else in this file.

```js
// ─── FTUE ORB PLACEMENT ──────────────────────────────

const FTUE_ORB_TAG = '__ftue__'

export function placeFTUEOrbs() {
  // Two orbs, same type (value: 2, typeIndex: 0)
  // Placed at horizontal center, vertical mid-screen
  // Close enough together that almost any shot toward center causes a merge
  // NOT near the danger line. NOT near the bottom. Center stage.

  const cx = State.canvas.width / 2
  const cy = State.canvas.height * 0.52    // Just below center — in the action zone
  const gap = 52 * State.scale             // Slightly more than one orb diameter apart

  const leftOrb  = new Orb(cx - gap, cy, 0, false, AMMO_TYPES.STANDARD)
  const rightOrb = new Orb(cx + gap, cy, 0, false, AMMO_TYPES.STANDARD)

  // Give them a tiny resting velocity so they look alive, not frozen
  leftOrb.vx  = 0.3
  rightOrb.vx = -0.3
  leftOrb.vy  = 0
  rightOrb.vy = 0

  // Tag them so clearFTUEOrbs() can find them later
  leftOrb._isFtueOrb  = true
  rightOrb._isFtueOrb = true

  // Mark as already collided so game-over detection ignores them immediately
  leftOrb.hasCollided  = true
  rightOrb.hasCollided = true

  State.orbs.push(leftOrb, rightOrb)
}

export function clearFTUEOrbs() {
  // Remove any unmerged FTUE orbs quietly — no particles, no score
  State.orbs = State.orbs.filter(orb => !orb._isFtueOrb)
}
```

**Placement rationale (do not move these):**
- `cy = canvas.height * 0.52` — vertical center of playfield. Visible, prominent, impossible to miss.
- `gap = 52 * scale` — one orb width apart. A shot anywhere near center will push them together.
- NOT at `mainFloorY - X` — that's near the danger line. Avoid it.
- NOT at `SPAWN_Y + X` — that's too close to the shooter. Feels cramped.

---

### STEP 4 — `src/visuals/shooterRenderer.js` — ADD PULSE RENDER

Inside the existing `draw(ctx)` function in `shooterRenderer.js`, add this block **before** drawing the shooter dot:

```js
// ─── FTUE SHOOTER PULSE ──────────────────────────────
// Draws an expanding ring around the shooter to invite interaction.
// Only active during FTUE. Completely removed after completion.

if (State.shooterPulseActive) {
  State.shooterPulseFrame = (State.shooterPulseFrame || 0) + 1

  // Two rings, offset by half a cycle, so one is always mid-expand
  drawPulseRing(ctx, State.shooterPos, State.shooterPulseFrame)
  drawPulseRing(ctx, State.shooterPos, State.shooterPulseFrame + 30)
}

function drawPulseRing(ctx, pos, frame) {
  // Ring expands from radius 14 to 44 over 60 frames, then repeats
  const progress = (frame % 60) / 60           // 0 → 1
  const radius   = 14 + (progress * 30)        // 14px → 44px
  const alpha    = (1 - progress) * 0.6        // Fades out as it expands

  ctx.save()
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(0, 243, 255, ${alpha})`
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}
```

**Rules for this pulse:**
- Renders on canvas, not DOM — no z-index issues, no layout impact
- Two rings offset by 30 frames so there's always one mid-cycle (never a gap)
- Alpha fades to 0 at full expansion — never harsh
- Stops the instant `ftueOverlay.stopShooterPulse()` is called — zero cleanup needed
- Uses the existing accent color (`rgba(0, 243, 255)`) — consistent with the game's visual language

---

### STEP 5 — `src/main.js` — BOOT LOGIC

In `main.js`, replace the game boot sequence with this:

```js
import { ftueManager } from './ftue/ftueManager.js'

function boot() {
  // ... existing canvas setup, resize, initPowerups, inputHandler.init ...

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

  gameLoop.start()
}
```

**Key point:** `resetGame()` runs first in both paths. FTUE is purely additive — it places two extra orbs and starts a pulse. It does not intercept, pause, or modify the game loop in any way.

---

### STEP 6 — `src/eventBus.js` — VERIFY THESE EVENTS ARE EMITTED

The FTUE listens for two events. Confirm they are emitted in the correct places:

```js
// In orbManager.js → spawnOrb() — after orb is pushed to State.orbs:
EventBus.emit('orb:spawned', orb)

// In physics.js → resolveCollisions() — after merge is confirmed,
// BEFORE the new merged orb is created:
EventBus.emit('orb:merged', { x: mx, y: my, newTypeIndex: newType })
```

If these don't exist yet, add them. If they already exist from the architecture refactor, verify they fire at the right moment.

---

## 🎨 THE MERGE MOMENT — VISUAL SPEC

When `orb:merged` fires during FTUE, the existing merge visuals already handle it:
- `createParticles()` fires automatically from `resolveCollisions()`
- `createFloatingText()` shows the score
- `screenShake` triggers

This is enough. Do NOT add extra FTUE-specific merge effects.
The existing visual system is already satisfying. Trust it.

---

## 🧪 EDGE CASES — HANDLE ALL OF THESE

| Scenario | Correct behaviour |
|---|---|
| Player fires wide, misses both orbs completely | Shot 1 of 3 used. Orbs stay. Game continues. |
| Player fires 3 shots, never merges | `shotWatcher` fires `complete()`. FTUE orbs quietly removed. Game continues normally. |
| Player merges something other than the FTUE orbs | `orb:merged` fires. FTUE completes. Any remaining FTUE orbs cleared quietly. |
| Player returns after completing FTUE | `shouldRun()` returns false. FTUE never starts. `resetGame()` called directly. |
| `localStorage` cleared mid-session | FTUE runs again on next refresh. This is correct behaviour. |
| Screen resized during FTUE | `handleResize()` fires normally. FTUE orbs reposition because they use `State.canvas.width/height` — they're live objects in the physics sim, not fixed coordinates. |
| Player fires immediately before pulse appears | Fine. Input is never blocked. The pulse is decoration, not a gate. |

---

## ⚠️ CRITICAL RULES

1. **The game loop never pauses.** Physics runs. Heat builds. Everything is live. FTUE is purely additive.

2. **No text. No popups. No overlays.** The only FTUE visual is the shooter pulse rings on canvas. That's it.

3. **FTUE can never cause a game over.** The two placed orbs have `hasCollided = true` and are placed at mid-screen. They will never satisfy the game-over condition before the player shoots.

4. **The fallback (3 shots) must always work.** A player who ignores the orbs entirely still gets a clean game start. FTUE never blocks progress.

5. **`clearFTUEOrbs()` is silent.** No particles, no floating text, no score. Just removal. The player should never notice unmerged orbs disappearing.

6. **Do not teach heat, skills, chamber, or ammo in this FTUE.** Those are discovered through play. Scope is: merge exists. That's the entire lesson.

7. **`ftueManager.reset()` must work from browser console** for development. `window.ftueManager = ftueManager` in main.js during dev builds.

---

## ✅ DELIVERY CHECKLIST

- [ ] First load: shooter pulses, two identical orbs at mid-screen
- [ ] Pulse is two expanding cyan rings, offset, fading
- [ ] Player fires toward orbs — merge triggers with existing visual pop
- [ ] After merge: pulse stops, FTUE orbs cleared, `localStorage` flag set, game continues without interruption
- [ ] Player fires 3 shots without merge: FTUE completes silently, orbs cleared
- [ ] Second load: no pulse, no pre-placed orbs, straight into game
- [ ] `localStorage.removeItem('neonStrike_ftueComplete')` + refresh replays FTUE correctly
- [ ] No console errors during or after FTUE
- [ ] No frame drop during pulse render
- [ ] Resize during FTUE does not break orb positions or pulse
