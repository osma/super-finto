import { Game } from './game/Game.js';
import { StartupScreen } from './game/StartupScreen.js';
import { IntroSequence } from './game/IntroSequence.js';

let activeGame = null;
let activeStartup = null;
let activeIntro = null;

function showStartupScreen() {
    const canvas = document.getElementById('startup-canvas');
    const overlay = document.getElementById('startup-overlay');

    // Ensure overlay is visible
    overlay.classList.remove('hidden');

    if (activeStartup) activeStartup.destroy();
    if (activeIntro) activeIntro.destroy();
    
    activeStartup = new StartupScreen(canvas, (lang) => {
        // Stop the startup screen animation/events
        activeStartup.destroy();
        activeStartup = null;

        // Start Intro screen
        activeIntro = new IntroSequence(canvas, lang, () => {
            activeIntro.destroy();
            activeIntro = null;

            // Hide startup overlay
            overlay.classList.add('hidden');

            // Go full screen on start
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            }

            // Create and start game
            activeGame = new Game(lang);
            activeGame.start();
            // The language-select gesture (Enter/Space) already unlocked the AudioContext,
            // so we can start music immediately.
            activeGame.startMusicAutoplay();
        });
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

        // Exit full screen when returning to startup
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => {
                console.warn(`Error attempting to exit full-screen mode: ${err.message}`);
            });
        }

        showStartupScreen();
    });
});
