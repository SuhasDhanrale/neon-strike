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
