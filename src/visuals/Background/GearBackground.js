// GearBackground.js
// Full-screen SVG gear background - faithful 1:1 port of Mechanical Gear Background.md
// Converted from React to plain JS module. All visual logic preserved exactly.

import { GEAR_SYSTEM } from '../../config.js'

// ============================================
// MATH UTILITIES (from spec)
// ============================================
const polar = (r, a) => ({ x: r * Math.cos(a), y: r * Math.sin(a) })

// Generates a robust and precise gear tooth path (copied verbatim from spec)
function createGearPath(N, R) {
    const m = R * 2 / N
    const Ro = R + m
    const Ri = R - 1.2 * m
    const delta = (Math.PI * 2) / N
    let path = ''

    for (let i = 0; i < N; i++) {
        const angle = i * delta
        const a1 = angle - 0.2 * delta
        const a2 = angle - 0.1 * delta
        const a3 = angle + 0.1 * delta
        const a4 = angle + 0.2 * delta
        const aNext = angle + 0.8 * delta

        const p1 = polar(Ri, a1)
        const p2 = polar(Ro, a2)
        const p3 = polar(Ro, a3)
        const p4 = polar(Ri, a4)
        const pNext = polar(Ri, aNext)

        if (i === 0) path += `M ${p1.x} ${p1.y} `
        path += `L ${p2.x} ${p2.y} A ${Ro} ${Ro} 0 0 1 ${p3.x} ${p3.y} `
        path += `L ${p4.x} ${p4.y} A ${Ri} ${Ri} 0 0 1 ${pNext.x} ${pNext.y} `
    }
    return path + 'Z'
}

// ============================================
// GEAR DEFINITIONS & LAYOUT TOPOLOGY (from spec, verbatim)
// ============================================
const gearsData = [
    { id: 0, key: '1', N: 24, theta: 0, parent: null, color: '#f59e0b' }, // Amber
    { id: 1, key: '2', N: 16, theta: 30, parent: 0, color: '#3b82f6' }, // Blue
    { id: 2, key: '3', N: 32, theta: 150, parent: 0, color: '#ec4899' }, // Pink
    { id: 3, key: '4', N: 12, theta: -45, parent: 1, color: '#10b981' }, // Emerald
    { id: 4, key: '5', N: 20, theta: 270, parent: 0, color: '#8b5cf6' }, // Violet
    { id: 5, key: '6', N: 14, theta: 210, parent: 4, color: '#ef4444' }, // Red
    { id: 6, key: '7', N: 28, theta: 330, parent: 4, color: '#14b8a6' }, // Teal
    { id: 7, key: '8', N: 18, theta: 90, parent: 2, color: '#f97316' }, // Orange
    { id: 8, key: '9', N: 10, theta: 210, parent: 2, color: '#06b6d4' }, // Cyan
    { id: 9, key: '0', N: 22, theta: 0, parent: 7, color: '#eab308' }, // Yellow
    { id: 10, key: '-', N: 16, theta: -45, parent: 9, color: '#6366f1' }, // Indigo
]

function setupGears() {
    const g = JSON.parse(JSON.stringify(gearsData))
    const m = 10

    g[0].x = 0; g[0].y = 0; g[0].initialRotation = 0
    g[0].R = (g[0].N * m) / 2; g[0].dir = 1
    g[0].path = createGearPath(g[0].N, g[0].R)

    for (let i = 1; i < g.length; i++) {
        const parent = g.find(p => p.id === g[i].parent)
        g[i].R = (g[i].N * m) / 2
        const dist = parent.R + g[i].R
        const thetaRad = (g[i].theta * Math.PI) / 180

        g[i].x = parent.x + dist * Math.cos(thetaRad)
        g[i].y = parent.y + dist * Math.sin(thetaRad)
        g[i].initialRotation = g[i].theta + 180 + (180 - (g[i].theta - parent.initialRotation) * parent.N) / g[i].N
        g[i].dir = -parent.dir
        g[i].path = createGearPath(g[i].N, g[i].R)
    }
    return g
}

// Background (parallax) gears — massive, behind everything (from spec verbatim)
const bgGearsData = [
    { id: 'bg1', N: 50, x: -350, y: -250, R: 550, dir: 1 },
    { id: 'bg2', N: 42, x: 450, y: 350, R: 450, dir: -1 },
    { id: 'bg3', N: 64, x: 150, y: -600, R: 700, dir: 1 },
].map(g => ({ ...g, path: createGearPath(g.N, g.R) }))

// Pre-generate sparks once (from spec verbatim)
function buildSparks(count) {
    return Array.from({ length: count }).map((_, i) => ({
        id: i,
        cx: Math.random() * 1100 - 550,
        cy: 650 + Math.random() * 200,
        r: Math.random() * 2 + 1,
        delay: Math.random() * -10,
        duration: Math.random() * 4 + 4,
        xDrift: Math.random() * 100 - 50,
    }))
}

// ============================================
// SVG HELPER — create SVG elements tersely
// ============================================
const SVG_NS = 'http://www.w3.org/2000/svg'
function el(tag, attrs = {}, children = []) {
    const elem = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) {
        elem.setAttribute(k, v)
    }
    for (const child of children) {
        if (child) elem.appendChild(child)
    }
    return elem
}

// ============================================
// MODULE STATE
// ============================================
let svgEl = null
let angleRef = 0
let turbineEl = null
const bgGearEls = {}
const frontGearEls = {}
let sparkEls = []
let flashOverlayEl = null  // HTML <div> overlay — full-screen radial glow (NOT an SVG rect)
let shakeContainerEl = null
let computedGears = null
let sparks = null

// Glitch / overdrive state (mirrors React state from spec)
let _prevActiveSize = -1
let _isOverdrive = false
let _isGlitching = false
let _showFlash = false
let _flashTimer = null
let _glitchTimer = null
let _glitchInterval = null
let _internalSpeed = 0
let _lastTime = 0

// Gear unlock VFX state
let _unlockShakeActive = false   // blocks applyVisualState() from overwriting animate during unlock
let _unlockFlashActive = false   // blocks applyVisualState() from touching flash during unlock
let _gearUnlockSpeedBoost = 0   // additive speed boost, decays per frame

// ============================================
// BUILD THE SVG DOM — called once on init
// ============================================
function buildSVGDOM() {
    computedGears = setupGears()
    sparks = buildSparks(GEAR_SYSTEM.SPARK_COUNT)

    // Root SVG — full screen, behind everything
    svgEl = document.createElementNS(SVG_NS, 'svg')
    svgEl.setAttribute('id', 'gear-background-svg')
    svgEl.setAttribute('viewBox', '-550 -550 1100 1100')
    svgEl.style.cssText = [
        'position:absolute',
        'top:0',
        'left:0',
        'width:100%',
        'height:100%',
        'z-index:0',
        'pointer-events:none',
        'background:#020617',
    ].join(';')


    // ── <defs> ─────────────────────────────────
    const defs = el('defs')

    // Per-gear glow filters
    computedGears.forEach(g => {
        const filter = el('filter', { id: `glow-${g.id}` })
        const blur = el('feGaussianBlur', { stdDeviation: '8', result: 'coloredBlur' })
        const merge = el('feMerge')
        merge.appendChild(el('feMergeNode', { in: 'coloredBlur' }))
        merge.appendChild(el('feMergeNode', { in: 'SourceGraphic' }))
        filter.appendChild(blur)
        filter.appendChild(merge)
        defs.appendChild(filter)
    })

    // Spark glow filter
    const sparkFilter = el('filter', { id: 'glow-spark' })
    const sparkBlur = el('feGaussianBlur', { stdDeviation: '2', result: 'coloredBlur' })
    const sparkMerge = el('feMerge')
    sparkMerge.appendChild(el('feMergeNode', { in: 'coloredBlur' }))
    sparkMerge.appendChild(el('feMergeNode', { in: 'SourceGraphic' }))
    sparkFilter.appendChild(sparkBlur)
    sparkFilter.appendChild(sparkMerge)
    defs.appendChild(sparkFilter)
    svgEl.appendChild(defs)

    // ── CSS keyframe animations ─────────────────
    const style = document.createElementNS(SVG_NS, 'style')
    style.textContent = `
    @keyframes floatSpark {
      0%   { transform: translateY(0) translateX(0); opacity: 0; }
      10%  { opacity: 1; }
      80%  { opacity: 0.8; }
      100% { transform: translateY(-1300px) translateX(var(--drift)); opacity: 0; }
    }
  `
    svgEl.appendChild(style)

    // ── Perforated metal background rect ────────
    // (Removed per user request to clean up the middle layer)

    // ── Vignette ────────────────────────────────
    const vignetteDef = el('radialGradient', { id: 'vignette', cx: '50%', cy: '50%', r: '50%' })
    const vs1 = el('stop', { offset: '0%', 'stop-color': 'rgba(2,6,23,0.3)' })
    const vs2 = el('stop', { offset: '100%', 'stop-color': 'rgba(0,0,0,0.95)' })
    vignetteDef.appendChild(vs1)
    vignetteDef.appendChild(vs2)
    defs.appendChild(vignetteDef)

    // ── Flash overlay (Overdrive / Glitch) ──────
    // This is a full-screen HTML div (NOT inside SVG) to correctly replicate
    // the radial-gradient + mix-blend-overlay effect from the spec.
    // It is inserted into the DOM in init() before the SVG.

    // ── Shake container (all animated content) ──
    shakeContainerEl = el('g', { id: 'gear-shake-container' })
    svgEl.appendChild(shakeContainerEl)

    // ── 1. TURBINE (deep background) ────────────
    turbineEl = el('g', {
        id: 'gear-turbine',
        opacity: '0.06',
        style: 'transition: opacity 1s;',
    })
    const turbineRing = el('circle', {
        cx: '0', cy: '0', r: '800',
        fill: 'none', stroke: '#ffffff', 'stroke-width': '20',
        style: 'transition: stroke 1s;',
    })
    turbineEl.appendChild(turbineRing)
    for (let i = 0; i < 12; i++) {
        const blade = el('path', {
            d: 'M -40 -100 L -120 -800 A 800 800 0 0 1 120 -800 L 40 -100 Z',
            fill: '#ffffff',
            transform: `rotate(${(i * 360) / 12})`,
            style: 'transition: fill 1s;',
        })
        turbineEl.appendChild(blade)
    }
    turbineEl.appendChild(el('circle', { cx: '0', cy: '0', r: '120', fill: '#ffffff', style: 'transition: fill 1s;' }))
    shakeContainerEl.appendChild(turbineEl)

    // ── 2. BACKGROUND PARALLAX GEARS ────────────
    bgGearsData.forEach(g => {
        const grp = el('g', { transform: `translate(${g.x}, ${g.y}) rotate(0)` })
        bgGearEls[g.id] = grp

        grp.appendChild(el('path', { d: g.path, fill: '#000000', 'fill-opacity': '0.4', stroke: '#0f172a', 'stroke-width': '3' }))
        grp.appendChild(el('circle', { cx: '0', cy: '0', r: String(g.R * 0.85), fill: 'none', stroke: '#0f172a', 'stroke-width': '2', opacity: '0.5' }))
        grp.appendChild(el('circle', { cx: '0', cy: '0', r: String(g.R * 0.5), fill: 'none', stroke: '#0f172a', 'stroke-width': '5', opacity: '0.5' }))
            ;[0, 30, 60, 90, 120, 150].forEach(a => {
                grp.appendChild(el('line', {
                    x1: String(-g.R * 0.85), y1: '0', x2: String(g.R * 0.85), y2: '0',
                    stroke: '#0f172a', 'stroke-width': '4', transform: `rotate(${a})`, opacity: '0.5',
                }))
            })
        shakeContainerEl.appendChild(grp)
    })

    // ── 3. ENERGY CONDUIT PIPES ──────────────────
    const conduitsEl = el('g', { id: 'gear-conduits' })
    computedGears.filter(g => g.parent !== null).forEach(g => {
        const parent = computedGears.find(p => p.id === g.parent)
        const grp = el('g', { id: `conduit-${g.id}` })

        // Outer pipe
        grp.appendChild(el('line', {
            x1: String(parent.x), y1: String(parent.y), x2: String(g.x), y2: String(g.y),
            stroke: '#020617', 'stroke-width': '22', 'stroke-linecap': 'round',
        }))
        // Metallic casing
        grp.appendChild(el('line', {
            x1: String(parent.x), y1: String(parent.y), x2: String(g.x), y2: String(g.y),
            stroke: '#0f172a', 'stroke-width': '14', 'stroke-linecap': 'round',
        }))
        // Energy core (colored when active)
        const coreLine = el('line', {
            x1: String(parent.x), y1: String(parent.y), x2: String(g.x), y2: String(g.y),
            stroke: '#1e293b', 'stroke-width': '4', 'stroke-linecap': 'round',
            style: 'transition: stroke 0.5s ease-in-out, stroke-width 0.5s ease-in-out;',
            id: `conduit-core-${g.id}`,
        })
        grp.appendChild(coreLine)
        conduitsEl.appendChild(grp)
    })
    shakeContainerEl.appendChild(conduitsEl)

    // ── 4. FRONT INTERACTIVE GEARS ──────────────
    const frontGearsEl = el('g', { id: 'gear-front' })
    computedGears.forEach(g => {
        const m = 10
        const grp = el('g', {
            id: `front-gear-${g.id}`,
            transform: `translate(${g.x}, ${g.y}) rotate(${g.initialRotation})`,
        })
        frontGearEls[g.id] = grp

        // Active glow overlay (hidden by default)
        const glowPath = el('path', {
            d: g.path, fill: 'none',
            stroke: g.color, 'stroke-width': '4',
            filter: `url(#glow-${g.id})`,
            opacity: '0',
            id: `gear-glow-${g.id}`,
            style: 'transition: opacity 0.3s;',
        })
        grp.appendChild(glowPath)

        // Main tooth body
        const mainPath = el('path', {
            d: g.path,
            fill: '#0f172a', 'fill-opacity': '1',
            stroke: '#334155', 'stroke-width': '1.5',
            id: `gear-body-${g.id}`,
            style: 'transition: fill 0.3s, stroke 0.3s;',
        })
        grp.appendChild(mainPath)

        // Inner details
        if (g.N >= 16) {
            grp.appendChild(el('circle', {
                cx: '0', cy: '0', r: String(g.R * 0.7),
                fill: 'none', stroke: '#334155', 'stroke-width': String(m * 0.4),
                id: `gear-ring-${g.id}`,
                style: 'transition: stroke 0.3s;',
            }))
                ;[0, 60, 120].forEach((a, ai) => {
                    grp.appendChild(el('line', {
                        x1: String(-g.R * 0.7), y1: '0', x2: String(g.R * 0.7), y2: '0',
                        stroke: '#334155', 'stroke-width': String(m * 0.5),
                        transform: `rotate(${a})`,
                        id: `gear-spoke-${g.id}-${ai}`,
                        style: 'transition: stroke 0.3s;',
                    }))
                })
            grp.appendChild(el('circle', {
                cx: '0', cy: '0', r: String(g.R * 0.4),
                fill: 'none', stroke: '#334155', 'stroke-width': '1',
                id: `gear-inner-ring-${g.id}`,
                style: 'transition: stroke 0.3s;',
            }))
        } else {
            grp.appendChild(el('circle', {
                cx: '0', cy: '0', r: String(g.R * 0.5),
                fill: 'none', stroke: '#334155', 'stroke-width': '1',
                id: `gear-small-ring-${g.id}`,
                style: 'transition: stroke 0.3s;',
            }))
        }

        // Hub (center bolt)
        grp.appendChild(el('circle', {
            cx: '0', cy: '0', r: String(m * 1.2),
            fill: '#1e293b', stroke: '#334155', 'stroke-width': '1.5',
            id: `gear-hub-${g.id}`,
            style: 'transition: fill 0.3s, stroke 0.3s;',
            filter: '',
        }))
        grp.appendChild(el('circle', { cx: '0', cy: '0', r: String(m * 0.5), fill: '#020617' }))

        frontGearsEl.appendChild(grp)
    })
    shakeContainerEl.appendChild(frontGearsEl)

    // ── 5. FORGE SPARKS ──────────────────────────
    const sparksEl = el('g', { id: 'gear-sparks' })
    sparks.forEach(s => {
        const sparkCircle = el('circle', {
            cx: String(s.cx), cy: String(s.cy), r: String(s.r),
            fill: '#fbbf24',
            filter: 'url(#glow-spark)',
            id: `spark-${s.id}`,
            style: [
                `animation: floatSpark ${s.duration}s linear ${s.delay}s infinite`,
                '--drift: ' + s.xDrift + 'px',
                'transition: fill 1s;',
            ].join(';'),
        })
        sparkEls.push(sparkCircle)
        sparksEl.appendChild(sparkCircle)
    })
    shakeContainerEl.appendChild(sparksEl)

    // ── Vignette overlay ─────────────────────────
    // (Removed per user request to clean up the middle layer dark overlay)
}

// ============================================
// APPLY OVERDRIVE / GLITCH VISUAL STATE
// ============================================
function applyVisualState(activeGears) {
    if (!turbineEl) return

    const isOverdrive = _isOverdrive
    const isGlitching = _isGlitching
    const showFlash = _showFlash

    // Turbine opacity & color
    if (isOverdrive) {
        turbineEl.setAttribute('opacity', '0.4')
        turbineEl.style.transition = 'opacity 0.075s'
        turbineEl.querySelectorAll('circle, path').forEach(e => {
            e.setAttribute('stroke', '#06b6d4')
            e.setAttribute('fill', '#06b6d4')
        })
    } else if (isGlitching) {
        turbineEl.setAttribute('opacity', '0.25')
        turbineEl.style.transition = 'opacity 0.075s'
        turbineEl.querySelectorAll('circle, path').forEach(e => {
            e.setAttribute('stroke', '#22d3ee')
            e.setAttribute('fill', '#22d3ee')
        })
    } else {
        turbineEl.setAttribute('opacity', '0.06')
        turbineEl.style.transition = 'opacity 1s'
        turbineEl.querySelectorAll('circle, path').forEach(e => {
            e.setAttribute('stroke', '#ffffff')
            e.setAttribute('fill', '#ffffff')
        })
    }

    // Flash overlay (radial cyan glow) — HTML div with mix-blend-overlay
    // Skip if unlock flash is active (let it control the flash)
    if (_unlockFlashActive) {
        // Unlock flash is in control - don't touch flashOverlayEl
    } else if (showFlash || isGlitching) {
        flashOverlayEl.style.opacity = showFlash ? '1' : '0.5'
        flashOverlayEl.style.transition = isGlitching ? 'opacity 0.075s' : 'opacity 0.7s ease-out'
        // Overdrive flash: brighter solid cyan radial burst
        if (showFlash) {
            flashOverlayEl.style.background = 'radial-gradient(ellipse at center, #22d3ee 0%, rgba(34,211,238,0.6) 50%, transparent 80%)'
        } else {
            flashOverlayEl.style.background = 'radial-gradient(ellipse at center, #22d3ee 0%, rgba(34,211,238,0.4) 40%, transparent 75%)'
        }
    } else {
        flashOverlayEl.style.opacity = '0'
        flashOverlayEl.style.transition = 'opacity 0.7s ease-out'
    }

    // Screen shake CSS animation (powerSurge triggers on showFlash in React spec)
    // Skip if unlock shake is active (let it control the animation)
    if (_unlockShakeActive) {
        // Unlock shake is in control - don't touch shakeContainerEl
    } else if (showFlash) {
        shakeContainerEl.style.animation = 'gearPowerSurge 0.5s ease-in-out infinite'
    } else if (isGlitching) {
        shakeContainerEl.style.animation = 'gearGlitchShake 0.2s ease-in-out infinite'
    } else {
        shakeContainerEl.style.animation = ''
    }

    // Sparks: overdrive → cyan, fast; glitch → blue, moderate; normal → amber, normal
    sparkEls.forEach((sparkEl, i) => {
        const s = sparks[i]
        const sparkColor = isOverdrive ? '#22d3ee' : (isGlitching ? '#38bdf8' : '#fbbf24')
        const dur = isOverdrive ? s.duration * 0.35 : (isGlitching ? s.duration * 0.7 : s.duration)
        const drift = isOverdrive ? s.xDrift * 3 : s.xDrift
        sparkEl.setAttribute('fill', sparkColor)
        sparkEl.style.animation = `floatSpark ${dur}s linear ${s.delay}s infinite`
        sparkEl.style.setProperty('--drift', `${drift}px`)
    })

    // Gear body colours & conduit cores
    if (!computedGears) return
    computedGears.forEach(g => {
        const isActive = activeGears.has(g.id)

        // Glow overlay
        const glowEl = document.getElementById(`gear-glow-${g.id}`)
        if (glowEl) glowEl.setAttribute('opacity', isActive ? '0.4' : '0')

        // Body
        const bodyEl = document.getElementById(`gear-body-${g.id}`)
        if (bodyEl) {
            bodyEl.setAttribute('fill', isActive ? g.color : '#0f172a')
            bodyEl.setAttribute('fill-opacity', isActive ? '0.15' : '1')
            bodyEl.setAttribute('stroke', isActive ? g.color : '#334155')
        }

        // Ring / spokes
        ;['ring', 'spoke', 'inner-ring', 'small-ring'].forEach(part => {
            const rEl = document.getElementById(`gear-${part}-${g.id}`)
            if (rEl) rEl.setAttribute('stroke', isActive ? g.color : '#334155')
                // spokes have 3
                ;[0, 1, 2].forEach(ai => {
                    const sEl = document.getElementById(`gear-spoke-${g.id}-${ai}`)
                    if (sEl) sEl.setAttribute('stroke', isActive ? g.color : '#334155')
                })
        })

        // Hub
        const hubEl = document.getElementById(`gear-hub-${g.id}`)
        if (hubEl) {
            hubEl.setAttribute('fill', isActive ? g.color : '#1e293b')
            hubEl.setAttribute('stroke', isActive ? '#ffffff' : '#334155')
            hubEl.setAttribute('filter', isActive ? `url(#glow-${g.id})` : '')
        }

        // Conduit core
        const coreEl = document.getElementById(`conduit-core-${g.id}`)
        if (coreEl) {
            coreEl.setAttribute('stroke', isActive ? g.color : '#1e293b')
            coreEl.setAttribute('stroke-width', isActive ? '6' : '4')
            coreEl.setAttribute('filter', isActive ? `url(#glow-${g.id})` : '')
        }
    })
}

// ============================================
// PUBLIC API
// ============================================
export const GearBackground = {
    init() {
        // Build the SVG DOM
        buildSVGDOM()

        // Inject CSS keyframes for shake/surge into the document
        if (!document.getElementById('gear-bg-keyframes')) {
            const style = document.createElement('style')
            style.id = 'gear-bg-keyframes'
            style.textContent = `
        @keyframes gearPowerSurge {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-4px, 4px); }
          20%, 40%, 60%, 80% { transform: translate(4px, -4px); }
        }
        @keyframes gearGlitchShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, -2px); }
          75% { transform: translate(-2px, -2px); }
        }
        @keyframes gearUnlockShake {
          0%   { transform: translate(0, 0) rotate(0deg); }
          8%   { transform: translate(-8px, -6px) rotate(-0.8deg); }
          16%  { transform: translate(9px, 5px) rotate(0.6deg); }
          24%  { transform: translate(-7px, 7px) rotate(-0.5deg); }
          32%  { transform: translate(8px, -8px) rotate(0.9deg); }
          40%  { transform: translate(-6px, 4px) rotate(-0.4deg); }
          50%  { transform: translate(5px, -5px) rotate(0.5deg); }
          60%  { transform: translate(-4px, 3px) rotate(-0.3deg); }
          75%  { transform: translate(3px, -2px) rotate(0.2deg); }
          90%  { transform: translate(-1px, 1px) rotate(-0.1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `
            document.head.appendChild(style)
        }

        // Create the full-screen flash overlay div (matches spec exactly)
        flashOverlayEl = document.createElement('div')
        flashOverlayEl.id = 'gear-flash-overlay'
        flashOverlayEl.style.cssText = [
            'position:absolute',
            'inset:0',
            'pointer-events:none',
            'z-index:50',
            'mix-blend-mode:overlay',
            'opacity:0',
            'transition:opacity 0.7s ease-out',
            // Radial gradient: bright cyan center fading out — matches the spec div with bg-cyan-400
            'background:radial-gradient(ellipse at center, #22d3ee 0%, rgba(34,211,238,0.4) 40%, transparent 75%)',
        ].join(';')

        // Insert SVG + flash overlay into game-container (SVG first so overlay is above it)
        const container = document.getElementById('game-container')
        if (container) {
            container.insertBefore(svgEl, container.firstChild)
            container.insertBefore(flashOverlayEl, svgEl.nextSibling)
        } else {
            document.body.insertBefore(svgEl, document.body.firstChild)
            document.body.insertBefore(flashOverlayEl, svgEl.nextSibling)
        }
    },

    /**
     * Called every game loop frame.
     * @param {Set<number>} activeGears - set of activated gear IDs
     */
    update(activeGears) {
        if (!svgEl) return

        const size = activeGears.size;
        const total = computedGears ? computedGears.length : 11;

        // 1. Time delta computing
        const now = performance.now();
        if (_lastTime === 0) _lastTime = now;
        const dt = now - _lastTime;
        _lastTime = now;
        const safeDt = Math.min(dt, 50);

        // 2. Trigger Events (Overdrive & Glitches)
        if (size !== _prevActiveSize) {
            const isOverdriveNow = size >= total && total > 0;

            if (isOverdriveNow && (!_isOverdrive || size !== _prevActiveSize)) {
                _showFlash = true;
                clearTimeout(_flashTimer);
                _flashTimer = setTimeout(() => { _showFlash = false; applyVisualState(activeGears); }, 800);
            }

            clearInterval(_glitchInterval);
            clearTimeout(_glitchTimer);
            _isGlitching = false;

            if (!isOverdriveNow && size >= 5) {
                _isGlitching = true;
                _glitchTimer = setTimeout(() => { _isGlitching = false; applyVisualState(activeGears); }, 150);

                _glitchInterval = setInterval(() => {
                    if (Math.random() > 0.6) {
                        _isGlitching = true;
                        applyVisualState(activeGears);
                        clearTimeout(_glitchTimer);
                        _glitchTimer = setTimeout(() => { _isGlitching = false; applyVisualState(activeGears); }, 150);
                    }
                }, 6500);
            }

            _isOverdrive = isOverdriveNow;
            _prevActiveSize = size;
            applyVisualState(activeGears);
        }

        // 3. Speed calculation
        if (_isOverdrive) {
            _internalSpeed = 8;
        } else if (_isGlitching) {
            _internalSpeed = ((size / total) * 2.5) + 3;
        } else {
            _internalSpeed = (size / total) * 2.5;
        }

        // Apply gear unlock speed boost (additive, decays naturally)
        if (_gearUnlockSpeedBoost > 0) {
            _internalSpeed += _gearUnlockSpeedBoost
            _gearUnlockSpeedBoost *= 0.93  // exponential decay — fades over ~40 frames (≈660ms @60fps)
            if (_gearUnlockSpeedBoost < 0.1) _gearUnlockSpeedBoost = 0
        }

        angleRef += _internalSpeed * (safeDt / 16.66);

        // 4. Turbine (very slow)
        if (turbineEl) {
            turbineEl.setAttribute('transform', `rotate(${angleRef * 0.02})`)
        }

        // 2. Parallax background gears
        bgGearsData.forEach(g => {
            const gEl = bgGearEls[g.id]
            if (gEl) {
                gEl.setAttribute('transform', `translate(${g.x}, ${g.y}) rotate(${g.dir * (angleRef * 0.08)})`)
            }
        })

        // 7. Front active gears (all interlocked gears rotate synchronously)
        computedGears.forEach(g => {
            const gEl = frontGearEls[g.id]
            if (gEl) {
                const rot = g.initialRotation + g.dir * (angleRef / g.N * 20)
                gEl.setAttribute('transform', `translate(${g.x}, ${g.y}) rotate(${rot})`)
            }
        })
    },
}

// ============================================
// GEAR UNLOCK VISUAL EFFECTS
// ============================================

/**
 * Triggers the dramatic gear unlock sequence:
 * - Bright flash-bang (white/cyan overlay)
 * - Heavy screen shake
 * - Spark rev-up (cyan burst)
 * - Gear speed boost
 */
export function triggerGearUnlockSequence() {
    // 1. FLASH — bright white-cyan radial burst spike, then fade
    _unlockFlashActive = true
    // Pure white radial burst at peak
    flashOverlayEl.style.background = 'radial-gradient(ellipse at center, #ffffff 0%, rgba(34,211,238,0.8) 40%, transparent 75%)'
    flashOverlayEl.style.transition = 'opacity 0.08s ease-in'
    flashOverlayEl.style.opacity = '0.85'                   // very bright blast
    setTimeout(() => {
        // Fade back to normal cyan radial glow, then disappear
        flashOverlayEl.style.background = 'radial-gradient(ellipse at center, #22d3ee 0%, rgba(34,211,238,0.4) 40%, transparent 75%)'
        flashOverlayEl.style.transition = 'opacity 1.2s ease-out'
        flashOverlayEl.style.opacity = '0'
        // release after fade-out is mostly done
        setTimeout(() => {
            _unlockFlashActive = false
        }, 1200)
    }, 150)                                                  // hold peak for 150ms

    // 2. SHAKE — violent, one-shot, 600ms
    _unlockShakeActive = true
    shakeContainerEl.style.animation = 'gearUnlockShake 0.6s ease-out forwards'
    setTimeout(() => {
        shakeContainerEl.style.animation = ''
        _unlockShakeActive = false
        // Let applyVisualState re-evaluate the animation from current state
    }, 650)

    // 3. SPARK REV-UP — cyan burst color + faster animation for 1000ms
    sparkEls.forEach((sparkEl, i) => {
        const s = sparks[i]
        sparkEl.setAttribute('fill', '#00ffff')
        sparkEl.style.animation = `floatSpark ${s.duration * 0.2}s linear ${s.delay}s infinite`
    })
    setTimeout(() => {
        // Restore to whatever applyVisualState would normally set
        // Leave it for the next applyVisualState call (called by update())
    }, 1000)

    // 4. SPEED BOOST — additive, decays in update() loop naturally
    _gearUnlockSpeedBoost = 35   // peak additive boost on top of whatever base speed is
}

export default GearBackground
