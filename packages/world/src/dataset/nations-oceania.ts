import type { NationDraft } from "./compose-nation.js";

// Records for Oceania drafted thin: 13 countries, 1 of them since promoted to standard
// fidelity with a researched agenda, red line and alignment, 12 still thin.
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
export const oceaniaDrafts: readonly NationDraft[] = [
  // Factbook: parliamentary republic
  {
    id: "FJI", playable: false, fidelity: "thin",
    identity: { name: "Fiji", adjective: "Fijian", capital: "Suva", government: "charter-parliamentary-republic", languages: ["English", "Fijian"], currency: "FJD" },
    geo: { region: "region-oceania", lat: -18.13, lon: 178.42, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.22, opportunism: 0.41, legalism: 0.57, isolationism: 0.43, riskTolerance: 0.36, vengefulness: 0.23, reliability: 0.58, transparency: 0.49, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "KIR", playable: false, fidelity: "thin",
    identity: { name: "Kiribati", adjective: "I-Kiribati", capital: "Tarawa", government: "charter-presidential-republic", languages: ["English", "Gilbertese"], currency: "AUD" },
    geo: { region: "region-oceania", lat: 1.35, lon: 173.03, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.18, opportunism: 0.38, legalism: 0.65, isolationism: 0.59, riskTolerance: 0.33, vengefulness: 0.18, reliability: 0.58, transparency: 0.58, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: mixed presidential-parliamentary system in free association with the US
  {
    id: "MHL", playable: false, fidelity: "thin",
    identity: { name: "Marshall Islands", adjective: "Marshallese", capital: "Majuro", government: "charter-parliamentary-republic", languages: ["Marshallese", "English"], currency: "USD", definiteArticle: true },
    geo: { region: "region-oceania", lat: 7.1, lon: 171.38, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.18, opportunism: 0.38, legalism: 0.65, isolationism: 0.58, riskTolerance: 0.33, vengefulness: 0.18, reliability: 0.59, transparency: 0.57, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: federal republic in free association with the US
  {
    id: "FSM", playable: false, fidelity: "thin",
    identity: { name: "Micronesia", adjective: "Micronesian", capital: "Palikir", government: "charter-parliamentary-republic", languages: ["English", "Chuukese"], currency: "USD" },
    geo: { region: "region-oceania", lat: 6.92, lon: 158.15, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.17, opportunism: 0.38, legalism: 0.66, isolationism: 0.58, riskTolerance: 0.32, vengefulness: 0.18, reliability: 0.61, transparency: 0.58, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary republic
  {
    id: "NRU", playable: false, fidelity: "thin",
    identity: { name: "Nauru", adjective: "Nauruan", capital: "Yaren", government: "charter-parliamentary-republic", languages: ["Nauruan", "English"], currency: "AUD" },
    geo: { region: "region-oceania", lat: -0.55, lon: 166.92, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.18, opportunism: 0.39, legalism: 0.58, isolationism: 0.56, riskTolerance: 0.33, vengefulness: 0.2, reliability: 0.55, transparency: 0.53, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary democracy&nbsp
  {
    id: "NZL", playable: false, fidelity: "standard",
    identity: { name: "New Zealand", adjective: "New Zealand", capital: "Wellington", government: "charter-parliamentary-republic", languages: ["English", "Māori"], currency: "NZD" },
    geo: { region: "region-oceania", lat: -41.3, lon: 174.78, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.45, flood: 0.15, wildfire: 0.05 } },
    traits: { aggression: 0.16, opportunism: 0.37, legalism: 0.77, isolationism: 0.32, riskTolerance: 0.34, vengefulness: 0.15, reliability: 0.75, transparency: 0.73, agendas: [{ id: "pacific-partnership", description: "Keep the Pacific islands close as China courts them", weight: 0.6 }, { id: "trade-diversification", description: "Sell dairy and meat to China without depending on it", weight: 0.5 }] },
    doctrine: { posture: "defensive", redLines: [{ id: "maritime-approaches", description: "No hostile naval presence in its Pacific approaches." }], alignmentPull: ["USA"] },
  },
  // Factbook: presidential republic in free association with the US
  {
    id: "PLW", playable: false, fidelity: "thin",
    identity: { name: "Palau", adjective: "Palauan", capital: "Ngerulmud", government: "charter-presidential-republic", languages: ["Palauan", "English"], currency: "USD" },
    geo: { region: "region-oceania", lat: 7.5, lon: 134.62, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.16, opportunism: 0.38, legalism: 0.69, isolationism: 0.59, riskTolerance: 0.32, vengefulness: 0.18, reliability: 0.63, transparency: 0.59, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary democracy under a constitutional monarchy
  {
    id: "PNG", playable: false, fidelity: "thin",
    identity: { name: "Papua New Guinea", adjective: "Papua New Guinean", capital: "Port Moresby", government: "charter-parliamentary-republic", languages: ["English", "Tok Pisin"], currency: "PGK" },
    geo: { region: "region-oceania", lat: -9.45, lon: 147.18, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.45, flood: 0.3, cyclone: 0.2 } },
    traits: { aggression: 0.27, opportunism: 0.41, legalism: 0.46, isolationism: 0.37, riskTolerance: 0.42, vengefulness: 0.31, reliability: 0.44, transparency: 0.35, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary republic
  {
    id: "WSM", playable: false, fidelity: "thin",
    identity: { name: "Samoa", adjective: "Samoan", capital: "Apia", government: "charter-parliamentary-republic", languages: ["Samoan", "English"], currency: "WST" },
    geo: { region: "region-oceania", lat: -13.82, lon: -171.77, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.17, opportunism: 0.39, legalism: 0.67, isolationism: 0.55, riskTolerance: 0.32, vengefulness: 0.19, reliability: 0.64, transparency: 0.58, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary democracy under a constitutional monarchy
  {
    id: "SLB", playable: false, fidelity: "thin",
    identity: { name: "Solomon Islands", adjective: "Solomon Islander", capital: "Honiara", government: "charter-parliamentary-republic", languages: ["English"], currency: "SBD", definiteArticle: true },
    geo: { region: "region-oceania", lat: -9.43, lon: 159.95, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.22, opportunism: 0.39, legalism: 0.56, isolationism: 0.51, riskTolerance: 0.36, vengefulness: 0.23, reliability: 0.51, transparency: 0.47, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: constitutional monarchy
  {
    id: "TON", playable: false, fidelity: "thin",
    identity: { name: "Tonga", adjective: "Tongan", capital: "Nuku'alofa", government: "charter-parliamentary-republic", languages: ["Tongan", "English"], currency: "TOP" },
    geo: { region: "region-oceania", lat: -21.13, lon: -175.2, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.18, opportunism: 0.37, legalism: 0.63, isolationism: 0.59, riskTolerance: 0.33, vengefulness: 0.19, reliability: 0.59, transparency: 0.53, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary democracy under a constitutional monarchy
  {
    id: "TUV", playable: false, fidelity: "thin",
    identity: { name: "Tuvalu", adjective: "Tuvaluan", capital: "Funafuti", government: "charter-parliamentary-republic", languages: ["Tuvaluan", "English"], currency: "AUD" },
    geo: { region: "region-oceania", lat: -8.52, lon: 179.22, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.55, flood: 0.3, earthquake: 0.25 } },
    traits: { aggression: 0.15, opportunism: 0.37, legalism: 0.7, isolationism: 0.69, riskTolerance: 0.31, vengefulness: 0.16, reliability: 0.61, transparency: 0.61, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary republic
  {
    id: "VUT", playable: false, fidelity: "thin",
    identity: { name: "Vanuatu", adjective: "Ni-Vanuatu", capital: "Port Vila", government: "charter-parliamentary-republic", languages: ["Bislama", "English"], currency: "VUV" },
    geo: { region: "region-oceania", lat: -17.73, lon: 168.32, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.45, cyclone: 0.55, flood: 0.2 } },
    traits: { aggression: 0.19, opportunism: 0.39, legalism: 0.59, isolationism: 0.56, riskTolerance: 0.34, vengefulness: 0.22, reliability: 0.53, transparency: 0.49, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
];
