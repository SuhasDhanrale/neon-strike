/**
 * FirebaseAnalytics - Firebase Analytics wrapper
 * 
 * This module is conditionally loaded only when Firebase is enabled.
 * It supports both:
 * - Firebase JS SDK (for web)
 * - Capacitor Firebase plugin (for native mobile)
 * 
 * The dynamic imports ensure Firebase is tree-shaken out when
 * VITE_ENABLE_FIREBASE=false
 */

let firebaseApp = null;
let analytics = null;

export class FirebaseAnalytics {
    constructor() {
        this.name = 'FirebaseAnalytics';
        this.initialized = false;
        this.currentScreen = 'unknown';
        this.platform = import.meta.env.VITE_PLATFORM || 'web';
    }

    /**
     * Initialize Firebase Analytics
     * Uses dynamic imports for tree-shaking
     */
    async init() {
        try {
            // Dynamic import Firebase modules
            const { initializeApp, getApps } = await import('firebase/app');
            const { getAnalytics, logEvent, setUserProperties, setCurrentScreen: fbSetScreen } = await import('firebase/analytics');

            // Firebase configuration
            // TODO: Replace with your actual Firebase config
            const firebaseConfig = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
                appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
                measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
            };

            // Initialize Firebase (only if not already initialized)
            if (getApps().length === 0) {
                firebaseApp = initializeApp(firebaseConfig);
            } else {
                firebaseApp = getApps()[0];
            }

            // Initialize Analytics
            analytics = getAnalytics(firebaseApp);

            // Store references to Firebase functions
            this._logEvent = logEvent;
            this._setUserProperties = setUserProperties;
            this._setCurrentScreen = fbSetScreen;
            this._analytics = analytics;

            this.initialized = true;
            console.log('[FirebaseAnalytics] Initialized successfully');

            // Set platform identifier
            this.setUserProperty('platform', this.platform);

            return true;
        } catch (error) {
            console.error('[FirebaseAnalytics] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Log an event to Firebase Analytics
     */
    logEvent(eventName, parameters = {}) {
        if (!this.initialized || !analytics) {
            console.warn('[FirebaseAnalytics] Not initialized, event not logged:', eventName);
            return;
        }

        try {
            // Add platform to all events
            const enrichedParams = {
                ...parameters,
                platform: this.platform,
                screen: this.currentScreen
            };

            this._logEvent(analytics, eventName, enrichedParams);
        } catch (error) {
            console.error('[FirebaseAnalytics] Error logging event:', error);
        }
    }

    /**
     * Set a user property
     */
    setUserProperty(propertyName, value) {
        if (!this.initialized || !analytics) {
            console.warn('[FirebaseAnalytics] Not initialized, property not set:', propertyName);
            return;
        }

        try {
            this._setUserProperties(analytics, { [propertyName]: value });
        } catch (error) {
            console.error('[FirebaseAnalytics] Error setting user property:', error);
        }
    }

    /**
     * Set the current screen
     */
    setCurrentScreen(screenName) {
        this.currentScreen = screenName;

        if (!this.initialized || !analytics) {
            return;
        }

        try {
            // Log screen view event
            this._logEvent(analytics, 'screen_view', {
                screen_name: screenName,
                platform: this.platform
            });
        } catch (error) {
            console.error('[FirebaseAnalytics] Error setting screen:', error);
        }
    }
}
