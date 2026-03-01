/**
 * CrazyGamesAdapter - CrazyGames SDK v3 Integration
 * 
 * CrazyGames SDK v3 documentation: https://docs.crazygames.com/
 * 
 * SDK Features:
 * - requestAd('midgame') for interstitial ads
 * - requestAd('rewarded') for rewarded ads
 * - requestBanner() for banner ads
 * - Game lifecycle events (loadingStart/Stop, gameplayStart/Stop)
 * 
 * Environment modes:
 * - 'local': Testing on localhost (shows overlay text)
 * - 'crazygames': Production on crazygames.com (real ads)
 * - 'disabled': Other domains (SDK throws errors)
 */

import { BaseAdapter } from './BaseAdapter.js';
import { SoundManager } from '../../src/systems/SoundManager.js';

const CRAZYGAMES_SDK_SCRIPT_ID = 'crazygames-sdk-v3';
const CRAZYGAMES_SDK_SCRIPT_SRC = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const CRAZYGAMES_SDK_READY_TIMEOUT_MS = 15000;
const CRAZYGAMES_AD_TIMEOUT_MS = 45000;
const CRAZYGAMES_BANNER_COOLDOWN_MS = 30000;

export class CrazyGamesAdapter extends BaseAdapter {
    constructor() {
        super('CrazyGamesAdapter');
        this.sdk = null;
        this.environment = 'disabled';
        this.isGameplayActive = false;
        this.activeBanners = new Map();
        this.adRequestInProgress = false;
        this.adInProgress = false;
        this.resumeGameplayAfterAd = false;
        this.settingsListener = null;
        this.bannerLastRequestAt = new Map();
        this.currentSettings = {
            muteAudio: false,
            disableChat: false
        };
    }

    async init() {
        this.log('Initializing CrazyGames SDK v3...');

        try {
            await this._ensureSdkScript();

            // Check if CrazyGames SDK is available
            if (typeof window.CrazyGames === 'undefined' || !window.CrazyGames.SDK) {
                this.log('CrazyGames SDK not found - are you on crazygames.com or localhost?');
                return false;
            }

            // Initialize the SDK (required for v3)
            this.sdk = window.CrazyGames.SDK;
            await this.sdk.init();

            // Check environment
            this.environment = this.sdk.environment;
            this.log(`Environment: ${this.environment}`);

            // Check if SDK is usable in this environment
            if (this.environment === 'disabled') {
                this.log('SDK is disabled in this environment. Ads will not work.');
                this.initialized = false;
                return false;
            }

            this._setupSettingsListener();
            this._applyGameSettings(this.sdk.game?.settings);

            this.initialized = true;
            this.log('CrazyGames SDK v3 initialized successfully');
            return true;
        } catch (error) {
            this.log('Failed to initialize CrazyGames SDK', {
                code: error.code || 'unknown',
                message: error.message || error
            });
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
                script.onerror = () => reject(new Error('Failed to load CrazyGames SDK script'));
                document.head.appendChild(script);
            });
        }

        const startedAt = Date.now();
        while (Date.now() - startedAt < CRAZYGAMES_SDK_READY_TIMEOUT_MS) {
            if (window.CrazyGames && window.CrazyGames.SDK) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    _setupSettingsListener() {
        if (!this.sdk?.game || typeof this.sdk.game.addSettingsChangeListener !== 'function') {
            return;
        }

        if (this.settingsListener && typeof this.sdk.game.removeSettingsChangeListener === 'function') {
            this.sdk.game.removeSettingsChangeListener(this.settingsListener);
        }

        this.settingsListener = (newSettings) => {
            this._applyGameSettings(newSettings);
            this.log('Game settings updated', newSettings || {});
        };

        this.sdk.game.addSettingsChangeListener(this.settingsListener);
    }

    _applyGameSettings(newSettings = null) {
        if (newSettings && typeof newSettings === 'object') {
            this.currentSettings = {
                ...this.currentSettings,
                ...newSettings
            };
        }

        const forceMuted = !!this.currentSettings.muteAudio || this.adInProgress;
        SoundManager.setExternalMuted(forceMuted);
    }

    /**
     * Check if SDK is available and in a valid environment
     */
    _isSDKAvailable() {
        return this.initialized &&
            this.sdk &&
            (this.environment === 'local' || this.environment === 'crazygames');
    }

    async showInterstitial(placement) {
        return this._requestVideoAd('midgame', placement);
    }

    async showRewardedAd(placement) {
        const result = await this._requestVideoAd('rewarded', placement);
        if (result.success) {
            return { success: true, rewarded: true };
        }
        return { success: false, rewarded: false, error: result.error, errorCode: result.errorCode };
    }

    async _requestVideoAd(adType, placement) {
        if (!this._isSDKAvailable()) {
            return { success: false, error: 'CrazyGames SDK not available' };
        }

        if (this.adRequestInProgress) {
            return { success: false, error: 'Another ad request is already in progress', errorCode: 'requestInProgress' };
        }

        this.adRequestInProgress = true;

        return await new Promise((resolve) => {
            let settled = false;
            let timeoutId = null;

            const finalize = (result) => {
                if (settled) return;
                settled = true;

                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                this.adRequestInProgress = false;
                this._handleAdEnded();
                resolve(result);
            };

            const callbacks = {
                adStarted: () => {
                    this._handleAdStarted(adType, placement);
                },
                adFinished: () => {
                    this.log(`${adType} ad finished`, { placement });
                    finalize({ success: true });
                },
                adError: (errorData) => {
                    const formatted = this._formatAdError(errorData);
                    this.log(`${adType} ad failed`, {
                        placement,
                        code: formatted.code,
                        message: formatted.message
                    });
                    finalize({
                        success: false,
                        error: formatted.message,
                        errorCode: formatted.code
                    });
                }
            };

            timeoutId = setTimeout(() => {
                this.log(`${adType} ad timed out`, { placement, timeoutMs: CRAZYGAMES_AD_TIMEOUT_MS });
                finalize({
                    success: false,
                    error: 'Ad request timed out',
                    errorCode: 'timeout'
                });
            }, CRAZYGAMES_AD_TIMEOUT_MS);

            try {
                this.sdk.ad.requestAd(adType, callbacks);
            } catch (error) {
                const formatted = this._formatAdError(error);
                this.log(`${adType} ad request threw`, {
                    placement,
                    code: formatted.code,
                    message: formatted.message
                });
                finalize({
                    success: false,
                    error: formatted.message,
                    errorCode: formatted.code
                });
            }
        });
    }

    _handleAdStarted(adType, placement) {
        if (!this.adRequestInProgress || this.adInProgress) {
            return;
        }

        this.adInProgress = true;
        this.resumeGameplayAfterAd = this.isGameplayActive;
        this.reportGameplayStop();
        this._applyGameSettings();

        this.log(`${adType} ad started`, {
            placement,
            resumeGameplayAfterAd: this.resumeGameplayAfterAd
        });
    }

    _handleAdEnded() {
        this.adInProgress = false;
        this._applyGameSettings();

        if (this.resumeGameplayAfterAd) {
            this.reportGameplayStart();
        }

        this.resumeGameplayAfterAd = false;
    }

    _formatAdError(errorData) {
        if (errorData && typeof errorData === 'object') {
            return {
                code: errorData.code || 'other',
                message: errorData.message || 'Ad failed'
            };
        }

        if (typeof errorData === 'string') {
            return { code: 'other', message: errorData };
        }

        return { code: 'other', message: 'Ad failed' };
    }

    async showBanner(position = 'bottom') {
        if (!this._isSDKAvailable()) {
            return { success: false, error: 'CrazyGames SDK not available' };
        }

        try {
            const containerId = `crazygames-banner-${position}`;
            let container = document.getElementById(containerId);
            const { width, height } = this._pickStaticBannerSize();

            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                container.style.cssText = `
                    position: fixed;
                    left: 50%;
                    transform: translateX(-50%);
                    ${position === 'top' ? 'top: 0;' : 'bottom: 0;'}
                    width: ${width}px;
                    height: ${height}px;
                    z-index: 99998;
                `;
                document.body.appendChild(container);
            } else {
                container.style.width = `${width}px`;
                container.style.height = `${height}px`;
            }

            const now = Date.now();
            const lastRequestAt = this.bannerLastRequestAt.get(containerId) || 0;
            if (now - lastRequestAt < CRAZYGAMES_BANNER_COOLDOWN_MS) {
                this.activeBanners.set(position, { container, containerId, kind: 'static' });
                this.log('Banner request skipped due to cooldown', { position, cooldownMs: CRAZYGAMES_BANNER_COOLDOWN_MS });
                return { success: true };
            }

            // Static banner path (preferred on CrazyGames).
            await this.sdk.banner.requestBanner({ id: containerId, width, height });
            this.bannerLastRequestAt.set(containerId, now);
            this.activeBanners.set(position, { container, containerId, kind: 'static' });
            this.log('Static banner displayed', { position, width, height });

            return { success: true };
        } catch (error) {
            // Fallback: responsive banners can recover from size visibility issues.
            if (typeof this.sdk?.banner?.requestResponsiveBanner === 'function') {
                const containerId = `crazygames-banner-${position}`;
                try {
                    await this.sdk.banner.requestResponsiveBanner(containerId);
                    this.bannerLastRequestAt.set(containerId, Date.now());
                    const container = document.getElementById(containerId);
                    if (container) {
                        this.activeBanners.set(position, { container, containerId, kind: 'responsive' });
                    }
                    this.log('Responsive banner fallback displayed', { position });
                    return { success: true };
                } catch (fallbackError) {
                    this.log('Responsive banner fallback failed', {
                        code: fallbackError?.code || 'unknown',
                        message: fallbackError?.message || fallbackError
                    });
                }
            }

            this.log('Banner request failed', { code: error?.code || 'unknown', message: error?.message || error });
            return { success: false, error: error?.message || 'Banner failed' };
        }
    }

    _pickStaticBannerSize() {
        const viewportWidth = window.innerWidth || 320;

        if (viewportWidth >= 970) return { width: 970, height: 250 };
        if (viewportWidth >= 728) return { width: 728, height: 90 };
        if (viewportWidth >= 468) return { width: 468, height: 60 };
        if (viewportWidth >= 320) return { width: 320, height: 50 };
        return { width: 300, height: 250 };
    }

    async hideBanner(position = null) {
        try {
            if (position) {
                const bannerData = this.activeBanners.get(position);
                if (bannerData) {
                    if (this.sdk?.banner?.clearBanner) {
                        try {
                            await this.sdk.banner.clearBanner(bannerData.containerId);
                        } catch (error) {
                            this.log('clearBanner failed', { position, code: error?.code, message: error?.message });
                        }
                    }
                    bannerData.container.remove();
                    this.activeBanners.delete(position);
                    this.log('Banner hidden', { position });
                }
            } else {
                if (this.sdk?.banner?.clearAllBanners) {
                    try {
                        await this.sdk.banner.clearAllBanners();
                    } catch (error) {
                        this.log('clearAllBanners failed', { code: error?.code, message: error?.message });
                    }
                } else if (this.sdk?.banner?.clearBanner) {
                    for (const [, bannerData] of this.activeBanners) {
                        try {
                            await this.sdk.banner.clearBanner(bannerData.containerId);
                        } catch (error) {
                            this.log('clearBanner failed', { id: bannerData.containerId, code: error?.code, message: error?.message });
                        }
                    }
                }

                for (const [pos, bannerData] of this.activeBanners) {
                    bannerData.container.remove();
                }
                this.activeBanners.clear();
                this.log('All banners hidden');
            }
        } catch (error) {
            this.log('Hide banner failed', {
                code: error.code || 'unknown',
                message: error.message || error
            });
        }
    }

    isAdAvailable(adType) {
        return this._isSDKAvailable();
    }

    async preloadAd(adType) {
        // CrazyGames handles ad loading internally
        return this._isSDKAvailable();
    }

    // ==================== GAME LIFECYCLE EVENTS ====================

    /**
     * Report that the game is loading
     * Call when game starts loading assets
     */
    reportLoadingStart() {
        if (this._isSDKAvailable()) {
            try {
                this.sdk.game.loadingStart();
                this.log('Loading started');
            } catch (error) {
                this.log('loadingStart failed', { code: error.code, message: error.message });
            }
        }
    }

    /**
     * Report that loading is complete
     * Call when game has finished loading and is ready to play
     */
    reportLoadingStop() {
        if (this._isSDKAvailable()) {
            try {
                this.sdk.game.loadingStop();
                this.log('Loading stopped');
            } catch (error) {
                this.log('loadingStop failed', { code: error.code, message: error.message });
            }
        }
    }

    /**
     * Report that gameplay has started
     * Call when player starts playing (after menus, after ads)
     */
    reportGameplayStart() {
        if (this._isSDKAvailable() && !this.isGameplayActive) {
            try {
                this.sdk.game.gameplayStart();
                this.isGameplayActive = true;
                this.log('Gameplay started');
            } catch (error) {
                this.log('gameplayStart failed', { code: error.code, message: error.message });
            }
        }
    }

    /**
     * Report that gameplay has stopped
     * Call when player pauses, opens menu, or before showing ads
     */
    reportGameplayStop() {
        if (this._isSDKAvailable() && this.isGameplayActive) {
            try {
                this.sdk.game.gameplayStop();
                this.isGameplayActive = false;
                this.log('Gameplay stopped');
            } catch (error) {
                this.log('gameplayStop failed', { code: error.code, message: error.message });
            }
        }
    }

    /**
     * Report a happy/positive moment in the game
     * Call during achievements, high scores, level completions, etc.
     * CrazyGames uses this for analytics and player engagement metrics
     */
    reportHappyTime() {
        if (this._isSDKAvailable()) {
            try {
                if (typeof this.sdk.game.happytime === 'function') {
                    this.sdk.game.happytime();
                } else if (typeof this.sdk.game.happyTime === 'function') {
                    // Backward compatibility in case the runtime exposes old casing.
                    this.sdk.game.happyTime();
                }
                this.log('Happy time reported');
            } catch (error) {
                this.log('happyTime failed', { code: error.code, message: error.message });
            }
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get the current SDK environment
     * @returns {'local'|'crazygames'|'disabled'} The current environment
     */
    getEnvironment() {
        return this.environment;
    }

    /**
     * Check if running on crazygames.com (production)
     */
    isProduction() {
        return this.environment === 'crazygames';
    }

    /**
     * Check if running on localhost (testing)
     */
    isTesting() {
        return this.environment === 'local';
    }
}
