// Records for Europe and the Caucasus drafted thin: 30 countries, 22 of them since promoted to standard
// fidelity with a researched agenda, red line and alignment, 8 still thin.
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
export const europeDrafts = [
    // Factbook: parliamentary democracy
    {
        id: "ARM", playable: false, fidelity: "standard",
        identity: { name: "Armenia", adjective: "Armenian", capital: "Yerevan", government: "charter-parliamentary-republic", languages: ["Armenian"], currency: "AMD" },
        geo: { region: "region-caucasus", lat: 40.17, lon: 44.5, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.4, flood: 0.15 } },
        traits: { aggression: 0.32, opportunism: 0.41, legalism: 0.52, isolationism: 0.33, riskTolerance: 0.46, vengefulness: 0.29, reliability: 0.5, transparency: 0.45, agendas: [{ id: "border-security", description: "Secure its border after losing Nagorno-Karabakh in 2023", weight: 0.7 }, { id: "rules-based-hedging", description: "Turn from Russia toward Europe and India for its security", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "border-sovereignty", description: "No transit corridor across its territory that it does not control." }], alignmentPull: [] },
    },
    // Factbook: presidential republic
    {
        id: "AZE", playable: false, fidelity: "standard",
        identity: { name: "Azerbaijan", adjective: "Azerbaijani", capital: "Baku", government: "charter-presidential-republic", languages: ["Azerbaijani", "Russian"], currency: "AZN" },
        geo: { region: "region-caucasus", lat: 40.38, lon: 49.87, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.4, flood: 0.15 } },
        traits: { aggression: 0.34, opportunism: 0.46, legalism: 0.41, isolationism: 0.34, riskTolerance: 0.43, vengefulness: 0.35, reliability: 0.49, transparency: 0.18, agendas: [{ id: "energy-export-growth", description: "Sell Caspian oil and gas to Europe through the Southern Gas Corridor", weight: 0.7 }, { id: "territorial-consolidation", description: "Consolidate control of Karabakh and press for a corridor to Nakhchivan", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-integrity", description: "Karabakh is Azerbaijani and closed to renegotiation." }], alignmentPull: ["TUR"] },
    },
    // Factbook: semi-presidential republic
    {
        id: "GEO", playable: false, fidelity: "standard",
        identity: { name: "Georgia", adjective: "Georgian", capital: "Tbilisi", government: "charter-parliamentary-republic", languages: ["Georgian", "Russian"], currency: "GEL" },
        geo: { region: "region-caucasus", lat: 41.68, lon: 44.83, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, flood: 0.15 } },
        traits: { aggression: 0.28, opportunism: 0.43, legalism: 0.53, isolationism: 0.36, riskTolerance: 0.42, vengefulness: 0.31, reliability: 0.56, transparency: 0.4, agendas: [{ id: "territorial-reunification", description: "Recover Abkhazia and South Ossetia", weight: 0.5 }, { id: "multi-vector-diplomacy", description: "Keep its EU candidacy without a break with Moscow", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-integrity", description: "No further recognition of its breakaway regions." }], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "CZE", playable: false, fidelity: "standard",
        identity: { name: "Czechia", adjective: "Czech", capital: "Prague", government: "charter-parliamentary-republic", languages: ["Czech"], currency: "CZK" },
        geo: { region: "region-central-europe", lat: 50.08, lon: 14.47, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.1 } },
        traits: { aggression: 0.19, opportunism: 0.37, legalism: 0.7, isolationism: 0.22, riskTolerance: 0.35, vengefulness: 0.18, reliability: 0.68, transparency: 0.64, agendas: [{ id: "export-manufacturing", description: "Keep its car and machinery exports flowing into German supply chains", weight: 0.6 }, { id: "ukraine-support-coalition", description: "Lead the coalition buying artillery ammunition for Ukraine", weight: 0.5 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "collective-defense", description: "Its Article 5 obligations are not negotiable." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "SVK", playable: false, fidelity: "standard",
        identity: { name: "Slovakia", adjective: "Slovak", capital: "Bratislava", government: "charter-parliamentary-republic", languages: ["Slovak", "Hungarian"], currency: "EUR" },
        geo: { region: "region-central-europe", lat: 48.15, lon: 17.12, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.1 } },
        traits: { aggression: 0.21, opportunism: 0.37, legalism: 0.62, isolationism: 0.22, riskTolerance: 0.37, vengefulness: 0.2, reliability: 0.6, transparency: 0.56, agendas: [{ id: "energy-dependence-hedge", description: "Manage its dependence on Russian gas and nuclear fuel", weight: 0.6 }, { id: "car-export-growth", description: "Protect the car industry that makes it the world's largest carmaker per head", weight: 0.5 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "sovereign-development", description: "No outside conditions on how it spends its own budget." }], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "SVN", playable: false, fidelity: "standard",
        identity: { name: "Slovenia", adjective: "Slovenian", capital: "Ljubljana", government: "charter-parliamentary-republic", languages: ["Slovenian"], currency: "EUR" },
        geo: { region: "region-central-europe", lat: 46.05, lon: 14.52, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.1 } },
        traits: { aggression: 0.2, opportunism: 0.38, legalism: 0.67, isolationism: 0.27, riskTolerance: 0.36, vengefulness: 0.2, reliability: 0.66, transparency: 0.6, agendas: [{ id: "eu-integration", description: "Stay in the core of the EU and the eurozone", weight: 0.5 }, { id: "western-balkans-mediation", description: "Broker the Western Balkans' path into Europe", weight: 0.4 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "territorial-waters", description: "Its access to the high seas through Piran Bay is not negotiable." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "BGR", playable: false, fidelity: "standard",
        identity: { name: "Bulgaria", adjective: "Bulgarian", capital: "Sofia", government: "charter-parliamentary-republic", languages: ["Bulgarian", "Turkish"], currency: "BGN" },
        geo: { region: "region-eastern-europe", lat: 42.68, lon: 23.32, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.15, earthquake: 0.1 } },
        traits: { aggression: 0.25, opportunism: 0.4, legalism: 0.53, isolationism: 0.29, riskTolerance: 0.4, vengefulness: 0.26, reliability: 0.53, transparency: 0.45, agendas: [{ id: "black-sea-security", description: "Secure its Black Sea coast and ports", weight: 0.6 }, { id: "energy-diversification", description: "Replace Russian gas with LNG through Greece and Caspian supply", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "collective-defense", description: "An attack on it is an attack on NATO." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "MDA", playable: false, fidelity: "standard",
        identity: { name: "Moldova", adjective: "Moldovan", capital: "Chisinau", government: "charter-parliamentary-republic", languages: ["Romanian", "Russian"], currency: "MDL" },
        geo: { region: "region-eastern-europe", lat: 47, lon: 28.85, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.15, earthquake: 0.1 } },
        traits: { aggression: 0.25, opportunism: 0.39, legalism: 0.52, isolationism: 0.41, riskTolerance: 0.4, vengefulness: 0.27, reliability: 0.52, transparency: 0.46, agendas: [{ id: "eu-integration", description: "Move from EU candidate to member despite Russian pressure", weight: 0.7 }, { id: "territorial-reunification", description: "Bring Transnistria back under its government without a war", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-integrity", description: "Transnistria is its territory; Russian troops there are an occupation." }], alignmentPull: ["USA"] },
    },
    // Factbook: semi-presidential republic
    {
        id: "ROU", playable: false, fidelity: "standard",
        identity: { name: "Romania", adjective: "Romanian", capital: "Bucharest", government: "charter-presidential-republic", languages: ["Romanian", "Hungarian"], currency: "RON" },
        geo: { region: "region-eastern-europe", lat: 44.43, lon: 26.1, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.15, earthquake: 0.1 } },
        traits: { aggression: 0.24, opportunism: 0.39, legalism: 0.58, isolationism: 0.27, riskTolerance: 0.39, vengefulness: 0.25, reliability: 0.58, transparency: 0.48, agendas: [{ id: "black-sea-security", description: "Hold NATO's line on the Black Sea against Russian pressure", weight: 0.7 }, { id: "moldova-partnership", description: "Anchor Moldova's pull toward the EU", weight: 0.4 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "collective-defense", description: "An attack on its territory or its Black Sea coast is an attack on NATO." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "EST", playable: false, fidelity: "standard",
        identity: { name: "Estonia", adjective: "Estonian", capital: "Tallinn", government: "charter-parliamentary-republic", languages: ["Estonian", "Russian"], currency: "EUR" },
        geo: { region: "region-northern-europe", lat: 59.43, lon: 24.72, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.1 } },
        traits: { aggression: 0.21, opportunism: 0.38, legalism: 0.74, isolationism: 0.3, riskTolerance: 0.37, vengefulness: 0.18, reliability: 0.71, transparency: 0.68, agendas: [{ id: "forward-defense", description: "Keep allied troops forward in the Baltics", weight: 0.8 }, { id: "digital-services", description: "Sell its e-government model and cyber know-how abroad", weight: 0.4 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "border-inviolability", description: "Not one meter of its territory is open to Russian probing." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "FIN", playable: false, fidelity: "standard",
        identity: { name: "Finland", adjective: "Finnish", capital: "Helsinki", government: "charter-parliamentary-republic", languages: ["Finnish", "Swedish"], currency: "EUR" },
        geo: { region: "region-northern-europe", lat: 60.17, lon: 24.93, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.1 } },
        traits: { aggression: 0.18, opportunism: 0.37, legalism: 0.81, isolationism: 0.28, riskTolerance: 0.36, vengefulness: 0.15, reliability: 0.78, transparency: 0.76, agendas: [{ id: "eastern-border-defense", description: "Hold the longest NATO land border with Russia", weight: 0.8 }, { id: "arctic-cooperation", description: "Keep Arctic cooperation alive among the Nordic states", weight: 0.4 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "border-inviolability", description: "No foreign force crosses its eastern border." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "LVA", playable: false, fidelity: "standard",
        identity: { name: "Latvia", adjective: "Latvian", capital: "Riga", government: "charter-parliamentary-republic", languages: ["Latvian", "Russian"], currency: "EUR" },
        geo: { region: "region-northern-europe", lat: 56.95, lon: 24.1, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.1 } },
        traits: { aggression: 0.22, opportunism: 0.38, legalism: 0.69, isolationism: 0.32, riskTolerance: 0.38, vengefulness: 0.2, reliability: 0.66, transparency: 0.61, agendas: [{ id: "eastern-border-defense", description: "Fortify its border with Russia and Belarus", weight: 0.8 }, { id: "energy-independence", description: "Stay off Russian electricity and gas for good", weight: 0.5 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "collective-defense", description: "An attack on it is an attack on NATO." }], alignmentPull: ["USA"] },
    },
    // Factbook: semi-presidential republic
    {
        id: "LTU", playable: false, fidelity: "standard",
        identity: { name: "Lithuania", adjective: "Lithuanian", capital: "Vilnius", government: "charter-presidential-republic", languages: ["Lithuanian", "Russian"], currency: "EUR" },
        geo: { region: "region-northern-europe", lat: 54.68, lon: 25.32, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.1 } },
        traits: { aggression: 0.2, opportunism: 0.38, legalism: 0.72, isolationism: 0.27, riskTolerance: 0.36, vengefulness: 0.18, reliability: 0.7, transparency: 0.63, agendas: [{ id: "suwalki-gap-defense", description: "Keep the Suwalki corridor between Belarus and Kaliningrad open", weight: 0.8 }, { id: "democracy-coalition", description: "Stand with democracies under pressure from Moscow and Beijing", weight: 0.4 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "baltic-security", description: "No Russian encroachment on its airspace or Baltic approaches." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "ALB", playable: false, fidelity: "standard",
        identity: { name: "Albania", adjective: "Albanian", capital: "Tirana", government: "charter-parliamentary-republic", languages: ["Albanian"], currency: "ALL" },
        geo: { region: "region-southern-europe", lat: 41.32, lon: 19.82, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 } },
        traits: { aggression: 0.26, opportunism: 0.4, legalism: 0.51, isolationism: 0.4, riskTolerance: 0.4, vengefulness: 0.27, reliability: 0.53, transparency: 0.41, agendas: [{ id: "eu-integration", description: "Close its EU accession talks this decade", weight: 0.6 }, { id: "tourism-growth", description: "Grow the tourism economy along its Adriatic coast", weight: 0.4 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-integrity", description: "Its borders and its coast are not open to renegotiation." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary democracy
    {
        id: "AND", playable: false, fidelity: "thin",
        identity: { name: "Andorra", adjective: "Andorran", capital: "Andorra la Vella", government: "charter-parliamentary-republic", languages: ["Catalan"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 42.5, lon: 1.52, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.1 } },
        traits: { aggression: 0.16, opportunism: 0.4, legalism: 0.7, isolationism: 0.46, riskTolerance: 0.31, vengefulness: 0.18, reliability: 0.7, transparency: 0.58, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "BIH", playable: false, fidelity: "thin",
        identity: { name: "Bosnia and Herzegovina", adjective: "Bosnian", capital: "Sarajevo", government: "charter-parliamentary-republic", languages: ["Bosnian", "Croatian"], currency: "BAM" },
        geo: { region: "region-southern-europe", lat: 43.87, lon: 18.42, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 } },
        traits: { aggression: 0.27, opportunism: 0.42, legalism: 0.48, isolationism: 0.38, riskTolerance: 0.41, vengefulness: 0.31, reliability: 0.47, transparency: 0.35, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "HRV", playable: false, fidelity: "standard",
        identity: { name: "Croatia", adjective: "Croatian", capital: "Zagreb", government: "charter-parliamentary-republic", languages: ["Croatian", "Serbian"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 45.8, lon: 16, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 } },
        traits: { aggression: 0.22, opportunism: 0.39, legalism: 0.59, isolationism: 0.31, riskTolerance: 0.37, vengefulness: 0.22, reliability: 0.59, transparency: 0.52, agendas: [{ id: "adriatic-energy-hub", description: "Build its island LNG terminal into a regional energy hub", weight: 0.5 }, { id: "regional-leadership", description: "Shape the Western Balkans' road into the EU", weight: 0.4 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "territorial-integrity", description: "Its borders as settled after the 1990s wars are final." }], alignmentPull: ["USA"] },
    },
    // Factbook: Republic of Cyprus - presidential republic
    {
        id: "CYP", playable: false, fidelity: "standard",
        identity: { name: "Cyprus", adjective: "Cypriot", capital: "Nicosia", government: "charter-presidential-republic", languages: ["Greek", "Turkish"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 35.17, lon: 33.37, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 } },
        traits: { aggression: 0.22, opportunism: 0.38, legalism: 0.63, isolationism: 0.26, riskTolerance: 0.38, vengefulness: 0.22, reliability: 0.63, transparency: 0.57, agendas: [{ id: "reunification", description: "Reunify the island on terms that end the Turkish occupation of the north", weight: 0.7 }, { id: "gas-resource-revenue", description: "Develop the gas fields in its exclusive economic zone", weight: 0.5 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "maritime-claims", description: "No drilling in its exclusive economic zone without its consent." }], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "GRC", playable: false, fidelity: "standard",
        identity: { name: "Greece", adjective: "Greek", capital: "Athens", government: "charter-parliamentary-republic", languages: ["Greek"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 37.98, lon: 23.73, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.35, wildfire: 0.35, drought: 0.15 } },
        traits: { aggression: 0.24, opportunism: 0.38, legalism: 0.59, isolationism: 0.28, riskTolerance: 0.4, vengefulness: 0.23, reliability: 0.56, transparency: 0.55, agendas: [{ id: "aegean-claims", description: "Defend its reading of Aegean sovereignty and airspace against Turkey", weight: 0.7 }, { id: "shipping-hub", description: "Keep the world's largest merchant fleet trading freely", weight: 0.5 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-waters", description: "No challenge to its islands' territorial waters goes unanswered." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "XKX", playable: false, fidelity: "thin",
        identity: { name: "Kosovo", adjective: "Kosovar", capital: "Pristina", government: "charter-parliamentary-republic", languages: ["Albanian", "Serbian"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 42.67, lon: 21.17, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 } },
        traits: { aggression: 0.26, opportunism: 0.4, legalism: 0.54, isolationism: 0.41, riskTolerance: 0.41, vengefulness: 0.28, reliability: 0.53, transparency: 0.44, agendas: [] },
        doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "MLT", playable: false, fidelity: "thin",
        identity: { name: "Malta", adjective: "Maltese", capital: "Valletta", government: "charter-parliamentary-republic", languages: ["Maltese", "English"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 35.88, lon: 14.5, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.15 } },
        traits: { aggression: 0.19, opportunism: 0.38, legalism: 0.64, isolationism: 0.26, riskTolerance: 0.35, vengefulness: 0.2, reliability: 0.62, transparency: 0.57, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "MNE", playable: false, fidelity: "standard",
        identity: { name: "Montenegro", adjective: "Montenegrin", capital: "Podgorica", government: "charter-parliamentary-republic", languages: ["Montenegrin", "Serbian"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 42.43, lon: 19.27, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 } },
        traits: { aggression: 0.23, opportunism: 0.39, legalism: 0.56, isolationism: 0.42, riskTolerance: 0.38, vengefulness: 0.24, reliability: 0.56, transparency: 0.48, agendas: [{ id: "eu-integration", description: "Be the next Western Balkan country into the EU", weight: 0.6 }, { id: "debt-relief", description: "Repay the Chinese loan behind its unfinished highway", weight: 0.4 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "governance-model", description: "No foreign hand in its elections or its church disputes." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "MKD", playable: false, fidelity: "standard",
        identity: { name: "North Macedonia", adjective: "Macedonian", capital: "Skopje", government: "charter-parliamentary-republic", languages: ["Macedonian", "Albanian"], currency: "MKD" },
        geo: { region: "region-southern-europe", lat: 42, lon: 21.43, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 } },
        traits: { aggression: 0.25, opportunism: 0.4, legalism: 0.51, isolationism: 0.36, riskTolerance: 0.39, vengefulness: 0.26, reliability: 0.51, transparency: 0.42, agendas: [{ id: "eu-integration", description: "Open EU accession talks its neighbors keep vetoing", weight: 0.6 }, { id: "institution-building", description: "Keep the Ohrid Agreement's ethnic balance holding", weight: 0.4 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-unity", description: "No partition along ethnic lines." }], alignmentPull: ["USA"] },
    },
    // Factbook: semi-presidential republic
    {
        id: "PRT", playable: false, fidelity: "standard",
        identity: { name: "Portugal", adjective: "Portuguese", capital: "Lisbon", government: "charter-parliamentary-republic", languages: ["Portuguese"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 38.72, lon: -9.13, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { wildfire: 0.35, drought: 0.2, earthquake: 0.15 } },
        traits: { aggression: 0.2, opportunism: 0.37, legalism: 0.69, isolationism: 0.27, riskTolerance: 0.37, vengefulness: 0.19, reliability: 0.66, transparency: 0.63, agendas: [{ id: "atlantic-partnership", description: "Keep the Azores and the Atlantic link central to NATO", weight: 0.5 }, { id: "debt-reduction", description: "Keep its public debt on the downward path the eurozone expects", weight: 0.5 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "maritime-approaches", description: "No hostile naval presence in its Atlantic approaches around the Azores and Madeira." }], alignmentPull: ["USA"] },
    },
    // Factbook: parliamentary republic
    {
        id: "SMR", playable: false, fidelity: "thin",
        identity: { name: "San Marino", adjective: "Sammarinese", capital: "San Marino", government: "charter-parliamentary-republic", languages: ["Italian"], currency: "EUR" },
        geo: { region: "region-southern-europe", lat: 43.93, lon: 12.42, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.1 } },
        traits: { aggression: 0.17, opportunism: 0.38, legalism: 0.7, isolationism: 0.25, riskTolerance: 0.33, vengefulness: 0.16, reliability: 0.67, transparency: 0.64, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: parliamentary republic
    {
        id: "SRB", playable: false, fidelity: "standard",
        identity: { name: "Serbia", adjective: "Serbian", capital: "Belgrade", government: "charter-parliamentary-republic", languages: ["Serbian", "Hungarian"], currency: "RSD" },
        geo: { region: "region-southern-europe", lat: 44.83, lon: 20.5, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 } },
        traits: { aggression: 0.28, opportunism: 0.42, legalism: 0.49, isolationism: 0.3, riskTolerance: 0.41, vengefulness: 0.3, reliability: 0.51, transparency: 0.34, agendas: [{ id: "kosovo-claims", description: "Refuse to recognize Kosovo's independence", weight: 0.8 }, { id: "multi-vector-diplomacy", description: "Balance EU accession against its ties to Russia and China", weight: 0.6 }] },
        doctrine: { posture: "balanced", redLines: [{ id: "territorial-claims", description: "It will not accept Kosovo as a sovereign state." }], alignmentPull: ["RUS"] },
    },
    // Factbook: federal parliamentary republic
    {
        id: "AUT", playable: false, fidelity: "standard",
        identity: { name: "Austria", adjective: "Austrian", capital: "Vienna", government: "charter-parliamentary-republic", languages: ["German"], currency: "EUR" },
        geo: { region: "region-western-europe", lat: 48.2, lon: 16.37, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.2 } },
        traits: { aggression: 0.19, opportunism: 0.37, legalism: 0.76, isolationism: 0.22, riskTolerance: 0.37, vengefulness: 0.19, reliability: 0.74, transparency: 0.67, agendas: [{ id: "neutrality-preservation", description: "Keep the neutrality the 1955 State Treaty settled while sitting inside the EU", weight: 0.6 }, { id: "energy-diversification", description: "Wean its gas supply off Russian pipelines", weight: 0.5 }] },
        doctrine: { posture: "defensive", redLines: [{ id: "military-neutrality", description: "No foreign troops based on its soil and no military alliance." }], alignmentPull: [] },
    },
    // Factbook: constitutional monarchy
    {
        id: "LIE", playable: false, fidelity: "thin",
        identity: { name: "Liechtenstein", adjective: "Liechtensteiner", capital: "Vaduz", government: "charter-parliamentary-republic", languages: ["German"], currency: "CHF" },
        geo: { region: "region-western-europe", lat: 47.13, lon: 9.52, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.1 } },
        traits: { aggression: 0.14, opportunism: 0.39, legalism: 0.76, isolationism: 0.42, riskTolerance: 0.31, vengefulness: 0.15, reliability: 0.75, transparency: 0.67, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: constitutional monarchy
    {
        id: "LUX", playable: false, fidelity: "thin",
        identity: { name: "Luxembourg", adjective: "Luxembourgish", capital: "Luxembourg", government: "charter-parliamentary-republic", languages: ["Luxembourgish", "German"], currency: "EUR" },
        geo: { region: "region-western-europe", lat: 49.6, lon: 6.12, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.1 } },
        traits: { aggression: 0.16, opportunism: 0.38, legalism: 0.78, isolationism: 0.05, riskTolerance: 0.34, vengefulness: 0.15, reliability: 0.77, transparency: 0.73, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
    // Factbook: constitutional monarchy
    {
        id: "MCO", playable: false, fidelity: "thin",
        identity: { name: "Monaco", adjective: "Monegasque", capital: "Monaco", government: "charter-parliamentary-republic", languages: ["French", "English"], currency: "EUR" },
        geo: { region: "region-western-europe", lat: 43.73, lon: 7.42, neighbors: [], coastline: true, chokepoints: [], disasterExposure: {} },
        traits: { aggression: 0.17, opportunism: 0.41, legalism: 0.7, isolationism: 0.41, riskTolerance: 0.32, vengefulness: 0.19, reliability: 0.72, transparency: 0.6, agendas: [] },
        doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
    },
];
