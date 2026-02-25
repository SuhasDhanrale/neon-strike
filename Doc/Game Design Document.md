Game Design Document: Neon Strike - Kinetic Merge

1. Overview

Title: Neon Strike: Kinetic Merge
Genre: Arcade Physics / Puzzle Merge / Slingshot Shooter
Target Platform: Web / Mobile (Responsive HTML5 Canvas)
Core Fantasy: You are managing a volatile, kinetic energy system. You must shoot, smash, and merge neon orbs to keep the "Geothermal Pressure" from overloading the reactor.
Logline: A high-octane physics puzzle where 2048 meets Peggle. Slingshot neon orbs to merge them, crack geodes for special ammo, and manage rising geothermal pressure to survive.

2. Core Gameplay Loop

Aim & Fire: The player pulls back on the screen to aim and shoot a numbered orb from the top of the screen into the bucket.

Kinetic Merging: Orbs of the same value merge upon collision, creating a higher-value orb, generating Score and Energy, and reducing the total physical volume in the bucket.

Pressure Management: The "System Heat" constantly rises if there are too many orbs on screen. The player must aggressively merge orbs to keep the volume—and the Heat—low.

Eruption & Triage: If Heat reaches 100%, an Eruption occurs. The sub-chamber flushes frozen "Bedrock" orbs into the main bucket, drastically raising the pile. The player must use the brief "Grace Period" to clean up the mess before pressure builds again.

3. Mechanics & Controls

3.1 Input

Slingshot Aiming: Click/Touch and drag backwards (away from the target). A trajectory line visualizes the shot.

Velocity: The distance of the drag dictates the power of the shot (up to a capped MAX_POWER). High-velocity shots are required to break Geodes.

3.2 Physics

Gravity: Standard downward pull, but dynamically shifts during Eruptions or when specific Skills are used.

Bounciness: Orbs have an elasticity factor. Heavy impacts cause satisfying ricochets.

Death Line: A dashed red line at the top of the bucket. If an orb settles above this line, it triggers a Game Over.

4. Game Entities

4.1 Neon Orbs (Standard)

Numbered orbs following the 2048 sequence (2, 4, 8, 16... 2048).

Increasing radius and distinct neon colors/glows as they level up.

4.2 Geodes (Obstacles)

Spawn randomly (approx. 4% chance) instead of a standard orb.

Behavior: Heavy, dull rocks that do not merge. They take up valuable space.

Destruction: Must be hit with a High-Velocity impact (relative velocity > 15) to crack. Takes 2 hits to destroy.

Loot: Destroying a Geode immediately rewards a Piercing Round and +20 Energy.

4.3 Frosted Orbs (Bedrock)

Spawned exclusively in the "Geothermal Chamber" (Sub-Floor).

Behavior: Encased in ice. They are completely un-mergeable while frozen and carry 2x mass.

They are "thawed" and turned into normal, mergeable orbs only when an Eruption flushes them into the main play area.

5. The Ammo System

The player has a visible "Next Ammo" queue of 3 slots.

Standard Round (⚫): Normal physics and merging rules. Fills the queue by default.

Piercing Round (🔻): * Acquisition: Earned exclusively by destroying Geodes.

Effect: Enters "Ghost Mode" for 1 second upon firing. It phases entirely through other orbs (ignoring collisions) allowing the player to snipe targets deep at the bottom of the stack. Solidifies when hitting a wall, the floor, or after the timer expires.

6. The Geothermal System (Heat & Eruptions)

This is the primary pacing and survival mechanic.

6.1 Heat Generation (Volume-Based)

Heat changes every turn based on the number of Active Orbs in the main bucket (excluding Geodes and Chamber orbs).

< 10 Orbs: Cooling (-5% Heat)

10 - 15 Orbs: Slow Burn (+3% Heat)

16 - 21 Orbs: Heating Up (+8% Heat)

22+ Orbs: Critical Mass (+15% Heat)

6.2 The Geothermal Chamber

A distinct sub-floor below the main play area.

Always holds 5 Frosted Orbs in reserve.

The chamber glows dynamically (Cyan -> Orange -> Red) as System Heat increases.

6.3 Eruption (100% Heat)

When Heat hits 100%, the system flushes:

Upward Thrust: All active orbs in the main bucket are violently launched upward.

The Flush: The 5 Frosted Orbs in the Chamber are thawed (made mergeable) and fired up through the floor into the main bucket.

Refill: 5 new Frosted Orbs instantly spawn in the bottom Chamber.

Grace Period: Heat resets to 0%, and the system enters a 5-turn "Grace" state where heat cannot rise, giving the player a chance to merge the newly injected orbs.

7. Progression & Skills

7.1 Energy & Leveling

Energy: Gained by merging orbs (+ base value) and executing Combos.

Leveling: Reaching specific score milestones (800, 2500, 5000, 10000) increases the player's Level.

Benefits: Leveling up increases the Maximum Energy cap and unlocks new Active Skills.

7.2 Active Skills (Abilities)

Skills are powerful tools paid for with Energy. Crucial Rule: Using any skill instantly generates +30% Heat, forcing the player to balance utility against pushing the system toward an Eruption.

1. SHAKE (Cost: 15 | Unlocks: Lvl 1)

Effect: Applies a randomized upward/lateral physical jolt to all active orbs. Great for settling a badly stacked pile.

2. SMASH (Cost: 40 | Unlocks: Lvl 2)

Effect: Applies massive downward velocity to all active orbs and kills their horizontal momentum. Compresses the stack tightly.

3. VOID (Cost: 80 | Unlocks: Lvl 4)

Effect: A panic button. Vaporizes up to 8 random orbs located in the perilous upper 40% of the screen.

(Note: Skill costs multiply upon usage, making them more expensive if spammed).

8. Architecture Review (Developer Brief)

8.1 System Shape

Runtime Stack: Vite + vanilla ES modules + HTML5 Canvas.

Architecture Style: Single-process game loop with a shared global mutable state (`State`), split into domain modules.

Top-level module boundaries:

- `src/main.js`: bootstraps canvas, resize handling, input, FTUE check, reset, loop start.
- `src/gameLoop.js`: frame orchestrator (`update()` then `draw()`).
- `src/state.js`: canonical runtime state for gameplay, HUD, VFX, FTUE, and skills.
- `src/core/*`: gameplay logic (orb lifecycle, collisions, scoring, heat/eruption, input).
- `src/visuals/*`: rendering + HUD DOM updates + VFX.
- `src/powerups/*`: skill registry, unlock/cost logic, per-skill behavior modules.
- `src/ftue/*`: first-time user experience state and lightweight shooter pulse.

8.2 Frame Pipeline (What runs every frame)

`gameLoop.update()` order:

1. Sub-stepped orb physics (`Orb.update()` + `resolveCollisions()` x `SUBSTEPPING_ITERATIONS`)
2. Remove deleted orbs
3. Update particles/floating text
4. Update combo timer
5. Update shot cooldown
6. Decay screen shake
7. Increment frame count

`renderer.draw()` order:

1. Clear canvas + apply screen shake
2. Draw background grid
3. Draw chamber strip/floor line
4. Draw orb trails (placeholder currently)
5. Draw orbs
6. Draw particles/floating text
7. Draw shooter + aim line + death line
8. Draw merge flashes

8.3 Core Gameplay Data Flow

Shot Flow:
- Input drag in `inputHandler` -> `spawnOrb(angle,power)` -> consume ammo queue -> create `Orb` -> apply cooldown/heat -> emit `orb:spawned`.

Collision Flow:
- `resolveCollisions()` handles geode crack logic, merge logic, and bounce response.
- Merge creates score/energy/combo updates and schedules merged orb creation.

Progression Flow:
- `addScore()` -> `checkLevelUp()` -> increase max energy + unlock effective skill usage by level.

Pressure Flow:
- Heat is adjusted mainly on shot spawn (orb density bands) and by skill usage.
- At threshold, `triggerEruption()` launches active orbs, hydraulically lifts chamber orbs, resets heat, starts grace moves, and refills chamber.

Fail State:
- Game over triggers when a non-chamber orb remains settled above danger line long enough under guard conditions.

8.4 Event Contracts (EventBus)

Current emitted events:
- `orb:spawned`
- `orb:merged`
- `orb:geode_cracked`
- `level:up`
- `eruption:triggered`
- `game:over`

Current listener usage:
- FTUE listens for `orb:merged` and `orb:spawned` to auto-complete onboarding.

8.5 Extension Points

Add a new skill:
1. Create `src/powerups/skills/<name>.js` with `{ id, unlockLevel, mult, heatCost, execute(State) }`
2. Register it in `initPowerups()`
3. Add matching button/cost DOM in `index.html`
4. Ensure `State.skills` has config entry (`config.js`)

Add/retune game balance:
- Primary constants live in `src/config.js` (physics, heat thresholds, progression, orb table, cooldowns).

8.6 Known Coupling and Risks (for future refactor)

1. `State` is globally mutable from most modules, so feature changes can create hidden side effects.
2. Gameplay and DOM are mixed in several core files (`orbManager`, `scoring`, `heatSystem`), reducing testability.
3. Some flow uses `setTimeout` (fire cooldown, merged orb spawn), which can create timing edge cases.
4. Skill loading is dynamic import; very first click timing can race on slow devices.
5. EventBus has no typing/schema validation; event names are stringly-typed.

8.7 Fast Onboarding Path (for new devs)

Read in this order:
1. `src/main.js`
2. `src/state.js`
3. `src/gameLoop.js`
4. `src/core/orbManager.js`
5. `src/core/physics.js`
6. `src/core/heatSystem.js`
7. `src/visuals/renderer.js` + `src/visuals/uiRenderer.js`
