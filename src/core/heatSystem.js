// systemHeat logic, triggerEruption()
import { State } from '../state.js'
import { EventBus } from '../eventBus.js'
import { ERUPTION_HEAT_THRESHOLD } from '../config.js'
import { updateUI } from '../visuals/uiRenderer.js'

export function addHeat(amount) {
  const prevHeat = State.systemHeat
  State.systemHeat += amount
  State.systemHeat = Math.max(0, Math.min(100, State.systemHeat))

  if (prevHeat < 80 && State.systemHeat >= 80) {
    EventBus.emit('state:heat_critical')
  }

  if (prevHeat < ERUPTION_HEAT_THRESHOLD && State.systemHeat >= ERUPTION_HEAT_THRESHOLD) {
    triggerEruption()
  }

  return true
}

export function coolHeat(amount) {
  const prevHeat = State.systemHeat
  State.systemHeat -= amount
  State.systemHeat = Math.max(0, Math.min(100, State.systemHeat))

  if (prevHeat >= 80 && State.systemHeat < 80) {
    EventBus.emit('state:heat_stable')
  }
}

export function triggerEruption() {
  // Energy leak penalty: lose 5% of max energy
  const energyLoss = Math.floor(State.maxEnergy * 0.05)
  State.currentEnergy = Math.max(0, State.currentEnergy - energyLoss)

  // Persist energy to localStorage
  localStorage.setItem('neonStrike_energy', State.currentEnergy)

  // Reset heat to 0
  State.systemHeat = 0

  EventBus.emit('state:heat_stable')
  EventBus.emit('state:heat_leak', { lost: energyLoss })

  updateUI()
}
