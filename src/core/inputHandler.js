// Mouse + touch events. Exports startAim, moveAim, endAim
import { State } from '../state.js'
import { spawnOrb } from './orbManager.js'
import { MAX_POWER } from '../config.js'

let canvas = null

function getPos(e) {
  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function startAim(e) {
  if (State.isGameOver || !State.canFire || e.target.closest('.ability-btn')) return
  e.preventDefault()
  State.isAiming = true
  const pos = getPos(e)
  State.aimStart = pos
  State.aimCurrent = pos
  const tutEl = document.getElementById('tutorial-text')
  if (tutEl) tutEl.style.display = 'none'
}

function moveAim(e) {
  if (!State.isAiming) return
  e.preventDefault()
  State.aimCurrent = getPos(e)
}

function endAim(e) {
  if (!State.isAiming) return
  State.isAiming = false

  const dx = State.aimStart.x - State.aimCurrent.x
  const dy = State.aimStart.y - State.aimCurrent.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 20) {
    let power = Math.min(dist * 0.15, MAX_POWER)
    let angle = Math.atan2(dy, dx)
    spawnOrb(angle, power)
  }
}

export function init(canvasElement) {
  canvas = canvasElement

  canvas.addEventListener('mousedown', startAim)
  canvas.addEventListener('touchstart', startAim, { passive: false })
  window.addEventListener('mousemove', moveAim)
  window.addEventListener('touchmove', moveAim, { passive: false })
  window.addEventListener('mouseup', endAim)
  window.addEventListener('touchend', endAim)
}

export function cleanup() {
  if (canvas) {
    canvas.removeEventListener('mousedown', startAim)
    canvas.removeEventListener('touchstart', startAim)
  }
  window.removeEventListener('mousemove', moveAim)
  window.removeEventListener('touchmove', moveAim)
  window.removeEventListener('mouseup', endAim)
  window.removeEventListener('touchend', endAim)
}
