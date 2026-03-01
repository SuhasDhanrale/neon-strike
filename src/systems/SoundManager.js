// ============================================================
// SoundManager.js
// Steampunk / Volcanic Industrial Audio Engine
//
// Uses Web Audio API for fine-grained control:
//   - SFX Limiter: prevents clipping when multiple SFX play simultaneously
//   - Pitch variation (playbackRate) per sound
//   - Rate limiting (cooldown per sound ID)
//   - Independent volume channels: 'bg' (background music) and 'sfx' (sound effects)
//   - Channel routing based on sound config 'channel' property
//   - Mute support
//   - Music crossfade
//   - Mobile-safe AudioContext unlock on first interaction
//   - Graceful degradation — missing files are silently skipped
// ============================================================

import { SOUNDS, CHANNELS } from '../config/soundConfig.js'
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

function makeDistortionCurve(amount) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

function ensureContext() {
    if (ctx) return
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)()
        masterGain = ctx.createGain()
        musicGain = ctx.createGain()
        sfxGain = ctx.createGain()

        // SFX Limiter: prevent clipping when multiple SFX play simultaneously
        // A limiter is a compressor with very high ratio (hard knee at threshold)
        const sfxLimiter = ctx.createDynamicsCompressor()
        sfxLimiter.threshold.value = -6  // Start limiting at -6dB
        sfxLimiter.knee.value = 0         // Hard knee (no gradual limiting)
        sfxLimiter.ratio.value = 20       // Very high ratio = hard limiting
        sfxLimiter.attack.value = 0.001   // Fast attack (0ms to start limiting)
        sfxLimiter.release.value = 0.1    // Quick release

        // Compressor: punchy impacts, overall dynamics
        const compressor = ctx.createDynamicsCompressor()
        compressor.threshold.value = -12
        compressor.knee.value = 10
        compressor.ratio.value = 4
        compressor.attack.value = 0.005
        compressor.release.value = 0.1

        // Waveshaper: mild industrial grit/saturation for SFX
        const waveShaper = ctx.createWaveShaper()
        waveShaper.curve = makeDistortionCurve(5)
        waveShaper.oversample = '2x'

        // Chain: sfxGain → sfxLimiter → waveShaper → masterGain
        //        musicGain → masterGain
        //        masterGain → compressor → destination
        sfxGain.connect(sfxLimiter)
        sfxLimiter.connect(waveShaper)
        waveShaper.connect(masterGain)
        musicGain.connect(masterGain)
        masterGain.connect(compressor)
        compressor.connect(ctx.destination)

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

    // If a synthesized version exists, use it directly — no network fetch needed.
    // This avoids 404 warnings on platforms like CrazyGames where we don't ship .mp3 files.
    if (SYNTH_MAP[soundId]) {
        return _generateBuffer(soundId)
    }

    // No synth available — try loading the actual audio file
    try {
        const resp = await fetch(def.src)
        if (resp.ok) {
            const arrayBuf = await resp.arrayBuffer()
            const audioBuf = await ctx.decodeAudioData(arrayBuf)
            buffers[soundId] = audioBuf
            return audioBuf
        }
    } catch {
        // File missing or failed — nothing more to try
    }

    return null
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
     * Get the gain node for a channel.
     * @param {string} channel - 'bg' or 'sfx'
     * @returns {GainNode}
     */
    _getGainNode(channel) {
        const channelDef = CHANNELS[channel]
        if (!channelDef) {
            console.warn(`[SoundManager] Unknown channel: ${channel}, defaulting to sfx`)
            return sfxGain
        }
        // Map channel name to actual gain node
        if (channelDef.gainNode === 'music') {
            return musicGain
        }
        return sfxGain
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

        // Determine which channel/gain node to use
        const channel = def.channel || 'sfx'
        const gainNode = this._getGainNode(channel)

        // Build graph: source → gainNode → channelGain → masterGain → out
        const source = ctx.createBufferSource()
        source.buffer = buf

        // Pitch variation
        const pitchVar = opts.pitch != null
            ? opts.pitch
            : (def.pitchVar ? 1 + (Math.random() * 2 - 1) * def.pitchVar : 1)
        source.playbackRate.value = pitchVar

        source.loop = opts.loop ?? def.loop ?? false

        const sourceGain = ctx.createGain()
        sourceGain.gain.value = opts.volume != null ? opts.volume : def.vol
        source.connect(sourceGain)
        sourceGain.connect(gainNode)

        if (opts.onended) source.onended = opts.onended

        source.start()
        return source
    },

    /**
     * Start looping background music.
     * Uses the channel property from the sound config.
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

        // Determine which channel/gain node to use
        const channel = def.channel || 'bg'
        const gainNode = this._getGainNode(channel)

        const source = ctx.createBufferSource()
        source.buffer = buf
        source.loop = true

        const sourceGain = ctx.createGain()
        sourceGain.gain.value = def.vol
        source.connect(sourceGain)
        sourceGain.connect(gainNode)

        source.start()
        currentMusic = { source, gainNode: sourceGain }
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
     * @param {'master'|'bg'|'sfx'} category - 'bg' for background music, 'sfx' for sound effects
     * @param {number} value  0–1
     */
    setVolume(category, value) {
        // Map 'bg' to 'music' for internal volume tracking
        const internalCategory = category === 'bg' ? 'music' : category
        _volumes[internalCategory] = Math.max(0, Math.min(1, value))
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
