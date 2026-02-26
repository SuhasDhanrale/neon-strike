Dramatic Gear Unlock Visual Effects
Goal
When the player unlocks a new gear via "Supply Energy", trigger an explosive power-surge sequence:

Bright flash-bang — a high-opacity white/cyan overlay floods the SVG for ~150ms then fades
Heavy screen shake — a new, violent CSS keyframe shakes/rotates the SVG container for 600ms then stops
Canvas particle explosion — 80–100 bright magma/cyan embers erupt upward from the bottom-center of the canvas
Gear rev-up — background gears spin at 8× normal speed for ~600ms, then smoothly ramp back down to the normal speed dictated by activeGears.size
All effects must resolve cleanly; the game must not be left in a shaking, flashing, or turbocharged state.

Architecture Notes (from code audit)
File	What it currently has	What is missing
GearBackground.js
_internalSpeed variable; _showFlash, shakeContainerEl, sparkEls[]; existing gearPowerSurge keyframe (4px soft shake)	New violent keyframe; unlock-specific flash sequence; speed override; spark temp-boost
particleSystem.js
triggerEmbersBurst(amount)
 — embers at random X; 
Particle
 class	A dedicated GearUnlockEmber class with high-velocity fountain physics; triggerGearUnlockExplosion()
GearSystem.js
EventBus.emit('celebration:gear_unlocked') (line 121); existing EventBus.on('celebration:gear_unlocked') listener for glass blur reveal (line 181)	A second listener calling the new particle function
Pitfalls & Mitigations
WARNING

Speed override conflicts with 
update()
 loop. The 
update()
 loop overwrites _internalSpeed every frame based on activeGears.size. A naïve "set speed = 40" approach will be silently reverted on the next frame (16ms later). Fix: Use a separate _gearUnlockSpeedBoost number and a _gearUnlockSpeedDecay flag. Each frame, if boost > 0, we ADD it to whatever _internalSpeed would normally be, then decay the boost exponentially, so it tapers off naturally without fighting the loop.

WARNING

Shake animation must fully stop. If we set shakeContainerEl.style.animation = 'gearUnlockShake 0.6s ...' and the gear count also triggers _isGlitching = true, the 
applyVisualState()
 call will re-apply gearGlitchShake and overwrite our unlock shake. Fix: Introduce a _unlockShakeActive boolean flag. Inside 
applyVisualState()
, if this flag is true, bail early from the animation-block—don't touch shakeContainerEl.style.animation. The flag is cleared by a setTimeout that fires after the unlock animation duration.

WARNING

Flash conflicts with overdrive flash. The existing flashOverlayEl is shared with overdrive/glitch logic in 
applyVisualState()
. If the gear count after a new unlock pushes us into overdrive (e.g., unlocking gear #11), 
applyVisualState()
 will set opacity to 0.15 and overwrite our brighter unlock flash. Fix: Use a separate _unlockFlashActive flag. Add an early-return at the top of the flash-setting block in 
applyVisualState()
 while the unlock flash is in control.

CAUTION

Double EventBus.on('celebration:gear_unlocked') registration. 
GearSystem.js
 already has a listener (lines 181–193 in GearSystem.init()) for glass blur. We must NOT call GearBackground.triggerGearUnlockSequence() from inside that same handler — GearBackground.init() is called before GearSystem.init(), but it imports nothing from GearSystem, so a direct function call from GearSystem → GearBackground is fine. Fix: Register a second, independent EventBus.on inside GearSystem.init() immediately after the blur listener, calling the new exported function from GearBackground and particleSystem.

NOTE

Gear #0 is the "free" first gear. 
tryActivateGear()
 currently only fires celebration:gear_unlocked when nextIndex > 0 (line 120–122). The first gear silently activates. This is intentional and should remain unchanged.

Proposed Changes
GearBackground.js
[MODIFY] 
GearBackground.js
A. New CSS keyframe — gearUnlockShake (injected in 
init()
 alongside existing keyframes):

js
@keyframes gearUnlockShake {
  0%   { transform: translate(0, 0) rotate(0deg); }
  8%   { transform: translate(-8px, -6px) rotate(-0.8deg); }
  16%  { transform: translate(9px, 5px) rotate(0.6deg); }
  24%  { transform: translate(-7px, 7px) rotate(-0.5deg); }
  32%  { transform: translate(8px, -8px) rotate(0.9deg); }
  40%  { transform: translate(-6px, 4px) rotate(-0.4deg); }
  50%  { transform: translate(5px, -5px) rotate(0.5deg); }
  60%  { transform: translate(-4px, 3px) rotate(-0.3deg); }
  75%  { transform: translate(3px, -2px) rotate(0.2deg); }
  90%  { transform: translate(-1px, 1px) rotate(-0.1deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
This is heavier than gearPowerSurge (4px) — uses 8–9px translations with slight rotations.

B. New module-level state variables:

js
let _unlockShakeActive = false   // blocks applyVisualState() from overwriting animate during unlock
let _unlockFlashActive = false   // blocks applyVisualState() from touching flash during unlock
let _gearUnlockSpeedBoost = 0   // additive speed boost, decays per frame
C. Modify 
update()
 — speed boost decay:

In the speed calculation block (after _internalSpeed is set based on overdrive/glitch/normal), add:

js
if (_gearUnlockSpeedBoost > 0) {
    _internalSpeed += _gearUnlockSpeedBoost
    _gearUnlockSpeedBoost *= 0.93  // exponential decay — fades over ~40 frames (≈660ms @60fps)
    if (_gearUnlockSpeedBoost < 0.1) _gearUnlockSpeedBoost = 0
}
D. Modify 
applyVisualState()
 — guard blocks:

In the flash block: add if (_unlockFlashActive) return skipping the normal flash logic for the flash overlay element only.
In the shake block: add if (_unlockShakeActive) return skipping the animation assignment to shakeContainerEl.
E. New exported function triggerGearUnlockSequence():

js
export function triggerGearUnlockSequence() {
    // 1. FLASH — bright white-cyan spike, then fade
    _unlockFlashActive = true
    flashOverlayEl.setAttribute('fill', '#ffffff')          // pure white blast
    flashOverlayEl.style.transition = 'opacity 0.08s ease-in'
    flashOverlayEl.setAttribute('opacity', '0.55')          // very bright
    setTimeout(() => {
        flashOverlayEl.style.transition = 'opacity 1.2s ease-out'
        flashOverlayEl.setAttribute('opacity', '0')
        // release after fade-out is mostly done
        setTimeout(() => {
            _unlockFlashActive = false
            flashOverlayEl.setAttribute('fill', '#22d3ee')  // restore normal color
        }, 1200)
    }, 150)                                                  // hold peak for 150ms
    // 2. SHAKE — violent, one-shot, 600ms
    _unlockShakeActive = true
    shakeContainerEl.style.animation = 'gearUnlockShake 0.6s ease-out forwards'
    setTimeout(() => {
        shakeContainerEl.style.animation = ''
        _unlockShakeActive = false
        // Let applyVisualState re-evaluate the animation from current state
    }, 650)
    // 3. SPARK REV-UP — cyan burst color + faster animation for 1000ms
    sparkEls.forEach((sparkEl, i) => {
        const s = sparks[i]
        sparkEl.setAttribute('fill', '#00ffff')
        sparkEl.style.animation = `floatSpark ${s.duration * 0.2}s linear ${s.delay}s infinite`
    })
    setTimeout(() => {
        // Restore to whatever applyVisualState would normally set
        // Leave it for the next applyVisualState call (called by update())
    }, 1000)
    // 4. SPEED BOOST — additive, decays in update() loop naturally
    _gearUnlockSpeedBoost = 35   // peak additive boost on top of whatever base speed is
}
particleSystem.js
[MODIFY] 
particleSystem.js
A. New class GearUnlockEmber:

js
export class GearUnlockEmber {
    constructor(x, y) {
        this.x = x
        this.y = y
        // Fountain cone: roughly upward (between -110° and -70° from horizontal)
        // But allow wide scatter: -150° to -30° (mostly upward)
        const spreadAngle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI * 1.2)
        const speed = 10 + Math.random() * 22    // fast
        this.vx = Math.cos(spreadAngle) * speed
        this.vy = Math.sin(spreadAngle) * speed
        this.life = 1.0
        this.decay = 0.008 + Math.random() * 0.012   // slow decay = long lived
        this.size = 2 + Math.random() * 5
        // Color: mix of cyan, white, magma orange
        const r = Math.random()
        this.color = r < 0.45 ? '#00ffff'
                   : r < 0.7  ? '#ffffff'
                   : r < 0.85 ? '#22d3ee'
                   :             '#e85d20'   // a few warm ember sparks for contrast
    }
    update() {
        this.x += this.vx
        this.y += this.vy
        this.vx *= 0.94    // air resistance
        this.vy *= 0.94
        this.vy += 0.25    // gravity
        this.life -= this.decay
    }
    draw(ctx) {
        ctx.save()
        ctx.globalAlpha = Math.max(0, this.life * this.life)   // quadratic fade
        ctx.shadowBlur = 12
        ctx.shadowColor = this.color
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }
}
B. New function triggerGearUnlockExplosion():

js
export function triggerGearUnlockExplosion() {
    const screenW = State?.canvas?.width || 400
    const screenH = State?.canvas?.height || 600
    // Spawn from a broad base at the bottom-center
    const count = 80 + Math.floor(Math.random() * 21)   // 80–100
    for (let i = 0; i < count; i++) {
        const spawnX = screenW * 0.5 + (Math.random() - 0.5) * screenW * 0.6
        const spawnY = screenH - 10
        State.particles.push(new GearUnlockEmber(spawnX, spawnY))
    }
}
The existing 
updateParticles()
 and 
drawParticles()
 loops already handle any particle in State.particles, so no loop changes are needed — GearUnlockEmber is drop-in compatible.

GearSystem.js
[MODIFY] 
GearSystem.js
In GearSystem.init(), add a second EventBus.on('celebration:gear_unlocked') listener immediately after the glass-blur listener:

js
import { triggerGearUnlockSequence } from '../visuals/Background/GearBackground.js'
import { triggerGearUnlockExplosion } from '../visuals/particleSystem.js'
// (inside init(), after the existing glass-blur EventBus.on block)
EventBus.on('celebration:gear_unlocked', () => {
    triggerGearUnlockSequence()    // SVG: shake + flash + spark boost + gear rev-up
    triggerGearUnlockExplosion()   // Canvas: 80-100 embers
})
NOTE

Both triggerGearUnlockSequence and triggerGearUnlockExplosion are synchronous calls that simply set state/push particles. They will not cause circular import issues because GearSystem already imports from eventBus, state, and config — adding imports from GearBackground and particleSystem is safe (neither of those import from GearSystem).

Verification Plan
No automated tests exist in this project. All verification is manual.

Manual Verification Steps
Prerequisites: Run the dev server with npm run dev in the project root. Open the game in Chrome at the local URL shown.

Step 1 — Dev tool energy cheat: Open Chrome DevTools console and paste:

js
import('./src/state.js').then(m => { m.State.currentEnergy = m.State.gearEnergyTarget; console.log('Energy filled!') })
This sets energy to the exact cost of the next gear.

Step 2 — Click "⚡ Supply Energy" button.

Expected results (all must pass):

 Screen flashes bright white instantly, then fades to nothing over ~1 second
 A violent, rotational screen shake plays for ~600ms and then fully stops
 80–100 bright cyan/white embers erupt upward from the bottom of the game canvas and fade as they arc away
 The background gears visibly spin much faster for ~0.5–1 second then gradually decelerate back to normal
 The background sparks turn bright cyan and race upward rapidly, then return to their normal color/speed
 After all effects finish, the game is in a clean state: no shake, no persistent flash, no turbocharged gears
Step 3 — Repeat for gear #2, #3 to ensure no accumulation of state:

Repeat Step 1 & 2 twice more. Effects should fire cleanly each time with no leftover effects from the previous unlock.
Step 4 — Overdrive check (if all 11 gears active): Unlock the last gear. Confirm that the unlock VFX fires first, and then the overdrive state takes over naturally (cyan overdrive glow, constant fast spin) without visual glitching or animation conflicts.