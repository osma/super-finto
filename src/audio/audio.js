/*
  Copyright 2020 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
import { fill, rnd } from './utils.js';

const A3Frequency = 440;
const A0Frequency = A3Frequency / 8;

function Audio(ctx, destination = ctx.destination) {
    function oscillatorNode(type, freq = 440) {
        const node = ctx.createOscillator();
        node.type = type;
        node.frequency.value = freq;
        return node;
    }

    function waveShaperNode(curve) {
        const node = ctx.createWaveShaper();
        node.curve = new Float32Array(curve);
        return node;
    }

    function gainNode(gainAmount = 0) {
        const node = ctx.createGain();
        node.gain.value = gainAmount;
        return node;
    }

    function stereoPannerNode(pan) {
        if (ctx.createStereoPanner) {
            const node = ctx.createStereoPanner();
            node.pan.value = pan;
            return node;
        } else {
            const node = ctx.createPanner();
            node.panningModel = "equalpower";
            node.setPosition(pan, 0, 0.5);
            node.pan = node.positionX;
            return node;
        }
    }

    function SquareSynth(pan = 0) {
        const set = (a, v) => { a.cancelScheduledValues(ctx.currentTime); a.setValueAtTime(isFinite(v) ? v : 0, ctx.currentTime); };
        const towards = (a, v, t) => { a.setTargetAtTime(isFinite(v) ? v : 0, ctx.currentTime, Math.max(0.01, isFinite(t) ? t : 0.01)); };
        const slide = (a, v, t) => { a.cancelScheduledValues(ctx.currentTime); a.setTargetAtTime(isFinite(v) ? v : 0, ctx.currentTime, Math.max(0.01, isFinite(t) ? t : 0.01)); };

        const wavetableTrigger = oscillatorNode("sawtooth");
        const pulseWavetable = waveShaperNode(new Float32Array(256).fill(-1, 0, 128).fill(1, 128, 256));
        const alwaysOneWavetable = waveShaperNode(new Float32Array(2).fill(1, 0, 2));
        const wavetableOffsetGain = gainNode();
        const pulseOutputGain = gainNode();
        const outputPanner = stereoPannerNode(pan);

        wavetableTrigger.start();
        wavetableTrigger.connect(pulseWavetable);
        wavetableTrigger.connect(alwaysOneWavetable);
        alwaysOneWavetable.connect(wavetableOffsetGain);
        wavetableOffsetGain.connect(pulseWavetable);
        pulseWavetable.connect(pulseOutputGain);
        pulseOutputGain.connect(outputPanner);
        outputPanner.connect(destination);

        const freq = wavetableTrigger.frequency;
        const width = wavetableOffsetGain.gain;
        const gain = pulseOutputGain.gain;

        const decay = 0.04, sustain = 0.7, release = 0.01, level = 0.1;

        function noteOn(note, glide = 0) {
            const glideTime = glide / 10;
            slide(freq, A0Frequency * 2 ** (note / 12), glideTime);
            set(gain, level);
            towards(gain, level * sustain, decay);
        }

        function noteOff() {
            slide(gain, 0, release);
        }

        function play(note) {
            if (note.note === "---") {
                noteOff();
            } else if (note.note === 'cont') {
                // do nothing
            } else {
                noteOn(note.note, note.fx?.glide);
            }
            set(width, note.fx?.pulseWidth ?? 0.0);
        }

        return { play };
    }

    function DrumSynth() {
        const toneOscillator = oscillatorNode("square", 55);
        const toneGain = gainNode();
        const noiseWavetableTrigger = oscillatorNode("sawtooth", 20);
        const noiseWavetable = waveShaperNode(fill(1024, x => rnd() * 2 - 1));
        const noiseGain = gainNode();
        const noisePan = stereoPannerNode(0);

        toneOscillator.start();
        noiseWavetableTrigger.start();

        toneOscillator.connect(toneGain);
        toneGain.connect(destination);

        noiseWavetableTrigger.connect(noiseWavetable);
        noiseWavetable.connect(noiseGain);
        noiseGain.connect(noisePan);
        noisePan.connect(destination);

        function play(slot) {
            const vel = slot.vel ? slot.vel : 1;
            if (slot.drum === 'KCK') {
                toneOscillator.detune.cancelScheduledValues(ctx.currentTime);
                toneOscillator.detune.setValueAtTime(3000, ctx.currentTime);
                toneOscillator.detune.setTargetAtTime(0, ctx.currentTime, 0.07);
                toneGain.gain.cancelScheduledValues(ctx.currentTime);
                if (toneGain.gain.cancelAndHoldAtTime) toneGain.gain.cancelAndHoldAtTime(ctx.currentTime);
                toneGain.gain.setValueAtTime(0.2 * vel, ctx.currentTime);
                toneGain.gain.linearRampToValueAtTime(0.2 * vel, ctx.currentTime + 0.025);
                toneGain.gain.linearRampToValueAtTime(0.13 * vel, ctx.currentTime + 0.050);
                toneGain.gain.linearRampToValueAtTime(0.05 * vel, ctx.currentTime + 0.075);
                toneGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.10);
            } else if (slot.drum === 'NSS') {
                noiseGain.gain.cancelScheduledValues(ctx.currentTime);
                if (noiseGain.gain.cancelAndHoldAtTime) noiseGain.gain.cancelAndHoldAtTime(ctx.currentTime);
                noiseGain.gain.setValueAtTime(0.1 * vel, ctx.currentTime);
                noiseGain.gain.linearRampToValueAtTime(0.04 * vel, ctx.currentTime + 0.04);
                noiseGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.08);

                // Ugly workaround for safari being a bitch
                if ("pan" in noisePan) {
                    noisePan.pan.cancelScheduledValues(ctx.currentTime);
                    noisePan.pan.setValueAtTime(rnd() * 0.4 - 0.2, ctx.currentTime);
                }
            } else if (slot.drum === 'SNR') {
                toneOscillator.detune.cancelScheduledValues(ctx.currentTime);
                toneOscillator.detune.setValueAtTime(2400, ctx.currentTime);
                toneOscillator.detune.setTargetAtTime(600, ctx.currentTime, 0.04);
                toneGain.gain.cancelScheduledValues(ctx.currentTime);
                if (toneGain.gain.cancelAndHoldAtTime) toneGain.gain.cancelAndHoldAtTime(ctx.currentTime);
                toneGain.gain.setValueAtTime(0.15 * vel, ctx.currentTime);
                toneGain.gain.linearRampToValueAtTime(0.05 * vel, ctx.currentTime + 0.033);
                toneGain.gain.linearRampToValueAtTime(0.01 * vel, ctx.currentTime + 0.066);
                toneGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.10);
                noiseGain.gain.cancelScheduledValues(ctx.currentTime);
                if (noiseGain.gain.cancelAndHoldAtTime) noiseGain.gain.cancelAndHoldAtTime(ctx.currentTime);
                noiseGain.gain.setValueAtTime(0.2 * vel, ctx.currentTime);
                noiseGain.gain.linearRampToValueAtTime(0.15 * vel, ctx.currentTime + 0.075);
                noiseGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.15);
            }
        }

        return { play };
    }

    return {
        SquareSynth,
        DrumSynth
    };
}

export default Audio;
