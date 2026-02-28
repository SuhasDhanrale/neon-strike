// VOID skill module
import { createFloatingText, createParticles } from '../../visuals/particleSystem.js'
import { THEME } from '../../visuals/theme.js'
import { SoundManager } from '../../systems/SoundManager.js'

export default {
  id: 3,
  name: 'Void',
  mult: 1.4,
  shakeAmount: 40,

  execute(State) {
    const threshold = State.gameHeight * 0.4
    let candidates = State.orbs.filter(o => o.y > threshold && !o.isGeode && !o.inChamber)
    if (candidates.length < 5) {
      candidates = [...State.orbs.filter(o => !o.inChamber)]
    }
    candidates.sort(() => Math.random() - 0.5)
    let removedCount = 0
    for (let t of candidates) {
      if (removedCount >= 8) break
      t.markedForDeletion = true
      createParticles(t.x, t.y, t.color)
      removedCount++
    }
    createFloatingText(
      State.canvas.width / 2,
      State.canvas.height / 2,
      `VOID -${removedCount}`,
      THEME.floatingTextColors.void,
      60
    )
    SoundManager.play('skill_void')
  }
}