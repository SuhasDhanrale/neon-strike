/**
 * DummyAdapter - Testing adapter with visual overlays
 * 
 * Simulates ad behavior for development and testing:
 * - Shows HTML overlay with countdown timer
 * - Simulates ad delays (3s interstitial, 5s rewarded)
 * - "Skip" button for rewarded ads to test both paths
 * - Console logs all events for debugging
 */

import { BaseAdapter } from './BaseAdapter.js';
import { AD_CONFIG } from '../adConfig.js';

export class DummyAdapter extends BaseAdapter {
    constructor() {
        super('DummyAdapter');
        this.overlayElement = null;
        this.adReady = {
            interstitial: true,
            rewarded: true,
            banner: true
        };
    }

    async init() {
        this.log('Initialized - Ready for testing');
        this.initialized = true;
        this._createOverlayStyles();
        return true;
    }

    /**
     * Inject CSS styles for ad overlays
     */
    _createOverlayStyles() {
        if (document.getElementById('dummy-ad-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'dummy-ad-styles';
        styles.textContent = `
            .dummy-ad-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                font-family: 'Segoe UI', Arial, sans-serif;
                color: white;
            }

            .dummy-ad-overlay .ad-type {
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 3px;
                color: #888;
                margin-bottom: 10px;
            }

            .dummy-ad-overlay .ad-title {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .dummy-ad-overlay .countdown {
                font-size: 72px;
                font-weight: bold;
                margin-bottom: 30px;
                text-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
            }

            .dummy-ad-overlay .ad-message {
                font-size: 16px;
                color: #aaa;
                margin-bottom: 30px;
            }

            .dummy-ad-overlay .skip-button {
                padding: 12px 40px;
                font-size: 16px;
                background: transparent;
                border: 2px solid #667eea;
                color: #667eea;
                border-radius: 30px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .dummy-ad-overlay .skip-button:hover {
                background: #667eea;
                color: white;
            }

            .dummy-ad-overlay .skip-button:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }

            .dummy-ad-overlay .complete-button {
                padding: 12px 40px;
                font-size: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                border-radius: 30px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-top: 15px;
            }

            .dummy-ad-overlay .complete-button:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
            }

            .dummy-ad-overlay .progress-bar {
                width: 300px;
                height: 4px;
                background: #333;
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 20px;
            }

            .dummy-ad-overlay .progress-bar .progress {
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                transition: width 0.1s linear;
            }

            .dummy-ad-banner {
                position: fixed;
                left: 0;
                width: 100%;
                height: 60px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99998;
                border: 1px solid #333;
                font-family: 'Segoe UI', Arial, sans-serif;
            }

            .dummy-ad-banner.top { top: 0; }
            .dummy-ad-banner.bottom { bottom: 0; }

            .dummy-ad-banner .banner-text {
                color: #667eea;
                font-size: 14px;
                letter-spacing: 2px;
                text-transform: uppercase;
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Create and show the ad overlay
     */
    _showOverlay(type, duration, showSkip = false) {
        return new Promise((resolve) => {
            // Remove any existing overlay
            this._removeOverlay();

            const overlay = document.createElement('div');
            overlay.className = 'dummy-ad-overlay';
            overlay.id = 'dummy-ad-overlay';

            const totalSeconds = Math.ceil(duration / 1000);
            let remaining = totalSeconds;
            let skipped = false;
            let completed = false;

            overlay.innerHTML = `
                <div class="ad-type">${type === 'rewarded' ? '🎁 Rewarded Video' : '📺 Interstitial'}</div>
                <div class="ad-title">AD PLAYING</div>
                <div class="countdown">${remaining}s</div>
                <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                <div class="ad-message">This is a simulated ${type} ad for testing</div>
                ${showSkip ? `
                    <button class="skip-button" disabled>Skip in ${remaining}s</button>
                    <button class="complete-button" style="display: none;">✓ Complete & Get Reward</button>
                ` : ''}
            `;

            document.body.appendChild(overlay);
            this.overlayElement = overlay;

            const countdownEl = overlay.querySelector('.countdown');
            const progressEl = overlay.querySelector('.progress');
            const skipBtn = overlay.querySelector('.skip-button');
            const completeBtn = overlay.querySelector('.complete-button');

            // Allow skip after 2 seconds for rewarded
            const skipDelay = 2;

            const interval = setInterval(() => {
                remaining--;
                const progress = ((totalSeconds - remaining) / totalSeconds) * 100;

                countdownEl.textContent = `${Math.max(0, remaining)}s`;
                progressEl.style.width = `${progress}%`;

                if (showSkip && remaining <= totalSeconds - skipDelay) {
                    skipBtn.disabled = false;
                    skipBtn.textContent = 'Skip Ad';
                } else if (showSkip) {
                    skipBtn.textContent = `Skip in ${remaining - (totalSeconds - skipDelay)}s`;
                }

                if (remaining <= 0) {
                    clearInterval(interval);
                    if (showSkip) {
                        // Show complete button for rewarded
                        skipBtn.style.display = 'none';
                        completeBtn.style.display = 'block';
                    } else {
                        // Auto-close interstitial
                        this._removeOverlay();
                        resolve({ success: true });
                    }
                }
            }, 1000);

            // Skip button handler
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    if (!skipBtn.disabled) {
                        clearInterval(interval);
                        skipped = true;
                        this._removeOverlay();
                        this.log('Ad skipped by user');
                        resolve({ success: true, rewarded: false });
                    }
                });
            }

            // Complete button handler
            if (completeBtn) {
                completeBtn.addEventListener('click', () => {
                    completed = true;
                    this._removeOverlay();
                    this.log('Rewarded ad completed');
                    resolve({ success: true, rewarded: true });
                });
            }
        });
    }

    _removeOverlay() {
        if (this.overlayElement) {
            this.overlayElement.remove();
            this.overlayElement = null;
        }
        // Also remove any banner
        const existingOverlay = document.getElementById('dummy-ad-overlay');
        if (existingOverlay) existingOverlay.remove();
    }

    async showInterstitial(placement) {
        this.log('showInterstitial', { placement });
        const duration = AD_CONFIG.timing.dummyInterstitialDuration;
        return await this._showOverlay('interstitial', duration, false);
    }

    async showRewardedAd(placement) {
        this.log('showRewardedAd', { placement });
        const duration = AD_CONFIG.timing.dummyRewardedDuration;
        return await this._showOverlay('rewarded', duration, true);
    }

    async showBanner(position = 'bottom') {
        this.log('showBanner', { position });

        // Remove existing banner
        this.hideBanner();

        const banner = document.createElement('div');
        banner.className = `dummy-ad-banner ${position}`;
        banner.id = 'dummy-ad-banner';
        banner.innerHTML = `<span class="banner-text">📢 Banner Advertisement</span>`;

        document.body.appendChild(banner);

        return { success: true };
    }

    async hideBanner() {
        const banner = document.getElementById('dummy-ad-banner');
        if (banner) {
            banner.remove();
            this.log('Banner hidden');
        }
    }

    isAdAvailable(adType) {
        return this.adReady[adType] ?? true;
    }

    async preloadAd(adType) {
        this.log('preloadAd', { adType });
        // Simulate preload delay
        await new Promise(resolve => setTimeout(resolve, 100));
        this.adReady[adType] = true;
        return true;
    }
}
