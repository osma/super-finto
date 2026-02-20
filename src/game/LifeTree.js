export class LifeTree {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('tree-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = 400;
            this.canvas.height = 350;
        }

        this.leafCount = 0;
        this.baseAngle = -Math.PI / 2;
        this.branches = [];
        this.seed = 42;
    }

    setLeafCount(count) {
        this.leafCount = count;
        const label = document.getElementById('tree-label');
        if (label) {
            label.textContent = `LEAVES: ${count}`;
        }
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
        this.leavesDrawn = 0;
        this.tipsVisited = 0;

        const startX = this.canvas.width / 2;
        const startY = this.canvas.height - 15;

        // Draw ground level
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(10, startY + 5);
        this.ctx.lineTo(this.canvas.width - 10, startY + 5);
        this.ctx.stroke();

        if (this.leafCount === 0) {
            // Just a little stump
            this.drawBranch(startX, startY, this.baseAngle, 30, 16, 0, 0);
            return;
        }

        // Tree parameters scaling VERY slowly
        // Max depth only increases every 10 leaves
        const maxDepth = Math.min(7, Math.floor(this.leafCount / 10) + 1);
        const trunkLength = 40 + Math.min(80, this.leafCount * 1.5);
        const trunkWidth = 14 + Math.min(16, this.leafCount * 0.3);

        this.totalTips = Math.pow(2, maxDepth);

        this.drawBranch(startX, startY, this.baseAngle, trunkLength, trunkWidth, 0, maxDepth);
    }

    drawBranch(x, y, angle, length, width, depth, maxDepth) {
        const x2 = x + Math.cos(angle) * length;
        const y2 = y + Math.sin(angle) * length;

        const colorValue = Math.max(30, 75 - depth * 8);
        this.ctx.strokeStyle = `rgb(${colorValue}, ${colorValue * 0.6}, ${colorValue * 0.4})`;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        if (depth < maxDepth) {
            const splitAngle = 0.2 + this.seededRandom() * 0.4;
            const lengthScale = 0.6 + this.seededRandom() * 0.2;

            this.drawBranch(x2, y2, angle - splitAngle, length * lengthScale, width * 0.7, depth + 1, maxDepth);
            this.drawBranch(x2, y2, angle + splitAngle, length * lengthScale, width * 0.7, depth + 1, maxDepth);
        } else {
            // Distribute exactly leafCount leaves across tips
            const tipsRemaining = this.totalTips - this.tipsVisited;
            const leavesRemaining = this.leafCount - this.leavesDrawn;
            const leavesAtThisTip = Math.ceil(leavesRemaining / tipsRemaining);

            for (let i = 0; i < leavesAtThisTip; i++) {
                if (this.leavesDrawn < this.leafCount) {
                    this.drawLeaf(x2, y2);
                    this.leavesDrawn++;
                }
            }
            this.tipsVisited++;
        }
    }

    drawLeaf(x, y) {
        // Spread leaves slightly
        const offsetX = (this.seededRandom() - 0.5) * 20;
        const offsetY = (this.seededRandom() - 0.5) * 20;

        const leafColors = [
            '#22c55e', '#16a34a', '#15803d',
            this.game.currentPalette?.brick || '#4ade80'
        ];

        this.ctx.fillStyle = leafColors[Math.floor(this.seededRandom() * leafColors.length)];
        this.ctx.beginPath();
        const leafSize = 6 + this.seededRandom() * 4;
        this.ctx.ellipse(x + offsetX, y + offsetY, leafSize / 2, leafSize, this.seededRandom() * Math.PI, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + offsetX - 1, y + offsetY - 1, 1, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }
}
