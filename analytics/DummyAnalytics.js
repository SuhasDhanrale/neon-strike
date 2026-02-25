/**
 * DummyAnalytics - Console-based analytics for testing
 * 
 * Logs all analytics events to the console in a formatted way.
 * Used when Firebase is disabled or not available.
 */

export class DummyAnalytics {
    constructor() {
        this.name = 'DummyAnalytics';
        this.currentScreen = 'unknown';
        this.userProperties = {};
        this.eventCount = 0;
    }

    async init() {
        console.log('%c[Analytics] DummyAnalytics initialized - events will log to console',
            'color: #9b59b6; font-weight: bold');
        return true;
    }

    /**
     * Log an event
     */
    logEvent(eventName, parameters = {}) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();

        console.groupCollapsed(
            `%c📊 [Analytics] ${eventName}`,
            'color: #3498db; font-weight: bold'
        );
        console.log('Timestamp:', timestamp);
        console.log('Screen:', this.currentScreen);
        console.log('Parameters:', parameters);
        console.log('Event #:', this.eventCount);
        console.groupEnd();
    }

    /**
     * Set a user property
     */
    setUserProperty(propertyName, value) {
        this.userProperties[propertyName] = value;
        console.log(
            `%c👤 [Analytics] User property: ${propertyName} = ${value}`,
            'color: #27ae60'
        );
    }

    /**
     * Set the current screen
     */
    setCurrentScreen(screenName) {
        this.currentScreen = screenName;
        console.log(
            `%c📱 [Analytics] Screen: ${screenName}`,
            'color: #e67e22'
        );
    }

    /**
     * Get all logged user properties (for debugging)
     */
    getUserProperties() {
        return { ...this.userProperties };
    }
}
