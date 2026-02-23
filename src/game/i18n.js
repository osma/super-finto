/**
 * Localization strings for Super Finto.
 * Supported language codes: 'en', 'fi', 'sv', 'se' (Northern Sami)
 */

const STRINGS = {
    en: {
        score: 'SCORE',
        concept: 'CONCEPT',
        lives: (n) => `FINTO x ${n}`,
        leaves: (n) => `LEAVES: ${n}`,
        gameOver: 'GAME OVER',
        pressRestart: 'Press SPACE to Restart',
        transitionLives: (n) => `FINTO x ${n}`,
        paused: 'PAUSED',
    },
    fi: {
        score: 'PISTEET',
        concept: 'KÄSITE',
        lives: (n) => `FINTO x ${n}`,
        leaves: (n) => `LEHDET: ${n}`,
        gameOver: 'PELI OHI',
        pressRestart: 'Paina VÄLILYÖNTIÄ',
        transitionLives: (n) => `FINTO x ${n}`,
        paused: 'TAUKO',
    },
    sv: {
        score: 'POÄNG',
        concept: 'BEGREPP',
        lives: (n) => `FINTO x ${n}`,
        leaves: (n) => `LÖV: ${n}`,
        gameOver: 'SPEL SLUT',
        pressRestart: 'Tryck MELLANSLAG',
        transitionLives: (n) => `FINTO x ${n}`,
        paused: 'PAUS',
    },
    se: {
        score: 'ČOAKKÁ',
        concept: 'DOABA',
        lives: (n) => `FINTO x ${n}`,
        leaves: (n) => `LASTTAT: ${n}`,
        gameOver: 'SPEALLU NOHKÁ',
        pressRestart: 'Bija GASKABÁIKI',
        transitionLives: (n) => `FINTO x ${n}`,
        paused: 'PÁVSSA',
    },
};

/**
 * Returns the strings object for the given language code.
 * Falls back to 'en' if unknown.
 */
export function getLang(lang) {
    return STRINGS[lang] || STRINGS['en'];
}

/**
 * Returns the best label from a raw concept data object for the given language.
 * Falls back through the language chain: requested → fi → sv → en → uri
 */
export function getLabel(conceptData, lang) {
    if (!conceptData) return '-';
    const order = [lang, 'fi', 'sv', 'en'].filter((v, i, a) => a.indexOf(v) === i);
    const keyMap = { en: 'label_en', fi: 'label_fi', sv: 'label_sv', se: 'label_se' };
    for (const l of order) {
        const key = keyMap[l];
        if (key && conceptData[key]) return conceptData[key];
    }
    return '-';
}

/**
 * Returns the best label from a loaded concept object (already processed by Game.loadConcept)
 * This works on concept objects that have label_fi, label_sv, label_en properties.
 */
export function getConceptLabel(concept, lang) {
    if (!concept) return '-';
    const order = [lang, 'fi', 'sv', 'en'].filter((v, i, a) => a.indexOf(v) === i);
    for (const l of order) {
        const val = concept[`label_${l}`];
        if (val && val !== '-') return val;
    }
    return '-';
}
