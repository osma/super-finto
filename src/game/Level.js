export class Level {
    constructor(game) {
        this.game = game;
        this.tileSize = 40;

        // Define platforms as groups first
        const platformGroups = [
            { tx: 5, ty: 11, tw: 4, th: 1 },
            { tx: 11, ty: 8, tw: 5, th: 1 },
            { tx: 4, ty: 6, tw: 3, th: 1 },
            { tx: 12, ty: 4, tw: 5, th: 1 },
            { tx: 20, ty: 10, tw: 5, th: 2 },
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
        const groundTileCount = Math.ceil(5000 / this.tileSize);
        for (let i = 0; i < groundTileCount; i++) {
            this.drawBrickTile(ctx, i * this.tileSize, groundY, this.tileSize, 50, '#92450e', true);
        }

        // Draw Individual Tiles
        this.tiles.forEach(tile => {
            const px = tile.tx * this.tileSize;
            const py = tile.ty * this.tileSize;
            this.drawBrickTile(ctx, px, py, this.tileSize, this.tileSize, '#f97316');
        });
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
                } else if (minOverlap === overlapBottom && player.vy < 0) {
                    // Bottom Collision (Head Hit)
                    player.y = py + ph;
                    player.vy = 1; // Small bounce down

                    if (tile.type === 'brick') {
                        console.log("SMASH!");
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
    }
}
