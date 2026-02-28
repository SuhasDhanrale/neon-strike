// ============================================================
// SoundGenerator.js
// Procedural Steampunk Sound Synthesis
//
// Generates ALL game sounds using Web Audio API oscillators,
// noise generators, filters, and envelopes.
// No external audio files needed for SFX.
//
// Each function returns an AudioBuffer that SoundManager can play.
// ============================================================

// ─── Utilities ────────────────────────────────────────────────

/** Create a noise buffer (white noise) */
function createNoiseBuffer(ctx, duration = 1) {
    const sampleRate = ctx.sampleRate
    const length = sampleRate * duration
    const buffer = ctx.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1
    }
    return buffer
}

/** Render a synthesis recipe to an AudioBuffer using OfflineAudioContext */
async function renderSound(duration, sampleRate, recipe) {
    const offCtx = new OfflineAudioContext(1, sampleRate * duration, sampleRate)
    await recipe(offCtx)
    return offCtx.startRendering()
}

// ─── Sound Recipes ────────────────────────────────────────────

/**
 * ORB LAUNCH — Compressed-air pneumatic piston release
 * Short hiss + metallic click
 */
async function synthOrbLaunch(sampleRate = 44100) {
    return renderSound(0.25, sampleRate, async (ctx) => {
        // Noise burst (hiss)
        const noiseSource = ctx.createBufferSource()
        noiseSource.buffer = createNoiseBuffer(ctx, 0.25)

        const hissFilter = ctx.createBiquadFilter()
        hissFilter.type = 'highpass'
        hissFilter.frequency.value = 3000

        const hissGain = ctx.createGain()
        hissGain.gain.setValueAtTime(0.5, 0)
        hissGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

        noiseSource.connect(hissFilter)
        hissFilter.connect(hissGain)
        hissGain.connect(ctx.destination)
        noiseSource.start(0)

        // Metallic click (short sine burst)
        const click = ctx.createOscillator()
        click.type = 'square'
        click.frequency.setValueAtTime(800, 0)
        click.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05)

        const clickGain = ctx.createGain()
        clickGain.gain.setValueAtTime(0.4, 0)
        clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)

        click.connect(clickGain)
        clickGain.connect(ctx.destination)
        click.start(0)
        click.stop(0.06)
    })
}

/**
 * ORB BOUNCE — Iron clang / metallic thud
 */
async function synthOrbBounce(sampleRate = 44100) {
    return renderSound(0.15, sampleRate, async (ctx) => {
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(600, 0)
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.35, 0)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.15)
    })
}

/**
 * ORB MERGE — Forge hammer strike with anvil ring + steam burst
 */
async function synthOrbMerge(sampleRate = 44100) {
    return renderSound(0.5, sampleRate, async (ctx) => {
        // Anvil ring (metallic)
        const anvil = ctx.createOscillator()
        anvil.type = 'square'
        anvil.frequency.setValueAtTime(1200, 0)
        anvil.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15)

        const anvilGain = ctx.createGain()
        anvilGain.gain.setValueAtTime(0.5, 0)
        anvilGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

        const anvilFilter = ctx.createBiquadFilter()
        anvilFilter.type = 'bandpass'
        anvilFilter.frequency.value = 800
        anvilFilter.Q.value = 2

        anvil.connect(anvilFilter)
        anvilFilter.connect(anvilGain)
        anvilGain.connect(ctx.destination)
        anvil.start(0)
        anvil.stop(0.4)

        // Impact thud
        const thud = ctx.createOscillator()
        thud.type = 'sine'
        thud.frequency.setValueAtTime(200, 0)
        thud.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08)

        const thudGain = ctx.createGain()
        thudGain.gain.setValueAtTime(0.6, 0)
        thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

        thud.connect(thudGain)
        thudGain.connect(ctx.destination)
        thud.start(0)
        thud.stop(0.1)

        // Steam burst (noise)
        const steam = ctx.createBufferSource()
        steam.buffer = createNoiseBuffer(ctx, 0.5)

        const steamFilter = ctx.createBiquadFilter()
        steamFilter.type = 'bandpass'
        steamFilter.frequency.value = 4000
        steamFilter.Q.value = 1

        const steamGain = ctx.createGain()
        steamGain.gain.setValueAtTime(0, 0)
        steamGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05)
        steamGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

        steam.connect(steamFilter)
        steamFilter.connect(steamGain)
        steamGain.connect(ctx.destination)
        steam.start(0)
    })
}

/**
 * ORB UNLOCK — Steam whistle — triumphant ascending tone
 */
async function synthOrbUnlock(sampleRate = 44100) {
    return renderSound(0.8, sampleRate, async (ctx) => {
        // Ascending whistle
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, 0)
        osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.3)
        osc.frequency.setValueAtTime(1400, ctx.currentTime + 0.3)
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.7)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, 0)
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05)
        gain.gain.setValueAtTime(0.4, ctx.currentTime + 0.5)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.8)

        // Steam hiss underneath
        const steam = ctx.createBufferSource()
        steam.buffer = createNoiseBuffer(ctx, 0.8)
        const sFilter = ctx.createBiquadFilter()
        sFilter.type = 'highpass'
        sFilter.frequency.value = 5000
        const sGain = ctx.createGain()
        sGain.gain.setValueAtTime(0, 0)
        sGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1)
        sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)

        steam.connect(sFilter)
        sFilter.connect(sGain)
        sGain.connect(ctx.destination)
        steam.start(0)
    })
}

/**
 * COMBO HIT — Rapid piston / mechanical tick
 */
async function synthComboHit(sampleRate = 44100) {
    return renderSound(0.12, sampleRate, async (ctx) => {
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.setValueAtTime(1000, 0)
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.05)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.45, 0)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.12)
    })
}

/**
 * COMBO DROP — Boiler pressure release / deflating hiss
 */
async function synthComboDrop(sampleRate = 44100) {
    return renderSound(0.5, sampleRate, async (ctx) => {
        const noise = ctx.createBufferSource()
        noise.buffer = createNoiseBuffer(ctx, 0.5)

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(6000, 0)
        filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.45)
        filter.Q.value = 2

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.3, 0)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        noise.start(0)
    })
}

/**
 * GEODE HIT — Pickaxe striking crystal
 */
async function synthGeodeHit(sampleRate = 44100) {
    return renderSound(0.2, sampleRate, async (ctx) => {
        // Sharp crystalline ping
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(2400, 0)
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.5, 0)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.2)

        // Impact sub-thud
        const sub = ctx.createOscillator()
        sub.type = 'sine'
        sub.frequency.setValueAtTime(150, 0)
        sub.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.06)

        const subGain = ctx.createGain()
        subGain.gain.setValueAtTime(0.4, 0)
        subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

        sub.connect(subGain)
        subGain.connect(ctx.destination)
        sub.start(0)
        sub.stop(0.1)
    })
}

/**
 * GEODE CRACKED — Shattering crystalline explosion
 */
async function synthGeodeCracked(sampleRate = 44100) {
    return renderSound(0.7, sampleRate, async (ctx) => {
        // Shatter noise burst
        const noise = ctx.createBufferSource()
        noise.buffer = createNoiseBuffer(ctx, 0.7)

        const shatterFilter = ctx.createBiquadFilter()
        shatterFilter.type = 'bandpass'
        shatterFilter.frequency.setValueAtTime(6000, 0)
        shatterFilter.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.5)
        shatterFilter.Q.value = 3

        const shatterGain = ctx.createGain()
        shatterGain.gain.setValueAtTime(0.6, 0)
        shatterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

        noise.connect(shatterFilter)
        shatterFilter.connect(shatterGain)
        shatterGain.connect(ctx.destination)
        noise.start(0)

        // Crystal ring (high sine)
        const ring = ctx.createOscillator()
        ring.type = 'sine'
        ring.frequency.setValueAtTime(3000, 0)
        ring.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.5)

        const ringGain = ctx.createGain()
        ringGain.gain.setValueAtTime(0.3, 0)
        ringGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

        ring.connect(ringGain)
        ringGain.connect(ctx.destination)
        ring.start(0)
        ring.stop(0.65)

        // Low impact boom
        const boom = ctx.createOscillator()
        boom.type = 'sine'
        boom.frequency.setValueAtTime(100, 0)
        boom.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2)

        const boomGain = ctx.createGain()
        boomGain.gain.setValueAtTime(0.5, 0)
        boomGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

        boom.connect(boomGain)
        boomGain.connect(ctx.destination)
        boom.start(0)
        boom.stop(0.3)
    })
}

/**
 * AIM START — Subtle pneumatic pressure build
 */
async function synthAimStart(sampleRate = 44100) {
    return renderSound(0.12, sampleRate, async (ctx) => {
        const noise = ctx.createBufferSource()
        noise.buffer = createNoiseBuffer(ctx, 0.12)

        const filter = ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 6000

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, 0)
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        noise.start(0)
    })
}

/**
 * SKILL SHAKE — Seismic tremor with rattling machinery
 */
async function synthSkillShake(sampleRate = 44100) {
    return renderSound(0.8, sampleRate, async (ctx) => {
        // Low rumble
        const rumble = ctx.createOscillator()
        rumble.type = 'sawtooth'
        rumble.frequency.setValueAtTime(40, 0)
        rumble.frequency.linearRampToValueAtTime(25, ctx.currentTime + 0.7)

        const rumbleGain = ctx.createGain()
        rumbleGain.gain.setValueAtTime(0.5, 0)
        rumbleGain.gain.setValueAtTime(0.5, ctx.currentTime + 0.3)
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75)

        const rumbleFilter = ctx.createBiquadFilter()
        rumbleFilter.type = 'lowpass'
        rumbleFilter.frequency.value = 200

        rumble.connect(rumbleFilter)
        rumbleFilter.connect(rumbleGain)
        rumbleGain.connect(ctx.destination)
        rumble.start(0)
        rumble.stop(0.8)

        // Rattle noise
        const rattle = ctx.createBufferSource()
        rattle.buffer = createNoiseBuffer(ctx, 0.8)

        const rattleFilter = ctx.createBiquadFilter()
        rattleFilter.type = 'bandpass'
        rattleFilter.frequency.value = 3000
        rattleFilter.Q.value = 5

        const rattleGain = ctx.createGain()
        rattleGain.gain.setValueAtTime(0.3, 0)
        rattleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)

        rattle.connect(rattleFilter)
        rattleFilter.connect(rattleGain)
        rattleGain.connect(ctx.destination)
        rattle.start(0)
    })
}

/**
 * SKILL SMASH — Massive hydraulic press slam
 */
async function synthSkillSmash(sampleRate = 44100) {
    return renderSound(0.6, sampleRate, async (ctx) => {
        // Heavy impact
        const impact = ctx.createOscillator()
        impact.type = 'sine'
        impact.frequency.setValueAtTime(150, 0)
        impact.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.2)

        const impactGain = ctx.createGain()
        impactGain.gain.setValueAtTime(0.8, 0)
        impactGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

        impact.connect(impactGain)
        impactGain.connect(ctx.destination)
        impact.start(0)
        impact.stop(0.5)

        // Metal crunch (noise burst)
        const crunch = ctx.createBufferSource()
        crunch.buffer = createNoiseBuffer(ctx, 0.6)

        const crunchFilter = ctx.createBiquadFilter()
        crunchFilter.type = 'bandpass'
        crunchFilter.frequency.setValueAtTime(2000, 0)
        crunchFilter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3)
        crunchFilter.Q.value = 3

        const crunchGain = ctx.createGain()
        crunchGain.gain.setValueAtTime(0.5, 0)
        crunchGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

        crunch.connect(crunchFilter)
        crunchFilter.connect(crunchGain)
        crunchGain.connect(ctx.destination)
        crunch.start(0)
    })
}

/**
 * SKILL VOID — Vacuum implosion
 */
async function synthSkillVoid(sampleRate = 44100) {
    return renderSound(0.7, sampleRate, async (ctx) => {
        // Reverse whoosh (noise that ramps up then cuts)
        const whoosh = ctx.createBufferSource()
        whoosh.buffer = createNoiseBuffer(ctx, 0.7)

        const whooshFilter = ctx.createBiquadFilter()
        whooshFilter.type = 'bandpass'
        whooshFilter.frequency.setValueAtTime(200, 0)
        whooshFilter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.25)
        whooshFilter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6)
        whooshFilter.Q.value = 2

        const whooshGain = ctx.createGain()
        whooshGain.gain.setValueAtTime(0.05, 0)
        whooshGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.25)
        whooshGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

        whoosh.connect(whooshFilter)
        whooshFilter.connect(whooshGain)
        whooshGain.connect(ctx.destination)
        whoosh.start(0)

        // Sub bass drop at peak
        const sub = ctx.createOscillator()
        sub.type = 'sine'
        sub.frequency.setValueAtTime(80, ctx.currentTime + 0.2)
        sub.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.55)

        const subGain = ctx.createGain()
        subGain.gain.setValueAtTime(0, 0)
        subGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.25)
        subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

        sub.connect(subGain)
        subGain.connect(ctx.destination)
        sub.start(0)
        sub.stop(0.65)
    })
}

/**
 * GEAR UNLOCK — Massive clockwork engagement
 */
async function synthGearUnlock(sampleRate = 44100) {
    return renderSound(1.2, sampleRate, async (ctx) => {
        // Heavy mechanical thunk
        const thunk = ctx.createOscillator()
        thunk.type = 'square'
        thunk.frequency.setValueAtTime(300, 0)
        thunk.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12)

        const thunkGain = ctx.createGain()
        thunkGain.gain.setValueAtTime(0.6, 0)
        thunkGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

        thunk.connect(thunkGain)
        thunkGain.connect(ctx.destination)
        thunk.start(0)
        thunk.stop(0.25)

        // Gear meshing (clicking sounds — rapid oscillations)
        const gears = ctx.createOscillator()
        gears.type = 'sawtooth'
        gears.frequency.setValueAtTime(20, ctx.currentTime + 0.1)
        gears.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.8)

        const gearsFilter = ctx.createBiquadFilter()
        gearsFilter.type = 'bandpass'
        gearsFilter.frequency.value = 1500
        gearsFilter.Q.value = 4

        const gearsGain = ctx.createGain()
        gearsGain.gain.setValueAtTime(0, 0)
        gearsGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.2)
        gearsGain.gain.setValueAtTime(0.25, ctx.currentTime + 0.7)
        gearsGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1)

        gears.connect(gearsFilter)
        gearsFilter.connect(gearsGain)
        gearsGain.connect(ctx.destination)
        gears.start(0)
        gears.stop(1.15)

        // Steam burst
        const steam = ctx.createBufferSource()
        steam.buffer = createNoiseBuffer(ctx, 1.2)
        const sFilter = ctx.createBiquadFilter()
        sFilter.type = 'highpass'
        sFilter.frequency.value = 4000
        const sGain = ctx.createGain()
        sGain.gain.setValueAtTime(0, 0)
        sGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15)
        sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
        steam.connect(sFilter)
        sFilter.connect(sGain)
        sGain.connect(ctx.destination)
        steam.start(0)

        // Ascending chime
        const chime = ctx.createOscillator()
        chime.type = 'sine'
        chime.frequency.setValueAtTime(800, ctx.currentTime + 0.15)
        chime.frequency.linearRampToValueAtTime(1600, ctx.currentTime + 0.5)

        const chimeGain = ctx.createGain()
        chimeGain.gain.setValueAtTime(0, 0)
        chimeGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2)
        chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)

        chime.connect(chimeGain)
        chimeGain.connect(ctx.destination)
        chime.start(0)
        chime.stop(0.85)
    })
}

/**
 * ENERGY FULL — Boiler reaching pressure (ascending whistle + gauge click)
 */
async function synthEnergyFull(sampleRate = 44100) {
    return renderSound(0.5, sampleRate, async (ctx) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(500, 0)
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, 0)
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05)
        gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.3)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.5)

        // Click at peak
        const click = ctx.createOscillator()
        click.type = 'square'
        click.frequency.value = 2000
        const cGain = ctx.createGain()
        cGain.gain.setValueAtTime(0, 0)
        cGain.gain.setValueAtTime(0.3, ctx.currentTime + 0.28)
        cGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32)
        click.connect(cGain)
        cGain.connect(ctx.destination)
        click.start(0)
        click.stop(0.35)
    })
}

/**
 * ENERGY DRAIN — Turbine spinning down
 */
async function synthEnergyDrain(sampleRate = 44100) {
    return renderSound(0.5, sampleRate, async (ctx) => {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(400, 0)
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.45)

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2000, 0)
        filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.45)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.3, 0)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.5)
    })
}

/**
 * LEVER PULL — Heavy brass lever ka-chunk
 */
async function synthLeverPull(sampleRate = 44100) {
    return renderSound(0.25, sampleRate, async (ctx) => {
        // Mechanical ka-chunk (two transients)
        const ka = ctx.createOscillator()
        ka.type = 'square'
        ka.frequency.setValueAtTime(400, 0)
        ka.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04)

        const kaGain = ctx.createGain()
        kaGain.gain.setValueAtTime(0.5, 0)
        kaGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)

        ka.connect(kaGain)
        kaGain.connect(ctx.destination)
        ka.start(0)
        ka.stop(0.07)

        // "chunk" part
        const chunk = ctx.createOscillator()
        chunk.type = 'square'
        chunk.frequency.setValueAtTime(250, ctx.currentTime + 0.08)
        chunk.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15)

        const chunkGain = ctx.createGain()
        chunkGain.gain.setValueAtTime(0, 0)
        chunkGain.gain.setValueAtTime(0.5, ctx.currentTime + 0.08)
        chunkGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

        chunk.connect(chunkGain)
        chunkGain.connect(ctx.destination)
        chunk.start(0)
        chunk.stop(0.22)
    })
}

/**
 * REQUISITION OPEN — Telegram typewriter clatter
 */
async function synthRequisitionOpen(sampleRate = 44100) {
    return renderSound(0.3, sampleRate, async (ctx) => {
        // Series of rapid clicks
        for (let i = 0; i < 5; i++) {
            const t = i * 0.045
            const click = ctx.createOscillator()
            click.type = 'square'
            click.frequency.value = 1200 + Math.random() * 600

            const cGain = ctx.createGain()
            cGain.gain.setValueAtTime(0, 0)
            cGain.gain.setValueAtTime(0.3, ctx.currentTime + t)
            cGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.025)

            click.connect(cGain)
            cGain.connect(ctx.destination)
            click.start(0)
            click.stop(t + 0.03)
        }
    })
}

/**
 * REQUISITION CONFIRM — Stamp press slamming down
 */
async function synthRequisitionConfirm(sampleRate = 44100) {
    return renderSound(0.3, sampleRate, async (ctx) => {
        // Heavy stamp impact
        const impact = ctx.createOscillator()
        impact.type = 'triangle'
        impact.frequency.setValueAtTime(500, 0)
        impact.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.6, 0)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

        impact.connect(gain)
        gain.connect(ctx.destination)
        impact.start(0)
        impact.stop(0.3)

        // Thud noise
        const noise = ctx.createBufferSource()
        noise.buffer = createNoiseBuffer(ctx, 0.3)
        const noiseFilter = ctx.createBiquadFilter()
        noiseFilter.type = 'lowpass'
        noiseFilter.frequency.value = 1000
        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(0.25, 0)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        noise.connect(noiseFilter)
        noiseFilter.connect(noiseGain)
        noiseGain.connect(ctx.destination)
        noise.start(0)
    })
}

/**
 * REQUISITION CANCEL — Paper crumple + drawer slam
 */
async function synthRequisitionCancel(sampleRate = 44100) {
    return renderSound(0.2, sampleRate, async (ctx) => {
        const noise = ctx.createBufferSource()
        noise.buffer = createNoiseBuffer(ctx, 0.2)

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 2000
        filter.Q.value = 1

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.25, 0)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        noise.start(0)
    })
}

/**
 * GAME OVER — Catastrophic boiler failure
 */
async function synthGameOver(sampleRate = 44100) {
    return renderSound(2.0, sampleRate, async (ctx) => {
        // Long descending groan
        const groan = ctx.createOscillator()
        groan.type = 'sawtooth'
        groan.frequency.setValueAtTime(200, 0)
        groan.frequency.exponentialRampToValueAtTime(15, ctx.currentTime + 1.8)

        const groanFilter = ctx.createBiquadFilter()
        groanFilter.type = 'lowpass'
        groanFilter.frequency.setValueAtTime(1000, 0)
        groanFilter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.5)

        const groanGain = ctx.createGain()
        groanGain.gain.setValueAtTime(0.5, 0)
        groanGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.9)

        groan.connect(groanFilter)
        groanFilter.connect(groanGain)
        groanGain.connect(ctx.destination)
        groan.start(0)
        groan.stop(2.0)

        // Steam release
        const steam = ctx.createBufferSource()
        steam.buffer = createNoiseBuffer(ctx, 2.0)
        const sFilter = ctx.createBiquadFilter()
        sFilter.type = 'highpass'
        sFilter.frequency.setValueAtTime(3000, 0)
        sFilter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 1.5)
        const sGain = ctx.createGain()
        sGain.gain.setValueAtTime(0.3, 0)
        sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8)
        steam.connect(sFilter)
        sFilter.connect(sGain)
        sGain.connect(ctx.destination)
        steam.start(0)

        // Grinding halt (low metallic)
        const grind = ctx.createOscillator()
        grind.type = 'square'
        grind.frequency.setValueAtTime(80, ctx.currentTime + 0.5)
        grind.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1.5)

        const grindFilter = ctx.createBiquadFilter()
        grindFilter.type = 'lowpass'
        grindFilter.frequency.value = 300

        const grindGain = ctx.createGain()
        grindGain.gain.setValueAtTime(0, 0)
        grindGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.6)
        grindGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6)

        grind.connect(grindFilter)
        grindFilter.connect(grindGain)
        grindGain.connect(ctx.destination)
        grind.start(0)
        grind.stop(1.7)
    })
}

/**
 * GAME RESTART — Engine restart spin-up
 */
async function synthGameRestart(sampleRate = 44100) {
    return renderSound(0.6, sampleRate, async (ctx) => {
        // Ascending turbine
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(60, 0)
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4)

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(200, 0)
        filter.frequency.linearRampToValueAtTime(3000, ctx.currentTime + 0.4)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.3, 0)
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.3)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.6)

        // Steam pop at end
        const pop = ctx.createBufferSource()
        pop.buffer = createNoiseBuffer(ctx, 0.6)
        const pFilter = ctx.createBiquadFilter()
        pFilter.type = 'highpass'
        pFilter.frequency.value = 5000
        const pGain = ctx.createGain()
        pGain.gain.setValueAtTime(0, 0)
        pGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.35)
        pGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        pop.connect(pFilter)
        pFilter.connect(pGain)
        pGain.connect(ctx.destination)
        pop.start(0)
    })
}

/**
 * BOT MESSAGE — Solenoid relay click + CRT hum
 */
async function synthBotMessage(sampleRate = 44100) {
    return renderSound(0.15, sampleRate, async (ctx) => {
        // Relay click
        const click = ctx.createOscillator()
        click.type = 'square'
        click.frequency.value = 1500

        const cGain = ctx.createGain()
        cGain.gain.setValueAtTime(0.3, 0)
        cGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)

        click.connect(cGain)
        cGain.connect(ctx.destination)
        click.start(0)
        click.stop(0.04)

        // Short electronic buzz
        const buzz = ctx.createOscillator()
        buzz.type = 'sawtooth'
        buzz.frequency.value = 120

        const buzzFilter = ctx.createBiquadFilter()
        buzzFilter.type = 'bandpass'
        buzzFilter.frequency.value = 600
        buzzFilter.Q.value = 5

        const buzzGain = ctx.createGain()
        buzzGain.gain.setValueAtTime(0, 0)
        buzzGain.gain.setValueAtTime(0.15, ctx.currentTime + 0.03)
        buzzGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

        buzz.connect(buzzFilter)
        buzzFilter.connect(buzzGain)
        buzzGain.connect(ctx.destination)
        buzz.start(0)
        buzz.stop(0.14)
    })
}

/**
 * DANGER WARNING — Pressure alarm klaxon
 */
async function synthDangerWarning(sampleRate = 44100) {
    return renderSound(0.5, sampleRate, async (ctx) => {
        // Alternating two-tone siren
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.setValueAtTime(800, 0)
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.12)
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.24)
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.36)

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 800
        filter.Q.value = 2

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.35, 0)
        gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.4)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        osc.start(0)
        osc.stop(0.5)
    })
}

/**
 * SHUTTER OPEN — Heavy vault door sliding
 */
async function synthShutterOpen(sampleRate = 44100) {
    return renderSound(0.8, sampleRate, async (ctx) => {
        // Low scraping rumble
        const noise = ctx.createBufferSource()
        noise.buffer = createNoiseBuffer(ctx, 0.8)

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(300, 0)
        filter.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.6)
        filter.Q.value = 2

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, 0)
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.5)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        noise.start(0)

        // Final impact thud
        const thud = ctx.createOscillator()
        thud.type = 'sine'
        thud.frequency.setValueAtTime(100, ctx.currentTime + 0.55)
        thud.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.7)

        const thudGain = ctx.createGain()
        thudGain.gain.setValueAtTime(0, 0)
        thudGain.gain.setValueAtTime(0.4, ctx.currentTime + 0.55)
        thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75)

        thud.connect(thudGain)
        thudGain.connect(ctx.destination)
        thud.start(0)
        thud.stop(0.8)
    })
}

// ─── Export Map ────────────────────────────────────────────────

/** 
 * Map of soundId → generator function
 * Each function returns a Promise<AudioBuffer>
 */
export const SYNTH_MAP = {
    orb_launch: synthOrbLaunch,
    orb_bounce_wall: synthOrbBounce,
    orb_bounce_orb: synthOrbBounce,
    orb_merge: synthOrbMerge,
    orb_unlock: synthOrbUnlock,
    combo_hit: synthComboHit,
    combo_drop: synthComboDrop,
    geode_hit: synthGeodeHit,
    geode_cracked: synthGeodeCracked,
    aim_start: synthAimStart,
    skill_shake: synthSkillShake,
    skill_smash: synthSkillSmash,
    skill_void: synthSkillVoid,
    gear_unlock: synthGearUnlock,
    energy_full: synthEnergyFull,
    energy_drain: synthEnergyDrain,
    lever_pull: synthLeverPull,
    requisition_open: synthRequisitionOpen,
    requisition_confirm: synthRequisitionConfirm,
    requisition_cancel: synthRequisitionCancel,
    game_over: synthGameOver,
    game_restart: synthGameRestart,
    bot_message: synthBotMessage,
    danger_warning: synthDangerWarning,
    shutter_open: synthShutterOpen,
}

export default SYNTH_MAP
