import { LEADERBOARD_CONFIG, shouldExposeGlobally } from './leaderboardConfig.js';
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
