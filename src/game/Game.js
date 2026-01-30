import { InputHandler } from './InputHandler.js';
import { Player } from './Player.js';
import { Level } from './Level.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputHandler();

        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.player = new Player(this);
        this.level = new Level(this);

        this.camera = { x: 0, y: 0 };
        this.lastTime = 0;
        this.score = 0;
        this.world = "yso:-";
        this.concept = null;
        this.levelWidth = 800;

        // Game State
        this.isGameOver = false;
        this.transition = {
            active: false,
            state: 'none', // 'pipe_out', 'loading', 'pipe_in'
            targetUri: null,
            timer: 0,
            pipeX: 0,
            pipeY: 0
        };

        this.animate = this.animate.bind(this);
        this.init();
    }

    async init() {
        try {
            const response = await fetch('/src/assets/data/yso.json');
            this.allConcepts = await response.json();

            // Initial concept
            const startKey = 'http://www.yso.fi/onto/yso/p949';
            this.loadConcept(startKey);
        } catch (error) {
            console.error("Failed to load YSO concepts:", error);
        }
    }

    startPipeTransition(targetUri, pipeX, pipeY) {
        if (this.transition.active) return;

        console.log("Starting pipe transition to:", targetUri);
        this.transition = {
            active: true,
            state: 'pipe_out',
            targetUri: targetUri,
            timer: 0,
            pipeX: pipeX,
            pipeY: pipeY
        };

        // Center player on pipe for the animation
        this.player.x = pipeX + 100 / 2 - this.player.width / 2;
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
            label_fi: conceptData.label_fi,
            label_sv: conceptData.label_sv,
            label_en: conceptData.label_en,
            related: (conceptData.related || []).map(uri => {
                const relatedConcept = this.allConcepts[uri];
                return {
                    id: uri.split('/').pop(),
                    uri: uri, // Store full URI for lookup
                    label_fi: relatedConcept ? relatedConcept.label_fi : uri,
                    label_sv: relatedConcept ? relatedConcept.label_sv : '',
                    label_en: relatedConcept ? relatedConcept.label_en : ''
                };
            })
        };

        // Calculate level width based on related concepts
        const relatedCount = this.concept.related.length;
        if (relatedCount > 0) {
            // Find the furthest pipe position
            const lastPipeX = this.getPipeX(relatedCount - 1);
            this.levelWidth = Math.max(800, lastPipeX + 400); // 400px buffer after last pipe
        } else {
            this.levelWidth = 800;
        }

        // Generate Level Tiles
        this.level.generate(this.concept.uri);

        // Reset positions / Handle Pipe Spawn
        if (this.player) {
            if (sourceUri) {
                // Find index of the source concept to spawn on that pipe
                const relatedIndex = this.concept.related.findIndex(r => r.uri === sourceUri);
                if (relatedIndex !== -1) {
                    const pipeX = this.getPipeX(relatedIndex);
                    const pipeWidth = 100;
                    const groundY = this.height - 50;

                    // Setup 'Pipe In' Animation
                    this.transition.state = 'pipe_in';
                    this.transition.pipeX = pipeX;
                    this.transition.pipeY = groundY - 40; // Start of pipe

                    // Start DEEP inside pipe
                    this.player.x = pipeX + pipeWidth / 2 - this.player.width / 2;
                    this.player.y = groundY; // Bottom of pipe (ish)
                    this.player.vx = 0;
                    this.player.vy = 0;

                    // Update camera immediately to show this pipe
                    this.camera.x = this.player.x - this.width / 2 + this.player.width / 2;
                } else {
                    // Fallback if source pipe not found
                    this.resetPlayerDefault();
                }
            } else {
                this.resetPlayerDefault();
            }

            // Clamp camera immediately
            if (this.camera.x < 0) this.camera.x = 0;
            if (this.camera.x > this.levelWidth - this.width) {
                this.camera.x = this.levelWidth - this.width;
            }
        }

        this.updateHUD();
    }

    resetPlayerDefault() {
        this.player.x = 100;
        this.player.y = this.height - this.player.height - 50;
        this.player.vx = 0;
        this.player.vy = 0;
        this.camera.x = 0;
        this.transition.active = false; // No animation for default spawn
    }

    updateHUD() {
        if (!this.concept) return;
        const worldEl = document.getElementById('world');
        const fiEl = document.getElementById('label-fi');
        const svEl = document.getElementById('label-sv');
        const enEl = document.getElementById('label-en');

        if (worldEl) worldEl.textContent = `yso:${this.concept.id}`;
        if (fiEl) fiEl.textContent = `FI: ${this.concept.label_fi || '-'}`;
        if (svEl) svEl.textContent = `SV: ${this.concept.label_sv || '-'}`;
        if (enEl) enEl.textContent = `EN: ${this.concept.label_en || '-'}`;
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

        // Base pos: 300 + index * 300
        // Variance: +/- 100px
        const variance = (normalized - 0.5) * 200;

        return 300 + index * 300 + variance;
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(this.animate);
    }

    update(deltaTime) {
        if (this.isGameOver) return;

        // --- TRANSITION LOGIC ---
        if (this.transition.active) {
            const speed = 2; // Pixel per frame movement for animation

            if (this.transition.state === 'pipe_out') {
                // Moving Down
                this.player.y += speed;

                // If we've gone down enough (e.g., player height)
                const groundY = this.height - 50;
                if (this.player.y > groundY) { // Fully submerged
                    this.transition.state = 'loading'; // Wait a sec?
                    // Verify logic: actually just load next concept
                    this.loadConcept(this.transition.targetUri, this.concept.uri);
                }
                return; // SKIP normal update
            }
            else if (this.transition.state === 'pipe_in') {
                // Moving Up
                const groundY = this.height - 50;
                const targetY = (groundY - 40) - this.player.height; // Top of pipe

                this.player.y -= speed;

                if (this.player.y <= targetY) {
                    this.player.y = targetY;
                    this.transition.active = false; // Done!
                    this.transition.state = 'none';
                    this.player.grounded = true;
                }
                return; // SKIP normal update
            }
        }

        // Normal Update
        this.player.update(this.input);
        this.level.checkCollisions(this.player);

        // Player boundary (X)
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.levelWidth) {
            this.player.x = this.levelWidth - this.player.width;
        }

        // Camera follow player (center)
        this.camera.x = this.player.x - this.width / 2 + this.player.width / 2;

        // Clamp camera
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.x > this.levelWidth - this.width) {
            this.camera.x = this.levelWidth - this.width;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // --- STATIC ELEMENTS (No camera translation) ---
        // Draw background (8-bit Sky)
        this.ctx.fillStyle = '#5c94fc'; // Classic NES Mario sky blue
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Ambient Pixels
        this.drawBackgroundDetails();

        // --- WORLD ELEMENTS (Camera translation) ---
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Draw Level
        this.level.draw(this.ctx);

        // Draw Player
        this.player.draw(this.ctx);

        // Draw Pipe Overlay (Foreground) during transition to hide player
        if (this.transition.active) {
            this.drawPipeOverlay();
        }

        this.ctx.restore();
    }

    drawPipeOverlay() {
        const x = this.transition.pipeX;
        const y = this.transition.pipeY;
        const pipeWidth = 100;
        const totalHeight = this.height - y;
        const capHeight = 15;

        // Draw a green rect over the player's position matching the pipe body
        // This makes the player look like they are "inside"

        // We only obscure the Body, leaving the Cap usually
        // Actually, to look like entering via Top, we need to draw the Front of the pipe
        // over the player. 

        // Simple trick: Just draw the main pipe body AGAIN.
        this.ctx.fillStyle = '#16a34a'; // Green
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
        // ctx.fillRect(x + 10, y + 2, 8, capHeight - 4); // Don't draw cap highligh, player is behind checks
        this.ctx.fillRect(x + 10, y + capHeight + 5, 8, totalHeight - capHeight - 10);
    }

    drawBackgroundDetails() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 30; i++) {
            const x = (Math.sin(i * 123) * 0.5 + 0.5) * this.width;
            const y = (Math.cos(i * 234) * 0.5 + 0.5) * (this.height - 100);
            this.ctx.fillRect(x, y, 4, 4); // Pixelated "stars" or clouds
        }
    }

    animate(timeStamp) {
        const deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;

        this.update(deltaTime);
        this.draw();

        if (!this.isGameOver) {
            requestAnimationFrame(this.animate);
        }
    }
}
