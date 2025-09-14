/**
 * WaveformPlayer
 *
 * Modern audio player with waveform visualization
 *
 * @version 1.0.0
 */

// Import the main class
import {WaveformPlayer} from './core.js';

// Auto-initialization for data attributes
function autoInit() {
    if (typeof document === 'undefined') return;

    const elements = document.querySelectorAll('[data-waveform-player]');

    elements.forEach(element => {
        if (element.dataset.waveformInitialized === 'true') return;

        try {
            new WaveformPlayer(element);
            element.dataset.waveformInitialized = 'true';
        } catch (error) {
            console.error('Failed to initialize WaveformPlayer:', error, element);
        }
    });
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
}

// Add init method
WaveformPlayer.init = autoInit;

// For CDN/browser usage
if (typeof window !== 'undefined') {
    window.WaveformPlayer = WaveformPlayer;
}

// Default export for ES modules
export default WaveformPlayer;

// Named exports
export {WaveformPlayer};