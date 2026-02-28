Remove Heat System Mechanic
The heat system was designed to penalize players for having too many orbs on screen — tracking a systemHeat value (0–100) that triggered an eruption (energy drain) when maxed out. Since it adds nothing to gameplay, we are removing it entirely. This means deleting the core module and stripping all references: state, UI bar, canvas effects, powerup costs, SystemBot messages, skill definitions, and config constants.

NOTE

The Instability mechanic will be removed in a separate, follow-up task after this one is completed and verified.

Proposed Changes
Core Module
[DELETE] 
heatSystem.js
Delete the file entirely. Contains 
addHeat()
, 
coolHeat()
, and 
triggerEruption()
.
Game State
[MODIFY] 
state.js
Remove systemHeat: 0 from the 
State
 object.
Config
[MODIFY] 
config.js
Remove export const ERUPTION_HEAT_THRESHOLD = 100
Remove the HEAT_THRESHOLDS object export
Remove heatCost: 30 from each entry in SKILLS_CONFIG
Core Logic
[MODIFY] 
orbManager.js
Remove import { addHeat } from './heatSystem.js'
Remove HEAT_THRESHOLDS from the config import
Remove the entire "Geothermal Heat Mechanic" block in 
spawnOrb()
 (lines 180–190)
Remove State.systemHeat = 0 from 
resetGame()
Remove heat: State.systemHeat from the leaderboard submit metadata in 
endGame()
[MODIFY] 
powerupManager.js
Remove import { addHeat } from '../core/heatSystem.js'
Remove the heat block in 
confirmRequisition()
: the 
addHeat()
 call, the heatApplied check, and the +HEAT floating text (lines 76–80)
Skill Definitions
[MODIFY] 
shake.js
Remove heatCost: 30 property
[MODIFY] 
smash.js
Remove heatCost: 30 property
[MODIFY] 
void.js
Remove heatCost: 30 property
Visuals / Rendering
[MODIFY] 
renderer.js
Remove drawHeatShimmer from the import
Remove the drawHeatShimmer(ctx) call and its comment
[MODIFY] 
vfxHelpers.js
Remove the entire drawHeatShimmer() function body and the // CHAMBER HEAT SHIMMER comment
Remove drawHeatShimmer from the exports
[MODIFY] 
chamberRenderer.js
Remove systemHeat from the 
State
 destructure
Remove const heat = systemHeat / 100
Remove the heat-based color lerp on the line color (replace with the neutral '#4a4040' constant)
Remove heat * 0.3 from the ctx.globalAlpha calculation (use fixed value 0.2)
[MODIFY] 
uiRenderer.js
Remove let heatFillEl = null variable
Remove heatFillEl = document.getElementById('heat-bar') from 
initElements()
Remove this.updateHeatBar() call from 
update()
Delete the entire 
updateHeatBar()
 method (also removes the canvas boxShadow heat bleed effect)
UI & Bots
[MODIFY] 
systemBot.js
Remove heat_critical and heat_leak entries from GAMEPLAY_OVERRIDE
Remove heat: 0 from lastGameplayEventTime
Remove the two EventBus.on('state:heat_critical', ...) and EventBus.on('state:heat_leak', ...) listeners from 
init()
HTML
[MODIFY] 
index.html
Remove the <!-- Vertical Heat Bar (Left Side) --> block: the #vertical-heat-container div and its child #heat-bar div (lines 50–53)
Update the tutorial text on line 99: remove • High Heat = Energy Leak from the string
Main Entry Point
[MODIFY] 
main.js
Remove the #vertical-heat-container positioning logic in 
handleResize()
 (lines 142–154: the hc variable and the if (hc) block)
CSS
[MODIFY] 
hud.css
Remove the entire HEAT BAR section (lines 69–165): .heat-bar-fill, heat state classes (.heat-calm, .heat-warning, .heat-critical, .heat-erupting), and all three @keyframes (heat-pulse-warn, heat-pulse-critical, heat-erupt)
[MODIFY] 
styles.css
Remove the /* Heat Bar */ section: .heat-container, .heat-bar, .heat-text classes (lines 315–340 approx)
Remove .status-heating class
Verification Plan
Automated Tests
No automated tests exist for this project. Verification is manual.
Manual Verification
Run the dev server (already running via npm run dev), then open the game in the browser and check the following:

No Heat Bar visible — The left-side vertical bar that used to show heat should be completely gone from the game screen.
No console errors — Open DevTools (F12 → Console). There should be zero errors about missing heatSystem, 
addHeat
, systemHeat, or null element references.
Powerups still work — Use all three powerups (Shake, Smash, Void) via the requisition modal. They should activate normally with no +HEAT floating text appearing.
Game loop runs cleanly — Play for 30+ seconds. Orbs spawn, merge, score increments. No freezes or runtime errors.
Game over works — Let orbs pile up above the danger line. Game-over screen should appear and the restart button should work.
SystemBot intact — Unlock a gear. The System Bot message should appear. No heat-related messages should appear at any point.