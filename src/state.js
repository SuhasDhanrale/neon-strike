// Single exported reactive object: ALL game variables live here
import { SKILLS_CONFIG, BASE_MAX_ENERGY } from './config.js'

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
  canFire: true,
  shotCooldown: 0,
  frameCount: 0,

  // Score / Progression
  score: 0,
  bestScore: parseInt(localStorage.getItem('neonDropBest') || '0'),
  level: 1,
  currentEnergy: 0,
  maxEnergy: BASE_MAX_ENERGY,

  // Heat
  systemHeat: 0,
  graceMoves: 0,
  eruptionLiftPending: 0,

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

  // VFX
  screenShake: 0,

  // FTUE
  ftueActive: false,
  ftueStep: 0,
  ftueComplete: !!localStorage.getItem('neonStrike_ftueComplete'),
  shooterPulseActive: false,
  shooterPulseFrame: 0,
  _ftueShotWatcher: null
}
