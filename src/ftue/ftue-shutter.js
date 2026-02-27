/**
 * FTUE Shutter & Sling Logic (Frontend Isolated)
 * Handles the blast door animation and the slingshot hand animation.
 */

export function initFtueShutter() {
    const shutter = document.getElementById('ftue-shutter');
    const supplyBtn = document.getElementById('supply-energy-btn');
    const canvas = document.getElementById('gameCanvas');
    const slingAnim = document.getElementById('ftue-sling-anim');
    const slingLine = document.getElementById('ftue-sling-line');
    const slingRipple = document.getElementById('ftue-sling-ripple');

    if (!shutter || !supplyBtn || !canvas || !slingAnim || !slingLine || !slingRipple) {
        console.warn("FTUE elements missing from DOM.");
        return;
    }

    // Position the sling perfectly over the shooter orb
    function alignSling() {
        // Sling hand should sit directly over the shooter orb
        // Let's position it near the bottom half of the canvas so there is room to drag up
        slingAnim.style.top = (canvas.offsetTop + 180) + 'px'; // ~180px down from canvas top
        slingLine.style.top = (canvas.offsetTop + 180 + 25) + 'px'; // Start line from center of the hand
        slingRipple.style.top = (canvas.offsetTop + 180) + 'px'; // Ripple starts at the hand center
        // horizontal centering is handled by CSS (left: 50%, margin-left: -25px)
    }

    // --- Global Test Method ---
    window.testShutter = () => {
        // 1. Prepare and show the shutter
        alignSling();
        shutter.classList.add('active'); // Drops the shutter down instantly
        shutter.classList.remove('opening');

        // Make sure the sling is hidden initially
        slingAnim.classList.remove('active');
        slingLine.classList.remove('active');
        slingRipple.classList.remove('active');

        // 2. Listen for the existing ⚡ RELEASE button click
        // We use a one-time event listener so it doesn't fire forever
        const onSupplyClick = () => {
            // Slide the shutter up
            shutter.classList.add('opening');

            // 3. Wait for the CSS animation to finish (2 seconds) before showing hand
            setTimeout(() => {
                shutter.classList.remove('active'); // Make unclickable again

                // 4. Show the hand sling animation
                alignSling();
                slingAnim.classList.add('active');
                slingLine.classList.add('active');
                slingRipple.classList.add('active');

                // 5. Hide immediately when player touches/clicks the canvas
                const onCanvasInteract = () => {
                    slingAnim.classList.remove('active');
                    slingLine.classList.remove('active');
                    slingRipple.classList.remove('active');
                    // Remove this listener so it doesn't fire continuously
                    canvas.removeEventListener('pointerdown', onCanvasInteract);
                };
                canvas.addEventListener('pointerdown', onCanvasInteract);

            }, 2000); // 2s matches the `animation: shutterHeavyOpen ...` length
        };

        // We add this to the button. It won't interfere with the game's energy logic 
        // because we aren't preventing default or stopping propagation.
        supplyBtn.addEventListener('click', onSupplyClick, { once: true });
    };

    // --- Isolated Shutter Opening Test Method ---
    window.testShutterOpenAnim = () => {
        // Ensure sling is hidden
        slingAnim.classList.remove('active');
        slingLine.classList.remove('active');
        slingRipple.classList.remove('active');

        // Reset shutter to completely closed position
        shutter.classList.remove('opening');
        shutter.classList.add('active');

        // Force a DOM reflow so the browser registers the closed state instantly
        void shutter.offsetWidth;

        // Trigger the heavy, glitching opening animation
        shutter.classList.add('opening');

        // Clean up the active class after it finishes sliding away
        setTimeout(() => {
            shutter.classList.remove('active');
        }, 2000); // 2s duration
    };

    // --- Isolated Sling Test Method ---
    window.testSling = () => {
        // Ensure shutter is closed/hidden
        shutter.classList.remove('active', 'opening');

        // Show sling animation
        alignSling();
        slingAnim.classList.add('active');
        slingLine.classList.add('active');
        slingRipple.classList.add('active');

        // Hide immediately when player touches/clicks the canvas
        const onCanvasInteract = () => {
            slingAnim.classList.remove('active');
            slingLine.classList.remove('active');
            slingRipple.classList.remove('active');
            canvas.removeEventListener('pointerdown', onCanvasInteract);
        };

        // Clear any old listeners to prevent stacking
        canvas.removeEventListener('pointerdown', onCanvasInteract);
        canvas.addEventListener('pointerdown', onCanvasInteract);
    };

    // Re-align on resize just in case they test it while resizing window
    window.addEventListener('resize', () => {
        if (slingAnim.classList.contains('active')) {
            alignSling();
        }
    });
}
