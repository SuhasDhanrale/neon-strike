// ============================================================
// SoundManager.js
// Steampunk / Volcanic Industrial Audio Engine
//
// Uses Web Audio API for fine-grained control:
//   - Pitch variation (playbackRate) per sound
//   - Rate limiting (cooldown per sound ID)
//   - Independent volume categories: master / music / sfx
//   - Mute support
//   - Music crossfade
//   - Mobile-safe AudioContext unlock on first interaction
//   - Graceful degradation — missing files are silently skipped
// ============================================================

import { SOUNDS } from '../config/soundConfig.js'
import { SYNTH_MAP } from './SoundGenerator.js'

// ─── Singleton State ──────────────────────────────────────────
let ctx = null             // AudioContext
let masterGain = null      // master volume node
let musicGain = null       // music volume node
let sfxGain = null         // sfx volume node

let buffers = {}           // { soundId: AudioBuffer }
let lastPlayed = {}        // { soundId: timestamp } for rate-limiting
let currentMusic = null    // { source: AudioBufferSourceNode, gainNode: GainNode }

let _muted = false
let _volumes = { master: 1.0, music: 1.0, sfx: 1.0 }
let _unlocked = false      // AudioContext unlocked by user gesture

// ─── Internal Helpers ─────────────────────────────────────────

function ensureContext() {
    if (ctx) return
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)()
        masterGain = ctx.createGain()
        musicGain = ctx.createGain()
        sfxGain = ctx.createGain()

        // Chain: sfxGain → masterGain → destination
        //        musicGain → masterGain → destination
        sfxGain.connect(masterGain)
        musicGain.connect(masterGain)
        masterGain.connect(ctx.destination)

        _applyAllVolumes()
    } catch (e) {
        console.warn('[SoundManager] Web Audio API not available:', e)
    }
}

function _applyAllVolumes() {
    if (!masterGain) return
    masterGain.gain.value = _muted ? 0 : _volumes.master
    musicGain.gain.value = _volumes.music
    sfxGain.gain.value = _volumes.sfx
}

async function _loadBuffer(soundId) {
    const def = SOUNDS[soundId]
    if (!def) return null
    if (buffers[soundId]) return buffers[soundId]

    // Try loading from file first
    try {
        const resp = await fetch(def.src)
        if (resp.ok) {
            const arrayBuf = await resp.arrayBuffer()
            const audioBuf = await ctx.decodeAudioData(arrayBuf)
            buffers[soundId] = audioBuf
            return audioBuf
        }
    } catch {
        // File missing or failed — fall through to synth
    }

    // Fallback: generate synthesized sound
    return _generateBuffer(soundId)
}

/** Generate a synthesized sound and cache it */
async function _generateBuffer(soundId) {
    if (buffers[soundId]) return buffers[soundId]

    const synthFn = SYNTH_MAP[soundId]
    if (!synthFn) return null

    try {
        const buf = await synthFn(ctx.sampleRate)
        buffers[soundId] = buf
        return buf
    } catch (e) {
        console.warn(`[SoundManager] Synth failed for ${soundId}:`, e)
        return null
    }
}

// ─── Public API ───────────────────────────────────────────────

export const SoundManager = {
    /**
     * Call once at game start (in main.js init).
     * AudioContext is created lazily on first user gesture,
     * but we pre-warm the unlock listener here.
     */
    init() {
        // Unlock AudioContext on first user interaction (mobile requirement)
        const unlock = () => {
            if (_unlocked) return
            _unlocked = true
            ensureContext()

            // Resume if suspended (typical on mobile)
            if (ctx && ctx.state === 'suspended') {
                ctx.resume()
            }

            // Pre-load all sounds in the background
            this._preloadAll()

            // Remove listeners after first gesture
            window.removeEventListener('mousedown', unlock)
            window.removeEventListener('touchstart', unlock)
            window.removeEventListener('keydown', unlock)
        }

        window.addEventListener('mousedown', unlock)
        window.addEventListener('touchstart', unlock)
        window.addEventListener('keydown', unlock)

        // Restore mute preference
        const saved = localStorage.getItem('neonStrike_muted')
        if (saved === 'true') {
            _muted = true
        }
    },

    /**
     * Pre-load all sound buffers so there's no delay on first play.
     * Called after AudioContext is unlocked.
     */
    async _preloadAll() {
        if (!ctx) return
        const ids = Object.keys(SOUNDS)
        // Load in parallel, but don't block anything
        await Promise.allSettled(ids.map(id => _loadBuffer(id)))
    },

    /**
     * Play a sound effect.
     * @param {string} soundId  — key from soundConfig
     * @param {object} [opts]   — { volume, pitch, loop, onended }
     */
    async play(soundId, opts = {}) {
        if (!ctx || _muted) return

        const def = SOUNDS[soundId]
        if (!def) return

        // Rate limiting
        const now = Date.now()
        if (def.cooldown > 0 && lastPlayed[soundId] && now - lastPlayed[soundId] < def.cooldown) {
            return
        }
        lastPlayed[soundId] = now

        const buf = await _loadBuffer(soundId)
        if (!buf) return

        // Build graph: source → gainNode → sfxGain → masterGain → out
        const source = ctx.createBufferSource()
        source.buffer = buf

        // Pitch variation
        const pitchVar = opts.pitch != null
            ? opts.pitch
            : (def.pitchVar ? 1 + (Math.random() * 2 - 1) * def.pitchVar : 1)
        source.playbackRate.value = pitchVar

        source.loop = opts.loop ?? def.loop ?? false

        const gainNode = ctx.createGain()
        gainNode.gain.value = opts.volume != null ? opts.volume : def.vol
        source.connect(gainNode)
        gainNode.connect(sfxGain)

        if (opts.onended) source.onended = opts.onended

        source.start()
        return source
    },

    /**
     * Start looping background music.
     * @param {string} soundId
     */
    async playMusic(soundId) {
        if (!ctx) {
            // Defer until context is ready
            window.addEventListener('mousedown', () => this.playMusic(soundId), { once: true })
            return
        }

        // Stop existing music
        this.stopMusic(0)

        const def = SOUNDS[soundId]
        if (!def) return

        const buf = await _loadBuffer(soundId)
        if (!buf) return

        const source = ctx.createBufferSource()
        source.buffer = buf
        source.loop = true

        const gainNode = ctx.createGain()
        gainNode.gain.value = def.vol
        source.connect(gainNode)
        gainNode.connect(musicGain)

        source.start()
        currentMusic = { source, gainNode }
    },

    /**
     * Stop background music with optional fade.
     * @param {number} [fadeMs=500]
     */
    stopMusic(fadeMs = 500) {
        if (!currentMusic) return
        const { source, gainNode } = currentMusic
        if (fadeMs > 0 && ctx) {
            gainNode.gain.setTargetAtTime(0, ctx.currentTime, fadeMs / 3000)
            setTimeout(() => {
                try { source.stop() } catch { }
            }, fadeMs + 200)
        } else {
            try { source.stop() } catch { }
        }
        currentMusic = null
    },

    /**
     * Set volume for a category.
     * @param {'master'|'music'|'sfx'} category
     * @param {number} value  0–1
     */
    setVolume(category, value) {
        _volumes[category] = Math.max(0, Math.min(1, value))
        _applyAllVolumes()
    },

    /** Mute ALL audio */
    mute() {
        _muted = true
        if (masterGain) masterGain.gain.value = 0
        localStorage.setItem('neonStrike_muted', 'true')
    },

    /** Unmute ALL audio */
    unmute() {
        _muted = false
        if (masterGain) masterGain.gain.value = _volumes.master
        localStorage.setItem('neonStrike_muted', 'false')
        // Re-create AudioContext if it was never unlocked
        ensureContext()
        if (ctx?.state === 'suspended') ctx.resume()
    },

    /** Toggle mute — returns new muted state */
    toggleMute() {
        if (_muted) this.unmute()
        else this.mute()
        return _muted
    },

    isMuted() {
        return _muted
    },
}

export default SoundManager
