# Orb Responsive Sizing Plan

## Current Implementation Analysis

The codebase already has a **global scale system** in place:
- [`State.scale`](src/state.js:10) is used throughout the game
- Orb radius is calculated as: `ORB_TYPES[typeIndex].radius * State.scale` (see [`orbManager.js:38`](src/core/orbManager.js:38))
- Geode radius: `40 * State.scale` (see [`orbManager.js:31`](src/core/orbManager.js:31))

The existing `scale` is already responsive, but it may not dynamically adapt to screen size changes. Below are options to enhance this.

---

## Option A: Fixed Scale Factor Based on Reference Resolution (Recommended)

### Approach
Maintain a single `scale` value derived from comparing the current canvas size to a reference resolution (e.g., 1080p).

### Implementation
1. **Define reference resolution**: Use 1080p (1920×1080) as baseline
2. **Calculate scale dynamically**: `scale = min(gameWidth / 1920, gameHeight / 1080)`
3. **Apply uniformly**: Use existing `State.scale` throughout

### Pros
- Simple to implement
- Maintains existing codebase patterns
- Consistent scaling across all elements
- Easy to debug (single variable)

### Cons
- Linear scaling may not be ideal for extreme aspect ratios
- May need tuning for very small/large screens

### Code Pattern
```javascript
// In main.js or game initialization
function calculateScale() {
  const REF_WIDTH = 1920
  const REF_HEIGHT = 1080
  const scaleX = State.gameWidth / REF_WIDTH
  const scaleY = State.gameHeight / REF_HEIGHT
  State.scale = Math.min(scaleX, scaleY) // maintain aspect ratio
}
```

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
