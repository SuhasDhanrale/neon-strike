# Gear Unlock Visual Effects Implementation Plan

## Summary
Add dramatic background shake and fire-like particle effects during gear unlock events.

## Requirements from Discussion
- **Shake Intensity**: Intense shake - dramatic impact with screen rumble
- **Extra Particles**: Triple the amount (~45 additional fire-like particles on unlock)
- **Duration**: Quick burst (0.5 seconds) - snappy and responsive

## Current State Analysis
The codebase already has:
- [`GearBackground.js`](src/visuals/Background/GearBackground.js) - Contains [`shakeContainerEl`](src/visuals/Background/GearBackground.js:223) for shake effects and existing [`floatSpark`](src/visuals/Background/GearBackground.js:193) keyframe animations for upward-floating particles
- [`GearSystem.js`](src/systems/GearSystem.js) - Already emits [`celebration:gear_unlocked`](src/systems/GearSystem.js:121) event when a gear unlocks
- [`particleSystem.js`](src/visuals/particleSystem.js) - Contains [`triggerEmbersBurst()`](src/visuals/particleSystem.js:232) for upward-floating ember particles
- Existing shake animations: [`gearPowerSurge`](src/visuals/Background/GearBackground.js:440) and [`gearGlitchShake`](src/visuals/Background/GearBackground.js:442)

## Implementation Tasks

### Task 1: Create Gear Unlock Shake Animation
**File**: `src/visuals/Background/GearBackground.js`
- Add new CSS keyframe animation `gearUnlockShake` with intense shake pattern
- Animation should include:
  - Rapid random offsets (translateX, translateY)
  - Slight rotation for mechanical feel
  - Duration: 0.5 seconds
- Modify the existing event listener for `celebration:gear_unlocked` to trigger this shake
- Apply shake to the `shakeContainerEl`

### Task 2: Enhance Background Particles on Gear Unlock
**File**: `src/visuals/Background/GearBackground.js`
- Create a new function to spawn burst of fire particles
- Spawn ~45 extra particles (triple the current ~15 base sparks)
- Use existing fire/ember colors (#fbbf24, #e85d20, #ff7a35)
- Particles should float upward (like existing sparks)
- Add to the existing spark container

### Task 3: Listen for Gear Unlock Event
**File**: `src/visuals/Background/GearBackground.js`
- The system already emits `celebration:gear_unlocked` from [`GearSystem.js`](src/systems/GearSystem.js:121)
- Add event listener in GearBackground to listen for this event
- Trigger shake + particle burst when event fires
- Event data includes `{ gearIndex: number }`

### Task 4: Add Canvas Particle Burst (Optional Enhancement)
**File**: `src/visuals/particleSystem.js`
- Create `triggerGearUnlockEmbers()` function
- Spawns ~45 ember particles from bottom of screen
- Particles rise rapidly upward with fire colors
- Call this from the gear unlock celebration handler

## Technical Notes
- The existing `EventBus` system will be used to communicate between GearSystem and GearBackground
- CSS animations will be used for the shake effect (better performance)
- SVG particles in background for ambient effect
- Canvas particles for foreground celebration (optional)

## Files to Modify
1. `src/visuals/Background/GearBackground.js` - Main shake and particle burst logic
2. `src/visuals/particleSystem.js` - Optional: canvas-based ember burst function

## Testing Checklist
- [ ] Gear unlock triggers background shake
- [ ] Fire-like particles increase during unlock
- [ ] Effect duration is ~0.5 seconds
- [ ] Shake feels intense/dramatic
- [ ] No performance issues with particle count
