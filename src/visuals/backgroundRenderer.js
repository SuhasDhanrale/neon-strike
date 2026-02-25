// Volcanic Print Background Renderer
// Crosshatch texture with corner darkening

// Cache for crosshatch pattern - rebuilt only on resize
import { State } from '../state.js'
import { DANGER_LINE_Y } from '../config.js'

let offscreenCanvas = null
let cachedWidth = 0
let _cacheH = 0

export function drawBackground(ctx, canvas) {
  // ============================================
  // 1. CHARCOAL BASE — flat, warm
  // ============================================
  ctx.fillStyle = '#2d2520'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Darker zone above danger line
  ctx.fillStyle = '#1e1814' // Even darker charcoal
  ctx.fillRect(0, 0, canvas.width, DANGER_LINE_Y)

  // ============================================
  // 2. CROSSHATCH TEXTURE — cached offscreen canvas
  // ============================================
  // Rebuild only on resize
  if (!offscreenCanvas || cachedWidth !== canvas.width || _cacheH !== canvas.height) {
    offscreenCanvas = buildCrosshatch(canvas.width, canvas.height)
    cachedWidth = canvas.width
    _cacheH = canvas.height
  }
  ctx.drawImage(offscreenCanvas, 0, 0)

  // ============================================
  // 3. CORNER DARKENING — four rect fills, not a radial gradient
  // ============================================
  const v = canvas.width * 0.4

  // Top-left
  ctx.fillStyle = 'rgba(26, 20, 16, 0.5)'
  ctx.fillRect(0, 0, v, v)

  // Top-right
  ctx.fillRect(canvas.width - v, 0, v, v)

  // Bottom-left
  ctx.fillRect(0, canvas.height - v, v, v)

  // Bottom-right
  ctx.fillRect(canvas.width - v, canvas.height - v, v, v)
}

function buildCrosshatch(w, h) {
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const octx = off.getContext('2d')

  // Diagonal lines (one direction)
  octx.strokeStyle = 'rgba(26, 20, 16, 0.2)'
  octx.lineWidth = 0.8
  const spacing = 16

  for (let i = -h; i < w + h; i += spacing) {
    octx.beginPath()
    octx.moveTo(i, 0)
    octx.lineTo(i + h, h)
    octx.stroke()
  }

  // Diagonal lines (other direction)
  octx.strokeStyle = 'rgba(26, 20, 16, 0.12)'
  for (let i = -h; i < w + h; i += spacing * 1.5) {
    octx.beginPath()
    octx.moveTo(i + h, 0)
    octx.lineTo(i, h)
    octx.stroke()
  }

  return off
}

export default { drawBackground }
