// SFXEngine.js
// Handles NES-style 8-bit sound effects using the Web Audio API

export class SFXEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5; // Balance SFX volume
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    _playTone(freq, type, duration, slideToFreq = null) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; // 'square', 'triangle', etc.
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        if (slideToFreq !== null) {
            osc.frequency.exponentialRampToValueAtTime(slideToFreq, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    _playNoise(duration, type = 'white') {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // White noise
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter to make it sound more like NES noise
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = type === 'short' ? 8000 : 1000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
    }

    playJump() {
        // Short ascending square wave
        this._playTone(300, 'square', 0.15, 600);
    }

    playGlide() {
        // High pitched short fluttering noise
        this._playNoise(0.05, 'short');
    }

    playPipe() {
        // Classic SMB "chirp chirp chirp" descending slide sequence
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        // The famous SMB pipe/shrink sound is a rapidly repeating descending slide
        for (let i = 0; i < 6; i++) {
            const startTime = t + i * 0.07;
            const endTime = startTime + 0.06;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';

            // Rapidly descending pitch for each "chirp"
            osc.frequency.setValueAtTime(880, startTime);
            osc.frequency.exponentialRampToValueAtTime(300, endTime);

            gain.gain.setValueAtTime(0.5, startTime);
            // Sharp cutoff at the end of the chirp
            gain.gain.linearRampToValueAtTime(0.01, endTime);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(endTime);
        }
    }

    playCoin() {
        // Bling! Quick two-note high pitched square wave
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';

        osc.frequency.setValueAtTime(987.77, t); // B5
        osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    playStomp() {
        // Crunchy short noise + descending tone
        if (!this.ctx) return;
        this._playNoise(0.1, 'short');
        this._playTone(400, 'square', 0.15, 100);
    }

    playLeaf() {
        // Fast ascending arpeggio
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.5, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.1);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.1);
        });
    }

    playGrow() {
        // Fast trill
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';

        for (let i = 0; i < 6; i++) {
            osc.frequency.setValueAtTime(400 + i * 100, t + i * 0.1);
            osc.frequency.setValueAtTime(600 + i * 100, t + i * 0.1 + 0.05);
        }

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.6);
    }

    playShrink() {
        // In Super Mario Bros, the Shrinking sound and the Pipe sound are famously exactly the same sequence!
        this.playPipe();
    }

    playDeath() {
        // C - A - F - D descending
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const freqs = [523.25, 440.00, 349.23, 293.66]; // C5, A4, F4, D4

        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(1.0, t + i * 0.2);
            gain.gain.linearRampToValueAtTime(0, t + (i + 1) * 0.2);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t + i * 0.2);
            osc.stop(t + (i + 1) * 0.2);
        });
    }

    playGameOver() {
        // Somber melody
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const freqs = [392.00, 329.63, 261.63, 196.00]; // G4, E4, C4, G3

        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(1.0, t + i * 0.4);
            gain.gain.linearRampToValueAtTime(0, t + (i + 1) * 0.4 + 0.2);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t + i * 0.4);
            osc.stop(t + (i + 1) * 0.4 + 0.2);
        });
    }

    playCrush() {
        // Short crunchy noise for breaking bricks - making it more prominent
        if (!this.ctx) return;
        this._playNoise(0.15, 'short'); // High snap
        this._playTone(200, 'square', 0.1, 50); // Low thud
    }

    playExtraLife() {
        // Happy ascending melody: C5-E5-G5-C6 (slower and longer)
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.5, t + i * 0.15); // Slower tempo
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.3); // Longer decay

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.3);
        });
    }
}
