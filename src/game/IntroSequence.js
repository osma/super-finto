import { getLang } from './i18n.js';

export class IntroSequence {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} lang
     * @param {() => void} onComplete
     */
    constructor(canvas, lang, onComplete) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lang = lang;
        this.onComplete = onComplete;

        this.opacity = 1.0;
        this.fadeState = 'visible'; 
        this.duration = 7000; // 7 seconds before auto-fade
        this.elapsed = 0;
        this.lastTime = 0;
        
        // Lock dismissal for a moment to prevent accidental skip from transition keydown
        this.canDismiss = false;

        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._tick = this._tick.bind(this);

        // Using keyup is safer to avoid capturing the 'Enter' that started the game
        window.addEventListener('keyup', this._handleKeyUp);
        this.animFrame = requestAnimationFrame(this._tick);
    }

    _handleKeyUp(e) {
        // Only allow dismissing after half a second of being visible
        if (this.elapsed > 500) {
            this.canDismiss = true;
        }

        if (this.canDismiss && (e.key === 'Enter' || e.key === ' ')) {
            this._startFadeOut();
        }
    }

    _startFadeOut() {
        if (this.fadeState === 'fading_out') return;
        this.fadeState = 'fading_out';
    }

    _tick(ts) {
        // Robust timestamp handling for the first frame
        if (!this.lastTime) {
            this.lastTime = ts;
            this.animFrame = requestAnimationFrame(this._tick);
            return;
        }
        
        const dt = ts - this.lastTime;
        this.lastTime = ts;
        this.elapsed += dt;

        if (this.fadeState === 'visible' && this.elapsed > this.duration) {
            this._startFadeOut();
        }

        if (this.fadeState === 'fading_out') {
            this.opacity -= dt / 1000; // 1 second fade duration
            if (this.opacity <= 0) {
                this.opacity = 0;
                this._finish();
                return;
            }
        }

        this._draw(ts);
        this.animFrame = requestAnimationFrame(this._tick);
    }

    _draw(ts) {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Reset canvas state to ensure clean drawing
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1.0;
        ctx.filter = 'none';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Background is always solid black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, W, H);

        const strings = getLang(this.lang);
        const text = strings.intro || '';
        const lines = text.split('\n');

        // Draw instructions with current opacity
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.fillStyle = 'white';
        // Using SuperMario font if available, or fallback to monospace
        ctx.font = '16px SuperMario, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lineHeight = 35;
        const totalH = lines.length * lineHeight;
        const startY = H / 2 - totalH / 2 + lineHeight / 2;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], W / 2, startY + i * lineHeight);
        }
        
        // Show skip hint bottom center after 3 sec (flashing)
        if (this.fadeState === 'visible' && this.elapsed > 3000) {
            ctx.globalAlpha = (Math.sin(ts / 200) * 0.25 + 0.5) * this.opacity;
            ctx.font = '12px SuperMario, monospace';
            ctx.fillText('↵ / SPACE', W / 2, H - 80);
        }

        ctx.globalAlpha = 1.0;
    }

    _finish() {
        cancelAnimationFrame(this.animFrame);
        window.removeEventListener('keyup', this._handleKeyUp);
        this.onComplete();
    }

    destroy() {
        cancelAnimationFrame(this.animFrame);
        window.removeEventListener('keyup', this._handleKeyUp);
    }
}
