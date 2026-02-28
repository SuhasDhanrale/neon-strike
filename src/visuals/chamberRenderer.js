// Volcanic Print Chamber Renderer
// Geothermal chamber with halftone heat dots, hard offset lines - now machine base style

import { State } from '../state.js'
import { THEME, lerpColor } from './theme.js'

export function draw(ctx) {
  const { canvas, mainFloorY } = State
  const chamberH = canvas.height - mainFloorY

  // ============================================
  // 1. MACHINE BASE PANEL - Thick dark panel with bolts/rivets
  // ============================================
  ctx.fillStyle = '#1a1410'
  ctx.fillRect(0, mainFloorY, canvas.width, chamberH)

  // Panel border (top edge - thick)
  ctx.fillStyle = '#2d2520'
  ctx.fillRect(0, mainFloorY, canvas.width, 6)

  // Corner bolts/rivets
  const boltRadius = 5
  const boltColor = '#4a4040'
  const boltHighlight = '#6b5e58'

  // Top-left bolt
  ctx.fillStyle = boltColor
  ctx.beginPath()
  ctx.arc(12, mainFloorY + 12, boltRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = boltHighlight
  ctx.beginPath()
  ctx.arc(11, mainFloorY + 11, boltRadius * 0.5, 0, Math.PI * 2)
  ctx.fill()

  // Top-right bolt
  ctx.fillStyle = boltColor
  ctx.beginPath()
  ctx.arc(canvas.width - 12, mainFloorY + 12, boltRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = boltHighlight
  ctx.beginPath()
  ctx.arc(canvas.width - 13, mainFloorY + 11, boltRadius * 0.5, 0, Math.PI * 2)
  ctx.fill()

  // Bottom-left bolt
  ctx.fillStyle = boltColor
  ctx.beginPath()
  ctx.arc(12, canvas.height - 12, boltRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = boltHighlight
  ctx.beginPath()
  ctx.arc(11, canvas.height - 13, boltRadius * 0.5, 0, Math.PI * 2)
  ctx.fill()

  // Bottom-right bolt
  ctx.fillStyle = boltColor
  ctx.beginPath()
  ctx.arc(canvas.width - 12, canvas.height - 12, boltRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = boltHighlight
  ctx.beginPath()
  ctx.arc(canvas.width - 13, canvas.height - 13, boltRadius * 0.5, 0, Math.PI * 2)
  ctx.fill()

  // ============================================
  // 2. HORIZONTAL PIPE/VENT LINES - Mechanical feel
  // ============================================
  ctx.strokeStyle = '#2d2520'
  ctx.lineWidth = 3

  // Top pipe line
  ctx.beginPath()
  ctx.moveTo(30, mainFloorY + 28)
  ctx.lineTo(canvas.width - 30, mainFloorY + 28)
  ctx.stroke()

  // Bottom pipe line
  ctx.beginPath()
  ctx.moveTo(30, canvas.height - 20)
  ctx.lineTo(canvas.width - 30, canvas.height - 20)
  ctx.stroke()

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

  // Color line - fixed neutral color
  ctx.strokeStyle = '#4a4040'
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
  ctx.globalAlpha = 0.2
  ctx.fillStyle = '#6b5e58'
  ctx.font = THEME.chamber.labelFont
  ctx.textAlign = 'center'
  ctx.fillText('GEOTHERMAL CHAMBER', canvas.width / 2, mainFloorY + 22)
  ctx.restore()
}
