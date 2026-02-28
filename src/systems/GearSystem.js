// GearSystem.js
// Bridge between the game and the Gear Background.
// Handles: gear activation, energy gating, localStorage persistence,
// speed/overdrive/glitch state calculation, Supply Energy button wiring.

import { State } from '../state.js'
import { GEAR_SYSTEM } from '../config.js'
import { EventBus } from '../eventBus.js'
import { triggerGearUnlockSequence } from '../visuals/Background/GearBackground.js'
import * as ParticleSystem from '../visuals/particleSystem.js'
import { SoundManager } from './SoundManager.js'

// ============================================
// MODULE STATE
// ============================================
let supplyBtn = null
let isDraining = false
let drainSpeed = 0 // Energy units per frame to drain
let lastButtonState = null // track state to prevent console spam
let hasWarnedMissingGearUnlockExplosion = false

function triggerGearUnlockExplosionSafe() {
    const triggerFn =
        ParticleSystem.triggerGearUnlockExplosion
        || ParticleSystem.default?.triggerGearUnlockExplosion

    if (typeof triggerFn === 'function') {
        triggerFn()
        return
    }

    if (!hasWarnedMissingGearUnlockExplosion) {
        console.warn('[GearSystem] triggerGearUnlockExplosion is missing from particleSystem.js')
        hasWarnedMissingGearUnlockExplosion = true
    }
}

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
        if (lastButtonState !== 'hidden') {
            console.log(`[GearSystem] All gears active. Hiding supply button.`);
            lastButtonState = 'hidden'
        }
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
        if (lastButtonState !== 'active') {
            console.log('[GearSystem] Supply Energy button is now ACTIVE');
            lastButtonState = 'active'
            EventBus.emit('state:energy_full')
        }
    } else {
        supplyBtn.disabled = true
        supplyBtn.classList.remove('gear-supply-active')
        supplyBtn.classList.add('gear-supply-inactive')
        if (lastButtonState !== 'inactive') {
            console.log('[GearSystem] Supply Energy button is now INACTIVE');
            lastButtonState = 'inactive'
            EventBus.emit('state:energy_draining')
        }
    }
}

function tryActivateGear() {
    const nextIndex = getNextGearIndex()
    console.log(`[GearSystem] Attempting to activate gear. Next index: ${nextIndex}, Current Energy: ${State.currentEnergy}, Target: ${State.gearEnergyTarget}`);

    if (nextIndex >= 11) {
        console.log(`[GearSystem] Activation failed: Max gears reached.`);
        return
    }
    if (State.currentEnergy < State.gearEnergyTarget) {
        console.log(`[GearSystem] Activation failed: Not enough energy.`);
        return
    }
    if (isDraining) {
        console.log(`[GearSystem] Activation failed: Already draining.`);
        return // Prevent double-click during drain
    }

    console.log(`[GearSystem] Energy check passed. Starting energy drain animation for gear ${nextIndex}.`);
    // Start drain animation
    isDraining = true
    drainSpeed = Math.max(2, State.currentEnergy / 30) // Drain over ~30 frames minimum

    // Activate the gear immediately (visual feedback)
    State.activeGears.add(nextIndex)
    persist()

    // Emit gear unlock event for ALL gears including gear 0
    EventBus.emit('celebration:gear_unlocked', { gearIndex: nextIndex })
    SoundManager.play('gear_unlock')
}

function updateDrain() {
    if (!isDraining) return

    // Drain energy
    State.currentEnergy -= drainSpeed
    localStorage.setItem('neonStrike_currentEnergy', State.currentEnergy.toString())

    if (State.currentEnergy <= 0) {
        // Drain complete
        State.currentEnergy = 0
        localStorage.setItem('neonStrike_currentEnergy', '0')
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
                SoundManager.play('lever_pull')
                tryActivateGear()
                updateSupplyButton()
            })
        }

        // Ensure starting state is visually correct on load/refresh
        console.log(`[GearSystem] Initialized. Active Gears: ${State.activeGears.size}, Energy Target: ${State.gearEnergyTarget}, Current Energy: ${State.currentEnergy}`);
        updateSupplyButton()

        // --- HTML DOM FROSTED GLASS LOGIC ---
        const backdrop = document.getElementById('glass-backdrop')

        // Wait for the SVG to be appended (it's done in GearBackground.init synchronously before GearSystem.init)
        const bgSvg = document.getElementById('gear-background-svg')

        if (backdrop && bgSvg) {
            const REVEAL_DURATION_MS = 3500; // <-- Change this to adjust how long the gears stay revealed (e.g., 5000 for 5s)

            // ALWAYS start frosted, regardless of whether gears are unlocked or not
            bgSvg.classList.add('global-blur-active')
            backdrop.classList.remove('glass-revealed')

            let frostTimeout;

            // Listen for future gear unlocks specifically
            EventBus.on('celebration:gear_unlocked', () => {
                // Reveal the gears
                backdrop.classList.add('glass-revealed')
                bgSvg.classList.remove('global-blur-active')

                // Wait for the duration, then frost back over
                clearTimeout(frostTimeout)

                frostTimeout = setTimeout(() => {
                    backdrop.classList.remove('glass-revealed')
                    bgSvg.classList.add('global-blur-active')
                }, REVEAL_DURATION_MS)
            })

            // Trigger dramatic visual effects for gear unlock
            EventBus.on('celebration:gear_unlocked', () => {
                triggerGearUnlockSequence()    // SVG: shake + flash + spark boost + gear rev-up
                triggerGearUnlockExplosionSafe()   // Canvas: 80-100 embers
            })

            // Energy state sounds (via EventBus)
            EventBus.on('state:energy_full', () => SoundManager.play('energy_full'))
            EventBus.on('state:energy_draining', () => SoundManager.play('energy_drain'))
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
