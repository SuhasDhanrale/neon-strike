Heat-Leak & Chamber UI Redesign
Remove the Frozen Blob and Hydraulic Push mechanics entirely, replace the 100% heat eruption with a clean energy-leak penalty, and redesign the geothermal chamber area into a permanent machine base that houses the energy bar + supply button.

Proposed Changes
Core Mechanic — Heat & Eruption
[MODIFY] 
heatSystem.js
Remove all hydraulic lift assignment inside 
triggerEruption()
Remove orb.isFrosted = false thaw logic
Remove graceMoves and eruptionLiftPending assignments
Replace eruption body with:
State.systemHeat = 0 (reset to 0)
Deduct 5% of State.maxEnergy from State.currentEnergy, floor at 0, persist to localStorage
EventBus.emit('state:heat_leak', { lost }) for System Bot
updateUI()
Orb System — Remove Frozen Blob
[MODIFY] 
orbManager.js
Orb
 constructor: Remove this.isFrosted, all 5 hydraulicLift* properties, isHydraulicLifting
Orb.update(): Remove the if (this.hydraulicLiftDuration > 0) early-return block
Orb.runHydraulicLiftStep(): Delete entire method
Orb.getDrawData(): Remove isFrosted field
spawnChamberBatch()
: Remove newFrost.isFrosted = true and newFrost.mass *= 2
resetGame()
: Remove State.eruptionLiftPending = 0 and State.graceMoves = 0
[MODIFY] 
physics.js
Remove if (o1.isHydraulicLifting || o2.isHydraulicLifting) continue
Remove !o1.isFrosted && !o2.isFrosted from the merge condition
Remove if (o1.isFrosted || o2.isFrosted) e = 0.3
Visuals — Remove Hydraulic Renderer & Frosted Orb
[MODIFY] 
orbRenderer.js
Remove else if (orb.isFrosted) branch and 
drawFrostedOrb()
 function entirely
[MODIFY] 
chamberRenderer.js
Remove 
drawHydraulicRods()
 and its call from 
draw()
Rework chamber to look like a machine base panel:
Thick dark panel with bolts/rivets at corners
Horizontal pipe/vent lines for mechanical feel
Keep halftone heat dots and heat-colored floor line (those stay)
[MODIFY] 
vfxHelpers.js
Remove 
triggerEruptionFlash()
 and 
drawEruptionFlash()
 function + state variable
Remove from the export default object
State & Config Cleanup
[MODIFY] 
state.js
Remove graceMoves and eruptionLiftPending from the State object
[MODIFY] 
config.js
Remove GRACE_MOVES_AFTER_ERUPTION export
System Bot — Energy Leak Event
[MODIFY] 
systemBot.js
Add heat_leak to GAMEPLAY_OVERRIDE:
js
heat_leak: { header: "ENERGY BREACH", subtext: "WARNING: Overheat event. Energy reserves vented to prevent meltdown.", type: "heat" }
Wire EventBus.on('state:heat_leak', ...) in 
init()
 → calls 
queueGameplayEvent('heat_leak')
Chamber UI Redesign — Machine Base
IMPORTANT

The current energy bar (#vertical-energy-container) and supply button (#supply-energy-btn) sit as a right-side overlay. They will be removed from there and placed inside the chamber area at the bottom of the canvas.

Visual concept: The chamber base looks like a machine capacitor panel. Energy fills from left to right in a horizontal bar (like charging up). The supply button sits at the right end of the bar — when the player presses it, energy drains left-to-right out of the bar into the gear system. It should feel like pressing a physical release valve.

[MODIFY] 
index.html
Remove #vertical-energy-container div from #ui-layer
Add a new #chamber-ui div inside #game-container, sitting over the canvas chamber zone, with:
Left/center: #xp-bar-track containing #xp-bar (horizontal rail, fills left-to-right)
Right end: #supply-energy-btn (the mechanical push button)
[MODIFY] 
styles.css
Remove old #vertical-energy-container / .vertical-bar-container.right vertical styles
#chamber-ui: absolute at bottom of canvas, full width, flex-row, align-items: center, dark panel background with top border
#xp-bar-track: flex-grow horizontal container, machine-panel style (inset shadow, dark bg)
#xp-bar: fills from left to right based on currentEnergy / maxEnergy — width %, not height %
#supply-energy-btn (right end, mechanical push button):
Chunky square/rect shape, embossed metal look (thick inset border, dark metal gradient)
Icon + label stacked: ⚡ SUPPLY
Hover: warm amber glow
Active/mousedown: pressed-in depth effect (translate Y + inset shadow)
draining class: pulsing glow to show it's active
[MODIFY] 
uiRenderer.js
Change 
updateEnergyBar()
 to set width % instead of height % (horizontal bar)
Verification Plan
Manual Verification (Browser)
Run the dev server:

npm run dev
Then open http://localhost:5173 and verify:

No frozen orbs — Chamber orbs should spawn as normal colored orbs (no glacier/crosshatch pattern). They should be merge-eligible immediately.
No hydraulic rods — When heat reaches 100%, no piston animations should appear in the chamber.
Energy leak fires — Let heat build to 100% (pack many orbs). When it hits 100%, heat resets to 0 AND energy visibly drops (by 5% of maxEnergy). Verify it floors at 0 and never goes negative.
System Bot fires — When heat leak triggers, the bot should show "ENERGY BREACH" header and the subtext about venting.
Chamber UI — Energy bar and supply button appear at the bottom of the canvas (in the chamber zone), not on the right side of the screen.
Supply button works — Clicking the supply button still correctly drains energy into the gear system.
No console errors — Open DevTools and verify no undefined references to removed state fields.
Chamber UI layout (updated):

┌────────────────────────────────────────┬──────────────┐
│  ████████████████░░░░░░░░░░░░░░░░░░░░  │  ⚡ SUPPLY   │
│  [  horizontal energy bar → fill →  ]  │  [ BUTTON ]  │
└────────────────────────────────────────┴──────────────┘
         Machine base / chamber panel
Energy bar fills left-to-right (charging up the capacitor)
Supply button on the right end — pressing it releases the stored energy into the gears (drain animation flows left)

uiRenderer.js
 updated too — will switch from height % to width % for the bar