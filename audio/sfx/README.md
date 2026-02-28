# Sound Effects Directory

This folder contains all game SFX for Neon Strike.

## How to add sounds

1. Drop your `.mp3` file into this folder.
2. The filename must match the `src` field in `src/config/soundConfig.js`.
3. The game will automatically load and play it.

## Sound File List (expected filenames)

| File | Description |
|------|-------------|
| `orb_launch.mp3` | Pneumatic piston release — when an orb is fired |
| `orb_bounce.mp3` | Iron clang — orb hitting wall or another orb |
| `orb_merge.mp3` | Forge hammer strike — orbs merging |
| `orb_unlock.mp3` | Steam whistle — new highest orb tier reached |
| `combo_hit.mp3` | Rapid piston — combo scored |
| `combo_drop.mp3` | Pressure release hiss — combo expired |
| `geode_hit.mp3` | Pickaxe on crystal — geode impact |
| `geode_cracked.mp3` | Shattering explosion — geode destroyed |
| `skill_shake.mp3` | Seismic rumble — SHAKE power-up |
| `skill_smash.mp3` | Hydraulic press slam — SMASH power-up |
| `skill_void.mp3` | Vacuum implosion — VOID power-up |
| `gear_unlock.mp3` | Clockwork engagement — gear unlocked |
| `energy_full.mp3` | Boiler pressure whistle — energy maxed |
| `energy_drain.mp3` | Turbine spinning down — gear supply drain |
| `lever_pull.mp3` | Brass lever ka-chunk — supply button click |
| `requisition_open.mp3` | Telegram typewriter — power-up modal open |
| `requisition_confirm.mp3` | Stamp press — power-up confirmed |
| `requisition_cancel.mp3` | Paper crumple — power-up modal closed |
| `game_over.mp3` | Boiler failure groan — game ended |
| `game_restart.mp3` | Engine restart — new game started |
| `danger_warning.mp3` | Pressure alarm — danger line triggered |
| `bot_message.mp3` | Solenoid relay click — system bot message |
| `aim_start.mp3` | Pressure build — drag to aim started |
| `shutter_open.mp3` | Vault door sliding — FTUE shutter opens |

## About `bg004.mp3` (in /audio/)

The background music. Replace with your actual steampunk ambient track.
The SoundManager plays it looped at 35% volume.
