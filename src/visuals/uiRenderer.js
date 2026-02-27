// All DOM manipulation: score, bars, badges, toast, combo display
// HUD REDESIGN — Visual-first, no text numbers on bars
import { State } from '../state.js'
import { ORB_TYPES } from '../config.js'
import { EventBus } from '../eventBus.js'
import { ORB_VISUALS, getOrbShape } from './theme.js'
import { drawPolygon } from './vfxHelpers.js'
import { GearSystem } from '../systems/GearSystem.js'
import { LeaderboardManager } from '../leaderboard/leaderboardManager.js'

// DOM element cache
let scoreEl = null
let rankEl = null
let heatFillEl = null
let energyFillEl = null
let canvasEl = null
let progressionBarEl = null

// Long-press timer for mobile cost reveal
const pressTimers = new Map()

function initElements() {
  scoreEl = document.getElementById('score')
  rankEl = document.getElementById('hud-rank')
  heatFillEl = document.getElementById('heat-bar')
  energyFillEl = document.getElementById('xp-bar')
  canvasEl = document.getElementById('gameCanvas')
  progressionBarEl = document.getElementById('progression-bar')

  initProgressionBar()
  EventBus.on('unlocked:orb', handleOrbUnlock)

  // Cache leaderboard for live rank projection
  refreshLeaderboardCache()

  // Setup long-press detection for skill cost badges
  setupSkillLongPress()
}

function setupSkillLongPress() {
  for (let i = 1; i <= 3; i++) {
    const skillBtn = document.getElementById(`skill-${i}`)
    const wrapper = document.getElementById(`skill-wrapper-${i}`)

    if (!skillBtn || !wrapper) continue

    // Touch start — begin long-press timer
    skillBtn.addEventListener('touchstart', (e) => {
      const timer = setTimeout(() => {
        wrapper.classList.add('show-cost')
      }, 400) // 400ms long press
      pressTimers.set(i, timer)
    })

    // Touch end — clear timer and hide after delay
    skillBtn.addEventListener('touchend', () => {
      const timer = pressTimers.get(i)
      if (timer) {
        clearTimeout(timer)
        pressTimers.delete(i)
      }
      // Hide cost after 1.2s
      setTimeout(() => {
        wrapper.classList.remove('show-cost')
      }, 1200)
    })

    // Touch cancel — clear timer
    skillBtn.addEventListener('touchcancel', () => {
      const timer = pressTimers.get(i)
      if (timer) {
        clearTimeout(timer)
        pressTimers.delete(i)
      }
    })
  }
}

function initProgressionBar() {
  // Start at i=4 (orb value 32)
  for (let i = 4; i < ORB_TYPES.length; i++) {
    let slot = document.getElementById(`progression-slot-${i}`)
    if (!slot) {
      const orbDef = ORB_TYPES[i]
      const t = Math.max(0, Math.min(1, (orbDef.radius - 40) / (95 - 40)))
      const radius = 10 + (t * 14) // Radii from 10 to 24 (diameter 20 to 48)
      const size = Math.ceil(radius * 2 + 8) // Canvas size based on diameter + padding

      slot = document.createElement('canvas')
      slot.width = size
      slot.height = size
      slot.style.width = `${size}px`
      slot.style.height = `${size}px`
      slot.className = 'progression-slot'
      slot.id = `progression-slot-${i}`
      progressionBarEl.appendChild(slot)
    }
  }
}

function handleOrbUnlock({ typeIndex }) {
  const slot = document.getElementById(`progression-slot-${typeIndex}`)
  if (slot) {
    slot.classList.add('flash-unlock')
    setTimeout(() => slot.classList.remove('flash-unlock'), 1000)
  }
}

// --- LIVE RANK LOGIC ---
let lbCache = []
let currentDisplayRank = '---'

async function refreshLeaderboardCache() {
  try {
    lbCache = await LeaderboardManager.fetch(50)
  } catch (err) {
    console.warn('[HUD Rank] Failed to fetch leaderboard for projection', err)
  }
}

export const uiRenderer = {

  // Called every frame OR whenever State changes
  update() {
    // Initialize elements on first call
    if (!scoreEl) initElements()

    this.updateScore()
    this.updateHeatBar()
    this.updateEnergyBar()
    this.updateSkills()
    this.updateProgressionBar()

    // Refresh gear supply button state
    GearSystem.tickUI()
  },

  updateScore() {
    if (!scoreEl) return
    scoreEl.textContent = State.score

    // Gold glow on combo
    if (State.comboCount > 1) {
      scoreEl.classList.add('combo-glow')
    } else {
      scoreEl.classList.remove('combo-glow')
    }

    // Update Live Rank
    if (rankEl && lbCache.length > 0) {
      let projectedRank = 1
      for (const entry of lbCache) {
        // If our current score beats this entry, this is our rank
        if (State.score >= entry.score) break
        // Otherwise, skip over them
        projectedRank++
      }

      const newRankStr = projectedRank <= 50 ? `#${projectedRank}` : '>50'
      if (currentDisplayRank !== newRankStr) {
        currentDisplayRank = newRankStr
        rankEl.textContent = `RANK: ${currentDisplayRank}`

        // Optional: flash when rank increases
        rankEl.style.color = '#fff'
        rankEl.style.textShadow = '0 0 10px #fff'
        setTimeout(() => {
          rankEl.style.color = '#00f3ff'
          rankEl.style.textShadow = '0 0 5px rgba(0, 243, 255, 0.4)'
        }, 300)
      }
    }
  },

  updateHeatBar() {
    if (!heatFillEl) return

    const pct = State.systemHeat // already 0-100
    heatFillEl.style.height = pct + '%'

    // Class-based pulse state
    heatFillEl.classList.remove('heat-calm', 'heat-warning', 'heat-critical', 'heat-erupting')
    if (pct >= 80) heatFillEl.classList.add('heat-critical')
    else if (pct >= 40) heatFillEl.classList.add('heat-warning')
    else heatFillEl.classList.add('heat-calm')

    // Bleed heat color onto canvas edge
    if (canvasEl) {
      if (pct > 80) {
        const intensity = ((pct - 80) / 20).toFixed(2)
        canvasEl.style.boxShadow = `0 0 60px rgba(255, 0, 60, ${intensity * 0.6})`
      } else {
        canvasEl.style.boxShadow = '0 0 50px rgba(0, 243, 255, 0.1)'
      }
    }
  },

  updateEnergyBar() {
    if (!energyFillEl) return

    const pct = (State.currentEnergy / State.maxEnergy) * 100
    energyFillEl.style.width = pct + '%'

    // Handle drain animation
    if (GearSystem.isDrainingEnergy()) {
      energyFillEl.classList.add('draining')
      energyFillEl.classList.remove('energy-full', 'energy-empty')
    } else {
      energyFillEl.classList.remove('draining')
      energyFillEl.classList.remove('energy-full', 'energy-empty')
      if (State.currentEnergy >= State.maxEnergy) {
        energyFillEl.classList.add('energy-full')
      } else if (State.currentEnergy <= 0) {
        energyFillEl.classList.add('energy-empty')
      }
    }
    // No text. No numbers. Bar only.
  },

  updateSkills() {
    for (let i = 1; i <= 3; i++) {
      const btn = document.getElementById(`skill-${i}`)
      const badge = document.getElementById(`cost-${i}`)
      const skill = State.skills[i]

      if (!skill) continue

      // Update cost badge
      if (badge) {
        badge.textContent = Math.floor(skill.currentCost)
        if (skill.currentCost > skill.baseCost * 1.5) {
          badge.classList.add('high-cost')
        } else {
          badge.classList.remove('high-cost')
        }
      }

      if (btn) {
        // Clear all state classes first
        btn.classList.remove('locked', 'affordable', 'unaffordable', 'cooldown')

        // All skills always unlocked - check affordability only
        const canAfford = State.currentEnergy >= skill.currentCost

        if (canAfford) {
          btn.classList.add('affordable')
        } else {
          btn.classList.add('unaffordable')
        }
      }
    }
  },

  updateProgressionBar() {
    if (!progressionBarEl) return
    const maxUnlocked = Math.min(State.maxUnlockedOrbIndex, ORB_TYPES.length - 1)

    // Update filling line
    const fillEl = document.getElementById('progress-line-fill')
    if (fillEl) {
      // 4 is the starting index. We have ORB_TYPES.length - 4 total displayed segments
      const displayedUnlocked = Math.max(0, maxUnlocked - 3)
      const totalDisplayed = ORB_TYPES.length - 4
      const pct = Math.min(100, (displayedUnlocked / totalDisplayed) * 100)
      fillEl.style.width = `calc(${pct}% - 40px)` // account for left/right padding
    }

    // Start rendering from i=4 (orb value 32)
    for (let i = 4; i < ORB_TYPES.length; i++) {
      const slot = document.getElementById(`progression-slot-${i}`)
      if (!slot) continue

      const isUnlocked = i <= maxUnlocked
      const orbDef = ORB_TYPES[i]
      const ctx = slot.getContext('2d')
      const size = slot.width

      if (isUnlocked) {
        slot.classList.remove('locked')
        slot.classList.add('unlocked')
      } else {
        slot.classList.add('locked')
        slot.classList.remove('unlocked')
      }

      ctx.clearRect(0, 0, size, size)
      const visual = ORB_VISUALS[Math.min(i, ORB_VISUALS.length - 1)]
      const shape = getOrbShape(i)
      const t = Math.max(0, Math.min(1, (orbDef.radius - 40) / (95 - 40)))
      const radius = 10 + (t * 14) // Radii from 10 to 24
      const cx = size / 2
      const cy = size / 2

      ctx.save()
      // Hard offset shadow
      ctx.fillStyle = '#1a1410'
      ctx.beginPath()
      drawPolygon(ctx, cx + radius * 0.18, cy + radius * 0.2, radius, shape)
      ctx.fill()

      // Flat fill
      ctx.fillStyle = visual.fill
      ctx.beginPath()
      drawPolygon(ctx, cx, cy, radius, shape)
      ctx.fill()

      // Specular highlight
      ctx.globalAlpha = 0.55
      ctx.fillStyle = '#e8ddd0'
      ctx.beginPath()
      ctx.arc(cx - radius * 0.28, cy - radius * 0.28, radius * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1.0

      // Outline
      if (isUnlocked) {
        ctx.strokeStyle = '#ff7a35' // Golden/Magma stroke for unlocked
        ctx.lineWidth = 2.5
      } else {
        ctx.strokeStyle = '#1a1410' // Solid outline
        ctx.lineWidth = 1.5
      }

      ctx.beginPath()
      drawPolygon(ctx, cx, cy, radius, shape)
      ctx.stroke()

      // Text
      const valStr = orbDef.value.toString()
      const fontSize = valStr.length > 3 ? 9 : 10
      ctx.font = `bold ${fontSize}px "Bebas Neue", "Rajdhani", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.strokeStyle = '#1a1410'
      ctx.lineWidth = 2
      ctx.strokeText(valStr, cx, cy + 1)
      ctx.fillStyle = '#e8ddd0'
      ctx.fillText(valStr, cx, cy + 1)

      ctx.restore()
    }
  }
}

// Legacy function exports for backward compatibility
export function updateUI() {
  uiRenderer.update()
}

export function showLevelToast(title, msg) {
  const levelToast = document.getElementById('level-toast')
  const toastTitle = document.querySelector('.toast-title')
  const toastMessage = document.getElementById('toast-message')

  if (toastTitle) toastTitle.textContent = title
  if (toastMessage) toastMessage.textContent = msg
  if (levelToast) {
    levelToast.classList.add('active')
    setTimeout(() => {
      levelToast.classList.remove('active')
    }, 3000)
  }
}

export function showCombo(count) {
  const comboDisplay = document.getElementById('combo-display')
  if (!comboDisplay) return
  comboDisplay.textContent = "×" + count
  comboDisplay.style.opacity = 1
  comboDisplay.style.transform = "translate(-50%, -50%) scale(1.5) rotate(-10deg)"
  setTimeout(() => {
    comboDisplay.style.transform = "translate(-50%, -50%) scale(1) rotate(-15deg)"
  }, 100)
}

export function hideCombo() {
  const comboDisplay = document.getElementById('combo-display')
  if (comboDisplay) comboDisplay.style.opacity = 0
}

export default uiRenderer
