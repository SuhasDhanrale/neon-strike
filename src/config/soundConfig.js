// ============================================================
// Sound Configuration Registry
// Steampunk / Volcanic Industrial Aesthetic
//
// Each entry:
//   src       — path relative to project root (Vite resolves from /public or via import)
//   vol       — default volume (0–1)
//   cooldown  — minimum ms between consecutive plays of this sound (0 = no limit)
//   pitchVar  — +/- pitch variation as a fraction (e.g. 0.1 = ±10%). 0 = none
//   loop      — whether to loop (for music/ambient only)
// ============================================================

export const SOUNDS = {
    // ── BACKGROUND MUSIC ────────────────────────────────────────
    bg_music: {
        src: 'audio/bg0004.mp3',
        vol: 0.20,
        cooldown: 0,
        pitchVar: 0,
        loop: true,
    },

    // ── CORE GAMEPLAY ────────────────────────────────────────────
    orb_launch: {
        src: 'audio/sfx/orb_launch.mp3',
        vol: 0.65,
        cooldown: 120,
        pitchVar: 0.08,
        loop: false,
    },
    orb_bounce_wall: {
        src: 'audio/sfx/orb_bounce.mp3',
        vol: 0.25,
        cooldown: 60,
        pitchVar: 0.15,
        loop: false,
    },
    orb_bounce_orb: {
        src: 'audio/sfx/orb_bounce.mp3',
        vol: 0.05,
        cooldown: 80,
        pitchVar: 0.12,
        loop: false,
    },
    aim_start: {
        src: 'audio/sfx/aim_start.mp3',
        vol: 0.30,
        cooldown: 200,
        pitchVar: 0,
        loop: false,
    },

    // ── MERGING & SCORING ─────────────────────────────────────────
    orb_merge: {
        src: 'audio/sfx/orb_merge.mp3',
        vol: 0.80,
        cooldown: 60,
        pitchVar: 0.0,  // pitch is set programmatically based on tier
        loop: false,
    },
    orb_unlock: {
        src: 'audio/sfx/orb_unlock.mp3',
        vol: 0.90,
        cooldown: 300,
        pitchVar: 0,
        loop: false,
    },
    combo_hit: {
        src: 'audio/sfx/combo_hit.mp3',
        vol: 0.75,
        cooldown: 50,
        pitchVar: 0,  // pitch set programmatically to scale with combo count
        loop: false,
    },
    combo_drop: {
        src: 'audio/sfx/combo_drop.mp3',
        vol: 0.45,
        cooldown: 500,
        pitchVar: 0,
        loop: false,
    },

    // ── GEODE ────────────────────────────────────────────────────
    geode_hit: {
        src: 'audio/sfx/geode_hit.mp3',
        vol: 0.60,
        cooldown: 100,
        pitchVar: 0.10,
        loop: false,
    },
    geode_cracked: {
        src: 'audio/sfx/geode_cracked.mp3',
        vol: 1.0,
        cooldown: 300,
        pitchVar: 0,
        loop: false,
    },

    // ── POWER-UPS ────────────────────────────────────────────────
    requisition_open: {
        src: 'audio/sfx/requisition_open.mp3',
        vol: 0.55,
        cooldown: 200,
        pitchVar: 0,
        loop: false,
    },
    requisition_confirm: {
        src: 'audio/sfx/requisition_confirm.mp3',
        vol: 0.70,
        cooldown: 300,
        pitchVar: 0,
        loop: false,
    },
    requisition_cancel: {
        src: 'audio/sfx/requisition_cancel.mp3',
        vol: 0.40,
        cooldown: 200,
        pitchVar: 0,
        loop: false,
    },
    skill_shake: {
        src: 'audio/sfx/skill_shake.mp3',
        vol: 1.0,
        cooldown: 500,
        pitchVar: 0,
        loop: false,
    },
    skill_smash: {
        src: 'audio/sfx/skill_smash.mp3',
        vol: 1.0,
        cooldown: 500,
        pitchVar: 0,
        loop: false,
    },
    skill_void: {
        src: 'audio/sfx/skill_void.mp3',
        vol: 1.0,
        cooldown: 500,
        pitchVar: 0,
        loop: false,
    },

    // ── GEAR SYSTEM ───────────────────────────────────────────────
    gear_unlock: {
        src: 'audio/sfx/gear_unlock.mp3',
        vol: 1.0,
        cooldown: 1000,
        pitchVar: 0,
        loop: false,
    },
    energy_full: {
        src: 'audio/sfx/energy_full.mp3',
        vol: 0.75,
        cooldown: 3000,
        pitchVar: 0,
        loop: false,
    },
    energy_drain: {
        src: 'audio/sfx/energy_drain.mp3',
        vol: 0.50,
        cooldown: 1000,
        pitchVar: 0,
        loop: false,
    },
    lever_pull: {
        src: 'audio/sfx/lever_pull.mp3',
        vol: 0.70,
        cooldown: 400,
        pitchVar: 0,
        loop: false,
    },

    // ── UI & SYSTEM BOT ───────────────────────────────────────────
    bot_message: {
        src: 'audio/sfx/bot_message.mp3',
        vol: 0.45,
        cooldown: 500,
        pitchVar: 0,
        loop: false,
    },
    danger_warning: {
        src: 'audio/sfx/danger_warning.mp3',
        vol: 0.80,
        cooldown: 2000,
        pitchVar: 0,
        loop: false,
    },

    // ── LIFECYCLE ────────────────────────────────────────────────
    game_over: {
        src: 'audio/sfx/game_over.mp3',
        vol: 1.0,
        cooldown: 2000,
        pitchVar: 0,
        loop: false,
    },
    game_restart: {
        src: 'audio/sfx/game_restart.mp3',
        vol: 0.70,
        cooldown: 500,
        pitchVar: 0,
        loop: false,
    },
    shutter_open: {
        src: 'audio/sfx/shutter_open.mp3',
        vol: 0.65,
        cooldown: 1000,
        pitchVar: 0,
        loop: false,
    },
}
