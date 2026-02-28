// Registry. useSkill(id). Checks cost, deducts energy, calls execute()
import { State } from '../state.js'
import { updateUI } from '../visuals/uiRenderer.js'
import { createFloatingText } from '../visuals/particleSystem.js'
import { THEME } from '../visuals/theme.js'
import { AdManager } from '../../ads/AdManager.js'
import { SoundManager } from '../systems/SoundManager.js'

const registry = {}

export function registerSkill(skillModule) {
  registry[skillModule.id] = skillModule
}

let pendingSkillId = null

export function useSkill(id) {
  if (State.isGameOver) return

  const skill = registry[id]
  const runtimeSkill = State.skills[id]
  if (!skill) return

  pendingSkillId = id

  // Setup the modal UI based on whether the player can afford it
  const canAfford = State.currentEnergy >= runtimeSkill.currentCost
  showRequisitionModal(skill.id, runtimeSkill.currentCost, canAfford)
}

function showRequisitionModal(skillId, currentCost, canAfford) {
  const displayId = String(skillId).toUpperCase()
  document.getElementById('req-title').innerText = `REQUISITION: ${displayId}`
  document.getElementById('req-cost').innerText = currentCost

  const energyBtn = document.querySelector('.req-btn.energy-btn')
  const adBtn = document.querySelector('.req-btn.ad-btn')

  // Handle Energy Button Status
  if (canAfford) {
    energyBtn.classList.remove('disabled')
  } else {
    energyBtn.classList.add('disabled')
  }

  // Handle Ad Button Status 
  // Disable if AdManager says no rewarded ads available (or offline)
  if (AdManager.isAdAvailable("rewarded") === false) {
    adBtn.classList.add('disabled')
  } else {
    adBtn.classList.remove('disabled')
  }

  document.getElementById('requisition-overlay').classList.remove('hidden')
  SoundManager.play('requisition_open')
}

// silent=true skips the cancel sound (e.g. when called after confirming a skill)
export function closeRequisition(silent = false) {
  document.getElementById('requisition-overlay').classList.add('hidden')
  pendingSkillId = null
  if (!silent) SoundManager.play('requisition_cancel')
}

export function confirmRequisition(method) {
  if (!pendingSkillId) return

  const skill = registry[pendingSkillId]
  const runtimeSkill = State.skills[pendingSkillId]

  if (method === 'energy') {
    if (State.currentEnergy < runtimeSkill.currentCost) return // safety check

    // Deduct cost & scale up
    State.currentEnergy -= runtimeSkill.currentCost
    localStorage.setItem('neonStrike_currentEnergy', State.currentEnergy.toString())
    runtimeSkill.currentCost = Math.ceil(runtimeSkill.currentCost * skill.mult)

    SoundManager.play('requisition_confirm')
    _executeSkill(skill)
    closeRequisition(true)  // silent — confirm sound already played
  }
  else if (method === 'ad') {
    // Show Ad
    AdManager.showRewardedAd('powerup_' + skill.id, (success) => {
      if (success) {
        // Runs for free: no cost, no cost scaling, no heat penalty
        _executeSkill(skill)
      } else {
        createFloatingText(State.canvas.width / 2, State.canvas.height / 2, "SIGNAL LOST", THEME.floatingTextColors.needEnergy, 30)
      }
      closeRequisition(true)  // silent — ad flow, no cancel sound
    })
  }
}

function _executeSkill(skill) {
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
window.closeRequisition = closeRequisition
window.confirmRequisition = confirmRequisition

export default { registerSkill, useSkill, initPowerups, closeRequisition, confirmRequisition }
