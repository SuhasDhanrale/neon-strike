/**
 * PokiAdapter - Poki SDK v2 Integration
 * 
 * Poki SDK documentation: https://sdk.poki.com/
 * 
 * SDK Features:
 * - commercialBreak() for interstitial ads (Poki decides when to show)
 * - rewardedBreak() for rewarded video ads
 * - gameplayStart() / gameplayStop() for game state tracking
 * - gameLoadingFinished() to signal loading complete
 * - URL utilities for params and sharing
 * 
 * Important behaviors:
 * - Not every commercialBreak() triggers an ad (Poki controls timing)
 * - rewardedBreak() resets the ad timer
 * - Always call gameplayStop() before ads, gameplayStart() after
 * - SDK continues to work even if init() fails
 */

import { BaseAdapter } from './BaseAdapter.js';

const POKI_SDK_SCRIPT_ID = 'poki-sdk-v2';
const POKI_SDK_SCRIPT_SRC = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
const POKI_SDK_READY_TIMEOUT_MS = 15000;

export class PokiAdapter extends BaseAdapter {
    constructor() {
        super('PokiAdapter');
        this.poki = null;
        this.gameplayActive = false;
        this.initSuccessful = false;
    }

    /**
     * Initialize the Poki SDK
     * Note: Even if init fails, the SDK can still be used (catch and continue)
     * @returns {Promise<boolean>} Whether initialization was successful
     */
    async init() {
        this.log('Initializing Poki SDK v2...');

        try {
            await this._ensureSdkScript();

            // Check if Poki SDK is available (loaded from their CDN)
            if (typeof PokiSDK === 'undefined') {
                this.log('Poki SDK not found - are you on poki.com?');
                return false;
            }

            // Initialize with proper error handling
            try {
                await PokiSDK.init();
                this.initSuccessful = true;
                this.log('Poki SDK initialized successfully');
            } catch (initError) {
                // SDK says to catch and continue - init failing doesn't mean SDK won't work
                this.log('Poki SDK init had an error, but continuing anyway', { error: initError });
                this.initSuccessful = false;
            }

            this.poki = PokiSDK;
            this.initialized = true;
            return true;
        } catch (error) {
            this.log('Failed to initialize Poki SDK', { error: error.message });
            return false;
        }
    }

    async _ensureSdkScript() {
        if (window.PokiSDK) return;

        const existing = document.getElementById(POKI_SDK_SCRIPT_ID);
        if (!existing) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.id = POKI_SDK_SCRIPT_ID;
                script.src = POKI_SDK_SCRIPT_SRC;
                script.async = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load Poki SDK script'));
                document.head.appendChild(script);
            });
        }

        const startedAt = Date.now();
        while (Date.now() - startedAt < POKI_SDK_READY_TIMEOUT_MS) {
            if (window.PokiSDK) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Check if SDK is available for use
     */
    _isSDKAvailable() {
        return this.initialized && this.poki;
    }

    /**
     * Show a commercial break (interstitial ad)
     * Note: Poki decides whether to actually show an ad based on timing
     * 
     * @param {string} placement - Placement identifier for analytics
     * @param {Function|null} onAdStart - Optional callback when ad starts (pause audio/game here)
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async showInterstitial(placement, onAdStart = null) {
        if (!this._isSDKAvailable()) {
            return { success: false, error: 'Poki not available' };
        }

        try {
            // IMPORTANT: Stop gameplay before ad
            this.reportGameplayStop();

            // commercialBreak accepts a callback for when ad starts
            await this.poki.commercialBreak(() => {
                this.log('Commercial break started (ad may or may not show)');
                if (onAdStart && typeof onAdStart === 'function') {
                    onAdStart();
                }
            });

            this.log('Commercial break completed', { placement });
            return { success: true };
        } catch (error) {
            this.log('Commercial break failed', { error: error.message || error });
            return { success: false, error: error.message || 'Ad failed' };
        } finally {
            // IMPORTANT: Always resume gameplay after ad (success or fail)
            this.reportGameplayStart();
        }
    }

    /**
     * Show a rewarded video ad
     * Always shows an ad (unlike commercialBreak which Poki controls)
     * 
     * @param {string} placement - Placement identifier for analytics
     * @param {Object} options - Optional configuration
     * @param {string} options.size - Ad size: 'small', 'medium', or 'large' (default: 'medium')
     * @param {Function} options.onAdStart - Callback when ad starts (pause audio/game here)
     * @returns {Promise<{success: boolean, rewarded: boolean, error?: string}>}
     */
    async showRewardedAd(placement, options = {}) {
        if (!this._isSDKAvailable()) {
            return { success: false, rewarded: false, error: 'Poki not available' };
        }

        const { size = 'medium', onAdStart = null } = options;

        try {
            // IMPORTANT: Stop gameplay before ad
            this.reportGameplayStop();

            // Build options for rewardedBreak
            const rewardedOptions = {
                size: size
            };

            // Add onStart callback if provided
            if (onAdStart && typeof onAdStart === 'function') {
                rewardedOptions.onStart = () => {
                    this.log('Rewarded ad started');
                    onAdStart();
                };
            }

            // rewardedBreak returns true if user watched the whole ad
            const rewarded = await this.poki.rewardedBreak(rewardedOptions);

            this.log('Rewarded break completed', { placement, rewarded, size });
            return { success: true, rewarded: !!rewarded };
        } catch (error) {
            this.log('Rewarded break failed', { error: error.message || error });
            return { success: false, rewarded: false, error: error.message || 'Ad failed' };
        } finally {
            // IMPORTANT: Always resume gameplay after ad (success or fail)
            this.reportGameplayStart();
        }
    }

    /**
     * Show a banner ad
     * Note: Poki doesn't support traditional banner ads
     * @returns {Promise<{success: boolean, error: string}>}
     */
    async showBanner(position) {
        this.log('Banner ads not supported on Poki platform');
        return { success: false, error: 'Not supported on Poki' };
    }

    /**
     * Hide banner ad
     * No-op on Poki since banners aren't supported
     */
    async hideBanner() {
        // No-op - Poki doesn't have banners
    }

    /**
     * Check if an ad is available
     * Poki always has ads available when SDK is initialized
     */
    isAdAvailable(adType) {
        return this._isSDKAvailable();
    }

    /**
     * Preload an ad
     * Poki handles ad loading internally
     */
    async preloadAd(adType) {
        return this._isSDKAvailable();
    }

    // ==================== GAME LIFECYCLE EVENTS ====================

    /**
     * Signal that game loading is complete
     * Call this after all assets are loaded and game is ready to play
     * Required by Poki for proper analytics
     */
    reportLoadingFinished() {
        if (this._isSDKAvailable()) {
            try {
                this.poki.gameLoadingFinished();
                this.log('Game loading finished');
            } catch (error) {
                this.log('gameLoadingFinished failed', { error: error.message });
            }
        }
    }

    /**
     * Signal that gameplay has started
     * Call when:
     * - Player starts playing (after menus)
     * - After ads complete
     * - After unpausing
     * 
     * Prevents multiple calls without gameplayStop() between them
     */
    reportGameplayStart() {
        if (this._isSDKAvailable() && !this.gameplayActive) {
            try {
                this.poki.gameplayStart();
                this.gameplayActive = true;
                this.log('Gameplay started');
            } catch (error) {
                this.log('gameplayStart failed', { error: error.message });
            }
        } else if (this.gameplayActive) {
            this.log('gameplayStart called but gameplay already active - ignoring', {}, 'warn');
        }
    }

    /**
     * Signal that gameplay has stopped
     * Call when:
     * - Before showing ads (REQUIRED)
     * - When pausing the game
     * - When opening menus
     * - When player stops actively playing
     */
    reportGameplayStop() {
        if (this._isSDKAvailable() && this.gameplayActive) {
            try {
                this.poki.gameplayStop();
                this.gameplayActive = false;
                this.log('Gameplay stopped');
            } catch (error) {
                this.log('gameplayStop failed', { error: error.message });
            }
        } else if (!this.gameplayActive) {
            this.log('gameplayStop called but gameplay not active - ignoring', {}, 'warn');
        }
    }

    // ==================== URL UTILITIES ====================

    /**
     * Get a URL parameter value
     * Useful for reading game parameters passed in the URL
     * 
     * @param {string} paramName - Name of the URL parameter
     * @returns {string|null} Parameter value or null if not found
     * 
     * @example
     * // URL: game.poki.com/game?level=5
     * const level = adapter.getURLParam('level'); // "5"
     */
    getURLParam(paramName) {
        if (!this._isSDKAvailable()) {
            // Fallback to native URL parsing
            const params = new URLSearchParams(window.location.search);
            return params.get(paramName);
        }

        try {
            return this.poki.getURLParam(paramName);
        } catch (error) {
            this.log('getURLParam failed', { paramName, error: error.message });
            return null;
        }
    }

    /**
     * Create a shareable URL with custom parameters
     * The returned URL will include Poki tracking and the custom params
     * 
     * @param {Object} params - Key-value pairs to include in the URL
     * @returns {Promise<string|null>} Shareable URL or null on failure
     * 
     * @example
     * const url = await adapter.shareableURL({ level: 5, score: 1000 });
     * // Returns: "https://poki.com/game?level=5&score=1000&..."
     */
    async shareableURL(params = {}) {
        if (!this._isSDKAvailable()) {
            this.log('shareableURL requires Poki SDK');
            return null;
        }

        try {
            const url = await this.poki.shareableURL(params);
            this.log('Generated shareable URL', { params });
            return url;
        } catch (error) {
            this.log('shareableURL failed', { error: error.message });
            return null;
        }
    }

    /**
     * Move the Poki pill position on mobile devices
     * The pill is Poki's branding element that appears on the game
     * 
     * @param {number} topPercent - Vertical position as percentage (0-100)
     * @param {number} topPx - Additional pixel offset from top
     * 
     * @example
     * // Move pill to 10% from top with 20px additional offset
     * adapter.movePill(10, 20);
     */
    movePill(topPercent, topPx = 0) {
        if (!this._isSDKAvailable()) {
            return;
        }

        try {
            this.poki.movePill(topPercent, topPx);
            this.log('Pill position updated', { topPercent, topPx });
        } catch (error) {
            this.log('movePill failed', { error: error.message });
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Check if gameplay is currently active
     * @returns {boolean}
     */
    isGameplayActive() {
        return this.gameplayActive;
    }

    /**
     * Check if SDK initialization was successful
     * Note: SDK can still work even if init failed
     * @returns {boolean}
     */
    wasInitSuccessful() {
        return this.initSuccessful;
    }

    /**
     * Override log method to support log levels
     */
    log(event, data = {}, level = 'log') {
        const message = `[${this.name}] ${event}`;

        switch (level) {
            case 'warn':
                console.warn(message, data);
                break;
            case 'error':
                console.error(message, data);
                break;
            default:
                console.log(message, data);
        }
    }
}
