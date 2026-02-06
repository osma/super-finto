export class Level {
    constructor(game) {
        this.game = game;
        this.tileSize = 40;
        this.tiles = [];
        this.minRow = 0;
        this.particles = [];
        this.coins = [];
    }

    generate(seedUri) {
        this.tiles = [];
        if (!seedUri) return;

        const rng = new SeededRNG(seedUri);
        const levelWidthTiles = Math.ceil(this.game.levelWidth / this.tileSize);

        const broaderCount = this.game.concept?.broader?.length || 0;
        const narrowerCount = this.game.concept?.narrower?.length || 0;
        const maxSidePipes = Math.max(broaderCount, narrowerCount);

        const groundRow = Math.floor((this.game.height - 50) / this.tileSize); // ~13

        // Calculate minRow based on pipes (pipeHeight 80 + gap 40 = 120 per pipe)
        const pipeHeight = 80;
        const gap = 40;
        const highestPipeY = (this.game.height - 50 - 70) - ((maxSidePipes - 1) * (pipeHeight + gap));
        this.minRow = Math.min(0, Math.floor(highestPipeY / this.tileSize) - 2);

        // Start from x=5 to give some start space, end with padding
        let x = 5;

        while (x < levelWidthTiles - 5) {
            // 90% chance to spawn a platform at this x
            if (rng.next() < 0.9) {
                const width = Math.floor(rng.next() * 6) + 1; // 1 to 6 width

                // Density based spawning: Every 5-8 blocks (constant density)
                // START at a jumpable height: 3-5 blocks above ground
                let currentY = groundRow - (Math.floor(rng.next() * 3) + 3);

                while (currentY >= this.minRow) {
                    // Add tiles for this row
                    for (let i = 0; i < width; i++) {
                        if (x + i >= levelWidthTiles - 5) break;
                        const isSolid = rng.next() > 0.5;
                        this.tiles.push({
                            tx: x + i,
                            ty: currentY,
                            type: isSolid ? 'solid' : 'brick'
                        });
                    }

                    // Move up for next layer
                    const step = Math.floor(rng.next() * 4) + 5; // 5, 6, 7, 8
                    currentY -= step;
                }

                // Advance x by width + random small gap (0-2 empty tiles)
                x += width + Math.floor(rng.next() * 2);
            } else {
                x++;
            }
        }

        // Calculate minRow calculation moved up

        for (let y = this.minRow; y <= groundRow; y++) {
            // Left Wall
            this.tiles.push({ tx: 0, ty: y, type: 'solid' });

            // Right Wall
            // Ensure we don't duplicate if level is very narrow, though unlikely
            if (levelWidthTiles - 1 > 0) {
                this.tiles.push({ tx: levelWidthTiles - 1, ty: y, type: 'solid' });
            }
        }

        // Add Climbing Towers if there are more than 2 pipes on either side

        // Left Tower (for broader concepts)
        if (broaderCount > 2) {
            const pipeHeight = 80;
            const gap = 40;
            const highestPipeY = (this.game.height - 50 - 70) - ((broaderCount - 1) * (pipeHeight + gap));
            const highestRow = Math.floor(highestPipeY / this.tileSize);

            // Alternating blocks in columns 3 and 4 (moved 2 positions away from wall)
            // With 2 empty rows between blocks (every 3 rows)
            // Start from groundRow - 1 (one row above ground)
            for (let y = groundRow - 1; y >= highestRow; y--) {
                const rowFromBottom = groundRow - y;
                // Column 3: rows 2, 8, 14...
                if (rowFromBottom % 6 === 2) {
                    this.tiles.push({ tx: 3, ty: y, type: 'solid' });
                }
                // Column 4: rows 5, 11, 17...
                if (rowFromBottom % 6 === 5) {
                    this.tiles.push({ tx: 4, ty: y, type: 'solid' });
                }
            }
        }

        // Right Tower (for narrower concepts)
        if (narrowerCount > 2) {
            const pipeHeight = 80;
            const gap = 40;
            const highestPipeY = (this.game.height - 50 - 70) - ((narrowerCount - 1) * (pipeHeight + gap));
            const highestRow = Math.floor(highestPipeY / this.tileSize);

            // Alternating blocks in columns levelWidthTiles-5 and levelWidthTiles-4 (moved 2 positions away)
            // With 2 empty rows between blocks (every 3 rows)
            // Start from groundRow - 1 (one row above ground)
            for (let y = groundRow - 1; y >= highestRow; y--) {
                const rowFromBottom = groundRow - y;
                // Right column 1: rows 2, 8, 14...
                if (rowFromBottom % 6 === 2) {
                    this.tiles.push({ tx: levelWidthTiles - 5, ty: y, type: 'solid' });
                }
                // Right column 2: rows 5, 11, 17...
                if (rowFromBottom % 6 === 5) {
                    this.tiles.push({ tx: levelWidthTiles - 4, ty: y, type: 'solid' });
                }
            }
        }

        // Generate Coins
        this.coins = [];
        const area = levelWidthTiles * (groundRow - this.minRow);
        // Simple heuristic: roughly 1 coin per 400 tiles of area, clamped 1-5
        const coinCount = Math.min(5, Math.max(1, Math.floor(area / 400)));

        for (let i = 0; i < coinCount; i++) {
            let cx, cy;
            let attempts = 0;
            let placed = false;

            while (attempts < 20 && !placed) {
                attempts++;

                // 20% Chance: Try to place above existing destroyable brick
                if (rng.next() < 0.2) {
                    // Find valid bricks (above minRow, below ground)
                    const validBricks = this.tiles.filter(t => t.type === 'brick' && t.ty > this.minRow + 1 && t.ty < groundRow - 4);
                    if (validBricks.length > 0) {
                        const targetBrick = validBricks[Math.floor(rng.next() * validBricks.length)];
                        cx = targetBrick.tx;
                        cy = targetBrick.ty - 1; // Above it
                    } else {
                        // Fallback to random if no bricks
                        cx = Math.floor(rng.next() * (levelWidthTiles - 10)) + 5;
                        cy = Math.floor(rng.next() * (groundRow - 5 - this.minRow)) + this.minRow;
                    }
                } else {
                    // 80% Chance: Random position
                    cx = Math.floor(rng.next() * (levelWidthTiles - 10)) + 5;
                    cy = Math.floor(rng.next() * (groundRow - 5 - this.minRow)) + this.minRow;
                }

                // CHECK OVERLAP with Tiles
                const overlap = this.tiles.some(t => t.tx === cx && t.ty === cy);

                // Check overlap with other coins
                // Coin pos is tile*size + 10
                const cxPx = cx * this.tileSize + 10;
                const cyPx = cy * this.tileSize + 10;
                const coinOverlap = this.coins.some(c => Math.abs(c.x - cxPx) < 20 && Math.abs(c.y - cyPx) < 20);

                if (!overlap && !coinOverlap) {
                    this.coins.push(new Coin(cxPx, cyPx));
                    placed = true;
                }
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
            const gap = 40;
            this.game.concept.broader.forEach((broader, index) => {
                // Stack upwards from ground
                const y = (groundY - 70) - (index * (pipeHeight + gap));
                this.drawHorizontalPipe(ctx, 0, y, 'right', broader.label_fi);
            });
        }

        // Draw Narrower Concept Pipes (Right Wall, Horizontal)
        if (this.game.concept && this.game.concept.narrower) {
            const pipeHeight = 80;
            const gap = 40;
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

        // Draw particles
        this.particles.forEach(p => p.draw(ctx));

        // Draw Coins
        this.coins.forEach(c => c.draw(ctx));
    }

    drawGround(ctx) {
        const groundY = this.game.height - 50;
        const groundTileCount = Math.ceil(this.game.levelWidth / this.tileSize);
        for (let i = 0; i < groundTileCount; i++) {
            this.drawBrickTile(ctx, i * this.tileSize, groundY, this.tileSize, 50, '#92450e', true);
        }
    }
    createExplosion(x, y) {
        // Create 4 pieces flying out in different directions
        const velocities = [
            { vx: -2, vy: -5 },
            { vx: 2, vy: -5 },
            { vx: -1.5, vy: -7 },
            { vx: 1.5, vy: -7 }
        ];

        velocities.forEach(v => {
            this.particles.push(new BrickParticle(x + 20, y + 20, v.vx, v.vy));
        });
    }

    update(deltaTime) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            // Remove if off screen
            if (this.particles[i].y > this.game.height + 100) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawBoundaryWalls(ctx) {
        const groundRow = Math.floor((this.game.height - 50) / this.tileSize);
        const levelWidthTiles = Math.ceil(this.game.levelWidth / this.tileSize);

        // Left Wall
        for (let y = this.minRow; y <= groundRow; y++) {
            this.drawBrickTile(ctx, 0, y * this.tileSize, this.tileSize, this.tileSize, '#57534e', false, true);
        }

        // Right Wall
        const rightX = (levelWidthTiles - 1) * this.tileSize;
        if (rightX > 0) {
            for (let y = this.minRow; y <= groundRow; y++) {
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
            const gap = 40;
            this.game.concept.broader.forEach((broader, index) => {
                const y = (groundY - 70) - (index * (pipeHeight + gap));
                // Opening is roughly at x=80 (length of pipe)
                // Hitbox: x=60 to 80, y=y to y+80
                // --- Teleport Trigger ---
                if (player.vx < 0 &&
                    player.x < 90 && player.x > 50 &&
                    player.y + player.height > y + 10 &&
                    player.y < y + pipeHeight - 10) {

                    console.log("Teleporting Left to:", broader.uri);
                    this.game.startPipeTransition(broader.uri, 0, y, 'left');
                    return;
                }

                // --- Solid Collision ---
                const px = 0;
                const py = y;
                const pw = 80;
                const ph = pipeHeight;

                if (player.x + player.width > px && player.x < px + pw &&
                    player.y + player.height > py && player.y < py + ph) {

                    const overlapTop = (player.y + player.height) - py;
                    const overlapBottom = (py + ph) - player.y;
                    const overlapLeft = (player.x + player.width) - px;
                    const overlapRight = (px + pw) - player.x;
                    const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                    if (minOverlap === overlapTop && player.vy >= 0) {
                        player.y = py - player.height;
                        player.vy = 0;
                        player.grounded = true;
                    } else if (minOverlap === overlapBottom && player.vy < 0) {
                        player.y = py + ph;
                        player.vy = 0;
                    } else if (minOverlap === overlapRight) {
                        player.x = px + pw;
                        player.vx = 0;
                    }
                }
            });
        }

        // Check Narrower Pipes (Right Wall)
        if (this.game.concept && this.game.concept.narrower) {
            const pipeHeight = 80;
            const gap = 40;
            const lw = this.game.levelWidth;
            this.game.concept.narrower.forEach((narrower, index) => {
                const y = (groundY - 70) - (index * (pipeHeight + gap));
                // Opening is at lw - 80
                // --- Teleport Trigger ---
                if (player.vx > 0 &&
                    player.x + player.width > lw - 90 && player.x + player.width < lw - 50 &&
                    player.y + player.height > y + 10 &&
                    player.y < y + pipeHeight - 10) {

                    console.log("Teleporting Right to:", narrower.uri);
                    this.game.startPipeTransition(narrower.uri, lw, y, 'right');
                    return;
                }

                // --- Solid Collision ---
                const px = lw - 80;
                const py = y;
                const pw = 80;
                const ph = pipeHeight;

                if (player.x + player.width > px && player.x < px + pw &&
                    player.y + player.height > py && player.y < py + ph) {

                    const overlapTop = (player.y + player.height) - py;
                    const overlapBottom = (py + ph) - player.y;
                    const overlapLeft = (player.x + player.width) - px;
                    const overlapRight = (px + pw) - player.x;
                    const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                    if (minOverlap === overlapTop && player.vy >= 0) {
                        player.y = py - player.height;
                        player.vy = 0;
                        player.grounded = true;
                    } else if (minOverlap === overlapBottom && player.vy < 0) {
                        player.y = py + ph;
                        player.vy = 0;
                    } else if (minOverlap === overlapLeft) {
                        player.x = px - player.width;
                        player.vx = 0;
                    }
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
                    // Bottom Collision (Head Hit) - use narrower collision box
                    // Add 10px inset on each side to allow fitting through 1-tile gaps
                    const headInset = 10;
                    const headLeft = player.x + headInset;
                    const headRight = player.x + player.width - headInset;

                    // Only register head hit if the narrower head box overlaps
                    if (headRight > px && headLeft < px + pw) {
                        player.y = py + ph;
                        headHit = true;

                        if (tile.type === 'brick') {
                            this.game.addScore(50);
                            // Create explosion particles
                            this.createExplosion(px, py);

                            // Check for Coin ABOVE this brick
                            for (let c = this.coins.length - 1; c >= 0; c--) {
                                const coin = this.coins[c];
                                // Coin center is x+size/2. Brick center is px+tileSize/2.
                                // Coin Y is roughly py - tileSize (since coin is on top)
                                // Coin collider is roughly 20x20 in the middle of 40x40.

                                // Center-to-center check
                                const coinCenterX = coin.x + coin.size / 2;
                                const brickCenterX = px + this.tileSize / 2;

                                // Check if coin is "on top" (y matches) and aligned horizontally
                                // Allow some horizontal slop (e.g. 20px)
                                if (Math.abs(coinCenterX - brickCenterX) < 20 &&
                                    Math.abs(coin.y + coin.size - py) < 10) { // Coin bottom near brick top

                                    // Collect Coin
                                    this.game.addScore(200);
                                    this.coins.splice(c, 1);

                                    // Optional: Add a sparkle effect? For now just collect.
                                }
                            }

                            this.tiles.splice(i, 1);
                        }
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

        // Check Coin Collisions
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            // Simple AABB (Coin is 20x20 centered in 40x40 tile, roughly)
            if (player.x < coin.x + coin.size &&
                player.x + player.width > coin.x &&
                player.y < coin.y + coin.size &&
                player.y + player.height > coin.y) {

                // Collect!
                this.game.addScore(200);
                this.coins.splice(i, 1);
            }
        }
    }
}

class BrickParticle {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = 12;
        this.weight = 0.25;
        this.angle = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.vy += this.weight;
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotationSpeed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const color = '#f97316'; // Brick orange
        ctx.fillStyle = color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        // Borders
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);

        ctx.restore();
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.wobble = Math.random() * Math.PI * 2;
    }

    draw(ctx) {
        this.wobble += 0.1;
        const scaleX = Math.abs(Math.sin(this.wobble));

        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.scale(scaleX, 1);

        ctx.fillStyle = '#fcd34d'; // Gold
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d97706'; // Darker gold outline
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
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
