/**
 * BaseAdapter - Abstract base class for ad adapters
 * All platform-specific adapters must extend this class
 */

export class BaseAdapter {
    constructor(name) {
        this.name = name;
        this.initialized = false;
    }

    /**
     * Initialize the ad SDK
     * @returns {Promise<boolean>} Success status
     */
    async init() {
        throw new Error('init() must be implemented by subclass');
    }

    /**
     * Show an interstitial ad
     * @param {string} placement - Placement identifier
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async showInterstitial(placement) {
        throw new Error('showInterstitial() must be implemented by subclass');
    }

    /**
     * Show a rewarded video ad
     * @param {string} placement - Placement identifier
     * @returns {Promise<{success: boolean, rewarded: boolean, error?: string}>}
     */
    async showRewardedAd(placement) {
        throw new Error('showRewardedAd() must be implemented by subclass');
    }

    /**
     * Show a banner ad
     * @param {string} position - 'top' or 'bottom'
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async showBanner(position) {
        throw new Error('showBanner() must be implemented by subclass');
    }

    /**
     * Hide the current banner ad
     * @returns {Promise<void>}
     */
    async hideBanner() {
        throw new Error('hideBanner() must be implemented by subclass');
    }

    /**
     * Check if an ad is ready to show
     * @param {string} adType - 'interstitial', 'rewarded', or 'banner'
     * @returns {boolean}
     */
    isAdAvailable(adType) {
        throw new Error('isAdAvailable() must be implemented by subclass');
    }

    /**
     * Preload an ad for faster display
     * @param {string} adType - 'interstitial', 'rewarded', or 'banner'
     * @returns {Promise<boolean>}
     */
    async preloadAd(adType) {
        throw new Error('preloadAd() must be implemented by subclass');
    }

    /**
     * Log adapter events (can be overridden)
     * @param {string} event 
     * @param {object} data 
     */
    log(event, data = {}) {
        console.log(`[${this.name}] ${event}`, data);
    }
}
