import { Game } from './game/Game.js';
import { StartupScreen } from './game/StartupScreen.js';

let activeGame = null;
let activeStartup = null;

function showStartupScreen() {
    const canvas = document.getElementById('startup-canvas');
    const overlay = document.getElementById('startup-overlay');

    // Ensure overlay is visible
    overlay.classList.remove('hidden');

    if (activeStartup) activeStartup.destroy();
    activeStartup = new StartupScreen(canvas, (lang) => {
        // Hide startup overlay
        overlay.classList.add('hidden');

        // Create and start game
        activeGame = new Game(lang);
        activeGame.start();
        // The language-select gesture (Enter/Space) already unlocked the AudioContext,
        // so we can start music immediately.
        activeGame.startMusicAutoplay();
    });
}

window.addEventListener('load', () => {
    showStartupScreen();

    // When game requests to go back to startup (e.g. after game over)
    window.addEventListener('superfinto:returnToStartup', () => {
        if (activeGame) {
            // Cancel any lingering rAF  
            activeGame = null;
        }
        showStartupScreen();
    });
});
