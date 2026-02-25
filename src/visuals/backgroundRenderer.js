// Background Renderer
// Canvas is fully transparent — gear SVG background shows through.
// Game elements (orbs, chamber, shooter) each draw their own fills.

import { State } from '../state.js'

export function drawBackground(ctx, canvas) {
  // Transparent clear first — required so CSS background: transparent works on canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

export default { drawBackground }
