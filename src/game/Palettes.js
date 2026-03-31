
export const PALETTES = {
    ElectricNeon: {
        name: "Electric Neon",
        background: '#020617',
        brick: { base: '#ec255a', dark: '#9d174d', highlight: '#fbcfe8', mortar: '#67e8f9' },
        solid: { base: '#1e1b4b', dark: '#111827', highlight: '#4338ca' },
        question: { base: '#facc15', dark: '#a16207', highlight: '#fef3c7' },
        pipe: { base: '#06b6d4', dark: '#0891b2', highlight: '#cffafe' },
        ground: { base: '#1e293b', dark: '#6366f1' },
        soil: '#0f172a',
        enemy: { body: '#a3e635', feet: '#365314', eyes: 'white', brows: 'black' },
        player: {
            skin: '#f5d0a9', tunic: '#db2777', belt: '#22d3ee', hair: '#14b8a6', boots: '#f0abfc', outline: '#4c0519', highlight: '#f472b6', eyeWhite: '#ffffff'
        },
        coin: '#ffff00',
        parcel: { body: '#e0f2fe', border: '#7dd3fc' },
        music: {
            bpmRange: [120, 140],
            scales: ['minor'],
            preferredGenerators: ['arp', 'bass2', 'melody1']
        }
    },
    EarthyForest: {
        name: "Earthy Forest",
        background: '#064e3b',
        brick: { base: '#854d0e', dark: '#451a03', highlight: '#a8a29e', mortar: '#4ade80' },
        solid: { base: '#3f6212', dark: '#14532d', highlight: '#65a30d' },
        question: { base: '#d97706', dark: '#92400e', highlight: '#fcd34d' },
        pipe: { base: '#15803d', dark: '#14532d', highlight: '#86efac' },
        ground: { base: '#3f3f46', dark: '#16a34a' },
        soil: '#27272a',
        enemy: { body: '#b91c1c', feet: '#450a0a', eyes: 'white', brows: 'black' },
        player: {
            skin: '#f5d0a9', tunic: '#166534', belt: '#854d0e', hair: '#57534e', boots: '#292524', outline: '#052e16', highlight: '#22c55e', eyeWhite: '#ffffff'
        },
        coin: '#fbbf24',
        parcel: { body: '#ecfdf5', border: '#6ee7b7' },
        music: {
            bpmRange: [90, 110],
            scales: ['major', 'minor'],
            preferredGenerators: ['bass', 'melody1']
        }
    },
    GoldenOpulence: {
        name: "Golden Opulence",
        background: '#450a0a',
        brick: { base: '#b91c1c', dark: '#7f1d1d', highlight: '#fecaca', mortar: '#fbbf24' },
        solid: { base: '#78350f', dark: '#451a03', highlight: '#d97706' },
        question: { base: '#fbbf24', dark: '#b45309', highlight: '#fef3c7' },
        pipe: { base: '#ca8a04', dark: '#854d0e', highlight: '#fde047' },
        ground: { base: '#92400e', dark: '#fbbf24' },
        soil: '#451a03',
        enemy: { body: '#9f1239', feet: '#4c0519', eyes: 'white', brows: 'black' },
        player: {
            skin: '#f5d0a9', tunic: '#991b1b', belt: '#f59e0b', hair: '#fcd34d', boots: '#78350f', outline: '#450a0a', highlight: '#ef4444', eyeWhite: '#ffffff'
        },
        coin: '#f59e0b',
        parcel: { body: '#fffbeb', border: '#fcd34d' },
        music: {
            bpmRange: [100, 120],
            scales: ['minor'],
            preferredGenerators: ['arp', 'bass']
        }
    },
    PastelSerenity: {
        name: "Pastel Serenity",
        background: '#f0f9ff',
        brick: { base: '#f9a8d4', dark: '#db2777', highlight: '#fbcfe8', mortar: '#cffafe' },
        solid: { base: '#93c5fd', dark: '#3b82f6', highlight: '#dbeafe' },
        question: { base: '#fcd34d', dark: '#f59e0b', highlight: '#fef3c7' },
        pipe: { base: '#6ee7b7', dark: '#10b981', highlight: '#d1fae5' },
        ground: { base: '#cbd5e1', dark: '#475569' },
        soil: '#94a3b8',
        enemy: { body: '#a78bfa', feet: '#7c3aed', eyes: 'white', brows: 'black' },
        player: {
            skin: '#f5d0a9', tunic: '#60a5fa', belt: '#f472b6', hair: '#fcd34d', boots: '#fbcfe8', outline: '#1e3a8a', highlight: '#93c5fd', eyeWhite: '#ffffff'
        },
        coin: '#fde047',
        parcel: { body: '#f0f9ff', border: '#bae6fd' },
        music: {
            bpmRange: [70, 90],
            scales: ['major'],
            preferredGenerators: ['melody1']
        }
    },
    GothicStained: {
        name: "Gothic Stained",
        background: '#0f172a',
        brick: { base: '#4a044e', dark: '#2e0230', highlight: '#a21caf', mortar: '#1e293b' },
        solid: { base: '#1e1b4b', dark: '#0f0f2a', highlight: '#4338ca' },
        question: { base: '#b45309', dark: '#78350f', highlight: '#d97706' },
        pipe: { base: '#374151', dark: '#1f2937', highlight: '#9ca3af' },
        ground: { base: '#1e1b4b', dark: '#a21caf' },
        soil: '#0f0f2a',
        enemy: { body: '#581c87', feet: '#3b0764', eyes: '#fca5a5', brows: '#ffffff' },
        player: {
            skin: '#e5e5e5', tunic: '#312e81', belt: '#4c1d95', hair: '#171717', boots: '#000000', outline: '#000000', highlight: '#4338ca', eyeWhite: '#ef4444'
        },
        coin: '#94a3b8',
        parcel: { body: '#f8fafc', border: '#475569' },
        music: {
            bpmRange: [60, 80],
            scales: ['minor'],
            preferredGenerators: ['bass', 'melody1']
        }
    },
    IndustrialUrban: {
        name: "Industrial Urban",
        background: '#1c1917',
        brick: { base: '#57534e', dark: '#292524', highlight: '#a8a29e', mortar: '#000000' },
        solid: { base: '#44403c', dark: '#1c1917', highlight: '#78716c' },
        question: { base: '#ea580c', dark: '#9a3412', highlight: '#fb923c' },
        pipe: { base: '#71717a', dark: '#3f3f46', highlight: '#d4d4d8' },
        ground: { base: '#44403c', dark: '#a8a29e' },
        soil: '#292524',
        enemy: { body: '#7f1d1d', feet: '#450a0a', eyes: 'white', brows: 'black' },
        player: {
            skin: '#d6d3d1', tunic: '#ea580c', belt: '#57534e', hair: '#1c1917', boots: '#292524', outline: '#000000', highlight: '#f97316', eyeWhite: '#ffffff'
        },
        coin: '#fb923c',
        parcel: { body: '#e5e5e5', border: '#525252' },
        music: {
            bpmRange: [110, 130],
            scales: ['minor'],
            preferredGenerators: ['bass2', 'drum']
        }
    },
    RetroPop: {
        name: "Retro Pop",
        background: '#1e1b4b',
        brick: { base: '#3b82f6', dark: '#1d4ed8', highlight: '#93c5fd', mortar: '#f472b6' },
        solid: { base: '#f43f5e', dark: '#be123c', highlight: '#fda4af' },
        question: { base: '#eab308', dark: '#a16207', highlight: '#fef08a' },
        pipe: { base: '#facc15', dark: '#ca8a04', highlight: '#fef3c7' },
        ground: { base: '#be123c', dark: '#22d3ee' },
        soil: '#881337',
        enemy: { body: '#d946ef', feet: '#a21caf', eyes: '#ccfbf1', brows: '#1e3a8a' },
        player: {
            skin: '#f5d0a9', tunic: '#3b82f6', belt: '#f472b6', hair: '#fef08a', boots: '#ffffff', outline: '#000000', highlight: '#60a5fa', eyeWhite: '#ffffff'
        },
        coin: '#22d3ee',
        parcel: { body: '#fff', border: '#f472b6' },
        music: {
            bpmRange: [130, 150],
            scales: ['major'],
            preferredGenerators: ['arp', 'melody1', 'drum']
        }
    },
    TwilightNoir: {
        name: "Twilight Noir",
        background: '#0f172a',
        brick: { base: '#1e293b', dark: '#020617', highlight: '#3b82f6', mortar: '#000000' },
        solid: { base: '#0f172a', dark: '#020617', highlight: '#1e293b' },
        question: { base: '#475569', dark: '#1e293b', highlight: '#94a3b8' },
        pipe: { base: '#334155', dark: '#0f172a', highlight: '#64748b' },
        ground: { base: '#1e293b', dark: '#3b82f6' },
        soil: '#020617',
        enemy: { body: '#475569', feet: '#1e293b', eyes: '#bae6fd', brows: '#000000' },
        player: {
            skin: '#cbd5e1', tunic: '#312e81', belt: '#475569', hair: '#020617', boots: '#000000', outline: '#000000', highlight: '#3b82f6', eyeWhite: '#ffffff'
        },
        coin: '#94a3b8',
        parcel: { body: '#f1f5f9', border: '#334155' },
        music: {
            bpmRange: [70, 90],
            scales: ['minor'],
            preferredGenerators: ['bass', 'melody1']
        }
    }
};
