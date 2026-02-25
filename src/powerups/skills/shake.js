// SHAKE skill module
import { createFloatingText } from '../../visuals/particleSystem.js'
import { THEME } from '../../visuals/theme.js'

export default {
  id: 1,
  name: 'Shake',
  mult: 1.3,
  shakeAmount: 15,
  heatCost: 30,

  execute(State) {
    State.orbs.forEach(orb => {
      if (!orb.inChamber) {
        orb.vy -= 15 + Math.random() * 5
        orb.vx += (Math.random() - 0.5) * 20
      }
    })
    createFloatingText(
      State.canvas.width / 2,
      State.canvas.height / 2,
      "SHAKE!",
      THEME.floatingTextColors.shake,
      50
    )
  }
}