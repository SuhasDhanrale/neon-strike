// addScore(), addEnergy(), combo logic
import { State } from '../state.js'
import { updateUI } from '../visuals/uiRenderer.js'

export function addScore(amount) {
  State.score += amount
  document.getElementById('score').innerText = State.score
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
