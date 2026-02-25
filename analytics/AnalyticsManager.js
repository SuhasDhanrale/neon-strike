/**
 * AnalyticsManager - Unified Analytics System
 * 
 * Provides a unified interface for analytics that automatically:
 * - Uses Firebase Analytics when enabled and available
 * - Falls back to DummyAnalytics for console logging
 * - Handles conditional Firebase loading for tree-shaking
 * 
 * Usage:
 *   import { AnalyticsManager } from './systems/analytics/AnalyticsManager.js';
 *   await AnalyticsManager.init();
 *   AnalyticsManager.logEvent('game_start', { level: 1 });
 *   AnalyticsManager.setCurrentScreen('MainMenu');
 */

import { EventBus } from '../../core/EventBus.js';
import { DummyAnalytics } from './DummyAnalytics.js';

// Check if Firebase is enabled at build time
const FIREBASE_ENABLED = import.meta.env.VITE_ENABLE_FIREBASE === 'true';
const PLATFORM = import.meta.env.VITE_PLATFORM || 'development';

class AnalyticsManagerClass {
    constructor() {
        this.initialized = false;
        this.provider = null;
        this.platform = PLATFORM;
        this.sessionId = this._generateSessionId();
        this.sessionStartTime = null;
    }

    /**
     * Initialize the analytics system
     * Call this early in your game initialization
     */
    async init() {
        if (this.initialized) return true;

        console.log(`[AnalyticsManager] Firebase enabled: ${FIREBASE_ENABLED}`);
        console.log(`[AnalyticsManager] Platform: ${this.platform}`);

        // Try to load Firebase if enabled
        if (FIREBASE_ENABLED) {
            try {
                // Dynamic import for tree-shaking
                const { FirebaseAnalytics } = await import('./FirebaseAnalytics.js');
                this.provider = new FirebaseAnalytics();

                const success = await this.provider.init();
                if (!success) {
                    console.log('[AnalyticsManager] Firebase init failed, falling back to DummyAnalytics');
                    this.provider = new DummyAnalytics();
                    await this.provider.init();
                }
            } catch (error) {
                console.log('[AnalyticsManager] Firebase not available:', error.message);
                this.provider = new DummyAnalytics();
                await this.provider.init();
            }
        } else {
            // Firebase disabled at build time
            console.log('[AnalyticsManager] Using DummyAnalytics (Firebase excluded from build)');
            this.provider = new DummyAnalytics();
            await this.provider.init();
        }

        // Set up event listeners for automatic tracking
        this._setupEventListeners();

        // Track session start
        this.sessionStartTime = Date.now();
        this.logEvent('session_start', {
            session_id: this.sessionId,
            platform: this.platform
        });

        this.initialized = true;
        console.log(`[AnalyticsManager] Initialized with ${this.provider.name}`);
        return true;
    }

    /**
     * Setup EventBus listeners for automatic event tracking
     */
    _setupEventListeners() {
        // Game events
        EventBus.on('level:complete', (data) => {
            this.logEvent('level_complete', {
                level: data?.level,
                score: data?.score,
                time_seconds: data?.time
            });
        });

        EventBus.on('level:fail', (data) => {
            this.logEvent('game_over', {
                level: data?.level,
                score: data?.score,
                reason: data?.reason
            });
        });

        // Ad events
        EventBus.on('ad:completed', (data) => {
            this.logEvent('ad_watched', {
                ad_type: data.type,
                placement: data.placement
            });
        });

        EventBus.on('ad:failed', (data) => {
            this.logEvent('ad_failed', {
                ad_type: data.type,
                placement: data.placement,
                error: data.error
            });
        });

        EventBus.on('ad:rewarded', (data) => {
            this.logEvent('rewarded_ad_completed', {
                placement: data.placement
            });
        });

        EventBus.on('ad:skipped', (data) => {
            this.logEvent('rewarded_ad_skipped', {
                placement: data.placement
            });
        });
    }

    /**
     * Generate a unique session ID
     */
    _generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // ==================== PUBLIC API ====================

    /**
     * Log a custom event
     * @param {string} eventName - Event name (use snake_case)
     * @param {object} parameters - Event parameters
     */
    logEvent(eventName, parameters = {}) {
        if (!this.initialized) {
            console.warn('[AnalyticsManager] Not initialized, call init() first');
            return;
        }

        // Add session info to all events
        const enrichedParams = {
            ...parameters,
            session_id: this.sessionId,
            platform: this.platform
        };

        this.provider.logEvent(eventName, enrichedParams);
    }

    /**
     * Set a user property
     * @param {string} propertyName - Property name
     * @param {string} value - Property value
     */
    setUserProperty(propertyName, value) {
        if (!this.initialized) return;
        this.provider.setUserProperty(propertyName, value);
    }

    /**
     * Set the current screen (for screen view tracking)
     * @param {string} screenName - Screen name
     */
    setCurrentScreen(screenName) {
        if (!this.initialized) return;
        this.provider.setCurrentScreen(screenName);
    }

    // ==================== CONVENIENCE METHODS ====================

    /**
     * Track game start
     */
    trackGameStart(data = {}) {
        this.logEvent('game_start', {
            mode: data.mode || 'normal',
            level: data.level || 1,
            ...data
        });
    }

    /**
     * Track level completion
     */
    trackLevelComplete(level, score, time) {
        this.logEvent('level_complete', {
            level,
            score,
            time_seconds: time
        });
    }

    /**
     * Track game over
     */
    trackGameOver(level, score, reason = 'death') {
        this.logEvent('game_over', {
            level,
            score,
            reason
        });
    }

    /**
     * Track mode selection
     */
    trackModeSelected(mode) {
        this.logEvent('mode_selected', { mode });
    }

    /**
     * Track session end (call before game closes)
     */
    trackSessionEnd() {
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        this.logEvent('session_end', {
            session_id: this.sessionId,
            duration_seconds: sessionDuration
        });
    }

    /**
     * Get the current analytics provider name
     */
    getProviderName() {
        return this.provider?.name || 'None';
    }

    /**
     * Check if using Firebase (vs Dummy)
     */
    isFirebaseEnabled() {
        return this.provider?.name === 'FirebaseAnalytics';
    }
}

// Singleton instance
export const AnalyticsManager = new AnalyticsManagerClass();
