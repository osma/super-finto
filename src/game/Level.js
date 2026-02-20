import { Enemy } from './Enemy.js';

export class Level {
    constructor(game) {
        this.game = game;
        this.tileSize = 40;
        this.tiles = new Map(); // Grid-based storage: "x,y" -> type
        this.minRow = 0;
        this.particles = [];
        this.coins = [];
        this.parcels = [];
        this.parcelAssignments = new Map(); // "x,y" -> Wikidata ID
        this.enemies = [];
        this.leaves = [];
        this.groundGaps = [];

        // Pre-render tile cache for performance
        this.tileCache = {};
        // Cache initialization moved to setPalette(palette)


        // Layer caching for static geometry (2D Grid Chunking for massive levels)
        this.chunkWidth = 2000;
        this.chunkHeight = 2000;
        this.tilesGrid = new Map(); // "gx,gy" -> canvas
        this.foregroundGrid = new Map(); // "gx,gy" -> canvas
        this.geometryNeedsRedraw = true;
    }

    setPalette(palette) {
        this.currentPalette = palette;
        this.generateSprites(palette);

        // Force Redraw
        this.tilesGrid.clear();
        this.foregroundGrid.clear();
        this.geometryNeedsRedraw = true;
    }

    generateSprites(palette) {
        // Load Wikidata Logo for Parcels if not loaded
        if (!this.wikidataLogo) {
            const wikidataLogo = new Image();
            wikidataLogo.src = '/src/assets/images/Wikidata-logo.svg';
            wikidataLogo.onload = () => {
                this.wikidataLogo = wikidataLogo;
                this.drawParcelSprite(palette.parcel); // Redraw parcel with logo
            };
        }

        // --- 1. Basic Tiles ---
        const tileTypes = [
            { id: 'brick', style: palette.brick, type: 'brick' },
            { id: 'solid', style: palette.solid, type: 'solid' },
            { id: 'ground', style: palette.ground, type: 'ground' },
            { id: 'question', style: palette.question, type: 'question' }, // Using question style
            { id: 'empty-block', style: palette.solid, type: 'empty' } // Use solid style but darker/muted
        ];

        tileTypes.forEach(t => {
            const canvas = document.createElement('canvas');
            canvas.width = this.tileSize;
            canvas.height = this.tileSize;
            const ctx = canvas.getContext('2d');
            this.drawBrickTile(ctx, 0, 0, this.tileSize, this.tileSize, t.style, t.type);
            this.tileCache[t.id] = canvas;
        });

        // --- 2. Parcel ---
        this.drawParcelSprite(palette.parcel);

        // --- 3. Pipes ---
        this.drawPipeSet(palette.pipe);

        // --- 4. Enemy ---
        this.drawEnemySprite(palette.enemy);

        // --- 5. Leaf ---
        this.drawLeafSprite(palette);
    }

    drawLeafSprite(palette) {
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');

        // Draw a golden leaf
        ctx.fillStyle = '#facc15'; // Golden yellow
        ctx.beginPath();
        ctx.moveTo(20, 5);
        ctx.quadraticCurveTo(35, 5, 35, 20);
        ctx.quadraticCurveTo(35, 35, 20, 35);
        ctx.quadraticCurveTo(5, 35, 5, 20);
        ctx.quadraticCurveTo(5, 5, 20, 5);
        ctx.fill();

        // Leaf vein
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 35);
        ctx.lineTo(20, 5);
        ctx.stroke();

        this.tileCache['leaf'] = canvas;
    }

    drawParcelSprite(style) {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const ctx = canvas.getContext('2d');

        // Draw Parcel: White box with rounded corners
        const r = 8;
        const x = 2;
        const y = 2;
        const w = this.tileSize - 4;
        const h = this.tileSize - 4;

        ctx.fillStyle = style.body || '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = style.border || '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wikidata Logo Overlay
        if (this.wikidataLogo) {
            ctx.drawImage(this.wikidataLogo, x + 5, y + 5, w - 10, h - 10);
        }

        this.tileCache['parcel'] = canvas;
    }

    drawPipeSet(style) {
        // Vertical Pipe Cap (96 x 15)
        const capWidth = 96;
        const capHeight = 15;
        const capCanvas = document.createElement('canvas');
        capCanvas.width = capWidth;
        capCanvas.height = capHeight;
        const capCtx = capCanvas.getContext('2d');
        capCtx.fillStyle = style.base;
        capCtx.fillRect(0, 0, capWidth, capHeight);
        capCtx.strokeStyle = '#000'; // Keep outline black? Or use style.dark?
        capCtx.lineWidth = 2;
        capCtx.strokeRect(0, 0, capWidth, capHeight);
        capCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        capCtx.fillRect(14, 2, 8, capHeight - 4); // Highlight
        this.tileCache['pipeCapV'] = capCanvas;

        // Vertical Pipe Body
        const bodyWidth = 80;
        const bodySegment = 40;
        const bodyCanvas = document.createElement('canvas');
        bodyCanvas.width = bodyWidth;
        bodyCanvas.height = bodySegment;
        const bodyCtx = bodyCanvas.getContext('2d');
        bodyCtx.fillStyle = style.dark; // Use dark for body? Or base? usually darker
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
        bodyCtx.fillRect(8, 5, 8, bodySegment - 10); // Highlight
        this.tileCache['pipeBodyV'] = bodyCanvas;

        // Horizontal Pipes
        const hLength = 80;
        const hThickness = 80;
        const hCapWidth = 15;
        const hCapExtra = 4;

        // Right Facing
        const hCanvasR = document.createElement('canvas');
        hCanvasR.width = hLength;
        hCanvasR.height = hThickness + hCapExtra * 2;
        const hCtxR = hCanvasR.getContext('2d');
        const bodyW = hLength - hCapWidth;

        hCtxR.fillStyle = style.dark;
        hCtxR.fillRect(0, hCapExtra, bodyW, hThickness);
        hCtxR.strokeStyle = '#000';
        hCtxR.lineWidth = 2;
        hCtxR.strokeRect(0, hCapExtra, bodyW, hThickness);

        hCtxR.fillStyle = style.base;
        hCtxR.fillRect(bodyW, 0, hCapWidth, hThickness + hCapExtra * 2);
        hCtxR.strokeRect(bodyW, 0, hCapWidth, hThickness + hCapExtra * 2);

        hCtxR.fillStyle = 'rgba(255, 255, 255, 0.3)';
        hCtxR.fillRect(0, hCapExtra + 5, hLength, 8);
        this.tileCache['pipeHorzR'] = hCanvasR;

        // Left Facing
        const hCanvasL = document.createElement('canvas');
        hCanvasL.width = hLength;
        hCanvasL.height = hThickness + hCapExtra * 2;
        const hCtxL = hCanvasL.getContext('2d');

        hCtxL.fillStyle = style.dark;
        hCtxL.fillRect(hCapWidth, hCapExtra, bodyW, hThickness);
        hCtxL.strokeStyle = '#000';
        hCtxL.lineWidth = 2;
        hCtxL.strokeRect(hCapWidth, hCapExtra, bodyW, hThickness);

        hCtxL.fillStyle = style.base;
        hCtxL.fillRect(0, 0, hCapWidth, hThickness + hCapExtra * 2);
        hCtxL.strokeRect(0, 0, hCapWidth, hThickness + hCapExtra * 2);

        hCtxL.fillStyle = 'rgba(255, 255, 255, 0.3)';
        hCtxL.fillRect(0, hCapExtra + 5, hLength, 8);
        this.tileCache['pipeHorzL'] = hCanvasL;
    }

    drawEnemySprite(style) {
        const enemyCanvas = document.createElement('canvas');
        enemyCanvas.width = 40;
        enemyCanvas.height = 40;
        const eCtx = enemyCanvas.getContext('2d');

        eCtx.fillStyle = style.body;
        // Body (Circle-ish)
        eCtx.beginPath();
        eCtx.arc(20, 25, 15, 0, Math.PI * 2);
        eCtx.fill();
        // Feet
        eCtx.fillStyle = style.feet;
        eCtx.fillRect(10, 35, 10, 5);
        eCtx.fillRect(20, 35, 10, 5);
        // Eyes
        eCtx.fillStyle = style.eyes || 'white';
        eCtx.fillRect(12, 20, 6, 6);
        eCtx.fillRect(22, 20, 6, 6);
        eCtx.fillStyle = 'black';
        eCtx.fillRect(14, 22, 2, 2);
        eCtx.fillRect(24, 22, 2, 2);
        // Eyebrows (Angry)
        eCtx.strokeStyle = style.brows || 'black';
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
        this.leaves = [];
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

        // Start from x=3 to give some start space, end with padding
        let x = 3;

        while (x < levelWidthTiles - 4) {
            // 90% chance to spawn a platform at this x
            if (rng.next() < 0.9) {
                const width = Math.floor(rng.next() * 6) + 1; // 1 to 6 width

                // Density based spawning: Every 5-8 blocks (constant density)
                // START at a jumpable height: 4-6 blocks above ground
                let currentY = groundRow - (Math.floor(rng.next() * 3) + 4);

                while (currentY >= this.minRow) {
                    // Add tiles for this row
                    for (let i = 0; i < width; i++) {
                        if (x + i >= levelWidthTiles - 4) break;
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

        // --- ADD QUESTION MARK BLOCKS ---
        const pipesCount = (this.game.concept?.related?.length || 0) + broaderCount + narrowerCount;

        // Find all destroyable bricks
        const brickPositions = [];
        for (let [key, type] of this.tiles) {
            if (type === 'brick') {
                brickPositions.push(key);
            }
        }

        // Shuffle brickPositions using RNG and pick pipesCount bricks to replace
        for (let i = 0; i < pipesCount && brickPositions.length > 0; i++) {
            const randomIndex = Math.floor(rng.next() * brickPositions.length);
            const key = brickPositions.splice(randomIndex, 1)[0];
            this.tiles.set(key, 'question');
        }

        // --- Wikidata Parcel Assignment ---
        this.parcelAssignments.clear();
        if (this.game.concept && this.game.concept.wikidata) {
            const wikidataIds = this.game.concept.wikidata;
            const questionBlocks = [];
            for (let [key, type] of this.tiles) {
                if (type === 'question') {
                    questionBlocks.push(key);
                }
            }

            // Pick one question block for each wikidata ID
            for (let i = 0; i < wikidataIds.length && questionBlocks.length > 0; i++) {
                const randomIndex = Math.floor(rng.next() * questionBlocks.length);
                const key = questionBlocks.splice(randomIndex, 1)[0];
                this.parcelAssignments.set(key, wikidataIds[i]);
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

        // Add Ceiling (1 unit above side barriers)
        const ceilingRow = this.minRow - 1;
        for (let x = 0; x < levelWidthTiles; x++) {
            this.tiles.set(`${x},${ceilingRow}`, 'solid');
        }


        // Fill gaps between horizontal side pipes to prevent player from getting stuck
        // Pipe dimensions: 80px height (2 tiles), 40px gap (1 tile)
        // Use 'invisible' blocks - they have collision but don't render
        const groundY = this.game.height - 40;
        const firstPipeY = groundY - 80;

        // Left wall (broader concepts)
        if (this.game.concept && this.game.concept.broader && this.game.concept.broader.length > 1) {
            for (let i = 0; i < this.game.concept.broader.length - 1; i++) {
                // Gap is ABOVE the current pipe (i)
                const gapY = firstPipeY - (i * 120) - 40;
                const gapRow = Math.floor(gapY / this.tileSize);
                // Fill the gap row at x=0 and x=1 (2 tiles wide to match pipe width)
                this.tiles.set(`0,${gapRow}`, 'invisible');
                this.tiles.set(`1,${gapRow}`, 'invisible');
            }
        }

        // Right wall (narrower concepts)
        if (this.game.concept && this.game.concept.narrower && this.game.concept.narrower.length > 1) {
            for (let i = 0; i < this.game.concept.narrower.length - 1; i++) {
                const gapY = firstPipeY - (i * 120) - 40;
                const gapRow = Math.floor(gapY / this.tileSize);
                // Fill the gap row at the right edge (2 tiles wide to match pipe width)
                this.tiles.set(`${levelWidthTiles - 2},${gapRow}`, 'invisible');
                this.tiles.set(`${levelWidthTiles - 1},${gapRow}`, 'invisible');
            }
        }



        // Add Climbing Towers if there are more than 2 pipes on either side

        // Left Tower (for broader concepts)
        if (broaderCount > 2) {
            const pipeHeight = 80;
            const gap = 40;
            const highestPipeY = (this.game.height - 40 - 80) - ((broaderCount - 1) * (pipeHeight + gap));
            const highestRow = Math.floor(highestPipeY / this.tileSize);

            // Alternating blocks in columns 3 and 4 (moved 2 positions away from wall)
            // With 2 empty rows between blocks (every 3 rows)
            // Start from groundRow - 1 (one row above ground)
            for (let y = groundRow - 1; y >= highestRow; y--) {
                const rowFromBottom = groundRow - y;
                // Column 3: rows 3, 9, 15... (shifted up from 2)
                if (rowFromBottom % 6 === 3) {
                    this.tiles.set(`2,${y}`, 'solid');
                }
                // Column 3: rows 6, 12, 18... (shifted up from 5)
                if (rowFromBottom % 6 === 0) {
                    this.tiles.set(`3,${y}`, 'solid');
                }
            }
        }

        // Right Tower (for narrower concepts)
        if (narrowerCount > 2) {
            const pipeHeight = 80;
            const gap = 40;
            const highestPipeY = (this.game.height - 40 - 80) - ((narrowerCount - 1) * (pipeHeight + gap));
            const highestRow = Math.floor(highestPipeY / this.tileSize);

            // Alternating blocks in columns levelWidthTiles-5 and levelWidthTiles-4 (moved 2 positions away)
            // With 2 empty rows between blocks (every 3 rows)
            // Start from groundRow - 1 (one row above ground)
            for (let y = groundRow - 1; y >= highestRow; y--) {
                const rowFromBottom = groundRow - y;
                // Right column 1: rows 3, 9, 15... (shifted up from 2)
                if (rowFromBottom % 6 === 3) {
                    this.tiles.set(`${levelWidthTiles - 4},${y}`, 'solid');
                }
                // Right column 2: rows 6, 12, 18... (shifted up from 5)
                if (rowFromBottom % 6 === 0) {
                    this.tiles.set(`${levelWidthTiles - 3},${y}`, 'solid');
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

                // Ensure not too close to other enemies (at least 1 grid unit away)
                const tooClose = this.enemies.some(e => {
                    const etx = Math.floor(e.x / this.tileSize);
                    const ety = Math.floor(e.y / this.tileSize);
                    return Math.abs(tx - etx) <= 1 && Math.abs(ty - ety) <= 1;
                });
                if (tooClose) continue;

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
                // Pipe width is 80px. Convert to tile coordinates.
                // Include a buffer of 5 tiles on each side
                const startTile = Math.floor(px / this.tileSize) - 5;
                const endTile = Math.ceil((px + 80) / this.tileSize) + 5;
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
        // --- SPAWN LEAF (For Leaf Node Levels) ---
        if (narrowerCount === 0 && this.game.concept && !this.game.collectedLeafUris.has(this.game.concept.uri)) {
            const groundRow = Math.floor((this.game.height - 40) / this.tileSize);
            const leafX = this.game.levelWidth - 100;
            const leafY = (groundRow * this.tileSize) - 40;
            this.leaves.push(new Leaf(leafX, leafY));
            console.log("Leaf spawned at:", leafX, leafY);
        } else if (narrowerCount === 0) {
            console.log("Leaf already collected for this concept.");
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
        // Adjust yOffset to account for ceiling at minRow - 1
        const yOffset = -(this.minRow - 1) * this.tileSize;

        // Clear existing grids
        this.tilesGrid.clear();
        this.foregroundGrid.clear();

        // Draw all individual tiles to 2D grid
        for (let [key, type] of this.tiles) {
            // Skip invisible tiles - they have collision but don't render
            if (type === 'invisible') continue;

            const [tx, ty] = key.split(',').map(Number);
            const x = tx * this.tileSize;
            const y = ty * this.tileSize + yOffset;

            const gx = Math.floor(x / this.chunkWidth);
            const gy = Math.floor(y / this.chunkHeight);
            const localX = x % this.chunkWidth;
            const localY = y % this.chunkHeight;

            const canvas = this.getGridCanvas(this.tilesGrid, gx, gy);
            const ctx = canvas.getContext('2d');
            const cacheId = type === 'solid' ? 'solid' : (type === 'question' ? 'question' : 'brick');
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

        const yOffset = -(this.minRow - 1) * this.tileSize;

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
                if (x + 80 > cameraX - buffer && x < cameraX + viewportWidth + buffer) {
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
                    const y = (groundY - 80) - (index * (pipeHeight + gap));
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
                    const y = (groundY - 80) - (index * (pipeHeight + gap));
                    if (y + pipeHeight > cameraY - buffer && y < cameraY + viewportHeight + buffer) {
                        this.drawHorizontalPipe(ctx, this.game.levelWidth, y, 'left', narrower.label_fi);
                    }
                });
            }
        }

        // Draw particles
        this.particles.forEach(p => p.draw(ctx));

        // Draw Coins
        this.coins.forEach(coin => {
            if (coin.x + 20 > cameraX - buffer && coin.x - 20 < cameraX + viewportWidth + buffer &&
                coin.y + 20 > cameraY - buffer && coin.y - 20 < cameraY + viewportHeight + buffer) {
                coin.draw(ctx);
            }
        });

        // Draw Parcels
        this.parcels.forEach(parcel => {
            parcel.draw(ctx, this.tileCache);
        });

        // Draw Leaves
        this.leaves.forEach(leaf => {
            leaf.draw(ctx, this.tileCache);
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
        const yOffset = -(this.minRow - 1) * this.tileSize;

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
            // Remove if off screen vertically (accounting for camera) OR if specialized particle timer finished
            const p = this.particles[i];
            const offBottom = p.y > Math.max(this.game.height, this.game.camera.y + this.game.height) + 100;
            if (offBottom || (p.maxTimer && p.timer > p.maxTimer)) {
                this.particles.splice(i, 1);
            }
        }

        // Update parcels
        for (let i = this.parcels.length - 1; i >= 0; i--) {
            this.parcels[i].update(this);
            if (this.parcels[i].isDead && this.parcels[i].deathTimer > 30) {
                this.parcels.splice(i, 1);
            } else if (this.parcels[i].y > this.game.height + 100) {
                this.parcels.splice(i, 1);
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
                const hInset = 2; // Horizontal "mercy" inset
                const vInset = 4; // Vertical "mercy" inset to prevent collisions between levels
                if (!enemy.isDead && !player.isDying && !this.game.transition.active &&
                    player.x + player.width - hInset > enemy.x + hInset &&
                    player.x + hInset < enemy.x + enemy.width - hInset &&
                    player.y + player.height - vInset > enemy.y + vInset &&
                    player.y + vInset < enemy.y + enemy.height - vInset) {


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
                        enemy.deathType = 'squash';
                        this.game.addScore(400);
                        player.vy = -8; // Small bounce
                        player.grounded = false;
                    } else if (player.invulnerableTimer <= 0) {
                        // DAMAGE!
                        console.log("Player hit by enemy:", enemy.label);
                        if (player.isBig) {
                            player.shrink();
                        } else {
                            player.die();
                        }
                    }
                }
            }

            // --- Cleanup Dead or Fallen Enemies ---
            // Remove if dead (after 30 frames of animation) OR fallen off world
            if ((enemy.isDead && enemy.deathTimer > 30) || enemy.y > this.game.height + 100) {
                this.enemies.splice(i, 1);
            }
        }

        // Update leaves and check collection
        for (let i = this.leaves.length - 1; i >= 0; i--) {
            const leaf = this.leaves[i];
            if (!this.game.transition.active &&
                player.x < leaf.x + 40 &&
                player.x + player.width > leaf.x &&
                player.y < leaf.y + 40 &&
                player.y + player.height > leaf.y) {

                // Collect!
                this.game.addLeaf();
                this.leaves.splice(i, 1);
            }
        }

        // Check for player death (falling in gap)
        if (player.y > this.game.height && !player.isDying) {
            player.die();
        }
    }

    respawnPlayer() {
        // Reset player to the starting position of the level (bottom-left)
        this.game.resetPlayerDefault();
        this.game.player.invulnerableTimer = 3000; // 3 seconds of invincibility on respawn
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
        const pipeWidth = 80;
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

    drawBrickTile(ctx, x, y, w, h, style, type) {
        ctx.fillStyle = style.base;
        ctx.fillRect(x, y, w, h);

        if (type === 'ground') {
            // Ground specific: Grass top?
            // User requested palette.ground.base and dark.
            // If it's pure color, maybe no grass?
            // Previous code had green grass at top.
            // Let's create a separation using darker color.
            ctx.fillStyle = style.dark; // Or dedicated trim color
            ctx.fillRect(x, y, w, 6); // Top trim

            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x + 5, y + 20, 4, 4);
            ctx.fillRect(x + 25, y + 35, 4, 4);
        } else if (type === 'solid' || type === 'empty') {
            // Solid Block (Metal/Stone look with rivets)
            // Use style.highlight or derived outline
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

            // Rivets
            ctx.fillStyle = style.dark;
            ctx.fillRect(x + 4, y + 4, 4, 4);
            ctx.fillRect(x + w - 8, y + 4, 4, 4);
            ctx.fillRect(x + 4, y + h - 8, 4, 4);
            ctx.fillRect(x + w - 8, y + h - 8, 4, 4);
        } else if (type === 'brick') {
            // Brick Pattern
            ctx.fillStyle = style.highlight;
            ctx.fillRect(x, y, w, 2);
            ctx.fillRect(x, y, 2, h);
            ctx.fillStyle = style.dark;
            ctx.fillRect(x, y + h - 2, w, 2);
            ctx.fillRect(x + w - 2, y, 2, h);

            ctx.fillStyle = style.mortar;
            ctx.fillRect(x, y + h / 2, w, 1);
            ctx.fillRect(x + w / 2, y, 1, h / 2);
            ctx.fillRect(x + w / 4, y + h / 2, 1, h / 2);
        } else if (type === 'question') {
            // Background is already base
            // Border
            ctx.strokeStyle = style.dark;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

            // Rivets
            ctx.fillStyle = style.dark; // or red? Old was #b91c1c. Let's stick to style.dark to match palette
            const rSize = 4;
            ctx.fillRect(x + 4, y + 4, rSize, rSize);
            ctx.fillRect(x + w - 8, y + 4, rSize, rSize);
            ctx.fillRect(x + 4, y + h - 8, rSize, rSize);
            ctx.fillRect(x + w - 8, y + h - 8, rSize, rSize);

            // The Question Mark
            ctx.fillStyle = style.dark;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', x + w / 2, y + h / 2 + 2);

            // Highlight
            ctx.fillStyle = style.highlight;
            ctx.fillRect(x + 6, y + 6, w - 12, 2);
            ctx.fillRect(x + 6, y + 8, 2, h - 16);
        }
    }

    checkCollisions(player) {
        if (player.isDying) return;
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
                if (px + 80 < player.x - buffer || px > player.x + player.width + buffer) return;

                const py = groundY - 40;
                const pw = 80;
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
                const y = (groundY - 80) - (index * (pipeHeight + gap));

                // Culling: Only check if wall is near player
                if (80 < player.x - buffer) return;

                // Opening is roughly at x=80 (length of pipe)
                // Hitbox: x=60 to 80, y=y to y+80
                // --- Teleport Trigger ---
                if (player.vx < 0 &&
                    player.x < 45 && player.x > 10 &&
                    player.y + player.height > y + 20 &&
                    player.y < y + pipeHeight - 20) {

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
                const y = (groundY - 80) - (index * (pipeHeight + gap));

                // Culling: Only check if wall is near player
                if (lw - 80 > player.x + player.width + buffer) return;

                // Opening is at lw - 80
                // --- Teleport Trigger ---
                if (player.vx > 0 &&
                    player.x + player.width > lw - 45 && player.x + player.width < lw - 10 &&
                    player.y + player.height > y + 20 &&
                    player.y < y + pipeHeight - 20) {

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
                        const headInset = 12; // Narrower kill zone
                        const headLeft = player.x + headInset;
                        const headRight = player.x + player.width - headInset;

                        if (headRight > px && headLeft < px + pw) {
                            player.y = py + ph;
                            headHit = true;
                            // Do NOT set player.vy = 0 here yet, let the headHit logic handle it or just stop rising
                            player.vy = 0; // Stop rising immediately, but don't bounce down violently

                            // Kill enemies on top of the hit tile
                            this.enemies.forEach(enemy => {
                                if (!enemy.isDead &&
                                    enemy.x + enemy.width > px &&
                                    enemy.x < px + this.tileSize &&
                                    Math.abs((enemy.y + enemy.height) - py) < 10) { // On top of the tile
                                    enemy.isDead = true;
                                    enemy.deathType = 'flip';
                                    enemy.vy = -5; // Pop up animation
                                    this.game.addScore(400);
                                }
                            });

                            if (type === 'brick') {
                                if (player.isBig) {
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

                                    this.tiles.delete(`${tx},${ty}`);
                                    const yOffset = -(this.minRow - 1) * this.tileSize;
                                    const transformedY = py + yOffset;
                                    const gx = Math.floor(px / this.chunkWidth);
                                    const gy = Math.floor(transformedY / this.chunkHeight);
                                    const localX = px % this.chunkWidth;
                                    const localY = transformedY % this.chunkHeight;
                                    const canvas = this.tilesGrid.get(`${gx},${gy}`);
                                    if (canvas) {
                                        canvas.getContext('2d').clearRect(Math.floor(localX), Math.floor(localY), this.tileSize, this.tileSize);
                                    }
                                } else {
                                    // Small elf just bumps the brick
                                    this.startBump(px, py, 'brick', tx, ty);
                                }
                            } else if (type === 'question') {
                                // Turn to empty block
                                this.tiles.set(`${tx},${ty}`, 'empty-block');
                                // Spawning Hidden Content
                                const wikidataId = this.parcelAssignments.get(`${tx},${ty}`);
                                if (wikidataId) {
                                    // Spawning Parcel
                                    this.parcels.push(new Parcel(px, py - this.tileSize, wikidataId, this.tileSize));
                                } else {
                                    // Spawning Floating Coin Animation
                                    this.particles.push(new FloatingCoin(px + 10, py - 10));
                                    this.game.addScore(200);
                                }

                                // Trigger Bump Animation with the new sprite
                                this.startBump(px, py, 'empty-block', tx, ty);
                            } else if (type === 'empty-block') {
                                this.startBump(px, py, 'empty-block', tx, ty);
                            }
                        }
                    } else if (minOverlap === overlapLeft) {
                        // Left Collision
                        player.x = px - player.width;
                        if (player.grounded) player.vx = 0; // Only stop if grounded
                    } else if (minOverlap === overlapRight) {
                        // Right Collision
                        player.x = px + pw;
                        if (player.grounded) player.vx = 0; // Only stop if grounded
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
            // player.vy = 2.5; // REMOVED bounce
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

        // Check Parcel Collisions
        for (let i = this.parcels.length - 1; i >= 0; i--) {
            const parcel = this.parcels[i];
            const pInset = 4;
            if (!parcel.isDead &&
                player.x + pInset < parcel.x + parcel.width &&
                player.x + player.width - pInset > parcel.x &&
                player.y + pInset < parcel.y + parcel.height &&
                player.y + player.height - pInset > parcel.y) {

                // Collect Parcel
                this.game.addScore(1000); // Parcels are worth more!
                player.grow(); // Grow if not already
                this.parcels.splice(i, 1);
                console.log("Collected Parcel:", parcel.label);
            }
        }
    }

    startBump(px, py, type, tx, ty) {
        // Prevent double bump
        if (this.particles.some(p => p instanceof BumpingBlock && p.tx === tx && p.ty === ty)) {
            return;
        }

        // Clear from cache
        const yOffset = -(this.minRow - 1) * this.tileSize;
        const transformedY = py + yOffset;
        const gx = Math.floor(px / this.chunkWidth);
        const gy = Math.floor(transformedY / this.chunkHeight);
        const localX = px % this.chunkWidth;
        const localY = transformedY % this.chunkHeight;
        const canvas = this.tilesGrid.get(`${gx},${gy}`);
        if (canvas) {
            canvas.getContext('2d').clearRect(Math.floor(localX), Math.floor(localY), this.tileSize, this.tileSize);
        }

        // Add to bumping particles
        this.particles.push(new BumpingBlock(this, px, py, type, tx, ty));
    }

    restoreTile(tx, ty, type) {
        const px = tx * this.tileSize;
        const py = ty * this.tileSize;
        const yOffset = -(this.minRow - 1) * this.tileSize;
        const transformedY = py + yOffset;
        const gx = Math.floor(px / this.chunkWidth);
        const gy = Math.floor(transformedY / this.chunkHeight);
        const localX = px % this.chunkWidth;
        const localY = transformedY % this.chunkHeight;
        const canvas = this.tilesGrid.get(`${gx},${gy}`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(Math.floor(localX), Math.floor(localY), this.tileSize, this.tileSize);
            ctx.drawImage(this.tileCache[type], Math.floor(localX), Math.floor(localY));
        }
    }

    spawnFloatingScore(x, y, points) {
        this.particles.push(new FloatingScore(x, y, points));
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

class FloatingCoin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = -8;
        this.ay = 0.5;
        this.timer = 0;
        this.maxTimer = 30;
    }
    update() {
        this.y += this.vy;
        this.vy += this.ay;
        this.timer++;
    }
    draw(ctx) {
        const wobble = Math.sin(this.timer * 0.5) * 5;
        ctx.fillStyle = '#fbbf24'; // Same as question block yellow
        ctx.beginPath();
        // Coin shape
        ctx.ellipse(this.x + 10, this.y, 8 + Math.abs(wobble), 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner line
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y - 10);
        ctx.lineTo(this.x + 10, this.y + 10);
        ctx.stroke();
    }
}

class Parcel extends Enemy {
    constructor(x, y, wikidataId, tileSize) {
        super(x, y, wikidataId, tileSize);
        this.vx = (Math.random() > 0.5 ? 1 : -1) * 1.0;
    }

    draw(ctx, tileCache) {
        if (this.isDead && this.deathTimer > 30) return;

        ctx.save();
        const drawX = Math.floor(this.x);
        const drawY = Math.floor(this.y);

        if (this.isDead) {
            ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 30);

            if (this.deathType === 'squash') {
                ctx.translate(drawX + this.width / 2, drawY + this.height);
                ctx.scale(1, 0.5);
                if (tileCache['parcel']) {
                    ctx.drawImage(tileCache['parcel'], -this.width / 2, -this.height);
                } else {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
                }
            } else if (this.deathType === 'flip') {
                ctx.translate(drawX + this.width / 2, drawY + this.height / 2);
                ctx.rotate(Math.PI);
                if (tileCache['parcel']) {
                    ctx.drawImage(tileCache['parcel'], -this.width / 2, -this.height / 2);
                } else {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                }
            }
        } else {
            // Draw normal parcel sprite
            if (tileCache['parcel']) {
                ctx.drawImage(tileCache['parcel'], drawX, drawY);
            } else {
                ctx.fillStyle = 'white';
                ctx.fillRect(drawX, drawY, this.width, this.height);
            }
        }

        // Draw Label (Wikidata ID)
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

class BumpingBlock {
    constructor(level, x, y, type, tx, ty) {
        this.level = level;
        this.x = x;
        this.y = y;
        this.originalY = y;
        this.type = type;
        this.tx = tx;
        this.ty = ty;
        this.timer = 0;
        this.maxTimer = 8; // Quick bump
    }
    update() {
        this.timer++;
        // Sine wave bump: 0 to PI
        const progress = this.timer / this.maxTimer;
        const offset = Math.sin(progress * Math.PI) * 12;
        this.y = this.originalY - offset;

        if (this.timer >= this.maxTimer) {
            this.level.restoreTile(this.tx, this.ty, this.type);
            return true; // Mark for removal
        }
        return false;
    }
    draw(ctx) {
        const img = this.level.tileCache[this.type];
        if (img) {
            ctx.drawImage(img, Math.floor(this.x), Math.floor(this.y));
        }
    }
}

class FloatingScore {
    constructor(x, y, points) {
        this.x = x;
        this.y = y;
        this.points = points;
        this.timer = 0;
        this.maxTimer = 60; // 1 second at 60fps
        this.opacity = 1;
        this.vy = -1.5; // Upward speed
    }

    update() {
        this.timer++;
        this.y += this.vy;
        this.opacity = Math.max(0, 1 - (this.timer / this.maxTimer));
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';

        const textX = Math.floor(this.x);
        const textY = Math.floor(this.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(this.points, textX + 1, textY + 1);

        // White text
        ctx.fillStyle = 'white';
        ctx.fillText(this.points, textX, textY);

        ctx.restore();
    }
}

export class Leaf {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.wobble = Math.random() * Math.PI * 2;
    }

    draw(ctx, tileCache) {
        const sprite = tileCache['leaf'];
        if (sprite) {
            const yOffset = Math.sin(Date.now() / 200 + this.wobble) * 5;
            ctx.drawImage(sprite, Math.floor(this.x), Math.floor(this.y + yOffset));
        }
    }
}

