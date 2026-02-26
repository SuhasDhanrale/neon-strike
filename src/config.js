// Game Configuration - All magic numbers, tuning constants, ORB_TYPES, AMMO defs

export const NORMAL_GRAVITY = 0.5
export const FRICTION = 0.99
export const SPAWN_Y = 30
export const MAX_POWER = 35
export const FLOOR_OFFSET = 80
export const GEODE_SPAWN_CHANCE = 0.04
export const SHOT_COOLDOWN_MS = 500
export const SHOT_COOLDOWN_FRAMES = 30
export const CHAMBER_BATCH_SIZE = 5
export const ERUPTION_HEAT_THRESHOLD = 100
export const SUBSTEPPING_ITERATIONS = 4
export const DANGER_LINE_Y = 70
export const GAME_OVER_SETTLE_SPEED = 0.12
export const GAME_OVER_SETTLE_FRAMES = 24

export const HEAT_THRESHOLDS = {
  // 15+ active orbs builds pressure, <10 cools down
  CRITICAL_COUNT: 22,
  CRITICAL_HEAT: 15,
  HOT_COUNT: 15,
  HOT_HEAT: 8,
  COOL_COUNT: 10,
  COOL_REDUCTION: 5
}

export const BASE_MAX_ENERGY = 100

export const ORB_TYPES = [
  { value: 2, radius: 40, color: '#00f3ff', glow: '#00f3ff' },
  { value: 4, radius: 45, color: '#00ff41', glow: '#00ff41' },
  { value: 8, radius: 50, color: '#ffe600', glow: '#ffe600' },
  { value: 16, radius: 55, color: '#ff8c00', glow: '#ff8c00' },
  { value: 32, radius: 60, color: '#ff003c', glow: '#ff003c' },
  { value: 64, radius: 65, color: '#d600ff', glow: '#d600ff' },
  { value: 128, radius: 75, color: '#ffffff', glow: '#ffffff' },
  { value: 256, radius: 80, color: '#00f3ff', glow: '#00f3ff' },
  { value: 512, radius: 85, color: '#00ff41', glow: '#00ff41' },
  { value: 1024, radius: 90, color: '#ffe600', glow: '#ffe600' },
  { value: 2048, radius: 95, color: '#ff003c', glow: '#ff003c' }
]

export const AMMO_TYPES = {
  STANDARD: { id: 'STANDARD', icon: '', color: '#fff', prob: 1.0 },
  PIERCE: { id: 'PIERCE', icon: '🔻', color: '#f0f', prob: 0.0 }
}

export const SKILLS_CONFIG = {
  1: { id: 1, name: 'Shake', icon: '⚡', label: 'SHAKE', baseCost: 15, mult: 1.3, heatCost: 30 },
  2: { id: 2, name: 'Smash', icon: '🔨', label: 'SMASH', baseCost: 40, mult: 1.25, heatCost: 30 },
  3: { id: 3, name: 'Void', icon: '🌀', label: 'VOID', baseCost: 80, mult: 1.4, heatCost: 30 }
}

// ============================================
// GEAR SYSTEM CONFIG
// 11 gears unlock sequentially via energy supply
// Costs scale exponentially: BASE_COST × EXPONENT^i
// Edit GEAR_COSTS array to fine-tune individual gears
// ============================================
export const GEAR_SYSTEM = {
  BASE_COST: 100,
  EXPONENT: 1.5,
  // Pre-generated costs — edit these directly to set exact per-gear costs
  GEAR_COSTS: Array.from({ length: 11 }, (_, i) => Math.round(100 * Math.pow(1.5, i))),
  // [100, 150, 225, 338, 506, 759, 1139, 1709, 2563, 3845, 5767]

  // Animation speed
  SPEED_PER_GEAR: 0.23,      // Speed added per active gear
  MAX_SPEED: 2.5,            // Max speed before overdrive
  OVERDRIVE_SPEED: 8,        // Speed when all 11 gears active

  // Effects
  SPARK_COUNT: 45,           // Forge sparks particle count
  GLITCH_THRESHOLD: 5,       // Active gears before glitch effects begin

  // Persistence
  STORAGE_KEY: 'neonStrike_activeGears',
}
