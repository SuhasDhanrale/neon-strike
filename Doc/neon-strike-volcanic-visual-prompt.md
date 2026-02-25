# 🌋 NEON STRIKE — VOLCANIC PRINT VISUAL REDESIGN
### VS Code AI Agent — Complete Visual Layer Overhaul

> **SCOPE:** This prompt rewrites every visual file. Game logic, physics, state, and scoring are untouched. You are a visual designer who codes — not a developer who adds styles. Every decision should be intentional. Every frame should be worth screenshotting.

---

## 🎯 THE AESTHETIC IN ONE SENTENCE

**Bold Graphic Novel meets Volcanic Risograph Print** — thick black outlines, flat charcoal fills, molten ember accents, and the kinetic energy of a comic panel where something is always about to explode.

No neon. No gradients that fade to nothing. No glow effects that blur the world soft.
This game looks like it was **screen-printed with four inks on heavy black card.**

---

## 🎨 THE VOLCANIC PRINT PALETTE

```css
:root {
  /* FOUNDATIONS */
  --ink-black:   #1a1410;  /* Near-black with warm brown undertone. Not pure black. */
  --charcoal:    #2d2520;  /* Background panels, UI containers */
  --ash:         #4a4040;  /* Secondary surfaces, inactive states */
  --smoke:       #6b5e58;  /* Borders, subtle separators */
  --parchment:   #e8ddd0;  /* Primary text, orb values */
  --cream:       #f5ede0;  /* Highlight text, important labels */

  /* VOLCANIC ACCENTS */
  --ember:       #e85d20;  /* Primary danger accent — heat, alerts */
  --lava:        #c93010;  /* Critical state, max heat */
  --magma:       #ff7a35;  /* Mid-range heat, warm highlights */
  --cinder:      #8c3a10;  /* Deep shadow on hot elements */
  --coal:        #3d2010;  /* Darkest warm tone — chamber fill */

  /* COOL CONTRAST (sparingly) */
  --slate:       #5a7a8a;  /* Value-2 orb, coolest element */
  --glacier:     #7a9eb0;  /* Frost orbs in chamber */
  --bone:        #c8b8a8;  /* Geode coloring */
}
```

### Palette Rules
- **Ember, lava, magma** are earned colors. They appear when something is dangerous or active. Not decorative.
- **Never use pure white (#ffffff).** It kills the print aesthetic instantly.
- **Never use pure black (#000000).** Use ink-black instead.
- **No CSS gradients on orb fills.** Flat color only. Depth comes from outline weight and hard shadow offset.
- **No canvas shadowBlur anywhere.** Set it to 0 globally. Depth is achieved by geometry, not blur.

---

## 📁 FILES TO CREATE / REWRITE

```
src/visuals/theme.js               ← Rewrite completely
src/visuals/styles.css             ← Rewrite completely
src/visuals/renderer.js            ← Rewrite draw layer order
src/visuals/orbRenderer.js         ← Rewrite completely
src/visuals/chamberRenderer.js     ← Rewrite completely
src/visuals/shooterRenderer.js     ← Rewrite completely
src/visuals/particleSystem.js      ← Rewrite Particle + FloatingText classes
src/visuals/vfxHelpers.js          ← Rewrite merge flash + screen shake
src/visuals/backgroundRenderer.js  ← CREATE NEW
```

**Do NOT touch:** state.js, config.js, orbManager.js, physics.js, heatSystem.js, scoring.js, inputHandler.js, gameLoop.js, main.js, ftue/*

---

## 🖊️ THE GRAPHIC NOVEL RENDERING RULES

These apply to every drawn element. Internalize them before writing a line of canvas code.

### Rule 1 — Everything has a thick black outline
No element exists without a stroked border in #1a1410 at minimum 3px. Orbs: 4px. UI containers: 3px. Shooter: 4px.

### Rule 2 — Shadows are hard offsets, not blurs
```js
// CORRECT — hard offset shadow
ctx.fillStyle = '#1a1410'
ctx.beginPath()
ctx.arc(orb.x + 4, orb.y + 5, orb.radius, 0, Math.PI * 2) // shadow drawn first
ctx.fill()
// Then draw the actual orb on top at orb.x, orb.y

// WRONG — never do this
ctx.shadowBlur = 15
ctx.shadowColor = '#anything'
```

### Rule 3 — Flat fills, depth from marks
Orb fills are flat. Depth comes from: hard offset shadow underneath + single specular highlight circle (top-left, 15% of orb radius, solid #e8ddd0 at opacity 0.55) + thick outline weight.

### Rule 4 — Action moments are loud
Merge, eruption, skill activations: big, bold, expressive. Comic caption bursts. Hard cuts. No smooth fades where a snap feels better.

### Rule 5 — Halftone is the texture language
When texture is needed, use halftone dot patterns drawn in canvas — not CSS gradients.

### Rule 6 — Typography is display weight, wide tracking
Font: **Bebas Neue** for all display text (scores, labels, floating text, toasts). Rajdhani as fallback. Never Inter. Never Roboto.
Import: `https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@500;700;900`

---

## 🔴 ORB VISUAL SYSTEM

### `src/visuals/theme.js` — Orb Color Map

Values progress from cool (low) to molten (high):

```js
export const ORB_VISUALS = [
  // idx 0 — value 2
  { fill: '#5a7a8a', shadow: '#2d3d45', outline: '#1a1410', label: '#e8ddd0' },
  // idx 1 — value 4
  { fill: '#6b8a70', shadow: '#354538', outline: '#1a1410', label: '#e8ddd0' },
  // idx 2 — value 8
  { fill: '#8a7a50', shadow: '#453d28', outline: '#1a1410', label: '#e8ddd0' },
  // idx 3 — value 16
  { fill: '#9a6a38', shadow: '#4d3520', outline: '#1a1410', label: '#f5ede0' },
  // idx 4 — value 32
  { fill: '#b85530', shadow: '#5c2a18', outline: '#1a1410', label: '#f5ede0' },
  // idx 5 — value 64
  { fill: '#c94020', shadow: '#641e10', outline: '#1a1410', label: '#f5ede0' },
  // idx 6 — value 128
  { fill: '#e85d20', shadow: '#741e08', outline: '#1a1410', label: '#f5ede0' },
  // idx 7 — value 256
  { fill: '#e83a10', shadow: '#740808', outline: '#1a1410', label: '#f5ede0' },
  // idx 8 — value 512
  { fill: '#d42808', shadow: '#6a0404', outline: '#1a1410', label: '#f5ede0' },
  // idx 9 — value 1024
  { fill: '#c01808', shadow: '#600404', outline: '#1a1410', label: '#f5ede0' },
  // idx 10 — value 2048 — INVERTED. Crown tier.
  { fill: '#e8ddd0', shadow: '#8c3a10', outline: '#e85d20', label: '#1a1410' },
]
```

### `src/visuals/orbRenderer.js` — Draw Function

```js
export function drawOrb(ctx, orb) {
  const visual = ORB_VISUALS[orb.typeIndex]
  const { x, y, radius } = orb

  ctx.save()
  ctx.shadowBlur = 0  // Always 0. No exceptions.

  // 1. HARD OFFSET SHADOW — drawn behind, offset bottom-right
  ctx.fillStyle = visual.shadow
  ctx.beginPath()
  ctx.arc(x + radius * 0.18, y + radius * 0.2, radius, 0, Math.PI * 2)
  ctx.fill()

  // 2. FLAT FILL
  ctx.fillStyle = visual.fill
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  // 3. SPECULAR MARK — solid circle, top-left quadrant, NOT a gradient
  ctx.globalAlpha = 0.55
  ctx.fillStyle = '#e8ddd0'
  ctx.beginPath()
  ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.18, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1.0

  // 4. THICK OUTLINE
  ctx.strokeStyle = visual.outline
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()

  // 5. VALUE LABEL — stroked then filled for maximum legibility
  ctx.fillStyle = visual.label
  ctx.font = `900 ${Math.floor(radius * 0.85)}px 'Bebas Neue', 'Rajdhani', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = visual.outline
  ctx.lineWidth = Math.max(3, radius * 0.12)
  ctx.strokeText(orb.value, x, y + radius * 0.05)
  ctx.fillText(orb.value, x, y + radius * 0.05)

  ctx.restore()
}
```

### Special Orb States

**Frosted (Chamber) Orbs:**
```js
// Override fill with '#7a9eb0' (glacier)
// Outline color: '#4a6070' instead of ink-black
// Specular mark: larger (radius * 0.25) and more opaque (0.75)
// Draw 4 diagonal crosshatch lines inside orb clip:
//   ctx.clip() after arc path, then draw thin lines at 45deg
//   color: '#1a1410' at opacity 0.15
```

**Geode Orbs:**
```js
// Fill: '#c8b8a8' (bone)
// Outline: 5px, color '#4a4040' (ash)
// Interior: draw 2 concentric circles inside at decreasing opacity
//   (geological cross-section feel)
// When hp < 2 (cracked): draw 2 jagged crack lines across center
//   Use 4 lineTo points with slight angle variation — NOT smooth bezier
//   Crack color: '#e85d20' (ember), lineWidth: 3
```

**Pierce Ammo (ghostTimer > 0):**
```js
// Fill: transparent
// Outline: setLineDash([6, 4]), color '#e85d20', lineWidth: 3
// No specular mark while ghosting
// No shadow
```

---

## 🌋 CHAMBER RENDERER — `src/visuals/chamberRenderer.js`

```js
export function drawChamber(ctx, state) {
  const { canvas, mainFloorY, systemHeat } = state
  const chamberH = canvas.height - mainFloorY
  const heat = systemHeat / 100

  // 1. COAL BASE
  ctx.fillStyle = '#3d2010'
  ctx.fillRect(0, mainFloorY, canvas.width, chamberH)

  // 2. HALFTONE HEAT DOTS — real dots, not a gradient
  if (heat > 0.05) {
    ctx.save()
    ctx.globalAlpha = heat * 0.5
    ctx.fillStyle = '#e85d20'
    const spacing = 12, dotR = 2.5
    for (let px = spacing / 2; px < canvas.width; px += spacing) {
      for (let py = mainFloorY + 8; py < canvas.height; py += spacing) {
        ctx.beginPath()
        ctx.arc(px, py, dotR, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  // 3. FLOOR LINE — hard shadow behind, then colored dashed line
  // Shadow line
  ctx.strokeStyle = '#1a1410'
  ctx.lineWidth = 7
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(0, mainFloorY + 2)
  ctx.lineTo(canvas.width, mainFloorY + 2)
  ctx.stroke()

  // Color line — lerps from ash to lava as heat rises
  const lineColor = lerpColor('#4a4040', '#c93010', heat)
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 5
  ctx.setLineDash([18, 8])
  ctx.beginPath()
  ctx.moveTo(0, mainFloorY)
  ctx.lineTo(canvas.width, mainFloorY)
  ctx.stroke()
  ctx.setLineDash([])

  // 4. CHAMBER LABEL — stencil style
  ctx.save()
  ctx.globalAlpha = 0.2 + heat * 0.3
  ctx.fillStyle = '#6b5e58'
  ctx.font = 'bold 11px "Bebas Neue", "Rajdhani", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('GEOTHERMAL CHAMBER', canvas.width / 2, mainFloorY + 22)
  ctx.restore()
}

function lerpColor(hex1, hex2, t) {
  const parse = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
  const [r1,g1,b1] = parse(hex1)
  const [r2,g2,b2] = parse(hex2)
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`
}
```

---

## 🗺️ BACKGROUND RENDERER — `src/visuals/backgroundRenderer.js` (NEW)

```js
let _cache = null, _cacheW = 0, _cacheH = 0

export function drawBackground(ctx, canvas) {
  // 1. CHARCOAL BASE — flat, warm
  ctx.fillStyle = '#2d2520'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. CROSSHATCH TEXTURE — cached offscreen canvas
  // Rebuild only on resize
  if (!_cache || _cacheW !== canvas.width || _cacheH !== canvas.height) {
    _cache = buildCrosshatch(canvas.width, canvas.height)
    _cacheW = canvas.width
    _cacheH = canvas.height
  }
  ctx.drawImage(_cache, 0, 0)

  // 3. CORNER DARKENING — four rect fills, not a radial gradient
  const v = canvas.width * 0.4
  ctx.fillStyle = 'rgba(26, 20, 16, 0.5)'
  ctx.fillRect(0, 0, v, v)
  ctx.fillRect(canvas.width - v, 0, v, v)
  ctx.fillRect(0, canvas.height - v, v, v)
  ctx.fillRect(canvas.width - v, canvas.height - v, v, v)
}

function buildCrosshatch(w, h) {
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const octx = off.getContext('2d')
  octx.strokeStyle = 'rgba(26, 20, 16, 0.2)'
  octx.lineWidth = 0.8
  const spacing = 16
  for (let i = -(h); i < w + h; i += spacing) {
    octx.beginPath()
    octx.moveTo(i, 0)
    octx.lineTo(i + h, h)
    octx.stroke()
  }
  return off
}
```

---

## 💥 PARTICLE SYSTEM REWRITE — `src/visuals/particleSystem.js`

### MergeParticle — Crack Shards

```js
class MergeParticle {
  constructor(x, y, orbFill) {
    this.x = x
    this.y = y
    const angle = Math.random() * Math.PI * 2
    const speed = 3 + Math.random() * 9
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.life = 1.0
    this.decay = 0.035 + Math.random() * 0.03
    this.length = 6 + Math.random() * 14
    this.angle = angle
    const r = Math.random()
    this.color = r < 0.5 ? orbFill : r < 0.75 ? '#e85d20' : '#e8ddd0'
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vx *= 0.91
    this.vy *= 0.91
    this.vy += 0.35   // gravity
    this.life -= this.decay
  }

  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.life * this.life  // quadratic — stays opaque longer
    ctx.strokeStyle = this.color
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(
      this.x - Math.cos(this.angle) * this.length * this.life,
      this.y - Math.sin(this.angle) * this.length * this.life
    )
    ctx.stroke()
    ctx.restore()
  }
}
```

### FloatingText — Comic Caption

```js
class FloatingText {
  constructor(x, y, text, color, size = 22) {
    this.x = x
    this.y = y
    this.text = text
    this.color = color
    this.vy = -2.8
    this.life = 1.0
    this.size = size
    // Elastic snap-in: start squashed wide, settle to 1,1
    this.scaleX = 1.4
    this.scaleY = 0.65
    this.settling = true
  }

  update() {
    this.y += this.vy
    this.vy *= 0.94
    this.life -= 0.022
    if (this.settling) {
      this.scaleX += (1 - this.scaleX) * 0.28
      this.scaleY += (1 - this.scaleY) * 0.28
      if (Math.abs(this.scaleX - 1) < 0.015) this.settling = false
    }
  }

  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.life > 0.3 ? 1.0 : this.life / 0.3
    ctx.translate(this.x, this.y)
    ctx.scale(this.scaleX, this.scaleY)
    ctx.font = `900 ${this.size}px 'Bebas Neue', 'Rajdhani', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    // Heavy outline first — comic caption look
    ctx.strokeStyle = '#1a1410'
    ctx.lineWidth = Math.max(5, this.size * 0.22)
    ctx.strokeText(this.text, 0, 0)
    ctx.fillStyle = this.color
    ctx.fillText(this.text, 0, 0)
    ctx.restore()
  }
}
```

### Floating Text Color Map

Map the existing floating text call-sites to volcanic palette colors:

| Text | Old color | New color |
|---|---|---|
| `+{score}` | `#fff` | `#e8ddd0` |
| `×{combo}` | `#ffd700` | `#e85d20` |
| `SHAKE!` | `#00f3ff` | `#e8ddd0` |
| `SMASH!` | `#00ff41` | `#e8ddd0` |
| `VOID -{n}` | `#bc13fe` | `#c8b8a8` |
| `ERUPTION!` | `#ff8c00` | `#e85d20` |
| `CRACKED!` | `#fff` | `#e8ddd0` |
| `NEED ENERGY!` | `#ff003c` | `#c93010` |
| `+30 HEAT` | `#ff003c` | `#c93010` |
| `PIERCING ROUND!` | `#f0f` | `#e85d20` |

---

## 💥 VFX HELPERS REWRITE — `src/visuals/vfxHelpers.js`

### Merge Flash — Jagged Crack Ring

```js
let mergeFlashes = []

export function triggerMergeFlash(x, y, orbColor) {
  // Pre-generate jagged polygon points
  const pointCount = 10
  const points = Array.from({ length: pointCount }, (_, i) => ({
    angle: (i / pointCount) * Math.PI * 2,
    jitter: 0.7 + Math.random() * 0.6  // ±30% radius variation
  }))
  mergeFlashes.push({ x, y, color: orbColor, radius: 0, alpha: 1.0, points })
}

export function drawMergeFlashes(ctx) {
  mergeFlashes.forEach(f => {
    const progress = f.radius / 70
    ctx.save()
    ctx.globalAlpha = f.alpha * (1 - progress)
    ctx.strokeStyle = f.color
    ctx.lineWidth = 3.5 * (1 - progress * 0.6)
    ctx.lineJoin = 'round'
    ctx.beginPath()
    f.points.forEach((p, i) => {
      const r = f.radius * p.jitter
      const px = f.x + Math.cos(p.angle) * r
      const py = f.y + Math.sin(p.angle) * r
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.stroke()
    // White interior flash on first 20% of animation only
    if (progress < 0.2) {
      ctx.globalAlpha = (0.2 - progress) * 3 * 0.55
      ctx.fillStyle = '#e8ddd0'
      ctx.fill()
    }
    ctx.restore()
    f.radius += 5.5
    f.alpha -= 0.055
  })
  mergeFlashes = mergeFlashes.filter(f => f.alpha > 0)
}
```

### Screen Shake — Volcanic Tremor

```js
export function applyScreenShake(ctx, state) {
  if (state.screenShake <= 0) return
  // Strong vertical bias — tremor, not random jitter
  const dx = (Math.random() - 0.5) * state.screenShake * 0.5
  const dy = (Math.random() - 0.5) * state.screenShake
  ctx.translate(dx, dy)
  state.screenShake *= 0.87
  if (state.screenShake < 0.4) state.screenShake = 0
}
```

---

## 🔫 SHOOTER RENDERER — `src/visuals/shooterRenderer.js`

```js
export function drawShooter(ctx, state) {
  const { x, y } = state.shooterPos
  const r = 13

  // 1. HARD SHADOW
  ctx.fillStyle = '#1a1410'
  ctx.beginPath()
  ctx.arc(x + 3, y + 4, r, 0, Math.PI * 2)
  ctx.fill()

  // 2. FLAT EMBER FILL
  ctx.fillStyle = '#e85d20'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()

  // 3. SPECULAR MARK
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#e8ddd0'
  ctx.beginPath()
  ctx.arc(x - 4, y - 4, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1.0

  // 4. OUTLINE
  ctx.strokeStyle = '#1a1410'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()

  // 5. VALUE INSIDE SHOOTER
  const shot = state.ammoQueue[0]
  if (shot) {
    const type = ORB_TYPES[shot.orbType]
    ctx.fillStyle = '#1a1410'
    ctx.font = `900 11px 'Bebas Neue', 'Rajdhani', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(type.value, x, y + 1)
  }

  // 6. AIM LINE — dual line for depth (shadow behind, parchment on top)
  if (state.isAiming) {
    const dx = state.aimStart.x - state.aimCurrent.x
    const dy = state.aimStart.y - state.aimCurrent.y

    // Shadow line
    ctx.strokeStyle = '#1a1410'
    ctx.lineWidth = 4
    ctx.setLineDash([12, 8])
    ctx.beginPath()
    ctx.moveTo(x + 2, y + 2)
    ctx.lineTo(x + dx * 2 + 2, y + dy * 2 + 2)
    ctx.stroke()

    // Main line
    ctx.strokeStyle = '#e8ddd0'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + dx * 2, y + dy * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Aim dot — shadow then fill
    ctx.fillStyle = '#1a1410'
    ctx.beginPath()
    ctx.arc(x - dx + 2, y - dy + 2, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e8ddd0'
    ctx.beginPath()
    ctx.arc(x - dx, y - dy, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // 7. DANGER LINE
  const dangerY = state.dangerLineY ?? (state.shooterPos.y - 20)
  ctx.strokeStyle = '#1a1410'
  ctx.lineWidth = 3
  ctx.setLineDash([12, 8])
  ctx.beginPath()
  ctx.moveTo(0, dangerY + 2)
  ctx.lineTo(state.canvas.width, dangerY + 2)
  ctx.stroke()
  ctx.strokeStyle = '#c93010'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, dangerY)
  ctx.lineTo(state.canvas.width, dangerY)
  ctx.stroke()
  ctx.setLineDash([])
}
```

---

## 🎨 CSS — VOLCANIC HUD — `src/visuals/styles.css`

Full replacement. Keep only non-HUD rules (body, canvas size, game-container layout).

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@500;700;900&display=swap');

body {
  background-color: #1a1410;
  font-family: 'Rajdhani', sans-serif;
}

#game-container {
  background: #2d2520;   /* Flat. No gradient. */
}

canvas {
  border-top: 4px solid #1a1410;
  box-shadow: none;  /* No neon glow */
}

/* CORNERS */
#hud-score, #hud-level {
  background: #1a1410;
  border: 3px solid #4a4040;
  border-radius: 3px;
}
.hud-label {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  color: #6b5e58;
  letter-spacing: 3px;
  font-size: 0.55rem;
}
.hud-value {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  color: #e8ddd0;
  font-size: 1.6rem;
  font-weight: 400;
  letter-spacing: 1px;
}

/* HEAT BAR */
.heat-wrap .bar-track {
  background: #1a1410;
  border: 3px solid #4a4040;
  border-radius: 2px;
  height: 16px;
  position: relative;
}
/* Segment tick marks over the bar */
.heat-wrap .bar-track::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    transparent,
    transparent calc(10% - 2px),
    #1a1410 calc(10% - 2px),
    #1a1410 10%
  );
  pointer-events: none;
  opacity: 0.65;
  z-index: 2;
}
.heat-fill {
  height: 100%;
  background: #e85d20;
  border-radius: 0;
  transition: width 0.15s ease-out;
}
.heat-wrap.pulsing .heat-fill {
  animation: heat-slam 0.5s ease-in-out infinite alternate;
}
.heat-wrap.critical .heat-fill {
  background: #c93010;
  animation: heat-slam 0.28s ease-in-out infinite alternate;
}
@keyframes heat-slam {
  from { transform: scaleY(1);   opacity: 1.0; }
  to   { transform: scaleY(1.12); opacity: 0.85; }
}

/* ENERGY BAR */
.energy-wrap .bar-track {
  background: #1a1410;
  border: 2px solid #3d3530;
  border-radius: 1px;
  height: 6px;
}
.energy-fill {
  background: #8a7a50;
  height: 100%;
  border-radius: 0;
  transition: width 0.2s ease-out;
}
.energy-wrap.full .energy-fill {
  background: #e8ddd0;
  animation: energy-ready 0.9s ease-in-out infinite alternate;
}
@keyframes energy-ready {
  from { opacity: 0.75; }
  to   { opacity: 1.0; }
}

/* NEXT SHOT ORB */
#next-shot-orb {
  width: 56px;
  height: 56px;
  background: #1a1410;
  border: 4px solid #4a4040;
  border-radius: 50%;
  /* Hard drop shadow — NO blur */
  box-shadow: 4px 5px 0 #0d0a08;
  transition: border-color 0.15s, box-shadow 0.15s;
}
#next-shot-value {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  color: #e8ddd0;
  font-size: 1.1rem;
}

/* SKILL BUTTONS */
.skill-btn {
  background: #1a1410;
  border: 3px solid #4a4040;
  border-radius: 5px;
  /* Hard drop shadow */
  box-shadow: 4px 4px 0 #0d0a08;
  transition: box-shadow 0.08s, transform 0.08s, border-color 0.2s;
}
.skill-btn.unlocked {
  border-color: #6b5e58;
}
.skill-btn.unlocked.can-afford {
  border-color: #e85d20;
  box-shadow: 4px 4px 0 #8c3a10;
}
/* Stamp press on active — moves INTO its shadow */
.skill-btn.unlocked.can-afford:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 #8c3a10;
}
.skill-icon { font-size: 1.4rem; }
.skill-label {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  letter-spacing: 2px;
  font-size: 0.6rem;
  color: #6b5e58;
}
.skill-btn.can-afford .skill-label { color: #e8ddd0; }

/* COST TOOLTIP */
.skill-cost-tip {
  background: #1a1410;
  border: 2px solid #e85d20;
  border-radius: 3px;
  box-shadow: 3px 3px 0 #8c3a10;
  color: #e8ddd0;
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  letter-spacing: 2px;
  font-size: 0.8rem;
  padding: 4px 10px;
}
.skill-cost-tip::after {
  border-top-color: #e85d20;
}

/* TOAST */
#level-toast {
  background: #1a1410;
  border: 3px solid #e85d20;
  border-radius: 3px;
  box-shadow: 6px 6px 0 #8c3a10;
  backdrop-filter: none;
}
.toast-title {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  color: #e85d20;
  letter-spacing: 4px;
  font-size: 1.4rem;
  font-weight: 400;
}
.toast-desc {
  color: #e8ddd0;
  font-family: 'Rajdhani', sans-serif;
}

/* GAME OVER */
#game-over-screen { background: #1a1410; }
#game-over-screen h1 {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  color: #c93010;
  font-size: 4rem;
  letter-spacing: 5px;
  text-shadow: 5px 5px 0 #600404;  /* Hard shadow only */
  font-weight: 400;
}

/* REBOOT BUTTON */
.btn {
  background: #e85d20;
  color: #1a1410;
  border: 3px solid #1a1410;
  border-radius: 3px;
  box-shadow: 5px 5px 0 #1a1410;
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  letter-spacing: 4px;
  font-size: 1.1rem;
  font-weight: 400;
  transition: transform 0.08s, box-shadow 0.08s;
}
.btn:active {
  transform: translate(4px, 4px);
  box-shadow: 1px 1px 0 #1a1410;
}

/* COMBO DISPLAY */
#combo-display {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  color: #e8ddd0;
  /* Stacked hard shadows — comic depth */
  text-shadow:
    3px 3px 0 #e85d20,
    6px 6px 0 #8c3a10,
    9px 9px 0 #1a1410;
  letter-spacing: -2px;
}

/* HEAT VIGNETTE */
#heat-vignette {
  background: radial-gradient(ellipse at center, transparent 35%, rgba(61, 32, 16, 0.5) 100%);
  /* Warm coal vignette — not red neon */
}
```

---

## 🗂️ MASTER DRAW ORDER — `src/visuals/renderer.js`

```js
export function draw() {
  const { ctx, canvas } = State

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.shadowBlur = 0   // Global reset. Set once. Never change.

  ctx.save()

  // Apply tremor before anything else
  applyScreenShake(ctx, State)

  // Layer 1 — Background (crosshatch + corner darkening)
  drawBackground(ctx, canvas)

  // Layer 2 — Chamber strip (coal base + halftone + floor line)
  drawChamber(ctx, State)

  // Layer 3 — Orbs (shadow first, then fill, then outline)
  State.orbs.forEach(orb => drawOrb(ctx, orb))

  // Layer 4 — Particles (crack shards)
  State.particles.forEach(p => p.draw(ctx))

  // Layer 5 — Floating text (comic captions)
  State.floatingTexts.forEach(t => t.draw(ctx))

  // Layer 6 — Merge flash rings
  drawMergeFlashes(ctx)

  // Layer 7 — Shooter + aim line + danger line
  drawShooter(ctx, State)

  // Layer 8 — FTUE pulse rings (if active)
  if (State.shooterPulseActive) drawFTUEPulse(ctx, State)

  ctx.restore()
}
```

---

## ⚠️ CRITICAL RULES

1. **`ctx.shadowBlur = 0` at the top of every draw function.** Set it once in renderer.js globally. Never use it for depth. If you find yourself typing `shadowBlur`, stop and use a hard offset instead.

2. **No pure black (#000000) or pure white (#ffffff) anywhere.** Use `#1a1410` and `#e8ddd0` respectively. This single rule gives the game its warmth.

3. **No CSS `box-shadow` with blur radius on game UI.** Hard shadows only: `box-shadow: 4px 4px 0 #color` — the blur value is always 0.

4. **No CSS `backdrop-filter: blur()` on toasts or panels.** Delete all instances. It fights the print aesthetic.

5. **Bebas Neue for all display text.** Scores, labels, floating text, toast titles, skill labels, game over heading. Rajdhani as fallback only.

6. **The crosshatch background is cached.** Do not redraw it every frame. Build it once on an offscreen canvas and `drawImage` it each frame.

7. **Halftone dots in the chamber are real drawn dots.** Not a CSS gradient, not a noise filter, not a repeating background-image. Actual `ctx.arc()` calls in a grid loop.

8. **The `2048` orb (typeIndex 10) is inverted.** Parchment fill, ember outline, ink-black label. It should look categorically different from all others — a crown, not just a big orb.

9. **All button interactions use the stamp-press pattern.** `transform: translate(Xpx, Ypx)` on `:active` moves the button into its shadow. The shadow shrinks to match. No scale transforms.

10. **Color-only danger communication.** No status text labels. Heat bar segments fill with ember. Screen vignette warms to coal. Floor line burns to lava. The player reads danger from color and motion, not words.

---

## ✅ DELIVERY CHECKLIST

- [ ] Bebas Neue loaded and applied to all display text
- [ ] Background: warm charcoal + crosshatch texture + corner darkening
- [ ] All orb fills match the volcanic color map (cool → hot progression)
- [ ] All orbs have: hard offset shadow + flat fill + specular mark + thick outline
- [ ] No `shadowBlur` anywhere in canvas code
- [ ] No pure black or pure white anywhere
- [ ] Frosted orbs: glacier fill + crosshatch interior + wider specular
- [ ] Geode orbs: bone fill + concentric rings + ember crack lines when damaged
- [ ] Chamber: coal base + halftone dots scale with heat + lava floor line
- [ ] Particles are crack shards, not circles
- [ ] Floating text has elastic snap-in + heavy outline
- [ ] Merge flash is a jagged polygon ring, not a circle
- [ ] Screen shake has vertical bias
- [ ] Skill buttons use stamp-press on active
- [ ] All box-shadows in CSS have blur radius of 0
- [ ] Game over screen: flat ink-black + hard text shadow on heading
- [ ] Combo display uses stacked hard text shadows
- [ ] Heat vignette is warm coal-toned, not red neon
- [ ] No backdrop-filter blur anywhere
- [ ] Everything looks like it was screen-printed, not rendered
