// Records for Asia drafted thin: 14 countries, 7 of them since promoted to standard
// fidelity with a researched agenda, red line and alignment, 7 still thin.
//
// Drafted by scripts/draft-nation-records.mjs from the seed and the stated
// priors in scripts/lib/nation-roster-priors.mjs, then left to the content
// room. Figures come from nation-figures.generated.ts; the temperament is a fit
// of the authored records' own traits against the governance indicators; a
// thin record authors no agenda or red line, and rolls its aims from its
// archetype's pool. A standard record authors two agendas, a red line whose id
// is one the engine's red-line rules read, and its alignment pull; its figures
// and temperament stay the bake's.
// prettier-ignore
export const asiaDrafts = [
    // Factbook: parliamentary republic
    {
        id: "KGZ", playable: false, fidelity: "standard",
        identity: { name: "Kyrgyzstan", adjective: "Kyrgyz", capital: "Bishkek", government: "charter-presidential-republic", languages: ["Kyrgyz", "Uzbek"], currency: "KGS" },
        geo: { region: "region-central-asia", lat: 42.87, lon: 74.6, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.35, drought: 0.3, flood: 0.15 } },
        traits: { aggression: 0.3, opportunism: 0.42, legalism: 0.4, isolationism: 0.36, riskTolerance: 0.43, vengefulness: 0.33, reliability: 0.41, transparency: 0.27, agendas: [{ id: "patron-management", description: "Keep Russia's patronage and its migrants' remittances", weight: 0.6 }, { id: "border-settlement", description: "Hold the 2025 border settlement with Tajikistan", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "border-integrity", description: "Its border as settled with Tajikistan is final." }], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "TJK", playable: false, fidelity: "thin",
        identity: { name: "Tajikistan", adjective: "Tajik", capital: "Dushanbe", government: "charter-presidential-republic", languages: ["Tajik", "Russian"], currency: "TJS" },
        geo: { region: "region-central-asia", lat: 38.55, lon: 68.77, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.35, drought: 0.3, flood: 0.15 } },
        traits: { aggression: 0.31, opportunism: 0.46, legalism: 0.34, isolationism: 0.45, riskTolerance: 0.41, vengefulness: 0.36, reliability: 0.4, transparency: 0.15, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "TKM", playable: false, fidelity: "thin",
        identity: { name: "Turkmenistan", adjective: "Turkmen", capital: "Ashgabat", government: "charter-presidential-republic", languages: ["Turkmen", "Russian"], currency: "TMT" },
        geo: { region: "region-central-asia", lat: 37.95, lon: 58.38, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.35, drought: 0.3, flood: 0.15 } },
        traits: { aggression: 0.31, opportunism: 0.47, legalism: 0.29, isolationism: 0.43, riskTolerance: 0.39, vengefulness: 0.37, reliability: 0.36, transparency: 0.09, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "UZB", playable: false, fidelity: "standard",
        identity: { name: "Uzbekistan", adjective: "Uzbek", capital: "Tashkent", government: "charter-presidential-republic", languages: ["Uzbek", "Russian"], currency: "UZS" },
        geo: { region: "region-central-asia", lat: 41.32, lon: 69.25, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.35, drought: 0.3, flood: 0.15 } },
        traits: { aggression: 0.28, opportunism: 0.44, legalism: 0.41, isolationism: 0.35, riskTolerance: 0.39, vengefulness: 0.33, reliability: 0.46, transparency: 0.25, agendas: [{ id: "reform-growth", description: "Open its economy and attract investment after decades of isolation", weight: 0.6 }, { id: "multi-vector-diplomacy", description: "Balance Russia, China and the West", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "non-alignment", description: "It joins no military bloc." }], alignmentPull: [] },
    },
    // Factbook: semi-presidential republic
    {
        id: "MNG", playable: false, fidelity: "standard",
        identity: { name: "Mongolia", adjective: "Mongolian", capital: "Ulaanbaatar", government: "charter-parliamentary-republic", languages: ["Mongolian"], currency: "MNT" },
        geo: { region: "region-east-asia", lat: 47.92, lon: 106.92, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.25, earthquake: 0.15 } },
        traits: { aggression: 0.23, opportunism: 0.4, legalism: 0.52, isolationism: 0.34, riskTolerance: 0.37, vengefulness: 0.25, reliability: 0.5, transparency: 0.43, agendas: [{ id: "third-neighbor-partnership", description: "Build ties with a third neighbor beyond Russia and China", weight: 0.6 }, { id: "mineral-export-growth", description: "Sell its copper and coal without depending on China", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "sovereign-neutrality", description: "It joins no bloc aimed at either neighbor." }], alignmentPull: [] },
    },
    // Factbook: constitutional monarchy
    {
        id: "BTN", playable: false, fidelity: "thin",
        identity: { name: "Bhutan", adjective: "Bhutanese", capital: "Thimphu", government: "charter-parliamentary-republic", languages: ["Dzongkha"], currency: "BTN" },
        geo: { region: "region-south-asia", lat: 27.47, lon: 89.63, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.45, earthquake: 0.3, cyclone: 0.25 } },
        traits: { aggression: 0.2, opportunism: 0.42, legalism: 0.62, isolationism: 0.5, riskTolerance: 0.34, vengefulness: 0.21, reliability: 0.62, transparency: 0.53, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "MDV", playable: false, fidelity: "thin",
        identity: { name: "Maldives", adjective: "Maldivian", capital: "Male", government: "charter-presidential-republic", languages: ["Divehi", "English"], currency: "MVR", definiteArticle: true },
        geo: { region: "region-south-asia", lat: 4.17, lon: 73.5, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.45, earthquake: 0.3, cyclone: 0.25 } },
        traits: { aggression: 0.27, opportunism: 0.42, legalism: 0.51, isolationism: 0.38, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.52, transparency: 0.35, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: federal parliamentary republic
    {
        id: "NPL", playable: false, fidelity: "standard",
        identity: { name: "Nepal", adjective: "Nepali", capital: "Kathmandu", government: "charter-parliamentary-republic", languages: ["Nepali", "English"], currency: "NPR" },
        geo: { region: "region-south-asia", lat: 27.72, lon: 85.32, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.6, flood: 0.35 } },
        traits: { aggression: 0.26, opportunism: 0.4, legalism: 0.49, isolationism: 0.42, riskTolerance: 0.41, vengefulness: 0.29, reliability: 0.46, transparency: 0.39, agendas: [{ id: "nonalignment", description: "Stay between India and China", weight: 0.7 }, { id: "hydro-export", description: "Sell its hydropower to India", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "border-integrity", description: "Kalapani and Lipulekh are Nepali territory." }], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "LKA", playable: false, fidelity: "standard",
        identity: { name: "Sri Lanka", adjective: "Sri Lankan", capital: "Colombo", government: "charter-presidential-republic", languages: ["Sinhala", "Tamil"], currency: "LKR" },
        geo: { region: "region-south-asia", lat: 6.92, lon: 79.83, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.45, earthquake: 0.3, cyclone: 0.25 } },
        traits: { aggression: 0.27, opportunism: 0.41, legalism: 0.5, isolationism: 0.37, riskTolerance: 0.41, vengefulness: 0.29, reliability: 0.49, transparency: 0.39, agendas: [{ id: "debt-restructuring", description: "Finish restructuring its debt after the 2022 default", weight: 0.8 }, { id: "multi-vector-diplomacy", description: "Balance India and China over its ports", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "sovereign-neutrality", description: "No foreign military base, Indian or Chinese." }], alignmentPull: [] },
    },
    // Factbook: absolute monarchy or sultanate
    {
        id: "BRN", playable: false, fidelity: "thin",
        identity: { name: "Brunei", adjective: "Bruneian", capital: "Bandar Seri Begawan", government: "charter-absolute-monarchy", languages: ["Malay", "English"], currency: "BND" },
        geo: { region: "region-southeast-asia", lat: 4.88, lon: 114.93, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.45, cyclone: 0.35, earthquake: 0.25 } },
        traits: { aggression: 0.25, opportunism: 0.46, legalism: 0.55, isolationism: 0.37, riskTolerance: 0.35, vengefulness: 0.27, reliability: 0.61, transparency: 0.35, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary constitutional monarchy
    {
        id: "KHM", playable: false, fidelity: "standard",
        identity: { name: "Cambodia", adjective: "Cambodian", capital: "Phnom Penh", government: "charter-parliamentary-republic", languages: ["Khmer"], currency: "KHR" },
        geo: { region: "region-southeast-asia", lat: 11.55, lon: 104.92, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.45, cyclone: 0.35, earthquake: 0.25 } },
        traits: { aggression: 0.3, opportunism: 0.46, legalism: 0.35, isolationism: 0.3, riskTolerance: 0.39, vengefulness: 0.35, reliability: 0.42, transparency: 0.14, agendas: [{ id: "regime-succession-management", description: "Hand power from the founding strongman to his son without a rupture", weight: 0.6 }, { id: "infrastructure-growth", description: "Build its Mekong canal and Chinese-financed infrastructure", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "border-integrity", description: "Its border temples and villages with Thailand are its own." }], alignmentPull: ["CHN"] },
    },
    // Factbook: communist party-led state
    {
        id: "LAO", playable: false, fidelity: "thin",
        identity: { name: "Laos", adjective: "Lao", capital: "Vientiane", government: "charter-parliamentary-republic", languages: ["Lao"], currency: "LAK" },
        geo: { region: "region-southeast-asia", lat: 17.97, lon: 102.6, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.45, cyclone: 0.35, earthquake: 0.25 } },
        traits: { aggression: 0.26, opportunism: 0.45, legalism: 0.39, isolationism: 0.43, riskTolerance: 0.36, vengefulness: 0.33, reliability: 0.44, transparency: 0.18, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: military regime
    {
        id: "MMR", playable: false, fidelity: "standard",
        identity: { name: "Myanmar", adjective: "Burmese", capital: "Naypyidaw", government: "charter-military-junta", languages: ["Burmese"], currency: "MMK" },
        geo: { region: "region-southeast-asia", lat: 19.76, lon: 96.07, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.45, cyclone: 0.35, earthquake: 0.25 } },
        traits: { aggression: 0.44, opportunism: 0.47, legalism: 0.25, isolationism: 0.36, riskTolerance: 0.53, vengefulness: 0.45, reliability: 0.3, transparency: 0.08, agendas: [{ id: "regime-security", description: "Hold power against the armed resistance that followed the 2021 coup", weight: 0.9 }, { id: "territorial-control", description: "Win back the border regions the ethnic armies took", weight: 0.7 }] },
        doctrine: { posture: "assertive", redLines: [{ id: "non-intervention", description: "No foreign force or foreign-backed army on its soil." }], alignmentPull: ["CHN", "RUS"] },
    },
    // Factbook: semi-presidential republic
    {
        id: "TLS", playable: false, fidelity: "thin",
        identity: { name: "Timor-Leste", adjective: "Timorese", capital: "Dili", government: "charter-presidential-republic", languages: ["Tetum", "Portuguese"], currency: "USD" },
        geo: { region: "region-southeast-asia", lat: -8.58, lon: 125.6, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.45, cyclone: 0.35, earthquake: 0.25 } },
        traits: { aggression: 0.23, opportunism: 0.39, legalism: 0.48, isolationism: 0.51, riskTolerance: 0.38, vengefulness: 0.24, reliability: 0.43, transparency: 0.46, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
];
