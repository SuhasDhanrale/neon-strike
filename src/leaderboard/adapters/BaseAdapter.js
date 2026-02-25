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
     * @param {string} boardId - The leaderboard ID
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