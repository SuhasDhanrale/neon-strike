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