import type { NationDraft } from "./compose-nation.js";

// Records for Sub-Saharan Africa drafted thin: 42 countries, 6 of them since promoted to standard
// fidelity with a researched agenda, red line and alignment, 36 still thin.
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
export const africaDrafts: readonly NationDraft[] = [
  // Factbook: presidential republic
  {
    id: "CMR", playable: false, fidelity: "thin",
    identity: { name: "Cameroon", adjective: "Cameroonian", capital: "Yaounde", government: "charter-presidential-republic", languages: ["English", "French"], currency: "XAF" },
    geo: { region: "region-central-africa", lat: 3.87, lon: 11.52, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, pandemic: 0.3, drought: 0.1 } },
    traits: { aggression: 0.34, opportunism: 0.44, legalism: 0.35, isolationism: 0.41, riskTolerance: 0.46, vengefulness: 0.39, reliability: 0.38, transparency: 0.2, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "CAF", playable: false, fidelity: "thin",
    identity: { name: "Central African Republic", adjective: "Central African", capital: "Bangui", government: "charter-presidential-republic", languages: ["French", "Sango"], currency: "XAF", definiteArticle: true },
    geo: { region: "region-central-africa", lat: 4.37, lon: 18.58, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.25, pandemic: 0.3, drought: 0.1 } },
    traits: { aggression: 0.37, opportunism: 0.44, legalism: 0.3, isolationism: 0.55, riskTolerance: 0.49, vengefulness: 0.4, reliability: 0.31, transparency: 0.19, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "TCD", playable: false, fidelity: "thin",
    identity: { name: "Chad", adjective: "Chadian", capital: "N'Djamena", government: "charter-presidential-republic", languages: ["French", "Arabic"], currency: "XAF" },
    geo: { region: "region-central-africa", lat: 12.1, lon: 15.03, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.25, pandemic: 0.3, drought: 0.1 } },
    traits: { aggression: 0.37, opportunism: 0.45, legalism: 0.32, isolationism: 0.45, riskTolerance: 0.49, vengefulness: 0.41, reliability: 0.35, transparency: 0.16, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "GNQ", playable: false, fidelity: "thin",
    identity: { name: "Equatorial Guinea", adjective: "Equatoguinean", capital: "Malabo", government: "charter-presidential-republic", languages: ["Spanish", "French"], currency: "XAF" },
    geo: { region: "region-central-africa", lat: 3.75, lon: 8.78, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, pandemic: 0.3, drought: 0.1 } },
    traits: { aggression: 0.3, opportunism: 0.45, legalism: 0.3, isolationism: 0.44, riskTolerance: 0.4, vengefulness: 0.36, reliability: 0.34, transparency: 0.13, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "GAB", playable: false, fidelity: "thin",
    identity: { name: "Gabon", adjective: "Gabonese", capital: "Libreville", government: "charter-presidential-republic", languages: ["French"], currency: "XAF" },
    geo: { region: "region-central-africa", lat: 0.38, lon: 9.45, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, pandemic: 0.3, drought: 0.1 } },
    traits: { aggression: 0.29, opportunism: 0.43, legalism: 0.37, isolationism: 0.4, riskTolerance: 0.41, vengefulness: 0.33, reliability: 0.4, transparency: 0.25, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "COG", playable: false, fidelity: "thin",
    identity: { name: "Republic of the Congo", adjective: "Congolese", capital: "Brazzaville", government: "charter-presidential-republic", languages: ["French", "Kongo"], currency: "XAF", definiteArticle: true },
    geo: { region: "region-central-africa", lat: -4.25, lon: 15.28, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, pandemic: 0.3, drought: 0.1 } },
    traits: { aggression: 0.29, opportunism: 0.44, legalism: 0.35, isolationism: 0.41, riskTolerance: 0.4, vengefulness: 0.35, reliability: 0.38, transparency: 0.19, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: semi-presidential republic
  {
    id: "STP", playable: false, fidelity: "thin",
    identity: { name: "Sao Tome and Principe", adjective: "Sao Tomean", capital: "Sao Tome", government: "charter-presidential-republic", languages: ["Portuguese"], currency: "STN" },
    geo: { region: "region-central-africa", lat: 0.33, lon: 6.73, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, pandemic: 0.3, drought: 0.1 } },
    traits: { aggression: 0.23, opportunism: 0.41, legalism: 0.5, isolationism: 0.61, riskTolerance: 0.37, vengefulness: 0.25, reliability: 0.47, transparency: 0.45, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "BDI", playable: false, fidelity: "thin",
    identity: { name: "Burundi", adjective: "Burundian", capital: "Gitega", government: "charter-presidential-republic", languages: ["French", "Rundi"], currency: "BIF" },
    geo: { region: "region-east-africa", lat: -3.42, lon: 29.92, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 } },
    traits: { aggression: 0.39, opportunism: 0.44, legalism: 0.33, isolationism: 0.53, riskTolerance: 0.49, vengefulness: 0.39, reliability: 0.37, transparency: 0.16, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "DJI", playable: false, fidelity: "thin",
    identity: { name: "Djibouti", adjective: "Djiboutian", capital: "Djibouti", government: "charter-presidential-republic", languages: ["French", "Arabic"], currency: "DJF" },
    geo: { region: "region-east-africa", lat: 11.58, lon: 43.15, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 } },
    traits: { aggression: 0.3, opportunism: 0.44, legalism: 0.37, isolationism: 0.32, riskTolerance: 0.42, vengefulness: 0.35, reliability: 0.42, transparency: 0.21, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: authoritarian
  {
    id: "ERI", playable: false, fidelity: "thin",
    identity: { name: "Eritrea", adjective: "Eritrean", capital: "Asmara", government: "charter-presidential-republic", languages: ["Tigrinya", "Arabic"], currency: "ERN" },
    geo: { region: "region-east-africa", lat: 15.33, lon: 38.93, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 } },
    traits: { aggression: 0.34, opportunism: 0.47, legalism: 0.25, isolationism: 0.56, riskTolerance: 0.42, vengefulness: 0.41, reliability: 0.3, transparency: 0.05, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "KEN", playable: false, fidelity: "standard",
    identity: { name: "Kenya", adjective: "Kenyan", capital: "Nairobi", government: "charter-presidential-republic", languages: ["English", "Swahili"], currency: "KES" },
    geo: { region: "region-east-africa", lat: -1.28, lon: 36.82, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 } },
    traits: { aggression: 0.31, opportunism: 0.41, legalism: 0.46, isolationism: 0.37, riskTolerance: 0.45, vengefulness: 0.34, reliability: 0.47, transparency: 0.35, agendas: [{ id: "regional-leadership", description: "Be East Africa's broker and the US partner in the region", weight: 0.6 }, { id: "border-security", description: "Contain al-Shabaab on its Somali border", weight: 0.6 }] },
    doctrine: { posture: "balanced", redLines: [{ id: "border-security", description: "No al-Shabaab sanctuary on its side of the border." }], alignmentPull: ["USA"] },
  },
  // Factbook: federal parliamentary republic
  {
    id: "SOM", playable: false, fidelity: "thin",
    identity: { name: "Somalia", adjective: "Somali", capital: "Mogadishu", government: "charter-parliamentary-republic", languages: ["Somali", "Arabic"], currency: "SOS" },
    geo: { region: "region-east-africa", lat: 2.07, lon: 45.33, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 } },
    traits: { aggression: 0.38, opportunism: 0.44, legalism: 0.24, isolationism: 0.38, riskTolerance: 0.5, vengefulness: 0.43, reliability: 0.25, transparency: 0.14, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "SSD", playable: false, fidelity: "thin",
    identity: { name: "South Sudan", adjective: "South Sudanese", capital: "Juba", government: "charter-presidential-republic", languages: ["English"], currency: "SSP" },
    geo: { region: "region-east-africa", lat: 4.85, lon: 31.62, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 } },
    traits: { aggression: 0.52, opportunism: 0.45, legalism: 0.25, isolationism: 0.45, riskTolerance: 0.58, vengefulness: 0.42, reliability: 0.26, transparency: 0.08, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "TZA", playable: false, fidelity: "standard",
    identity: { name: "Tanzania", adjective: "Tanzanian", capital: "Dodoma", government: "charter-presidential-republic", languages: ["Swahili", "English"], currency: "TZS" },
    geo: { region: "region-east-africa", lat: -6.8, lon: 39.28, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 } },
    traits: { aggression: 0.28, opportunism: 0.43, legalism: 0.45, isolationism: 0.39, riskTolerance: 0.41, vengefulness: 0.32, reliability: 0.47, transparency: 0.32, agendas: [{ id: "port-hub", description: "Make Dar es Salaam the port for its landlocked neighbors", weight: 0.6 }, { id: "regime-security", description: "Keep the ruling party's hold after the 2025 election", weight: 0.5 }] },
    doctrine: { posture: "balanced", redLines: [{ id: "governance-model", description: "No foreign judgment on its elections." }], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "UGA", playable: false, fidelity: "thin",
    identity: { name: "Uganda", adjective: "Ugandan", capital: "Kampala", government: "charter-presidential-republic", languages: ["English", "Swahili"], currency: "UGX" },
    geo: { region: "region-east-africa", lat: 0.32, lon: 32.55, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 } },
    traits: { aggression: 0.32, opportunism: 0.43, legalism: 0.41, isolationism: 0.4, riskTolerance: 0.45, vengefulness: 0.36, reliability: 0.45, transparency: 0.24, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "AGO", playable: false, fidelity: "standard",
    identity: { name: "Angola", adjective: "Angolan", capital: "Luanda", government: "charter-presidential-republic", languages: ["Portuguese"], currency: "AOA" },
    geo: { region: "region-southern-africa", lat: -8.83, lon: 13.22, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.3, opportunism: 0.44, legalism: 0.36, isolationism: 0.36, riskTolerance: 0.42, vengefulness: 0.35, reliability: 0.39, transparency: 0.25, agendas: [{ id: "oil-revenue", description: "Keep oil revenue servicing its debts to China", weight: 0.6 }, { id: "trade-corridor", description: "Build the Lobito rail corridor with US backing", weight: 0.5 }] },
    doctrine: { posture: "balanced", redLines: [{ id: "oil-sovereignty", description: "Its offshore oil stays under its own terms." }], alignmentPull: [] },
  },
  // Factbook: parliamentary republic
  {
    id: "BWA", playable: false, fidelity: "thin",
    identity: { name: "Botswana", adjective: "Botswanan", capital: "Gaborone", government: "charter-parliamentary-republic", languages: ["English", "Tswana"], currency: "BWP" },
    geo: { region: "region-southern-africa", lat: -24.63, lon: 25.9, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.22, opportunism: 0.41, legalism: 0.57, isolationism: 0.43, riskTolerance: 0.36, vengefulness: 0.22, reliability: 0.57, transparency: 0.49, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: federal presidential republic
  {
    id: "COM", playable: false, fidelity: "thin",
    identity: { name: "Comoros", adjective: "Comoran", capital: "Moroni", government: "charter-presidential-republic", languages: ["Arabic", "French"], currency: "KMF", definiteArticle: true },
    geo: { region: "region-southern-africa", lat: -11.7, lon: 43.23, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.29, opportunism: 0.44, legalism: 0.36, isolationism: 0.58, riskTolerance: 0.4, vengefulness: 0.34, reliability: 0.38, transparency: 0.21, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: absolute monarchy
  {
    id: "SWZ", playable: false, fidelity: "thin",
    identity: { name: "Eswatini", adjective: "Swazi", capital: "Mbabane", government: "charter-absolute-monarchy", languages: ["English", "Swati"], currency: "SZL" },
    geo: { region: "region-southern-africa", lat: -26.32, lon: 31.13, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.32, opportunism: 0.45, legalism: 0.38, isolationism: 0.45, riskTolerance: 0.43, vengefulness: 0.36, reliability: 0.42, transparency: 0.2, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary constitutional monarchy
  {
    id: "LSO", playable: false, fidelity: "thin",
    identity: { name: "Lesotho", adjective: "Basotho", capital: "Maseru", government: "charter-parliamentary-republic", languages: ["English", "Southern Sotho"], currency: "LSL" },
    geo: { region: "region-southern-africa", lat: -29.32, lon: 27.48, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.27, opportunism: 0.41, legalism: 0.48, isolationism: 0.44, riskTolerance: 0.41, vengefulness: 0.29, reliability: 0.46, transparency: 0.39, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: semi-presidential republic
  {
    id: "MDG", playable: false, fidelity: "thin",
    identity: { name: "Madagascar", adjective: "Malagasy", capital: "Antananarivo", government: "charter-presidential-republic", languages: ["French", "Malagasy"], currency: "MGA" },
    geo: { region: "region-southern-africa", lat: -18.92, lon: 47.52, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.5, drought: 0.3, flood: 0.25 } },
    traits: { aggression: 0.28, opportunism: 0.42, legalism: 0.41, isolationism: 0.44, riskTolerance: 0.41, vengefulness: 0.33, reliability: 0.41, transparency: 0.29, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "MWI", playable: false, fidelity: "thin",
    identity: { name: "Malawi", adjective: "Malawian", capital: "Lilongwe", government: "charter-presidential-republic", languages: ["English", "Chichewa"], currency: "MWK" },
    geo: { region: "region-southern-africa", lat: -13.97, lon: 33.78, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.26, opportunism: 0.4, legalism: 0.51, isolationism: 0.48, riskTolerance: 0.41, vengefulness: 0.29, reliability: 0.48, transparency: 0.39, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary republic
  {
    id: "MUS", playable: false, fidelity: "thin",
    identity: { name: "Mauritius", adjective: "Mauritian", capital: "Port Louis", government: "charter-parliamentary-republic", languages: ["English", "French"], currency: "MUR" },
    geo: { region: "region-southern-africa", lat: -20.15, lon: 57.48, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.2, opportunism: 0.4, legalism: 0.61, isolationism: 0.36, riskTolerance: 0.35, vengefulness: 0.23, reliability: 0.62, transparency: 0.49, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "MOZ", playable: false, fidelity: "thin",
    identity: { name: "Mozambique", adjective: "Mozambican", capital: "Maputo", government: "charter-presidential-republic", languages: ["Portuguese", "Makhuwa"], currency: "MZN" },
    geo: { region: "region-southern-africa", lat: -25.95, lon: 32.58, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.5, flood: 0.4, drought: 0.3 } },
    traits: { aggression: 0.35, opportunism: 0.43, legalism: 0.36, isolationism: 0.39, riskTolerance: 0.48, vengefulness: 0.38, reliability: 0.39, transparency: 0.24, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "NAM", playable: false, fidelity: "thin",
    identity: { name: "Namibia", adjective: "Namibian", capital: "Windhoek", government: "charter-presidential-republic", languages: ["English", "Afrikaans"], currency: "NAD" },
    geo: { region: "region-southern-africa", lat: -22.57, lon: 17.08, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.24, opportunism: 0.4, legalism: 0.57, isolationism: 0.4, riskTolerance: 0.38, vengefulness: 0.24, reliability: 0.56, transparency: 0.48, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "SYC", playable: false, fidelity: "thin",
    identity: { name: "Seychelles", adjective: "Seychellois", capital: "Victoria", government: "charter-presidential-republic", languages: ["English", "French"], currency: "SCR" },
    geo: { region: "region-southern-africa", lat: -4.62, lon: 55.45, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.2, opportunism: 0.41, legalism: 0.61, isolationism: 0.42, riskTolerance: 0.35, vengefulness: 0.21, reliability: 0.61, transparency: 0.56, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "ZMB", playable: false, fidelity: "thin",
    identity: { name: "Zambia", adjective: "Zambian", capital: "Lusaka", government: "charter-presidential-republic", languages: ["English", "Bemba"], currency: "ZMW" },
    geo: { region: "region-southern-africa", lat: -15.42, lon: 28.28, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.27, opportunism: 0.42, legalism: 0.45, isolationism: 0.42, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.45, transparency: 0.35, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "ZWE", playable: false, fidelity: "thin",
    identity: { name: "Zimbabwe", adjective: "Zimbabwean", capital: "Harare", government: "charter-presidential-republic", languages: ["English", "Shona"], currency: "ZWG" },
    geo: { region: "region-southern-africa", lat: -17.82, lon: 31.03, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 } },
    traits: { aggression: 0.31, opportunism: 0.44, legalism: 0.35, isolationism: 0.42, riskTolerance: 0.43, vengefulness: 0.37, reliability: 0.38, transparency: 0.2, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "BEN", playable: false, fidelity: "thin",
    identity: { name: "Benin", adjective: "Beninese", capital: "Porto-Novo", government: "charter-presidential-republic", languages: ["French"], currency: "XOF" },
    geo: { region: "region-west-africa", lat: 6.48, lon: 2.62, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.27, opportunism: 0.42, legalism: 0.47, isolationism: 0.45, riskTolerance: 0.41, vengefulness: 0.31, reliability: 0.48, transparency: 0.36, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "BFA", playable: false, fidelity: "thin",
    identity: { name: "Burkina Faso", adjective: "Burkinabe", capital: "Ouagadougou", government: "charter-military-junta", languages: ["French", "Mossi"], currency: "XOF" },
    geo: { region: "region-west-africa", lat: 12.37, lon: -1.52, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.38, opportunism: 0.44, legalism: 0.4, isolationism: 0.43, riskTolerance: 0.5, vengefulness: 0.39, reliability: 0.41, transparency: 0.28, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: parliamentary republic
  {
    id: "CPV", playable: false, fidelity: "thin",
    identity: { name: "Cabo Verde", adjective: "Cabo Verdean", capital: "Praia", government: "charter-parliamentary-republic", languages: ["Portuguese"], currency: "CVE" },
    geo: { region: "region-west-africa", lat: 14.92, lon: -23.52, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.19, opportunism: 0.39, legalism: 0.6, isolationism: 0.49, riskTolerance: 0.35, vengefulness: 0.21, reliability: 0.58, transparency: 0.57, agendas: [] },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "CIV", playable: false, fidelity: "standard",
    identity: { name: "Cote d'Ivoire", adjective: "Ivorian", capital: "Yamoussoukro", government: "charter-presidential-republic", languages: ["French"], currency: "XOF" },
    geo: { region: "region-west-africa", lat: 6.82, lon: -5.27, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.29, opportunism: 0.43, legalism: 0.44, isolationism: 0.37, riskTolerance: 0.43, vengefulness: 0.33, reliability: 0.46, transparency: 0.33, agendas: [{ id: "commodity-growth", description: "Keep cocoa and new oil output growing", weight: 0.6 }, { id: "border-security", description: "Keep the Sahel's jihadists from crossing its northern border", weight: 0.6 }] },
    doctrine: { posture: "balanced", redLines: [{ id: "border-security", description: "No jihadist foothold in its north." }], alignmentPull: ["FRA"] },
  },
  // Factbook: presidential republic
  {
    id: "GMB", playable: false, fidelity: "thin",
    identity: { name: "Gambia", adjective: "Gambian", capital: "Banjul", government: "charter-presidential-republic", languages: ["English", "Wolof"], currency: "GMD", definiteArticle: true },
    geo: { region: "region-west-africa", lat: 13.45, lon: -16.57, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.25, opportunism: 0.41, legalism: 0.48, isolationism: 0.56, riskTolerance: 0.39, vengefulness: 0.28, reliability: 0.47, transparency: 0.39, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "GHA", playable: false, fidelity: "standard",
    identity: { name: "Ghana", adjective: "Ghanaian", capital: "Accra", government: "charter-presidential-republic", languages: ["English", "Akan"], currency: "GHS" },
    geo: { region: "region-west-africa", lat: 5.55, lon: -0.22, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.23, opportunism: 0.4, legalism: 0.54, isolationism: 0.35, riskTolerance: 0.38, vengefulness: 0.26, reliability: 0.53, transparency: 0.45, agendas: [{ id: "debt-restructuring", description: "Finish its debt restructuring and IMF program", weight: 0.7 }, { id: "commodity-growth", description: "Grow gold and cocoa exports", weight: 0.5 }] },
    doctrine: { posture: "balanced", redLines: [{ id: "governance-model", description: "Its elections and transfers of power are its own." }], alignmentPull: ["USA"] },
  },
  // Factbook: presidential republic
  {
    id: "GIN", playable: false, fidelity: "thin",
    identity: { name: "Guinea", adjective: "Guinean", capital: "Conakry", government: "charter-military-junta", languages: ["French"], currency: "GNF" },
    geo: { region: "region-west-africa", lat: 9.5, lon: -13.7, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.33, opportunism: 0.44, legalism: 0.36, isolationism: 0.38, riskTolerance: 0.45, vengefulness: 0.37, reliability: 0.39, transparency: 0.21, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: semi-presidential republic
  {
    id: "GNB", playable: false, fidelity: "thin",
    identity: { name: "Guinea-Bissau", adjective: "Bissau-Guinean", capital: "Bissau", government: "charter-presidential-republic", languages: ["Portuguese"], currency: "XOF" },
    geo: { region: "region-west-africa", lat: 11.85, lon: -15.58, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.29, opportunism: 0.42, legalism: 0.37, isolationism: 0.56, riskTolerance: 0.42, vengefulness: 0.33, reliability: 0.36, transparency: 0.27, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "LBR", playable: false, fidelity: "thin",
    identity: { name: "Liberia", adjective: "Liberian", capital: "Monrovia", government: "charter-presidential-republic", languages: ["English"], currency: "LRD" },
    geo: { region: "region-west-africa", lat: 6.3, lon: -10.8, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.26, opportunism: 0.4, legalism: 0.44, isolationism: 0.51, riskTolerance: 0.4, vengefulness: 0.29, reliability: 0.4, transparency: 0.37, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: semi-presidential republic
  {
    id: "MLI", playable: false, fidelity: "thin",
    identity: { name: "Mali", adjective: "Malian", capital: "Bamako", government: "charter-military-junta", languages: ["French", "Bambara"], currency: "XOF" },
    geo: { region: "region-west-africa", lat: 12.65, lon: -8, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.4, opportunism: 0.44, legalism: 0.36, isolationism: 0.43, riskTolerance: 0.53, vengefulness: 0.42, reliability: 0.38, transparency: 0.22, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: formerly, semi-presidential republic
  {
    id: "NER", playable: false, fidelity: "thin",
    identity: { name: "Niger", adjective: "Nigerien", capital: "Niamey", government: "charter-military-junta", languages: ["French", "Hausa"], currency: "XOF" },
    geo: { region: "region-west-africa", lat: 13.52, lon: 2.12, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.35, opportunism: 0.44, legalism: 0.39, isolationism: 0.47, riskTolerance: 0.48, vengefulness: 0.38, reliability: 0.41, transparency: 0.26, agendas: [] },
    doctrine: { posture: "assertive", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "SEN", playable: false, fidelity: "standard",
    identity: { name: "Senegal", adjective: "Senegalese", capital: "Dakar", government: "charter-presidential-republic", languages: ["French", "Wolof"], currency: "XOF" },
    geo: { region: "region-west-africa", lat: 14.73, lon: -17.63, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.26, opportunism: 0.41, legalism: 0.51, isolationism: 0.4, riskTolerance: 0.41, vengefulness: 0.28, reliability: 0.52, transparency: 0.43, agendas: [{ id: "resource-revenue", description: "Bring its new oil and gas revenue under national terms", weight: 0.6 }, { id: "sovereignty-optics", description: "Close the French bases and redraw the old ties", weight: 0.6 }] },
    doctrine: { posture: "balanced", redLines: [{ id: "sovereign-development", description: "Its oil and gas contracts are its to renegotiate." }], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "SLE", playable: false, fidelity: "thin",
    identity: { name: "Sierra Leone", adjective: "Sierra Leonean", capital: "Freetown", government: "charter-presidential-republic", languages: ["English", "Mende"], currency: "SLE" },
    geo: { region: "region-west-africa", lat: 8.48, lon: -13.23, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.27, opportunism: 0.42, legalism: 0.42, isolationism: 0.51, riskTolerance: 0.41, vengefulness: 0.31, reliability: 0.41, transparency: 0.33, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
  // Factbook: presidential republic
  {
    id: "TGO", playable: false, fidelity: "thin",
    identity: { name: "Togo", adjective: "Togolese", capital: "Lome", government: "charter-presidential-republic", languages: ["French", "Ewe"], currency: "XOF" },
    geo: { region: "region-west-africa", lat: 6.12, lon: 1.22, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.3, pandemic: 0.2 } },
    traits: { aggression: 0.31, opportunism: 0.44, legalism: 0.42, isolationism: 0.47, riskTolerance: 0.43, vengefulness: 0.35, reliability: 0.44, transparency: 0.26, agendas: [] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  },
];
