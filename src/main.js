import { Game } from './game/Game.js';
import { StartupScreen } from './game/StartupScreen.js';
import { IntroSequence } from './game/IntroSequence.js';

let activeGame = null;
let activeStartup = null;
let activeIntro = null;

// Preload large assets (yso.json is 21MB) as early as possible
let preloadedAssetsPromise = null;

function preloadAssets() {
    if (preloadedAssetsPromise) return preloadedAssetsPromise;
    preloadedAssetsPromise = Promise.all([
        fetch('src/assets/data/yso.json').then(r => r.json()),
        fetch('src/assets/data/palettes.json').then(r => r.json())
    ]).then(([yso, palettes]) => ({ yso, palettes }))
      .catch(err => {
          console.error("Failed to preload assets:", err);
          return null; // Fallback to fetching in Game.js
      });
    return preloadedAssetsPromise;
}

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
        activeIntro = new IntroSequence(canvas, lang, async () => {
            // Wait for preloaded assets before starting the game
            const assets = await preloadAssets();
            
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
            activeGame = new Game(lang, assets);
            activeGame.start();
            // The language-select gesture (Enter/Space) already unlocked the AudioContext,
            // so we can start music immediately.
            activeGame.startMusicAutoplay();
        });
    });
}

window.addEventListener('load', () => {
    preloadAssets(); // Start loading immediately
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
