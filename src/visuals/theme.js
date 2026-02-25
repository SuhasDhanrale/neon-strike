// Volcanic Print Visual Theme
// Bold Graphic Novel meets Volcanic Risograph Print

// Import Bebas Neue font - handled in styles.css

export const THEME = {
  // ============================================
  // FOUNDATIONS — Volcanic Print Palette
  // ============================================
  
  // Core backgrounds
  inkBlack: '#1a1410',    // Near-black with warm brown undertone
  charcoal: '#2d2520',    // Background panels, UI containers
  ash: '#4a4040',        // Secondary surfaces, inactive states
  smoke: '#6b5e58',      // Borders, subtle separators
  
  // Text colors
  parchment: '#e8ddd0',  // Primary text, orb values
  cream: '#f5ede0',      // Highlight text, important labels
  
  // ============================================
  // VOLCANIC ACCENTS — Earned colors
  // ============================================
  
  ember: '#e85d20',       // Primary danger accent — heat, alerts
  lava: '#c93010',        // Critical state, max heat
  magma: '#ff7a35',       // Mid-range heat, warm highlights
  cinder: '#8c3a10',     // Deep shadow on hot elements
  coal: '#3d2010',        // Darkest warm tone — chamber fill
  
  // ============================================
  // COOL CONTRAST (sparingly)
  // ============================================
  
  slate: '#5a7a8a',       // Value-2 orb, coolest element
  glacier: '#7a9eb0',    // Frost orbs in chamber
  bone: '#c8b8a8',        // Geode coloring
  
  // ============================================
  // ORB VISUAL MAP — Index matches orb value tier
  // ============================================
  
  orbs: [
    // idx 0 — value 2
    { fill: '#5a7a8a', shadow: '#2d3d45', outline: '#1a1410', label: '#e8ddd0' },
    // idx 1 — value 4
    { fill: '#6b8a70', shadow: '#354538', outline: '#1a1410', label: '#e8ddd0' },
    // idx 2 — value 8
    { fill: '#8a7a50', shadow: '#453d28', outline: '#1a1410', label: '#e8ddd0' },
    // idx 3 — value 16
    { fill: '#9a6a38', shadow: '#4d3520', outline: '#1a1410', label: '#f5ede0' },
    // idx 4 — value 32
    { fill: '#b85530', shadow: '#5c2a18', outline: '#1a1410', label: '#f5ede0' },
    // idx 5 — value 64
    { fill: '#c94020', shadow: '#641e10', outline: '#1a1410', label: '#f5ede0' },
    // idx 6 — value 128
    { fill: '#e85d20', shadow: '#741e08', outline: '#1a1410', label: '#f5ede0' },
    // idx 7 — value 256
    { fill: '#e83a10', shadow: '#740808', outline: '#1a1410', label: '#f5ede0' },
    // idx 8 — value 512
    { fill: '#d42808', shadow: '#6a0404', outline: '#1a1410', label: '#f5ede0' },
    // idx 9 — value 1024
    { fill: '#c01808', shadow: '#600404', outline: '#1a1410', label: '#f5ede0' },
    // idx 10 — value 2048 — INVERTED. Crown tier.
    { fill: '#e8ddd0', shadow: '#8c3a10', outline: '#e85d20', label: '#1a1410' },
  ],
  
  // Special orb states
  frosted: {
    fill: '#7a9eb0',
    outline: '#4a6070',
    shadow: '#3d5060',
    specularSize: 0.25,
    specularAlpha: 0.75
  },
  
  geode: {
    fill: '#c8b8a8',
    outline: '#4a4040',
    shadow: '#2d2520'
  },
  
  pierce: {
    outline: '#e85d20',
    dashPattern: [6, 4]
  },
  
  // ============================================
  // CHAMBER CONFIG
  // ============================================
  
  chamber: {
    lineWidth: 5,
    shadowWidth: 7,
    dashPattern: [18, 8],
    labelFont: 'bold 11px "Bebas Neue", "Rajdhani", monospace',
    halftoneSpacing: 12,
    halftoneDotR: 2.5
  },
  
  // ============================================
  // PARTICLE CONFIG
  // ============================================
  
  particles: {
    count: 12,
    speedMin: 3,
    speedMax: 9,
    decayMin: 0.035,
    decayMax: 0.065,
    lengthMin: 6,
    lengthMax: 20,
    lineWidth: 2.5
  },
  
  // ============================================
  // SHOOTER CONFIG
  // ============================================
  
  shooter: {
    radius: 12,
    ringColor: '#4a4040',
    ringWidth: 3,
    aimLineColor: 'rgba(232, 221, 208, 0.5)',
    aimLineDash: [10, 10],
    aimLineWidth: 3,
    aimDotColor: '#e8ddd0',
    aimDotRadius: 6,
    outlineWidth: 4
  },
  
  // ============================================
  // DEATH LINE
  // ============================================
  
  deathLine: {
    color: 'rgba(232, 53, 32, 0.3)',
    dash: [10, 10],
    width: 2
  },
  
  // ============================================
  // FLOATING TEXT COLOR MAP
  // ============================================
  
  floatingTextColors: {
    score: '#e8ddd0',       // +{score}
    combo: '#ff7a35',       // ×{combo} - bright magma orange
    shake: '#e8ddd0',       // SHAKE!
    smash: '#e8ddd0',      // SMASH!
    void: '#c8b8a8',       // VOID -{n}
    eruption: '#e85d20',   // ERUPTION!
    cracked: '#f5ede0',    // CRACKED! - bright cream
    needEnergy: '#c93010', // NEED ENERGY!
    heat: '#c93010',       // +30 HEAT
    piercing: '#ff7a35'    // PIERCING ROUND! - bright magma
  },
  
  // ============================================
  // VFX CONFIG
  // ============================================
  
  vfx: {
    // All blur effects disabled for volcanic print aesthetic
    shadowBlur: 0,
    // Halftone and texture-based depth instead
    bgGrid: false,
    orbTrails: false,
    mergeFlashBurst: true,
    chamberLavaGlow: true
  }
}

// Export ORB_VISUALS for easy access
export const ORB_VISUALS = THEME.orbs

// Helper to get orb visual by typeIndex
export function getOrbVisual(typeIndex) {
  return THEME.orbs[Math.min(typeIndex, THEME.orbs.length - 1)]
}

// Helper to get orb polygon shape by typeIndex
// Returns number of sides: 0 = circle, 5 = pentagon, 6 = hexagon, etc.
export function getOrbShape(typeIndex) {
  if (typeIndex === 0) return 0     // value 2: circle
  if (typeIndex <= 2) return 5    // values 4, 8: pentagon
  if (typeIndex <= 4) return 6    // values 16, 32: hexagon
  if (typeIndex <= 6) return 8    // values 64, 128: octagon
  if (typeIndex <= 8) return 10   // values 256, 512: decagon
  return 12                        // values 1024, 2048: dodecagon
}

// Color interpolation helper
export function lerpColor(hex1, hex2, t) {
  const parse = h => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16)
  ]
  const [r1, g1, b1] = parse(hex1)
  const [r2, g2, b2] = parse(hex2)
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`
}
