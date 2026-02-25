/**
 * Ad Configuration - Game-Specific Rules
 * 
 * This file contains all ad placement rules, timing configurations,
 * and shop-related ad settings for Starline.
 * 
 * All numbers are in one place for easy tweaking!
 */

// ==================== PLATFORM DETECTION ====================

export const AD_CONFIG = {
    // Current platform (auto-detected or set via environment)
    platform: import.meta.env.VITE_PLATFORM || 'development',
    // Global Ad-Free Toggle (Driven by Vite build mode)
    AD_FREE_VERSION: import.meta.env.VITE_AD_FREE === 'true',
    // CrazyGames SDK-only mode: load SDK/features, but never request ads
    CG_SDK_ONLY: import.meta.env.VITE_CG_SDK_ONLY === 'true',
    // ==================== LEVEL-BASED INTERSTITIAL RULES ====================
    levelRules: {
        // First N levels have NO ADS (clean experience for new players)
        noAdsUntilLevel: 5,

        // After the no-ad period, show interstitial every N levels
        // Example: levels 5, 8, 11, 14, 17, 20, 23, 26, 29
        showAdEveryNLevels: 3,

        // Total levels in the game (for reference)
        totalLevels: 30
    },

    // ==================== TIMING RULES (in milliseconds) ====================
    timing: {
        // Minimum time between interstitial ads
        interstitialCooldown: 60000, // 60 seconds

        // Minimum time between any ads (global cooldown)
        globalCooldown: 30000, // 30 seconds

        // Delay before first ad can be shown after game/session start
        initialDelay: 30000, // 30 seconds

        // Simulated ad durations for DummyAdapter testing
        dummyInterstitialDuration: 3000, // 3 seconds
        dummyRewardedDuration: 5000, // 5 seconds
    },

    // ==================== FREQUENCY CAPS ====================
    frequencyCaps: {
        // Maximum interstitial ads per session
        maxInterstitialsPerSession: 10,

        // Maximum rewarded ads per session (usually high - player's choice)
        maxRewardedPerSession: 50,

        // Show interstitial every N game overs
        interstitialEveryNGameOvers: 2,

        // Show interstitial every N level completions (alternative trigger)
        interstitialEveryNLevelCompletes: 3
    },

    // ==================== SHOP / REWARDED AD INTEGRATION ====================
    shop: {
        // Which upgrade types support "Watch Ad" option
        // true = coins OR rewarded ad, false = coins only
        upgradesWithRewardedOption: {
            speed: true,   // Speed: Coins OR Watch Ad
            damage: true,  // Damage: Coins OR Watch Ad  
            shield: true   // Shield: Coins OR Watch Ad
        },

        // Enable "Continue" with rewarded ad on game over
        allowContinueWithAd: true,

        // Max continues per level attempt
        maxContinuesPerAttempt: 1,

        // Fallback revive cost when ads are disabled
        reviveCoinCostWhenAdsOff: 2000,

        // Hide ShopGrid UI blocks when ads are disabled
        hideShopGridWhenAdsOff: true
    },

    // ==================== HINT SYSTEM CONFIG ====================
    hint: {
        // Free hints/skips per session
        freeHintsPerSession: 1,
        freeSkipsPerSession: 1,
        // Show hint/skip buttons after this many fails
        failsBeforeShow: 2,
        // When AD_FREE_VERSION true, what is the cooldown between uses?
        adFreeCooldownMs: 5 * 60 * 1000 // 5 minutes
    },

    // ==================== INTERSTITIAL STREAK SYSTEM ====================
    interstitialStreak: {
        // Unlock gate: no interstitial until this many levels have been completed
        firstFireAfterNLevels: 10,

        // Number of consecutive clean wins needed to trigger an ad
        // Clean = no hint, no skip, fewer than failsBeforeStreakBreak fails
        winsRequired: 3,

        // Number of fails on a level that breaks the streak (matches hint reveal threshold)
        failsBeforeStreakBreak: 2,

        // Levels of cooldown after each ad fires before streak counting resumes
        cooldownAfterAd: 3,
    },

    // ==================== PLACEMENT IDS ====================
    placements: {
        admob: {
            interstitial: 'ca-app-pub-XXXXXXX/interstitial',
            rewarded: 'ca-app-pub-XXXXXXX/rewarded',
            banner: 'ca-app-pub-XXXXXXX/banner'
        },
        poki: {
            interstitial: 'poki_interstitial',
            rewarded: 'poki_rewarded'
        },
        crazygames: {
            interstitial: 'crazygames_interstitial',
            rewarded: 'crazygames_rewarded'
        },
        gamedistribution: {
            interstitial: 'gamedistribution_interstitial',
            rewarded: 'gamedistribution_rewarded'
        },
        development: {
            interstitial: 'dummy_interstitial',
            rewarded: 'dummy_rewarded',
            banner: 'dummy_banner'
        }
    },

    // ==================== BANNER CONFIGURATION ====================
    banner: {
        defaultPosition: 'bottom',
        showDuringGameplay: false,
        showOnMenus: false
    },

    // ==================== DEBUG SETTINGS ====================
    debug: {
        logEvents: true,
        forceDummy: false,
        disableAds: false,
        ignoreCooldowns: false
    },


};


// ==================== HELPER FUNCTIONS ====================

export function getPlacementId(adType) {
    const platform = AD_CONFIG.platform;
    const placements = AD_CONFIG.placements[platform] || AD_CONFIG.placements.development;
    return placements[adType] || `unknown_${adType}`;
}


export function areAdsEnabled() {
    if (AD_CONFIG.CG_SDK_ONLY) return false;

    // Check Global Ad Config first
    if (AD_CONFIG.AD_FREE_VERSION) return false;

    // Then check local debug flag
    return !AD_CONFIG.debug.disableAds;
}

export function canUseRewardedForUpgrade(upgradeType) {
    return AD_CONFIG.shop.upgradesWithRewardedOption[upgradeType] === true;
}

export function isCoinReviveEnabled() {
    return !areAdsEnabled() && (AD_CONFIG.shop.reviveCoinCostWhenAdsOff || 0) > 0;
}

export function getReviveCoinCost() {
    return isCoinReviveEnabled() ? AD_CONFIG.shop.reviveCoinCostWhenAdsOff : 0;
}

export function shouldHideShopGridWhenAdsOff() {
    return !areAdsEnabled() && AD_CONFIG.shop.hideShopGridWhenAdsOff === true;
}

export function shouldShowAdAfterLevel(levelNumber) {
    const { noAdsUntilLevel, showAdEveryNLevels } = AD_CONFIG.levelRules;

    if (levelNumber < noAdsUntilLevel) {
        return false;
    }

    const levelsSinceNoAdPeriod = levelNumber - noAdsUntilLevel;
    return levelsSinceNoAdPeriod >= 0 && levelsSinceNoAdPeriod % showAdEveryNLevels === 0;
}

export function getInterstitialLevels() {
    const levels = [];
    for (let i = 1; i <= AD_CONFIG.levelRules.totalLevels; i++) {
        if (shouldShowAdAfterLevel(i)) {
            levels.push(i);
        }
    }
    return levels;
}

if (AD_CONFIG.debug.logEvents) {
    console.log('[AdConfig] Interstitial levels:', getInterstitialLevels());
}
