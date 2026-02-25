import { BaseAdapter } from './BaseAdapter.js';

export class NoOpAdapter extends BaseAdapter {
    constructor() {
        super('NoOpAdapter (Ad-Free)');
    }

    async init() {
        console.log('[NoOpAdapter] Initialized ad-free mode');
        return true;
    }

    async showInterstitial(placementId) {
        console.log('[NoOpAdapter] Suppressed interstitial request (Ad-Free)');
        return { success: false, error: 'Ads are disabled in this build' };
    }

    async showRewardedAd(placementId) {
        console.log('[NoOpAdapter] Suppressed rewarded ad request (Ad-Free)');
        return { success: false, rewarded: false, error: 'Ads are disabled in this build' };
    }

    async showBanner(position) {
        return { success: false };
    }

    async hideBanner() { }

    isAdAvailable(adType) {
        return false;
    }

    async preloadAd(adType) {
        return false;
    }
}
