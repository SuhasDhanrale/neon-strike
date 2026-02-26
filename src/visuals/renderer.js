// Volcanic Print Master Renderer
// Updated draw layer order for volcanic aesthetic

import { State } from '../state.js'
import { draw as drawChamber } from './chamberRenderer.js'
import { drawAll as drawOrbs, drawTrails } from './orbRenderer.js'
import { draw as drawShooter } from './shooterRenderer.js'
import { drawParticles, drawFloatingTexts } from './particleSystem.js'
import { applyScreenShake, drawMergeFlashes, drawHeatShimmer } from './vfxHelpers.js'
import { drawBackground } from './backgroundRenderer.js'

export function draw() {
  const { ctx, canvas } = State

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()

  // Apply screen shake
  applyScreenShake(ctx)

  // ============================================
  // LAYER ORDER (back to front):
  // ============================================

  // 1. Background — crosshatch texture with corner darkening
  drawBackground(ctx, canvas)

  // 2. Chamber strip (behind orbs)
  drawChamber(ctx)

  // 3. Heat shimmer (above chamber, below orbs)
  drawHeatShimmer(ctx)

  // 4. Orb trails (behind orbs) — disabled for volcanic aesthetic
  // drawTrails(ctx) // Commented out - no trails in volcanic style

  // 5. Orbs
  drawOrbs(ctx)

  // 6. Particles (crack shards)
  drawParticles(ctx)

  // 7. Floating texts (comic captions)
  drawFloatingTexts(ctx)

  // 8. Shooter
  drawShooter(ctx)

  // 9. Merge flash bursts (jagged crack rings)
  drawMergeFlashes(ctx)

  ctx.restore()
}

export default { draw }
