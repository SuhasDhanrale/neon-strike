// FTUE Overlay - Shooter pulse visual only
// No scrim. No tooltip card. No highlight boxes. No DOM overlays.
// The pulse is drawn directly onto the game canvas by shooterRenderer.js reading a state flag.
import { State } from '../state.js'

export const ftueOverlay = {

  startShooterPulse() {
    State.shooterPulseActive = true
    State.shooterPulseFrame = 0
  },

  stopShooterPulse() {
    State.shooterPulseActive = false
    State.shooterPulseFrame = 0
  }
}

export default ftueOverlay