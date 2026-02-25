text

# 🎮 NEON STRIKE — HUD REDESIGN PROMPT
## For VS Code AI Agent | File: `src/visuals/uiRenderer.js` + `src/visuals/styles/hud.css`

---

## 🎯 YOUR MISSION

Redesign the HUD (Heads-Up Display) for Neon Strike. You are NOT touching any game logic files. You are working exclusively in the UI/visual layer. The game state comes from `State` — you read it, you display it differently.

Read the current HUD structure in `index.html` and the existing `uiRenderer.js` before making any changes.

---

## 📐 TARGET LAYOUT

```
┌─────────────────────────────────────────┐
│  [ SCORE ]              [ LV ]          │  ← Compact. One row. Both corners.
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ← HEAT BAR (thick, 18px, pulsing red)
│  ─────────────────────────────────────  │  ← ENERGY BAR (thin, 8px, calm cyan)
│                                         │
│               ⬤ NEXT                   │  ← Big centered next-shot orb (52px)
│                                         │
│ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ │  ← Danger line (not part of HUD but ref)
│                                         │
│            G A M E                      │
│                                         │
│ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ │
│                                         │
│    [ ⚡ ]         [ 🔨 ]       [ 🌀 ]   │  ← Skills. State shown by glow, not text.
└─────────────────────────────────────────┘
```

**Reading flow:** Score/Level → Heat → Energy → Next Shot → Play → Skills. Eyes travel top-center to bottom. No scanning left-to-right for critical info.

---

## 🔴 WHAT TO BUILD

### 1. TOP ROW — Score + Level

**Layout:** Score left, Level right. Single flex row. Compact height. No wasted space.

```css
.hud-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 0 16px;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  box-sizing: border-box;
}
```

**Score box:**
- Value: large, white, bold (`1.4rem`, `font-weight: 900`)
- Label: tiny, muted, uppercase (`SCORE` in `#666`, `0.55rem`)
- No background box. Just text. Clean.
- On combo active: score value glows gold (`text-shadow: 0 0 15px #ffd700`)

**Level box:**
- Same structure as score but right-aligned
- Just the number + `LV` label. Nothing else.
- **REMOVE** the `STABLE / HEATING / CRITICAL` text entirely. Delete it. Color + animation replaces it.

```html
<!-- NEW TOP ROW HTML -->
<div class="hud-top-row">
  <div class="hud-score">
    <div class="hud-label">SCORE</div>
    <div class="hud-score-value" id="score">0</div>
  </div>
  <div class="hud-level">
    <div class="hud-label">LV</div>
    <div class="hud-level-value" id="level-value">1</div>
  </div>
</div>
```

---

### 2. HEAT BAR — Primary danger indicator

**This is the most important element on the HUD. Treat it that way.**

**Specs:**
- Height: `18px` (was 10px — make it dominant)
- Width: full container width (max 400px), `8px` horizontal margin
- Border radius: `4px`
- Position: directly below the top row, zero gap above the energy bar
- Background: `rgba(30, 0, 0, 0.8)` — dark red tint even when empty
- Border: `1px solid rgba(255, 0, 60, 0.4)`
- **NO TEXT NUMBERS** — remove `HEAT: 0%` label entirely

**Fill gradient (static):**
```css
background: linear-gradient(90deg, #ff6b00, #ff003c);
box-shadow: 0 0 8px rgba(255, 0, 60, 0.4);
```

**3 pulse states based on heat level — driven by JS adding CSS classes:**

| Heat % | Class | Effect |
|--------|-------|--------|
| 0–39% | `.heat-calm` | No animation. Dim glow. |
| 40–79% | `.heat-warning` | Slow pulse: shadow breathes in/out, 1.5s cycle |
| 80–99% | `.heat-critical` | Fast pulse 0.4s, bar shakes ±2px horizontally, red vignette on canvas edge |
| 100% | `.heat-erupting` | Single flash burst then resets |

```css
/* WARNING state */
@keyframes heat-pulse-warn {
  0%   { box-shadow: 0 0 6px rgba(255,0,60,0.3); }
  50%  { box-shadow: 0 0 20px rgba(255,0,60,0.8), 0 0 40px rgba(255,0,60,0.3); }
  100% { box-shadow: 0 0 6px rgba(255,0,60,0.3); }
}

/* CRITICAL state */
@keyframes heat-pulse-critical {
  0%   { box-shadow: 0 0 15px rgba(255,0,60,0.9), 0 0 30px rgba(255,0,60,0.5); transform: translateX(0); }
  25%  { transform: translateX(-2px); }
  75%  { transform: translateX(2px); }
  100% { box-shadow: 0 0 15px rgba(255,0,60,0.9), 0 0 30px rgba(255,0,60,0.5); transform: translateX(0); }
}

.heat-bar-fill.heat-calm     { animation: none; }
.heat-bar-fill.heat-warning  { animation: heat-pulse-warn 1.5s ease-in-out infinite; }
.heat-bar-fill.heat-critical { animation: heat-pulse-critical 0.4s ease-in-out infinite; }
```

**Screen-level heat feedback (JS — update canvas border):**
```js
// In uiRenderer.updateHeat():
function updateHeatFeedback(heatPct) {
  const canvas = document.getElementById('gameCanvas')
  if (heatPct > 0.8) {
    canvas.style.boxShadow = `0 0 40px rgba(255, 0, 60, ${(heatPct - 0.8) * 2.5})`
  } else {
    canvas.style.boxShadow = '0 0 50px rgba(0, 243, 255, 0.1)'
  }
}
```

```html
<!-- NEW HEAT BAR HTML -->
<div class="hud-heat-container">
  <div class="heat-bar-fill heat-calm" id="heat-bar"></div>
</div>
```

---

### 3. ENERGY BAR — Secondary strategic indicator

**Specs:**
- Height: `8px` (thin — half the heat bar)
- Sits directly below heat bar with `4px` gap only
- Background: `rgba(0, 10, 20, 0.8)`
- Border: `1px solid rgba(0, 243, 255, 0.15)` — barely visible border
- **NO TEXT** — remove `ENERGY: 0 / 100` label. Numbers are for pause screens, not action.
- Border radius: `4px`

**Fill:**
```css
background: linear-gradient(90deg, #0088aa, #00f3ff);
box-shadow: 0 0 6px rgba(0, 243, 255, 0.3);
transition: width 0.15s linear;
```

**2 special states:**
- **FULL** (`currentEnergy >= maxEnergy`): add class `.energy-full` → brief pulse then steady bright glow
- **EMPTY** (`currentEnergy <= 0`): add class `.energy-empty` → bar dims to 20% opacity, no glow

```css
@keyframes energy-full-flash {
  0%   { box-shadow: 0 0 6px rgba(0,243,255,0.3); }
  50%  { box-shadow: 0 0 20px rgba(0,243,255,1), 0 0 40px rgba(188,19,254,0.6); }
  100% { box-shadow: 0 0 12px rgba(0,243,255,0.6); }
}

.energy-bar-fill.energy-full  { animation: energy-full-flash 0.6s ease-out forwards; }
.energy-bar-fill.energy-empty { opacity: 0.2; box-shadow: none; }
```

```html
<!-- NEW ENERGY BAR HTML -->
<div class="hud-energy-container">
  <div class="energy-bar-fill" id="xp-bar"></div>
</div>
```

---

### 4. NEXT SHOT — The player's most immediate decision

**This must be the biggest, clearest element below the bars.**

**Specs:**
- Size: `52px` diameter circle (was 32px)
- Position: **horizontally centered**, directly below the energy bar
- The orb inside fills to match the upcoming shot's color (`State.ammoQueue[0]`)
- Value number inside: `1rem`, bold, white
- Surrounding ring: glows with the orb's color
- Label: `NEXT` in tiny muted text `8px` above the orb

**REMOVE:**
- The second small queue orb (the 24px "preview 2" slot) — hide for MVP
- Users don't need to see 2 ahead during action
- You can store it in state but don't render it

**Add a "READY" indicator:**
- When `State.canFire === true`: ring pulses very gently (2s cycle, barely visible)
- When `State.canFire === false` (shot cooldown): ring dims to 30% opacity and fills with a brief arc-drain animation

```css
@keyframes next-orb-ready {
  0%   { box-shadow: 0 0 8px var(--orb-color); }
  50%  { box-shadow: 0 0 18px var(--orb-color), 0 0 30px rgba(255,255,255,0.1); }
  100% { box-shadow: 0 0 8px var(--orb-color); }
}

#next-shot-orb {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid var(--orb-color, #00f3ff);
  background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), #000);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: next-orb-ready 2s ease-in-out infinite;
  transition: opacity 0.2s, border-color 0.15s;
  position: relative;
}

#next-shot-orb.cooling {
  opacity: 0.35;
  animation: none;
}
```

```html
<!-- NEW NEXT SHOT HTML -->
<div class="hud-next-shot">
  <div class="hud-label">NEXT</div>
  <div id="next-shot-orb">
    <span id="next-shot-value">2</span>
    <!-- Special ammo icon overlaid when pierce round queued -->
    <span id="next-shot-ammo-icon" class="ammo-badge"></span>
  </div>
</div>
```

---

### 5. SKILLS BAR — State via visuals, not text

**Layout:** 3 skill buttons in a horizontal row, centered, at bottom of screen.

**The core change: REMOVE visible cost numbers. Show state through glow + opacity instead.**

#### 3 Visual States per Skill Button

| State | Visual |
|-------|--------|
| **Locked** (level too low) | Dark, greyed icon, lock icon overlaid, no border glow |
| **Affordable** (unlocked + enough energy) | Full brightness, colored border glowing, icon crisp |
| **Unaffordable** (unlocked but no energy) | Icon visible but dim (50% opacity), border desaturated, no glow |
| **Active cooldown** (just used) | Sweep animation clockwise drain overlay |

**Cost numbers — hidden by default, shown on hover/long-press only:**

```css
/* Cost badge — hidden by default */
.skill-cost-badge {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(188, 19, 254, 0.9);
  color: white;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  opacity: 0;                        /* ← HIDDEN by default */
  pointer-events: none;
  transition: opacity 0.2s;
  white-space: nowrap;
}

/* Reveal on hover (desktop) */
.skill-wrapper:hover .skill-cost-badge { opacity: 1; }

/* Reveal on long-press (mobile) — JS adds .show-cost class */
.skill-wrapper.show-cost .skill-cost-badge { opacity: 1; }
```

**Long-press detection (JS — add to inputHandler or uiRenderer):**
```js
// Add to each skill button
let pressTimer = null

skillBtn.addEventListener('touchstart', () => {
  pressTimer = setTimeout(() => {
    skillBtn.closest('.skill-wrapper').classList.add('show-cost')
  }, 400) // 400ms long press
})

skillBtn.addEventListener('touchend', () => {
  clearTimeout(pressTimer)
  setTimeout(() => {
    skillBtn.closest('.skill-wrapper').classList.remove('show-cost')
  }, 1200) // Show for 1.2s then hide
})
```

**Button sizing and spacing:**
```css
.skills-bar {
  position: absolute;
  bottom: 28px;
  width: 100%;
  max-width: 400px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 0 16px;
  box-sizing: border-box;
  pointer-events: auto;
  z-index: 20;
}

.skill-btn {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.25s, box-shadow 0.25s, opacity 0.25s;
}

/* State: Locked */
.skill-btn.locked {
  border-color: #222;
  opacity: 0.4;
}

/* State: Affordable */
.skill-btn.affordable {
  border-color: var(--skill-color);
  box-shadow: 0 0 12px rgba(var(--skill-color-rgb), 0.35);
  opacity: 1;
}

/* State: Unaffordable */
.skill-btn.unaffordable {
  border-color: #333;
  box-shadow: none;
  opacity: 0.55;
  filter: saturate(0.3);
}
```

**Per-skill color variables (set inline on the element):**
- SHAKE: `--skill-color: #00f3ff` / `--skill-color-rgb: 0,243,255`
- SMASH: `--skill-color: #00ff41` / `--skill-color-rgb: 0,255,65`
- VOID:  `--skill-color: #bc13fe` / `--skill-color-rgb: 188,19,254`

```html
<!-- NEW SKILLS BAR HTML -->
<div class="skills-bar">
  <div class="skill-wrapper" id="skill-wrapper-1">
    <div class="skill-btn locked" id="skill-1"
         style="--skill-color:#00f3ff; --skill-color-rgb:0,243,255"
         onclick="useSkill(1)">
      <div class="skill-lock-icon">🔒</div>
      <div class="skill-content">
        <span class="skill-icon">⚡</span>
        <span class="skill-label">SHAKE</span>
      </div>
    </div>
    <div class="skill-cost-badge" id="cost-1">15</div>
  </div>

  <div class="skill-wrapper" id="skill-wrapper-2">
    <div class="skill-btn locked" id="skill-2"
         style="--skill-color:#00ff41; --skill-color-rgb:0,255,65"
         onclick="useSkill(2)">
      <div class="skill-lock-icon">🔒</div>
      <div class="skill-content">
        <span class="skill-icon">🔨</span>
        <span class="skill-label">SMASH</span>
      </div>
    </div>
    <div class="skill-cost-badge" id="cost-2">40</div>
  </div>

  <div class="skill-wrapper" id="skill-wrapper-3">
    <div class="skill-btn locked" id="skill-3"
         style="--skill-color:#bc13fe; --skill-color-rgb:188,19,254"
         onclick="useSkill(3)">
      <div class="skill-lock-icon">🔒</div>
      <div class="skill-content">
        <span class="skill-icon">🌀</span>
        <span class="skill-label">VOID</span>
      </div>
    </div>
    <div class="skill-cost-badge" id="cost-3">80</div>
  </div>
</div>
```

---

## 🔁 `uiRenderer.js` — FULL UPDATE FUNCTION SPEC

Rewrite the `update()` function in `uiRenderer.js` to match these exact responsibilities:

```js
export const uiRenderer = {

  // Called every frame OR whenever State changes
  update() {
    this.updateScore()
    this.updateLevel()
    this.updateHeatBar()
    this.updateEnergyBar()
    this.updateNextShot()
    this.updateSkills()
  },

  updateScore() {
    scoreEl.textContent = State.score
    // Gold glow on combo
    scoreEl.style.textShadow = State.comboCount > 1
      ? '0 0 15px #ffd700, 0 0 30px #ffd700'
      : 'none'
  },

  updateLevel() {
    levelEl.textContent = State.level
    // No status text anymore. Level number only.
  },

  updateHeatBar() {
    const pct = State.systemHeat  // already 0-100
    heatFillEl.style.width = pct + '%'

    // Class-based pulse state
    heatFillEl.classList.remove('heat-calm', 'heat-warning', 'heat-critical', 'heat-erupting')
    if (pct >= 80)      heatFillEl.classList.add('heat-critical')
    else if (pct >= 40) heatFillEl.classList.add('heat-warning')
    else                heatFillEl.classList.add('heat-calm')

    // Bleed heat color onto canvas edge
    const canvas = document.getElementById('gameCanvas')
    if (pct > 80) {
      const intensity = ((pct - 80) / 20).toFixed(2)
      canvas.style.boxShadow = `0 0 60px rgba(255,0,60,${intensity * 0.6})`
    } else {
      canvas.style.boxShadow = '0 0 50px rgba(0,243,255,0.1)'
    }
  },

  updateEnergyBar() {
    const pct = (State.currentEnergy / State.maxEnergy) * 100
    energyFillEl.style.width = pct + '%'

    energyFillEl.classList.remove('energy-full', 'energy-empty')
    if (State.currentEnergy >= State.maxEnergy) energyFillEl.classList.add('energy-full')
    else if (State.currentEnergy <= 0)          energyFillEl.classList.add('energy-empty')
    // No text. No numbers. Bar only.
  },

  updateNextShot() {
    const next = State.ammoQueue[0]
    if (!next) return

    const orbType = ORB_TYPES[next.orbType]
    const isAmmoSpecial = next.config.id !== 'STANDARD'

    // Update CSS variable for glow color
    nextShotEl.style.setProperty('--orb-color', orbType.color)
    nextShotEl.style.borderColor = isAmmoSpecial ? next.config.color : orbType.color

    // Value text
    nextShotValueEl.textContent = orbType.value

    // Ammo icon badge (pierce indicator)
    nextShotAmmoIconEl.textContent = isAmmoSpecial ? next.config.icon : ''

    // Ready / cooling state
    if (State.canFire) {
      nextShotEl.classList.remove('cooling')
    } else {
      nextShotEl.classList.add('cooling')
    }
  },

  updateSkills() {
    for (let i = 1; i <= 3; i++) {
      const btn = document.getElementById(`skill-${i}`)
      const badge = document.getElementById(`cost-${i}`)
      const skill = State.skills[i]
      const cfg = SKILLS_CONFIG[i]

      // Update cost badge value (hidden by default, shown on hover/long-press)
      badge.textContent = Math.floor(skill.currentCost)

      // Determine state class
      btn.classList.remove('locked', 'affordable', 'unaffordable')

      if (State.level < cfg.unlockLevel) {
        btn.classList.add('locked')
        btn.querySelector('.skill-lock-icon').style.display = 'block'
        btn.querySelector('.skill-content').style.opacity = '0'
      } else {
        btn.querySelector('.skill-lock-icon').style.display = 'none'
        btn.querySelector('.skill-content').style.opacity = '1'

        if (State.currentEnergy >= skill.currentCost) {
          btn.classList.add('affordable')
        } else {
          btn.classList.add('unaffordable')
        }
      }
    }
  },

  // Called once on game boot
  initLongPress() {
    for (let i = 1; i <= 3; i++) {
      const wrapper = document.getElementById(`skill-wrapper-${i}`)
      let timer = null

      wrapper.addEventListener('touchstart', () => {
        timer = setTimeout(() => wrapper.classList.add('show-cost'), 400)
      }, { passive: true })

      wrapper.addEventListener('touchend', () => {
        clearTimeout(timer)
        setTimeout(() => wrapper.classList.remove('show-cost'), 1200)
      }, { passive: true })
    }
  },

  showToast(title, message) {
    document.querySelector('.toast-title').textContent = title
    document.getElementById('toast-message').textContent = message
    const toast = document.getElementById('level-toast')
    toast.classList.add('active')
    setTimeout(() => toast.classList.remove('active'), 3000)
  }
}
```

---

## 🧱 COMPLETE NEW HTML STRUCTURE

Replace the entire `#ui-layer` div with this. Keep all IDs identical — they're referenced by the existing JS:

```html
<div id="ui-layer">

  <!-- TOP ROW: Score + Level -->
  <div class="hud-top-row">
    <div class="hud-score">
      <div class="hud-label">SCORE</div>
      <div class="hud-score-value" id="score">0</div>
    </div>
    <div class="hud-level">
      <div class="hud-label">LV</div>
      <div class="hud-level-value" id="level-value">1</div>
      <!-- STATUS TEXT REMOVED — color + motion only now -->
    </div>
  </div>

  <!-- BARS STACK -->
  <div class="hud-bars">
    <!-- HEAT: Primary, thick, pulsing -->
    <div class="hud-heat-container">
      <div class="heat-bar-fill heat-calm" id="heat-bar"></div>
    </div>
    <!-- ENERGY: Secondary, thin, calm -->
    <div class="hud-energy-container">
      <div class="energy-bar-fill" id="xp-bar"></div>
    </div>
  </div>

  <!-- NEXT SHOT: Centered, big -->
  <div class="hud-next-shot">
    <div class="hud-label">NEXT</div>
    <div id="next-shot-orb" class="cooling">
      <span id="next-shot-value">2</span>
      <span id="next-shot-ammo-icon" class="ammo-badge"></span>
    </div>
  </div>

  <!-- SKILLS BAR: Bottom, glow-based state -->
  <div class="skills-bar">
    <div class="skill-wrapper" id="skill-wrapper-1">
      <div class="skill-btn locked" id="skill-1"
           style="--skill-color:#00f3ff;--skill-color-rgb:0,243,255"
           onclick="useSkill(1)">
        <div class="skill-lock-icon">🔒</div>
        <div class="skill-content">
          <span class="skill-icon">⚡</span>
          <span class="skill-label">SHAKE</span>
        </div>
      </div>
      <div class="skill-cost-badge" id="cost-1">15</div>
    </div>

    <div class="skill-wrapper" id="skill-wrapper-2">
      <div class="skill-btn locked" id="skill-2"
           style="--skill-color:#00ff41;--skill-color-rgb:0,255,65"
           onclick="useSkill(2)">
        <div class="skill-lock-icon">🔒</div>
        <div class="skill-content">
          <span class="skill-icon">🔨</span>
          <span class="skill-label">SMASH</span>
        </div>
      </div>
      <div class="skill-cost-badge" id="cost-2">40</div>
    </div>

    <div class="skill-wrapper" id="skill-wrapper-3">
      <div class="skill-btn locked" id="skill-3"
           style="--skill-color:#bc13fe;--skill-color-rgb:188,19,254"
           onclick="useSkill(3)">
        <div class="skill-lock-icon">🔒</div>
        <div class="skill-content">
          <span class="skill-icon">🌀</span>
          <span class="skill-label">VOID</span>
        </div>
      </div>
      <div class="skill-cost-badge" id="cost-3">80</div>
    </div>
  </div>

</div>
```

---

## 🗑️ WHAT TO DELETE

Remove these elements and their CSS entirely. Do not keep them:

| Element | ID / Class | Reason |
|---------|-----------|--------|
| Status text | `#status-display` | Replaced by color + motion |
| XP text label | `.xp-text` | Numbers removed from action HUD |
| Heat text label | `.heat-text` | Numbers removed from action HUD |
| Second next orb slot | `#ammo-next-2`, `#ammo-icon-2` | MVP: one slot only |
| Old `#next-container` | `#next-container`, `.next-queue`, `.next-slot` | Replaced by new `#next-shot-orb` |
| Old `#ammo-next-1`, `#ammo-icon-1` | All | Replaced |
| `.cost-badge` (old) | All old cost badge HTML | Rebuilt with new `.skill-cost-badge` |
| `.ability-btn`, `.ability-wrapper` | All | Replaced by `.skill-btn`, `.skill-wrapper` |
| `.disabled-overlay` | All | Replaced by CSS state classes |

---

## ✅ FINAL QA CHECKLIST

Before finishing, verify each item:

- [ ] Heat bar is visibly thicker than energy bar (18px vs 8px)
- [ ] Heat bar pulses at 40%+ heat
- [ ] Heat bar shakes at 80%+ heat
- [ ] Canvas edge glows red when heat > 80%
- [ ] No text numbers anywhere on bars during gameplay
- [ ] Status text (`STABLE` / `HEATING` / `CRITICAL`) is completely gone
- [ ] Next shot orb is 52px and centered
- [ ] Only ONE next shot preview (no second slot)
- [ ] Next shot dims/fades during shot cooldown
- [ ] Skill costs are hidden by default
- [ ] Skill costs appear on hover (desktop) and 400ms long-press (mobile)
- [ ] Locked skills show 🔒, unaffordable skills are dim+desaturated
- [ ] Affordable skills glow with their individual skill color