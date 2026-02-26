// Background Renderer
// Canvas is fully transparent — gear SVG background shows through.
// Game elements (orbs, chamber, shooter) each draw their own fills.

import { State } from '../state.js'

export function drawBackground(ctx, canvas) {
  // Always clear first to prevent frame smearing
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

export default { drawBackground }
