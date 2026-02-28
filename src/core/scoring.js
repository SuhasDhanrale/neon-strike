// addScore(), addEnergy(), combo logic
import { State } from '../state.js'
import { updateUI } from '../visuals/uiRenderer.js'
import { SoundManager } from '../systems/SoundManager.js'

export function addScore(amount) {
  State.score += amount
  // Score display is handled each frame by uiRenderer.updateScore() via the game loop
}

export function addEnergy(amount) {
  if (State.isGameOver) return
  const oldEnergy = State.currentEnergy
  State.currentEnergy += amount
  if (State.currentEnergy > State.maxEnergy) {
    State.currentEnergy = State.maxEnergy
  }


  localStorage.setItem('neonStrike_currentEnergy', State.currentEnergy.toString())
  updateUI()
}

export function handleCombo(baseScore) {
  if (State.comboTimer > 0) {
    State.comboCount++
    baseScore *= State.comboCount

    // Combo sound — pitch scales with count (higher combo = higher pitch)
    const comboPitch = 0.8 + Math.min(State.comboCount * 0.08, 0.6)
    SoundManager.play('combo_hit', { pitch: comboPitch })

    const comboDisplay = document.getElementById('combo-display')
    if (comboDisplay) {
      comboDisplay.innerText = "×" + State.comboCount
      comboDisplay.style.opacity = 1
      comboDisplay.style.transform = "translate(-50%, -50%) scale(1.5) rotate(-10deg)"
      setTimeout(() => {
        comboDisplay.style.transform = "translate(-50%, -50%) scale(1) rotate(-15deg)"
      }, 100)
    }

    // One-shot scale pop on the dashboard
    const dashboard = document.getElementById('forged-dashboard')
    if (dashboard) {
      dashboard.classList.remove('combo-thump')
      void dashboard.offsetWidth // reflow to restart animation
      dashboard.classList.add('combo-thump')
      dashboard.addEventListener('animationend', () => {
        dashboard.classList.remove('combo-thump')
      }, { once: true })
    }

    addEnergy(5)
  } else {
    State.comboCount = 1
    const comboDisplay = document.getElementById('combo-display')
    if (comboDisplay) comboDisplay.style.opacity = 0
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
      SoundManager.play('combo_drop')
      // combo-active / vibrating class is cleared automatically by uiRenderer.updateScore() each frame
    }
  }
}
