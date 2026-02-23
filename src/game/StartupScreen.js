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
            { code: 'en', label: 'ENGLISH' },
            { code: 'fi', label: 'SUOMI' },
            { code: 'sv', label: 'SVENSKA' },
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

        this._handleKey = this._handleKey.bind(this);
        window.addEventListener('keydown', this._handleKey);

        this._tick = this._tick.bind(this);
        this.animFrame = requestAnimationFrame(this._tick);
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

    _confirm() {
        cancelAnimationFrame(this.animFrame);
        window.removeEventListener('keydown', this._handleKey);
        const lang = this.languages[this.selectedIndex].code;
        this.onSelect(lang);
    }

    _tick(ts) {
        const dt = ts - this.lastTime;
        this.lastTime = ts;

        // Animate clouds
        for (const c of this.clouds) {
            c.x += c.speed * dt * 0.05;
            if (c.x > 900) c.x = -c.w - 40;
        }

        // Blink cursor every 500ms
        this.blinkTimer += dt;
        if (this.blinkTimer >= 500) {
            this.blinkTimer -= 500;
            this.blinkVisible = !this.blinkVisible;
        }

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

        // ── Title panel (brown brick rectangle) ─────────────────────────
        const panelX = 60, panelY = 55, panelW = W - 120, panelH = 230;
        this._drawBrickPanel(ctx, panelX, panelY, panelW, panelH);

        // ── "SUPER" text ─────────────────────────────────────────────────
        ctx.font = 'bold 64px SuperMario, monospace';
        ctx.textAlign = 'center';
        this._drawRetroText(ctx, 'SUPER', W / 2, panelY + 90, '#f8b888', '#7a2800');

        // ── "FINTO" text ─────────────────────────────────────────────────
        ctx.font = 'bold 80px SuperMario, monospace';
        this._drawRetroText(ctx, 'FINTO', W / 2, panelY + 190, '#f8b888', '#7a2800');

        // ── Language menu ────────────────────────────────────────────────
        const menuStartY = 340;
        const lineH = 50;
        ctx.font = '24px SuperMario, monospace';
        ctx.textAlign = 'left';

        for (let i = 0; i < this.languages.length; i++) {
            const y = menuStartY + i * lineH;
            const isSelected = i === this.selectedIndex;

            // Mushroom cursor
            if (isSelected && this.blinkVisible) {
                this._drawMushroom(ctx, 255, y - 20);
            }

            ctx.fillStyle = isSelected ? '#ffffff' : '#aaccff';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 4;
            ctx.fillText(this.languages[i].label, 290, y);
            ctx.shadowBlur = 0;
        }

        // ── Select hint ───────────────────────────────────────────────────
        ctx.font = '14px SuperMario, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        // Keep hint above the ground strip (ground starts at H-42)
        ctx.fillText('Arrow keys  +  Enter or Space', W / 2, H - 52);

        // ── Hills (drawn before ground so ground overlaps the base) ────
        this._drawHills(ctx, H);

        // ── Ground strip ─────────────────────────────────────────────
        this._drawGround(ctx, W, H);
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

    destroy() {
        cancelAnimationFrame(this.animFrame);
        window.removeEventListener('keydown', this._handleKey);
    }
}
