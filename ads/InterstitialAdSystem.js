/**
 * InterstitialAdSystem.js
 *
 * Behaviour-based interstitial ad gating system.
 *
 * Rules:
 *   1.  UNLOCK GATE — No interstitial fires until the player has completed
 *       10 levels (counted as plays, not level IDs).
 *   2.  WIN-STREAK GATE — An interstitial only fires after 3 consecutive
 *       "clean" wins: no hint used, no skip used, no 2nd fail on that level.
 *   3.  COOLDOWN — After an ad fires, the next 3 levels are ad-free.
 *       After the cooldown the win counter resets to 0.
 *   4.  STREAK BREAKERS — hint used, skip used, or 2nd fail on a level
 *       resets the consecutive-win counter to 0.
 *
 * Usage (called by Game.js and HintSystem.js):
 *   onLevelLoaded()       – call at the start of every new level
 *   onHintUsed()          – call when a hint animation is actually started
 *   onSkipUsed()          – call when a skip is actually executed
 *   onLevelFailed()       – call when the player hits their 2nd fail on a level
 *   onLevelWon(idx, cb)   – call from nextLevel(); fires ad if eligible, then cb
 *   onLevelSkipped(idx)   – call from skipToNextLevel(); breaks streak, no ad, then continues
 */

import { AdManager } from './AdManager.js';
import { AD_CONFIG } from './adConfig.js';

class InterstitialAdSystemClass {
    constructor() {
        // How many levels have been completed (used for unlock gate)
        this.levelsCompleted = 0;

        // Whether the unlock gate has been passed
        this.unlocked = false;

        // Number of consecutive clean wins since last ad or streak break
        this.consecutiveWins = 0;

        // Cooldown: number of levels remaining where ads are suppressed
        this.cooldownLevels = 0;

        // Per-level dirty flags (reset in onLevelLoaded)
        this.hintUsedThisLevel = false;
        this.skipUsedThisLevel = false;
        this.failCountThisLevel = 0;
    }

    // ─── Per-level flags ───────────────────────────────────────────────────────

    /** Call at the start of every new level load */
    onLevelLoaded() {
        this.hintUsedThisLevel = false;
        this.skipUsedThisLevel = false;
        this.failCountThisLevel = 0;
        console.log(`[InterstitialAds] Level loaded — streak:${this.consecutiveWins} cooldown:${this.cooldownLevels} unlocked:${this.unlocked}`);
    }

    /** Call when a hint animation is actually started (not just requested) */
    onHintUsed() {
        this.hintUsedThisLevel = true;
        this.consecutiveWins = 0;
        console.log('[InterstitialAds] Hint used — streak reset');
    }

    /** Call when a skip is actually executed (not just requested) */
    onSkipUsed() {
        this.skipUsedThisLevel = true;
        this.consecutiveWins = 0;
        console.log('[InterstitialAds] Skip used — streak reset');
    }

    /**
     * Call when the player hits their Nth fail on a level.
     * Pass in the current fail count AFTER incrementing.
     * Streak breaks on the 2nd fail (matching failsBeforeShow: 2).
     * @param {number} failCount — current fail count this level (already incremented)
     */
    onLevelFailed(failCount) {
        this.failCountThisLevel = failCount;
        const { failsBeforeStreakBreak } = this._cfg();
        if (failCount >= failsBeforeStreakBreak) {
            this.consecutiveWins = 0;
            console.log(`[InterstitialAds] ${failCount} fails — streak reset`);
        }
    }

    /**
     * Call from nextLevel() instead of loading the level directly.
     * Handles the ad gate asynchronously, then calls onDone when ready to proceed.
     * @param {number} levelIdx — the level index that was just WON
     * @param {Function} onDone — callback to run once the ad (if any) has finished
     */
    async onLevelWon(levelIdx, onDone) {
        const cfg = this._cfg();

        // ── 1. Increment completed count, check unlock gate ──────────────────
        this.levelsCompleted++;
        if (!this.unlocked && this.levelsCompleted >= cfg.firstFireAfterNLevels) {
            this.unlocked = true;
            console.log(`[InterstitialAds] Unlocked after ${this.levelsCompleted} levels completed`);
        }

        if (!this.unlocked) {
            console.log(`[InterstitialAds] Still locked (${this.levelsCompleted}/${cfg.firstFireAfterNLevels} levels)`);
            onDone();
            return;
        }

        // ── 2. Dirty level (hint/skip used) ──────────────────────────────────
        if (this.hintUsedThisLevel || this.skipUsedThisLevel) {
            this.consecutiveWins = 0;
            console.log('[InterstitialAds] Dirty win (hint/skip used) — streak reset, no ad');
            onDone();
            return;
        }

        // ── 3. Post-ad cooldown ───────────────────────────────────────────────
        if (this.cooldownLevels > 0) {
            this.cooldownLevels--;
            console.log(`[InterstitialAds] Cooldown — ${this.cooldownLevels} levels remaining`);
            onDone();
            return;
        }

        // ── 4. Accumulate clean win ───────────────────────────────────────────
        this.consecutiveWins++;
        console.log(`[InterstitialAds] Clean win — streak: ${this.consecutiveWins}/${cfg.winsRequired}`);

        // ── 5. Streak complete — fire ad ──────────────────────────────────────
        if (this.consecutiveWins >= cfg.winsRequired) {
            this.consecutiveWins = 0;
            this.cooldownLevels = cfg.cooldownAfterAd;
            console.log(`[InterstitialAds] 🎉 Streak complete! Showing interstitial. Cooldown set to ${cfg.cooldownAfterAd} levels.`);

            await AdManager.showInterstitial('level_win_streak');
        }

        onDone();
    }

    /**
     * Call from skipToNextLevel().
     * Breaks the streak but does NOT show an ad.
     */
    onLevelSkipped(levelIdx) {
        this.consecutiveWins = 0;
        // Don't count skipped levels toward the unlock gate
        console.log('[InterstitialAds] Level skipped — streak reset, no ad');
    }

    // ─── Private ───────────────────────────────────────────────────────────────

    _cfg() {
        return AD_CONFIG.interstitialStreak;
    }
}

export const InterstitialAdSystem = new InterstitialAdSystemClass();
