// Single exported reactive object: ALL game variables live here
import { SKILLS_CONFIG, BASE_MAX_ENERGY, GEAR_SYSTEM } from './config.js'

export const State = {
  // Canvas
  canvas: null,
  ctx: null,
  gameWidth: 0,
  gameHeight: 0,
  scale: 1,
  mainFloorY: 0,

  // Game Status
  isGameOver: false,
  isPaused: false,
  frostedGlassRevealed: false,
  canFire: true,
  shotCooldown: 0,
  frameCount: 0,

  // FTUE
  ftueComplete: !!localStorage.getItem('neonStrike_ftueComplete'),
  // If FTUE is not complete, default to 100 (first gear cost) so Supply button is active
  // If FTUE is complete, try to load from localStorage
  currentEnergy: !localStorage.getItem('neonStrike_ftueComplete')
    ? GEAR_SYSTEM.GEAR_COSTS[0]
    : parseInt(localStorage.getItem('neonStrike_currentEnergy') || '0'),

  // Gear System (persistent background)
  activeGears: new Set(),       // Set<number> of activated gear IDs (0-10)
  gearEnergyTarget: GEAR_SYSTEM.GEAR_COSTS[0], // Energy cost of the next gear to unlock

  // Aim
  isAiming: false,
  aimStart: { x: 0, y: 0 },
  aimCurrent: { x: 0, y: 0 },
  shooterPos: { x: 0, y: 200 },

  // Entity pools
  orbs: [],
  particles: [],
  floatingTexts: [],
  ammoQueue: [],

  // Skills runtime state (current costs)
  skills: Object.fromEntries(
    Object.entries(SKILLS_CONFIG).map(([id, cfg]) => [id, { ...cfg, currentCost: cfg.baseCost }])
  ),

  // Combo
  comboCount: 0,
  comboTimer: 0,

  // Progression Bar — highest orb index ever seen in-game (0-based)
  // Starts at 3 (= orb value 16) so the bar renders correctly before any merge
  maxUnlockedOrbIndex: 3,

  // VFX
  screenShake: 0,
  shakeCooldown: 0,   // frames of death-line immunity after Shake power-up

  // FTUE
  ftueActive: false,
  ftueStep: 0,
  ftueComplete: !!localStorage.getItem('neonStrike_ftueComplete'),
  shooterPulseActive: false,
  shooterPulseFrame: 0,
  _ftueShotWatcher: null
}
