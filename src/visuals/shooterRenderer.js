// Volcanic Print Shooter Renderer
// Thick outlines, hard shadows, flat fills

import { State } from '../state.js'
import { THEME, ORB_VISUALS, getOrbShape } from './theme.js'
import { ORB_TYPES, DANGER_LINE_Y } from '../config.js'
import { drawPolygon } from './vfxHelpers.js'

export function draw(ctx) {
  // ============================================
  // FTUE SHOOTER PULSE - invitation rings
  // ============================================
  if (State.shooterPulseActive) {
    State.shooterPulseFrame = (State.shooterPulseFrame || 0) + 1

    drawPulseRing(ctx, State.shooterPos, State.shooterPulseFrame)
    drawPulseRing(ctx, State.shooterPos, State.shooterPulseFrame + 30)
  }

  const currentShot = State.ammoQueue[0]

  // ============================================
  // SHOOTER DOT
  // ============================================

  // Disable shadow blur for volcanic aesthetic
  ctx.shadowBlur = 0

  // Get orb visual for current shot
  let shooterFill = '#4a4040'
  let shooterOutline = '#1a1410'

  if (currentShot) {
    const typeIndex = currentShot.orbType || 0
    const visual = ORB_VISUALS[Math.min(typeIndex, ORB_VISUALS.length - 1)]
    shooterFill = visual.fill
    shooterOutline = visual.outline
  }

  const { x, y } = State.shooterPos
  const radius = THEME.shooter.radius

  // Hard offset shadow
  ctx.fillStyle = '#1a1410'
  ctx.beginPath()
  ctx.arc(x + 3, y + 4, radius, 0, Math.PI * 2)
  ctx.fill()

  // Flat fill
  ctx.fillStyle = shooterFill
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  // Specular highlight
  ctx.globalAlpha = 0.55
  ctx.fillStyle = '#e8ddd0'
  ctx.beginPath()
  ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1.0

  // Thick outline
  ctx.strokeStyle = shooterOutline
  ctx.lineWidth = THEME.shooter.outlineWidth
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()

  // Inner ring
  ctx.strokeStyle = THEME.shooter.ringColor
  ctx.lineWidth = THEME.shooter.ringWidth
  ctx.beginPath()
  ctx.arc(x, y, radius - 4, 0, Math.PI * 2)
  ctx.stroke()

  // ============================================
  // ICON/VALUE INSIDE SHOOTER
  // ============================================
  if (currentShot && currentShot.config.id !== 'STANDARD') {
    // Special ammo icon
    ctx.fillStyle = '#1a1410'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(currentShot.config.icon, x, y)
  } else if (currentShot) {
    // Standard orb value
    let type = ORB_TYPES[currentShot.orbType]
    ctx.fillStyle = '#e8ddd0'
    ctx.font = 'bold 10px "Bebas Neue", "Rajdhani", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(type.value, x, y)
  }

  // ============================================
  // AIM LINE
  // ============================================
  if (State.isAiming) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(State.shooterPos.x, State.shooterPos.y)

    const dx = State.aimStart.x - State.aimCurrent.x
    const dy = State.aimStart.y - State.aimCurrent.y

    ctx.lineTo(State.shooterPos.x + dx * 2, State.shooterPos.y + dy * 2)

    ctx.strokeStyle = THEME.shooter.aimLineColor
    ctx.setLineDash(THEME.shooter.aimLineDash)
    ctx.lineWidth = THEME.shooter.aimLineWidth
    ctx.stroke()

    // Aim dot with thick outline
    const dotX = State.shooterPos.x - dx
    const dotY = State.shooterPos.y - dy

    // Dot shadow
    ctx.fillStyle = '#1a1410'
    ctx.beginPath()
    ctx.arc(dotX + 2, dotY + 2, THEME.shooter.aimDotRadius, 0, Math.PI * 2)
    ctx.fill()

    // Dot fill
    ctx.fillStyle = THEME.shooter.aimDotColor
    ctx.beginPath()
    ctx.arc(dotX, dotY, THEME.shooter.aimDotRadius, 0, Math.PI * 2)
    ctx.fill()

    // Dot outline
    ctx.strokeStyle = '#1a1410'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(dotX, dotY, THEME.shooter.aimDotRadius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()
  }

  // ============================================
  // DEATH LIMIT LINE
  // ============================================
  ctx.beginPath()
  ctx.moveTo(0, DANGER_LINE_Y)
  ctx.lineTo(State.canvas.width, DANGER_LINE_Y)
  ctx.strokeStyle = THEME.deathLine.color
  ctx.setLineDash(THEME.deathLine.dash)
  ctx.lineWidth = THEME.deathLine.width
  ctx.stroke()
  ctx.setLineDash([])

  // ============================================
  // NEXT ORB
  // ============================================
  const nextShot = State.ammoQueue[1]
  if (nextShot) {
    const typeIndex = nextShot.orbType || 0
    const visual = ORB_VISUALS[Math.min(typeIndex, ORB_VISUALS.length - 1)]
    const shape = getOrbShape(typeIndex)
    const nx = State.shooterPos.x + THEME.shooter.radius + 20
    const ny = State.shooterPos.y - 10
    const nRadius = THEME.shooter.radius * 0.65

    ctx.save()
    ctx.shadowBlur = 0
    // Hard offset shadow
    ctx.fillStyle = '#1a1410'
    ctx.beginPath()
    drawPolygon(ctx, nx + nRadius * 0.18, ny + nRadius * 0.2, nRadius, shape)
    ctx.fill()
    // Flat fill
    ctx.fillStyle = visual.fill
    ctx.beginPath()
    drawPolygon(ctx, nx, ny, nRadius, shape)
    ctx.fill()
    // Specular Highlight
    ctx.globalAlpha = 0.55
    ctx.fillStyle = '#e8ddd0'
    ctx.beginPath()
    ctx.arc(nx - nRadius * 0.28, ny - nRadius * 0.28, nRadius * 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0
    // Outline
    ctx.strokeStyle = visual.outline
    ctx.lineWidth = 3
    ctx.beginPath()
    drawPolygon(ctx, nx, ny, nRadius, shape)
    ctx.stroke()
    // Value text
    if (nextShot.config && nextShot.config.id !== 'STANDARD') {
      ctx.fillStyle = '#1a1410'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(nextShot.config.icon, nx, ny)
    } else {
      let type = ORB_TYPES[typeIndex]

      // text stroke
      ctx.strokeStyle = '#1a1410'
      ctx.lineWidth = 2
      ctx.font = 'bold 9px "Bebas Neue", "Rajdhani", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeText(type.value, nx, ny)

      ctx.fillStyle = '#e8ddd0'
      ctx.fillText(type.value, nx, ny)
    }
    ctx.restore()
  }
}

function drawPulseRing(ctx, pos, frame) {
  // Ring expands from radius 14 to 44 over 60 frames, then repeats
  const progress = (frame % 60) / 60
  const radius = 14 + (progress * 30)
  const alpha = (1 - progress) * 0.6

  ctx.save()

  // No blur - just flat ring with outline
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(232, 221, 208, ${alpha})`
  ctx.lineWidth = 2
  ctx.stroke()

  // Outer shadow ring (offset)
  ctx.beginPath()
  ctx.arc(pos.x + 2, pos.y + 2, radius, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(26, 20, 16, ${alpha * 0.5})`
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()
}

export default { draw }
