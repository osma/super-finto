export class Level {
    constructor(game) {
        this.game = game;
        this.tileSize = 40;
        this.tiles = [];
    }

    generate(seedUri) {
        this.tiles = [];
        if (!seedUri) return;

        const rng = new SeededRNG(seedUri);
        const levelWidthTiles = Math.ceil(this.game.levelWidth / this.tileSize);

        // Start from x=5 to give some start space, end with padding
        let x = 5;

        while (x < levelWidthTiles - 5) {
            // 90% chance to spawn a platform at this x
            if (rng.next() < 0.9) {
                const width = Math.floor(rng.next() * 6) + 1; // 1 to 6 width
                // Rows: Ground is ~13. Sky is 0. 
                // Platforms between row 3 (high) and 10 (low)
                // Bias towards lower platforms (higher row numbers) using max of two randoms
                const bias = Math.max(rng.next(), rng.next());
                const row = Math.floor(bias * 8) + 3;

                // Don't spawn if too low (optional, user asked to remove low ones before but now asked for random distribution)
                // Let's keep it generally open.

                for (let i = 0; i < width; i++) {
                    if (x + i >= levelWidthTiles - 5) break;

                    // Simple logic to avoid exact overlap with pipes? 
                    // Pipes are at game.getPipeX(). Since this is grid based and pipes are absolute, 
                    // it's a bit hard to perfectly check. 
                    // But random distribution usually works out okay for Mario.

                    // But random distribution usually works out okay for Mario.

                    const isSolid = rng.next() > 0.5;
                    this.tiles.push({
                        tx: x + i,
                        ty: row,
                        type: isSolid ? 'solid' : 'brick'
                    });
                }

                // Advance x by width + random gap (1-2 empty tiles)
                x += width + Math.floor(rng.next() * 2) + 1;
                x++;
            }
        }

        // Add Solid Boundary Walls (Left and Right)
        const groundRow = Math.floor((this.game.height - 50) / this.tileSize); // ~13
        for (let y = 0; y <= groundRow; y++) {
            // Left Wall
            this.tiles.push({ tx: 0, ty: y, type: 'solid' });

            // Right Wall
            // Ensure we don't duplicate if level is very narrow, though unlikely
            if (levelWidthTiles - 1 > 0) {
                this.tiles.push({ tx: levelWidthTiles - 1, ty: y, type: 'solid' });
            }
        }
    }

    draw(ctx) {
        const groundY = this.game.height - 50;

        // Draw Related Concept Pipes (Vertical)
        if (this.game.concept && this.game.concept.related) {
            this.game.concept.related.forEach((rel, index) => {
                const x = this.game.getPipeX(index);
                this.drawPipe(ctx, x, groundY - 40, rel.label_fi);
            });
        }

        // Draw Broader Concept Pipes (Left Wall, Horizontal)
        if (this.game.concept && this.game.concept.broader) {
            const pipeHeight = 80;
            const gap = 20;
            this.game.concept.broader.forEach((broader, index) => {
                // Stack upwards from ground
                const y = (groundY - 70) - (index * (pipeHeight + gap));
                this.drawHorizontalPipe(ctx, 0, y, 'right', broader.label_fi);
            });
        }

        // Draw Narrower Concept Pipes (Right Wall, Horizontal)
        if (this.game.concept && this.game.concept.narrower) {
            const pipeHeight = 80;
            const gap = 20;
            this.game.concept.narrower.forEach((narrower, index) => {
                // Stack upwards from ground
                const y = (groundY - 70) - (index * (pipeHeight + gap)); // 50 offset to align somewhat with ground
                this.drawHorizontalPipe(ctx, this.game.levelWidth, y, 'left', narrower.label_fi);
            });
        }

        // Draw Individual Tiles
        this.tiles.forEach(tile => {
            const px = tile.tx * this.tileSize;
            const py = tile.ty * this.tileSize;
            const color = tile.type === 'solid' ? '#57534e' : '#f97316';
            this.drawBrickTile(ctx, px, py, this.tileSize, this.tileSize, color, false, tile.type === 'solid');
        });
    }

    drawGround(ctx) {
        const groundY = this.game.height - 50;
        const groundTileCount = Math.ceil(this.game.levelWidth / this.tileSize);
        for (let i = 0; i < groundTileCount; i++) {
            this.drawBrickTile(ctx, i * this.tileSize, groundY, this.tileSize, 50, '#92450e', true);
        }
    }

    drawBoundaryWalls(ctx) {
        const groundRow = Math.floor((this.game.height - 50) / this.tileSize);
        const levelWidthTiles = Math.ceil(this.game.levelWidth / this.tileSize);

        // Left Wall
        for (let y = 0; y <= groundRow; y++) {
            this.drawBrickTile(ctx, 0, y * this.tileSize, this.tileSize, this.tileSize, '#57534e', false, true);
        }

        // Right Wall
        const rightX = (levelWidthTiles - 1) * this.tileSize;
        if (rightX > 0) {
            for (let y = 0; y <= groundRow; y++) {
                this.drawBrickTile(ctx, rightX, y * this.tileSize, this.tileSize, this.tileSize, '#57534e', false, true);
            }
        }
    }

    drawHorizontalPipe(ctx, x, y, direction, label) {
        // Pipe config
        const pipeThickness = 80;
        const length = 80; // How far it sticks out
        const capWidth = 15;
        const capExtra = 4; // Thickness of cap over body

        const isRight = direction === 'right'; // Sticking out to right (from left wall)
        // Adjust x origin if coming from right wall
        const startX = isRight ? x : x - length;

        // Draw Body
        ctx.fillStyle = '#16a34a'; // Green
        // Body is strictly inside the startX -> startX + length range, minus cap
        const bodyX = isRight ? startX : startX + capWidth;
        const bodyW = length - capWidth;

        ctx.fillRect(bodyX, y, bodyW, pipeThickness);

        // Borders
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(bodyX, y, bodyW, pipeThickness);

        // Cap
        const capX = isRight ? (startX + bodyW) : startX;
        ctx.fillStyle = '#22c55e'; // Lighter green

        // Cap rect
        ctx.fillRect(capX, y - capExtra, capWidth, pipeThickness + (capExtra * 2));
        ctx.strokeRect(capX, y - capExtra, capWidth, pipeThickness + (capExtra * 2));

        // Highlights (Horizontal stripes)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        // Top highlight
        ctx.fillRect(startX, y + 5, length, 8);

        // Label (Floating near cap)
        if (label) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = isRight ? 'left' : 'right';
            const labelX = isRight ? (startX + length + 5) : (startX - 5);

            ctx.fillStyle = 'black';
            ctx.fillText(label, labelX + 1, y + pipeThickness / 2 + 1);
            ctx.fillStyle = 'white';
            ctx.fillText(label, labelX, y + pipeThickness / 2);
        }
    }

    drawPipe(ctx, x, y, label) {
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

        // Label
        if (label) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'black'; // text shadow
            ctx.fillText(label, x + pipeWidth / 2 + 1, y - 19);
            ctx.fillStyle = 'white';
            ctx.fillText(label, x + pipeWidth / 2, y - 20);
        }
    }

    drawBrickTile(ctx, x, y, w, h, baseColor, isGround = false, isSolid = false) {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        if (isGround) {
            ctx.fillStyle = '#16a34a'; // Grass green
            ctx.fillRect(x, y, w, 10);
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x + 5, y + 20, 4, 4);
            ctx.fillRect(x + 25, y + 35, 4, 4);
        } else if (isSolid) {
            // Solid Block (Metal/Stone look with rivets)
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

            // Rivets
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(x + 4, y + 4, 4, 4);
            ctx.fillRect(x + w - 8, y + 4, 4, 4);
            ctx.fillRect(x + 4, y + h - 8, 4, 4);
            ctx.fillRect(x + w - 8, y + h - 8, 4, 4);
        } else {
            // Brick Pattern
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
        const groundY = this.game.height - 50;
        if (player.y + player.height >= groundY) {
            if (player.vy >= 0) {
                player.y = groundY - player.height;
                player.vy = 0;
                player.grounded = true;
            }
        }

        // Check Related Concept Pipes
        if (this.game.concept && this.game.concept.related) {
            this.game.concept.related.forEach((rel, index) => {
                const px = this.game.getPipeX(index);
                const py = groundY - 40;
                const pw = 100;
                const ph = 40; // Just collision for the part above ground

                if (player.x + player.width > px &&
                    player.x < px + pw &&
                    player.y + player.height > py &&
                    player.y < py + ph) {

                    const overlapTop = (player.y + player.height) - py;
                    const overlapBottom = (py + ph) - player.y;
                    const overlapLeft = (player.x + player.width) - px;
                    const overlapRight = (px + pw) - player.x;

                    const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                    if (minOverlap === overlapTop && player.vy >= 0) {
                        // Top Collision (Landing)
                        player.y = py - player.height;
                        player.vy = 0;
                        player.grounded = true;

                        // Check for PIPE ENTRY (Teleport)
                        // Must be kneeling, centered on pipe
                        if (player.isKneeling) {
                            const pipeCenter = px + pw / 2;
                            const playerCenter = player.x + player.width / 2;
                            if (Math.abs(pipeCenter - playerCenter) < 20) { // Tolerance (half width of player)
                                // Teleport!
                                console.log("Teleporting to:", rel.uri);
                                this.game.startPipeTransition(rel.uri, px, py);
                                return; // Stop collision check for this frame
                            }
                        }

                    } else if (minOverlap === overlapBottom && player.vy < 0) {
                        player.y = py + ph;
                        player.vy = 0;
                    } else if (minOverlap === overlapLeft) {
                        player.x = px - player.width;
                        player.vx = 0;
                    } else if (minOverlap === overlapRight) {
                        player.x = px + pw;
                        player.vx = 0;
                    }
                }
            });
        }

        // Check Broader Pipes (Left Wall)
        if (this.game.concept && this.game.concept.broader) {
            const pipeHeight = 80;
            const gap = 20;
            this.game.concept.broader.forEach((broader, index) => {
                const y = (groundY - 70) - (index * (pipeHeight + gap));
                // Opening is roughly at x=80 (length of pipe)
                // Hitbox: x=60 to 80, y=y to y+80
                // Trigger if walking LEFT into it
                if (player.vx < 0 &&
                    player.x < 90 && player.x > 50 &&
                    player.y + player.height > y + 10 &&
                    player.y < y + pipeHeight - 10) {

                    console.log("Teleporting Left to:", broader.uri);
                    this.game.startPipeTransition(broader.uri, 0, y, 'left');
                }
            });
        }

        // Check Narrower Pipes (Right Wall)
        if (this.game.concept && this.game.concept.narrower) {
            const pipeHeight = 80;
            const gap = 20;
            const lw = this.game.levelWidth;
            this.game.concept.narrower.forEach((narrower, index) => {
                const y = (groundY - 70) - (index * (pipeHeight + gap));
                // Opening is at lw - 80
                // Trigger if walking RIGHT into it
                if (player.vx > 0 &&
                    player.x + player.width > lw - 90 && player.x + player.width < lw - 50 &&
                    player.y + player.height > y + 10 &&
                    player.y < y + pipeHeight - 10) {

                    console.log("Teleporting Right to:", narrower.uri);
                    this.game.startPipeTransition(narrower.uri, lw, y, 'right');
                }
            });
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

class SeededRNG {
    constructor(seedString) {
        this.seed = 0;
        for (let i = 0; i < seedString.length; i++) {
            this.seed = ((this.seed << 5) - this.seed) + seedString.charCodeAt(i);
            this.seed |= 0;
        }
    }

    // Returns 0 to 1
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return Math.abs(this.seed / 233280);
    }
}
