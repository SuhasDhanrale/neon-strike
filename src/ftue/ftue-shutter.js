/**
 * FTUE Shutter & Sling Logic (Frontend Isolated)
 * Handles the blast door animation and the slingshot hand animation.
 * 
 * Event-driven flow:
 * 1. startShutterFTUE() shows the shutter (blocks game)
 * 2. Player clicks Supply Energy button → gear unlocks → celebration:gear_unlocked fires
 * 3. Shutter opens (animation)
 * 4. After 2s, shutter:opened fires → FTUE orbs and pulse can begin
 */

import { EventBus } from '../eventBus.js'

// Store references for use in the module
let _shutter = null
let _slingAnim = null
let _slingLine = null
let _slingRipple = null
let _canvas = null
let _gearUnlockHandler = null

export function initFtueShutter() {
    _shutter = document.getElementById('ftue-shutter');
    const supplyBtn = document.getElementById('supply-energy-btn');
    _canvas = document.getElementById('gameCanvas');
    _slingAnim = document.getElementById('ftue-sling-anim');
    _slingLine = document.getElementById('ftue-sling-line');
    _slingRipple = document.getElementById('ftue-sling-ripple');

    if (!_shutter || !_canvas || !_slingAnim || !_slingLine || !_slingRipple) {
        console.warn("FTUE elements missing from DOM.");
        return;
    }

    // Position the sling perfectly over the shooter orb
    function alignSling() {
        // Sling hand should sit directly over the shooter orb
        // Let's position it near the bottom half of the canvas so there is room to drag up
        _slingAnim.style.top = (_canvas.offsetTop + 180) + 'px'; // ~180px down from canvas top
        _slingLine.style.top = (_canvas.offsetTop + 180 + 25) + 'px'; // Start line from center of the hand
        _slingRipple.style.top = (_canvas.offsetTop + 180) + 'px'; // Ripple starts at the hand center
        // horizontal centering is handled by CSS (left: 50%, margin-left: -25px)
    }

    // Immediately hide the shutter if FTUE is NOT active. 
    // The CSS defaults it to visible so it naturally hides the game during load.
    if (localStorage.getItem('neonStrike_ftueComplete')) {
        // Hide instantly
        _shutter.style.transition = 'none';
        _shutter.classList.add('hidden');
        void _shutter.offsetWidth;
        _shutter.style.transition = '';
    }

    // Re-align on resize just in case they test it while resizing window
    window.addEventListener('resize', () => {
        if (_slingAnim.classList.contains('active')) {
            alignSling();
        }
    });

    // Keep the global test methods for manual debugging
    // --- Global Test Method ---
    window.testShutter = () => {
        startShutterFTUE();
    };

    // --- Isolated Shutter Opening Test Method ---
    window.testShutterOpenAnim = () => {
        // Ensure sling is hidden
        _slingAnim.classList.remove('active');
        _slingLine.classList.remove('active');
        _slingRipple.classList.remove('active');

        // Reset shutter to completely closed position
        _shutter.style.transition = 'none';
        _shutter.classList.remove('opening');
        _shutter.classList.remove('hidden');

        // Force a DOM reflow so the browser registers the closed state instantly
        void _shutter.offsetWidth;
        _shutter.style.transition = '';

        // Trigger the heavy, glitching opening animation
        _shutter.classList.add('opening');

        // Clean up the active class after it finishes sliding away
        setTimeout(() => {
            _shutter.classList.add('hidden');
        }, 2000); // 2s duration
    };

    // --- Isolated Sling Test Method ---
    window.testSling = () => {
        // Ensure shutter is closed/hidden
        _shutter.style.transition = 'none';
        _shutter.classList.add('hidden');
        _shutter.classList.remove('opening');
        void _shutter.offsetWidth;
        _shutter.style.transition = '';

        // Show sling animation
        alignSling();
        _slingAnim.classList.add('active');
        _slingLine.classList.add('active');
        _slingRipple.classList.add('active');

        // Hide immediately when player touches/clicks the canvas
        const onCanvasInteract = () => {
            _slingAnim.classList.remove('active');
            _slingLine.classList.remove('active');
            _slingRipple.classList.remove('active');
            _canvas.removeEventListener('pointerdown', onCanvasInteract);
        };

        // Clear any old listeners to prevent stacking
        _canvas.removeEventListener('pointerdown', onCanvasInteract);
        _canvas.addEventListener('pointerdown', onCanvasInteract);
    };
}

/**
 * Starts the FTUE shutter sequence.
 * Shows the shutter (blocking the game), then listens for gear unlock event
 * to trigger the opening animation.
 * 
 * This should be called when FTUE is active.
 */
export function startShutterFTUE() {
    if (!_shutter || !_canvas || !_slingAnim || !_slingLine || !_slingRipple) {
        console.warn("FTUE shutter not initialized. Call initFtueShutter() first.");
        return;
    }

    // Position the sling
    function alignSling() {
        _slingAnim.style.top = (_canvas.offsetTop + 180) + 'px';
        _slingLine.style.top = (_canvas.offsetTop + 180 + 25) + 'px';
        _slingRipple.style.top = (_canvas.offsetTop + 180) + 'px';
    }
    alignSling();

    // 1. Show the shutter (instantly, without the drop-down animation)
    _shutter.style.transition = 'none';
    _shutter.classList.remove('hidden');
    _shutter.classList.remove('opening');

    // Force a DOM reflow so the instant change is registered
    void _shutter.offsetWidth;

    // Restore transition just in case
    _shutter.style.transition = '';

    // Ensure sling is hidden initially
    _slingAnim.classList.remove('active');
    _slingLine.classList.remove('active');
    _slingRipple.classList.remove('active');

    // 2. Listen for the gear unlock event from GearSystem
    // This fires when player clicks Supply Energy and the gear is unlocked
    _gearUnlockHandler = (event) => {
        const gearIndex = event?.gearIndex;
        console.log(`[FTUE Shutter] Received gear_unlocked event for gear ${gearIndex}`);

        // Trigger shutter opening immediately (more responsive)
        _shutter.classList.add('opening');

        // 3. Wait for the CSS animation to finish (2 seconds) before showing hand
        setTimeout(() => {
            _shutter.classList.add('hidden'); // Make unclickable again

            // 4. Show the hand sling animation
            alignSling();
            _slingAnim.classList.add('active');
            _slingLine.classList.add('active');
            _slingRipple.classList.add('active');

            // 5. Hide sling when player touches/clicks the canvas
            const onCanvasInteract = () => {
                _slingAnim.classList.remove('active');
                _slingLine.classList.remove('active');
                _slingRipple.classList.remove('active');
                _canvas.removeEventListener('pointerdown', onCanvasInteract);
            };
            _canvas.removeEventListener('pointerdown', onCanvasInteract);
            _canvas.addEventListener('pointerdown', onCanvasInteract);

            // 6. Emit the shutter:opened event so ftueManager can start orbs and pulse
            console.log("[FTUE Shutter] Emitting shutter:opened event");
            EventBus.emit('shutter:opened');

            // Clean up the gear unlock listener
            EventBus.off('celebration:gear_unlocked', _gearUnlockHandler);
            _gearUnlockHandler = null;

        }, 2000); // 2s matches the `animation: shutterHeavyOpen ...` length
    };

    // Register the event listener
    EventBus.on('celebration:gear_unlocked', _gearUnlockHandler);
    console.log("[FTUE Shutter] Listening for gear_unlocked event...");
}

/**
 * For testing: manually trigger the shutter opening without waiting for gear unlock.
 */
export function triggerShutterOpen() {
    if (!_shutter) return;

    _shutter.classList.add('opening');

    setTimeout(() => {
        _shutter.classList.add('hidden');
        EventBus.emit('shutter:opened');
    }, 2000);
}
