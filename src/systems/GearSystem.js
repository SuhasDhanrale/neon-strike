// GearSystem.js
// Bridge between the game and the Gear Background.
// Handles: gear activation, energy gating, localStorage persistence,
// speed/overdrive/glitch state calculation, Supply Energy button wiring.

import { State } from '../state.js'
import { GEAR_SYSTEM } from '../config.js'

// ============================================
// MODULE STATE
// ============================================
let supplyBtn = null
let isDraining = false
let drainSpeed = 0 // Energy units per frame to drain

// ============================================
// HELPERS
// ============================================
function getNextGearIndex() {
    return State.activeGears.size // 0-10, null when all 11 active
}

function getEnergyTarget(index) {
    if (index >= GEAR_SYSTEM.GEAR_COSTS.length) return null
    return GEAR_SYSTEM.GEAR_COSTS[index]
}

function persist() {
    localStorage.setItem(GEAR_SYSTEM.STORAGE_KEY, JSON.stringify([...State.activeGears]))
}

function load() {
    try {
        const raw = localStorage.getItem(GEAR_SYSTEM.STORAGE_KEY)
        if (!raw) return new Set()
        return new Set(JSON.parse(raw))
    } catch {
        return new Set()
    }
}

function updateMaxEnergy() {
    const nextIndex = getNextGearIndex()
    const cost = getEnergyTarget(nextIndex)
    if (cost !== null) {
        State.gearEnergyTarget = cost
        State.maxEnergy = cost
    }
}

function updateSupplyButton() {
    if (!supplyBtn) return
    const nextIndex = getNextGearIndex()
    const allActive = nextIndex >= 11

    if (allActive) {
        // All gears running — hide button
        supplyBtn.classList.add('gear-supply-hidden')
        supplyBtn.disabled = true
        return
    }

    supplyBtn.classList.remove('gear-supply-hidden')

    const isFull = State.currentEnergy >= State.gearEnergyTarget
    if (isFull) {
        supplyBtn.disabled = false
        supplyBtn.classList.add('gear-supply-active')
        supplyBtn.classList.remove('gear-supply-inactive')
    } else {
        supplyBtn.disabled = true
        supplyBtn.classList.remove('gear-supply-active')
        supplyBtn.classList.add('gear-supply-inactive')
    }
}

function tryActivateGear() {
    const nextIndex = getNextGearIndex()
    if (nextIndex >= 11) return
    if (State.currentEnergy < State.gearEnergyTarget) return
    if (isDraining) return // Prevent double-click during drain

    // Start drain animation
    isDraining = true
    drainSpeed = Math.max(2, State.currentEnergy / 30) // Drain over ~30 frames minimum

    // Activate the gear immediately (visual feedback)
    State.activeGears.add(nextIndex)
    persist()
}

function updateDrain() {
    if (!isDraining) return

    // Drain energy
    State.currentEnergy -= drainSpeed

    if (State.currentEnergy <= 0) {
        // Drain complete
        State.currentEnergy = 0
        isDraining = false
        updateMaxEnergy()
    }
}

// ============================================
// PUBLIC API
// ============================================
export const GearSystem = {
    init() {
        // Load persisted active gears
        State.activeGears = load()

        // Set energy target to next gear's cost
        updateMaxEnergy()

        // Wire the Supply Energy button
        supplyBtn = document.getElementById('supply-energy-btn')
        if (supplyBtn) {
            supplyBtn.addEventListener('click', () => {
                tryActivateGear()
                updateSupplyButton()
            })
        }
    },

    // Called every frame from uiRenderer to refresh button state
    tickUI() {
        updateDrain()
        updateSupplyButton()
    },



    getActiveGears() {
        return State.activeGears
    },

    isDrainingEnergy() {
        return isDraining
    },
}

export default GearSystem
