# Orb Responsive Sizing Plan

## Current Implementation Analysis

The codebase already has a **global scale system** in place:
- [`State.scale`](src/state.js:10) is used throughout the game
- Orb radius is calculated as: `ORB_TYPES[typeIndex].radius * State.scale` (see [`orbManager.js:38`](src/core/orbManager.js:38))
- Geode radius: `40 * State.scale` (see [`orbManager.js:31`](src/core/orbManager.js:31))

The existing `scale` is already responsive, but it may not dynamically adapt to screen size changes. Below are options to enhance this.

---

## Option A: Fixed Scale Factor - Height-Based ✅ IMPLEMENTED

### Goal
Ensure orbs scale proportionally based on screen HEIGHT only. Height is the key factor because orbs fall vertically due to gravity - vertical space is the limiting factor for gameplay.

### Why Height-Only?
1. **Vertical Gameplay**: Orbs fall and bounce - height determines how many can fit on screen
2. **Simpler Math**: No need for `Math.min(scaleX, scaleY)`
3. **More Predictable**: Orbs scale consistently regardless of screen width
4. **Canvas Constraints**: Your game already constrains width (max 400px on desktop)

### Detailed Implementation

#### Step 1: Define Reference Resolution
```javascript
const REF_WIDTH = 1920   // Design for Full HD width
const REF_HEIGHT = 1080  // Design for Full HD height
```

#### Step 2: Calculate Scale
```javascript
function calculateScale() {
  // How many times wider is current screen vs reference?
  const scaleX = State.gameWidth / REF_WIDTH
  
  // How many times taller is current screen vs reference?
  const scaleY = State.gameHeight / REF_HEIGHT
  
  // Use the SMALLER scale to fit everything within screen bounds
  // This prevents orbs from being cut off on extreme aspect ratios
  State.scale = Math.min(scaleX, scaleY)
}
```

#### Step 3: Where to Apply Scale (Existing Code)
The system already uses `State.scale` - we just need to calculate it dynamically:

```javascript
// In orbManager.js - orb radius calculation (ALREADY EXISTS)
this.radius = ORB_TYPES[typeIndex].radius * State.scale  // ✓ Works!

// In orbManager.js - geode radius (ALREADY EXISTS)  
this.radius = 40 * State.scale  // ✓ Works!
```

#### Step 4: When to Recalculate
Call `calculateScale()` at these moments:

```javascript
// 1. When game initializes
function initGame() {
  State.canvas.width = window.innerWidth
  State.canvas.height = window.innerHeight
  State.gameWidth = State.canvas.width
  State.gameHeight = State.canvas.height
  calculateScale()  // ← Calculate initial scale
}

// 2. When window resizes
window.addEventListener('resize', () => {
  State.canvas.width = window.innerWidth
  State.canvas.height = window.innerHeight
  State.gameWidth = State.canvas.width
  State.gameHeight = State.canvas.height
  calculateScale()  // ← Recalculate on resize
})

// 3. On mobile orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(calculateScale, 100)  // ← Wait for orientation to complete
})
```

### Enhanced Version: Add Min/Max Clamps
Prevent extreme scaling issues:

```javascript
const MIN_SCALE = 0.4   // Orbs never smaller than 40% of design
const MAX_SCALE = 1.5   // Orbs never larger than 150% of design

function calculateScale() {
  const scaleX = State.gameWidth / REF_WIDTH
  const scaleY = State.gameHeight / REF_HEIGHT
  const rawScale = Math.min(scaleX, scaleY)
  
  // Clamp to prevent too-small orbs on tiny screens
  // and too-large orbs on huge screens
  State.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale))
}
```

### Visual Example

| Screen Size | scaleX | scaleY | Final Scale | Orb Radius (Type 0: 40 base) |
|-------------|--------|--------|-------------|-------------------------------|
| 1920×1080   | 1.0    | 1.0    | 1.0         | 40 × 1.0 = 40px               |
| 960×540     | 0.5    | 0.5    | 0.5         | 40 × 0.5 = 20px               |
| 3840×2160   | 2.0    | 2.0    | 1.5 (clamped)| 40 × 1.5 = 60px              |
| 375×667     | 0.195  | 0.617  | 0.195→0.4   | 40 × 0.4 = 16px (clamped min) |

### Pros
- ✅ Simple to implement (5-10 lines of code)
- ✅ Maintains existing codebase patterns
- ✅ Consistent scaling across ALL elements (orbs, particles, text, UI)
- ✅ Easy to debug (single variable `State.scale`)
- ✅ Works for any screen size without device detection

### Cons
- Linear scaling may not be ideal for extreme aspect ratios (very wide or very tall)
- May need min/max clamps for very small/large screens
- On extremely wide screens, game may appear small (using min of X/Y)

---

## Option B: Breakpoint-Based Scale Tiers

### Approach
Use discrete scale values based on screen size categories (mobile, tablet, desktop, large desktop).

### Implementation
1. **Define breakpoints**: 
   - Mobile: < 600px width → scale = 0.5
   - Tablet: 600-1024px → scale = 0.7
   - Desktop: 1024-1920px → scale = 1.0
   - Large: > 1920px → scale = 1.2
2. **Override scale on resize**: Check current dimensions against breakpoints

### Pros
- More control over specific device categories
- Can fine-tune for common device sizes
- Easier to test specific breakpoints

### Cons
- More code to maintain
- May feel "jumpy" at breakpoint boundaries
- Doesn't smoothly adapt to all possible sizes

### Code Pattern
```javascript
function getBreakpointScale() {
  const width = window.innerWidth
  if (width < 600) return 0.5
  if (width < 1024) return 0.7
  if (width < 1920) return 1.0
  return 1.2
}
```

---

## Option C: Aspect Ratio Aware Scaling

### Approach
Calculate separate X and Y scales, then apply differently to different elements.

### Implementation
1. **Calculate separate scales**: `scaleX = gameWidth / REF_WIDTH`, `scaleY = gameHeight / REF_HEIGHT`
2. **Apply contextually**: 
   - Orb horizontal position/spacing: use `scaleX`
   - Orb vertical position/size: use `scaleY`
   - Or use `Math.min(scaleX, scaleY)` for uniform sizing

### Pros
- Handles extreme aspect ratios (ultrawide, tall phones) better
- More granular control

### Cons
- More complex implementation
- Could create visual inconsistencies if not applied carefully
- May require changes to multiple renderer files

---

## Option D: Viewport Unit Based Sizing (CSS-Inspired)

### Approach
Define orb sizes as percentages of viewport dimensions rather than fixed pixels.

### Implementation
1. **Define size as percentage**: e.g., orb radius = 4% of smaller viewport dimension
2. **Calculate at runtime**: `radius = min(gameWidth, gameHeight) * 0.04`
3. **Apply to ORB_TYPES**: Make radius a function rather than static value

### Pros
- Truly responsive to any screen size
- No breakpoints needed
- Consistent visual proportion

### Cons
- Requires restructuring `ORB_TYPES` in config.js
- More complex calculations
- May need significant refactoring

---

## Recommended Approach: Hybrid of Option A + D

**Best for this project** would be a hybrid approach:

1. **Base**: Use Option A (reference resolution scaling) as default
2. **Refinement**: Add minimum/maximum scale clamps to prevent extreme sizes
3. **Enhancement**: Listen to window resize events and recalculate

### Implementation Details

**Files to modify:**
- [`src/state.js`](src/state.js) - Add resize listener setup
- [`src/main.js`](src/main.js) - Add `calculateScale()` function and resize handler

**Key considerations:**
- Call `calculateScale()` on:
  - Game initialization
  - Window resize event
  - Canvas orientation change (mobile)
- Consider debouncing resize events for performance

### Scaling Formula Recommendation

```javascript
const REF_WIDTH = 1920
const REF_HEIGHT = 1080
const MIN_SCALE = 0.4   // Prevent orbs from becoming too small
const MAX_SCALE = 1.5   // Prevent orbs from becoming too large

function calculateScale() {
  const scaleX = State.gameWidth / REF_WIDTH
  const scaleY = State.gameHeight / REF_HEIGHT
  const rawScale = Math.min(scaleX, scaleY)
  
  // Clamp to reasonable bounds
  State.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale))
}
```

This ensures:
- Orbs remain playable on small screens (minimum size)
- Orbs don't become impossibly large on huge screens (maximum size)
- Consistent gameplay experience across all devices
