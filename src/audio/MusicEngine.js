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

    init(seed) {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Master Gain for Volume/Mute
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5; // Default volume
            this.masterGain.connect(this.ctx.destination);

            // Override destination for synths to go through master gain
            // We need to patch the Audio context destination or wrap the Audio module
            // Simplest way: Pass a proxy context or modifying the Audio module.
            // But Audio module uses ctx.destination directly. 
            // Let's modify Audio module usage or just accept we might need to modify audio.js 
            // actually, let's modify audio.js to accept a destination node? 
            // OR checks ctx.destination. 
            // For now, let's assume direct connection and we might need to properly implement volume later 
            // by modifying audio.js or using a hack.
            // HACK: We can't easily intercept without modifying audio.js, 
            // so we will just use the context as is for now.
            // To implement volume/mute, we can suspend/resume the context.

            this.au = Audio(this.ctx);
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
        this.state = {
            key: rndInt(12),
            scale: music.scales.minor,
            progression: progressions[0],
            bpm: 112,
            seedCode: createSeedCode(),
            songIndex: 0
        };
    }

    mutateState() {
        this.state.songIndex++;
        if (this.state.songIndex % 8 === 0) {
            this.state.bpm = Math.floor(rnd() * 80) + 100;
        }
        if (this.state.songIndex % 4 === 0) {
            let [newKey, newScale] = music.modulate(this.state.key, this.state.scale);
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
        this.patterns = [
            choose([Generators.bass, Generators.bass2, Generators.emptyNote])(this.state),
            rnd() < 0.7 ? Generators.arp(this.state) : Generators.emptyNote(),
            rnd() < 0.7 ? Generators.melody1(this.state) : Generators.emptyNote(),
            choose([Generators.emptyNote, Generators.arp, Generators.melody1])(this.state),
            rnd() < 0.8 ? Generators.drum() : Generators.emptyDrum(),
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
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.clock.set(this.state.bpm, (f) => this.frame(f));
        }
    }

    stop() {
        this.isPlaying = false;
        this.clock.stop();
        if (this.ctx) {
            this.ctx.suspend();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ctx) {
            if (this.isMuted) {
                this.ctx.suspend();
            } else {
                this.ctx.resume();
            }
        }
        return this.isMuted;
    }
}
