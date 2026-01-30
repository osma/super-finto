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

        this.animate = this.animate.bind(this);
        this.init();
    }

    async init() {
        try {
            const response = await fetch('/src/assets/data/yso.json');
            const concepts = await response.json();
            // const keys = Object.keys(concepts);
            // const randomKey = keys[Math.floor(Math.random() * keys.length)];
            const conceptKey = 'http://www.yso.fi/onto/yso/p949';
            const conceptData = concepts[conceptKey];

            this.concept = {
                id: conceptKey.split('/').pop(),
                label_fi: conceptData.label_fi,
                label_sv: conceptData.label_sv,
                label_en: conceptData.label_en,
                related: conceptData.related || []
            };

            // Calculate level width based on related concepts
            const relatedCount = this.concept.related.length;
            if (relatedCount <= 3) {
                this.levelWidth = 800;
            } else {
                this.levelWidth = Math.max(800, (relatedCount + 1) * 300);
            }

            this.updateHUD();
        } catch (error) {
            console.error("Failed to load YSO concepts:", error);
        }
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

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(this.animate);
    }

    update(deltaTime) {
        if (this.isGameOver) return;
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

        this.ctx.restore();
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
