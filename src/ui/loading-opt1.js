/**
 * Loading Screen Option 1: The Pressure Valve
 * Displays automatically on page load, simulates a connection/loading sequence
 * before revealing the game.
 */

export function initLoadingOption1() {
    // Keep the console method for debugging purposes
    window.showLoadingOption1 = startLoadingSequence;
}

/**
 * Starts the loading sequence with a pressure gauge simulation.
 * @param {Function} onComplete - Callback to fire when loading sequence completes
 */
export function startLoadingSequence(onComplete) {
    const container = document.getElementById('loading-opt-1');
    if (!container) {
        console.warn("Loading Option 1 container not found in DOM.");
        if (onComplete) onComplete();
        return;
    }

    const fillBar = container.querySelector('.pressure-gauge-fill');
    const readout = container.querySelector('.pressure-readout');

    // Reset state
    fillBar.style.width = '0%';
    readout.textContent = "PRESSURE: 0 PSI";

    // Remove hidden class to show the loading screen
    container.classList.remove('hidden');

    // Simulate loading progress
    let progress = 0;
    const loadInterval = setInterval(() => {
        // Random increment between 2 and 10
        const increment = Math.floor(Math.random() * 8) + 2;
        progress += increment;

        if (progress >= 100) {
            progress = 100;
            clearInterval(loadInterval);

            // Hold at 100% for a brief moment, then fade out
            setTimeout(() => {
                // Add hidden class to fade out
                container.classList.add('hidden');

                // Wait for fade transition to complete before calling callback
                setTimeout(() => {
                    if (onComplete) onComplete();
                }, 500); // Matches the CSS transition duration
            }, 800);
        }

        // Update visuals
        fillBar.style.width = `${progress}%`;

        // Calculate a fake PSI value (max ~5000)
        const psi = Math.floor((progress / 100) * 5000);
        readout.textContent = `PRESSURE: ${psi} PSI`;

    }, 200); // Update every 200ms
}
