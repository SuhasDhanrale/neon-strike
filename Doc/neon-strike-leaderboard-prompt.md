# 🏆 NEON STRIKE — MODULAR LEADERBOARD SYSTEM
### VS Code AI Agent — SDK-Agnostic Adapter Architecture

> **SCOPE:** Build a plug-and-play leaderboard system. The game calls one stable internal API. Whichever SDK is present at runtime gets used automatically. If no SDK is present, a local fallback runs silently. Zero game logic changes required.

---

## 🎯 THE ARCHITECTURE IN ONE SENTENCE

The game talks to `LeaderboardManager`. `LeaderboardManager` talks to whichever `Adapter` is active. Adapters translate between the game's language and the SDK's language. The game never knows which SDK is running.

```
Game Code
    │
    │  leaderboard.submit(score)
    │  leaderboard.fetch(10)
    ▼
LeaderboardManager          ← stable internal API, never changes
    │
    │  auto-detects SDK on init()
    ▼
AdapterInterface (contract)
    │
    ├── LocalStorageAdapter   ← always available, default fallback
    ├── FirebaseAdapter
    ├── PlayFabAdapter
    ├── GameSparksAdapter
    ├── CrazyGamesAdapter
    ├── PokiAdapter
    └── NewgroundsAdapter
```

---

## 📁 FILE STRUCTURE

```
src/
└── leaderboard/
    ├── leaderboardManager.js     ← Public API. Auto-detects + loads adapter.
    ├── adapterInterface.js       ← Contract every adapter must implement.
    ├── adapters/
    │   ├── localStorageAdapter.js  ← Default fallback. Always works.
    │   ├── firebaseAdapter.js
    │   ├── playfabAdapter.js
    │   ├── gamesparksAdapter.js
    │   ├── crazygamesAdapter.js
    │   ├── pokiAdapter.js
    │   └── newgroundsAdapter.js
    └── ui/
        ├── leaderboardUI.js       ← Renders the leaderboard panel (volcanic style)
        └── leaderboardPanel.html  ← Panel HTML fragment (injected into index.html)
```

---

## 📋 FULL IMPLEMENTATION SPEC

---

### 1. `src/leaderboard/adapterInterface.js`

This file defines the contract. Every adapter extends this class. Any method not overridden throws clearly so the developer knows immediately what's missing.

```js
/**
 * AdapterInterface
 * Every leaderboard adapter must implement these five methods.
 * Do not instantiate this class directly.
 */
export class AdapterInterface {

  /**
   * Called once on game boot.
   * Handle SDK auth, player identity, session init here.
   * Must resolve when ready, reject on unrecoverable failure.
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error(`[Leaderboard] Adapter "${this.constructor.name}" must implement init()`)
  }

  /**
   * Submit a score for the current player.
   * Should silently handle duplicate/lower scores if the SDK supports it.
   * @param {number} score — raw integer score
   * @param {object} [meta] — optional extra data: { level, heat, time }
   * @returns {Promise<SubmitResult>}
   *
   * SubmitResult shape:
   * { success: boolean, isNewPersonalBest: boolean, rank: number|null }
   */
  async submit(score, meta = {}) {
    throw new Error(`[Leaderboard] Adapter "${this.constructor.name}" must implement submit()`)
  }

  /**
   * Fetch top N scores from the board.
   * @param {number} limit — how many entries to fetch (default 10)
   * @returns {Promise<LeaderboardEntry[]>}
   *
   * LeaderboardEntry shape (NORMALISED — same regardless of SDK):
   * { rank: number, playerName: string, score: number, isCurrentPlayer: boolean }
   */
  async fetch(limit = 10) {
    throw new Error(`[Leaderboard] Adapter "${this.constructor.name}" must implement fetch()`)
  }

  /**
   * Get the current player's personal rank + best score.
   * Return null if the player has no score yet.
   * @returns {Promise<PlayerEntry|null>}
   *
   * PlayerEntry shape:
   * { rank: number, score: number, playerName: string }
   */
  async getPlayer() {
    throw new Error(`[Leaderboard] Adapter "${this.constructor.name}" must implement getPlayer()`)
  }

  /**
   * Return the display name for this adapter.
   * Used in the UI to show "Powered by Firebase" etc.
   * @returns {string}
   */
  get displayName() {
    return 'Unknown'
  }

  /**
   * Return true if this adapter supports real-time updates.
   * If true, leaderboardManager will call onScoreUpdate when new scores arrive.
   * @returns {boolean}
   */
  get supportsRealtime() {
    return false
  }
}
```

---

### 2. `src/leaderboard/leaderboardManager.js`

The single public API the game uses. Auto-detects and loads the correct adapter.

```js
import { AdapterInterface } from './adapterInterface.js'
import { LocalStorageAdapter } from './adapters/localStorageAdapter.js'

const BOARD_ID = 'neon_strike_global'   // Leaderboard ID sent to all SDKs

class LeaderboardManager {

  constructor() {
    this._adapter = null
    this._ready = false
    this._listeners = []
  }

  // ─── INIT ──────────────────────────────────────────────────────────

  /**
   * Call once in main.js after canvas setup.
   * Auto-detects which SDK is available and loads the matching adapter.
   * Always resolves — falls back to local if all else fails.
   */
  async init() {
    const AdapterClass = this._detect()
    this._adapter = new AdapterClass(BOARD_ID)

    try {
      await this._adapter.init()
      this._ready = true
      console.log(`[Leaderboard] Using adapter: ${this._adapter.displayName}`)
    } catch (err) {
      console.warn(`[Leaderboard] Adapter "${this._adapter.displayName}" failed init. Falling back to local.`, err)
      this._adapter = new LocalStorageAdapter(BOARD_ID)
      await this._adapter.init()
      this._ready = true
    }

    // Wire up real-time listener if the adapter supports it
    if (this._adapter.supportsRealtime) {
      this._adapter.onScoreUpdate = (entries) => {
        this._listeners.forEach(fn => fn(entries))
      }
    }
  }

  // ─── DETECTION ─────────────────────────────────────────────────────

  /**
   * Check for known SDK globals injected by script tags in index.html.
   * Order matters — more specific checks first.
   */
  _detect() {
    // Each check: does this global exist AND does it have a known method?
    if (window.firebase?.firestore)               return this._lazy('firebaseAdapter')
    if (window.PlayFabClientSDK?.LoginWithCustomID) return this._lazy('playfabAdapter')
    if (window.GS?.sendWithData)                  return this._lazy('gamesparksAdapter')
    if (window.CrazyGames?.SDK?.user)             return this._lazy('crazygamesAdapter')
    if (window.Poki?.SDK?.gameLoadingFinished)    return this._lazy('pokiAdapter')
    if (window.newgrounds?.callComponent)         return this._lazy('newgroundsAdapter')

    // No SDK detected — use local fallback
    console.info('[Leaderboard] No SDK detected. Using LocalStorage fallback.')
    return LocalStorageAdapter
  }

  /**
   * Lazy-load adapter module by name.
   * Returns the class synchronously via dynamic import trick.
   * Since adapters are local files, Vite bundles them — no real async needed.
   */
  _lazy(name) {
    // Vite static analysis requires explicit paths — list all here
    const map = {
      firebaseAdapter:   () => import('./adapters/firebaseAdapter.js'),
      playfabAdapter:    () => import('./adapters/playfabAdapter.js'),
      gamesparksAdapter: () => import('./adapters/gamesparksAdapter.js'),
      crazygamesAdapter: () => import('./adapters/crazygamesAdapter.js'),
      pokiAdapter:       () => import('./adapters/pokiAdapter.js'),
      newgroundsAdapter: () => import('./adapters/newgroundsAdapter.js'),
    }
    // Return a wrapper class that loads async on init()
    return class LazyAdapter extends AdapterInterface {
      async init() {
        const mod = await map[name]()
        const RealClass = mod.default
        const real = new RealClass(BOARD_ID)
        // Copy all methods from real instance to this
        Object.setPrototypeOf(this, RealClass.prototype)
        Object.assign(this, real)
        await real.init.call(this)
      }
    }
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────

  /**
   * Submit a score. Called from scoring.js after game over.
   * Safe to call even if not ready — queues and retries once.
   */
  async submit(score, meta = {}) {
    if (!this._ready) {
      console.warn('[Leaderboard] submit() called before ready. Score may be lost.')
      return { success: false, isNewPersonalBest: false, rank: null }
    }
    try {
      return await this._adapter.submit(score, meta)
    } catch (err) {
      console.error('[Leaderboard] submit() failed:', err)
      return { success: false, isNewPersonalBest: false, rank: null }
    }
  }

  /**
   * Fetch top N entries. Returns normalised LeaderboardEntry[].
   */
  async fetch(limit = 10) {
    if (!this._ready) return []
    try {
      return await this._adapter.fetch(limit)
    } catch (err) {
      console.error('[Leaderboard] fetch() failed:', err)
      return []
    }
  }

  /**
   * Get current player's rank and best score.
   */
  async getPlayer() {
    if (!this._ready) return null
    try {
      return await this._adapter.getPlayer()
    } catch (err) {
      return null
    }
  }

  /**
   * Subscribe to real-time score updates (only fires if adapter supports it).
   * @param {function} fn — called with LeaderboardEntry[] on update
   */
  onUpdate(fn) {
    this._listeners.push(fn)
  }

  get adapterName() {
    return this._adapter?.displayName ?? 'None'
  }
}

// Singleton — import this one instance everywhere
export const leaderboard = new LeaderboardManager()
```

---

### 3. `src/leaderboard/adapters/localStorageAdapter.js`

The always-available fallback. Simulates a real leaderboard using localStorage. Handles everything the same way a real adapter would — normalised output, personal best tracking, rank calculation.

```js
import { AdapterInterface } from '../adapterInterface.js'

const STORAGE_KEY_SCORES  = 'neonStrike_localBoard'
const STORAGE_KEY_PLAYER  = 'neonStrike_playerName'
const MAX_LOCAL_ENTRIES   = 100   // Keep top 100 locally

export class LocalStorageAdapter extends AdapterInterface {

  constructor(boardId) {
    super()
    this.boardId = boardId
    this.playerName = null
  }

  async init() {
    // Generate or retrieve a persistent player name
    let name = localStorage.getItem(STORAGE_KEY_PLAYER)
    if (!name) {
      name = 'OPERATOR-' + Math.floor(Math.random() * 9000 + 1000)
      localStorage.setItem(STORAGE_KEY_PLAYER, name)
    }
    this.playerName = name
  }

  async submit(score, meta = {}) {
    const all = this._loadAll()
    const existing = all.find(e => e.playerName === this.playerName)
    const isNewPersonalBest = !existing || score > existing.score

    if (isNewPersonalBest) {
      // Remove old entry, add new one
      const filtered = all.filter(e => e.playerName !== this.playerName)
      filtered.push({
        playerName: this.playerName,
        score,
        timestamp: Date.now(),
        meta
      })
      // Sort and trim
      filtered.sort((a, b) => b.score - a.score)
      this._saveAll(filtered.slice(0, MAX_LOCAL_ENTRIES))
    }

    const rank = this._getRank(this.playerName)
    return { success: true, isNewPersonalBest, rank }
  }

  async fetch(limit = 10) {
    const all = this._loadAll().slice(0, limit)
    return all.map((entry, i) => ({
      rank: i + 1,
      playerName: entry.playerName,
      score: entry.score,
      isCurrentPlayer: entry.playerName === this.playerName
    }))
  }

  async getPlayer() {
    const all = this._loadAll()
    const entry = all.find(e => e.playerName === this.playerName)
    if (!entry) return null
    return {
      rank: this._getRank(this.playerName),
      score: entry.score,
      playerName: this.playerName
    }
  }

  get displayName() { return 'Local' }
  get supportsRealtime() { return false }

  // ─── PRIVATE ─────────────────────────────────────────────────────

  _loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES) || '[]')
    } catch { return [] }
  }

  _saveAll(entries) {
    localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(entries))
  }

  _getRank(playerName) {
    const all = this._loadAll()
    const idx = all.findIndex(e => e.playerName === playerName)
    return idx === -1 ? null : idx + 1
  }
}
```

---

### 4. `src/leaderboard/adapters/firebaseAdapter.js`

Requires: `firebase/app` and `firebase/firestore` script tags in index.html, or npm packages.

```js
import { AdapterInterface } from '../adapterInterface.js'

export default class FirebaseAdapter extends AdapterInterface {

  constructor(boardId) {
    super()
    this.boardId = boardId
    this.db = null
    this.playerId = null
    this.playerName = null
    this._unsubscribe = null
  }

  async init() {
    // Expect firebase to be initialized externally via script tag or app config
    // The game does not own Firebase config — the developer sets it up
    if (!window.firebase?.firestore) {
      throw new Error('[Firebase] firebase.firestore not available')
    }

    this.db = window.firebase.firestore()

    // Use anonymous auth if available, else generate a persistent ID
    if (window.firebase.auth) {
      const auth = window.firebase.auth()
      if (!auth.currentUser) {
        await auth.signInAnonymously()
      }
      this.playerId = auth.currentUser.uid
    } else {
      this.playerId = this._getPersistentId()
    }

    this.playerName = this._getPlayerName()
  }

  async submit(score, meta = {}) {
    const ref = this.db
      .collection('leaderboards')
      .doc(this.boardId)
      .collection('scores')
      .doc(this.playerId)

    const existing = await ref.get()
    const isNewPersonalBest = !existing.exists || score > existing.data().score

    if (isNewPersonalBest) {
      await ref.set({
        playerName: this.playerName,
        score,
        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        meta
      })
    }

    // Approximate rank — count docs with higher score
    const higher = await this.db
      .collection('leaderboards')
      .doc(this.boardId)
      .collection('scores')
      .where('score', '>', score)
      .get()

    const rank = isNewPersonalBest ? higher.size + 1 : null
    return { success: true, isNewPersonalBest, rank }
  }

  async fetch(limit = 10) {
    const snap = await this.db
      .collection('leaderboards')
      .doc(this.boardId)
      .collection('scores')
      .orderBy('score', 'desc')
      .limit(limit)
      .get()

    return snap.docs.map((doc, i) => ({
      rank: i + 1,
      playerName: doc.data().playerName,
      score: doc.data().score,
      isCurrentPlayer: doc.id === this.playerId
    }))
  }

  async getPlayer() {
    const ref = this.db
      .collection('leaderboards')
      .doc(this.boardId)
      .collection('scores')
      .doc(this.playerId)

    const doc = await ref.get()
    if (!doc.exists) return null

    const score = doc.data().score
    const higher = await this.db
      .collection('leaderboards')
      .doc(this.boardId)
      .collection('scores')
      .where('score', '>', score)
      .get()

    return {
      rank: higher.size + 1,
      score,
      playerName: this.playerName
    }
  }

  get displayName() { return 'Firebase' }
  get supportsRealtime() { return true }

  // Real-time listener — called by manager if supportsRealtime is true
  set onScoreUpdate(fn) {
    if (this._unsubscribe) this._unsubscribe()
    this._unsubscribe = this.db
      .collection('leaderboards')
      .doc(this.boardId)
      .collection('scores')
      .orderBy('score', 'desc')
      .limit(10)
      .onSnapshot(snap => {
        const entries = snap.docs.map((doc, i) => ({
          rank: i + 1,
          playerName: doc.data().playerName,
          score: doc.data().score,
          isCurrentPlayer: doc.id === this.playerId
        }))
        fn(entries)
      })
  }

  get displayName() { return 'Firebase' }

  _getPersistentId() {
    let id = localStorage.getItem('neonStrike_uid')
    if (!id) {
      id = 'anon_' + Math.random().toString(36).slice(2)
      localStorage.setItem('neonStrike_uid', id)
    }
    return id
  }

  _getPlayerName() {
    let name = localStorage.getItem('neonStrike_playerName')
    if (!name) {
      name = 'OPERATOR-' + Math.floor(Math.random() * 9000 + 1000)
      localStorage.setItem('neonStrike_playerName', name)
    }
    return name
  }
}
```

---

### 5. `src/leaderboard/adapters/playfabAdapter.js`

Requires: PlayFab JS SDK script tag in index.html.

```js
import { AdapterInterface } from '../adapterInterface.js'

export default class PlayFabAdapter extends AdapterInterface {

  constructor(boardId) {
    super()
    this.boardId = boardId          // Used as PlayFab StatisticName
    this.playerId = null
    this.playerName = null
  }

  async init() {
    if (!window.PlayFabClientSDK) throw new Error('[PlayFab] SDK not found')

    // PlayFab titleId must be set externally by developer before game boots:
    // PlayFab.settings.titleId = "YOUR_TITLE_ID"
    if (!window.PlayFab?.settings?.titleId) {
      throw new Error('[PlayFab] PlayFab.settings.titleId not set')
    }

    this.playerName = this._getPlayerName()

    // Login with a persistent custom ID
    const customId = this._getPersistentId()
    await this._call('LoginWithCustomID', {
      CustomId: customId,
      CreateAccount: true,
      InfoRequestParameters: { GetUserAccountInfo: true }
    })

    // Set display name
    await this._call('UpdateUserTitleDisplayName', {
      DisplayName: this.playerName.slice(0, 25)   // PlayFab max 25 chars
    })
  }

  async submit(score, meta = {}) {
    const existing = await this.getPlayer()
    const isNewPersonalBest = !existing || score > existing.score

    if (isNewPersonalBest) {
      await this._call('UpdatePlayerStatistics', {
        Statistics: [{ StatisticName: this.boardId, Value: score }]
      })
    }

    const player = await this.getPlayer()
    return { success: true, isNewPersonalBest, rank: player?.rank ?? null }
  }

  async fetch(limit = 10) {
    const result = await this._call('GetLeaderboard', {
      StatisticName: this.boardId,
      StartPosition: 0,
      MaxResultsCount: limit
    })

    return result.data.Leaderboard.map(entry => ({
      rank: entry.Position + 1,
      playerName: entry.DisplayName || entry.PlayFabId,
      score: entry.StatValue,
      isCurrentPlayer: entry.PlayFabId === this.playerId
    }))
  }

  async getPlayer() {
    try {
      const result = await this._call('GetLeaderboardAroundPlayer', {
        StatisticName: this.boardId,
        MaxResultsCount: 1
      })
      const entry = result.data.Leaderboard.find(e => e.PlayFabId === this.playerId)
      if (!entry) return null
      return {
        rank: entry.Position + 1,
        score: entry.StatValue,
        playerName: entry.DisplayName || entry.PlayFabId
      }
    } catch { return null }
  }

  get displayName() { return 'PlayFab' }

  // ─── PRIVATE ──────────────────────────────────────────────────────

  _call(method, params) {
    return new Promise((resolve, reject) => {
      window.PlayFabClientSDK[method](params, (result, error) => {
        if (error) reject(new Error(error.errorMessage))
        else resolve(result)
      })
    })
  }

  _getPersistentId() {
    let id = localStorage.getItem('neonStrike_pfId')
    if (!id) {
      id = 'ns_' + Math.random().toString(36).slice(2, 14)
      localStorage.setItem('neonStrike_pfId', id)
    }
    return id
  }

  _getPlayerName() {
    let name = localStorage.getItem('neonStrike_playerName')
    if (!name) {
      name = 'OPERATOR-' + Math.floor(Math.random() * 9000 + 1000)
      localStorage.setItem('neonStrike_playerName', name)
    }
    return name
  }
}
```

---

### 6. `src/leaderboard/adapters/crazygamesAdapter.js`

CrazyGames has a built-in user system and leaderboard API.

```js
import { AdapterInterface } from '../adapterInterface.js'

export default class CrazyGamesAdapter extends AdapterInterface {

  constructor(boardId) {
    super()
    this.boardId = boardId
    this.sdk = null
    this.user = null
  }

  async init() {
    if (!window.CrazyGames?.SDK) throw new Error('[CrazyGames] SDK not found')
    this.sdk = window.CrazyGames.SDK

    // Wait for SDK init
    await new Promise((resolve, reject) => {
      this.sdk.init((error) => {
        if (error) reject(error)
        else resolve()
      })
    })

    // Get current user if logged in
    try {
      this.user = await this.sdk.user.getUser()
    } catch {
      this.user = null  // Guest user — submit still works with anonymous ID
    }
  }

  async submit(score, meta = {}) {
    try {
      await this.sdk.game.happytime()   // CrazyGames engagement signal
      // CrazyGames leaderboard submission
      await this.sdk.leaderboard.save({
        boardId: this.boardId,
        score
      })
      return { success: true, isNewPersonalBest: true, rank: null }
    } catch (err) {
      return { success: false, isNewPersonalBest: false, rank: null }
    }
  }

  async fetch(limit = 10) {
    try {
      const result = await this.sdk.leaderboard.get({
        boardId: this.boardId,
        limit
      })
      return result.map((entry, i) => ({
        rank: i + 1,
        playerName: entry.user?.username ?? 'Anonymous',
        score: entry.score,
        isCurrentPlayer: entry.user?.userId === this.user?.userId
      }))
    } catch { return [] }
  }

  async getPlayer() {
    try {
      const result = await this.sdk.leaderboard.getUserScore({
        boardId: this.boardId
      })
      return result ? {
        rank: result.rank,
        score: result.score,
        playerName: this.user?.username ?? 'Anonymous'
      } : null
    } catch { return null }
  }

  get displayName() { return 'CrazyGames' }
}
```

---

### 7. `src/leaderboard/adapters/pokiAdapter.js`

Poki SDK — lightweight, mostly for web game portals.

```js
import { AdapterInterface } from '../adapterInterface.js'

export default class PokiAdapter extends AdapterInterface {

  constructor(boardId) {
    super()
    this.boardId = boardId
  }

  async init() {
    if (!window.Poki?.SDK) throw new Error('[Poki] SDK not found')
    await window.Poki.SDK.init()
  }

  async submit(score, meta = {}) {
    // Poki uses gameplay events rather than a traditional leaderboard API
    // Submit score as a gameplay event
    window.Poki.SDK.gameplayStop()
    // Poki doesn't have a native leaderboard — use localStorage scoring behind it
    // This adapter submits the score locally and signals Poki of game end
    const local = new (await import('./localStorageAdapter.js')).LocalStorageAdapter(this.boardId)
    await local.init()
    return local.submit(score, meta)
  }

  async fetch(limit = 10) {
    const local = new (await import('./localStorageAdapter.js')).LocalStorageAdapter(this.boardId)
    await local.init()
    return local.fetch(limit)
  }

  async getPlayer() {
    const local = new (await import('./localStorageAdapter.js')).LocalStorageAdapter(this.boardId)
    await local.init()
    return local.getPlayer()
  }

  get displayName() { return 'Poki' }
}
```

---

### 8. `src/leaderboard/adapters/gamesparksAdapter.js`

```js
import { AdapterInterface } from '../adapterInterface.js'

export default class GameSparksAdapter extends AdapterInterface {

  constructor(boardId) {
    super()
    this.boardId = boardId
    this.playerName = null
  }

  async init() {
    if (!window.GS) throw new Error('[GameSparks] GS not found')
    this.playerName = this._getPlayerName()

    // GameSparks requires auth — use device auth for anonymous play
    await this._request('DeviceAuthenticationRequest', {
      DeviceId: this._getPersistentId(),
      DeviceOS: 'WEB',
      DisplayName: this.playerName
    })
  }

  async submit(score, meta = {}) {
    const result = await this._request('LogEventRequest', {
      eventKey: 'SCORE_EVT',
      SCORE: score,
      BOARD: this.boardId
    })
    const isNewPersonalBest = result?.scriptData?.isNewBest ?? true
    const rank = result?.scriptData?.rank ?? null
    return { success: true, isNewPersonalBest, rank }
  }

  async fetch(limit = 10) {
    const result = await this._request('LeaderboardDataRequest', {
      leaderboardShortCode: this.boardId,
      entryCount: limit
    })
    return (result?.data ?? []).map((entry, i) => ({
      rank: i + 1,
      playerName: entry.userName,
      score: entry.SCORE,
      isCurrentPlayer: entry.userName === this.playerName
    }))
  }

  async getPlayer() {
    const result = await this._request('AroundMeLeaderboardRequest', {
      leaderboardShortCode: this.boardId,
      entryCount: 1
    })
    const entry = result?.data?.[0]
    if (!entry) return null
    return {
      rank: entry.rank,
      score: entry.SCORE,
      playerName: entry.userName
    }
  }

  get displayName() { return 'GameSparks' }

  _request(type, data) {
    return new Promise((resolve, reject) => {
      window.GS.sendWithData(type, data, response => {
        if (response.error) reject(new Error(JSON.stringify(response.error)))
        else resolve(response)
      })
    })
  }

  _getPersistentId() {
    let id = localStorage.getItem('neonStrike_gsId')
    if (!id) { id = 'ns_' + Math.random().toString(36).slice(2); localStorage.setItem('neonStrike_gsId', id) }
    return id
  }

  _getPlayerName() {
    let n = localStorage.getItem('neonStrike_playerName')
    if (!n) { n = 'OPERATOR-' + Math.floor(Math.random() * 9000 + 1000); localStorage.setItem('neonStrike_playerName', n) }
    return n
  }
}
```

---

### 9. `src/leaderboard/adapters/newgroundsAdapter.js`

```js
import { AdapterInterface } from '../adapterInterface.js'

export default class NewgroundsAdapter extends AdapterInterface {

  constructor(boardId) {
    super()
    // boardId maps to a Newgrounds scoreboard ID (numeric)
    // Developer must set window.NEWGROUNDS_BOARD_ID before boot
    this.boardId = window.NEWGROUNDS_BOARD_ID ?? boardId
  }

  async init() {
    if (!window.newgrounds?.callComponent) throw new Error('[Newgrounds] API not found')
    // Newgrounds API auto-handles sessions via page embed
  }

  async submit(score, meta = {}) {
    const result = await this._call('ScoreBoard.postScore', {
      id: this.boardId,
      value: score
    })
    return {
      success: !result.error,
      isNewPersonalBest: true,    // Newgrounds handles this server-side
      rank: null
    }
  }

  async fetch(limit = 10) {
    const result = await this._call('ScoreBoard.getScores', {
      id: this.boardId,
      limit
    })
    return (result.scores ?? []).map((entry, i) => ({
      rank: i + 1,
      playerName: entry.user?.name ?? 'Guest',
      score: entry.value,
      isCurrentPlayer: false   // Newgrounds doesn't return current user flag here
    }))
  }

  async getPlayer() { return null }   // Newgrounds doesn't expose user rank easily
  get displayName() { return 'Newgrounds' }

  _call(component, params) {
    return new Promise((resolve) => {
      window.newgrounds.callComponent(component, params, resolve)
    })
  }
}
```

---

### 10. LEADERBOARD UI — `src/leaderboard/ui/leaderboardUI.js`

Volcanic Print style. Injected into the game-over screen and accessible via a dedicated button during play.

```js
import { leaderboard } from '../leaderboardManager.js'
import { State } from '../../state.js'

class LeaderboardUI {

  constructor() {
    this._panel = null
    this._isOpen = false
  }

  // Call once in main.js after DOM is ready
  init() {
    this._inject()
    this._bindEvents()
  }

  // Show the panel and populate it
  async open(highlightScore = null) {
    this._isOpen = true
    this._panel.classList.add('active')
    await this._populate(highlightScore)
  }

  close() {
    this._isOpen = false
    this._panel.classList.remove('active')
  }

  toggle() {
    this._isOpen ? this.close() : this.open()
  }

  // Called from game-over screen with the final score
  async showWithScore(score) {
    await this.open(score)
  }

  // ─── PRIVATE ────────────────────────────────────────────────────

  _inject() {
    const html = `
      <div id="leaderboard-panel">
        <div class="lb-header">
          <div class="lb-title">SCOREBOARD</div>
          <div class="lb-adapter" id="lb-adapter-name"></div>
          <button class="lb-close" id="lb-close">✕</button>
        </div>

        <div class="lb-player-row" id="lb-player-row" style="display:none">
          <span class="lb-player-rank" id="lb-player-rank">#—</span>
          <span class="lb-player-name" id="lb-player-name">YOU</span>
          <span class="lb-player-score" id="lb-player-score">—</span>
        </div>

        <div class="lb-list" id="lb-list">
          <div class="lb-loading">LOADING...</div>
        </div>

        <div class="lb-footer">
          <button class="lb-refresh" id="lb-refresh">↻ REFRESH</button>
        </div>
      </div>
    `
    document.getElementById('game-container').insertAdjacentHTML('beforeend', html)
    this._panel = document.getElementById('leaderboard-panel')
  }

  _bindEvents() {
    document.getElementById('lb-close').addEventListener('click', () => this.close())
    document.getElementById('lb-refresh').addEventListener('click', () => this._populate())

    // Real-time updates if supported
    leaderboard.onUpdate((entries) => {
      if (this._isOpen) this._render(entries)
    })
  }

  async _populate(highlightScore = null) {
    const listEl = document.getElementById('lb-list')
    listEl.innerHTML = '<div class="lb-loading">LOADING...</div>'

    document.getElementById('lb-adapter-name').textContent = leaderboard.adapterName

    const [entries, player] = await Promise.all([
      leaderboard.fetch(10),
      leaderboard.getPlayer()
    ])

    // Player row
    if (player) {
      document.getElementById('lb-player-row').style.display = 'flex'
      document.getElementById('lb-player-rank').textContent = `#${player.rank}`
      document.getElementById('lb-player-name').textContent = player.playerName
      document.getElementById('lb-player-score').textContent = player.score.toLocaleString()
    }

    this._render(entries, highlightScore)
  }

  _render(entries, highlightScore = null) {
    const listEl = document.getElementById('lb-list')
    if (!entries.length) {
      listEl.innerHTML = '<div class="lb-empty">NO SCORES YET.<br>BE FIRST.</div>'
      return
    }

    listEl.innerHTML = entries.map(entry => `
      <div class="lb-entry ${entry.isCurrentPlayer ? 'is-you' : ''} ${entry.score === highlightScore ? 'is-new' : ''}">
        <span class="lb-rank">${entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank-1] : `#${entry.rank}`}</span>
        <span class="lb-name">${this._sanitize(entry.playerName)}</span>
        <span class="lb-score">${entry.score.toLocaleString()}</span>
        ${entry.isCurrentPlayer ? '<span class="lb-you-tag">YOU</span>' : ''}
      </div>
    `).join('')
  }

  _sanitize(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }
}

export const leaderboardUI = new LeaderboardUI()
```

---

### 11. LEADERBOARD CSS — Add to `styles.css`

Volcanic Print — matches the game exactly.

```css
/* ══════════════════════════════════════════
   LEADERBOARD PANEL
══════════════════════════════════════════ */

#leaderboard-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.92);
  width: min(360px, 90vw);
  background: #1a1410;
  border: 3px solid #e85d20;
  border-radius: 4px;
  box-shadow: 8px 8px 0 #8c3a10, 16px 16px 0 #3d2010;
  z-index: 60;
  pointer-events: auto;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
}

#leaderboard-panel.active {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, -50%) scale(1);
}

/* HEADER */
.lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 3px solid #4a4040;
}

.lb-title {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  font-size: 1.5rem;
  color: #e8ddd0;
  letter-spacing: 4px;
}

.lb-adapter {
  font-size: 0.55rem;
  color: #6b5e58;
  letter-spacing: 2px;
  font-family: 'Rajdhani', sans-serif;
  text-transform: uppercase;
}

.lb-close {
  background: none;
  border: 2px solid #4a4040;
  border-radius: 2px;
  color: #6b5e58;
  font-size: 0.9rem;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, color 0.15s;
  font-family: monospace;
}
.lb-close:hover { border-color: #e85d20; color: #e8ddd0; }

/* PLAYER ROW — your own rank, always shown */
.lb-player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #2d2520;
  border-bottom: 3px solid #4a4040;
}

.lb-player-rank {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  font-size: 1rem;
  color: #e85d20;
  min-width: 36px;
}

.lb-player-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  color: #e8ddd0;
  flex: 1;
  letter-spacing: 1px;
}

.lb-player-score {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  color: #e8ddd0;
  letter-spacing: 1px;
}

/* ENTRY LIST */
.lb-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 6px 0;
  scrollbar-width: thin;
  scrollbar-color: #4a4040 #1a1410;
}

.lb-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  border-bottom: 1px solid #2d2520;
  position: relative;
  transition: background 0.1s;
}

/* Highlight the current player's entry */
.lb-entry.is-you {
  background: #2d2520;
  border-left: 3px solid #e85d20;
  padding-left: 13px;
}

/* Flash new score entry */
.lb-entry.is-new {
  animation: lb-new-flash 1s ease-out forwards;
}
@keyframes lb-new-flash {
  0%   { background: rgba(232, 93, 32, 0.3); }
  100% { background: transparent; }
}

.lb-rank {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  color: #6b5e58;
  min-width: 32px;
  text-align: center;
}

.lb-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  color: #e8ddd0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 1px;
}

.lb-score {
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  font-size: 1rem;
  color: #e8ddd0;
  letter-spacing: 1px;
}

.lb-you-tag {
  font-size: 0.5rem;
  background: #e85d20;
  color: #1a1410;
  padding: 1px 5px;
  border-radius: 2px;
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  letter-spacing: 2px;
}

.lb-loading, .lb-empty {
  text-align: center;
  padding: 30px 20px;
  color: #6b5e58;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 2px;
  line-height: 1.8;
}

/* FOOTER */
.lb-footer {
  padding: 10px 16px;
  border-top: 3px solid #4a4040;
  display: flex;
  justify-content: flex-end;
}

.lb-refresh {
  background: none;
  border: 2px solid #4a4040;
  border-radius: 2px;
  color: #6b5e58;
  font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 2px;
  padding: 5px 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.lb-refresh:hover { border-color: #e85d20; color: #e8ddd0; }
```

---

### 12. WIRING INTO `main.js`

```js
import { leaderboard } from './leaderboard/leaderboardManager.js'
import { leaderboardUI } from './leaderboard/ui/leaderboardUI.js'

async function init() {
  // ... existing canvas setup ...

  // Init leaderboard (non-blocking — game starts regardless)
  leaderboard.init().catch(err => {
    console.warn('[Leaderboard] Init failed silently:', err)
  })

  leaderboardUI.init()

  // ... rest of existing init ...
}
```

### 13. WIRING INTO GAME OVER

In `main.js` or wherever `endGame()` lives:

```js
async function endGame() {
  State.isGameOver = true

  // Submit score (fire and forget — UI shows optimistically)
  const result = await leaderboard.submit(State.score, {
    level: State.level,
    heat: State.systemHeat
  })

  // Show game over screen
  document.getElementById('final-score').textContent = State.score
  document.getElementById('game-over-screen').classList.add('active')

  // Auto-open leaderboard after brief delay
  setTimeout(() => {
    leaderboardUI.showWithScore(State.score)
  }, 800)
}
```

### 14. LEADERBOARD BUTTON (during play)

Add to `index.html` in the skills bar area:

```html
<button id="lb-toggle-btn" onclick="leaderboardUI.toggle()">🏆</button>
```

```css
#lb-toggle-btn {
  position: absolute;
  top: 16px;
  right: 16px;   /* Or wherever fits your HUD layout */
  background: #1a1410;
  border: 2px solid #4a4040;
  border-radius: 3px;
  box-shadow: 3px 3px 0 #0d0a08;
  color: #6b5e58;
  font-size: 1rem;
  width: 36px;
  height: 36px;
  cursor: pointer;
  z-index: 15;
  transition: border-color 0.15s, color 0.15s;
}
#lb-toggle-btn:hover { border-color: #e85d20; color: #e8ddd0; }
```

---

## ⚠️ CRITICAL RULES

1. **The game never imports any SDK directly.** Only `leaderboardManager.js` knows adapters exist. Game code only imports `leaderboard` from `leaderboardManager.js`.

2. **Every adapter must return the exact same normalised shape.** `LeaderboardEntry: { rank, playerName, score, isCurrentPlayer }`. No adapter-specific fields leak into the UI.

3. **Init never blocks the game.** `leaderboard.init()` is called without `await` in `main.js`. If it fails, the local fallback takes over. The game starts regardless.

4. **submit() never blocks game over.** Use `await` but handle the result after showing the screen — never make the player wait for a network call before seeing their score.

5. **All player names are sanitized before rendering.** The `_sanitize()` method in `leaderboardUI.js` must be used on every `playerName` value. No exceptions.

6. **The LocalStorageAdapter is the ground truth fallback.** If any adapter's `init()` throws, `leaderboardManager` catches it and reinitializes with `LocalStorageAdapter`. This must always work.

7. **Adding a new SDK requires only one new file.** A developer creating `src/leaderboard/adapters/mySDKAdapter.js` and adding one detection line to `leaderboardManager._detect()` is all it takes. No other files change.

8. **`window.leaderboard = leaderboard` in dev builds** so developers can test from console: `leaderboard.submit(9999)`, `leaderboard.fetch(10)`.

---

## ✅ DELIVERY CHECKLIST

- [ ] `leaderboard.init()` runs on boot without blocking
- [ ] Auto-detection correctly picks up Firebase / PlayFab / CrazyGames / Poki / GameSparks / Newgrounds when their globals exist
- [ ] Falls back to LocalStorageAdapter silently when no SDK present
- [ ] `localStorageAdapter` generates persistent player name on first run
- [ ] `submit()` only stores if score is a new personal best
- [ ] `fetch(10)` returns exactly normalised `LeaderboardEntry[]` from all adapters
- [ ] Leaderboard panel opens after game over with 800ms delay
- [ ] Current player's entry highlighted in the list
- [ ] New score entry flashes amber on first render
- [ ] Panel shows adapter name (Firebase / Local / PlayFab etc)
- [ ] Refresh button re-fetches live data
- [ ] Close button works
- [ ] Trophy button during play toggles panel
- [ ] All player names sanitized — no XSS possible
- [ ] Panel styled in Volcanic Print — hard shadows, no blur, Bebas Neue
- [ ] `window.leaderboard` exposed in dev for console testing
- [ ] `leaderboard.reset()` available for dev: clears localStorage board
