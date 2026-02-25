// addScore(), addEnergy(), checkLevelUp(), combo logic
import { State } from '../state.js'
import { EventBus } from '../eventBus.js'
import { LEVEL_THRESHOLDS, ENERGY_PER_LEVEL, BASE_MAX_ENERGY } from '../config.js'
import { showLevelToast, updateUI } from '../visuals/uiRenderer.js'

export function addScore(amount) {
  State.score += amount
  document.getElementById('score').innerText = State.score
  checkLevelUp()
}

export function addEnergy(amount) {
  if (State.isGameOver) return
  let scaler = 1 + (State.level * 0.2)
  State.currentEnergy += amount * scaler
  if (State.currentEnergy > State.maxEnergy) {
    State.currentEnergy = State.maxEnergy
  }
  updateUI()
}

export function checkLevelUp() {
  let newLevel = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (State.score > LEVEL_THRESHOLDS[i]) {
      newLevel = i + 1
      break
    }
  }
  
  if (newLevel > State.level) {
    State.level = newLevel
    showLevelToast("LEVEL UP", "Max Energy Increased")
    State.maxEnergy = BASE_MAX_ENERGY + ((State.level - 1) * ENERGY_PER_LEVEL)
    State.currentEnergy = State.maxEnergy
    updateUI()
    EventBus.emit('level:up', { level: State.level })
  }
}

export function handleCombo(baseScore) {
  if (State.comboTimer > 0) {
    State.comboCount++
    baseScore *= State.comboCount
    
    const comboDisplay = document.getElementById('combo-display')
    comboDisplay.innerText = "×" + State.comboCount
    comboDisplay.style.opacity = 1
    comboDisplay.style.transform = "translate(-50%, -50%) scale(1.5) rotate(-10deg)"
    setTimeout(() => {
      comboDisplay.style.transform = "translate(-50%, -50%) scale(1) rotate(-15deg)"
    }, 100)
    
    addEnergy(5)
  } else {
    State.comboCount = 1
    document.getElementById('combo-display').style.opacity = 0
  }
  
  State.comboTimer = 90
  return baseScore
}

export function updateComboTimer() {
  if (State.comboTimer > 0) {
    State.comboTimer--
    if (State.comboTimer === 0) {
      State.comboCount = 0
      document.getElementById('combo-display').style.opacity = 0
      document.getElementById('score').classList.remove('combo-active')
    }
  }
}
