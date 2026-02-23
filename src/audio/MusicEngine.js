/*
  Copyright 2020 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/

import Audio from "./audio.js";
import * as music from './theory.js';
import * as Generators from './generators.js';
import { choose, rnd, seedRNG, rndInt } from './utils.js';

const PatternSize = 64;

const progressions = [
    [1, 1, 1, 1, 6, 6, 6, 6, 4, 4, 4, 4, 3, 3, 5, 5],
    [1, 1, 1, 1, 6, 6, 6, 6, 1, 1, 1, 1, 6, 6, 6, 6],
    [4, 4, 4, 4, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1, 3, 3],
    [1, 1, 6, 6, 4, 4, 5, 5, 1, 1, 6, 6, 3, 3, 5, 5],
    [5, 5, 4, 4, 1, 1, 1, 1, 5, 5, 6, 6, 1, 1, 1, 1],
    [6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 5, 5, 5, 5],
    [1, 1, 1, 1, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5],
    [6, 6, 6, 6, 4, 4, 4, 4, 1, 1, 1, 1, 1, 1, 5, 5],
    [1, 1, 1, 1, 1, 1, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4]
];

function hex(v) { return Math.floor(v).toString(16).toUpperCase().padStart(2, '0'); }

function createSeedCode() {
    return hex(rndInt(255)) + hex(rndInt(255)) + hex(rndInt(255)) + hex(rndInt(255));
}

// Simple BPM clock replaced with requestAnimationFrame-friendly approach
// or keeping the setInterval approach but managed within the class
function bpmClock() {
    let intervalHandle = {
        bpmClock: 0
    };
    let fN = 0;
    function set(bpm, frameFunction) {
        window.clearInterval(intervalHandle.bpmClock);
        intervalHandle.bpmClock = window.setInterval(() => frameFunction(fN++), (60000 / bpm) / 4);
    }
    function stop() {
        window.clearInterval(intervalHandle.bpmClock);
    }
    return {
        set,
        stop
    }
}

export class MusicEngine {
    constructor() {
        this.ctx = null;
        this.au = null;
        this.synths = [];
        this.patterns = [[], [], [], [], []];
        this.clock = bpmClock();
        this.state = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.masterGain = null;
    }

    init(seed, profile = null, complexity = 0) {
        this.profile = profile;
        this.complexity = complexity; // 0 to 1 normally, can be higher
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Master Gain for Volume/Mute
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5; // Default volume
            this.masterGain.connect(this.ctx.destination);

            this.au = Audio(this.ctx, this.masterGain);
            this.synths = [
                this.au.SquareSynth(),
                this.au.SquareSynth(-0.5),
                this.au.SquareSynth(),
                this.au.SquareSynth(0.5),
                this.au.DrumSynth()
            ];
        }

        const initialSeed = seed || Math.random().toString();
        this.createInitialState(initialSeed);
        this.newPatterns();
    }

    createInitialState(seed) {
        seedRNG(seed);

        let bpm = 112;
        if (this.profile && this.profile.bpmRange) {
            const [min, max] = this.profile.bpmRange;
            bpm = Math.floor(rnd() * (max - min)) + min;
        }

        // Apply complexity to BPM: +10% for full complexity
        bpm = Math.floor(bpm * (1.0 + this.complexity * 0.2));

        let scale = music.scales.minor;
        if (this.profile && this.profile.scales) {
            const scaleName = choose(this.profile.scales);
            scale = music.scales[scaleName] || music.scales.minor;
        }

        this.state = {
            key: rndInt(12),
            scale: scale,
            progression: progressions[0],
            bpm: bpm,
            seedCode: createSeedCode(),
            songIndex: 0
        };
    }

    mutateState() {
        this.state.songIndex++;
        if (this.state.songIndex % 8 === 0) {
            if (this.profile && this.profile.bpmRange) {
                const [min, max] = this.profile.bpmRange;
                this.state.bpm = Math.floor(rnd() * (max - min)) + min;
            } else {
                this.state.bpm = Math.floor(rnd() * 80) + 100;
            }
        }
        if (this.state.songIndex % 4 === 0) {
            let [newKey, newScale] = music.modulate(this.state.key, this.state.scale);
            if (this.profile && this.profile.scales) {
                const scaleName = choose(this.profile.scales);
                newScale = music.scales[scaleName] || music.scales.minor;
            }
            this.state.key = newKey;
            this.state.scale = newScale;
        }
        if (this.state.songIndex % 2 === 0) {
            this.state.progression = choose(progressions);
        }
        this.state.seedCode = hex(rndInt(255)) + hex(rndInt(255)) + hex(rndInt(255)) + hex(rndInt(255));
        seedRNG(this.state.seedCode);
    }

    newPatterns() {
        seedRNG(this.state.seedCode);

        const getGen = (type) => {
            if (this.profile && this.profile.preferredGenerators) {
                if (rnd() < 0.8) {
                    const pref = choose(this.profile.preferredGenerators);
                    if (Generators[pref]) return Generators[pref];
                }
            }

            // Complexity affects chance of a generator being non-empty
            const baseChance = 0.6 + (this.complexity * 0.4);

            if (type === 'bass') return choose([Generators.bass, Generators.bass2, Generators.emptyNote]);
            if (type === 'arp') return rnd() < baseChance ? Generators.arp : Generators.emptyNote;
            if (type === 'melody') return rnd() < baseChance ? Generators.melody1 : Generators.emptyNote;
            if (type === 'extra') return choose([Generators.emptyNote, Generators.arp, Generators.melody1]);
            if (type === 'drum') return rnd() < (baseChance + 0.1) ? Generators.drum : Generators.emptyDrum;
            return Generators.emptyNote;
        };

        this.patterns = [
            getGen('bass')(this.state),
            getGen('arp')(this.state),
            getGen('melody')(this.state),
            getGen('extra')(this.state),
            getGen('drum')(this.state),
        ];
    }

    frame(f) {
        if (!this.isPlaying) return;

        const positionInPattern = f % PatternSize;
        if (f % 128 === 0 && f !== 0) {
            this.mutateState();
            this.newPatterns();
            this.clock.set(this.state.bpm, (f) => this.frame(f));
        }

        // Play notes
        this.synths[0].play(this.patterns[0][positionInPattern]);
        this.synths[1].play(this.patterns[1][positionInPattern]);
        this.synths[2].play(this.patterns[2][positionInPattern]);
        this.synths[3].play(this.patterns[3][positionInPattern]);
        this.synths[4].play(this.patterns[4][positionInPattern]);
    }

    start() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Cancel any pending fade-out stops
        if (this._fadeTimeout) {
            clearTimeout(this._fadeTimeout);
            this._fadeTimeout = null;
        }

        // Restore gain (un-mute if muted, undo any fade)
        if (!this.isMuted) {
            this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.masterGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.1);
        }
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.clock.set(this.state.bpm, (f) => this.frame(f));
        } else {
            // Already playing — restart clock with fresh patterns for new level
            this.clock.stop();
            this.clock.set(this.state.bpm, (f) => this.frame(f));
        }
    }

    stop() {
        // Stops the clock and silences gain but does NOT suspend the AudioContext.
        // This avoids the stuck-note bug caused by interleaving suspend() and resume().
        this.isPlaying = false;
        this.clock.stop();
        if (this.ctx && this.masterGain) {
            this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        }
    }

    /**
     * Fade the music out over `duration` seconds, then stop the clock.
     * Used during level transitions so the old track fades gracefully.
     */
    fadeOut(duration = 1.0) {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.setTargetAtTime(0, t, duration / 4);

        // Cancel any existing fade timeout
        if (this._fadeTimeout) clearTimeout(this._fadeTimeout);

        // Stop the clock after the fade completes
        this._fadeTimeout = setTimeout(() => {
            this.isPlaying = false;
            this.clock.stop();
            this._fadeTimeout = null;
        }, duration * 1000);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ctx && this.masterGain) {
            const t = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(t);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
            if (this.isMuted) {
                this.masterGain.gain.linearRampToValueAtTime(0, t + 0.15);
            } else {
                this.masterGain.gain.linearRampToValueAtTime(0.5, t + 0.15);
            }
        }
        return this.isMuted;
    }
}
