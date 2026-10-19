// Records for North Africa and the Middle East drafted thin: 10 countries, 9 of them since promoted to standard
// fidelity with a researched agenda, red line and alignment, 1 still thin.
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
export const menaDrafts = [
    // Factbook: constitutional monarchy
    {
        id: "BHR", playable: false, fidelity: "standard",
        identity: { name: "Bahrain", adjective: "Bahraini", capital: "Manama", government: "charter-absolute-monarchy", languages: ["Arabic", "English"], currency: "BHD" },
        geo: { region: "region-middle-east", lat: 26.23, lon: 50.57, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.2 } },
        traits: { aggression: 0.31, opportunism: 0.47, legalism: 0.48, isolationism: 0.29, riskTolerance: 0.42, vengefulness: 0.35, reliability: 0.57, transparency: 0.24, agendas: [{ id: "regime-security", description: "Keep the monarchy's hold over a Shia majority", weight: 0.7 }, { id: "alliance-normalization", description: "Deepen the Abraham Accords and its security pact with the United States", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "regime-security", description: "No Iranian hand in its Shia opposition." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary constitutional monarchy
    {
        id: "JOR", playable: false, fidelity: "standard",
        identity: { name: "Jordan", adjective: "Jordanian", capital: "Amman", government: "charter-absolute-monarchy", languages: ["Arabic", "English"], currency: "JOD" },
        geo: { region: "region-middle-east", lat: 31.95, lon: 35.93, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.2 } },
        traits: { aggression: 0.31, opportunism: 0.44, legalism: 0.51, isolationism: 0.37, riskTolerance: 0.43, vengefulness: 0.32, reliability: 0.55, transparency: 0.33, agendas: [{ id: "refugee-management", description: "Absorb its refugees without losing its balance", weight: 0.7 }, { id: "patron-alignment", description: "Keep the US aid that keeps its budget afloat", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "border-integrity", description: "No displacement of Palestinians across its border." }], alignmentPull: ["USA"] },
    },
    // Factbook: constitutional monarchy
    {
        id: "KWT", playable: false, fidelity: "standard",
        identity: { name: "Kuwait", adjective: "Kuwaiti", capital: "Kuwait City", government: "charter-absolute-monarchy", languages: ["Arabic", "English"], currency: "KWD" },
        geo: { region: "region-middle-east", lat: 29.37, lon: 47.97, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.2 } },
        traits: { aggression: 0.3, opportunism: 0.44, legalism: 0.52, isolationism: 0.29, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.56, transparency: 0.33, agendas: [{ id: "oil-revenue", description: "Protect the oil revenue that pays for its welfare state", weight: 0.7 }, { id: "regional-mediation", description: "Stay the Gulf's mediator between its neighbors", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "border-inviolability", description: "Never again an invasion like 1990." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary democratic republic
    {
        id: "LBN", playable: false, fidelity: "standard",
        identity: { name: "Lebanon", adjective: "Lebanese", capital: "Beirut", government: "charter-parliamentary-republic", languages: ["Arabic", "French"], currency: "LBP" },
        geo: { region: "region-middle-east", lat: 33.87, lon: 35.5, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.2 } },
        traits: { aggression: 0.33, opportunism: 0.42, legalism: 0.38, isolationism: 0.4, riskTolerance: 0.47, vengefulness: 0.36, reliability: 0.38, transparency: 0.27, agendas: [{ id: "reconstruction", description: "Rebuild after the 2024 war and the port explosion", weight: 0.7 }, { id: "monopoly-of-force", description: "Bring Hezbollah's weapons under the state", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-integrity", description: "Israeli forces leave its south." }], alignmentPull: [] },
    },
    // Factbook: absolute monarchy
    {
        id: "OMN", playable: false, fidelity: "standard",
        identity: { name: "Oman", adjective: "Omani", capital: "Muscat", government: "charter-absolute-monarchy", languages: ["Arabic", "English"], currency: "OMR" },
        geo: { region: "region-middle-east", lat: 23.62, lon: 58.58, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.2 } },
        traits: { aggression: 0.3, opportunism: 0.45, legalism: 0.53, isolationism: 0.29, riskTolerance: 0.39, vengefulness: 0.3, reliability: 0.59, transparency: 0.31, agendas: [{ id: "mediation", description: "Keep its channel between Washington and Tehran open", weight: 0.7 }, { id: "economic-diversification", description: "Diversify away from oil under its Vision 2040 plan", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "sea-lane-access", description: "The Strait of Hormuz stays open to shipping." }], alignmentPull: [] },
    },
    {
        id: "PSE", playable: false, fidelity: "standard",
        identity: { name: "Palestine", adjective: "Palestinian", capital: "Ramallah", government: "charter-presidential-republic", languages: ["Arabic"], currency: "ILS" },
        geo: { region: "region-middle-east", lat: 31.9, lon: 35.2, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.2 } },
        traits: { aggression: 0.36, opportunism: 0.45, legalism: 0.37, isolationism: 0.43, riskTolerance: 0.49, vengefulness: 0.4, reliability: 0.39, transparency: 0.21, agendas: [{ id: "recognition", description: "Win full UN membership and wider recognition", weight: 0.7 }, { id: "reconstruction", description: "Rebuild Gaza under Palestinian authority", weight: 0.8 }] },
        doctrine: { posture: "assertive", redLines: [{ id: "territorial-claims", description: "No annexation of the West Bank." }], alignmentPull: [] },
    },
    // Factbook: in transition
    {
        id: "LBY", playable: false, fidelity: "standard",
        identity: { name: "Libya", adjective: "Libyan", capital: "Tripoli", government: "charter-presidential-republic", languages: ["Arabic"], currency: "LYD" },
        geo: { region: "region-north-africa", lat: 32.88, lon: 13.17, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.15, flood: 0.1 } },
        traits: { aggression: 0.38, opportunism: 0.44, legalism: 0.3, isolationism: 0.31, riskTolerance: 0.5, vengefulness: 0.4, reliability: 0.32, transparency: 0.18, agendas: [{ id: "oil-revenue", description: "Keep the oil flowing and its revenue shared between rival governments", weight: 0.7 }, { id: "reunification", description: "Reunify the rival governments in Tripoli and Benghazi", weight: 0.5 }] },
        doctrine: { posture: "assertive", redLines: [{ id: "oil-sovereignty", description: "Its oil fields are not for foreign seizure." }], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "MRT", playable: false, fidelity: "thin",
        identity: { name: "Mauritania", adjective: "Mauritanian", capital: "Nouakchott", government: "charter-presidential-republic", languages: ["Arabic", "Fula"], currency: "MRU" },
        geo: { region: "region-north-africa", lat: 18.07, lon: -15.97, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.15, flood: 0.1 } },
        traits: { aggression: 0.31, opportunism: 0.43, legalism: 0.4, isolationism: 0.43, riskTolerance: 0.43, vengefulness: 0.34, reliability: 0.42, transparency: 0.26, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "SDN", playable: false, fidelity: "standard",
        identity: { name: "Sudan", adjective: "Sudanese", capital: "Khartoum", government: "charter-military-junta", languages: ["Arabic", "English"], currency: "SDG" },
        geo: { region: "region-north-africa", lat: 15.6, lon: 32.53, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.15, flood: 0.1 } },
        traits: { aggression: 0.37, opportunism: 0.46, legalism: 0.27, isolationism: 0.45, riskTolerance: 0.48, vengefulness: 0.44, reliability: 0.29, transparency: 0.1, agendas: [{ id: "territorial-control", description: "Win back Darfur and Khartoum from the Rapid Support Forces", weight: 0.9 }, { id: "patron-management", description: "Keep Egyptian, Turkish and Saudi backing for the army", weight: 0.5 }] },
        doctrine: { posture: "assertive", redLines: [{ id: "territorial-unity", description: "No partition of Sudan." }], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "TUN", playable: false, fidelity: "standard",
        identity: { name: "Tunisia", adjective: "Tunisian", capital: "Tunis", government: "charter-presidential-republic", languages: ["Arabic", "French"], currency: "TND" },
        geo: { region: "region-north-africa", lat: 36.8, lon: 10.18, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, earthquake: 0.15, flood: 0.1 } },
        traits: { aggression: 0.32, opportunism: 0.43, legalism: 0.46, isolationism: 0.34, riskTolerance: 0.44, vengefulness: 0.34, reliability: 0.48, transparency: 0.32, agendas: [{ id: "debt-without-conditions", description: "Stay solvent without accepting the IMF's conditions", weight: 0.6 }, { id: "migration-management", description: "Hold its migration deal with Europe on its own terms", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "sovereign-development", description: "No IMF-dictated cuts to its subsidies." }], alignmentPull: [] },
    },
];
