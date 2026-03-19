import { BaseAdapter } from './BaseAdapter.js';
import { LEADERBOARD_CONFIG } from '../leaderboardConfig.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';

const CRAZYGAMES_SDK_SCRIPT_ID = 'crazygames-sdk-v3';
const CRAZYGAMES_SDK_SCRIPT_SRC = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const SDK_READY_TIMEOUT_MS = 15000;
const HAPPY_TIME_COOLDOWN_MS = 30000;
const CLOUD_BEST_SCORE_KEY = 'neonStrike_cg_bestScore';
const CLOUD_PLAYER_NAME_KEY = 'neonStrike_cg_playerName';
const LEADERBOARD_ENCRYPTION_KEY = (import.meta.env.VITE_CG_LB_ENCRYPTION_KEY || '').trim();

export class CrazyGamesAdapter extends BaseAdapter {
    constructor() {
        super('CrazyGames');
        this.sdk = null;
        this.user = null;
        this.environment = 'disabled';
        this.localAdapter = null;
        this.personalBest = 0;
        this.lastHappyTimeAt = 0;
    }

    async init(boardId) {
        this.boardId = boardId;
        this.localAdapter = new LocalStorageAdapter();
        await this.localAdapter.init(boardId);

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

            await this._loadCurrentUser();
            this._syncLocalIdentityFromUser();
            await this._hydrateCloudState();

            this.initialized = true;
            this.log('CrazyGames SDK initialized');
            return true;
        } catch (error) {
            this.log('Init failed', { error: error.message || String(error) });
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

    async _loadCurrentUser() {
        this.user = null;

        if (!this.sdk?.user || typeof this.sdk.user.getUser !== 'function') {
            return;
        }

        const accountAvailable = this._isUserAccountAvailable();
        if (accountAvailable === false) {
            this.log('User account unavailable in current context');
            return;
        }

        try {
            this.user = await this.sdk.user.getUser();
            this.log('User retrieved', {
                username: this.user?.username,
                userId: this.user?.userId || this.user?.id
            });
        } catch (error) {
            this.user = null;
            this.log('No user session (guest mode)', { error: error?.message });
        }
    }

    _isUserAccountAvailable() {
        const accountAvailability = this.sdk?.user?.isUserAccountAvailable;
        if (typeof accountAvailability === 'function') {
            try {
                return !!accountAvailability();
            } catch {
                return null;
            }
        }
        if (typeof accountAvailability === 'boolean') {
            return accountAvailability;
        }
        return null;
    }

    _syncLocalIdentityFromUser() {
        if (!this.localAdapter || !this.user) return;

        const username = this.user.username || this.user.displayName;
        const userId = this.user.userId || this.user.id || username;
        if (!username || !userId) return;

        this.localAdapter.playerName = username;
        this.localAdapter.playerId = `cg_${userId}`;

        // Keep LocalStorageAdapter's persisted identity in sync.
        try {
            localStorage.setItem(LEADERBOARD_CONFIG.storageKeys.playerName, username);
            localStorage.setItem(LEADERBOARD_CONFIG.storageKeys.playerId, `cg_${userId}`);
        } catch {
            // Ignore persistence errors and continue using in-memory identity.
        }
    }

    async _hydrateCloudState() {
        if (!this._isDataModuleAvailable()) return;

        try {
            const [bestFromCloud, nameFromCloud] = await Promise.all([
                this.sdk.data.getItem(CLOUD_BEST_SCORE_KEY),
                this.sdk.data.getItem(CLOUD_PLAYER_NAME_KEY)
            ]);

            const parsedBest = Number(bestFromCloud || 0);
            if (Number.isFinite(parsedBest) && parsedBest > 0) {
                this.personalBest = parsedBest;
                await this.localAdapter.submit(parsedBest, { source: 'cg-data-sync' });
            }

            if (!this.user && typeof nameFromCloud === 'string' && nameFromCloud.trim()) {
                this.localAdapter.playerName = nameFromCloud.trim();
                try {
                    localStorage.setItem(LEADERBOARD_CONFIG.storageKeys.playerName, nameFromCloud.trim());
                } catch {
                    // Non-fatal local persistence failure.
                }
            }
        } catch (error) {
            this.log('Cloud data read failed, continuing with local fallback', {
                code: error?.code,
                message: error?.message
            });
        }
    }

    async _persistCloudState(score) {
        if (!this._isDataModuleAvailable()) return;

        const name = this.user?.username || this.localAdapter?.playerName || null;

        try {
            await this.sdk.data.setItem(CLOUD_BEST_SCORE_KEY, score);
            if (name) {
                await this.sdk.data.setItem(CLOUD_PLAYER_NAME_KEY, name);
            }
        } catch (error) {
            this.log('Cloud data write failed (non-fatal)', {
                code: error?.code,
                message: error?.message
            });
        }
    }

    async submit(score, meta = {}) {
        // Always maintain local fallback data for in-game UI.
        const localResult = await this.localAdapter.submit(score, meta);

        if (!this._isSDKAvailable()) {
            this.log('SDK unavailable, kept local submit only', { score });
            return localResult;
        }

        const isNewPersonalBest = localResult.isNewPersonalBest || score > this.personalBest;
        if (isNewPersonalBest) {
            this.personalBest = score;
            await this._persistCloudState(score);
            // Note: happytime is NOT called here — it should only fire on gear unlock
            // (handled via 'celebration:gear_unlocked' EventBus in main.js)
        }

        let remoteSubmitSuccess = false;

        // Preferred path: User module submitScore (MVP leaderboard integration).
        if (this._canUseMvpScoreSubmit()) {
            try {
                const encryptedScore = await this._encryptScore(score, LEADERBOARD_ENCRYPTION_KEY);
                await this.sdk.user.submitScore({ encryptedScore });
                remoteSubmitSuccess = true;
            } catch (error) {
                this.log('MVP score submit failed', {
                    code: error?.code,
                    message: error?.message
                });
            }
        } else if (this._canUseLegacyRecordScore()) {
            // Backward-compatible path for legacy SDK leaderboard APIs.
            try {
                await this.sdk.leaderboard.recordScore(this.boardId, score);
                remoteSubmitSuccess = true;
            } catch (error) {
                this.log('Legacy recordScore failed', {
                    code: error?.code,
                    message: error?.message
                });
            }
        } else {
            this.log('No remote score API available; local submit retained', {
                mvpEnabled: !!LEADERBOARD_ENCRYPTION_KEY
            });
        }

        return {
            success: localResult.success || remoteSubmitSuccess,
            isNewPersonalBest,
            rank: localResult.rank
        };
    }

    async fetch(limit = 10) {
        if (!this._isSDKAvailable()) {
            return this.localAdapter.fetch(limit);
        }

        if (this._canUseLegacyFetchScoreboard()) {
            try {
                const result = await this.sdk.leaderboard.getScoreboard(this.boardId, limit);
                const entries = this._normalizeLegacyScoreboard(result);
                if (entries.length) {
                    return entries.slice(0, limit);
                }
            } catch (error) {
                this.log('Legacy fetch failed, using local cache', {
                    code: error?.code,
                    message: error?.message
                });
            }
        }

        return this.localAdapter.fetch(limit);
    }

    async getPlayer() {
        if (!this._isSDKAvailable()) {
            return this.localAdapter.getPlayer();
        }

        if (this._canUseLegacyGetUserScore()) {
            try {
                const result = await this.sdk.leaderboard.getUserScore(this.boardId);
                if (result) {
                    const localPlayer = await this.localAdapter.getPlayer();
                    return {
                        rank: Number.isFinite(result.rank) ? result.rank : (localPlayer?.rank || 1),
                        score: Number(result.score || 0),
                        playerName: this._getCurrentPlayerName()
                    };
                }
            } catch (error) {
                this.log('Legacy getUserScore failed, using local cache', {
                    code: error?.code,
                    message: error?.message
                });
            }
        }

        const localPlayer = await this.localAdapter.getPlayer();
        if (localPlayer) {
            localPlayer.playerName = this._getCurrentPlayerName();
            return localPlayer;
        }

        if (this.personalBest > 0) {
            return {
                rank: 1,
                score: this.personalBest,
                playerName: this._getCurrentPlayerName()
            };
        }

        return null;
    }

    _normalizeLegacyScoreboard(result) {
        const rows = Array.isArray(result)
            ? result
            : (Array.isArray(result?.entries) ? result.entries : []);

        return rows.map((entry, i) => {
            const entryUser = entry?.user || {};
            const username = entryUser.username || entry?.username || entry?.playerName || 'Guest';
            const score = Number(entry?.score || 0);

            return {
                rank: Number.isFinite(entry?.rank) ? entry.rank : i + 1,
                playerName: username,
                score,
                isCurrentPlayer: this._isCurrentUser(entryUser, username)
            };
        });
    }

    _isCurrentUser(entryUser, fallbackName) {
        if (!this.user) return false;

        const myId = this.user.userId || this.user.id;
        if (myId && entryUser?.id) {
            return String(myId) === String(entryUser.id);
        }

        const myName = this.user.username || this.user.displayName;
        const entryName = entryUser?.username || fallbackName;
        return !!myName && !!entryName && String(myName) === String(entryName);
    }

    _getCurrentPlayerName() {
        return this.user?.username ||
            this.user?.displayName ||
            this.localAdapter?.playerName ||
            'Guest';
    }

    _reportHappyTimeThrottled() {
        if (!this._isSDKAvailable() || !this.sdk?.game) return;

        const now = Date.now();
        if (now - this.lastHappyTimeAt < HAPPY_TIME_COOLDOWN_MS) return;

        try {
            if (typeof this.sdk.game.happytime === 'function') {
                this.sdk.game.happytime();
                this.lastHappyTimeAt = now;
            } else if (typeof this.sdk.game.happyTime === 'function') {
                this.sdk.game.happyTime();
                this.lastHappyTimeAt = now;
            }
        } catch (error) {
            this.log('happytime failed', { code: error?.code, message: error?.message });
        }
    }

    _canUseMvpScoreSubmit() {
        return !!LEADERBOARD_ENCRYPTION_KEY &&
            this._isUserAccountAvailable() !== false &&
            typeof this.sdk?.user?.submitScore === 'function';
    }

    _canUseLegacyRecordScore() {
        return typeof this.sdk?.leaderboard?.recordScore === 'function';
    }

    _canUseLegacyFetchScoreboard() {
        return typeof this.sdk?.leaderboard?.getScoreboard === 'function';
    }

    _canUseLegacyGetUserScore() {
        return typeof this.sdk?.leaderboard?.getUserScore === 'function';
    }

    _isDataModuleAvailable() {
        return this._isSDKAvailable() &&
            !!this.sdk?.data &&
            typeof this.sdk.data.getItem === 'function' &&
            typeof this.sdk.data.setItem === 'function';
    }

    _isSDKAvailable() {
        return this.sdk &&
            (this.environment === 'local' || this.environment === 'crazygames');
    }

    async _encryptScore(score, base64Key) {
        const cryptoApi = globalThis.crypto;
        if (!cryptoApi?.subtle) {
            throw new Error('Web Crypto API unavailable for score encryption');
        }

        const normalized = base64Key.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const keyBytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0));

        if (![16, 24, 32].includes(keyBytes.length)) {
            throw new Error('Invalid leaderboard encryption key length');
        }

        const cryptoKey = await cryptoApi.subtle.importKey(
            'raw',
            keyBytes,
            'AES-GCM',
            false,
            ['encrypt']
        );

        const iv = cryptoApi.getRandomValues(new Uint8Array(12));
        const plain = new TextEncoder().encode(String(score));
        const encrypted = new Uint8Array(
            await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plain)
        );

        const packed = new Uint8Array(iv.length + encrypted.length);
        packed.set(iv);
        packed.set(encrypted, iv.length);

        let asString = '';
        for (let i = 0; i < packed.length; i++) {
            asString += String.fromCharCode(packed[i]);
        }
        return btoa(asString);
    }

    get displayName() { return 'CrazyGames'; }
}
