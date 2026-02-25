# NEON STRIKE - MODULAR LEADERBOARD SYSTEM
### Adapter Architecture (Matches Existing Ad System Pattern)

> **SCOPE:** Build a plug-and-play leaderboard system following the same architecture as the existing `ads/` system. Uses `BaseAdapter` pattern, config-driven platform detection, and singleton manager.

---

## ARCHITECTURE OVERVIEW

The game talks to `LeaderboardManager`. `LeaderboardManager` talks to whichever `Adapter` is active. Adapters extend `BaseAdapter` and translate between the game's API and the platform's SDK.

```
Game Code
    |
    |  leaderboard.submit(score)
    |  leaderboard.fetch(10)
    v
LeaderboardManager          <- singleton, auto-detects platform
    |
    |  uses config.LEADERBOARD_CONFIG.platform
    v
BaseAdapter (abstract)
    |
    |-- LocalStorageAdapter   <- always available, default fallback
    |-- CrazyGamesAdapter     <- requires CrazyGames SDK
    |-- PokiAdapter           <- requires Poki SDK
    |-- DummyAdapter          <- for development/testing
```

---

## FILE STRUCTURE (Matches `ads/` Pattern)

```
src/
  leaderboard/
    leaderboardConfig.js      <- Config (like adConfig.js)
    leaderboardManager.js     <- Singleton manager (like AdManager.js)
    adapters/
      BaseAdapter.js          <- Abstract base class
      LocalStorageAdapter.js  <- Default fallback, always works
      DummyAdapter.js         <- Testing adapter with visual overlay
      CrazyGamesAdapter.js    <- CrazyGames leaderboard SDK
      PokiAdapter.js          <- Poki leaderboard (uses local fallback)
    ui/
      leaderboardUI.js        <- Renders the leaderboard panel (volcanic style)
      leaderboard.css         <- Panel styles (add to styles.css)
```

---

## IMPLEMENTATION SPEC

---

### 1. `src/leaderboard/leaderboardConfig.js`

Centralized configuration - matches `adConfig.js` pattern.

```js
/**
 * Leaderboard Configuration - Game-Specific Rules
 * 
 * All numbers in one place for easy tweaking!
 */

// ==================== PLATFORM DETECTION ====================

export const LEADERBOARD_CONFIG = {
  // Current platform (auto-detected or set via environment)
  platform: import.meta.env.VITE_PLATFORM || 'development',
  
  // Leaderboard ID sent to all SDKs
  boardId: 'neon_strike_global',
  
  // Max entries to fetch/display
  maxEntries: 10,
  
  // Max entries stored locally
  maxLocalEntries: 100,
  
  // Storage keys
  storageKeys: {
    scores: 'neonStrike_localBoard',
    playerName: 'neonStrike_playerName',
    playerId: 'neonStrike_playerId'
  },
  
  // Debug settings
  debug: {
    logEvents: true,
    forceDummy: false,
    // Expose leaderboard globally for console testing
    exposeGlobally: true
  }
};

// ==================== HELPER FUNCTIONS ====================

export function getBoardId() {
  return LEADERBOARD_CONFIG.boardId;
}

export function shouldExposeGlobally() {
  return LEADERBOARD_CONFIG.debug.exposeGlobally;
}
```

---

### 2. `src/leaderboard/adapters/BaseAdapter.js`

Abstract base class - matches `ads/adapters/BaseAdapter.js` pattern.

```js
/**
 * BaseAdapter - Abstract base class for leaderboard adapters
 * All platform-specific adapters must extend this class
 */

export class BaseAdapter {
  constructor(name) {
    this.name = name;
    this.initialized = false;
    this.boardId = null;
  }

  /**
   * Initialize the leaderboard SDK
   * @returns {Promise<boolean>} Success status
   */
  async init(boardId) {
    throw new Error('init() must be implemented by subclass');
  }

  /**
   * Submit a score for the current player
   * @param {number} score - Raw integer score
   * @param {object} meta - Optional extra data: { heat, time }
   * @returns {Promise<SubmitResult>}
   * 
   * SubmitResult shape:
   * { success: boolean, isNewPersonalBest: boolean, rank: number|null }
   */
  async submit(score, meta = {}) {
    throw new Error('submit() must be implemented by subclass');
  }

  /**
   * Fetch top N scores from the board
   * @param {number} limit - How many entries to fetch
   * @returns {Promise<LeaderboardEntry[]>}
   * 
   * LeaderboardEntry shape (NORMALISED):
   * { rank: number, playerName: string, score: number, isCurrentPlayer: boolean }
   */
  async fetch(limit = 10) {
    throw new Error('fetch() must be implemented by subclass');
  }

  /**
   * Get the current player's personal rank + best score
   * @returns {Promise<PlayerEntry|null>}
   * 
   * PlayerEntry shape:
   * { rank: number, score: number, playerName: string }
   */
  async getPlayer() {
    throw new Error('getPlayer() must be implemented by subclass');
  }

  /**
   * Return the display name for this adapter
   * Used in UI to show "Powered by X"
   */
  get displayName() {
    return 'Unknown';
  }

  /**
   * Return true if this adapter supports real-time updates
   */
  get supportsRealtime() {
    return false;
  }

  /**
   * Log adapter events
   */
  log(event, data = {}) {
    if (import.meta.env.DEV) {
      console.log(`[Leaderboard:${this.name}] ${event}`, data);
    }
  }
}
```

---

### 3. `src/leaderboard/adapters/LocalStorageAdapter.js`

The always-available fallback. Simulates a real leaderboard using localStorage.

```js
import { BaseAdapter } from './BaseAdapter.js';
import { LEADERBOARD_CONFIG } from '../leaderboardConfig.js';

export class LocalStorageAdapter extends BaseAdapter {
  constructor() {
    super('LocalStorage');
    this.playerName = null;
    this.playerId = null;
  }

  async init(boardId) {
    this.boardId = boardId;
    
    // Generate or retrieve persistent player ID
    this.playerId = this._getPersistentId();
    
    // Generate or retrieve persistent player name
    this.playerName = this._getPlayerName();
    
    this.initialized = true;
    this.log('Initialized', { playerName: this.playerName });
    return true;
  }

  async submit(score, meta = {}) {
    const all = this._loadAll();
    const existing = all.find(e => e.playerId === this.playerId);
    const isNewPersonalBest = !existing || score > existing.score;

    if (isNewPersonalBest) {
      // Remove old entry, add new one
      const filtered = all.filter(e => e.playerId !== this.playerId);
      filtered.push({
        playerId: this.playerId,
        playerName: this.playerName,
        score,
        timestamp: Date.now(),
        meta
      });
      // Sort descending and trim
      filtered.sort((a, b) => b.score - a.score);
      this._saveAll(filtered.slice(0, LEADERBOARD_CONFIG.maxLocalEntries));
    }

    const rank = this._getRank(this.playerId);
    this.log('Score submitted', { score, isNewPersonalBest, rank });
    
    return { success: true, isNewPersonalBest, rank };
  }

  async fetch(limit = 10) {
    const all = this._loadAll().slice(0, limit);
    return all.map((entry, i) => ({
      rank: i + 1,
      playerName: entry.playerName,
      score: entry.score,
      isCurrentPlayer: entry.playerId === this.playerId
    }));
  }

  async getPlayer() {
    const all = this._loadAll();
    const entry = all.find(e => e.playerId === this.playerId);
    if (!entry) return null;
    
    return {
      rank: this._getRank(this.playerId),
      score: entry.score,
      playerName: this.playerName
    };
  }

  get displayName() { return 'Local'; }
  get supportsRealtime() { return false; }

  // --- PRIVATE ---

  _loadAll() {
    try {
      const key = LEADERBOARD_CONFIG.storageKeys.scores;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { 
      return []; 
    }
  }

  _saveAll(entries) {
    const key = LEADERBOARD_CONFIG.storageKeys.scores;
    localStorage.setItem(key, JSON.stringify(entries));
  }

  _getRank(playerId) {
    const all = this._loadAll();
    const idx = all.findIndex(e => e.playerId === playerId);
    return idx === -1 ? null : idx + 1;
  }

  _getPersistentId() {
    const key = LEADERBOARD_CONFIG.storageKeys.playerId;
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'ns_' + Math.random().toString(36).slice(2, 14);
      localStorage.setItem(key, id);
    }
    return id;
  }

  _getPlayerName() {
    const key = LEADERBOARD_CONFIG.storageKeys.playerName;
    let name = localStorage.getItem(key);
    if (!name) {
      name = 'OPERATOR-' + Math.floor(Math.random() * 9000 + 1000);
      localStorage.setItem(key, name);
    }
    return name;
  }
}
```

---

### 4. `src/leaderboard/adapters/DummyAdapter.js`

Testing adapter with visual overlay - matches `ads/adapters/DummyAdapter.js` pattern.

```js
import { BaseAdapter } from './BaseAdapter.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';

export class DummyAdapter extends BaseAdapter {
  constructor() {
    super('Dummy');
    this.localAdapter = null;
  }

  async init(boardId) {
    this.boardId = boardId;
    
    // Use LocalStorageAdapter for actual storage
    this.localAdapter = new LocalStorageAdapter();
    await this.localAdapter.init(boardId);
    
    this.initialized = true;
    this._createOverlayStyles();
    this.log('Initialized - Ready for testing');
    return true;
  }

  async submit(score, meta = {}) {
    this.log('Submit', { score, meta });
    
    // Show visual overlay
    await this._showSubmitOverlay(score);
    
    // Actually store via local adapter
    return await this.localAdapter.submit(score, meta);
  }

  async fetch(limit = 10) {
    this.log('Fetch', { limit });
    return await this.localAdapter.fetch(limit);
  }

  async getPlayer() {
    return await this.localAdapter.getPlayer();
  }

  get displayName() { return 'Dummy (Test)'; }

  // --- VISUAL OVERLAY ---

  _createOverlayStyles() {
    if (document.getElementById('dummy-lb-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'dummy-lb-styles';
    styles.textContent = `
      .dummy-lb-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(26, 20, 16, 0.95);
        border: 3px solid #e85d20;
        border-radius: 4px;
        box-shadow: 8px 8px 0 #8c3a10;
        padding: 20px 30px;
        z-index: 99999;
        font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
        color: #e8ddd0;
        text-align: center;
      }
      .dummy-lb-overlay .lb-title {
        font-size: 1.2rem;
        letter-spacing: 3px;
        color: #e85d20;
        margin-bottom: 10px;
      }
      .dummy-lb-overlay .lb-score {
        font-size: 2.5rem;
        color: #e8ddd0;
        margin-bottom: 15px;
      }
      .dummy-lb-overlay .lb-status {
        font-size: 0.8rem;
        color: #6b5e58;
        letter-spacing: 2px;
      }
    `;
    document.head.appendChild(styles);
  }

  async _showSubmitOverlay(score) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dummy-lb-overlay';
      overlay.innerHTML = `
        <div class="lb-title">LEADERBOARD SUBMIT</div>
        <div class="lb-score">${score.toLocaleString()}</div>
        <div class="lb-status">STORING SCORE...</div>
      `;
      document.body.appendChild(overlay);

      setTimeout(() => {
        overlay.querySelector('.lb-status').textContent = 'SCORE SUBMITTED!';
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 500);
      }, 800);
    });
  }
}
```

---

### 5. `src/leaderboard/adapters/CrazyGamesAdapter.js`

CrazyGames SDK leaderboard integration.

```js
import { BaseAdapter } from './BaseAdapter.js';

const CRAZYGAMES_SDK_SCRIPT_ID = 'crazygames-sdk-v3';
const CRAZYGAMES_SDK_SCRIPT_SRC = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const SDK_READY_TIMEOUT_MS = 15000;

export class CrazyGamesAdapter extends BaseAdapter {
  constructor() {
    super('CrazyGames');
    this.sdk = null;
    this.user = null;
    this.environment = 'disabled';
  }

  async init(boardId) {
    this.boardId = boardId;
    this.log('Initializing CrazyGames SDK...');

    try {
      await this._ensureSdkScript();

      if (typeof window.CrazyGames === 'undefined' || !window.CrazyGames.SDK) {
        this.log('CrazyGames SDK not found');
        return false;
      }

      this.sdk = window.CrazyGames.SDK;
      await this.sdk.init();

      this.environment = this.sdk.environment;
      this.log(`Environment: ${this.environment}`);

      if (this.environment === 'disabled') {
        this.log('SDK disabled in this environment');
        return false;
      }

      // Get current user if available
      try {
        this.user = await this.sdk.user.getUser();
        this.log('User retrieved', { username: this.user?.username });
      } catch {
        this.user = null;
        this.log('No user session (guest mode)');
      }

      this.initialized = true;
      this.log('CrazyGames SDK initialized');
      return true;
    } catch (error) {
      this.log('Init failed', { error: error.message });
      return false;
    }
  }

  async _ensureSdkScript() {
    if (window.CrazyGames && window.CrazyGames.SDK) return;

    const existing = document.getElementById(CRAZYGAMES_SDK_SCRIPT_ID);
    if (!existing) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = CRAZYGAMES_SDK_SCRIPT_ID;
        script.src = CRAZYGAMES_SDK_SCRIPT_SRC;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load CrazyGames SDK'));
        document.head.appendChild(script);
      });
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < SDK_READY_TIMEOUT_MS) {
      if (window.CrazyGames && window.CrazyGames.SDK) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async submit(score, meta = {}) {
    if (!this._isSDKAvailable()) {
      this.log('Submit failed - SDK not available');
      return { success: false, isNewPersonalBest: false, rank: null };
    }

    try {
      // Report happy time for engagement
      if (typeof this.sdk.game.happytime === 'function') {
        this.sdk.game.happytime();
      }

      // Submit to CrazyGames leaderboard
      await this.sdk.leaderboard.recordScore(this.boardId, score);
      
      this.log('Score submitted', { score });
      return { success: true, isNewPersonalBest: true, rank: null };
    } catch (error) {
      this.log('Submit failed', { error: error.message });
      return { success: false, isNewPersonalBest: false, rank: null };
    }
  }

  async fetch(limit = 10) {
    if (!this._isSDKAvailable()) {
      this.log('Fetch failed - SDK not available');
      return [];
    }

    try {
      const result = await this.sdk.leaderboard.getScoreboard(this.boardId, limit);
      
      return (result || []).map((entry, i) => ({
        rank: i + 1,
        playerName: entry.user?.username || 'Guest',
        score: entry.score,
        isCurrentPlayer: entry.user?.id === this.user?.id
      }));
    } catch (error) {
      this.log('Fetch failed', { error: error.message });
      return [];
    }
  }

  async getPlayer() {
    if (!this._isSDKAvailable() || !this.user) {
      return null;
    }

    try {
      const score = await this.sdk.leaderboard.getUserScore(this.boardId);
      if (!score) return null;
      
      return {
        rank: score.rank,
        score: score.score,
        playerName: this.user.username || 'Guest'
      };
    } catch {
      return null;
    }
  }

  _isSDKAvailable() {
    return this.initialized && this.sdk && 
           (this.environment === 'local' || this.environment === 'crazygames');
  }

  get displayName() { return 'CrazyGames'; }
}
```

---

### 6. `src/leaderboard/adapters/PokiAdapter.js`

Poki SDK - uses localStorage behind the scenes since Poki doesn't have a native leaderboard API.

```js
import { BaseAdapter } from './BaseAdapter.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';

export class PokiAdapter extends BaseAdapter {
  constructor() {
    super('Poki');
    this.localAdapter = null;
  }

  async init(boardId) {
    this.boardId = boardId;
    this.log('Initializing Poki SDK...');

    // Poki doesn't have a native leaderboard API
    // Use localStorage for storage, but integrate with Poki lifecycle
    this.localAdapter = new LocalStorageAdapter();
    await this.localAdapter.init(boardId);

    // Signal Poki that game is ready
    if (window.Poki?.SDK) {
      try {
        await window.Poki.SDK.init();
        this.log('Poki SDK initialized');
      } catch {
        this.log('Poki SDK init failed, using local fallback');
      }
    }

    this.initialized = true;
    return true;
  }

  async submit(score, meta = {}) {
    // Signal gameplay stop to Poki
    if (window.Poki?.SDK?.gameplayStop) {
      window.Poki.SDK.gameplayStop();
    }

    // Store locally
    const result = await this.localAdapter.submit(score, meta);
    this.log('Score submitted', { score, success: result.success });
    
    return result;
  }

  async fetch(limit = 10) {
    return await this.localAdapter.fetch(limit);
  }

  async getPlayer() {
    return await this.localAdapter.getPlayer();
  }

  get displayName() { return 'Poki'; }
}
```

---

### 7. `src/leaderboard/leaderboardManager.js`

Singleton manager - matches `AdManager.js` pattern.

```js
import { LEADERBOARD_CONFIG, shouldExposeGlobally } from './leaderboardConfig.js';
import { BaseAdapter } from './adapters/BaseAdapter.js';
import { LocalStorageAdapter } from './adapters/LocalStorageAdapter.js';

class LeaderboardManagerClass {
  constructor() {
    this.initialized = false;
    this.adapter = null;
    this.initPromise = null;
    this._listeners = [];
  }

  async init() {
    if (this.initialized && this.adapter) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.adapter = await this._createAdapter();

      const success = await this.adapter.init(LEADERBOARD_CONFIG.boardId);
      if (!success) {
        console.warn(`[Leaderboard] Adapter "${this.adapter.name}" failed, falling back to LocalStorage`);
        this.adapter = new LocalStorageAdapter();
        await this.adapter.init(LEADERBOARD_CONFIG.boardId);
      }

      // Wire up real-time listener if supported
      if (this.adapter.supportsRealtime && this.adapter.onScoreUpdate) {
        this.adapter.onScoreUpdate = (entries) => {
          this._listeners.forEach(fn => fn(entries));
        };
      }

      this.initialized = true;
      console.log(`[Leaderboard] Initialized with ${this.adapter.displayName}`);

      // Expose globally for dev testing
      if (shouldExposeGlobally()) {
        window.leaderboard = this;
      }

      return true;
    })();

    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async _createAdapter() {
    const platform = LEADERBOARD_CONFIG.platform;

    if (LEADERBOARD_CONFIG.debug.forceDummy) {
      console.log('[Leaderboard] Force using DummyAdapter');
      const { DummyAdapter } = await import('./adapters/DummyAdapter.js');
      return new DummyAdapter();
    }

    switch (platform) {
      case 'crazygames':
        try {
          const { CrazyGamesAdapter } = await import('./adapters/CrazyGamesAdapter.js');
          return new CrazyGamesAdapter();
        } catch (e) {
          console.log('[Leaderboard] CrazyGamesAdapter not available');
        }
        break;

      case 'poki':
        try {
          const { PokiAdapter } = await import('./adapters/PokiAdapter.js');
          return new PokiAdapter();
        } catch (e) {
          console.log('[Leaderboard] PokiAdapter not available');
        }
        break;

      case 'development':
      case 'web':
      default:
        // Use LocalStorage for development
        return new LocalStorageAdapter();
    }

    return new LocalStorageAdapter();
  }

  async _ensureInitialized() {
    if (this.initialized && this.adapter) return true;
    await this.init();
    return this.adapter != null;
  }

  // --- PUBLIC API ---

  async submit(score, meta = {}) {
    if (!await this._ensureInitialized()) {
      console.warn('[Leaderboard] submit() called before ready');
      return { success: false, isNewPersonalBest: false, rank: null };
    }

    try {
      return await this.adapter.submit(score, meta);
    } catch (err) {
      console.error('[Leaderboard] submit() failed:', err);
      return { success: false, isNewPersonalBest: false, rank: null };
    }
  }

  async fetch(limit = LEADERBOARD_CONFIG.maxEntries) {
    if (!await this._ensureInitialized()) return [];
    
    try {
      return await this.adapter.fetch(limit);
    } catch (err) {
      console.error('[Leaderboard] fetch() failed:', err);
      return [];
    }
  }

  async getPlayer() {
    if (!await this._ensureInitialized()) return null;
    
    try {
      return await this.adapter.getPlayer();
    } catch {
      return null;
    }
  }

  onUpdate(fn) {
    this._listeners.push(fn);
  }

  get adapterName() {
    return this.adapter?.displayName ?? 'None';
  }

  // --- DEV UTILITIES ---

  async reset() {
    if (import.meta.env.DEV) {
      localStorage.removeItem(LEADERBOARD_CONFIG.storageKeys.scores);
      console.log('[Leaderboard] Local board cleared');
    }
  }
}

export const LeaderboardManager = new LeaderboardManagerClass();
```

---

### 8. `src/leaderboard/ui/leaderboardUI.js`

Volcanic Print style UI.

```js
import { LeaderboardManager } from '../leaderboardManager.js';
import { State } from '../../state.js';

class LeaderboardUIClass {
  constructor() {
    this._panel = null;
    this._isOpen = false;
  }

  init() {
    this._inject();
    this._bindEvents();
  }

  async open(highlightScore = null) {
    this._isOpen = true;
    this._panel.classList.add('active');
    await this._populate(highlightScore);
  }

  close() {
    this._isOpen = false;
    this._panel.classList.remove('active');
  }

  toggle() {
    this._isOpen ? this.close() : this.open();
  }

  async showWithScore(score) {
    await this.open(score);
  }

  // --- PRIVATE ---

  _inject() {
    const html = `
      <div id="leaderboard-panel">
        <div class="lb-header">
          <div class="lb-title">SCOREBOARD</div>
          <div class="lb-adapter" id="lb-adapter-name"></div>
          <button class="lb-close" id="lb-close">X</button>
        </div>

        <div class="lb-player-row" id="lb-player-row" style="display:none">
          <span class="lb-player-rank" id="lb-player-rank">#--</span>
          <span class="lb-player-name" id="lb-player-name">YOU</span>
          <span class="lb-player-score" id="lb-player-score">--</span>
        </div>

        <div class="lb-list" id="lb-list">
          <div class="lb-loading">LOADING...</div>
        </div>

        <div class="lb-footer">
          <button class="lb-refresh" id="lb-refresh">REFRESH</button>
        </div>
      </div>
    `;
    document.getElementById('game-container').insertAdjacentHTML('beforeend', html);
    this._panel = document.getElementById('leaderboard-panel');
  }

  _bindEvents() {
    document.getElementById('lb-close').addEventListener('click', () => this.close());
    document.getElementById('lb-refresh').addEventListener('click', () => this._populate());

    // Real-time updates if supported
    LeaderboardManager.onUpdate((entries) => {
      if (this._isOpen) this._render(entries);
    });
  }

  async _populate(highlightScore = null) {
    const listEl = document.getElementById('lb-list');
    listEl.innerHTML = '<div class="lb-loading">LOADING...</div>';

    document.getElementById('lb-adapter-name').textContent = LeaderboardManager.adapterName;

    const [entries, player] = await Promise.all([
      LeaderboardManager.fetch(10),
      LeaderboardManager.getPlayer()
    ]);

    // Player row
    if (player) {
      document.getElementById('lb-player-row').style.display = 'flex';
      document.getElementById('lb-player-rank').textContent = `#${player.rank}`;
      document.getElementById('lb-player-name').textContent = player.playerName;
      document.getElementById('lb-player-score').textContent = player.score.toLocaleString();
    }

    this._render(entries, highlightScore);
  }

  _render(entries, highlightScore = null) {
    const listEl = document.getElementById('lb-list');
    if (!entries.length) {
      listEl.innerHTML = '<div class="lb-empty">NO SCORES YET.<br>BE FIRST.</div>';
      return;
    }

    listEl.innerHTML = entries.map(entry => `
      <div class="lb-entry ${entry.isCurrentPlayer ? 'is-you' : ''} ${entry.score === highlightScore ? 'is-new' : ''}">
        <span class="lb-rank">${entry.rank <= 3 ? ['1st','2nd','3rd'][entry.rank-1] : `#${entry.rank}`}</span>
        <span class="lb-name">${this._sanitize(entry.playerName)}</span>
        <span class="lb-score">${entry.score.toLocaleString()}</span>
        ${entry.isCurrentPlayer ? '<span class="lb-you-tag">YOU</span>' : ''}
      </div>
    `).join('');
  }

  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

export const LeaderboardUI = new LeaderboardUIClass();
```

---

### 9. LEADERBOARD CSS - Add to `styles.css`

```css
/* LEADERBOARD PANEL - Volcanic Print Style */

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
}
.lb-close:hover { border-color: #e85d20; color: #e8ddd0; }

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
  transition: background 0.1s;
}

.lb-entry.is-you {
  background: #2d2520;
  border-left: 3px solid #e85d20;
  padding-left: 13px;
}

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

### 10. WIRING INTO `main.js`

```js
import { LeaderboardManager } from './leaderboard/leaderboardManager.js';
import { LeaderboardUI } from './leaderboard/ui/leaderboardUI.js';

async function init() {
  // ... existing canvas setup ...

  // Init leaderboard (non-blocking)
  LeaderboardManager.init().catch(err => {
    console.warn('[Leaderboard] Init failed silently:', err);
  });

  LeaderboardUI.init();

  // ... rest of existing init ...
}
```

---

### 11. WIRING INTO GAME OVER

Find where game-over is triggered and add:

```js
import { LeaderboardManager } from './leaderboard/leaderboardManager.js';
import { LeaderboardUI } from './leaderboard/ui/leaderboardUI.js';

async function handleGameOver() {
  State.isGameOver = true;

  // Submit score (fire and forget)
  const result = await LeaderboardManager.submit(State.score, {
    heat: State.systemHeat
  });

  // Show game over screen
  document.getElementById('final-score').textContent = State.score;
  document.getElementById('game-over-screen').classList.add('active');

  // Auto-open leaderboard after brief delay
  setTimeout(() => {
    LeaderboardUI.showWithScore(State.score);
  }, 800);
}
```

---

### 12. LEADERBOARD BUTTON (during play)

Add to `index.html` in the HUD area:

```html
<button id="lb-toggle-btn">T</button>
```

```css
#lb-toggle-btn {
  position: absolute;
  top: 16px;
  right: 16px;
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

Wire in `main.js`:
```js
document.getElementById('lb-toggle-btn')?.addEventListener('click', () => {
  LeaderboardUI.toggle();
});
```

---

## CRITICAL RULES

1. **The game never imports any SDK directly.** Only `LeaderboardManager` knows adapters exist.

2. **Every adapter must return the exact same normalised shape.** `{ rank, playerName, score, isCurrentPlayer }`

3. **Init never blocks the game.** `LeaderboardManager.init()` is called without `await` in `main.js`.

4. **submit() never blocks game over.** Handle the result after showing the screen.

5. **All player names are sanitized before rendering.** The `_sanitize()` method must be used.

6. **The LocalStorageAdapter is the ground truth fallback.** If any adapter's `init()` fails, fall back to LocalStorage.

7. **Adding a new SDK requires only one new file.** Create adapter, add to `_createAdapter()` switch.

8. **`window.leaderboard` exposed in dev** for console testing.

---

## DELIVERY CHECKLIST

- [ ] `LeaderboardManager.init()` runs on boot without blocking
- [ ] Auto-detection correctly picks up platform from config
- [ ] Falls back to LocalStorageAdapter silently when no SDK present
- [ ] `LocalStorageAdapter` generates persistent player name on first run
- [ ] `submit()` only stores if score is a new personal best
- [ ] `fetch(10)` returns normalised `LeaderboardEntry[]`
- [ ] Leaderboard panel opens after game over with 800ms delay
- [ ] Current player's entry highlighted in the list
- [ ] New score entry flashes amber on first render
- [ ] Panel shows adapter name (CrazyGames / Local / Poki etc)
- [ ] Refresh button re-fetches live data
- [ ] Close button works
- [ ] Toggle button during play toggles panel
- [ ] All player names sanitized - no XSS possible
- [ ] Panel styled in Volcanic Print - hard shadows, Bebas Neue
- [ ] `window.leaderboard` exposed in dev for console testing
- [ ] `leaderboard.reset()` available for dev: clears localStorage board

---

## PHASE PLAN

### Phase 1: Core Implementation (Current)
- `leaderboardConfig.js`
- `BaseAdapter.js`
- `LocalStorageAdapter.js`
- `leaderboardManager.js`
- `leaderboardUI.js`
- CSS styles
- Wire into game-over

### Phase 2: Platform Adapters
- `DummyAdapter.js` (for testing)
- `CrazyGamesAdapter.js` (when deploying to CrazyGames)
- `PokiAdapter.js` (when deploying to Poki)

### Phase 3: Competition Features (FUTURE - COMMENTED)
<!-- 
- Weekly/daily leaderboards
- Friend leaderboards
- Custom leaderboard boards per game mode
- Achievement integration
-->
