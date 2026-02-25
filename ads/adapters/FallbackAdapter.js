/**
 * FallbackAdapter - No-op adapter for when ads are disabled
 * 
 * Silently succeeds all operations without showing anything.
 * Used when ads are explicitly disabled or as a safety fallback.
 */

import { BaseAdapter } from './BaseAdapter.js';

export class FallbackAdapter extends BaseAdapter {
    constructor() {
        super('FallbackAdapter');
    }

    async init() {
        this.log('Initialized - Ads are disabled');
        this.initialized = true;
        return true;
    }

    async showInterstitial(placement) {
        this.log('showInterstitial (no-op)', { placement });
        return { success: true };
    }

    async showRewardedAd(placement) {
        this.log('showRewardedAd (no-op)', { placement });
        // Return rewarded: true so game flow continues normally
        return { success: true, rewarded: true };
    }

    async showBanner(position) {
        this.log('showBanner (no-op)', { position });
        return { success: true };
    }

    async hideBanner() {
        // No-op
    }

    isAdAvailable(adType) {
        // Always available (will just no-op)
        return true;
    }

    async preloadAd(adType) {
        return true;
    }
}
