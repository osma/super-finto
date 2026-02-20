export class LifeTree {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('tree-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = 140;
            this.canvas.height = 160;
        }

        this.leafCount = 0;
        this.baseAngle = -Math.PI / 2;
        this.branches = [];
        this.seed = 42;
    }

    setLeafCount(count) {
        this.leafCount = count;
        this.draw();
    }

    // Deterministic random
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.seed = 42; // Reset seed for deterministic growth

        const startX = this.canvas.width / 2;
        const startY = this.canvas.height - 10;

        // Root depth based on leaves
        // 0 leaves: depth 0 (just trunk)
        // 1-2 leaves: depth 1
        // 3-5 leaves: depth 2
        // ...
        const maxDepth = Math.min(8, Math.floor(Math.sqrt(this.leafCount * 2)));

        this.drawBranch(startX, startY, this.baseAngle, 25, 10, 0, maxDepth);
    }

    drawBranch(x, y, angle, length, width, depth, maxDepth) {
        const x2 = x + Math.cos(angle) * length;
        const y2 = y + Math.sin(angle) * length;

        this.ctx.strokeStyle = '#4b2c20'; // Woody brown
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        if (depth < maxDepth) {
            // Randomish but deterministic splitting
            const splitAngle = 0.4 + this.seededRandom() * 0.3;
            const lengthScale = 0.75 + this.seededRandom() * 0.1;

            this.drawBranch(x2, y2, angle - splitAngle, length * lengthScale, width * 0.7, depth + 1, maxDepth);
            this.drawBranch(x2, y2, angle + splitAngle, length * lengthScale, width * 0.7, depth + 1, maxDepth);
        } else if (depth > 0) {
            // Draw leaves at the end of branches
            this.drawLeaf(x2, y2);
        }
    }

    drawLeaf(x, y) {
        // Only draw half of the leaves if we are at max depth to avoid overcrowding
        if (this.seededRandom() > 0.5) return;

        this.ctx.fillStyle = this.game.currentPalette?.brick || '#22c55e'; // Use level palette or green
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 3, 5, this.seededRandom() * Math.PI, 0, Math.PI * 2);
        this.ctx.fill();
    }
}
