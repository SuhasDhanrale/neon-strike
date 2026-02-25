# 🎮 NEON STRIKE: KINETIC MERGE — VS Code AI Agent Refactor Prompt

> **HOW TO USE:** Paste the entire contents of this file into your VS Code AI agent (Cursor, Copilot, Cline, etc.) as your first message. The agent has access to the original `index.html` monolith. This prompt gives it everything it needs to refactor correctly without guessing.

---

## 🎯 MISSION BRIEF

You are refactoring a single-file HTML5 canvas arcade game called **Neon Strike: Kinetic Merge** into a modern, modular architecture using **Vite** as the build tool. The original source file is `index.html` — read it completely before touching anything.

The refactor has 4 goals:
1. **Module architecture** — Clean separation of concerns, every system in its own file
2. **Visual layer isolation** — All rendering is separate from logic so visuals can be swapped independently
3. **Powerup system as a plugin** — Each powerup/skill is self-contained and registered, not hardcoded
4. **FTUE system** — A scripted first-time user experience that runs before the first real game

**Do NOT change any game logic, balance numbers, or physics behaviour during this refactor. Preserve everything exactly. Only reorganise and modularise.**

---

## 📁 TARGET FILE STRUCTURE

Create this exact folder structure inside the project root:

```
neon-strike/
├── index.html                          ← Shell only. No logic. Just mounts #app and loads main.js
├── vite.config.js                      ← Vite config
├── package.json
│
├── src/
│   ├── main.js                         ← Entry point. Checks FTUE flag, boots FTUE or Game
│   ├── gameLoop.js                     ← requestAnimationFrame orchestrator. Calls update() then draw()
│   │
│   ├── state.js                        ← Single exported reactive object: ALL game variables live here
│   ├── config.js                       ← ALL magic numbers, tuning constants, ORB_TYPES, AMMO defs
│   │
│   ├── core/
│   │   ├── inputHandler.js             ← Mouse + touch events. Exports startAim, moveAim, endAim
│   │   ├── orbManager.js               ← Orb class definition + spawnOrb() + fillAmmoQueue()
│   │   ├── physics.js                  ← resolveCollisions() only. Pure physics math.
│   │   ├── heatSystem.js               ← systemHeat logic, triggerEruption(), spawnChamberBatch()
│   │   └── scoring.js                  ← addScore(), addEnergy(), checkLevelUp(), combo logic
│   │
│   ├── powerups/
│   │   ├── powerupManager.js           ← Registry. useSkill(id). Checks cost, deducts energy, calls execute()
│   │   ├── skills/
│   │   │   ├── shake.js                ← SHAKE skill module
│   │   │   ├── smash.js                ← SMASH skill module
│   │   │   └── void.js                 ← VOID skill module
│   │   └── ammo/
│   │       ├── standardAmmo.js         ← Standard ammo module
│   │       └── pierceAmmo.js           ← Pierce ammo module + awardAmmo logic
│   │
│   ├── ftue/
│   │   ├── ftueManager.js              ← Step controller, FTUE boot/complete logic, localStorage flag
│   │   ├── ftueSteps.js                ← Array of step definition objects (content + conditions)
│   │   └── ftueOverlay.js              ← Renders the FTUE UI overlay on top of canvas
│   │
│   └── visuals/
│       ├── renderer.js                 ← Master draw() — calls all sub-renderers in correct layer order
│       ├── theme.js                    ← Color palette, glow configs, CSS variable values
│       ├── chamberRenderer.js          ← Draws geothermal chamber strip + floor line
│       ├── orbRenderer.js              ← Draws each orb (normal, frosted, geode, pierce)
│       ├── shooterRenderer.js          ← Draws shooter dot + aim line
│       ├── particleSystem.js           ← Particle class, FloatingText class, their pools + draw loops
│       ├── uiRenderer.js               ← All DOM manipulation: score, bars, badges, toast, combo display
│       └── vfxHelpers.js              ← screenShake logic, eruption flash, merge flash burst
│
└── assets/
    └── (fonts, future audio, sprites)
```

---

## 📦 VITE SETUP

### `package.json`
```json
{
  "name": "neon-strike",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### `vite.config.js`
```js
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
})
```

### `index.html`
The new index.html is a pure shell. Move all CSS from the original into `src/visuals/styles.css` and import it from `main.js`. The HTML body should only contain:
- The `#game-container` div with its children (canvas, overlays, UI layer, game-over screen)
- `<script type="module" src="/src/main.js"></script>`
- No inline `<script>` blocks at all

---

## 🗂️ MODULE-BY-MODULE IMPLEMENTATION GUIDE

---

### `src/config.js`
Extract ALL of the following from the original file into exported constants. Nothing else lives here:

```js
export const NORMAL_GRAVITY = 0.5
export const FRICTION = 0.99
export const SPAWN_Y = 200
export const MAX_POWER = 35
export const FLOOR_OFFSET = 80
export const GEODE_SPAWN_CHANCE = 0.04
export const SHOT_COOLDOWN_MS = 500
export const SHOT_COOLDOWN_FRAMES = 30
export const CHAMBER_BATCH_SIZE = 5
export const GRACE_MOVES_AFTER_ERUPTION = 5
export const ERUPTION_HEAT_THRESHOLD = 100
export const SUBSTEPPING_ITERATIONS = 4

export const HEAT_THRESHOLDS = {
  CRITICAL_COUNT: 22,   CRITICAL_HEAT: 15,
  HOT_COUNT: 16,        HOT_HEAT: 8,
  WARM_COUNT: 10,       WARM_HEAT: 3,
  COOL_REDUCTION: 5
}

export const LEVEL_THRESHOLDS = [0, 800, 2500, 5000, 10000]
export const ENERGY_PER_LEVEL = 50
export const BASE_MAX_ENERGY = 100

export const ORB_TYPES = [ ...copy array from original... ]

export const AMMO_TYPES = {
  STANDARD: { id: 'STANDARD', icon: '', color: '#fff', prob: 1.0 },
  PIERCE:   { id: 'PIERCE',   icon: '🔻', color: '#f0f', prob: 0.0 }
}

export const SKILLS_CONFIG = {
  1: { id: 1, name: 'Shake', icon: '⚡', label: 'SHAKE', baseCost: 15, mult: 1.3, unlockLevel: 1, heatCost: 30 },
  2: { id: 2, name: 'Smash', icon: '🔨', label: 'SMASH', baseCost: 40, mult: 1.25, unlockLevel: 2, heatCost: 30 },
  3: { id: 3, name: 'Void',  icon: '🌀', label: 'VOID',  baseCost: 80, mult: 1.4,  unlockLevel: 4, heatCost: 30 }
}
```

---

### `src/state.js`
Single exported mutable object. All modules import this and read/write it. No logic here — just the data shape:

```js
import { SKILLS_CONFIG, BASE_MAX_ENERGY } from './config.js'

export const State = {
  // Canvas
  canvas: null,
  ctx: null,
  gameWidth: 0,
  gameHeight: 0,
  scale: 1,
  mainFloorY: 0,

  // Game Status
  isGameOver: false,
  canFire: true,
  shotCooldown: 0,
  frameCount: 0,

  // Score / Progression
  score: 0,
  bestScore: parseInt(localStorage.getItem('neonDropBest') || '0'),
  level: 1,
  currentEnergy: 0,
  maxEnergy: BASE_MAX_ENERGY,

  // Heat
  systemHeat: 0,
  graceMoves: 0,

  // Aim
  isAiming: false,
  aimStart: { x: 0, y: 0 },
  aimCurrent: { x: 0, y: 0 },
  shooterPos: { x: 0, y: 200 },

  // Entity pools
  orbs: [],
  particles: [],
  floatingTexts: [],
  ammoQueue: [],

  // Skills runtime state (current costs)
  skills: Object.fromEntries(
    Object.entries(SKILLS_CONFIG).map(([id, cfg]) => [id, { ...cfg, currentCost: cfg.baseCost }])
  ),

  // Combo
  comboCount: 0,
  comboTimer: 0,

  // VFX
  screenShake: 0,

  // FTUE
  ftueActive: false,
  ftueStep: 0,
  ftueComplete: !!localStorage.getItem('neonStrike_ftueComplete')
}
```

---

### `src/core/orbManager.js`
Contains the `Orb` class and spawn functions. Extract the `Orb` class verbatim from the original. Key rules:
- `Orb` constructor accepts `(x, y, typeIndex, isGeode, ammoConfig)` — same as original
- `orb.update()` contains all physics per-orb (gravity, friction, floor/wall/ceiling bounce, game-over detection)
- `orb.draw()` is **removed** from this class — drawing is handled by `orbRenderer.js`
- Add a method `orb.getDrawData()` that returns a plain object with all data the renderer needs:
  `{ x, y, radius, color, glow, value, typeIndex, isGeode, isFrosted, ammoType, ghostTimer, hp }`
- Export: `Orb`, `spawnOrb(angle, power)`, `fillAmmoQueue()`, `awardAmmo(ammoType)`

---

### `src/core/physics.js`
Extract `resolveCollisions()` exactly from the original. It reads from `State.orbs` directly. No other responsibilities. Export: `resolveCollisions()`

---

### `src/core/heatSystem.js`
Extract from original:
- `addHeat(amount)` — clamps 0-100, checks threshold, calls `triggerEruption()` if needed
- `coolHeat(amount)` — same clamping
- `triggerEruption()` — exact logic from original. Launches active orbs, thaws chamber orbs, calls `spawnChamberBatch()`, triggers VFX via `vfxHelpers.js`, shows toast via `uiRenderer.js`
- `spawnChamberBatch()` — spawns 5 frosted orbs in chamber

Export all four functions.

---

### `src/core/scoring.js`
Extract:
- `addScore(amount)` — updates `State.score`, calls `checkLevelUp()`
- `addEnergy(amount)` — scaled by level, capped at maxEnergy
- `checkLevelUp()` — compares score to `LEVEL_THRESHOLDS`, updates `State.level` and `State.maxEnergy`, shows toast
- `handleCombo(baseScore)` — increments combo, multiplies score, updates combo display

Export all four.

---

### `src/core/inputHandler.js`
Attach and manage all input events. On `init(canvas)`:
- Bind `mousedown/touchstart` → `startAim`
- Bind `mousemove/touchmove` → `moveAim`
- Bind `mouseup/touchend` → `endAim`

`endAim` calculates angle + power and calls `spawnOrb(angle, power)` from `orbManager.js`.
All aim state is written to `State.isAiming`, `State.aimStart`, `State.aimCurrent`.

Export: `init(canvas)`, `cleanup()`

---

## ⚡ POWERUP SYSTEM

### `src/powerups/powerupManager.js`

This is a registry. It does NOT know about any specific skill. Skills register themselves.

```js
// Internal registry
const registry = {}

export function registerSkill(skillModule) {
  registry[skillModule.id] = skillModule
}

export function useSkill(id) {
  const skill = registry[id]
  const runtimeSkill = State.skills[id]
  
  if (!skill || State.isGameOver) return
  if (State.level < skill.unlockLevel) return
  if (State.currentEnergy < runtimeSkill.currentCost) {
    // Show "NEED ENERGY!" floating text
    return
  }
  
  // Deduct cost + scale up for next use
  State.currentEnergy -= runtimeSkill.currentCost
  runtimeSkill.currentCost = Math.ceil(runtimeSkill.currentCost * skill.mult)
  
  // Add heat (from config)
  addHeat(skill.heatCost)
  
  // Run the skill
  skill.execute(State)
  
  State.screenShake = skill.shakeAmount || 15
  uiRenderer.update()
}

export function initPowerups() {
  // Import and register all skills here
  import('./skills/shake.js').then(m => registerSkill(m.default))
  import('./skills/smash.js').then(m => registerSkill(m.default))
  import('./skills/void.js').then(m => registerSkill(m.default))
}
```

### Each Skill File Contract

Every file in `src/powerups/skills/` exports a default object matching this shape:

```js
// Example: src/powerups/skills/shake.js
export default {
  id: 1,
  name: 'Shake',
  unlockLevel: 1,
  mult: 1.3,
  shakeAmount: 15,

  execute(State) {
    // Exact logic from original useSkill for id===1
    State.orbs.forEach(orb => {
      if (!orb.inChamber) {
        orb.vy -= 15 + Math.random() * 5
        orb.vx += (Math.random() - 0.5) * 20
      }
    })
    // createFloatingText via particleSystem
  }
}
```

### `src/powerups/ammo/pierceAmmo.js`
Contains the `awardAmmo()` logic from the original. Exports: `{ id: 'PIERCE', icon: '🔻', color: '#f0f', onAward(state) { ... } }`

---

## 🎓 FTUE SYSTEM

### Architecture Overview

The FTUE is a **scripted guided experience** that runs before the player's first real game. Physics is NOT paused — a few pre-placed orbs exist for demos. The FTUE overlay sits on top of the canvas. Each step has a trigger condition before it can advance.

### `src/ftue/ftueSteps.js`

Export an ordered array of step objects:

```js
export const FTUE_STEPS = [
  {
    id: 'welcome',
    heading: 'WELCOME, OPERATOR',
    body: 'Neon Strike is a physics merge game. Merge matching orbs to score and manage system pressure. Let\'s walk through it.',
    highlight: null,                    // No highlight on this step
    waitFor: 'tap',                     // User taps anywhere to advance
    position: 'center',                 // Tooltip position: 'top' | 'center' | 'bottom'
    showSkip: false
  },
  {
    id: 'shooter',
    heading: 'YOUR LAUNCHER',
    body: 'This glowing dot is your Launcher. Drag anywhere on screen to aim, then release to fire an orb.',
    highlight: 'shooter',               // Key — ftueOverlay highlights the shooter dot area
    waitFor: 'first_shot',              // Advances only after player fires one orb
    position: 'bottom',
    showSkip: false
  },
  {
    id: 'merging',
    heading: 'MERGE TO SCORE',
    body: 'Two orbs with the same value MERGE on contact, creating a bigger orb. Fire at the pre-placed pair now.',
    highlight: 'demo_orbs',            // Highlights two pre-placed identical orbs on canvas
    waitFor: 'first_merge',            // Advances after first merge event fires
    position: 'bottom',
    showSkip: false,
    setupFn: 'placeDemoOrbs'           // ftueManager calls this to place the demo pair
  },
  {
    id: 'heat_bar',
    heading: 'GEOTHERMAL HEAT',
    body: 'Every shot you fire adds HEAT. Too many orbs in the bucket = more heat per shot. Hit 100% and the system erupts.',
    highlight: 'heat_bar',             // Highlights the heat bar DOM element
    waitFor: 'tap',
    position: 'top',
    showSkip: false,
    setupFn: 'animateHeatDemo'         // Animates heat bar filling to 75% for visual
  },
  {
    id: 'eruption',
    heading: 'ERUPTION!',
    body: 'When heat maxes out, a GEOTHERMAL ERUPTION launches all frozen Chamber orbs up into the bucket. More orbs = more chaos.',
    highlight: 'chamber',              // Highlights the chamber strip at bottom
    waitFor: 'tap',
    position: 'top',
    showSkip: false,
    setupFn: 'playEruptionDemo'        // Triggers a fake eruption animation (no real state change)
  },
  {
    id: 'chamber',
    heading: 'THE CHAMBER',
    body: 'The GEOTHERMAL CHAMBER holds frozen orbs between eruptions. They\'re locked below the dashed line — until the next eruption.',
    highlight: 'chamber',
    waitFor: 'tap',
    position: 'top',
    showSkip: false
  },
  {
    id: 'skills',
    heading: 'YOUR SKILLS',
    body: 'You have 3 skills powered by ENERGY. SHAKE throws orbs up. SMASH slams them down. VOID deletes orbs. But every skill adds +30 HEAT — use wisely.',
    highlight: 'skills_bar',          // Highlights the 3 skill buttons
    waitFor: 'tap',
    position: 'top',
    showSkip: true
  },
  {
    id: 'energy',
    heading: 'ENERGY BAR',
    body: 'Merging orbs fills your ENERGY bar. Energy powers your skills. Chain merges to build combos and earn bonus energy.',
    highlight: 'energy_bar',          // Highlights the energy/XP bar
    waitFor: 'tap',
    position: 'top',
    showSkip: true
  },
  {
    id: 'game_over',
    heading: 'STAY BELOW THE LINE',
    body: 'If settled orbs stack above the RED DANGER LINE near the top — SYSTEM OVERLOAD. Game over. Keep merging to keep the bucket clear.',
    highlight: 'danger_line',         // Highlights the death limit line on canvas
    waitFor: 'tap',
    position: 'center',
    showSkip: true
  },
  {
    id: 'go',
    heading: 'YOU\'RE READY, OPERATOR',
    body: 'Merge smart. Manage heat. Don\'t let the bucket overflow. Good luck.',
    highlight: null,
    waitFor: 'start_button',          // Player clicks the START GAME button
    position: 'center',
    showSkip: false,
    isLast: true
  }
]
```

### `src/ftue/ftueManager.js`

```js
// Pseudocode — implement fully

const FTUE_KEY = 'neonStrike_ftueComplete'

let currentStepIndex = 0
let stepEventListeners = {}

export function shouldShowFTUE() {
  return !localStorage.getItem(FTUE_KEY)
}

export function startFTUE() {
  State.ftueActive = true
  currentStepIndex = 0
  
  // Place initial FTUE demo state (a few non-threatening orbs)
  setupFTUEGameState()
  
  renderStep(FTUE_STEPS[0])
}

export function advanceFTUE() {
  currentStepIndex++
  if (currentStepIndex >= FTUE_STEPS.length) {
    completeFTUE()
  } else {
    renderStep(FTUE_STEPS[currentStepIndex])
  }
}

export function completeFTUE() {
  localStorage.setItem(FTUE_KEY, 'true')
  State.ftueActive = false
  ftueOverlay.hide()
  resetGame()    // Start the real game clean
}

function renderStep(step) {
  // 1. Run setup function if defined (places demo orbs, animates bars, etc.)
  if (step.setupFn) setupFunctions[step.setupFn]()
  
  // 2. Tell overlay what to show
  ftueOverlay.show(step)
  
  // 3. Register the advance trigger
  registerWaitCondition(step.waitFor)
}

// setupFunctions map
const setupFunctions = {
  placeDemoOrbs() {
    // Place 2 value-2 orbs near each other for player to merge
  },
  animateHeatDemo() {
    // Temporarily animate heat bar to 75% without changing State.systemHeat
  },
  playEruptionDemo() {
    // Trigger a visual-only eruption flash (screenShake + floating text only)
  }
}

// waitFor condition wiring
function registerWaitCondition(condition) {
  if (condition === 'tap') {
    ftueOverlay.onTap(advanceFTUE)
  } else if (condition === 'first_shot') {
    // Listen for next spawnOrb() call via event bus
    EventBus.once('orb:spawned', advanceFTUE)
  } else if (condition === 'first_merge') {
    EventBus.once('orb:merged', advanceFTUE)
  } else if (condition === 'start_button') {
    // Button in overlay calls completeFTUE() directly
  }
}
```

### `src/ftue/ftueOverlay.js`

Manages the DOM overlay div `#ftue-overlay` (add to index.html):

```js
// Responsibilities:
// 1. Show/hide the dark scrim
// 2. Render the tooltip card (heading + body + tap-to-continue or START button)
// 3. Draw the highlight box/circle around the target element
// 4. Pulse animation ring on highlighted element
// 5. Skip button (bottom right corner) when step.showSkip = true

// Highlight targets map — maps highlight key → how to get the element/area
const HIGHLIGHT_TARGETS = {
  'shooter':     () => getCanvasRegion('shooter'),   // Returns { x, y, w, h } on canvas
  'demo_orbs':   () => getCanvasRegion('demo_orbs'),
  'heat_bar':    () => document.getElementById('heat-bar').closest('.heat-container'),
  'energy_bar':  () => document.getElementById('xp-bar').closest('.xp-container'),
  'skills_bar':  () => document.querySelector('.abilities-container'),
  'chamber':     () => getCanvasRegion('chamber'),
  'danger_line': () => getCanvasRegion('danger_line')
}

// For DOM elements: use CSS box-shadow cutout technique
// element.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 3px #00f3ff'
// element.style.position = 'relative'
// element.style.zIndex = '9999'

// For canvas regions: draw a semi-transparent rect on a 2nd overlay canvas
// with a "hole" punched at the highlight coordinates using composite operations
```

---

## 🎨 VISUALS SYSTEM

### `src/visuals/theme.js`

Single source of truth for all visual values:

```js
export const THEME = {
  // Core palette
  bg:        '#050505',
  bgGradient:'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)',
  accent:    '#00f3ff',
  danger:    '#ff003c',
  gold:      '#ffd700',
  purple:    '#bc13fe',
  frost:     '#a0eeff',
  
  // Per-orb visual config (index matches ORB_TYPES)
  orbs: [
    { stroke: '#00f3ff', glow: '#00f3ff', glowBlur: 20, innerGlow: 'rgba(0,243,255,0.15)' },
    { stroke: '#00ff41', glow: '#00ff41', glowBlur: 18, innerGlow: 'rgba(0,255,65,0.15)' },
    { stroke: '#ffe600', glow: '#ffe600', glowBlur: 18, innerGlow: 'rgba(255,230,0,0.15)' },
    { stroke: '#ff8c00', glow: '#ff8c00', glowBlur: 20, innerGlow: 'rgba(255,140,0,0.15)' },
    { stroke: '#ff003c', glow: '#ff003c', glowBlur: 22, innerGlow: 'rgba(255,0,60,0.15)' },
    { stroke: '#d600ff', glow: '#d600ff', glowBlur: 22, innerGlow: 'rgba(214,0,255,0.15)' },
    { stroke: '#ffffff', glow: '#ffffff', glowBlur: 25, innerGlow: 'rgba(255,255,255,0.2)' },
    { stroke: '#00f3ff', glow: '#00f3ff', glowBlur: 20, innerGlow: 'rgba(0,243,255,0.15)' },
    { stroke: '#00ff41', glow: '#00ff41', glowBlur: 18, innerGlow: 'rgba(0,255,65,0.15)' },
    { stroke: '#ffe600', glow: '#ffe600', glowBlur: 18, innerGlow: 'rgba(255,230,0,0.15)' },
    { stroke: '#ff003c', glow: '#ff003c', glowBlur: 22, innerGlow: 'rgba(255,0,60,0.15)' }
  ],
  
  // Chamber
  chamber: {
    lineWidth: 4,
    dashPattern: [15, 10],
    labelFont: 'bold 12px Rajdhani',
    labelAlpha: 0.35
  },
  
  // Particles
  particles: {
    count: 12,
    speedMax: 15,
    decayRate: 0.03,
    sizeMin: 2,
    sizeMax: 6
  },
  
  // Shooter
  shooter: {
    radius: 12,
    ringColor: '#555',
    ringWidth: 2,
    aimLineColor: 'rgba(0,243,255,0.5)',
    aimLineDash: [10, 10],
    aimLineWidth: 3,
    aimDotColor: '#00f3ff',
    aimDotRadius: 6
  },
  
  // Death line
  deathLine: {
    color: 'rgba(255,0,60,0.3)',
    dash: [10, 10],
    width: 2
  },
  
  // Enhanced visual effects (NEW — implement these)
  vfx: {
    orbInnerGradient: true,       // Radial gradient inside each orb (3D plasma look)
    chamberLavaGlow: true,        // Pulsing lava glow on chamber line when heat > 50
    mergeFlashBurst: true,        // Expanding white ring on merge event
    orbTrails: true,              // Ghost circles behind fast orbs
    heatShimmer: false,           // Canvas-translate shimmer (enable if performance ok)
    scanlineOverlay: false,       // CRT scanline layer (enable if performance ok)
    bgGrid: true                  // Faint perspective neon grid in background
  }
}
```

### `src/visuals/renderer.js`

Master draw function. Called each frame by `gameLoop.js`. Does NOT know any game logic:

```js
import { State } from '../state.js'
import { chamberRenderer } from './chamberRenderer.js'
import { orbRenderer } from './orbRenderer.js'
import { shooterRenderer } from './shooterRenderer.js'
import { particleSystem } from './particleSystem.js'
import { vfxHelpers } from './vfxHelpers.js'

export function draw() {
  const { ctx, canvas } = State

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()

  // Apply screen shake
  vfxHelpers.applyScreenShake(ctx)

  // Layer order (back to front):
  // 1. Background grid (if enabled)
  // 2. Chamber strip
  // 3. Orb trails (behind orbs)
  // 4. Orbs
  // 5. Particles
  // 6. Floating texts
  // 7. Shooter
  // 8. Aim line
  // 9. Death limit line
  // 10. Merge flash bursts

  if (THEME.vfx.bgGrid) drawBackgroundGrid(ctx)
  chamberRenderer.draw(ctx)
  if (THEME.vfx.orbTrails) orbRenderer.drawTrails(ctx)
  orbRenderer.drawAll(ctx)
  particleSystem.drawParticles(ctx)
  particleSystem.drawFloatingTexts(ctx)
  shooterRenderer.draw(ctx)
  vfxHelpers.drawMergeFlashes(ctx)

  ctx.restore()
}
```

### `src/visuals/orbRenderer.js`

Reads `State.orbs` array. Draws each orb using data only. Implements enhanced visuals from THEME:

```js
// For each orb:
// 1. If THEME.vfx.orbTrails: draw 3 fading ghost circles at orb.trailPositions[]
// 2. Apply ctx.shadowBlur and shadowColor from THEME.orbs[typeIndex]
// 3. If THEME.vfx.orbInnerGradient: fill with createRadialGradient instead of flat black
//    - Center: rgba(255,255,255,0.05) 
//    - Edge: theme.orbs[idx].innerGlow
// 4. Stroke with type color
// 5. Draw value text
// 6. Special states: frosted (ice-blue tint), pierce (dashed stroke), geode (grey + crack)
```

### `src/visuals/vfxHelpers.js`

```js
// mergeFlashes = [] — array of { x, y, radius, alpha, maxRadius }
// Each frame: radius grows, alpha fades. Remove when alpha <= 0.

export function triggerMergeFlash(x, y) {
  mergeFlashes.push({ x, y, radius: 0, alpha: 1.0, maxRadius: 80 })
}

export function drawMergeFlashes(ctx) {
  mergeFlashes.forEach(f => {
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 255, 255, ${f.alpha})`
    ctx.lineWidth = 3
    ctx.stroke()
    f.radius += 8
    f.alpha -= 0.07
  })
  mergeFlashes = mergeFlashes.filter(f => f.alpha > 0)
}

export function applyScreenShake(ctx) {
  if (State.screenShake > 0) {
    const dx = (Math.random() - 0.5) * State.screenShake
    const dy = (Math.random() - 0.5) * State.screenShake
    ctx.translate(dx, dy)
    State.screenShake *= 0.9
    if (State.screenShake < 0.5) State.screenShake = 0
  }
}
```

---

## 🔌 EVENT BUS

Create a simple event bus at `src/eventBus.js` so modules can communicate without circular imports:

```js
const listeners = {}

export const EventBus = {
  on(event, fn)   { (listeners[event] ??= []).push(fn) },
  once(event, fn) {
    const wrapper = (...args) => { fn(...args); this.off(event, wrapper) }
    this.on(event, wrapper)
  },
  off(event, fn)  { listeners[event] = (listeners[event] || []).filter(f => f !== fn) },
  emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)) }
}
```

Emit these events at the appropriate points:
- `EventBus.emit('orb:spawned', orb)` — in `orbManager.spawnOrb()`
- `EventBus.emit('orb:merged', { newOrb, x, y })` — in `physics.resolveCollisions()` on merge
- `EventBus.emit('orb:geode_cracked', orb)` — in `physics.resolveCollisions()` on geode destruction
- `EventBus.emit('eruption:triggered')` — in `heatSystem.triggerEruption()`
- `EventBus.emit('game:over')` — in `main.endGame()`
- `EventBus.emit('level:up', { level })` — in `scoring.checkLevelUp()`

---

## 🚀 `src/main.js` ENTRY POINT

```js
import { State } from './state.js'
import { gameLoop } from './gameLoop.js'
import { inputHandler } from './core/inputHandler.js'
import { initPowerups } from './powerups/powerupManager.js'
import { ftueManager } from './ftue/ftueManager.js'
import { uiRenderer } from './visuals/uiRenderer.js'
import { resetGame } from './core/orbManager.js'

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
  inputHandler.init(State.canvas)
  
  // Expose resetGame globally for the game-over button
  window.resetGame = resetGame

  // Check FTUE
  if (ftueManager.shouldShowFTUE()) {
    ftueManager.startFTUE()
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
  State.gameHeight = State.canvas.height
  State.mainFloorY = State.gameHeight - FLOOR_OFFSET
  State.scale = State.canvas.width / 500
  State.shooterPos = { x: State.canvas.width / 2, y: SPAWN_Y }
}

init()
```

---

## ⚠️ CRITICAL RULES FOR THE AGENT

1. **Read the original `index.html` completely before creating a single file.** Every function, constant, and class must be accounted for.

2. **Do not change game logic or balance.** Heat thresholds, orb radii, skill costs, collision physics — all unchanged. Only reorganise.

3. **No circular imports.** Import order: `config` → `state` → `eventBus` → `core/*` → `powerups/*` → `visuals/*` → `ftue/*` → `main`

4. **State is the only shared mutable object.** No module should store its own copy of game data. Everything reads/writes `State`.

5. **Visual files never import from core files directly for logic.** They only read `State`. Exception: `uiRenderer` may call `showLevelToast()` which is a pure DOM function.

6. **Test each module independently before wiring everything up.** Start with `config` → `state` → `orbManager` → `physics` → `renderer` → then `ftue` last.

7. **Preserve the HTML structure exactly.** The DOM element IDs used by `uiRenderer.js` must remain identical to the original.

8. **FTUE must be completely skippable.** If `localStorage.getItem('neonStrike_ftueComplete')` is truthy, skip FTUE entirely and go straight to `resetGame()`.

9. **The game must work identically with FTUE disabled.** The FTUE system is additive. Nothing in the core game depends on it.

10. **All enhanced visuals in `THEME.vfx` are flags.** Set them to `true` or `false` — each must be independently toggleable without breaking the game.

---

## ✅ DELIVERY CHECKLIST

When done, verify the following before finishing:

- [ ] `npm run dev` starts without errors
- [ ] Game plays identically to original
- [ ] Merging works, heat builds, eruption fires
- [ ] Skills unlock at correct levels and cost energy
- [ ] FTUE runs on first visit, skips on subsequent visits
- [ ] FTUE skip button works
- [ ] All 10 FTUE steps display correctly with highlights
- [ ] After FTUE complete, real game starts clean
- [ ] Resize handler keeps canvas correct on mobile
- [ ] No console errors
- [ ] Each `src/visuals/*.js` file works independently of game logic
- [ ] Each `src/powerups/skills/*.js` executes correctly when called by powerupManager
- [ ] `npm run build` produces working `dist/` folder
