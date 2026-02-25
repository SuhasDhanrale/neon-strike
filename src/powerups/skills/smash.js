// SMASH skill module
import { createFloatingText } from '../../visuals/particleSystem.js'
import { THEME } from '../../visuals/theme.js'

export default {
  id: 2,
  name: 'Smash',
  mult: 1.25,
  shakeAmount: 30,
  heatCost: 30,

  execute(State) {
    State.orbs.forEach(orb => {
      if (!orb.inChamber) {
        orb.vy += 30
        orb.vx *= 0.1
      }
    })
    createFloatingText(
      State.canvas.width / 2,
      State.canvas.height / 2,
      "SMASH!",
      THEME.floatingTextColors.smash,
      60
    )
  }
}