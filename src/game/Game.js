import { InputHandler } from './InputHandler.js';
import { Player } from './Player.js';
import { Level } from './Level.js';
import { PALETTES } from './Palettes.js';
import { MusicEngine } from '../audio/MusicEngine.js';
import { SFXEngine } from '../audio/SFXEngine.js';
import { LifeTree } from './LifeTree.js';
import { getLang, getLabel, getConceptLabel } from './i18n.js';

export class Game {
    constructor(language = 'en') {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputHandler(this);

        // Localization
        this.language = language;

        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.player = new Player(this);
        this.level = new Level(this);

        // Audio
        this.musicEngine = new MusicEngine();
        this.sfxEngine = new SFXEngine();
        this.musicStarted = false;
        this.lifeTree = new LifeTree(this);
        this.leavesCollected = 0;
        this.collectedLeafUris = new Set();
        this.lifeTree.setLeafCount(this.leavesCollected);

        this.camera = { x: 0, y: 0 };
        this.lastTime = 0;
        this.score = 0;
        this.coins = 0;
        this.world = "yso:-";
        this.concept = null;
        this.levelWidth = 800;

        // Pre-render static background for performance
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.width = 1536; // 768 * 2
        this.backgroundCanvas.height = 1024; // 512 * 2
        this.drawDefaultBackground(this.backgroundCanvas.getContext('2d'));

        // Game State
        this.isGameOver = false;
        this.isPaused = false;
        this.pauseTimer = 0;
        this.lives = 3;

        this.deathOverlay = {
            opacity: 0,
            state: 'none' // 'none', 'fading_out', 'fading_in'
        };
        this.transition = {
            active: false,
            state: 'none', // 'pipe_out', 'transition_screen', 'pipe_in'
            targetUri: null,
            targetConcept: null, // Store data before loading
            timer: 0,
            pipeX: 0,
            pipeY: 0
        };

        this.animate = this.animate.bind(this);
        this.init();
    }

    async init() {
        try {
            const [ysoRes, paletteRes] = await Promise.all([
                fetch('src/assets/data/yso.json'),
                fetch('src/assets/data/palettes.json')
            ]);

            this.allConcepts = await ysoRes.json();
            this.paletteMapping = await paletteRes.json();

            // Always start at YSO root concept scheme
            const rootUri = 'http://www.yso.fi/onto/yso/';
            const startKey = this.allConcepts[rootUri] ? rootUri
                : Object.keys(this.allConcepts)[0];

            this.loadConcept(startKey);
            this.updateLegend();
        } catch (error) {
            console.error("Failed to load game data:", error);
        }
    }

    startPipeTransition(targetUri, pipeX, pipeY, direction = 'down') {
        if (this.transition.active) return;

        console.log("Starting pipe transition to:", targetUri, direction);
        this.transition = {
            active: true,
            state: 'pipe_out',
            targetUri: targetUri,
            direction: direction,
            timer: 0,
            pipeX: pipeX,
            pipeY: pipeY
        };

        this.sfxEngine.playPipe();

        // Align player on pipe for the animation
        if (direction === 'down') {
            this.player.x = pipeX + 80 / 2 - this.player.width / 2;
        } else if (direction === 'left') {
            // Align Y center to pipe center (pipe height 80)
            this.player.y = pipeY + 80 / 2 - this.player.height / 2;
        }
    }

    transitionTo(targetUri, x, y) {
        if (this.transition.active) return;

        console.log("Transitioning to root concept:", targetUri);
        this.transition = {
            active: true,
            state: 'pipe_out',
            targetUri: targetUri,
            direction: 'up', // Whirlwind return
            timer: 0,
            pipeX: x,
            pipeY: y
        };
        this.sfxEngine.playPipe();
    }

    loadConcept(conceptKey, sourceUri = null) {
        if (!this.allConcepts || !this.allConcepts[conceptKey]) {
            console.error("Concept not found:", conceptKey);
            this.transition.active = false; // Reset if failed
            return;
        }

        const conceptData = this.allConcepts[conceptKey];

        this.concept = {
            id: conceptKey.split('/').pop(),
            uri: conceptKey,
            label_fi: conceptData.label_fi || '-',
            label_sv: conceptData.label_sv || '-',
            label_en: conceptData.label_en || '-',
            label_se: conceptData.label_se || '-',
            related: (conceptData.related || []).map(uri => {
                const relatedConcept = this.allConcepts[uri];
                return {
                    id: uri.split('/').pop(),
                    uri: uri,
                    label_fi: relatedConcept ? relatedConcept.label_fi : uri,
                    label_sv: relatedConcept ? relatedConcept.label_sv : '',
                    label_en: relatedConcept ? relatedConcept.label_en : '',
                    label_se: relatedConcept ? (relatedConcept.label_se || '') : ''
                };
            }),
            broader: (conceptData.broader || []).map(uri => {
                const c = this.allConcepts[uri];
                return {
                    id: uri.split('/').pop(),
                    uri: uri,
                    label_fi: c ? c.label_fi : uri,
                    label_sv: c ? c.label_sv : '',
                    label_en: c ? c.label_en : '',
                    label_se: c ? (c.label_se || '') : ''
                };
            }),
            narrower: (conceptData.narrower || []).map(uri => {
                const c = this.allConcepts[uri];
                return {
                    id: uri.split('/').pop(),
                    uri: uri,
                    label_fi: c ? c.label_fi : uri,
                    label_sv: c ? c.label_sv : '',
                    label_en: c ? c.label_en : '',
                    label_se: c ? (c.label_se || '') : ''
                };
            }),
            altLabels: [
                ...(conceptData.altlabel_fi || []).map(l => ({ label: l, lang: 'fi' })),
                ...(conceptData.altlabel_sv || []).map(l => ({ label: l, lang: 'sv' })),
                ...(conceptData.altlabel_en || []).map(l => ({ label: l, lang: 'en' })),
                ...(conceptData.altlabel_se || []).map(l => ({ label: l, lang: 'se' }))
            ],
            wikidata: conceptData.wikidata || []
        };

        // Select Palette from mapping
        let paletteKey = this.paletteMapping ? this.paletteMapping[this.concept.id] : null;

        // Fallback to random if mapping is missing or doesn't exist
        if (!paletteKey || !PALETTES[paletteKey]) {
            const paletteKeys = Object.keys(PALETTES);
            paletteKey = paletteKeys[Math.floor(Math.random() * paletteKeys.length)];
            console.log("No mapping found for concept, chose random palette:", paletteKey);
        }

        this.currentPalette = PALETTES[paletteKey];
        console.log("Selected Palette:", this.currentPalette.name);

        this.physicsModifiers = this.calculatePhysicsModifiers();
        console.log("Physics Modifiers:", this.physicsModifiers);

        this.level.setPalette(this.currentPalette);
        this.lifeTree.draw();

        // Update Music Seed for the new level
        // Complexity based on number of narrower concepts (0.0 to 1.0)
        const complexity = Math.min(1.0, (this.concept.narrower?.length || 0) / 10);
        this.musicEngine.init(conceptKey, this.currentPalette.music, complexity);
        // Start music (or restart for a new level). The first call is a no-op if
        // the AudioContext hasn't been unlocked yet by a user gesture.
        if (this.musicStarted) {
            this.musicEngine.start();
        }

        // Load Background (Custom jpg or fallback to sky)
        const conceptId = conceptKey.split('/').pop();
        this.latestBGConceptId = conceptId; // Track current request
        const bgId = conceptId === "" ? "p22929" : conceptId;
        const bgPath = `src/assets/images/backgrounds/${bgId}.jpg`;
        const bgImg = new Image();
        bgImg.onload = () => {
            // Only draw if this is still the latest requested concept
            if (this.latestBGConceptId === conceptId) {
                const bgCtx = this.backgroundCanvas.getContext('2d');
                bgCtx.drawImage(bgImg, 0, 0, 1536, 1024);
            }
        };
        bgImg.onerror = () => {
            if (this.latestBGConceptId === conceptId) {
                this.drawDefaultBackground(this.backgroundCanvas.getContext('2d'));
            }
        };
        bgImg.src = bgPath;

        // Calculate level width based on related concepts
        const relatedCount = this.concept.related.length;
        if (relatedCount > 0) {
            // Find the furthest pipe position
            const lastPipeX = this.getPipeX(relatedCount - 1);
            const rawWidth = Math.max(800, lastPipeX + 400); // 400px buffer after last pipe
            this.levelWidth = Math.ceil(rawWidth / 40) * 40;
        } else {
            this.levelWidth = 800;
        }

        // Generate Level Tiles
        this.level.generate(this.concept.uri);

        // Reset positions / Handle Pipe Spawn
        // Reset positions / Handle Pipe Spawn
        if (this.player) {
            this.player.vx = 0;
            this.player.vy = 0;
            this.transition.direction = 'down'; // Default

            if (sourceUri) {
                // Check Ground Pipes (Related)
                const relatedIndex = this.concept.related.findIndex(r => r.uri === sourceUri);
                const broaderIndex = this.concept.broader.findIndex(b => b.uri === sourceUri);
                const narrowerIndex = this.concept.narrower.findIndex(n => n.uri === sourceUri);

                const groundY = this.height - 40; // Align with Level.js

                if (relatedIndex !== -1) {
                    const pipeX = this.getPipeX(relatedIndex);
                    const pipeWidth = 80;

                    // Setup 'Pipe In' Animation (Upwards)
                    this.transition.state = 'pipe_in';
                    this.transition.pipeX = pipeX;
                    this.transition.pipeY = groundY - 40;
                    this.transition.direction = 'down';
                    this.sfxEngine.playPipe();

                    // Start DEEP inside pipe
                    this.player.x = pipeX + pipeWidth / 2 - this.player.width / 2;
                    this.player.y = groundY;

                    this.camera.x = this.player.x - this.width / 2 + this.player.width / 2;

                } else if (broaderIndex !== -1) {
                    // Came from Broader concept (which is now on Left Wall)
                    // Spawn Left Wall, Moving Right
                    const pipeHeight = 80;
                    const gap = 40;
                    const y = (groundY - 80) - (broaderIndex * (pipeHeight + gap));

                    this.transition.state = 'pipe_in';
                    this.transition.pipeX = 0;
                    this.transition.pipeY = y;
                    this.transition.direction = 'right';
                    this.sfxEngine.playPipe();

                    // Start DEEP inside pipe (Left of 0)
                    this.player.x = -this.player.width;
                    this.player.y = y + pipeHeight / 2 - this.player.height / 2;

                    this.camera.x = 0;

                } else if (narrowerIndex !== -1) {
                    // Came from Narrower concept (which is now on Right Wall)
                    // Spawn Right Wall, Moving Left
                    const pipeHeight = 80;
                    const gap = 40;
                    const y = (groundY - 80) - (narrowerIndex * (pipeHeight + gap));

                    this.transition.state = 'pipe_in';
                    this.transition.pipeX = this.levelWidth;
                    this.transition.pipeY = y;
                    this.transition.direction = 'left';
                    this.sfxEngine.playPipe();

                    // Start DEEP inside pipe (Right of Width)
                    this.player.x = this.levelWidth;
                    this.player.y = y + pipeHeight / 2 - this.player.height / 2;

                    // Align camera to right edge
                    this.camera.x = this.levelWidth - this.width;

                }
            } else {
                this.resetPlayerDefault();
            }

            // Clamp camera immediately
            if (this.camera.x < 0) this.camera.x = 0;
            if (this.camera.x > this.levelWidth - this.width) {
                this.camera.x = this.levelWidth - this.width;
            }

            // Fix Camera Y initialization: Center on player immediately
            this.camera.y = this.player.y - this.height / 2 + this.player.height / 2;
            if (this.camera.y > 0) this.camera.y = 0;
        }

        this.updateHUD();
    }

    resetPlayerDefault() {
        this.player.reset();
        this.player.x = 100;
        this.player.y = this.height - this.player.height - 50;


        this.camera.x = 0;
        this.camera.y = 0; // Default ground level
        this.transition.active = false; // No animation for default spawn
    }

    updateHUD() {
        if (!this.concept) return;
        const strings = getLang(this.language);

        const worldEl = document.getElementById('world');
        if (worldEl) worldEl.textContent = `yso:${this.concept.id}`;

        // Show all 4 language labels; selected language first, then the rest
        const allLangs = ['en', 'fi', 'sv', 'se'];
        const orderedLangs = [this.language, ...allLangs.filter(l => l !== this.language)];
        const langKeys = { en: 'label_en', fi: 'label_fi', sv: 'label_sv', se: 'label_se' };
        const langPrefixes = { en: 'EN', fi: 'FI', sv: 'SV', se: 'SE' };
        const labelIds = ['label-primary', 'label-2', 'label-3', 'label-4'];
        orderedLangs.forEach((lang, i) => {
            const el = document.getElementById(labelIds[i]);
            if (el) {
                const val = this.concept[langKeys[lang]] || '-';
                el.textContent = `${langPrefixes[lang]}: ${val}`;
            }
        });

        const coinsEl = document.getElementById('coins-counter');
        if (coinsEl) coinsEl.textContent = `x ${this.coins}`;

        const livesEl = document.getElementById('lives-counter');
        if (livesEl) livesEl.textContent = strings.lives(this.lives);

        const scoreLabel = document.getElementById('hud-score-label');
        if (scoreLabel) scoreLabel.textContent = strings.score;

        const conceptLabel = document.getElementById('hud-concept-label');
        if (conceptLabel) conceptLabel.textContent = strings.concept;
    }

    addCoin() {
        this.coins++;
        if (this.coins >= 100) {
            this.coins = 0;
            this.lives++;
            if (this.sfxEngine) this.sfxEngine.playExtraLife();
            
            // Show floating "1UP" text
            if (this.level && this.player) {
                this.level.spawnFloatingScore(
                    this.player.x + this.player.width / 2,
                    this.player.y - 40,
                    "1UP"
                );
            }
        }
        this.addScore(200);
        this.updateHUD();
    }

    addScore(points) {
        this.score += points;
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
            scoreEl.textContent = this.score.toString().padStart(5, '0');
        }

        // Add visual floating score above player
        if (this.level && this.player) {
            this.level.spawnFloatingScore(
                this.player.x + this.player.width / 2,
                this.player.y - 10,
                points
            );
        }
    }

    getPipeX(index) {
        if (!this.concept || !this.concept.uri) return 300 + index * 300;

        // Deterministic hash based on concept URI and pipe index
        const str = this.concept.uri + index;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }

        const normalized = (Math.abs(hash) % 1000) / 1000; // 0 to 1

        const tileSize = 40;
        // Base pos: ~320 + index * 320
        // Variance: +/- 120px
        const varianceRaw = (normalized - 0.5) * 240;
        // Snap variance to grid
        const variance = Math.round(varianceRaw / tileSize) * tileSize;

        // Ensure base is also grid aligned
        const limit = 320;
        return limit + index * 320 + variance;
    }

    start() {
        this.lastTime = performance.now();
        this.lastFpsTime = this.lastTime;
        this.frameCount = 0;
        this.fps = 0;
        this.accumulator = 0;
        this.timeStep = 1000 / 144; // Fixed 144 Hz update logic (matches original fast development speed)
        this._animFrameId = requestAnimationFrame(this.animate);
    }

    update(deltaTime) {
        if (this.isGameOver) return;

        // --- TRANSITION LOGIC ---
        if (this.transition.active) {
            const speed = 2; // Pixel per frame movement for animation

            if (this.transition.state === 'pipe_out') {
                let readyToTransition = false;
                if (this.transition.direction === 'down') {
                    // Moving Down
                    this.player.y += speed;

                    const groundY = this.height - 40; // Align with Level.js
                    if (this.player.y > groundY) {
                        readyToTransition = true;
                    }
                } else if (this.transition.direction === 'left') {
                    // Moving Left
                    this.player.x -= speed;
                    if (this.player.x < 20) {
                        readyToTransition = true;
                    }
                } else if (this.transition.direction === 'right') {
                    // Moving Right
                    this.player.x += speed;
                    const lw = this.levelWidth;
                    if (this.player.x > lw - 60) {
                        readyToTransition = true;
                    }
                } else if (this.transition.direction === 'up') {
                    // Whirlwind Return
                    this.player.y -= speed * 5;
                    this.player.vy = -10;
                    if (this.player.y < -200) {
                        readyToTransition = true;
                    }
                }

                if (readyToTransition) {
                    this.transition.state = 'transition_screen';
                    this.transition.timer = 2000; // 2 seconds

                    // Prepare Overlay text
                    const targetData = this.allConcepts[this.transition.targetUri];
                    const targetId = this.transition.targetUri.split('/').pop();
                    const targetLabel = targetData ? getLabel(targetData, this.language) : 'Unknown';

                    const titleEl = document.getElementById('transition-title');
                    const subtitleEl = document.getElementById('transition-subtitle');
                    const livesEl = document.getElementById('transition-lives');

                    const strings = getLang(this.language);
                    if (titleEl) titleEl.textContent = `yso:${targetId}`;
                    if (subtitleEl) subtitleEl.textContent = targetLabel;
                    if (livesEl) livesEl.textContent = strings.transitionLives(this.lives);

                    const overlayEl = document.getElementById('transition-overlay');
                    if (overlayEl) overlayEl.classList.remove('hidden');

                    if (this.musicStarted) {
                        this.musicEngine.fadeOut(1.5);
                    }
                }
                return; // SKIP normal update
            }
            else if (this.transition.state === 'transition_screen') {
                this.transition.timer -= deltaTime;
                if (this.transition.timer <= 0) {
                    const overlayEl = document.getElementById('transition-overlay');
                    if (overlayEl) overlayEl.classList.add('hidden');

                    // Actually load the level geometry now
                    this.loadConcept(this.transition.targetUri, this.concept.uri);
                    // loadConcept sets transition.state to 'pipe_in', so we continue
                }
                return; // SKIP normal update
            }
            else if (this.transition.state === 'pipe_in') {
                const groundY = this.height - 40; // Align with Level.js

                if (this.transition.direction === 'down') {
                    // Moving Up
                    const targetY = (groundY - 40) - this.player.height; // Top of pipe
                    this.player.y -= speed;
                    if (this.player.y <= targetY) {
                        this.player.y = targetY;
                        this.transition.active = false; // Done!
                        this.transition.state = 'none';
                        this.player.grounded = true;
                    }
                } else if (this.transition.direction === 'left') {
                    // Moving Left out of Right Wall Pipe (Narrower -> Broader return)
                    // Wait, direction 'left' means I entered moving LEFT.
                    // So I should exit moving LEFT.
                    // Meaning I spawn on Right Wall and move Left.

                    const targetX = this.levelWidth - 80 - this.player.width - 5;
                    this.player.x -= speed;
                    if (this.player.x <= targetX) {
                        this.player.x = targetX;
                        this.transition.active = false;
                        this.transition.state = 'none';
                    }
                } else if (this.transition.direction === 'right') {
                    // Moving Right out of Left Wall Pipe
                    const targetX = 80 + 5;
                    this.player.x += speed;
                    if (this.player.x >= targetX) {
                        this.player.x = targetX;
                        this.transition.active = false;
                        this.transition.state = 'none';
                    }
                }

                return; // SKIP normal update
            }
        }

        // Normal Update
        this.player.update(this.input, deltaTime);
        this.level.update(deltaTime);
        this.level.checkCollisions(this.player);

        // Player boundary (X)
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.levelWidth) {
            this.player.x = this.levelWidth - this.player.width;
        }

        // Camera follow player (center both X and Y)
        this.camera.x = this.player.x - this.width / 2 + this.player.width / 2;

        // Vertical follow: Only follow if player is above ground level
        const groundY = this.height - 40;
        if (this.player.y < groundY) {
            this.camera.y = this.player.y - this.height / 2 + this.player.height / 2;
        } else {
            this.camera.y = 0; // Lock to ground view
        }

        // Clamp camera X
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.x > this.levelWidth - this.width) {
            this.camera.x = this.levelWidth - this.width;
        }

        // Clamp camera Y (between ceiling and ground)
        const ceilingY = (this.level.minRow - 1) * this.level.tileSize;
        if (this.camera.y < ceilingY) this.camera.y = ceilingY;
        if (this.camera.y > 0) this.camera.y = 0;

        // --- DEATH FADE LOGIC ---
        if (this.player.isDying && this.deathOverlay.state === 'none') {
            // Wait for player to fall below screen or enough time passes
            if (this.player.dieTimer > 160 || this.player.y > this.height + 100) {
                this.deathOverlay.state = 'fading_out';
            }
        }

        if (this.deathOverlay.state === 'fading_out') {
            this.deathOverlay.opacity += 0.01;
            if (this.deathOverlay.opacity >= 1) {
                this.deathOverlay.opacity = 1;
                this.deathOverlay.state = 'fading_in';

                // Decrement life and check for game over
                this.lives--;
                this.updateHUD();

                if (this.lives === 0) {
                    this.isGameOver = true;
                    const strings = getLang(this.language);
                    const titleEl = document.getElementById('overlay-title');
                    if (titleEl) titleEl.textContent = strings.gameOver;
                    const restartEl = document.getElementById('overlay-restart');
                    if (restartEl) restartEl.innerHTML = strings.pressRestart;
                    document.getElementById('overlay').classList.remove('hidden');
                    // Stop music
                    if (this.musicStarted) {
                        this.musicEngine.stop();
                    }
                    this.sfxEngine.playGameOver();
                } else {
                    this.level.respawnPlayer(); // Respawn while screen is black
                }
            }
        } else if (this.deathOverlay.state === 'fading_in') {
            this.deathOverlay.opacity -= 0.01;
            if (this.deathOverlay.opacity <= 0) {
                this.deathOverlay.opacity = 0;
                this.deathOverlay.state = 'none';
            }
        }
    }

    draw() {
        // --- PARALLAX BACKGROUND (Center-Aligned) ---
        const imgWidth = 1536;
        const imgHeight = 1024;

        // Horizontal Ratio (Actual progress through the level)
        const effectiveLevelWidth = Math.max(this.width, this.levelWidth);
        const ratioX = Math.min(1, Math.max(0, this.player.x / effectiveLevelWidth));

        // Vertical Ratio (Actual progress through height)
        const groundY = this.height - 40;
        const ceilingY = (this.level.minRow - 1) * this.level.tileSize;
        const levelHeightRange = Math.max(1, groundY - ceilingY);
        const ratioY = Math.min(1, Math.max(0, (this.player.y - ceilingY) / levelHeightRange));

        // Background Center Offsets
        const maxBgX = imgWidth - this.width;
        const maxBgY = imgHeight - this.height;
        const scrollRangeX = Math.min(maxBgX, 500);
        const scrollRangeY = Math.min(maxBgY, 300);

        const centerX = maxBgX / 2;
        const centerY = maxBgY / 2;

        // Apply offsets: When ratio is 0.5, bgX is centerX
        const bgX = centerX + (ratioX - 0.5) * scrollRangeX;
        const bgY = centerY + (ratioY - 0.5) * scrollRangeY;

        // Draw portion of the 1536x1024 background canvas
        this.ctx.drawImage(
            this.backgroundCanvas,
            Math.floor(bgX), Math.floor(bgY), this.width, this.height,
            0, 0, this.width, this.height
        );

        // --- WORLD ELEMENTS (Camera translation) ---
        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        // Draw Level
        this.level.draw(this.ctx);

        // Draw Player
        this.player.draw(this.ctx);

        // Draw Pipe Overlay (Foreground) during transition to hide player
        if (this.transition.active) {
            this.drawPipeOverlay();
        }

        // Draw Ground (FOREGROUND) to obscure player/pipes
        this.level.drawGround(this.ctx);

        // Draw Boundary Walls (TOP FOREGROUND) to frame the pipes
        this.level.drawBoundaryWalls(this.ctx);

        this.ctx.restore();

        // --- DEATH FADE OVERLAY (Global Screen Space) ---
        if (this.deathOverlay.opacity > 0) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${this.deathOverlay.opacity})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // --- PAUSE OVERLAY ---
        if (this.isPaused) {
            // Suble dim background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Blinking Text
            if (Math.floor(this.pauseTimer / 500) % 2 === 0) {
                const strings = getLang(this.language);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '32px SuperMario';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 4;
                this.ctx.strokeText(strings.paused, this.width / 2, this.height / 2);
                this.ctx.fillText(strings.paused, this.width / 2, this.height / 2);
            }
        }
    }

    drawPipeOverlay() {
        const x = this.transition.pipeX;
        const y = this.transition.pipeY;

        if (this.transition.direction === 'down') {
            // Vertical Pipe Overlay
            const pipeWidth = 80;
            const totalHeight = this.height - y;
            const capHeight = 15;

            this.ctx.fillStyle = this.currentPalette.pipe.dark; // Match palette
            this.ctx.fillRect(x, y + capHeight, pipeWidth, totalHeight - capHeight);

            // Borders
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + capHeight);
            this.ctx.lineTo(x, y + totalHeight);
            this.ctx.moveTo(x + pipeWidth, y + capHeight);
            this.ctx.lineTo(x + pipeWidth, y + totalHeight);
            this.ctx.stroke();

            // Re-draw highlights
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(x + 10, y + capHeight + 5, 8, totalHeight - capHeight - 10);
        } else {
            // Horizontal Pipe Overlay
            // Determine facing based on side of screen (roughly)
            const isLeftWall = x < this.levelWidth / 2;
            const dir = isLeftWall ? 'right' : 'left'; // Pipe sticks OUT to ...

            // Just redraw the pipe on top of player
            this.level.drawHorizontalPipe(this.ctx, x, y, dir, null);
        }
    }



    animate(timeStamp) {
        let deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;

        // Prevent spiral of death on long freezes
        if (deltaTime > 250) {
            deltaTime = 250;
        }

        const startUpdate = performance.now();
        let ticks = 0;

        if (this.isGameOver) {
            // Handle restart input — go back to startup screen
            if (this.input.isJumping() || this.input.isPressed('Enter')) {
                document.getElementById('overlay').classList.add('hidden');
                this.goToStartupScreen();
                return;
            }
        } else if (this.isPaused) {
            this.pauseTimer += deltaTime;
        } else {
            this.accumulator += deltaTime;
            while (this.accumulator >= this.timeStep) {
                this.update(this.timeStep);
                this.accumulator -= this.timeStep;
                ticks++;
            }
        }
        const endUpdate = performance.now();

        const startDraw = performance.now();
        this.draw();
        const endDraw = performance.now();

        this._animFrameId = requestAnimationFrame(this.animate);

        // --- PERFORMANCE DEBUGGING ---
        this.frameCount++;
        if (timeStamp - this.lastFpsTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsTime = timeStamp;
            console.log(`[PERF DEBUG] FPS: ${this.fps} | dt (real): ${(deltaTime).toFixed(1)}ms | Logic Ticks: ${ticks} | Logic CPU: ${(endUpdate - startUpdate).toFixed(2)}ms | Draw CPU: ${(endDraw - startDraw).toFixed(2)}ms`);
        }
    }

    drawDefaultBackground(ctx) {
        // Draw sky
        if (this.currentPalette && this.currentPalette.background) {
            ctx.fillStyle = this.currentPalette.background;
        } else {
            ctx.fillStyle = '#5c94fc'; // Classic NES Mario sky blue
        }
        ctx.fillRect(0, 0, 1536, 1024);

        // Draw background details (stars/clouds)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 50; i++) {
            const x = (Math.sin(i * 123) * 0.5 + 0.5) * 1536;
            const y = (Math.cos(i * 234) * 0.5 + 0.5) * 1024;
            this.ctx.fillRect(x, y, 6, 6);
        }
    }

    calculatePhysicsModifiers() {
        const modifiers = {
            gravity: 1.0,
            friction: 1.0,
            speed: 1.0,
            jump: 1.0
        };

        if (!this.concept) return modifiers;

        const labels = [
            this.concept.label_fi,
            this.concept.label_sv,
            this.concept.label_en,
            ...this.concept.altLabels.map(l => l.label)
        ].join(' ').toLowerCase();

        // Low Gravity / Floatiness
        const lowGravityKeywords = ["space", "moon", "cloud", "fly", "air", "light", "feather", "balloon", "sky", "lintu", "avaruus", "pilvi", "ilma", "höyhen"];
        if (lowGravityKeywords.some(k => labels.includes(k))) {
            modifiers.gravity = 0.5;
            modifiers.jump = 0.8; // Compensate slightly to avoid jumping out of level too easily
        }

        // High Gravity / Heavy
        const highGravityKeywords = ["heavy", "metal", "iron", "stone", "rock", "gold", "lead", "weight", "giant", "painava", "metalli", "rauta", "kivi", "kulta", "lyijy"];
        if (highGravityKeywords.some(k => labels.includes(k))) {
            modifiers.gravity = 1.5;
            modifiers.jump = 1.2;
        }

        // Slippery
        const slipperyKeywords = ["ice", "snow", "oil", "soap", "glass", "slide", "skate", "jää", "lumi", "öljy", "saippua", "lasi", "luistele"];
        if (slipperyKeywords.some(k => labels.includes(k))) {
            modifiers.friction = 0.2; // 1.0 is normal, lower is more slippery
        }

        // Fast
        const fastKeywords = ["fast", "speed", "quick", "rocket", "sonic", "bolt", "dash", "athlete", "run", "nopea", "vauhti", "raketti", "juoksu"];
        if (fastKeywords.some(k => labels.includes(k))) {
            modifiers.speed = 1.4;
        }

        return modifiers;
    }

    addLeaf() {
        if (this.concept && this.concept.uri) {
            this.collectedLeafUris.add(this.concept.uri);
        }
        this.leavesCollected++;
        this.lifeTree.setLeafCount(this.leavesCollected);
        console.log(`Leaf collected! Total: ${this.leavesCollected}`);
    }

    goToStartupScreen() {
        // Stop the animation loop by flagging — and show startup overlay
        cancelAnimationFrame(this._animFrameId);

        // Stop music
        if (this.musicStarted) {
            this.musicEngine.stop();
        }

        // Hide overlays
        const startupEl = document.getElementById('startup-overlay');
        const deathOverlayEl = document.getElementById('overlay');
        if (startupEl) startupEl.classList.remove('hidden');
        if (deathOverlayEl) deathOverlayEl.classList.add('hidden');

        // main.js will handle re-creating StartupScreen and re-starting the game
        // Dispatch a custom event so main.js can pick it up
        window.dispatchEvent(new CustomEvent('superfinto:returnToStartup'));
    }

    toggleMusic() {
        // Initialize SFX audio context on first user interaction
        this.sfxEngine.init();

        if (!this.musicStarted) {
            // First M press: unlock and start music
            this.musicEngine.start();
            this.musicStarted = true;
            return false; // not muted
        }
        return this.musicEngine.toggleMute();
    }

    /**
     * Called once after the startup screen's language-select gesture unlocks audio.
     * Starts music immediately without waiting for M press.
     */
    startMusicAutoplay() {
        if (this.musicStarted) return;
        this.sfxEngine.init();
        this.musicEngine.start();
        this.musicStarted = true;
    }

    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.musicEngine.fadeOut(0.5);
            this.pauseTimer = 0;
        } else {
            this.musicEngine.start();
        }
    }

    updateLegend() {
        const legendEl = document.getElementById('controls-legend');
        if (!legendEl) return;

        const strings = getLang(this.language);
        const controls = [
            { key: '←→↑↓', label: strings.move },
            { key: 'Space', label: strings.jump },
            { key: 'M', label: strings.music },
            { key: 'P', label: strings.pause },
            { key: 'Q', label: strings.quit }
        ];

        legendEl.innerHTML = controls.map(c => `
            <div class="legend-item">
                <span class="legend-key">${c.key}</span>
                <span class="legend-label">${c.label}</span>
            </div>
        `).join('');
    }
}
