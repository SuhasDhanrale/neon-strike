// Volcanic Print Particle System
// Crack shard particles and comic caption floating text

import { State } from '../state.js'
import { THEME } from './theme.js'

// ============================================
// MERGE PARTICLE — Crack Shards
// ============================================

export class MergeParticle {
  constructor(x, y, orbFill) {
    this.x = x
    this.y = y

    // Random direction with high speed for explosive effect
    const angle = Math.random() * Math.PI * 2
    const speed = THEME.particles.speedMin + Math.random() * (THEME.particles.speedMax - THEME.particles.speedMin)
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed

    this.life = 1.0
    this.decay = THEME.particles.decayMin + Math.random() * (THEME.particles.decayMax - THEME.particles.decayMin)

    // Shard length
    this.length = THEME.particles.lengthMin + Math.random() * (THEME.particles.lengthMax - THEME.particles.lengthMin)
    this.angle = angle

    // Color: mix of orb fill, ember, and parchment
    const r = Math.random()
    this.color = r < 0.5 ? orbFill : r < 0.75 ? '#e85d20' : '#e8ddd0'
  }

  update() {
    this.x += this.vx
    this.y += this.vy

    // Apply friction
    this.vx *= 0.91
    this.vy *= 0.91

    // Gravity
    this.vy += 0.35

    this.life -= this.decay
  }

  draw(ctx) {
    ctx.save()

    // Quadratic decay — stays opaque longer
    ctx.globalAlpha = this.life * this.life

    ctx.strokeStyle = this.color
    ctx.lineWidth = THEME.particles.lineWidth
    ctx.lineCap = 'round'

    // Draw shard as a line in direction of travel
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(
      this.x - Math.cos(this.angle) * this.length * this.life,
      this.y - Math.sin(this.angle) * this.length * this.life
    )
    ctx.stroke()

    ctx.restore()
  }
}

// ============================================
// LEGACY PARTICLE — for other effects
// ============================================

export class Particle {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.color = color
    this.vx = (Math.random() - 0.5) * 10
    this.vy = (Math.random() - 0.5) * 10
    this.life = 1.0
    this.size = 2 + Math.random() * 4
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vx *= 0.95
    this.vy *= 0.95
    this.life -= 0.03
  }

  draw(ctx) {
    ctx.globalAlpha = this.life
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0
  }
}

// ============================================
// FLOATING TEXT — Comic Caption Style (JUICY VERSION)
// ============================================

export class FloatingText {
  constructor(x, y, text, color, size = 28) {
    this.x = x
    this.y = y
    this.text = text
    this.color = color
    this.vy = -3.5  // Faster rise
    this.life = 1.0
    this.size = size

    // Determine outline color based on text type
    this.outlineColor = this.determineOutlineColor(color)

    // Big pop-in effect: start huge, bounce down
    this.scaleX = 1.6
    this.scaleY = 1.6
    this.targetScale = 1.0
    this.bounceCount = 0
    this.landed = false
  }

  determineOutlineColor(fillColor) {
    // Use ember/lava colors for outline based on fill color
    if (fillColor === '#ff7a35' || fillColor === '#e85d20' || fillColor === '#c93010') {
      return '#3d2010' // Dark coal for hot colors
    }
    return '#1a1410' // Ink black for others
  }

  update() {
    this.y += this.vy
    this.vy *= 0.96  // Slower deceleration
    this.life -= 0.018

    // Elastic bounce effect
    if (!this.landed) {
      const scaleSpeed = 0.25
      this.scaleX += (this.targetScale - this.scaleX) * scaleSpeed
      this.scaleY += (this.targetScale - this.scaleY) * scaleSpeed

      // Bounce detection
      if (Math.abs(this.scaleX - this.targetScale) < 0.08) {
        this.bounceCount++
        if (this.bounceCount >= 2) {
          this.landed = true
        } else {
          // Small bounce back up
          this.scaleX = 1.15
          this.scaleY = 1.15
        }
      }
    }
  }

  draw(ctx) {
    ctx.save()

    // Strong fade at end
    const fadeStart = 0.35
    if (this.life < fadeStart) {
      ctx.globalAlpha = this.life / fadeStart
    }

    ctx.translate(this.x, this.y)
    ctx.scale(this.scaleX, this.scaleY)

    // Extra bold: Bebas Neue with tight letter spacing
    ctx.font = `900 ${this.size}px 'Bebas Neue', 'Rajdhani', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'

    // QUAD stroke for extra boldness - comic book style
    // First pass: white outer glow (for contrast against dark bg)
    ctx.strokeStyle = '#f5ede0'
    ctx.lineWidth = Math.max(14, this.size * 0.45)
    ctx.strokeText(this.text, 0, 0)

    // Second pass: volcanic outline (ember/lava for hot colors)
    ctx.strokeStyle = this.outlineColor
    ctx.lineWidth = Math.max(10, this.size * 0.32)
    ctx.strokeText(this.text, 0, 0)

    // Third pass: medium stroke
    ctx.lineWidth = Math.max(6, this.size * 0.22)
    ctx.strokeText(this.text, 0, 0)

    // Final pass: color fill
    ctx.fillStyle = this.color
    ctx.fillText(this.text, 0, 0)

    // Optional: Add a "shine" highlight on top
    ctx.globalAlpha = 0.4
    ctx.fillStyle = '#f5ede0'
    ctx.font = `900 ${this.size * 0.95}px 'Bebas Neue', 'Rajdhani', sans-serif`
    ctx.fillText(this.text, -1, -1)

    ctx.restore()
  }
}

// ============================================
// CREATION FUNCTIONS
// ============================================

export function createParticles(x, y, color) {
  // Legacy particle creation
  for (let i = 0; i < 8; i++) {
    State.particles.push(new Particle(x, y, color))
  }
}

export function createMergeParticles(x, y, orbFill) {
  // New crack shard particles
  const count = THEME.particles.count
  for (let i = 0; i < count; i++) {
    State.particles.push(new MergeParticle(x, y, orbFill))
  }
}

export function createFloatingText(x, y, text, color, size) {
  State.floatingTexts.push(new FloatingText(x, y, text, color, size))
}

export function triggerEmbersBurst(amount = 40) {
  // Spawns embers at the bottom of the screen shooting upwards
  const screenW = State?.canvas?.width || 400
  const screenH = State?.canvas?.height || 600
  for (let i = 0; i < amount; i++) {
    const p = new Particle(Math.random() * screenW, screenH + 20, '#e85d20')
    // Re-adjust properties for upward burst
    p.vx = (Math.random() - 0.5) * 8
    p.vy = -12 - Math.random() * 8
    p.life = 1.0 + Math.random() * 0.5
    p.size = 3 + Math.random() * 6
    p.color = Math.random() > 0.4 ? '#e85d20' : '#ff7a35' // Ember and Magma
    State.particles.push(p)
  }
}

// ============================================
// UPDATE & DRAW LOOPS
// ============================================

export function updateParticles() {
  // Update all particles (both MergeParticle and legacy Particle)
  State.particles.forEach(p => p.update())
  State.particles = State.particles.filter(p => p.life > 0)

  // Update floating texts
  State.floatingTexts.forEach(t => t.update())
  State.floatingTexts = State.floatingTexts.filter(t => t.life > 0)
}

export function drawParticles(ctx) {
  State.particles.forEach(p => p.draw(ctx))
}

export function drawFloatingTexts(ctx) {
  State.floatingTexts.forEach(t => t.draw(ctx))
}

export default {
  MergeParticle,
  Particle,
  FloatingText,
  createParticles,
  createMergeParticles,
  createFloatingText,
  triggerEmbersBurst,
  updateParticles,
  drawParticles,
  drawFloatingTexts
}
