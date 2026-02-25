# Plan: Remove Level Up System

## Overview
The level up system currently provides:
- Level progression based on score thresholds
- Max energy increase per level
- Skill unlocks based on level
- Level UI display and toast notifications

## Decisions Made
- ✅ **Skill Availability**: All skills available from game start
- ✅ **Energy Balance**: Fixed max energy at 100, no level scaling for energy gains
- ✅ **Eruption Messages**: Keep separate from level system (no changes needed)
- ✅ **UI Layout**: No rebalancing - just remove level display element

---

## Components to Modify

### 1. Config (`src/config.js`)
**Remove:**
```js
export const LEVEL_THRESHOLDS = [0, 800, 2500, 5000, 10000]
export const ENERGY_PER_LEVEL = 50
```

**Modify SKILLS_CONFIG:**
Remove `unlockLevel` from each skill:
```js
export const SKILLS_CONFIG = {
  1: { id: 1, name: 'Shake', icon: '⚡', label: 'SHAKE', baseCost: 15, mult: 1.3, heatCost: 30 },
  2: { id: 2, name: 'Smash', icon: '🔨', label: 'SMASH', baseCost: 40, mult: 1.25, heatCost: 30 },
  3: { id: 3, name: 'Void', icon: '🌀', label: 'VOID', baseCost: 80, mult: 1.4, heatCost: 30 }
}
```

**Keep:**
- `BASE_MAX_ENERGY = 100` - fixed max energy

---

### 2. State (`src/state.js`)
**Remove:**
```js
level: 1,
```

**Keep unchanged:**
- `currentEnergy: 0`
- `maxEnergy: BASE_MAX_ENERGY` (will stay at 100)

---

### 3. Scoring (`src/core/scoring.js`)
**Remove imports:**
```js
import { LEVEL_THRESHOLDS, ENERGY_PER_LEVEL, BASE_MAX_ENERGY } from '../config.js'
```
Change to:
```js
import { State } from '../state.js'
```

**Remove entire function:**
```js
export function checkLevelUp() { ... }
```

**Modify `addScore()`:**
```js
// Before
export function addScore(amount) {
  State.score += amount
  document.getElementById('score').innerText = State.score
  checkLevelUp()  // REMOVE THIS LINE
}

// After
export function addScore(amount) {
  State.score += amount
  document.getElementById('score').innerText = State.score
}
```

**Modify `addEnergy()`:**
```js
// Before
export function addEnergy(amount) {
  if (State.isGameOver) return
  let scaler = 1 + (State.level * 0.2)  // REMOVE SCALER
  State.currentEnergy += amount * scaler
  ...
}

// After
export function addEnergy(amount) {
  if (State.isGameOver) return
  State.currentEnergy += amount
  if (State.currentEnergy > State.maxEnergy) {
    State.currentEnergy = State.maxEnergy
  }
  updateUI()
}
```

---

### 4. UI Renderer (`src/visuals/uiRenderer.js`)
**Remove variable:**
```js
let levelEl = null
```

**Modify `initElements()`:**
Remove:
```js
levelEl = document.getElementById('level-value')
```

**Remove function:**
```js
updateLevel() {
  if (!levelEl) return
  levelEl.textContent = State.level
},
```

**Modify `update()`:**
Remove:
```js
this.updateLevel()
```

**Modify `updateSkills()`:**
Remove level-based unlock check - skills always show as unlocked:
```js
// Before
const isUnlocked = State.level >= skill.unlockLevel

// After
const isUnlocked = true  // All skills always unlocked
```

**Keep `showLevelToast()` unchanged:**
This function is used by the eruption system and should remain.

---

### 5. Powerup Manager (`src/powerups/powerupManager.js`)
**Remove level check:**
```js
// Before
if (State.level < skill.unlockLevel) return

// After - remove this line entirely
```

---

### 6. Orb Manager (`src/core/orbManager.js`)
**Remove from reset:**
```js
State.level = 1
```

**Remove UI reset:**
```js
document.getElementById('level-value').innerText = '1'
```

---

### 7. HTML (`index.html`)
**Remove level display:**
```html
<div class="hud-level">
    <div class="hud-label">LV</div>
    <div class="hud-level-value" id="level-value">1</div>
</div>
```

**Keep level-toast element:**
Used by eruption system - no changes needed.

---

### 8. CSS Files
**Remove from `src/visuals/styles.css` or `src/visuals/styles/hud.css`:**
- `.hud-level` styles
- `.hud-level-value` styles

---

### 9. Skill Files
**Remove `unlockLevel` from each:**

`src/powerups/skills/shake.js`:
```js
// Remove: unlockLevel: 1,
```

`src/powerups/skills/smash.js`:
```js
// Remove: unlockLevel: 2,
```

`src/powerups/skills/void.js`:
```js
// Remove: unlockLevel: 4,
```

---

### 10. Event Bus (`src/eventBus.js`)
**Check for listeners:**
Search for any `level:up` event listeners and remove them.

---

## Implementation Order

1. `src/config.js` - Remove constants, update SKILLS_CONFIG
2. `src/state.js` - Remove level property
3. `src/core/scoring.js` - Remove checkLevelUp, simplify addEnergy
4. `src/visuals/uiRenderer.js` - Remove level display, skills always unlocked
5. `src/powerups/powerupManager.js` - Remove level check
6. `src/core/orbManager.js` - Remove level reset
7. `src/powerups/skills/*.js` - Remove unlockLevel from each skill
8. `index.html` - Remove level UI element
9. CSS files - Remove level styles
10. Test game functionality

---

## Final State After Changes

| Feature | Before | After |
|---------|--------|-------|
| Max Energy | 100 + (level-1) × 50 | Fixed 100 |
| Energy Gain | amount × (1 + level × 0.2) | amount (no scaling) |
| Skill Unlocks | Based on level | All available from start |
| Level Display | Shows current level | Removed |
| Level Up Toast | Shown on level up | Removed (eruption toast unchanged) |

---

## Files Changed Summary

| File | Lines Changed |
|------|---------------|
| `src/config.js` | ~5 lines removed |
| `src/state.js` | 1 line removed |
| `src/core/scoring.js` | ~20 lines removed/modified |
| `src/visuals/uiRenderer.js` | ~10 lines removed |
| `src/powerups/powerupManager.js` | 1 line removed |
| `src/core/orbManager.js` | 2 lines removed |
| `src/powerups/skills/shake.js` | 1 line removed |
| `src/powerups/skills/smash.js` | 1 line removed |
| `src/powerups/skills/void.js` | 1 line removed |
| `index.html` | ~4 lines removed |
| CSS files | ~10-20 lines removed |
