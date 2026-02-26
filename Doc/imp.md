Bug Fixes: Chamber Orbs & Chamber UI Positioning
Two bugs found after initial implementation.

Bug 1 — Chamber Orbs Still Spawning
Root cause: 
spawnChamberBatch()
 still sets orb.inChamber = true and is called from both 
resetGame()
 and 
triggerEruption()
. Orb.update() still has special floor logic for inChamber orbs. Chamber physics segregation still runs in 
physics.js
.

Fix
[MODIFY] 
orbManager.js
resetGame()
 — Remove the 
spawnChamberBatch()
 call (lines 257–258)
spawnChamberBatch()
 — Delete the entire function body; replace with empty stub so imports don't break:
js
export function spawnChamberBatch() { /* chamber removed */ }
Orb.update() — Remove the inChamber floor logic:
js
// REMOVE THIS:
let targetFloorY = this.inChamber ? State.gameHeight : State.mainFloorY
// REPLACE WITH:
let targetFloorY = State.mainFloorY
Orb
 constructor — Remove this.inChamber = false
Orb.getDrawData() — Remove inChamber field (if present)
[MODIFY] 
physics.js
Remove the if (o1.inChamber !== o2.inChamber) continue line — no more chamber segregation
[MODIFY] 
heatSystem.js
Remove 
spawnChamberBatch()
 call and its import (it's no longer needed here)
Remove unused imports: ORB_TYPES, createParticles, createFloatingText, 
showLevelToast
, THEME
Bug 2 — Chamber UI Not Aligned to Canvas
Root cause: #chamber-ui is position: absolute; bottom: 0 inside #game-container, but the canvas is centered, has a 140px top margin, and is not full-container width on desktop. There's no JS dynamically positioning #chamber-ui to match the canvas.

main.js
 
handleResize()
 still references dead #vertical-energy-container (lines 87–97) and doesn't set up #chamber-ui.

Fix
[MODIFY] 
main.js
Replace the dead #vertical-energy-container positioning block (lines 86–97) with #chamber-ui positioning:

js
// Position chamber-ui to overlay the canvas (bottom portion)
const chamberUI = document.getElementById('chamber-ui')
const hc = document.getElementById('vertical-heat-container')
if (chamberUI) {
  chamberUI.style.left = State.canvas.offsetLeft + 'px'
  chamberUI.style.width = State.canvas.width + 'px'
  chamberUI.style.top = (State.canvas.offsetTop + State.canvas.height) + 'px'
}
if (hc) {
  hc.style.left = State.canvas.offsetLeft + 'px'
  hc.style.top = State.canvas.offsetTop + 'px'
  hc.style.height = State.canvas.height + 'px'
}
NOTE

chamberUI.style.top = canvas top + canvas height puts it just below the canvas bottom edge — i.e., at the start of the mainFloorY zone.

[MODIFY] 
styles.css
Change #chamber-ui positioning so it's driven by JS (remove conflicting bottom: 0):

css
#chamber-ui {
    position: absolute;
    /* left, top, width are set dynamically by handleResize() in main.js */
    height: 80px;   /* matches FLOOR_OFFSET (80px) from config.js */
    display: flex;
    align-items: center;
    padding: 0 16px;
    box-sizing: border-box;
    background: linear-gradient(180deg, #1a1410 0%, #0d0a08 100%);
    border-top: 3px solid #2d2520;
    z-index: 15;
    gap: 12px;
}
IMPORTANT

Height is 80px to match FLOOR_OFFSET = 80 in 
config.js
 — the exact height of the chamber zone below mainFloorY.

Verification
No orbs below floor — After reset, no orbs should appear in the machine base zone. Only the canvas chamber renderer draws in that area.
Chamber UI aligned — The energy bar + supply button should sit flush inside the machine base panel at the bottom of the canvas (not full-page width).
No console errors — No missing inChamber, graceMoves references.