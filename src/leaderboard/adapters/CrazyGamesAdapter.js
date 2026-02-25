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