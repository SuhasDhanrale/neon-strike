/**
 * GameDistributionAdapter - GameDistribution SDK Integration
 *
 * SDK Docs:
 * - https://github.com/GameDistribution/GD-HTML5/wiki
 *
 * Expected global objects:
 * - window.GD_OPTIONS (configured before loading SDK script)
 * - window.gdsdk (available after SDK script loads)
 */

import { BaseAdapter } from './BaseAdapter.js';

const GD_SCRIPT_ID = 'gamedistribution-jssdk';
const GD_SCRIPT_SRC = 'https://html5.api.gamedistribution.com/main.min.js';
const GD_READY_TIMEOUT_MS = 15000;

export class GameDistributionAdapter extends BaseAdapter {
    constructor() {
        super('GameDistributionAdapter');
        this.sdk = null;
        this.gameId = import.meta.env.VITE_GD_GAME_ID || '';
        this.rewardedWatchCompleted = false;
    }

    async init() {
        this.log('Initializing GameDistribution SDK...');

        if (!this.gameId) {
            this.log('Missing VITE_GD_GAME_ID - cannot initialize GameDistribution SDK');
            return false;
        }

        try {
            this._configureOptions();
            await this._ensureSdkScript();

            const sdk = await this._waitForSdkReady();
            if (!sdk) {
                this.log('GameDistribution SDK did not become ready in time');
                return false;
            }

            this.sdk = sdk;
            this.initialized = true;
            this.log('GameDistribution SDK initialized', { gameId: this.gameId });
            return true;
        } catch (error) {
            this.log('Failed to initialize GameDistribution SDK', {
                error: error?.message || error
            });
            return false;
        }
    }

    _configureOptions() {
        const existingOptions = window.GD_OPTIONS || {};
        const previousOnEvent = typeof existingOptions.onEvent === 'function'
            ? existingOptions.onEvent
            : null;

        window.GD_OPTIONS = {
            ...existingOptions,
            gameId: existingOptions.gameId || this.gameId,
            onEvent: (event) => {
                this._handleSdkEvent(event);
                if (previousOnEvent) {
                    previousOnEvent(event);
                }
            }
        };
    }

    async _ensureSdkScript() {
        if (window.gdsdk) return;

        const existingScript = document.getElementById(GD_SCRIPT_ID);
        if (existingScript) return;

        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = GD_SCRIPT_ID;
            script.src = GD_SCRIPT_SRC;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load GameDistribution SDK script'));
            document.head.appendChild(script);
        });
    }

    async _waitForSdkReady(timeoutMs = GD_READY_TIMEOUT_MS) {
        const start = Date.now();

        while (Date.now() - start < timeoutMs) {
            if (window.gdsdk) {
                return window.gdsdk;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return null;
    }

    _handleSdkEvent(event) {
        const eventName = event?.name;
        if (!eventName) return;

        if (eventName === 'SDK_REWARDED_WATCH_COMPLETE') {
            this.rewardedWatchCompleted = true;
        }

        this.log(`SDK event: ${eventName}`, event);
    }

    _isSDKAvailable() {
        return this.initialized &&
            this.sdk &&
            typeof this.sdk.showAd === 'function';
    }

    async showInterstitial(placement) {
        if (!this._isSDKAvailable()) {
            return { success: false, error: 'GameDistribution SDK not available' };
        }

        try {
            await this.sdk.showAd();
            this.log('Interstitial ad completed', { placement });
            return { success: true };
        } catch (error) {
            this.log('Interstitial ad failed', {
                placement,
                error: error?.message || error
            });
            return { success: false, error: error?.message || 'Ad failed' };
        }
    }

    async showRewardedAd(placement) {
        if (!this._isSDKAvailable()) {
            return {
                success: false,
                rewarded: false,
                error: 'GameDistribution SDK not available'
            };
        }

        this.rewardedWatchCompleted = false;

        try {
            const result = await this.sdk.showAd('rewarded');
            const rewarded =
                this.rewardedWatchCompleted ||
                result === true ||
                result?.rewarded === true;

            this.log('Rewarded ad completed', { placement, rewarded });
            return { success: true, rewarded };
        } catch (error) {
            this.log('Rewarded ad failed', {
                placement,
                error: error?.message || error
            });
            return {
                success: false,
                rewarded: false,
                error: error?.message || 'Rewarded ad failed'
            };
        }
    }

    async showBanner(position = 'bottom') {
        this.log('Banner ads not supported on GameDistribution SDK', { position });
        return { success: false, error: 'Not supported on GameDistribution' };
    }

    async hideBanner() {
        // No-op: banner API is not used in this integration.
    }

    isAdAvailable(adType) {
        if (adType === 'banner') return false;
        return this._isSDKAvailable();
    }

    async preloadAd(adType) {
        if (!this._isSDKAvailable()) return false;
        if (adType === 'banner') return false;

        if (adType === 'rewarded' && typeof this.sdk.preloadAd === 'function') {
            try {
                await this.sdk.preloadAd('rewarded');
                return true;
            } catch (error) {
                this.log('Rewarded preload failed', { error: error?.message || error });
                return false;
            }
        }

        return true;
    }
}
