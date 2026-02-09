import { Enemy } from './Enemy.js';

export class Level {
    constructor(game) {
        this.game = game;
        this.tileSize = 40;
        this.tiles = new Map(); // Grid-based storage: "x,y" -> type
        this.minRow = 0;
        this.particles = [];
        this.coins = [];
        this.enemies = [];
        this.groundGaps = [];

        // Pre-render tile cache for performance
        this.tileCache = {};
        this.initCache();

        // Layer caching for static geometry (2D Grid Chunking for massive levels)
        this.chunkWidth = 2000;
        this.chunkHeight = 2000;
        this.tilesGrid = new Map(); // "gx,gy" -> canvas
        this.foregroundGrid = new Map(); // "gx,gy" -> canvas
        this.geometryNeedsRedraw = true;
    }

    initCache() {
        const types = [
            { id: 'brick', color: '#f97316', solid: false },
            { id: 'solid', color: '#57534e', solid: true },
            { id: 'ground', color: '#92450e', ground: true }
        ];

        types.forEach(type => {
            const canvas = document.createElement('canvas');
            canvas.width = this.tileSize;
            canvas.height = this.tileSize; // Ground is now 40px (one tile)
            const ctx = canvas.getContext('2d');

            // Re-use existing draw logic but only once per type
            this.drawBrickTile(ctx, 0, 0, this.tileSize, canvas.height, type.color, type.ground, type.solid);
            this.tileCache[type.id] = canvas;
        });

        // Pre-render pipe components
        this.initPipeCache();
    }

    initPipeCache() {
        // Vertical Pipe Cap (116 x 15)
        const capWidth = 116; // 100 + 8*2 capExtra
        const capHeight = 15;
        const capCanvas = document.createElement('canvas');
        capCanvas.width = capWidth;
        capCanvas.height = capHeight;
        const capCtx = capCanvas.getContext('2d');
        capCtx.fillStyle = '#22c55e';
        capCtx.fillRect(0, 0, capWidth, capHeight);
        capCtx.strokeStyle = '#000';
        capCtx.lineWidth = 2;
        capCtx.strokeRect(0, 0, capWidth, capHeight);
        capCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        capCtx.fillRect(18, 2, 8, capHeight - 4); // Highlight
        this.tileCache['pipeCapV'] = capCanvas;

        // Vertical Pipe Body Segment (100 x 40)
        const bodyWidth = 100;
        const bodySegment = 40;
        const bodyCanvas = document.createElement('canvas');
        bodyCanvas.width = bodyWidth;
        bodyCanvas.height = bodySegment;
        const bodyCtx = bodyCanvas.getContext('2d');
        bodyCtx.fillStyle = '#16a34a';
        bodyCtx.fillRect(0, 0, bodyWidth, bodySegment);
        bodyCtx.strokeStyle = '#000';
        bodyCtx.lineWidth = 2;
        bodyCtx.beginPath();
        bodyCtx.moveTo(0, 0);
        bodyCtx.lineTo(0, bodySegment);
        bodyCtx.moveTo(bodyWidth, 0);
        bodyCtx.lineTo(bodyWidth, bodySegment);
        bodyCtx.stroke();
        bodyCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        bodyCtx.fillRect(10, 5, 8, bodySegment - 10); // Highlight
        this.tileCache['pipeBodyV'] = bodyCanvas;

        // Horizontal Pipe - Right Facing (80 x 88)
        const hLength = 80;
        const hThickness = 80;
        const hCapWidth = 15;
        const hCapExtra = 4;
        const hCanvasR = document.createElement('canvas');
        hCanvasR.width = hLength;
        hCanvasR.height = hThickness + hCapExtra * 2;
        const hCtxR = hCanvasR.getContext('2d');
        // Body
        const bodyW = hLength - hCapWidth;
        hCtxR.fillStyle = '#16a34a';
        hCtxR.fillRect(0, hCapExtra, bodyW, hThickness);
        hCtxR.strokeStyle = '#000';
        hCtxR.lineWidth = 2;
        hCtxR.strokeRect(0, hCapExtra, bodyW, hThickness);
        // Cap
        hCtxR.fillStyle = '#22c55e';
        hCtxR.fillRect(bodyW, 0, hCapWidth, hThickness + hCapExtra * 2);
        hCtxR.strokeRect(bodyW, 0, hCapWidth, hThickness + hCapExtra * 2);
        // Highlight
        hCtxR.fillStyle = 'rgba(255, 255, 255, 0.3)';
        hCtxR.fillRect(0, hCapExtra + 5, hLength, 8);
        this.tileCache['pipeHorzR'] = hCanvasR;

        // Horizontal Pipe - Left Facing (80 x 88)
        const hCanvasL = document.createElement('canvas');
        hCanvasL.width = hLength;
        hCanvasL.height = hThickness + hCapExtra * 2;
        const hCtxL = hCanvasL.getContext('2d');
        // Body (offset by capWidth)
        hCtxL.fillStyle = '#16a34a';
        hCtxL.fillRect(hCapWidth, hCapExtra, bodyW, hThickness);
        hCtxL.strokeStyle = '#000';
        hCtxL.lineWidth = 2;
        hCtxL.strokeRect(hCapWidth, hCapExtra, bodyW, hThickness);
        // Cap (at start)
        hCtxL.fillStyle = '#22c55e';
        hCtxL.fillRect(0, 0, hCapWidth, hThickness + hCapExtra * 2);
        hCtxL.strokeRect(0, 0, hCapWidth, hThickness + hCapExtra * 2);
        // Highlight
        hCtxL.fillStyle = 'rgba(255, 255, 255, 0.3)';
        hCtxL.fillRect(0, hCapExtra + 5, hLength, 8);
        this.tileCache['pipeHorzL'] = hCanvasL;

        // Enemy Sprite (40x40)
        const enemyCanvas = document.createElement('canvas');
        enemyCanvas.width = 40;
        enemyCanvas.height = 40;
        const eCtx = enemyCanvas.getContext('2d');
        const eColor = '#b91c1c'; // Burgundy/Red

        eCtx.fillStyle = eColor;
        // Body (Circle-ish)
        eCtx.beginPath();
        eCtx.arc(20, 25, 15, 0, Math.PI * 2);
        eCtx.fill();
        // Feet
        eCtx.fillStyle = '#450a0a';
        eCtx.fillRect(10, 35, 10, 5);
        eCtx.fillRect(20, 35, 10, 5);
        // Eyes
        eCtx.fillStyle = 'white';
        eCtx.fillRect(12, 20, 6, 6);
        eCtx.fillRect(22, 20, 6, 6);
        eCtx.fillStyle = 'black';
        eCtx.fillRect(14, 22, 2, 2);
        eCtx.fillRect(24, 22, 2, 2);
        // Eyebrows (Angry)
        eCtx.strokeStyle = 'black';
        eCtx.lineWidth = 2;
        eCtx.beginPath();
        eCtx.moveTo(10, 18); eCtx.lineTo(18, 22);
        eCtx.moveTo(30, 18); eCtx.lineTo(22, 22);
        eCtx.stroke();

        this.tileCache['enemy'] = enemyCanvas;
    }

    generate(seedUri) {
        this.tiles.clear();
        this.coins = [];
        this.enemies = [];
        this.groundGaps = [];
        if (!seedUri) return;

        const rng = new SeededRNG(seedUri);
        const levelWidthTiles = Math.ceil(this.game.levelWidth / this.tileSize);

        const broaderCount = this.game.concept?.broader?.length || 0;
        const narrowerCount = this.game.concept?.narrower?.length || 0;
        const maxSidePipes = Math.max(broaderCount, narrowerCount);

        const groundRow = Math.floor((this.game.height - 40) / this.tileSize); // ~14

        // Calculate minRow based on pipes (pipeHeight 80 + gap 40 = 120 per pipe)
        const pipeHeight = 80;
        const gap = 40;
        const highestPipeY = (this.game.height - 40 - 70) - ((maxSidePipes - 1) * (pipeHeight + gap));
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
                        this.tiles.set(`${x + i},${currentY}`, 'brick');
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
            this.tiles.set(`0,${y}`, 'solid');

            // Right Wall
            // Ensure we don't duplicate if level is very narrow, though unlikely
            if (levelWidthTiles - 1 > 0) {
                this.tiles.set(`${levelWidthTiles - 1},${y}`, 'solid');
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
                    this.tiles.set(`3,${y}`, 'solid');
                }
                // Column 4: rows 5, 11, 17...
                if (rowFromBottom % 6 === 5) {
                    this.tiles.set(`4,${y}`, 'solid');
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
                    this.tiles.set(`${levelWidthTiles - 5},${y}`, 'solid');
                }
                // Right column 2: rows 5, 11, 17...
                if (rowFromBottom % 6 === 5) {
                    this.tiles.set(`${levelWidthTiles - 4},${y}`, 'solid');
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
                    const validBricks = [];
                    for (let [key, type] of this.tiles) {
                        if (type === 'brick') {
                            const [tx, ty] = key.split(',').map(Number);
                            if (ty > this.minRow + 1 && ty < groundRow - 4) {
                                validBricks.push({ tx, ty });
                            }
                        }
                    }
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
                const overlap = this.tiles.has(`${cx},${cy}`);

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

        // --- ENEMY SPAWNING ---
        const altLabels = this.game.concept ? this.game.concept.altLabels : [];

        altLabels.forEach(labelObj => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 100) {
                attempts++;
                const tx = Math.floor(rng.next() * (levelWidthTiles - 10)) + 5;
                const ty = Math.floor(rng.next() * (groundRow - 2 - this.minRow)) + this.minRow;

                // Ensure not horizontally closer than 10 tiles to Mario (Mario at ~tile 2)
                if (Math.abs(tx - 2) < 10) continue;

                // Spawn on top of a tile or ground
                const hasGround = ty === groundRow - 1;
                const hasTile = this.tiles.get(`${tx},${ty + 1}`) !== undefined;
                const spaceEmpty = this.tiles.get(`${tx},${ty}`) === undefined;

                if ((hasGround || hasTile) && spaceEmpty) {
                    const labelText = `${labelObj.label} (${labelObj.lang})`;
                    this.enemies.push(new Enemy(tx * this.tileSize, ty * this.tileSize, labelText, this.tileSize));
                    placed = true;
                }
            }
        });

        // Pre-calculate bottom pipe positions (in tiles) to avoid overlapping them
        const pipePositions = [];
        if (this.game.concept && this.game.concept.related) {
            this.game.concept.related.forEach((rel, index) => {
                const px = this.game.getPipeX(index);
                // Pipe width is 100px. Convert to tile coordinates.
                // Include a buffer of 5 tiles on each side
                const startTile = Math.floor(px / this.tileSize) - 5;
                const endTile = Math.ceil((px + 100) / this.tileSize) + 5;
                pipePositions.push({ start: startTile, end: endTile });
            });
        }

        // Generate Ground Gaps (2-4 blocks wide, between pipes/structures)
        this.groundGaps = [];
        // Generate 1-4 gaps depending on width
        const gapCount = Math.floor(rng.next() * 3) + 1;

        let attempts = 0;
        let createdGaps = 0;

        while (createdGaps < gapCount && attempts < 20) {
            attempts++;
            // Dynamic strict buffer: 5 tiles from left, 5 tiles from right
            const minX = 5;
            const maxX = levelWidthTiles - 5;

            // Random start position within safe bounds
            // Gap takes up gapW tiles. So gapX must be <= maxX - gapW
            const gapW = Math.floor(rng.next() * 2) + 2; // 2, 3

            const range = (maxX - gapW) - minX;
            if (range <= 0) break; // Level too small for gaps

            const gapX = Math.floor(rng.next() * range) + minX;

            // Check overlap with existing gaps (ensure min distance of 3 tiles)
            const minDist = 3;
            // Check if (newStart < oldEnd + minDist) AND (newEnd + minDist > oldStart)
            const overlapGap = this.groundGaps.some(g => gapX < g.end + minDist && gapX + gapW + minDist > g.start);

            // Check overlap with pipes
            const overlapPipe = pipePositions.some(p => gapX < p.end && gapX + gapW > p.start);

            if (!overlapGap && !overlapPipe) {
                this.groundGaps.push({ start: gapX, end: gapX + gapW });
                createdGaps++;
            }
        }
        // Render static geometry to cache
        this.renderGeometryLayer();
    }

    getGridCanvas(grid, gx, gy, height) {
        const key = `${gx},${gy}`;
        if (!grid.has(key)) {
            const canvas = document.createElement('canvas');
            canvas.width = this.chunkWidth;
            canvas.height = this.chunkHeight;
            grid.set(key, canvas);
        }
        return grid.get(key);
    }

    renderGeometryLayer() {
        const groundY = this.game.height - 40;
        const groundRow = Math.floor(groundY / this.tileSize);
        const yOffset = -this.minRow * this.tileSize;

        // Clear existing grids
        this.tilesGrid.clear();
        this.foregroundGrid.clear();

        // Draw all individual tiles to 2D grid
        for (let [key, type] of this.tiles) {
            const [tx, ty] = key.split(',').map(Number);
            const x = tx * this.tileSize;
            const y = ty * this.tileSize + yOffset;

            const gx = Math.floor(x / this.chunkWidth);
            const gy = Math.floor(y / this.chunkHeight);
            const localX = x % this.chunkWidth;
            const localY = y % this.chunkHeight;

            const canvas = this.getGridCanvas(this.tilesGrid, gx, gy);
            const ctx = canvas.getContext('2d');
            const cacheId = type === 'solid' ? 'solid' : 'brick';
            ctx.drawImage(this.tileCache[cacheId], Math.floor(localX), Math.floor(localY));
        }

        // Draw Ground and Walls to Foreground Grid
        const soilColor = '#92450e';
        const soilDepth = 600; // Extra depth for vertical scrolling
        const levelWidthTiles = Math.ceil(this.game.levelWidth / this.tileSize);

        for (let i = 0; i < levelWidthTiles; i++) {
            const x = i * this.tileSize;
            const gx = Math.floor(x / this.chunkWidth);
            const localX = x % this.chunkWidth;

            const isGap = this.groundGaps.some(g => i >= g.start && i < g.end);
            if (!isGap) {
                const gy_world = groundY + yOffset;
                // Soil can span multiple grid cells vertically
                for (let d = 0; d < soilDepth; d += this.chunkHeight) {
                    const currentY = gy_world + d;
                    const gridY = Math.floor(currentY / this.chunkHeight);
                    const localY = currentY % this.chunkHeight;

                    const canvas = this.getGridCanvas(this.foregroundGrid, gx, gridY);
                    const ctx = canvas.getContext('2d');

                    ctx.fillStyle = soilColor;
                    if (d === 0) {
                        // Top layer: draw grass+soil sprite
                        ctx.fillRect(Math.floor(localX), Math.floor(localY + 10), this.tileSize, this.chunkHeight - localY);
                        ctx.drawImage(this.tileCache['ground'], Math.floor(localX), Math.floor(localY));
                    } else {
                        // Deep soil: just fill
                        ctx.fillRect(Math.floor(localX), 0, this.tileSize, this.chunkHeight);
                    }
                }
            }

            // Boundary Walls
            if (i === 0 || i === levelWidthTiles - 1) {
                const wallX = (i === 0) ? 0 : x;
                const wallGx = Math.floor(wallX / this.chunkWidth);
                const wallLocalX = wallX % this.chunkWidth;

                for (let y = this.minRow; y <= groundRow; y++) {
                    const worldY = y * this.tileSize + yOffset;
                    const wallGy = Math.floor(worldY / this.chunkHeight);
                    const wallLocalY = worldY % this.chunkHeight;

                    const canvas = this.getGridCanvas(this.foregroundGrid, wallGx, wallGy);
                    canvas.getContext('2d').drawImage(this.tileCache['solid'], Math.floor(wallLocalX), Math.floor(wallLocalY));
                }
            }
        }

        this.geometryNeedsRedraw = false;
    }

    draw(ctx) {
        const groundY = this.game.height - 40;
        const cameraX = this.game.camera.x;
        const cameraY = this.game.camera.y;
        const viewportWidth = this.game.width;
        const viewportHeight = this.game.height;
        const buffer = 100;

        const yOffset = -this.minRow * this.tileSize;

        // --- DRAW 2D GRID (Background Tiles) ---
        const startGX = Math.floor((cameraX - buffer) / this.chunkWidth);
        const endGX = Math.floor((cameraX + viewportWidth + buffer) / this.chunkWidth);
        const startGY = Math.floor((cameraY + yOffset - buffer) / this.chunkHeight);
        const endGY = Math.floor((cameraY + yOffset + viewportHeight + buffer) / this.chunkHeight);

        for (let gx = startGX; gx <= endGX; gx++) {
            for (let gy = startGY; gy <= endGY; gy++) {
                const key = `${gx},${gy}`;
                const canvas = this.tilesGrid.get(key);
                if (canvas) {
                    ctx.drawImage(canvas, gx * this.chunkWidth, gy * this.chunkHeight - yOffset);
                }
            }
        }

        // Draw Related Concept Pipes (Vertical)
        if (this.game.concept && this.game.concept.related) {
            this.game.concept.related.forEach((rel, index) => {
                const x = this.game.getPipeX(index);
                const pipeTop = groundY - 40;
                if (x + 100 > cameraX - buffer && x < cameraX + viewportWidth + buffer) {
                    // Vertical Culling: Is pipe within viewport? (Pipes go from pipeTop down to game.height)
                    if (this.game.height > cameraY - buffer && pipeTop < cameraY + viewportHeight + buffer) {
                        this.drawPipe(ctx, x, pipeTop, rel.label_fi);
                    }
                }
            });
        }

        // Draw Broader Concept Pipes (Left Wall, Horizontal)
        if (this.game.concept && this.game.concept.broader) {
            if (cameraX < viewportWidth + buffer) {
                const pipeHeight = 80;
                const gap = 40;
                this.game.concept.broader.forEach((broader, index) => {
                    const y = (groundY - 70) - (index * (pipeHeight + gap));
                    if (y + pipeHeight > cameraY - buffer && y < cameraY + viewportHeight + buffer) {
                        this.drawHorizontalPipe(ctx, 0, y, 'right', broader.label_fi);
                    }
                });
            }
        }

        // Draw Narrower Concept Pipes (Right Wall, Horizontal)
        if (this.game.concept && this.game.concept.narrower) {
            if (cameraX + viewportWidth > this.game.levelWidth - buffer) {
                const pipeHeight = 80;
                const gap = 40;
                this.game.concept.narrower.forEach((narrower, index) => {
                    const y = (groundY - 70) - (index * (pipeHeight + gap));
                    if (y + pipeHeight > cameraY - buffer && y < cameraY + viewportHeight + buffer) {
                        this.drawHorizontalPipe(ctx, this.game.levelWidth, y, 'left', narrower.label_fi);
                    }
                });
            }
        }

        // Draw particles
        this.particles.forEach(p => p.draw(ctx));

        // Draw Coins
        this.coins.forEach(c => {
            if (c.x + 20 > cameraX - buffer && c.x - 20 < cameraX + viewportWidth + buffer &&
                c.y + 20 > cameraY - buffer && c.y - 20 < cameraY + viewportHeight + buffer) {
                c.draw(ctx);
            }
        });

        // Draw Enemies
        this.enemies.forEach(e => {
            if (e.x + e.width > cameraX - buffer && e.x < cameraX + viewportWidth + buffer &&
                e.y + e.height > cameraY - buffer && e.y < cameraY + viewportHeight + buffer) {
                e.draw(ctx, this.tileCache);
            }
        });
    }

    drawGround(ctx) {
        const cameraX = this.game.camera.x;
        const cameraY = this.game.camera.y;
        const viewportWidth = this.game.width;
        const viewportHeight = this.game.height;
        const buffer = 100;
        const yOffset = -this.minRow * this.tileSize;

        // --- DRAW 2D GRID (Foreground) ---
        const startGX = Math.floor((cameraX - buffer) / this.chunkWidth);
        const endGX = Math.floor((cameraX + viewportWidth + buffer) / this.chunkWidth);
        const startGY = Math.floor((cameraY + yOffset - buffer) / this.chunkHeight);
        const endGY = Math.floor((cameraY + yOffset + viewportHeight + buffer) / this.chunkHeight);

        for (let gx = startGX; gx <= endGX; gx++) {
            for (let gy = startGY; gy <= endGY; gy++) {
                const key = `${gx},${gy}`;
                const canvas = this.foregroundGrid.get(key);
                if (canvas) {
                    ctx.drawImage(canvas, gx * this.chunkWidth, gy * this.chunkHeight - yOffset);
                }
            }
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

        // --- ENEMY UPDATE & COLLISIONS ---
        const player = this.game.player;
        const cameraX = this.game.camera.x;
        const viewportWidth = this.game.width;
        const buffer = 200;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Viewport culling for updates
            if (enemy.x + enemy.width > cameraX - buffer && enemy.x < cameraX + viewportWidth + buffer) {
                enemy.update(this);

                // Check collision with player
                if (!enemy.isDead && !this.game.transition.active &&
                    player.x + player.width > enemy.x &&
                    player.x < enemy.x + enemy.width &&
                    player.y + player.height > enemy.y &&
                    player.y < enemy.y + enemy.height) {

                    // Collision detected!
                    const overlapTop = (player.y + player.height) - enemy.y;

                    // --- HIGHLY ROBUST STOMP DETECTION ---
                    const prevPlayerBottom = player.y + player.height - player.vy;
                    const prevEnemyTop = enemy.y - (enemy.vy || 0);

                    const isFalling = (player.vy - (enemy.vy || 0)) > 0;
                    const wasAbove = prevPlayerBottom <= prevEnemyTop + 10;
                    const isHittingTop = overlapTop < enemy.height * 0.75;

                    if (isFalling && (wasAbove || isHittingTop)) {
                        // STOMP!
                        enemy.isDead = true;
                        this.game.addScore(400);
                        player.vy = -8; // Small bounce
                        player.grounded = false;
                    } else {
                        // DAMAGE!
                        console.log("Player hit by enemy:", enemy.label);
                        this.respawnPlayer();
                    }
                }
            }

            // --- Cleanup Dead or Fallen Enemies ---
            // Remove if dead (after 30 frames of animation) OR fallen off world
            if ((enemy.isDead && enemy.deathTimer > 30) || enemy.y > this.game.height + 100) {
                this.enemies.splice(i, 1);
            }
        }

        // Check for player death (falling in gap)
        if (player.y > this.game.height + 100) {
            this.respawnPlayer();
        }
    }

    respawnPlayer() {
        // Drop from sky at start of concept
        this.game.player.y = -100;
        this.game.player.x = 100;
        this.game.player.vy = 0;
        this.game.player.vx = 0;
    }

    drawBoundaryWalls(ctx) {
        // Already handled in foregroundCanvasChunks via drawGround
    }

    drawHorizontalPipe(ctx, x, y, direction, label) {
        const pipeThickness = 80;
        const length = 80;
        const capExtra = 4;

        const isRight = direction === 'right';
        const startX = isRight ? x : x - length;
        const cacheId = isRight ? 'pipeHorzR' : 'pipeHorzL';

        // Draw cached pipe sprite
        ctx.drawImage(this.tileCache[cacheId], Math.floor(startX), Math.floor(y - capExtra));

        // Label (still procedural since it varies)
        if (label) {
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
        const bodySegment = 40;

        const cameraY = this.game.camera.y;
        const viewportHeight = this.game.height;
        const buffer = 100;

        // Draw cached cap (if visible)
        if (y + capHeight > cameraY - buffer && y < cameraY + viewportHeight + buffer) {
            ctx.drawImage(this.tileCache['pipeCapV'], Math.floor(x - capExtra), Math.floor(y));
        }

        // Draw body segments (culling segments that are off-screen vertically)
        const bodyStart = y + capHeight;
        const bodyHeight = totalHeight - capHeight;
        const segments = Math.ceil(bodyHeight / bodySegment);

        for (let i = 0; i < segments; i++) {
            const segmentY = bodyStart + i * bodySegment;
            // Visible?
            if (segmentY + bodySegment > cameraY - buffer && segmentY < cameraY + viewportHeight + buffer) {
                ctx.drawImage(this.tileCache['pipeBodyV'], Math.floor(x), Math.floor(segmentY));
            }
        }

        // Label (procedural, only draw if visible)
        if (label && (y - 20) + 14 > cameraY - buffer && (y - 20) < cameraY + viewportHeight + buffer) {
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'black';
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
        const groundY = this.game.height - 40;
        if (player.y + player.height >= groundY) {
            // Check for gaps
            // Allow standing on edge: Check if either foot is on solid ground
            // Use a speed-based inset: Sprinting (vx >= 2.4) allows skipping 1-tile gaps
            const isSprinting = Math.abs(player.vx) >= 2.4;
            const inset = isSprinting ? -10 : 10;
            const leftTile = Math.floor((player.x + inset) / this.tileSize);
            const rightTile = Math.floor((player.x + player.width - inset) / this.tileSize);

            const leftInGap = this.groundGaps.some(g => leftTile >= g.start && leftTile < g.end);
            const rightInGap = this.groundGaps.some(g => rightTile >= g.start && rightTile < g.end);

            const isSupported = !leftInGap || !rightInGap;

            if (isSupported && player.vy >= 0) {
                player.y = groundY - player.height;
                player.vy = 0;
                player.grounded = true;
            }
            // else: fall through!
        }

        // Check Related Concept Pipes
        if (this.game.concept && this.game.concept.related) {
            const buffer = 200; // Check pipes within 200px of player
            this.game.concept.related.forEach((rel, index) => {
                const px = this.game.getPipeX(index);

                // Culling: Only check if pipe is near player
                if (px + 100 < player.x - buffer || px > player.x + player.width + buffer) return;

                const py = groundY - 40;
                const pw = 100;
                const ph = 40; // Back to 40px height above ground

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
            const buffer = 200; // Check pipes within 200px of player
            const pipeHeight = 80;
            const gap = 40;
            this.game.concept.broader.forEach((broader, index) => {
                const y = (groundY - 70) - (index * (pipeHeight + gap));

                // Culling: Only check if wall is near player
                if (80 < player.x - buffer) return;

                // Opening is roughly at x=80 (length of pipe)
                // Hitbox: x=60 to 80, y=y to y+80
                // --- Teleport Trigger ---
                if (player.vx < 0 &&
                    player.x < 65 && player.x > 20 &&
                    player.y + player.height > y + 10 &&
                    player.y < y + pipeHeight - 10) {

                    console.log("Teleporting Left to:", broader.uri);
                    this.game.startPipeTransition(broader.uri, 0, y, 'left');
                    return;
                }

                // --- Solid Collision ---
                const px = 0;
                const py = y;
                const pw = 80; // Full visual width for standing
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
                        // Only block if we're at the back of the pipe
                        if (player.x < 40) {
                            player.x = px + pw;
                            player.vx = 0;
                        }
                    }
                }
            });
        }

        // Check Narrower Pipes (Right Wall)
        if (this.game.concept && this.game.concept.narrower) {
            const buffer = 200; // Check pipes within 200px of player
            const pipeHeight = 80;
            const gap = 40;
            const lw = this.game.levelWidth;
            this.game.concept.narrower.forEach((narrower, index) => {
                const y = (groundY - 70) - (index * (pipeHeight + gap));

                // Culling: Only check if wall is near player
                if (lw - 80 > player.x + player.width + buffer) return;

                // Opening is at lw - 80
                // --- Teleport Trigger ---
                if (player.vx > 0 &&
                    player.x + player.width > lw - 65 && player.x + player.width < lw - 20 &&
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
                        // Only block if we're at the back of the pipe
                        if (player.x + player.width > lw - 40) {
                            player.x = px - player.width;
                            player.vx = 0;
                        }
                    }
                }
            });
        }

        // Check Individual Tiles
        let headHit = false;
        // Optimized: Only check tiles directly surrounding the player
        const startX = Math.floor(player.x / this.tileSize) - 1;
        const endX = Math.ceil((player.x + player.width) / this.tileSize) + 1;
        const startY = Math.floor(player.y / this.tileSize) - 1;
        const endY = Math.ceil((player.y + player.height) / this.tileSize) + 1;

        for (let ty = startY; ty <= endY; ty++) {
            for (let tx = startX; tx <= endX; tx++) {
                const type = this.tiles.get(`${tx},${ty}`);
                if (!type) continue;

                const px = tx * this.tileSize;
                const py = ty * this.tileSize;
                const pw = this.tileSize;
                const ph = this.tileSize;

                // Simple AABB Collision
                const standardOverlap = player.x + player.width > px &&
                    player.x < px + pw &&
                    player.y + player.height > py &&
                    player.y < py + ph;

                if (standardOverlap) {
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
                        const headInset = 10;
                        const headLeft = player.x + headInset;
                        const headRight = player.x + player.width - headInset;

                        if (headRight > px && headLeft < px + pw) {
                            player.y = py + ph;
                            headHit = true;

                            if (type === 'brick') {
                                this.game.addScore(50);
                                this.createExplosion(px, py);

                                // Check for Coin ABOVE this brick
                                for (let c = this.coins.length - 1; c >= 0; c--) {
                                    const coin = this.coins[c];
                                    const coinCenterX = coin.x + coin.size / 2;
                                    const brickCenterX = px + this.tileSize / 2;
                                    if (Math.abs(coinCenterX - brickCenterX) < 20 &&
                                        Math.abs(coin.y + coin.size - py) < 10) {
                                        this.game.addScore(200);
                                        this.coins.splice(c, 1);
                                    }
                                }

                                // Kill enemies on top of the brick
                                this.enemies.forEach(enemy => {
                                    if (!enemy.isDead &&
                                        enemy.x + enemy.width > px &&
                                        enemy.x < px + this.tileSize &&
                                        Math.abs((enemy.y + enemy.height) - py) < 10) { // On top of the brick
                                        enemy.isDead = true;
                                        this.game.addScore(400);
                                    }
                                });

                                this.tiles.delete(`${tx},${ty}`);
                                const yOffset = -this.minRow * this.tileSize;
                                const transformedY = py + yOffset;
                                const gx = Math.floor(px / this.chunkWidth);
                                const gy = Math.floor(transformedY / this.chunkHeight);
                                const localX = px % this.chunkWidth;
                                const localY = transformedY % this.chunkHeight;
                                const canvas = this.tilesGrid.get(`${gx},${gy}`);
                                if (canvas) {
                                    canvas.getContext('2d').clearRect(Math.floor(localX), Math.floor(localY), this.tileSize, this.tileSize);
                                }
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
                } else {
                    // Sprint-over-gaps fallback: check if we should land on this tile even without overlap
                    const isSprinting = Math.abs(player.vx) >= 2.4;
                    if (isSprinting && player.vy >= 0) {
                        const hMargin = 15;
                        const vMargin = 8; // Small vertical allowance for landing
                        if (player.x + player.width + hMargin > px &&
                            player.x - hMargin < px + pw &&
                            player.y + player.height >= py &&
                            player.y + player.height <= py + vMargin) {

                            player.y = py - player.height;
                            player.vy = 0;
                            player.grounded = true;
                        }
                    }
                }
            }
        }

        if (headHit) {
            player.vy = 2.5; // Decisive bounce back down
        }

        // Check Coin Collisions
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];

            // Culling: Skip coins that are far away
            if (coin.x + coin.size < player.x - 100 || coin.x > player.x + player.width + 100) {
                continue;
            }

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
        ctx.translate(Math.floor(this.x), Math.floor(this.y));
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
        ctx.translate(Math.floor(this.x + this.size / 2), Math.floor(this.y + this.size / 2));
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
