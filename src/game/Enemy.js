export class Enemy {
    constructor(x, y, label, tileSize) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.tileSize = tileSize;
        this.label = label;
        this.vx = -0.6; // Reduced walking speed
        this.vy = 0;
        this.weight = 0.15; // Lighter weight for slower falling
        this.grounded = false;
        this.isDead = false;
        this.deathTimer = 0;
    }

    update(level) {
        if (this.isDead) {
            this.deathTimer++;
            return;
        }

        // Apply Gravity
        this.vy = Math.min(this.vy + this.weight, 6); // Capped at 6 for slower falling
        this.y += this.vy;

        // Apply Horizontal Movement
        this.x += this.vx;

        this.checkCollisions(level);

        // Pit Death: If enemy falls below the world, mark as dead instantly
        if (this.y > level.game.height + 50) {
            this.isDead = true;
            this.deathTimer = 100; // Skip explosion/fade, just stay dead
        }
    }

    checkCollisions(level) {
        this.grounded = false;

        const groundY = level.game.height - 40;

        // --- Ground Pipe Collision ---
        if (level.game.concept && level.game.concept.related) {
            level.game.concept.related.forEach((rel, index) => {
                const px = level.game.getPipeX(index);
                const py = groundY - 40;
                const pw = 100;
                const ph = 40;

                if (this.x + this.width > px && this.x < px + pw &&
                    this.y + this.height > py && this.y < py + ph) {

                    const overlapTop = (this.y + this.height) - py;
                    const overlapBottom = (py + ph) - this.y;
                    const overlapLeft = (this.x + this.width) - px;
                    const overlapRight = (px + pw) - this.x;

                    const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                    if (minOverlap === overlapTop && this.vy >= 0) {
                        this.y = py - this.height;
                        this.vy = 0;
                        this.grounded = true;
                    } else if (minOverlap === overlapBottom && this.vy < 0) {
                        this.y = py + ph;
                        this.vy = 0;
                    } else {
                        // Vertical Inset: Ignore horizontal collisions that happen at the very bottom/top
                        const vInset = 4;
                        const isWithinVerticalBody = overlapTop > vInset && overlapBottom > vInset;

                        if (minOverlap === overlapLeft && isWithinVerticalBody) {
                            this.x = px - this.width;
                            this.vx *= -1;
                        } else if (minOverlap === overlapRight && isWithinVerticalBody) {
                            this.x = px + pw;
                            this.vx *= -1;
                        }
                    }
                }
            });
        }

        // --- Ground Collision ---
        if (this.y + this.height >= groundY) {
            // Check for gaps
            const inset = 5;
            const leftTile = Math.floor((this.x + inset) / this.tileSize);
            const rightTile = Math.floor((this.x + this.width - inset) / this.tileSize);

            const leftInGap = level.groundGaps.some(g => leftTile >= g.start && leftTile < g.end);
            const rightInGap = level.groundGaps.some(g => rightTile >= g.start && rightTile < g.end);

            if (!leftInGap || !rightInGap) {
                if (this.vy >= 0) {
                    this.y = groundY - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }
            }
        }

        // --- Side Pipe Collision ---
        const pipeHeight = 80;
        const gap = 40;
        const lw = level.game.levelWidth;

        if (level.game.concept) {
            // Broader Pipes (Left Wall)
            if (level.game.concept.broader) {
                level.game.concept.broader.forEach((broader, index) => {
                    const py = (groundY - 80) - (index * (pipeHeight + gap));
                    const px = 0;
                    const pw = 80; // Monsters reverse at the mouth (80px)
                    const ph = pipeHeight;

                    if (this.x + this.width > px && this.x < px + pw &&
                        this.y + this.height > py && this.y < py + ph) {

                        const overlapTop = (this.y + this.height) - py;
                        const overlapBottom = (py + ph) - this.y;
                        const overlapRight = (px + pw) - this.x;
                        const minOverlap = Math.min(overlapTop, overlapBottom, overlapRight);

                        if (minOverlap === overlapTop && this.vy >= 0) {
                            this.y = py - this.height;
                            this.vy = 0;
                            this.grounded = true;
                        } else if (minOverlap === overlapBottom && this.vy < 0) {
                            this.y = py + ph;
                            this.vy = 0;
                        } else if (minOverlap === overlapRight) {
                            this.x = px + pw;
                            this.vx *= -1;
                        }
                    }
                });
            }

            // Narrower Pipes (Right Wall)
            if (level.game.concept.narrower) {
                level.game.concept.narrower.forEach((narrower, index) => {
                    const py = (groundY - 80) - (index * (pipeHeight + gap));
                    const px = lw - 80; // Monsters reverse at the mouth
                    const pw = 80;
                    const ph = pipeHeight;

                    if (this.x + this.width > px && this.x < px + pw &&
                        this.y + this.height > py && this.y < py + ph) {

                        const overlapTop = (this.y + this.height) - py;
                        const overlapBottom = (py + ph) - this.y;
                        const overlapLeft = (this.x + this.width) - px;
                        const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft);

                        if (minOverlap === overlapTop && this.vy >= 0) {
                            this.y = py - this.height;
                            this.vy = 0;
                            this.grounded = true;
                        } else if (minOverlap === overlapBottom && this.vy < 0) {
                            this.y = py + ph;
                            this.vy = 0;
                        } else if (minOverlap === overlapLeft) {
                            this.x = px - this.width;
                            this.vx *= -1;
                        }
                    }
                });
            }
        }

        // --- Tile Collision (Walls and Floor) ---
        const startX = Math.floor(this.x / this.tileSize) - 1;
        const endX = Math.ceil((this.x + this.width) / this.tileSize) + 1;
        const startY = Math.floor(this.y / this.tileSize) - 1;
        const endY = Math.ceil((this.y + this.height) / this.tileSize) + 1;

        for (let ty = startY; ty <= endY; ty++) {
            for (let tx = startX; tx <= endX; tx++) {
                const type = level.tiles.get(`${tx},${ty}`);
                if (!type) continue;

                const px = tx * this.tileSize;
                const py = ty * this.tileSize;
                const pw = this.tileSize;
                const ph = this.tileSize;

                if (this.x + this.width > px && this.x < px + pw &&
                    this.y + this.height > py && this.y < py + ph) {

                    const overlapTop = (this.y + this.height) - py;
                    const overlapBottom = (py + ph) - this.y;
                    const overlapLeft = (this.x + this.width) - px;
                    const overlapRight = (px + pw) - this.x;

                    const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                    if (minOverlap === overlapTop && this.vy >= 0) {
                        this.y = py - this.height;
                        this.vy = 0;
                        this.grounded = true;
                    } else if (minOverlap === overlapBottom && this.vy < 0) {
                        this.y = py + ph;
                        this.vy = 0;
                    } else {
                        // Vertical Inset: Ignore horizontal collisions at the very bottom/top
                        const vInset = 4;
                        const isWithinVerticalBody = overlapTop > vInset && overlapBottom > vInset;

                        if (minOverlap === overlapLeft && isWithinVerticalBody) {
                            this.x = px - this.width;
                            this.vx *= -1;
                        } else if (minOverlap === overlapRight && isWithinVerticalBody) {
                            this.x = px + pw;
                            this.vx *= -1;
                        }
                    }
                }
            }
        }

        // --- Level Boundaries ---
        if (this.x < 0) {
            this.x = 0;
            this.vx *= -1;
        } else if (this.x + this.width > level.game.levelWidth) {
            this.x = level.game.levelWidth - this.width;
            this.vx *= -1;
        }
    }

    draw(ctx, tileCache) {
        if (this.isDead && this.deathTimer > 30) return;

        ctx.save();
        if (this.isDead) {
            ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 30);
            ctx.translate(Math.floor(this.x + this.width / 2), Math.floor(this.y + this.height));
            ctx.scale(1, 0.2); // Squashed effect
            ctx.translate(-Math.floor(this.width / 2), -Math.floor(this.height));
        }

        // Draw cached enemy sprite
        ctx.drawImage(tileCache['enemy'], Math.floor(this.x), Math.floor(this.y));

        // Draw Label
        if (this.label && !this.isDead) {
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            const textX = Math.floor(this.x + this.width / 2);
            const textY = Math.floor(this.y - 10);

            // Shadow
            ctx.fillStyle = 'black';
            ctx.fillText(this.label, textX + 1, textY + 1);
            // Main Text
            ctx.fillStyle = 'white';
            ctx.fillText(this.label, textX, textY);
        }

        ctx.restore();
    }
}
