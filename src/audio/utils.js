/*
  Copyright 2020 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/

function fill(count, fn) {
    return new Array(count).fill(undefined).map((x, i) => fn(i));
}

function choose(array) {
    return array[Math.floor(rnd() * array.length)];
}

function rndInt(max) {
    return Math.floor(rnd() * max);
}

// Source: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript/47593316#47593316

function sfc32(a, b, c, d) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

function xmur3(str) {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
            h = h << 13 | h >>> 19;
    return function () {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

let randomFunction = Math.random;

function rnd() {
    return randomFunction();
}

function seedRNG(seed) {
    const seedHasher = xmur3(seed);
    randomFunction = sfc32(seedHasher(), seedHasher(), seedHasher(), seedHasher());
}

export { fill, choose, rndInt, rnd, seedRNG };
