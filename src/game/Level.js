export class Level {
    constructor(game) {
        this.game = game;
        this.tileSize = 40;

        // Define platforms as groups first
        const platformGroups = [
            { tx: 5, ty: 10, tw: 4, th: 1 },
            { tx: 11, ty: 7, tw: 5, th: 1 },
            { tx: 4, ty: 5, tw: 3, th: 1 },
            { tx: 12, ty: 3, tw: 5, th: 1 },
            { tx: 20, ty: 9, tw: 5, th: 2 },
        ];

        // Convert to individual tiles for granular interaction (smashing)
        this.tiles = [];
        platformGroups.forEach(group => {
            for (let r = 0; r < group.th; r++) {
                for (let c = 0; c < group.tw; c++) {
                    this.tiles.push({
                        tx: group.tx + c,
                        ty: group.ty + r,
                        type: 'brick'
                    });
                }
            }
        });
    }

    draw(ctx) {
        // Draw Ground Tiles
        const groundY = this.game.height - 50;
        const groundTileCount = Math.ceil(this.game.levelWidth / this.tileSize);
        for (let i = 0; i < groundTileCount; i++) {
            this.drawBrickTile(ctx, i * this.tileSize, groundY, this.tileSize, 50, '#92450e', true);
        }

        // Draw Related Concept Pipes
        if (this.game.concept && this.game.concept.related) {
            this.game.concept.related.forEach((rel, index) => {
                const x = 300 + index * 300;
                this.drawPipe(ctx, x, groundY - 60);
            });
        }

        // Draw Individual Tiles
        this.tiles.forEach(tile => {
            const px = tile.tx * this.tileSize;
            const py = tile.ty * this.tileSize;
            this.drawBrickTile(ctx, px, py, this.tileSize, this.tileSize, '#f97316');
        });
    }

    drawPipe(ctx, x, y) {
        const pipeWidth = 100;
        const capHeight = 15;
        const capExtra = 8;
        const totalHeight = this.game.height - y;

        // Main Body
        ctx.fillStyle = '#16a34a'; // Green
        ctx.fillRect(x, y + capHeight, pipeWidth, totalHeight - capHeight);

        // Body Borders (Left and Right only, no bottom)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + capHeight);
        ctx.lineTo(x, y + totalHeight);
        ctx.moveTo(x + pipeWidth, y + capHeight);
        ctx.lineTo(x + pipeWidth, y + totalHeight);
        ctx.stroke();

        // Cap
        ctx.fillStyle = '#22c55e'; // Lighter Green
        ctx.fillRect(x - capExtra, y, pipeWidth + (capExtra * 2), capHeight);
        ctx.strokeRect(x - capExtra, y, pipeWidth + (capExtra * 2), capHeight);

        // Highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 10, y + 2, 8, capHeight - 4);
        ctx.fillRect(x + 10, y + capHeight + 5, 8, totalHeight - capHeight - 10);
    }

    drawBrickTile(ctx, x, y, w, h, baseColor, isGround = false) {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        if (isGround) {
            ctx.fillStyle = '#16a34a'; // Grass green
            ctx.fillRect(x, y, w, 10);
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x + 5, y + 20, 4, 4);
            ctx.fillRect(x + 25, y + 35, 4, 4);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x, y, w, 2);
            ctx.fillRect(x, y, 2, h);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x, y + h - 2, w, 2);
            ctx.fillRect(x + w - 2, y, 2, h);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(x, y + h / 2, w, 1);
            ctx.fillRect(x + w / 2, y, 1, h / 2);
            ctx.fillRect(x + w / 4, y + h / 2, 1, h / 2);
        }
    }

    checkCollisions(player) {
        player.grounded = false;

        // Check ground
        const groundLevel = this.game.height - 50;
        if (player.y + player.height >= groundLevel) {
            if (player.vy >= 0) {
                player.y = groundLevel - player.height;
                player.vy = 0;
                player.grounded = true;
            }
        }

        // Check Individual Tiles
        let headHit = false;
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const tile = this.tiles[i];
            const px = tile.tx * this.tileSize;
            const py = tile.ty * this.tileSize;
            const pw = this.tileSize;
            const ph = this.tileSize;

            // Simple AABB Collision
            if (player.x + player.width > px &&
                player.x < px + pw &&
                player.y + player.height > py &&
                player.y < py + ph) {

                const overlapTop = (player.y + player.height) - py;
                const overlapBottom = (py + ph) - player.y;
                const overlapLeft = (player.x + player.width) - px;
                const overlapRight = (px + pw) - player.x;

                // Find the smallest overlap to determine collision direction
                const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                if (minOverlap === overlapTop && player.vy >= 0) {
                    // Top Collision (Landing)
                    player.y = py - player.height;
                    player.vy = 0;
                    player.grounded = true;
                } else if (minOverlap === overlapBottom && player.vy <= 0) {
                    // Bottom Collision (Head Hit)
                    player.y = py + ph;
                    headHit = true;

                    if (tile.type === 'brick') {
                        this.tiles.splice(i, 1);
                    }
                } else if (minOverlap === overlapLeft) {
                    // Left Collision
                    player.x = px - player.width;
                    player.vx = 0;
                } else if (minOverlap === overlapRight) {
                    // Right Collision
                    player.x = px + pw;
                    player.vx = 0;
                }
            }
        }

        if (headHit) {
            player.vy = 2.5; // Decisive bounce back down
        }
    }
}
