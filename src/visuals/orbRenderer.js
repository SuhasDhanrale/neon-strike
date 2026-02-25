// Volcanic Print Orb Renderer
// Bold Graphic Novel style - thick outlines, hard shadows, flat fills

import { State } from '../state.js'
import { THEME, ORB_VISUALS, getOrbShape } from './theme.js'
import { drawPolygon } from './vfxHelpers.js'

export function drawAll(ctx) {
  State.orbs.forEach(orb => {
    const data = orb.getDrawData()
    drawOrb(ctx, data)
  })
}

function drawOrb(ctx, orb) {
  const { x, y, radius, typeIndex } = orb

  // Get visual config for this orb type
  const visual = ORB_VISUALS[Math.min(typeIndex, ORB_VISUALS.length - 1)]
  // Get polygon shape for this orb type
  const shape = getOrbShape(Math.min(typeIndex, ORB_VISUALS.length - 1))

  ctx.save()

  // CRITICAL: Disable all shadow blur for volcanic print aesthetic
  ctx.shadowBlur = 0

  // ============================================
  // 1. HARD OFFSET SHADOW — drawn behind, offset bottom-right
  // ============================================
  ctx.fillStyle = visual.shadow
  ctx.beginPath()
  drawPolygon(ctx, x + radius * 0.1, y + radius * 0.1, radius, shape)
  ctx.fill()

  // ============================================
  // 2. HANDLE SPECIAL ORB STATES
  // ============================================

  if (orb.isGeode) {
    drawGeodeOrb(ctx, orb, x, y, radius, shape)
  } else if (orb.isFrosted) {
    drawFrostedOrb(ctx, orb, x, y, radius, shape)
  } else if (orb.ammoType === 'PIERCE' && orb.ghostTimer > 0) {
    drawPierceOrb(ctx, orb, x, y, radius, visual, shape)
  } else {
    drawNormalOrb(ctx, orb, x, y, radius, visual, shape)
  }

  ctx.restore()
}

function drawNormalOrb(ctx, orb, x, y, radius, visual, shape) {
  // 1. FLAT FILL
  ctx.fillStyle = visual.fill
  ctx.beginPath()
  drawPolygon(ctx, x, y, radius, shape)
  ctx.fill()

  // 2. SPECULAR MARK — solid circle, top-left quadrant, NOT a gradient
  ctx.globalAlpha = 0.55
  ctx.fillStyle = '#e8ddd0'
  ctx.beginPath()
  ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.18, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1.0

  // 3. THICK OUTLINE
  ctx.strokeStyle = visual.outline
  ctx.lineWidth = 4
  ctx.beginPath()
  drawPolygon(ctx, x, y, radius, shape)
  ctx.stroke()

  // 4. VALUE LABEL — stroked then filled for maximum legibility
  drawOrbLabel(ctx, orb.value, x, y, radius, visual.label)
}

function drawFrostedOrb(ctx, orb, x, y, radius, shape) {
  const frosted = THEME.frosted

  // 1. HARD SHADOW
  ctx.fillStyle = frosted.shadow
  ctx.beginPath()
  drawPolygon(ctx, x + radius * 0.18, y + radius * 0.2, radius, shape)
  ctx.fill()

  // 2. FLAT FILL - glacier color
  ctx.fillStyle = frosted.fill
  ctx.beginPath()
  drawPolygon(ctx, x, y, radius, shape)
  ctx.fill()

  // 3. CROSSHATCH TEXTURE - clip to orb, then draw diagonal lines
  ctx.save()
  ctx.beginPath()
  drawPolygon(ctx, x, y, radius, shape)
  ctx.clip()

  ctx.strokeStyle = '#1a1410'
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 1.5
  const spacing = radius * 0.35

  // Diagonal lines /
  for (let i = -radius; i < radius * 2; i += spacing) {
    ctx.beginPath()
    ctx.moveTo(x + i - radius, y - radius)
    ctx.lineTo(x + i + radius, y + radius)
    ctx.stroke()
  }

  // Diagonal lines \
  for (let i = -radius; i < radius * 2; i += spacing) {
    ctx.beginPath()
    ctx.moveTo(x + i + radius, y - radius)
    ctx.lineTo(x + i - radius, y + radius)
    ctx.stroke()
  }

  ctx.restore()

  // 4. SPECULAR MARK - larger and more opaque for frosted
  ctx.globalAlpha = frosted.specularAlpha
  ctx.fillStyle = '#e8ddd0'
  ctx.beginPath()
  ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * frosted.specularSize, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1.0

  // 5. OUTLINE - special color for frosted
  ctx.strokeStyle = frosted.outline
  ctx.lineWidth = 4
  ctx.beginPath()
  drawPolygon(ctx, x, y, radius, shape)
  ctx.stroke()

  // 6. VALUE LABEL
  drawOrbLabel(ctx, orb.value, x, y, radius, '#e8ddd0')
}

function drawGeodeOrb(ctx, orb, x, y, radius, shape) {
  const geode = THEME.geode

  // 1. HARD SHADOW
  ctx.fillStyle = geode.shadow
  ctx.beginPath()
  drawPolygon(ctx, x + radius * 0.18, y + radius * 0.2, radius, shape)
  ctx.fill()

  // 2. FLAT FILL - bone color
  ctx.fillStyle = geode.fill
  ctx.beginPath()
  drawPolygon(ctx, x, y, radius, shape)
  ctx.fill()

  // 3. INTERIOR CONCENTRIC CIRCLES - geological cross-section feel
  ctx.globalAlpha = 0.25
  ctx.strokeStyle = '#1a1410'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.65, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = 0.15
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.35, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = 1.0

  // 4. CRACKED STATE - draw jagged crack lines
  if (orb.hp < 2) {
    ctx.strokeStyle = '#e85d20'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    // First crack
    ctx.beginPath()
    ctx.moveTo(x - radius * 0.5, y - radius * 0.3)
    ctx.lineTo(x - radius * 0.1, y + radius * 0.1)
    ctx.lineTo(x + radius * 0.15, y - radius * 0.15)
    ctx.lineTo(x + radius * 0.45, y + radius * 0.35)
    ctx.stroke()

    // Second crack (smaller)
    ctx.beginPath()
    ctx.moveTo(x + radius * 0.3, y + radius * 0.4)
    ctx.lineTo(x + radius * 0.5, y - radius * 0.1)
    ctx.stroke()
  }

  // 5. THICK OUTLINE
  ctx.strokeStyle = geode.outline
  ctx.lineWidth = 5
  ctx.beginPath()
  drawPolygon(ctx, x, y, radius, shape)
  ctx.stroke()

  // 6. VALUE LABEL
  drawOrbLabel(ctx, orb.value, x, y, radius, '#1a1410')
}

function drawPierceOrb(ctx, orb, x, y, radius, visual, shape) {
  const pierce = THEME.pierce

  // No fill, no shadow, dashed outline only

  // DASHED OUTLINE
  ctx.strokeStyle = pierce.outline
  ctx.lineWidth = 3
  ctx.setLineDash(pierce.dashPattern)
  ctx.beginPath()
  drawPolygon(ctx, x, y, radius, shape)
  ctx.stroke()
  ctx.setLineDash([])

  // VALUE LABEL (smaller, no stroke for clarity through ghost)
  ctx.fillStyle = visual.label
  ctx.font = `900 ${Math.floor(radius * 0.7)}px 'Bebas Neue', 'Rajdhani', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(orb.value, x, y + radius * 0.05)
}

function drawOrbLabel(ctx, value, x, y, radius, labelColor) {
  ctx.fillStyle = labelColor
  ctx.font = `900 ${Math.floor(radius * 0.85)}px 'Bebas Neue', 'Rajdhani', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'

  // Stroke first for comic caption effect
  ctx.strokeStyle = '#1a1410'
  ctx.lineWidth = Math.max(3, radius * 0.12)
  ctx.strokeText(value, x, y + radius * 0.05)

  // Then fill
  ctx.fillText(value, x, y + radius * 0.05)
}

// Trail implementation - disabled for volcanic print aesthetic
// Depth comes from geometry, not motion blur
export function drawTrails(ctx) {
  // No trails - volcanic print aesthetic prefers clean shapes
}

export default { drawAll, drawTrails }
