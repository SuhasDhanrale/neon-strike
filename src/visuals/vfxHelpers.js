// Volcanic Print VFX Helpers
// Jagged crack ring merge flash, screen shake

import { State } from '../state.js'

// ============================================
// MERGE FLASH — Jagged Crack Ring
// ============================================

let mergeFlashes = []

export function triggerMergeFlash(x, y, orbColor) {
  // Pre-generate jagged polygon points for explosive crack effect
  const pointCount = 10
  const points = Array.from({ length: pointCount }, (_, i) => ({
    angle: (i / pointCount) * Math.PI * 2,
    jitter: 0.7 + Math.random() * 0.6  // ±30% radius variation
  }))
  mergeFlashes.push({ x, y, color: orbColor, radius: 0, alpha: 1.0, points })
}

export function drawMergeFlashes(ctx) {
  mergeFlashes.forEach(f => {
    const progress = f.radius / 70
    
    ctx.save()
    ctx.globalAlpha = f.alpha * (1 - progress)
    ctx.strokeStyle = f.color
    ctx.lineWidth = 3.5 * (1 - progress * 0.6)
    ctx.lineJoin = 'round'
    
    // Draw jagged polygon
    ctx.beginPath()
    f.points.forEach((p, i) => {
      const r = f.radius * p.jitter
      const px = f.x + Math.cos(p.angle) * r
      const py = f.y + Math.sin(p.angle) * r
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    })
    ctx.closePath()
    ctx.stroke()
    
    // White interior flash on first 20% of animation only
    if (progress < 0.2) {
      ctx.globalAlpha = (0.2 - progress) * 3 * 0.55
      ctx.fillStyle = '#e8ddd0'
      ctx.fill()
    }
    
    ctx.restore()
    
    // Animate
    f.radius += 5.5
    f.alpha -= 0.055
  })
  
  // Clean up finished flashes
  mergeFlashes = mergeFlashes.filter(f => f.alpha > 0)
}

// ============================================
// SCREEN SHAKE
// ============================================

export function applyScreenShake(ctx) {
  if (State.screenShake > 0) {
    const dx = (Math.random() - 0.5) * State.screenShake
    const dy = (Math.random() - 0.5) * State.screenShake
    ctx.translate(dx, dy)
    // Note: decay happens in updateScreenShake() called from gameLoop
  }
}

export function updateScreenShake() {
  if (State.screenShake > 0) {
    State.screenShake *= 0.9
    if (State.screenShake < 0.5) State.screenShake = 0
  }
}

// ============================================
// ERUPTION FLASH — Full screen volcanic burst
// ============================================

let eruptionFlash = { active: false, alpha: 0 }

export function triggerEruptionFlash() {
  eruptionFlash = { active: true, alpha: 1.0 }
}

export function drawEruptionFlash(ctx) {
  if (!eruptionFlash.active) return
  
  // Full screen ember overlay
  ctx.save()
  ctx.globalAlpha = eruptionFlash.alpha * 0.4
  ctx.fillStyle = '#e85d20'
  ctx.fillRect(0, 0, State.canvas.width, State.canvas.height)
  ctx.restore()
  
  // Animate
  eruptionFlash.alpha -= 0.04
  if (eruptionFlash.alpha <= 0) {
    eruptionFlash.active = false
  }
}

// ============================================
// CHAMBER HEAT SHIMMER (optional, minimal)
// ============================================

export function drawHeatShimmer(ctx) {
  const heat = State.systemHeat / 100
  if (heat < 0.5) return
  
  // Subtle wavy lines above chamber when hot
  ctx.save()
  ctx.globalAlpha = (heat - 0.5) * 0.3
  ctx.strokeStyle = '#e85d20'
  ctx.lineWidth = 1
  
  const time = Date.now() * 0.003
  const y = State.mainFloorY - 10
  
  ctx.beginPath()
  for (let x = 0; x < State.canvas.width; x += 4) {
    const offsetY = Math.sin(x * 0.02 + time) * 3
    if (x === 0) {
      ctx.moveTo(x, y + offsetY)
    } else {
      ctx.lineTo(x, y + offsetY)
    }
  }
  ctx.stroke()
  
  ctx.restore()
}

export default { 
  triggerMergeFlash, 
  drawMergeFlashes, 
  applyScreenShake,
  updateScreenShake,
  triggerEruptionFlash,
  drawEruptionFlash,
  drawHeatShimmer,
  drawPolygon
}

// ============================================
// POLYGON DRAWING HELPER
// ============================================

/**
 * Draw a regular polygon or circle
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} radius - Radius
 * @param {number} sides - 0 = circle, 3+ = polygon
 * @param {number} rotation - Rotation in radians (default: 0)
 */
export function drawPolygon(ctx, x, y, radius, sides, rotation = 0) {
  if (!sides || sides < 3) {
    // Draw circle for invalid side counts (sides = 0 means circle)
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    return
  }
  
  ctx.beginPath()
  const angleStep = (Math.PI * 2) / sides
  
  for (let i = 0; i < sides; i++) {
    const angle = angleStep * i + rotation - Math.PI / 2
    const px = x + radius * Math.cos(angle)
    const py = y + radius * Math.sin(angle)
    
    if (i === 0) {
      ctx.moveTo(px, py)
    } else {
      ctx.lineTo(px, py)
    }
  }
  
  ctx.closePath()
}
