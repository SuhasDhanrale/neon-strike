Implementation Plan (to complete the refactor correctly)

Stabilize FTUE overlay bootstrapping in ftueOverlay.js by adding ensureOverlayMarkup() so the existing empty #ftue-overlay container from index.html always gets the required child nodes before show() runs.

Fix FTUE progression gating in ftueManager.js and ftueOverlay.js by clearing/rebinding step listeners per step, enabling tap only for waitFor: 'tap', and forcing first_shot/first_merge to advance only via events.

Make FTUE playable from step 1 by initializing shooter state and ammo queue in startFTUE() (State.canFire, cooldown reset, queue fill), and add a defensive fallback in spawnOrb() in orbManager.js if queue data is missing.

Remove duplicated ammo award logic from physics.js and centralize to one source (orbManager.awardAmmo or a new ammo module) so geode crack events use a single implementation path.

Enforce core/visual separation by removing direct DOM writes from core modules in scoring.js, physics.js, and orbManager.js; route UI updates through uiRenderer.js and state/event changes.

Fix scoring threshold drift in scoring.js by using LEVEL_THRESHOLDS from config.js instead of hardcoded numbers.

Correct VFX timing in gameLoop.js and vfxHelpers.js so screen shake decays once per frame (remove double decay path).

Align FTUE highlight selectors with current HUD DOM in ftueOverlay.js (or update HUD markup) to ensure heat_bar, energy_bar, and skills_bar highlights always resolve.

Update prompt inconsistencies in neon-strike-vscode-agent-prompt.md, especially “9 FTUE steps” vs actual 10 steps, so implementation instructions match reality.

Run verification: npm run build, first-run FTUE walkthrough, skip flow, second-run no-FTUE flow, first shot fires, first merge step advances, eruption/skills/score still behave identically.

Definition of done

No FTUE runtime errors on fresh localStorage.
FTUE steps cannot be skipped incorrectly.
Core logic files contain no direct UI DOM mutation.
Build passes and gameplay parity is preserved