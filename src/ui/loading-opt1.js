/**
 * Loading Screen Option 1: The Pressure Valve
 * Purely frontend script to simulate a loading screen.
 * Accessible via browser console: window.showLoadingOption1()
 */

export function initLoadingOption1() {
    // Attach to window for global console access
    window.showLoadingOption1 = () => {
        const container = document.getElementById('loading-opt-1');
        if (!container) {
            console.warn("Loading Option 1 container not found in DOM.");
            return;
        }

        const fillBar = container.querySelector('.pressure-gauge-fill');
        const readout = container.querySelector('.pressure-readout');

        // Reset state
        fillBar.style.width = '0%';
        readout.textContent = "PRESSURE: 0 PSI";

        // Show screen
        container.classList.add('active');

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
                    container.classList.remove('active');
                }, 800);
            }

            // Update visuals
            fillBar.style.width = `${progress}%`;

            // Calculate a fake PSI value (max ~5000)
            const psi = Math.floor((progress / 100) * 5000);
            readout.textContent = `PRESSURE: ${psi} PSI`;

        }, 200); // Update every 200ms
    };
}
