import { EventBus } from '../eventBus.js'
import { triggerEmbersBurst } from '../visuals/particleSystem.js'
import { SoundManager } from '../systems/SoundManager.js'

const LORE_SCENARIOS = [
    { header: "SYSTEM IDLE", subtext: "The world engine lies dormant. Await energy input." },
    { header: "STARTUP SUCCESS", subtext: "The old machine shudders to life. Keep feeding it. We must align all primary gears to experience the glory of the engine." },
    { header: "PRESSURE STABILIZING", subtext: "Deep architecture answers. Geothermal output increasing." },
    { header: "KINETIC SEAL BROKEN", subtext: "Another century of rust falls away. Do not halt." },
    { header: "RESONANCE ACHIEVED", subtext: "The deeper strata are aligning perfectly." },
    { header: "STRATA PIERCED", subtext: "Halfway there. The surrounding bedrock hums with forgotten frequency." },
    { header: "COOLANT VENTS ONLINE", subtext: "Primary thermal regulation is functional. We are waking ghosts." },
    { header: "HEAVY MACHINERY ENGAGED", subtext: "The core is drawing massive output. You are rebuilding an empire of iron." },
    { header: "HARMONIZERS LOCKED", subtext: "The pressure is nearing optimal thresholds. Only a few mechanisms remain." },
    { header: "CONTAINMENT UNSEALED", subtext: "Final containment seals disengaging. Prepare for massive energy flux." },
    { header: "WORLD ENGINE RESTORED", subtext: "All gears are turning. The world breathes again." }
]

const GAMEPLAY_OVERRIDE = {
    energy_full: { header: "ENERGY MAXED", subtext: "Capacity reached. Supply energy to the background mechanisms immediately.", type: "energy" },
    energy_draining: { header: "ENERGY DRAINING", subtext: "Background mechanisms consuming power. Keep supply active.", type: "energy" }
}

export const SystemBot = {
    queue: [],
    isProcessing: false,
    lastGameplayEventTime: { energy: 0 },

    init() {
        EventBus.on('celebration:gear_unlocked', this.handleGearUnlock.bind(this))

        EventBus.on('state:energy_full', () => this.queueGameplayEvent('energy_full'))
        EventBus.on('state:energy_draining', () => this.queueGameplayEvent('energy_draining'))
    },

    setInitialGearState(gearCount) {
        // We do not queue a message on boot, just initialize silently.
    },

    queueGameplayEvent(eventType) {
        const now = Date.now();
        const msg = GAMEPLAY_OVERRIDE[eventType];

        // Cooldown to prevent spamming the queue if the player hovers around the threshold
        if (now - this.lastGameplayEventTime[msg.type] < 15000) {
            return;
        }

        this.lastGameplayEventTime[msg.type] = now;
        this.queue.push({ ...msg, isLore: false })
        this.processQueue()
    },

    handleGearUnlock({ gearIndex }) {
        const index = Math.min(gearIndex, 10)

        // Clear any pending queue and prioritize the lore
        this.queue = [];
        this.queue.push({ ...LORE_SCENARIOS[index], isLore: true })

        // Push the mechanical revival percentage
        this.queue.push({
            header: `GEAR ${String(index).padStart(2, '0')} SECURED`,
            subtext: `SYSTEM REVIVAL: ${index * 10}%`,
            isLore: true
        })

        // Trigger atmospheric massive particle burst
        triggerEmbersBurst(40)

        this.processQueue()
    },

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true

        const container = document.getElementById('system-bot')
        const headerEl = document.getElementById('bot-header')
        const subtextEl = document.getElementById('bot-subtext')

        if (!container || !headerEl || !subtextEl) {
            this.isProcessing = false;
            return;
        }

        while (this.queue.length > 0) {
            const msg = this.queue.shift()

            // 1. Reveal container
            container.classList.add('active')
            SoundManager.play('bot_message')

            // 2. Set and show header with glitch
            headerEl.textContent = msg.header
            headerEl.classList.add('visible', 'bot-glitch-anim')

            // Wait 2.2 seconds
            await this.sleep(2200)

            // 3. Hide header
            headerEl.classList.remove('visible', 'bot-glitch-anim')
            await this.sleep(400) // waiting for fade

            // 4. Set and show subtext
            subtextEl.textContent = msg.subtext
            subtextEl.classList.add('visible')

            // Wait 3.5 seconds
            await this.sleep(3500)

            // 5. Hide subtext
            subtextEl.classList.remove('visible')
            await this.sleep(400) // waiting for fade

            // Short pause before next message completely
            await this.sleep(500)
        }

        // Hide container when queue is empty
        container.classList.remove('active')
        this.isProcessing = false
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
