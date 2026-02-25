// All DOM manipulation: score, bars, badges, toast, combo display
// HUD REDESIGN — Visual-first, no text numbers on bars
import { State } from '../state.js'
import { ORB_TYPES } from '../config.js'

// DOM element cache
let scoreEl = null
let levelEl = null
let heatFillEl = null
let energyFillEl = null
let nextShotEl = null
let nextShotValueEl = null
let nextShotAmmoIconEl = null
let canvasEl = null

// Long-press timer for mobile cost reveal
const pressTimers = new Map()

function initElements() {
  scoreEl = document.getElementById('score')
  levelEl = document.getElementById('level-value')
  heatFillEl = document.getElementById('heat-bar')
  energyFillEl = document.getElementById('xp-bar')
  nextShotEl = document.getElementById('next-shot-orb')
  nextShotValueEl = document.getElementById('next-shot-value')
  nextShotAmmoIconEl = document.getElementById('next-shot-ammo-icon')
  canvasEl = document.getElementById('gameCanvas')
  
  // Setup long-press detection for skill cost badges
  setupSkillLongPress()
}

function setupSkillLongPress() {
  for (let i = 1; i <= 3; i++) {
    const skillBtn = document.getElementById(`skill-${i}`)
    const wrapper = document.getElementById(`skill-wrapper-${i}`)
    
    if (!skillBtn || !wrapper) continue
    
    // Touch start — begin long-press timer
    skillBtn.addEventListener('touchstart', (e) => {
      const timer = setTimeout(() => {
        wrapper.classList.add('show-cost')
      }, 400) // 400ms long press
      pressTimers.set(i, timer)
    })
    
    // Touch end — clear timer and hide after delay
    skillBtn.addEventListener('touchend', () => {
      const timer = pressTimers.get(i)
      if (timer) {
        clearTimeout(timer)
        pressTimers.delete(i)
      }
      // Hide cost after 1.2s
      setTimeout(() => {
        wrapper.classList.remove('show-cost')
      }, 1200)
    })
    
    // Touch cancel — clear timer
    skillBtn.addEventListener('touchcancel', () => {
      const timer = pressTimers.get(i)
      if (timer) {
        clearTimeout(timer)
        pressTimers.delete(i)
      }
    })
  }
}

export const uiRenderer = {

  // Called every frame OR whenever State changes
  update() {
    // Initialize elements on first call
    if (!scoreEl) initElements()
    
    this.updateScore()
    this.updateLevel()
    this.updateHeatBar()
    this.updateEnergyBar()
    this.updateNextShot()
    this.updateSkills()
  },

  updateScore() {
    if (!scoreEl) return
    scoreEl.textContent = State.score
    
    // Gold glow on combo
    if (State.comboCount > 1) {
      scoreEl.classList.add('combo-glow')
    } else {
      scoreEl.classList.remove('combo-glow')
    }
  },

  updateLevel() {
    if (!levelEl) return
    levelEl.textContent = State.level
    // No status text anymore. Level number only.
  },

  updateHeatBar() {
    if (!heatFillEl) return
    
    const pct = State.systemHeat // already 0-100
    heatFillEl.style.width = pct + '%'

    // Class-based pulse state
    heatFillEl.classList.remove('heat-calm', 'heat-warning', 'heat-critical', 'heat-erupting')
    if (pct >= 80)      heatFillEl.classList.add('heat-critical')
    else if (pct >= 40) heatFillEl.classList.add('heat-warning')
    else                heatFillEl.classList.add('heat-calm')

    // Bleed heat color onto canvas edge
    if (canvasEl) {
      if (pct > 80) {
        const intensity = ((pct - 80) / 20).toFixed(2)
        canvasEl.style.boxShadow = `0 0 60px rgba(255, 0, 60, ${intensity * 0.6})`
      } else {
        canvasEl.style.boxShadow = '0 0 50px rgba(0, 243, 255, 0.1)'
      }
    }
  },

  updateEnergyBar() {
    if (!energyFillEl) return
    
    const pct = (State.currentEnergy / State.maxEnergy) * 100
    energyFillEl.style.width = pct + '%'

    energyFillEl.classList.remove('energy-full', 'energy-empty')
    if (State.currentEnergy >= State.maxEnergy) {
      energyFillEl.classList.add('energy-full')
    } else if (State.currentEnergy <= 0) {
      energyFillEl.classList.add('energy-empty')
    }
    // No text. No numbers. Bar only.
  },

  updateNextShot() {
    if (!nextShotEl || !nextShotValueEl) return
    
    const next = State.ammoQueue[0]
    if (!next) return

    const orbType = ORB_TYPES[next.orbType]
    if (!orbType) return

    // Update CSS variable for glow color
    nextShotEl.style.setProperty('--orb-color', orbType.color)
    nextShotEl.style.borderColor = orbType.color

    // Value text
    nextShotValueEl.textContent = orbType.value

    // Cooldown state
    if (State.canFire) {
      nextShotEl.classList.remove('cooling')
    } else {
      nextShotEl.classList.add('cooling')
    }

    // Special ammo icon (if applicable)
    if (nextShotAmmoIconEl) {
      // Check if ammo has special config
      if (next.config && next.config.id !== 'STANDARD') {
        nextShotAmmoIconEl.textContent = next.config.icon || ''
      } else {
        nextShotAmmoIconEl.textContent = ''
      }
    }
  },

  updateSkills() {
    for (let i = 1; i <= 3; i++) {
      const btn = document.getElementById(`skill-${i}`)
      const badge = document.getElementById(`cost-${i}`)
      const skill = State.skills[i]
      
      if (!skill) continue
      
      // Update cost badge
      if (badge) {
        badge.textContent = Math.floor(skill.currentCost)
        if (skill.currentCost > skill.baseCost * 1.5) {
          badge.classList.add('high-cost')
        } else {
          badge.classList.remove('high-cost')
        }
      }
      
      if (btn) {
        // Clear all state classes first
        btn.classList.remove('locked', 'affordable', 'unaffordable', 'cooldown')
        
        const isUnlocked = State.level >= skill.unlockLevel
        const canAfford = State.currentEnergy >= skill.currentCost
        
        if (!isUnlocked) {
          btn.classList.add('locked')
        } else if (canAfford) {
          btn.classList.add('affordable')
        } else {
          btn.classList.add('unaffordable')
        }
      }
    }
  }
}

// Legacy function exports for backward compatibility
export function updateUI() {
  uiRenderer.update()
}

export function showLevelToast(title, msg) {
  const levelToast = document.getElementById('level-toast')
  const toastTitle = document.querySelector('.toast-title')
  const toastMessage = document.getElementById('toast-message')
  
  if (toastTitle) toastTitle.textContent = title
  if (toastMessage) toastMessage.textContent = msg
  if (levelToast) {
    levelToast.classList.add('active')
    setTimeout(() => {
      levelToast.classList.remove('active')
    }, 3000)
  }
}

export function showCombo(count) {
  const comboDisplay = document.getElementById('combo-display')
  if (!comboDisplay) return
  comboDisplay.textContent = "×" + count
  comboDisplay.style.opacity = 1
  comboDisplay.style.transform = "translate(-50%, -50%) scale(1.5) rotate(-10deg)"
  setTimeout(() => {
    comboDisplay.style.transform = "translate(-50%, -50%) scale(1) rotate(-15deg)"
  }, 100)
}

export function hideCombo() {
  const comboDisplay = document.getElementById('combo-display')
  if (comboDisplay) comboDisplay.style.opacity = 0
}

export default uiRenderer
