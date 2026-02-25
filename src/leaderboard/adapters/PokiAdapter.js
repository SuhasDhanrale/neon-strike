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