// Registry. useSkill(id). Checks cost, deducts energy, calls execute()
import { State } from '../state.js'
import { addHeat } from '../core/heatSystem.js'
import { updateUI } from '../visuals/uiRenderer.js'
import { createFloatingText } from '../visuals/particleSystem.js'
import { THEME } from '../visuals/theme.js'

const registry = {}

export function registerSkill(skillModule) {
  registry[skillModule.id] = skillModule
}

export function useSkill(id) {
  const skill = registry[id]
  const runtimeSkill = State.skills[id]
  
  if (!skill || State.isGameOver) return
  if (State.level < skill.unlockLevel) return
  if (State.currentEnergy < runtimeSkill.currentCost) {
    createFloatingText(
      State.canvas.width / 2, 
      State.canvas.height - 100, 
      "NEED ENERGY!", 
      THEME.floatingTextColors.needEnergy, 
      26
    )
    return
  }
  
  // Deduct cost + scale up for next use
  State.currentEnergy -= runtimeSkill.currentCost
  runtimeSkill.currentCost = Math.ceil(runtimeSkill.currentCost * skill.mult)
  
  // Add heat (obeys eruption grace lock)
  const heatApplied = addHeat(skill.heatCost)
  if (heatApplied) {
    createFloatingText(
      State.shooterPos.x + 50, 
      State.shooterPos.y, 
      `+${skill.heatCost} HEAT`, 
      THEME.floatingTextColors.heat, 
      28
    )
  } else if (State.graceMoves > 0) {
    createFloatingText(
      State.shooterPos.x + 50,
      State.shooterPos.y,
      `GRACE (${State.graceMoves})`,
      THEME.glacier,
      26
    )
  }
  
  // Run the skill
  skill.execute(State)
  
  State.screenShake = skill.shakeAmount || 15
  updateUI()
}

export function initPowerups() {
  // Import and register all skills here
  import('./skills/shake.js').then(m => registerSkill(m.default))
  import('./skills/smash.js').then(m => registerSkill(m.default))
  import('./skills/void.js').then(m => registerSkill(m.default))
}

// Expose useSkill globally for onclick handlers
window.useSkill = useSkill

export default { registerSkill, useSkill, initPowerups }
