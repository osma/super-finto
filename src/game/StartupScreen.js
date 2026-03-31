/**
 * StartupScreen — NES-style title screen for Super Finto.
 * Renders on a dedicated canvas element overlaid on the game container.
 * The player selects a language using arrow keys + Enter/Space.
 */
export class StartupScreen {
    /**
     * @param {HTMLCanvasElement} canvas  - The canvas to render on
     * @param {(lang: string) => void} onSelect - Callback with language code when confirmed
     */
    constructor(canvas, onSelect) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onSelect = onSelect;

        this.canvas.width = 800;
        this.canvas.height = 600;

        this.languages = [
            { code: 'fi', label: 'SUOMI' },
            { code: 'sv', label: 'SVENSKA' },
            { code: 'en', label: 'ENGLISH' },
            { code: 'se', label: 'SÁMEGILLII' },
        ];
        this.selectedIndex = 0;

        this.blinkTimer = 0;
        this.blinkVisible = true;
        this.animFrame = null;
        this.lastTime = performance.now();

        // Cloud positions (deterministic, animated)
        this.clouds = [
            { x: 80, y: 110, w: 120, speed: 0.15 },
            { x: 350, y: 90, w: 100, speed: 0.10 },
            { x: 580, y: 120, w: 140, speed: 0.18 },
        ];

        // Hill radii
        this.hills = [
            { x: 100, y: 520, r: 90 },
            { x: 680, y: 530, r: 70 },
        ];

        this.githubUrl = 'https://github.com/osma/super-finto';
        this.githubRect = { x: 0, y: 0, w: 0, h: 0 };
        this.isHoveringGithub = false;

        this._handleKey = this._handleKey.bind(this);
        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);

        window.addEventListener('keydown', this._handleKey);
        this.canvas.addEventListener('mousedown', this._handleMouseDown);
        this.canvas.addEventListener('mousemove', this._handleMouseMove);

        this._tick = this._tick.bind(this);
        
        // Cache static foreground to slash CPU usage
        this._prerenderForeground();
        
        this.animFrame = requestAnimationFrame(this._tick);
    }

    _prerenderForeground() {
        this.fgCanvas = document.createElement('canvas');
        this.fgCanvas.width = this.canvas.width;
        this.fgCanvas.height = this.canvas.height;
        const ctx = this.fgCanvas.getContext('2d');
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Brick Panel
        const panelX = 60, panelY = 55, panelW = W - 120, panelH = 230;
        this._drawBrickPanel(ctx, panelX, panelY, panelW, panelH);

        // SUPER FINTO text
        ctx.font = 'bold 64px SuperMario, monospace';
        ctx.textAlign = 'center';
        this._drawRetroText(ctx, 'SUPER', W / 2, panelY + 90, '#f8b888', '#7a2800');
        ctx.font = 'bold 80px SuperMario, monospace';
        this._drawRetroText(ctx, 'FINTO', W / 2, panelY + 190, '#f8b888', '#7a2800');

        // Controls Hint
        this._drawControlsHint(ctx, W, H);

        // Hills & Ground
        this._drawHills(ctx, H);
        this._drawGround(ctx, W, H);
    }

    _handleKey(e) {
        const key = e.key;
        if (key === 'ArrowDown') {
            this.selectedIndex = (this.selectedIndex + 1) % this.languages.length;
        } else if (key === 'ArrowUp') {
            this.selectedIndex = (this.selectedIndex - 1 + this.languages.length) % this.languages.length;
        } else if (key === 'Enter' || key === ' ') {
            this._confirm();
        }
    }

    _handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (x >= this.githubRect.x && x <= this.githubRect.x + this.githubRect.w &&
            y >= this.githubRect.y && y <= this.githubRect.y + this.githubRect.h) {
            window.open(this.githubUrl, '_blank');
        }
    }

    _handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const wasHovering = this.isHoveringGithub;
        this.isHoveringGithub = (
            x >= this.githubRect.x && x <= this.githubRect.x + this.githubRect.w &&
            y >= this.githubRect.y && y <= this.githubRect.y + this.githubRect.h
        );

        if (this.isHoveringGithub) {
            this.canvas.style.cursor = 'pointer';
        } else if (wasHovering) {
            this.canvas.style.cursor = 'default';
        }
    }

    _confirm() {
        cancelAnimationFrame(this.animFrame);
        window.removeEventListener('keydown', this._handleKey);
        const lang = this.languages[this.selectedIndex].code;
        this.onSelect(lang);
    }

    _tick(ts) {
        if (!this.lastDrawTime) this.lastDrawTime = ts;
        
        const drawDt = ts - this.lastDrawTime;
        if (drawDt < 33.3) {
            this.animFrame = requestAnimationFrame(this._tick);
            return; // Skip this frame, throttle to ~30 FPS
        }

        const dt = ts - this.lastTime;
        this.lastTime = ts;
        this.lastDrawTime = ts - (drawDt % 33.3);

        // Animate clouds
        for (const c of this.clouds) {
            c.x += c.speed * dt * 0.05;
            if (c.x > 900) c.x = -c.w - 40;
        }

        // Robust blinking: ON for 500ms, OFF for 500ms (1s total cycle)
        this.blinkTimer = (this.blinkTimer + dt) % 1000;
        this.blinkVisible = this.blinkTimer < 500;

        this._draw();
        this.animFrame = requestAnimationFrame(this._tick);
    }

    _draw() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // ── Sky background ──────────────────────────────────────────────
        ctx.fillStyle = '#5c94fc';
        ctx.fillRect(0, 0, W, H);

        // ── Clouds ──────────────────────────────────────────────────────
        this._drawClouds(ctx);

        // ── Cached Static Foreground ────────────────────────────────────
        ctx.drawImage(this.fgCanvas, 0, 0);

        // ── Language menu ────────────────────────────────────────────────
        const menuStartY = 350;
        const lineH = 45;
        ctx.font = '24px SuperMario, monospace';
        ctx.textAlign = 'left';

        for (let i = 0; i < this.languages.length; i++) {
            const y = menuStartY + i * lineH;
            const isSelected = i === this.selectedIndex;

            // Mushroom cursor
            if (isSelected && this.blinkVisible) {
                this._drawMushroom(ctx, 255, y - 20);
            }

            // Fast retro shadow instead of expensive shadowBlur
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillText(this.languages[i].label, 290 + 3, y + 3);
            ctx.fillStyle = isSelected ? '#ffffff' : '#aaccff';
            ctx.fillText(this.languages[i].label, 290, y);
        }

        // ── GitHub Link ──────────────────────────────────────────────
        this._drawGitHubLink(ctx, W, H);
    }

    _drawBrickPanel(ctx, x, y, w, h) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + 6, y + 6, w, h);

        // Main panel fill
        ctx.fillStyle = '#a04020';
        ctx.fillRect(x, y, w, h);

        // Brick pattern — clipped strictly inside the panel
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5;
        const brickH = 18;
        for (let row = 0; row * brickH < h; row++) {
            const offset = (row % 2 === 0) ? 0 : 28;
            const brickW = 56;
            for (let col = -1; col * brickW < w + brickW; col++) {
                const bx = x + col * brickW + offset;
                const by = y + row * brickH;
                ctx.strokeRect(bx, by, brickW, brickH);
            }
        }
        ctx.restore();

        // Corner screws
        const screwPositions = [
            [x + 12, y + 10], [x + w - 12, y + 10],
            [x + 12, y + h - 10], [x + w - 12, y + h - 10],
        ];
        for (const [sx, sy] of screwPositions) {
            ctx.fillStyle = '#c86030';
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#7a2800';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    _drawRetroText(ctx, text, x, y, fillColor, shadowColor) {
        // Shadow offset (bottom-right retro style)
        ctx.fillStyle = shadowColor;
        ctx.fillText(text, x + 4, y + 4);
        // Main
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
    }

    _drawMushroom(ctx, x, y) {
        // Simple NES mushroom: red cap with white spots, beige stem
        const scale = 1.0;
        const cx = x, cy = y;

        // Stem
        ctx.fillStyle = '#f0d0a0';
        ctx.fillRect(cx - 8 * scale, cy + 8 * scale, 16 * scale, 10 * scale);

        // Cap
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.arc(cx, cy, 14 * scale, Math.PI, 0, false);
        ctx.fill();

        // White spots
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx - 5 * scale, cy - 4 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 5 * scale, cy - 4 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 8 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 7 * scale, cy + 1 * scale, 5 * scale, 5 * scale);
        ctx.fillRect(cx + 2 * scale, cy + 1 * scale, 5 * scale, 5 * scale);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 6 * scale, cy + 2 * scale, 3 * scale, 3 * scale);
        ctx.fillRect(cx + 3 * scale, cy + 2 * scale, 3 * scale, 3 * scale);
    }

    _drawClouds(ctx) {
        for (const c of this.clouds) {
            ctx.fillStyle = '#ffffff';
            const { x, y, w } = c;
            const h = w * 0.45;
            // Bottom rectangle
            ctx.fillRect(x + w * 0.1, y + h * 0.5, w * 0.8, h * 0.5);
            // Three bumps
            this._cloudBump(ctx, x + w * 0.2, y + h * 0.5, h * 0.5);
            this._cloudBump(ctx, x + w * 0.5, y + h * 0.1, h * 0.65);
            this._cloudBump(ctx, x + w * 0.78, y + h * 0.4, h * 0.45);
        }
    }

    _cloudBump(ctx, cx, cy, r) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 0, false);
        ctx.fill();
    }

    _drawGround(ctx, W, H) {
        // Ground base
        ctx.fillStyle = '#c84c0c';
        ctx.fillRect(0, H - 42, W, 42);

        // Brick row on top of ground
        const brickW = 40, brickH = 20;
        ctx.fillStyle = '#e05418';
        for (let col = 0; col < W / brickW + 1; col++) {
            ctx.fillRect(col * brickW, H - 42, brickW - 2, brickH - 2);
        }
        ctx.fillStyle = '#c84c0c';
        for (let col = 0; col < W / brickW + 1; col++) {
            const ox = (col % 2 === 0) ? 0 : brickW / 2;
            ctx.fillRect(ox + col * brickW, H - 24, brickW - 2, brickH - 2);
        }
    }

    _drawHills(ctx, canvasH) {
        // Ground top is at canvasH - 42; hills should sit right on that line
        const groundTop = canvasH - 42;
        for (const h of this.hills) {
            // Place arc centre so its flat base (y + r) aligns with groundTop
            const cy = groundTop - h.r;
            ctx.fillStyle = '#2e8b00';
            ctx.beginPath();
            ctx.arc(h.x, cy, h.r, Math.PI, 0, false);
            ctx.fill();
            // Spots
            ctx.fillStyle = '#1a5e00';
            ctx.beginPath(); ctx.arc(h.x - h.r * 0.35, cy - h.r * 0.4, h.r * 0.12, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(h.x + h.r * 0.3, cy - h.r * 0.55, h.r * 0.1, 0, Math.PI * 2); ctx.fill();
        }
    }

    /**
     * Renders language-independent control hints (symbols for Up, Down, Enter, Space).
     */
    _drawControlsHint(ctx, W, H) {
        const x = W / 2;
        const groundTop = H - 42;
        const y = groundTop - 34; // Give a bit more breathing room for the menu above
        const keyH = 26;
        const midY = y + keyH / 2;

        ctx.save();

        const drawKey = (kx, kw, symbol, fontSize = 18, isSpace = false) => {
            // Key shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(kx + 2, y + 2, kw, keyH);
            // Key cap
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(kx, y, kw, keyH);
            // Key border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(kx, y, kw, keyH);

            if (isSpace) {
                // Manually draw spacebar bracket |_|
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                const sw = kw * 0.5;
                const sh = 6;
                const sx = kx + (kw - sw) / 2;
                const sy = midY - 3;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx, sy + sh);
                ctx.lineTo(sx + sw, sy + sh);
                ctx.lineTo(sx + sw, sy);
                ctx.stroke();
            } else {
                // Symbol
                ctx.fillStyle = '#000000';
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(symbol, kx + kw / 2, midY + 1);
            }
        };

        const wArrow = 24;
        const wEnter = 44;
        const wSpace = 72;
        const gap = 12;
        const opW = 20;

        // Calculate total width to center properly
        const totalW = (wArrow * 2 + 4) + (gap + opW + gap) + wEnter + (gap + opW + gap) + wSpace;
        let curX = x - totalW / 2;

        // Arrows group
        drawKey(curX, wArrow, '↑');
        curX += wArrow + 4;
        drawKey(curX, wArrow, '↓');
        curX += wArrow + gap;

        // +
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', curX + opW / 2, midY);
        curX += opW + gap;

        // Enter
        drawKey(curX, wEnter, '↵', 20);
        curX += wEnter + gap;

        // /
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('/', curX + opW / 2, midY);
        curX += opW + gap;

        // Space
        drawKey(curX, wSpace, '', 0, true);

        ctx.restore();
    }

    _drawGitHubLink(ctx, W, H) {
        const codeText = 'CODE';
        const githubText = ' @ GITHUB';
        
        ctx.font = 'bold 20px monospace';
        const codeWidth = ctx.measureText(codeText).width;
        ctx.font = '14px SuperMario, monospace';
        const githubWidth = ctx.measureText(githubText).width;
        
        const totalW = codeWidth + githubWidth;
        const x = W - totalW - 25;
        const y = H - 21; 
        
        this.githubRect = {
            x: x - 15,
            y: y - 15,
            w: totalW + 30,
            h: 30
        };

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const fgColor = this.isHoveringGithub ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
        const shadowColor = this.isHoveringGithub ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        const offset = this.isHoveringGithub ? 0 : 2; 

        // Draw shadow/glow first
        if (this.isHoveringGithub) {
            // Cheap faux glow via stroke instead of heavy blur
            ctx.lineWidth = 4;
            ctx.strokeStyle = shadowColor;
            ctx.font = 'bold 20px monospace';
            ctx.strokeText(codeText, x, y);
            ctx.font = '14px SuperMario, monospace';
            ctx.strokeText(githubText, x + codeWidth, y);
        } else {
            // Cheap retro shadow
            ctx.fillStyle = shadowColor;
            ctx.font = 'bold 20px monospace';
            ctx.fillText(codeText, x + offset, y + offset);
            ctx.font = '14px SuperMario, monospace';
            ctx.fillText(githubText, x + codeWidth + offset, y + offset);
        }

        // Draw Foreground
        ctx.fillStyle = fgColor;
        ctx.font = 'bold 20px monospace';
        ctx.fillText(codeText, x, y);
        ctx.font = '14px SuperMario, monospace';
        ctx.fillText(githubText, x + codeWidth, y);
        
        ctx.restore();
    }


    destroy() {
        cancelAnimationFrame(this.animFrame);
        window.removeEventListener('keydown', this._handleKey);
        this.canvas.removeEventListener('mousedown', this._handleMouseDown);
        this.canvas.removeEventListener('mousemove', this._handleMouseMove);
        this.canvas.style.cursor = 'default';
    }
}
