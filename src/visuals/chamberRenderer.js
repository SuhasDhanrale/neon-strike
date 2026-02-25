// Volcanic Print Chamber Renderer
// Geothermal chamber with halftone heat dots, hard offset lines

import { State } from '../state.js'
import { THEME, lerpColor } from './theme.js'

export function draw(ctx) {
  const { canvas, mainFloorY, systemHeat } = State
  const chamberH = canvas.height - mainFloorY
  const heat = systemHeat / 100

  // ============================================
  // 1. GLASS BASE - translucent dark panel (glass effect)
  // ============================================
  ctx.fillStyle = `rgba(10, 5, 2, 0.55)`
  ctx.fillRect(0, mainFloorY, canvas.width, chamberH)

  // Glass top edge highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(0, mainFloorY)
  ctx.lineTo(canvas.width, mainFloorY)
  ctx.stroke()

  // ============================================
  // 2. HALFTONE HEAT DOTS - real canvas dots, not gradient
  // ============================================
  if (heat > 0.05) {
    ctx.save()
    ctx.globalAlpha = heat * 0.5
    ctx.fillStyle = '#e85d20'

    const spacing = THEME.chamber.halftoneSpacing
    const dotR = THEME.chamber.halftoneDotR

    for (let px = spacing / 2; px < canvas.width; px += spacing) {
      for (let py = mainFloorY + 8; py < canvas.height; py += spacing) {
        ctx.beginPath()
        ctx.arc(px, py, dotR, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  // ============================================
  // 3. FLOOR LINE - hard shadow behind, then colored dashed line
  // ============================================

  // Shadow line (drawn first, offset)
  ctx.strokeStyle = '#1a1410'
  ctx.lineWidth = THEME.chamber.shadowWidth
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(0, mainFloorY + 2)
  ctx.lineTo(canvas.width, mainFloorY + 2)
  ctx.stroke()

  // Color line - lerps from ash to lava as heat rises
  const lineColor = lerpColor('#4a4040', '#c93010', heat)
  ctx.strokeStyle = lineColor
  ctx.lineWidth = THEME.chamber.lineWidth
  ctx.setLineDash(THEME.chamber.dashPattern)
  ctx.beginPath()
  ctx.moveTo(0, mainFloorY)
  ctx.lineTo(canvas.width, mainFloorY)
  ctx.stroke()
  ctx.setLineDash([])

  // ============================================
  // 4. CHAMBER LABEL - stencil style
  // ============================================
  ctx.save()
  ctx.globalAlpha = 0.2 + heat * 0.3
  ctx.fillStyle = '#6b5e58'
  ctx.font = THEME.chamber.labelFont
  ctx.textAlign = 'center'
  ctx.fillText('GEOTHERMAL CHAMBER', canvas.width / 2, mainFloorY + 22)
  ctx.restore()

  // ============================================
  // 5. HYDRAULIC RODS (if lifting)
  // ============================================
  drawHydraulicRods(ctx)
}

function drawHydraulicRods(ctx) {
  const liftingOrbs = State.orbs.filter(orb => orb.hydraulicLiftDuration > 0)
  if (liftingOrbs.length === 0) return

  liftingOrbs.forEach((orb, idx) => {
    const t = Math.min(1, orb.hydraulicLiftFrame / orb.hydraulicLiftDuration)
    const pulse = 0.55 + (Math.sin((State.frameCount * 0.22) + idx) * 0.2)
    const rodWidth = Math.max(6, orb.radius * 0.36)
    const headWidth = rodWidth + 10
    const rodTop = orb.y + orb.radius - 2
    const rodBottom = State.gameHeight - 4
    const rodHeight = Math.max(0, rodBottom - rodTop)

    if (rodHeight <= 0) return

    // Rod body - flat fill
    ctx.fillStyle = '#4a4040'
    ctx.fillRect(orb.x - rodWidth / 2, rodTop, rodWidth, rodHeight)

    // Rod outline - thick stroke
    ctx.strokeStyle = '#1a1410'
    ctx.lineWidth = 2
    ctx.strokeRect(orb.x - rodWidth / 2, rodTop, rodWidth, rodHeight)

    // Rod head
    ctx.fillStyle = lerpColor('#4a4040', '#e85d20', t * pulse)
    ctx.fillRect(orb.x - headWidth / 2, rodTop - 5, headWidth, 7)
    ctx.strokeStyle = '#1a1410'
    ctx.lineWidth = 2
    ctx.strokeRect(orb.x - headWidth / 2, rodTop - 5, headWidth, 7)
  })

  // Chamber glow from hydraulic activity
  const totalProgress = liftingOrbs.reduce((sum, orb) => {
    return sum + Math.min(1, orb.hydraulicLiftFrame / orb.hydraulicLiftDuration)
  }, 0)
  const avgProgress = totalProgress / liftingOrbs.length

  // Hard edge glow rect, no blur
  ctx.fillStyle = `rgba(232, 93, 32, ${0.08 + (0.12 * avgProgress)})`
  ctx.fillRect(0, State.mainFloorY - 4, State.canvas.width, 8)
}

export default { draw }
