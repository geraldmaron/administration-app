// Records for the Americas drafted thin: 26 countries, 14 of them since promoted to standard
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
export const americasDrafts = [
    // Factbook: parliamentary democracy under a constitutional monarchy
    {
        id: "ATG", playable: false, fidelity: "thin",
        identity: { name: "Antigua and Barbuda", adjective: "Antiguan and Barbudan", capital: "Saint John's", government: "charter-parliamentary-republic", languages: ["English"], currency: "XCD" },
        geo: { region: "region-caribbean", lat: 17.12, lon: -61.85, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.19, opportunism: 0.39, legalism: 0.61, isolationism: 0.5, riskTolerance: 0.34, vengefulness: 0.21, reliability: 0.6, transparency: 0.51, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary democracy&nbsp
    {
        id: "BHS", playable: false, fidelity: "thin",
        identity: { name: "Bahamas", adjective: "Bahamian", capital: "Nassau", government: "charter-parliamentary-republic", languages: ["English"], currency: "BSD", definiteArticle: true },
        geo: { region: "region-caribbean", lat: 25.08, lon: -77.35, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.7, flood: 0.3 } },
        traits: { aggression: 0.19, opportunism: 0.41, legalism: 0.58, isolationism: 0.43, riskTolerance: 0.34, vengefulness: 0.21, reliability: 0.58, transparency: 0.54, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "BRB", playable: false, fidelity: "thin",
        identity: { name: "Barbados", adjective: "Barbadian", capital: "Bridgetown", government: "charter-parliamentary-republic", languages: ["English"], currency: "BBD" },
        geo: { region: "region-caribbean", lat: 13.1, lon: -59.62, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.17, opportunism: 0.39, legalism: 0.64, isolationism: 0.47, riskTolerance: 0.33, vengefulness: 0.18, reliability: 0.62, transparency: 0.61, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "DMA", playable: false, fidelity: "thin",
        identity: { name: "Dominica", adjective: "Dominica", capital: "Roseau", government: "charter-parliamentary-republic", languages: ["English"], currency: "XCD" },
        geo: { region: "region-caribbean", lat: 15.3, lon: -61.4, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.18, opportunism: 0.4, legalism: 0.58, isolationism: 0.59, riskTolerance: 0.33, vengefulness: 0.21, reliability: 0.57, transparency: 0.5, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "DOM", playable: false, fidelity: "standard",
        identity: { name: "Dominican Republic", adjective: "Dominican", capital: "Santo Domingo", government: "charter-presidential-republic", languages: ["Spanish"], currency: "DOP", definiteArticle: true },
        geo: { region: "region-caribbean", lat: 18.47, lon: -69.9, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.22, opportunism: 0.4, legalism: 0.52, isolationism: 0.35, riskTolerance: 0.36, vengefulness: 0.24, reliability: 0.51, transparency: 0.44, agendas: [{ id: "tourism-growth", description: "Keep the tourism boom and the free-trade zones growing", weight: 0.5 }, { id: "border-security", description: "Seal its border against the collapse in Haiti", weight: 0.7 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "border-security", description: "No mass crossing from Haiti is tolerated." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary democracy under a constitutional monarchy
    {
        id: "GRD", playable: false, fidelity: "thin",
        identity: { name: "Grenada", adjective: "Grenadian", capital: "Saint George's", government: "charter-parliamentary-republic", languages: ["English"], currency: "XCD" },
        geo: { region: "region-caribbean", lat: 12.05, lon: -61.75, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.18, opportunism: 0.4, legalism: 0.6, isolationism: 0.55, riskTolerance: 0.33, vengefulness: 0.21, reliability: 0.58, transparency: 0.49, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: semi-presidential republic
    {
        id: "HTI", playable: false, fidelity: "standard",
        identity: { name: "Haiti", adjective: "Haitian", capital: "Port-au-Prince", government: "charter-presidential-republic", languages: ["Haitian Creole", "French"], currency: "HTG" },
        geo: { region: "region-caribbean", lat: 18.53, lon: -72.33, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.6, cyclone: 0.6, flood: 0.3 } },
        traits: { aggression: 0.32, opportunism: 0.43, legalism: 0.31, isolationism: 0.47, riskTolerance: 0.44, vengefulness: 0.38, reliability: 0.3, transparency: 0.19, agendas: [{ id: "capital-security", description: "Retake Port-au-Prince from the gangs", weight: 0.9 }, { id: "institution-rebuilding", description: "Hold elections and restore a government with a mandate", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "sovereignty-over-security", description: "No foreign force operates on its soil without its government's consent." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary democracy
    {
        id: "JAM", playable: false, fidelity: "standard",
        identity: { name: "Jamaica", adjective: "Jamaican", capital: "Kingston", government: "charter-parliamentary-republic", languages: ["English"], currency: "JMD" },
        geo: { region: "region-caribbean", lat: 18, lon: -76.8, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.22, opportunism: 0.39, legalism: 0.54, isolationism: 0.42, riskTolerance: 0.37, vengefulness: 0.23, reliability: 0.53, transparency: 0.49, agendas: [{ id: "crime-security", description: "Bring down one of the hemisphere's highest murder rates", weight: 0.6 }, { id: "climate-resilience", description: "Rebuild after Hurricane Melissa and ready itself for the next season", weight: 0.6 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "non-intervention", description: "No foreign force on its soil without its consent." }], alignmentPull: ["USA"] },
    },
    // Factbook: federal parliamentary democracy under a constitutional monarchy
    {
        id: "KNA", playable: false, fidelity: "thin",
        identity: { name: "Saint Kitts and Nevis", adjective: "Kittitian and Nevisian", capital: "Basseterre", government: "charter-parliamentary-republic", languages: ["English"], currency: "XCD" },
        geo: { region: "region-caribbean", lat: 17.3, lon: -62.72, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.2, opportunism: 0.4, legalism: 0.61, isolationism: 0.56, riskTolerance: 0.35, vengefulness: 0.22, reliability: 0.61, transparency: 0.5, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary democracy under a constitutional monarchy
    {
        id: "LCA", playable: false, fidelity: "thin",
        identity: { name: "Saint Lucia", adjective: "Saint Lucian", capital: "Castries", government: "charter-parliamentary-republic", languages: ["English"], currency: "XCD" },
        geo: { region: "region-caribbean", lat: 14, lon: -61, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.18, opportunism: 0.39, legalism: 0.6, isolationism: 0.52, riskTolerance: 0.33, vengefulness: 0.21, reliability: 0.58, transparency: 0.53, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary democracy under a constitutional monarchy
    {
        id: "VCT", playable: false, fidelity: "thin",
        identity: { name: "Saint Vincent and the Grenadines", adjective: "Vincentian", capital: "Kingstown", government: "charter-parliamentary-republic", languages: ["English"], currency: "XCD" },
        geo: { region: "region-caribbean", lat: 13.13, lon: -61.22, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.19, opportunism: 0.4, legalism: 0.6, isolationism: 0.56, riskTolerance: 0.33, vengefulness: 0.21, reliability: 0.58, transparency: 0.52, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "TTO", playable: false, fidelity: "thin",
        identity: { name: "Trinidad and Tobago", adjective: "Trinidadian and Tobagonian", capital: "Port of Spain", government: "charter-parliamentary-republic", languages: ["English"], currency: "TTD" },
        geo: { region: "region-caribbean", lat: 10.65, lon: -61.52, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.25, earthquake: 0.2 } },
        traits: { aggression: 0.22, opportunism: 0.39, legalism: 0.51, isolationism: 0.41, riskTolerance: 0.37, vengefulness: 0.24, reliability: 0.5, transparency: 0.47, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary democracy
    {
        id: "BLZ", playable: false, fidelity: "thin",
        identity: { name: "Belize", adjective: "Belizean", capital: "Belmopan", government: "charter-parliamentary-republic", languages: ["English", "Spanish"], currency: "BZD" },
        geo: { region: "region-central-america", lat: 17.25, lon: -88.77, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, cyclone: 0.35, flood: 0.3, drought: 0.15 } },
        traits: { aggression: 0.22, opportunism: 0.4, legalism: 0.49, isolationism: 0.47, riskTolerance: 0.35, vengefulness: 0.24, reliability: 0.49, transparency: 0.43, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "CRI", playable: false, fidelity: "standard",
        identity: { name: "Costa Rica", adjective: "Costa Rican", capital: "San Jose", government: "charter-presidential-republic", languages: ["Spanish", "English"], currency: "CRC" },
        geo: { region: "region-central-america", lat: 9.93, lon: -84.08, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, cyclone: 0.35, flood: 0.3, drought: 0.15 } },
        traits: { aggression: 0.17, opportunism: 0.38, legalism: 0.63, isolationism: 0.35, riskTolerance: 0.33, vengefulness: 0.18, reliability: 0.59, transparency: 0.59, agendas: [{ id: "nearshoring", description: "Win medical-device and chip nearshoring from the United States", weight: 0.6 }, { id: "narcotics-security", description: "Contain the cocaine violence now reaching its ports", weight: 0.5 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "non-intervention", description: "It has no army and accepts no foreign force on its soil." }], alignmentPull: ["USA"] },
    },
    // Factbook: presidential republic
    {
        id: "SLV", playable: false, fidelity: "standard",
        identity: { name: "El Salvador", adjective: "Salvadoran", capital: "San Salvador", government: "charter-presidential-republic", languages: ["Spanish"], currency: "USD" },
        geo: { region: "region-central-america", lat: 13.7, lon: -89.2, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, cyclone: 0.35, flood: 0.3, drought: 0.15 } },
        traits: { aggression: 0.27, opportunism: 0.43, legalism: 0.42, isolationism: 0.38, riskTolerance: 0.39, vengefulness: 0.31, reliability: 0.46, transparency: 0.29, agendas: [{ id: "gang-security", description: "Hold the gang crackdown that emptied its streets", weight: 0.8 }, { id: "investment-growth", description: "Court investors and Washington's goodwill after the bitcoin experiment", weight: 0.4 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "governance-model", description: "Its emergency rule is not for foreigners to judge." }], alignmentPull: ["USA"] },
    },
    // Factbook: presidential republic
    {
        id: "GTM", playable: false, fidelity: "standard",
        identity: { name: "Guatemala", adjective: "Guatemalan", capital: "Guatemala City", government: "charter-presidential-republic", languages: ["Spanish"], currency: "GTQ" },
        geo: { region: "region-central-america", lat: 14.62, lon: -90.52, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, cyclone: 0.35, flood: 0.3, drought: 0.15 } },
        traits: { aggression: 0.26, opportunism: 0.41, legalism: 0.41, isolationism: 0.36, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.4, transparency: 0.32, agendas: [{ id: "migration-management", description: "Manage migration north under pressure from Washington", weight: 0.6 }, { id: "institution-building", description: "Hold the reform government against a captured prosecutor's office", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-claims", description: "Its claim over Belize is for the International Court of Justice to settle." }], alignmentPull: ["USA"] },
    },
    // Factbook: presidential republic
    {
        id: "HND", playable: false, fidelity: "standard",
        identity: { name: "Honduras", adjective: "Honduran", capital: "Tegucigalpa", government: "charter-presidential-republic", languages: ["Spanish"], currency: "HNL" },
        geo: { region: "region-central-america", lat: 14.1, lon: -87.22, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, cyclone: 0.35, flood: 0.3, drought: 0.15 } },
        traits: { aggression: 0.29, opportunism: 0.41, legalism: 0.38, isolationism: 0.37, riskTolerance: 0.42, vengefulness: 0.32, reliability: 0.4, transparency: 0.29, agendas: [{ id: "migration-management", description: "Stem migration and the deportation flights that answer it", weight: 0.5 }, { id: "gang-security", description: "Break the gangs under its state of emergency", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "governance-model", description: "No outside hand in its contested elections." }], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "NIC", playable: false, fidelity: "standard",
        identity: { name: "Nicaragua", adjective: "Nicaraguan", capital: "Managua", government: "charter-presidential-republic", languages: ["Spanish", "English"], currency: "NIO" },
        geo: { region: "region-central-america", lat: 12.13, lon: -86.25, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, cyclone: 0.35, flood: 0.3, drought: 0.15 } },
        traits: { aggression: 0.29, opportunism: 0.45, legalism: 0.29, isolationism: 0.39, riskTolerance: 0.39, vengefulness: 0.36, reliability: 0.34, transparency: 0.13, agendas: [{ id: "regime-security", description: "Keep the ruling family in power", weight: 0.9 }, { id: "sanctions-resistance", description: "Outlast US sanctions with help from Russia and China", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "regime-security", description: "No foreign support for its opposition." }], alignmentPull: ["RUS"] },
    },
    // Factbook: presidential republic
    {
        id: "PAN", playable: false, fidelity: "standard",
        identity: { name: "Panama", adjective: "Panamanian", capital: "Panama City", government: "charter-presidential-republic", languages: ["Spanish", "English"], currency: "PAB" },
        geo: { region: "region-central-america", lat: 8.97, lon: -79.53, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, cyclone: 0.35, flood: 0.3, drought: 0.15 } },
        traits: { aggression: 0.22, opportunism: 0.38, legalism: 0.52, isolationism: 0.34, riskTolerance: 0.37, vengefulness: 0.24, reliability: 0.51, transparency: 0.47, agendas: [{ id: "canal-revenue", description: "Keep the canal's tolls and water flowing", weight: 0.8 }, { id: "sovereignty-optics", description: "Answer Washington's claims on the canal without yielding control of it", weight: 0.6 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "canal-access", description: "The canal is Panamanian and neutral under the 1977 treaties." }], alignmentPull: ["USA"] },
    },
    // Factbook: presidential republic
    {
        id: "BOL", playable: false, fidelity: "standard",
        identity: { name: "Bolivia", adjective: "Bolivian", capital: "La Paz", government: "charter-presidential-republic", languages: ["Spanish", "Quechua"], currency: "BOB" },
        geo: { region: "region-south-america", lat: -16.5, lon: -68.15, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.25, earthquake: 0.2, drought: 0.2 } },
        traits: { aggression: 0.28, opportunism: 0.41, legalism: 0.38, isolationism: 0.4, riskTolerance: 0.42, vengefulness: 0.31, reliability: 0.39, transparency: 0.33, agendas: [{ id: "lithium-resource-development", description: "Develop its lithium without ceding control of it", weight: 0.6 }, { id: "subsidy-reform", description: "End the fuel shortages and dollar crisis its subsidies caused", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "oil-sovereignty", description: "Its gas and lithium stay in national hands." }], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "ECU", playable: false, fidelity: "standard",
        identity: { name: "Ecuador", adjective: "Ecuadorian", capital: "Quito", government: "charter-presidential-republic", languages: ["Spanish"], currency: "USD" },
        geo: { region: "region-south-america", lat: -0.22, lon: -78.5, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, earthquake: 0.2, drought: 0.2 } },
        traits: { aggression: 0.29, opportunism: 0.4, legalism: 0.43, isolationism: 0.35, riskTolerance: 0.43, vengefulness: 0.3, reliability: 0.43, transparency: 0.38, agendas: [{ id: "port-security", description: "Break the gangs using its ports to move cocaine", weight: 0.8 }, { id: "debt-management", description: "Stay current on its IMF program", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "national-security", description: "No foreign base on its soil without its people's consent." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "GUY", playable: false, fidelity: "thin",
        identity: { name: "Guyana", adjective: "Guyanese", capital: "Georgetown", government: "charter-presidential-republic", languages: ["English"], currency: "GYD" },
        geo: { region: "region-south-america", lat: 6.8, lon: -58.15, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, earthquake: 0.2, drought: 0.2 } },
        traits: { aggression: 0.24, opportunism: 0.41, legalism: 0.49, isolationism: 0.43, riskTolerance: 0.38, vengefulness: 0.27, reliability: 0.49, transparency: 0.4, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "PRY", playable: false, fidelity: "standard",
        identity: { name: "Paraguay", adjective: "Paraguayan", capital: "Asuncion", government: "charter-presidential-republic", languages: ["Spanish", "Guarani"], currency: "PYG" },
        geo: { region: "region-south-america", lat: -25.27, lon: -57.67, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.25, earthquake: 0.2, drought: 0.2 } },
        traits: { aggression: 0.25, opportunism: 0.4, legalism: 0.46, isolationism: 0.38, riskTolerance: 0.39, vengefulness: 0.28, reliability: 0.46, transparency: 0.37, agendas: [{ id: "hydro-revenue", description: "Renegotiate what Brazil pays for its half of the Itaipu dam's power", weight: 0.6 }, { id: "taiwan-partnership", description: "Keep its recognition of Taiwan and the aid that comes with it", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "dam-control", description: "Its half of Itaipu is its own to sell." }], alignmentPull: ["USA"] },
    },
    // Factbook: presidential republic
    {
        id: "PER", playable: false, fidelity: "standard",
        identity: { name: "Peru", adjective: "Peruvian", capital: "Lima", government: "charter-presidential-republic", languages: ["Spanish", "Quechua"], currency: "PEN" },
        geo: { region: "region-south-america", lat: -12.05, lon: -77.05, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, earthquake: 0.2, drought: 0.2 } },
        traits: { aggression: 0.27, opportunism: 0.39, legalism: 0.48, isolationism: 0.31, riskTolerance: 0.42, vengefulness: 0.29, reliability: 0.47, transparency: 0.41, agendas: [{ id: "mineral-export-growth", description: "Keep copper and gold exports moving to China and the United States", weight: 0.6 }, { id: "institution-stability", description: "Survive the churn of presidents its Congress removes", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "maritime-claims", description: "Its 200-mile maritime zone and fisheries are its own." }], alignmentPull: ["USA"] },
    },
    // Factbook: presidential republic
    {
        id: "SUR", playable: false, fidelity: "thin",
        identity: { name: "Suriname", adjective: "Surinamese", capital: "Paramaribo", government: "charter-presidential-republic", languages: ["Dutch", "English"], currency: "SRD" },
        geo: { region: "region-south-america", lat: 5.83, lon: -55.17, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, earthquake: 0.2, drought: 0.2 } },
        traits: { aggression: 0.23, opportunism: 0.4, legalism: 0.51, isolationism: 0.48, riskTolerance: 0.37, vengefulness: 0.25, reliability: 0.49, transparency: 0.42, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "URY", playable: false, fidelity: "standard",
        identity: { name: "Uruguay", adjective: "Uruguayan", capital: "Montevideo", government: "charter-presidential-republic", languages: ["Spanish"], currency: "UYU" },
        geo: { region: "region-south-america", lat: -34.85, lon: -56.17, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, earthquake: 0.2, drought: 0.2 } },
        traits: { aggression: 0.18, opportunism: 0.39, legalism: 0.68, isolationism: 0.37, riskTolerance: 0.34, vengefulness: 0.17, reliability: 0.64, transparency: 0.65, agendas: [{ id: "trade-diversification", description: "Sign trade deals beyond Mercosur's common tariff", weight: 0.6 }, { id: "institutional-stability", description: "Keep the region's steadiest democracy steady", weight: 0.4 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "sovereign-development", description: "Its trade policy is not Brazil's or Argentina's to veto." }], alignmentPull: [] },
    },
];
