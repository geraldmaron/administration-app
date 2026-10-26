import { NationInput } from "../schemas/nation.js";
import type { NationId } from "../schemas/ids.js";
import { fillSectorMix, US_SECTOR_EXTRA } from "./sectors.js";
import { composeNation, type NationDraft } from "./compose-nation.js";
import { NATION_FIGURES } from "./nation-figures.generated.js";
import { africaDrafts } from "./nations-africa.js";
import { americasDrafts } from "./nations-americas.js";
import { asiaDrafts } from "./nations-asia.js";
import { europeDrafts } from "./nations-europe.js";
import { menaDrafts } from "./nations-mena.js";
import { oceaniaDrafts } from "./nations-oceania.js";

// The real-nation set. The United States is the seat of play — the only
// record with `playable: true`; the rest are NPCs (`playable` stays a
// per-nation field so the setup flow can reopen nations later). The first 12
// (through Iceland below) were chosen to cover every NationArchetype at least
// once so the band system has no empty tier; the next 38 broaden region and
// power-tier coverage across every inhabited continent.
//
// The eleven entries after Australia were admitted on a depth score rather
// than on taste: two-way goods trade with the United States and treaty or
// adversary standing carry more weight in it than economic mass, because the
// question a roster has to answer is how often a country lands on this
// President's desk, not how large it is. That is why Ireland is here and
// several larger economies are not. How deep each record goes varies with
// where it scored — an order of battle, a third agenda, a second red line and
// a full disaster-exposure set are what the top of the range buys — but no
// entry omits a NationStats scalar, because the schema does not allow one to.
//
// Provenance ("a number can be checked, not trusted"): every figure below
// is approximate, order-of-magnitude-correct public data (IMF World
// Economic Outlook, World Bank national accounts, SIPRI Military
// Expenditure Database, CIA World Factbook), circa 2023, hand-rounded for
// the dataset's units (GDP/trade/reserves/budget in USD millions). Treat
// every value as "plausible for game balance", not as a cited figure for
// any use outside this game — several of these economies (North Korea
// above all) do not publish reliable statistics and the entries here are
// informed estimates, not sourced accounting. No real living person is
// named in any record; only country-level aggregates are modeled.
//
// The three rates are the exception, and are sourced rather than rounded:
// `economy.growth`, `inflation` and `unemployment` are each held to the
// nation's macro anchor (macro-anchors.ts, vendored with its source and year),
// because the engine rests every economy on its authored record, so a typed
// rate would be a resting point nobody published. Where no anchor source has a
// rate inside its window (Taiwan's three, North Korea's and Yemen's growth and
// inflation, and the inflation of Venezuela, Cuba, Syria and the DR Congo),
// the typed figure stands.
// Per-nation calibration rationale is recorded in the comment above each
// entry.
//
// The vital rates (birthRate, deathRate, netMigration) are stored as fractions
// per person per year; a player surface renders them per 1,000. Births and
// deaths are approximate crude rates circa 2023 (UN World Population Prospects,
// CIA World Factbook), hand-rounded to a tenth per 1,000. Net migration is the
// residual that closes the demographers' own identity against the growth rate
// already authored here — natural increase plus net migration is total growth —
// which is why three of the war rows (Yemen, Ukraine, Syria) carry an outflow
// far larger than any peacetime figure: that is what this dataset's authored
// growth rate for those countries says is happening to them.
//
// `economy.costOfLiving` is an index against this snapshot, so it is 1 on every
// row by definition. `economy.debt` is the nominal stock in USD millions,
// converted once from the retired `debtToGdp` field at `ratio x gdp`; the
// retired ratios are recorded in fiscal-identities.ts and the validator holds
// the derived ratio to them.
//
// Charter mapping: the seven generic charters (charters.ts) model
// institution shape and removal mechanism, not real-world political
// science distinctions. Several mappings below are deliberately approximate
// (China and Vietnam's one-party systems have no clean analogue among the
// seven; North Korea's hereditary succession is modeled as an absolute
// monarchy despite the different formal title) — each is flagged inline.
// Geography (neighbors, chokepoints), memberships, and trade partners are
// left empty in these records on purpose — each is filled at dataset assembly
// (geography.ts, orgs-cradles.ts, trade.ts) so there is exactly one place any
// of them is stated. Editing topPartners or tradeDependence here has no
// effect; assembly overwrites both. alignmentPull is authored where a
// nation's real-world security, trade or patron relationship leans clearly
// toward one of the great powers `bands.ts` reads (`ALIGNED_POLES` /
// `OPPOSED_POLES`); it is left empty rather than guessed for a nation whose
// stated policy is non-alignment or armed neutrality, or whose real posture
// is too genuinely split to assign a single lean.

export const US_ID = "USA" as NationId;
export const CHINA_ID = "CHN" as NationId;
export const GERMANY_ID = "DEU" as NationId;
export const NIGERIA_ID = "NGA" as NationId;
export const POLAND_ID = "POL" as NationId;
export const SAUDI_ID = "SAU" as NationId;
export const SINGAPORE_ID = "SGP" as NationId;
export const IRAQ_ID = "IRQ" as NationId;
export const NORTH_KOREA_ID = "PRK" as NationId;
export const BELARUS_ID = "BLR" as NationId;
export const VIETNAM_ID = "VNM" as NationId;
export const ICELAND_ID = "ISL" as NationId;
export const BRAZIL_ID = "BRA" as NationId;
export const COLOMBIA_ID = "COL" as NationId;
export const VENEZUELA_ID = "VEN" as NationId;
export const CUBA_ID = "CUB" as NationId;
export const CANADA_ID = "CAN" as NationId;
export const MEXICO_ID = "MEX" as NationId;
export const INDIA_ID = "IND" as NationId;
export const PAKISTAN_ID = "PAK" as NationId;
export const BANGLADESH_ID = "BGD" as NationId;
export const AFGHANISTAN_ID = "AFG" as NationId;
export const KAZAKHSTAN_ID = "KAZ" as NationId;
export const IRAN_ID = "IRN" as NationId;
export const ISRAEL_ID = "ISR" as NationId;
export const UAE_ID = "ARE" as NationId;
export const TURKEY_ID = "TUR" as NationId;
export const YEMEN_ID = "YEM" as NationId;
export const SYRIA_ID = "SYR" as NationId;
export const EGYPT_ID = "EGY" as NationId;
export const SOUTH_AFRICA_ID = "ZAF" as NationId;
export const ETHIOPIA_ID = "ETH" as NationId;
export const DR_CONGO_ID = "COD" as NationId;
export const RWANDA_ID = "RWA" as NationId;
export const MOROCCO_ID = "MAR" as NationId;
export const ALGERIA_ID = "DZA" as NationId;
export const UK_ID = "GBR" as NationId;
export const FRANCE_ID = "FRA" as NationId;
export const ITALY_ID = "ITA" as NationId;
export const SPAIN_ID = "ESP" as NationId;
export const UKRAINE_ID = "UKR" as NationId;
export const RUSSIA_ID = "RUS" as NationId;
export const SWEDEN_ID = "SWE" as NationId;
export const SWITZERLAND_ID = "CHE" as NationId;
export const HUNGARY_ID = "HUN" as NationId;
export const JAPAN_ID = "JPN" as NationId;
export const SOUTH_KOREA_ID = "KOR" as NationId;
export const TAIWAN_ID = "TWN" as NationId;
export const AUSTRALIA_ID = "AUS" as NationId;
export const INDONESIA_ID = "IDN" as NationId;

export const NETHERLANDS_ID = "NLD" as NationId;
export const THAILAND_ID = "THA" as NationId;
export const PHILIPPINES_ID = "PHL" as NationId;
export const BELGIUM_ID = "BEL" as NationId;
export const ARGENTINA_ID = "ARG" as NationId;
export const NORWAY_ID = "NOR" as NationId;
export const MALAYSIA_ID = "MYS" as NationId;
export const QATAR_ID = "QAT" as NationId;
export const IRELAND_ID = "IRL" as NationId;
export const DENMARK_ID = "DNK" as NationId;
export const CHILE_ID = "CHL" as NationId;

// Great power, powerTier 5, and the seat of play. Its government points at
// the fully authored constitutional charter in usa.ts (impeachment by
// Congress, American cabinet titles) rather than the generic
// presidential-republic shape the NPC republics share. Reserves are
// modest relative to GDP because the dollar's reserve-currency status means
// the US holds far less forex than its economic weight would otherwise
// imply — not a data-entry error.
export const usNation = NationInput.parse({
  id: US_ID,
  playable: true,
  identity: { name: "United States", adjective: "American", capital: "Washington, D.C.", government: "charter-usa-constitution", languages: ["English"], currency: "USD", definiteArticle: true },
  // Exposure weights in the proportions of the federal declaration record:
  // 1,616 declarations since 2015 break down as severe storm 278 and tornado 21,
  // flood 167, hurricane 75 and tropical storm 18, biological 59, winter storm 22
  // with snowstorm 18 and ice storm 14, and fire 32. Severe storm and tornado are
  // read together and carried on `tornado`, which makes it the country's largest
  // hazard, as it is. Wildfire is held well above its major-disaster share
  // because the federal fire response runs through fire-management grants
  // instead — 25 to 78 a year, and 254 of them to California, Washington and
  // Oregon alone. Earthquake, drought and heat wave are not in the record's top
  // categories at all: an earthquake and a drought are declared rarely, and heat
  // is answered by states and utilities rather than declared, so each carries the
  // floor that says it happens without saying it is common.
  geo: { region: "region-north-america", lat: 38.9, lon: -77.0, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { tornado: 0.6, flood: 0.33, wildfire: 0.3, cyclone: 0.2, "winter-storm": 0.11, earthquake: 0.1, drought: 0.1, "heat-wave": 0.1, pandemic: 0.08 } },
  // Debt held by the public, CBO's 101% of output for FY2026: what the Treasury
  // borrows against in the market, not the gross figure that counts what one
  // part of the government owes another.
  stats: {
    demography: { population: 334_892_847, urbanization: 0.83, medianAge: 38, growthRate: 0.004, literacy: 0.99, birthRate: 0.012, deathRate: 0.0095, netMigration: 0.0015 },
    economy: { gdp: 27_498_847, gdpPerCapita: 80_600, growth: 0.028, inflation: 0.029495, unemployment: 0.040167, costOfLiving: 1, debt: 27_773_835, reserves: 240_000, sovereignRating: "AA" },
    trade: { exports: 2_100_000, imports: 3_200_000, balance: -1_100_000, topExports: ["energy-oil", "aerospace", "semiconductors"], topPartners: [], tradeDependence: {} },
    energy: { production: 22_000, consumption: 21_500, importDependence: 0.1, mix: { "energy-gas": 0.4, "energy-oil": 0.35, "energy-nuclear": 0.08, "energy-renewables": 0.17 } },
    military: {
      budget: 886_427, activeHeadcount: 1_388_484, reserveHeadcount: 799_827, readiness: 0.85, doctrineQuality: 0.9,
      branchStrength: { land: 0.7, air: 0.9, naval: 0.85, cyber: 0.9, space: 0.9 },
      airliftCapacity: 0.95, sealiftCapacity: 0.85, arsenal: { warheads: 5_500, deliveryTriad: true }, basesAbroad: 750,
      // The played nation carries the full decomposition, because every screen
      // reads it and the engine draws deployments out of it. Branch headcounts
      // are the published service strengths re-based onto the `activeHeadcount`
      // above rather than copied raw: the sources that quote per-service
      // strength and the ones that quote a department total fold the reserve
      // components and the Coast Guard in differently, so the raw figures sum
      // about six percent short of the total beside them. Re-basing keeps the
      // real proportions (the Army is a third of the force, the Space Force is
      // a rounding error) and lets the sum check be tight enough to catch an
      // actual authoring error.
      orderOfBattle: {
        army: {
          headcount: 481_300,
          capabilities: [
            { name: "army.division", count: 10 },
            { name: "army.airborne-division", count: 2 },
            { name: "army.armored-brigade", count: 11 },
          ],
          units: [
            { type: "army.brigade-combat-team", count: 31, readiness: 0.72 },
            { type: "army.combat-aviation-brigade", count: 11, readiness: 0.7 },
            { type: "army.air-defense-battalion", count: 15, readiness: 0.65 },
          ],
        },
        navy: {
          headcount: 362_100,
          capabilities: [
            { name: "navy.carrier-strike-group", count: 11 },
            { name: "navy.ballistic-missile-submarine", count: 14 },
            { name: "navy.amphibious-ready-group", count: 3 },
          ],
          units: [
            { type: "navy.aircraft-carrier", count: 11, readiness: 0.62 },
            { type: "navy.attack-submarine", count: 49, readiness: 0.65 },
            { type: "navy.ballistic-missile-submarine", count: 14, readiness: 0.8 },
            { type: "navy.surface-combatant", count: 90, readiness: 0.68 },
            { type: "navy.amphibious-ship", count: 31, readiness: 0.6 },
          ],
        },
        air: {
          headcount: 346_100,
          capabilities: [
            { name: "air.fighter-squadron", count: 54 },
            { name: "air.bomber-squadron", count: 9 },
            { name: "air.refueling-squadron", count: 30 },
          ],
          units: [
            { type: "air.fighter", count: 1_550, readiness: 0.7 },
            { type: "air.strategic-bomber", count: 140, readiness: 0.55 },
            { type: "air.tanker", count: 450, readiness: 0.68 },
            { type: "air.strategic-airlifter", count: 220, readiness: 0.72 },
          ],
        },
        marines: {
          headcount: 183_100,
          capabilities: [
            { name: "marines.expeditionary-force", count: 3 },
            { name: "marines.littoral-regiment", count: 3 },
          ],
          units: [
            { type: "marines.infantry-regiment", count: 21, readiness: 0.75 },
            { type: "marines.expeditionary-unit", count: 7, readiness: 0.7 },
          ],
        },
        space: {
          headcount: 9_200,
          capabilities: [{ name: "space.delta", count: 14 }],
          units: [
            { type: "space.missile-warning-constellation", count: 4, readiness: 0.85 },
            { type: "space.navigation-satellite", count: 31, readiness: 0.9 },
          ],
        },
        cyber: {
          headcount: 6_700,
          capabilities: [{ name: "cyber.mission-force-team", count: 133 }],
          units: [
            { type: "cyber.national-mission-team", count: 39, readiness: 0.8 },
            { type: "cyber.combat-mission-team", count: 68, readiness: 0.75 },
          ],
        },
      },
    },
    security: { crimeIndex: 0.35, corruptionIndex: 0.2, insurgencyPressure: 0.05, borderControl: 0.6, intelCapability: 0.9, counterIntel: 0.85 },
    politics: { regimeStability: 0.75, legitimacy: 0.7, factionalism: 0.6, pressFreedom: 0.75, protestPressure: 0.35 },
    softPower: { diplomaticReach: 0.95, culturalReach: 0.95, aidGiven: 55_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "aerospace", "semiconductors"], { "energy-gas": 0.4, "energy-oil": 0.35, "energy-nuclear": 0.08, "energy-renewables": 0.17 }, 334_892_847, 0.038, US_SECTOR_EXTRA),
  traits: {
    aggression: 0.55, opportunism: 0.5, legalism: 0.6, isolationism: 0.15, riskTolerance: 0.55, vengefulness: 0.4, reliability: 0.65, transparency: 0.55,
    agendas: [
      { id: "great-power-competition", description: "Contest strategic influence with peer competitors", weight: 0.7 },
      { id: "alliance-leadership", description: "Sustain leadership of its treaty alliance network", weight: 0.6 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "homeland-defense", description: "No foreign military strike on US territory or forces goes unanswered." }], alignmentPull: [] },
});

// Great power, powerTier 5. Charter mapping is an approximation (see file
// header) — presidential-republic is the closest available shape for a
// single, term-bound national executive, though CCP leadership succession
// does not actually run through impeachment. wealthTier (4, below the US's
// 5) reflects per-capita wealth, not aggregate GDP, which is the dataset's
// convention for this tier.
export const chinaNation = NationInput.parse({
  id: CHINA_ID,
  playable: false,
  identity: { name: "China", adjective: "Chinese", capital: "Beijing", government: "charter-presidential-republic", languages: ["Mandarin"], currency: "CNY" },
  geo: { region: "region-east-asia", lat: 39.9, lon: 116.4, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, flood: 0.25, drought: 0.15, cyclone: 0.2 } },
  stats: {
    demography: { population: 1_411_748_291, urbanization: 0.65, medianAge: 39, growthRate: -0.001, literacy: 0.97, birthRate: 0.0064, deathRate: 0.0074, netMigration: 0 },
    economy: { gdp: 17_892_847, gdpPerCapita: 12_535, growth: 0.049583, inflation: 0.002181, unemployment: 0.0459, costOfLiving: 1, debt: 13_777_492, reserves: 3_200_000, sovereignRating: "A" },
    trade: { exports: 3_380_000, imports: 2_560_000, balance: 820_000, topExports: ["semiconductors", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 27_000, consumption: 28_500, importDependence: 0.2, mix: { "energy-oil": 0.579, "energy-renewables": 0.368, "energy-nuclear": 0.053 } },
    military: {
      budget: 296_847, activeHeadcount: 2_049_381, reserveHeadcount: 517_294, readiness: 0.7, doctrineQuality: 0.65,
      branchStrength: { land: 0.75, air: 0.7, naval: 0.75, cyber: 0.75, space: 0.6 },
      airliftCapacity: 0.5, sealiftCapacity: 0.6, arsenal: { warheads: 500, deliveryTriad: true }, basesAbroad: 5,
      orderOfBattle: {
        army: {
          headcount: 1_159_000,
          capabilities: [
            { name: "army.group-army", count: 13 },
            { name: "army.brigade-combat-team", label: "Combined-arms brigades", count: 78 },
          ],
          units: [
            { type: "army.brigade-combat-team", count: 78, readiness: 0.62 },
            { type: "army.air-defense-battalion", count: 24, readiness: 0.58 },
          ],
        },
        navy: {
          headcount: 275_000,
          capabilities: [
            { name: "navy.carrier-strike-group", count: 3 },
            { name: "navy.surface-action-group", count: 12 },
          ],
          units: [
            { type: "navy.aircraft-carrier", count: 3, readiness: 0.55 },
            { type: "navy.surface-combatant", count: 80, readiness: 0.6 },
            { type: "navy.attack-submarine", count: 60, readiness: 0.58 },
          ],
        },
        air: {
          headcount: 418_000,
          capabilities: [{ name: "air.fighter-brigade", count: 40 }],
          units: [
            { type: "air.fighter", count: 1_200, readiness: 0.6 },
            { type: "air.strategic-bomber", count: 200, readiness: 0.5 },
          ],
        },
        marines: {
          headcount: 42_000,
          capabilities: [{ name: "marines.brigade", count: 8 }],
          units: [{ type: "marines.infantry-regiment", count: 8, readiness: 0.65 }],
        },
        space: {
          headcount: 85_000,
          capabilities: [{ name: "space.missile-warning-constellation", count: 6, label: "Tracking and missile-warning systems" }],
          units: [{ type: "space.missile-warning-constellation", count: 3, readiness: 0.7 }],
        },
        cyber: {
          headcount: 69_000,
          capabilities: [{ name: "cyber.mission-force-team", count: 20, label: "Theater cyber units" }],
          units: [{ type: "cyber.national-mission-team", count: 20, readiness: 0.7 }],
        },
      },
    },
    security: { crimeIndex: 0.2, corruptionIndex: 0.45, insurgencyPressure: 0.15, borderControl: 0.85, intelCapability: 0.85, counterIntel: 0.92 },
    politics: { regimeStability: 0.8, legitimacy: 0.55, factionalism: 0.2, pressFreedom: 0.1, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.8, culturalReach: 0.5, aidGiven: 8_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["semiconductors", "textiles"], { "energy-oil": 0.579, "energy-renewables": 0.368, "energy-nuclear": 0.053 }, 1_411_748_291, 0.05),
  traits: {
    aggression: 0.5, opportunism: 0.55, legalism: 0.4, isolationism: 0.3, riskTolerance: 0.4, vengefulness: 0.45, reliability: 0.55, transparency: 0.2,
    agendas: [
      { id: "regional-primacy", description: "Establish uncontested primacy in its home region", weight: 0.75 },
      { id: "supply-chain-leverage", description: "Convert manufacturing dominance into strategic leverage", weight: 0.6 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "territorial-claims", description: "No foreign recognition of disputed claims contrary to its stated territorial position." }], alignmentPull: [RUSSIA_ID] },
});

// Regional power, powerTier 4. Federal parliamentary republic (chancellor
// answerable to the Bundestag) — parliamentary-republic is an accurate fit.
export const germanyNation = NationInput.parse({
  id: GERMANY_ID,
  playable: false,
  identity: { name: "Germany", adjective: "German", capital: "Berlin", government: "charter-parliamentary-republic", languages: ["German"], currency: "EUR" },
  geo: { region: "region-western-europe", lat: 52.5, lon: 13.4, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.15 } },
  stats: {
    demography: { population: 84_382_747, urbanization: 0.78, medianAge: 45, growthRate: 0.001, literacy: 0.99, birthRate: 0.0088, deathRate: 0.012, netMigration: 0.0042 },
    economy: { gdp: 4_574_847, gdpPerCapita: 53_571, growth: -0.004959, inflation: 0.022565, unemployment: 0.034, costOfLiving: 1, debt: 3_019_399, reserves: 300_000, sovereignRating: "AAA" },
    trade: { exports: 1_700_000, imports: 1_500_000, balance: 200_000, topExports: ["auto", "chemicals"], topPartners: [], tradeDependence: {} },
    energy: { production: 3_000, consumption: 3_100, importDependence: 0.6, mix: { "energy-renewables": 0.5, "energy-gas": 0.278, "energy-oil": 0.222, "energy-nuclear": 0.0 } },
    military: {
      budget: 55_764, activeHeadcount: 184_729, reserveHeadcount: 34_847, readiness: 0.55, doctrineQuality: 0.7,
      branchStrength: { land: 0.5, air: 0.55, naval: 0.4, cyber: 0.6, space: 0.2 },
      airliftCapacity: 0.4, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 5,
    },
    security: { crimeIndex: 0.25, corruptionIndex: 0.15, insurgencyPressure: 0.02, borderControl: 0.8, intelCapability: 0.6, counterIntel: 0.6 },
    politics: { regimeStability: 0.85, legitimacy: 0.8, factionalism: 0.35, pressFreedom: 0.9, protestPressure: 0.25 },
    softPower: { diplomaticReach: 0.85, culturalReach: 0.7, aidGiven: 33_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto", "chemicals"], { "energy-renewables": 0.5, "energy-gas": 0.278, "energy-oil": 0.222, "energy-nuclear": 0.0 }, 84_382_747, 0.03),
  traits: {
    aggression: 0.15, opportunism: 0.3, legalism: 0.85, isolationism: 0.15, riskTolerance: 0.3, vengefulness: 0.15, reliability: 0.85, transparency: 0.8,
    agendas: [
      { id: "coalition-anchor", description: "Anchor its regional bloc's economic and monetary coherence", weight: 0.7 },
      { id: "export-led-growth", description: "Defend export-led industrial competitiveness", weight: 0.55 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "collective-defense", description: "No unilateral withdrawal from its collective-defense commitments." }], alignmentPull: [] },
});

// Regional power, powerTier 3. Accurate charter fit (federal presidential
// republic). Unemployment is the ILO modeled estimate its anchor carries,
// which counts far fewer people than the broad underemployment Nigeria's own
// statistics office reported before its 2023 method change.
export const nigeriaNation = NationInput.parse({
  id: NIGERIA_ID,
  playable: false,
  identity: { name: "Nigeria", adjective: "Nigerian", capital: "Abuja", government: "charter-presidential-republic", languages: ["English", "Hausa", "Yoruba", "Igbo"], currency: "NGN" },
  geo: { region: "region-west-africa", lat: 9.1, lon: 7.4, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.3, drought: 0.2 } },
  stats: {
    demography: { population: 223_847_291, urbanization: 0.53, medianAge: 18, growthRate: 0.024, literacy: 0.62, birthRate: 0.034, deathRate: 0.0105, netMigration: 0.0005 },
    economy: { gdp: 390_000, gdpPerCapita: 1_749, growth: 0.040711, inflation: 0.332417, unemployment: 0.03045, costOfLiving: 1, debt: 156_000, reserves: 33_000, sovereignRating: "B" },
    trade: { exports: 62_000, imports: 55_000, balance: 7_000, topExports: ["energy-oil", "energy-gas", "agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 2_200, consumption: 1_100, importDependence: 0.05, mix: { "energy-oil": 0.5, "energy-gas": 0.4, "energy-renewables": 0.1 } },
    military: {
      budget: 3_100, activeHeadcount: 143_000, reserveHeadcount: 0, readiness: 0.35, doctrineQuality: 0.3,
      branchStrength: { land: 0.4, air: 0.25, naval: 0.2, cyber: 0.1, space: 0.02 },
      airliftCapacity: 0.15, sealiftCapacity: 0.1, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.65, corruptionIndex: 0.7, insurgencyPressure: 0.6, borderControl: 0.3, intelCapability: 0.3, counterIntel: 0.25 },
    politics: { regimeStability: 0.4, legitimacy: 0.45, factionalism: 0.65, pressFreedom: 0.5, protestPressure: 0.55 },
    softPower: { diplomaticReach: 0.4, culturalReach: 0.45, aidGiven: 0, aidReceived: 2_500 },
  },
  sectors: fillSectorMix(["energy-oil", "energy-gas", "agriculture"], { "energy-oil": 0.5, "energy-gas": 0.4, "energy-renewables": 0.1 }, 223_847_291, 0.33),
  traits: {
    aggression: 0.35, opportunism: 0.5, legalism: 0.35, isolationism: 0.2, riskTolerance: 0.55, vengefulness: 0.35, reliability: 0.4, transparency: 0.35,
    agendas: [
      { id: "regional-stabilizer", description: "Lead regional peacekeeping and stabilization efforts", weight: 0.55 },
      { id: "oil-revenue-diversification", description: "Diversify the economy away from oil revenue dependence", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "territorial-unity", description: "No accommodation of secessionist claims against national unity." }], alignmentPull: [] },
});

// Middle power, powerTier 3. Semi-presidential in reality; modeled as
// parliamentary-republic since day-to-day governance runs through the PM
// and Sejm — an approximation, flagged per the file header.
export const polandNation = NationInput.parse({
  id: POLAND_ID,
  playable: false,
  identity: { name: "Poland", adjective: "Polish", capital: "Warsaw", government: "charter-parliamentary-republic", languages: ["Polish"], currency: "PLN" },
  geo: { region: "region-central-europe", lat: 52.2, lon: 21.0, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, drought: 0.15 } },
  stats: {
    demography: { population: 37_700_000, urbanization: 0.6, medianAge: 42, growthRate: -0.001, literacy: 0.99, birthRate: 0.0085, deathRate: 0.0125, netMigration: 0.003 },
    economy: { gdp: 810_000, gdpPerCapita: 21_485, growth: 0.030284, inflation: 0.037906, unemployment: 0.02807, costOfLiving: 1, debt: 405_000, reserves: 170_000, sovereignRating: "A" },
    trade: { exports: 380_000, imports: 370_000, balance: 10_000, topExports: ["auto"], topPartners: [], tradeDependence: {} },
    energy: { production: 900, consumption: 950, importDependence: 0.4, mix: { "energy-oil": 0.526, "energy-renewables": 0.263, "energy-gas": 0.211, "energy-nuclear": 0.0 } },
    military: {
      budget: 30_000, activeHeadcount: 164_000, reserveHeadcount: 35_000, readiness: 0.65, doctrineQuality: 0.6,
      branchStrength: { land: 0.65, air: 0.5, naval: 0.3, cyber: 0.4, space: 0.1 },
      airliftCapacity: 0.3, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.25, corruptionIndex: 0.35, insurgencyPressure: 0.02, borderControl: 0.75, intelCapability: 0.5, counterIntel: 0.5 },
    politics: { regimeStability: 0.7, legitimacy: 0.65, factionalism: 0.55, pressFreedom: 0.6, protestPressure: 0.3 },
    softPower: { diplomaticReach: 0.5, culturalReach: 0.35, aidGiven: 3_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto"], { "energy-oil": 0.526, "energy-renewables": 0.263, "energy-gas": 0.211, "energy-nuclear": 0.0 }, 37_700_000, 0.03),
  traits: {
    aggression: 0.35, opportunism: 0.35, legalism: 0.7, isolationism: 0.2, riskTolerance: 0.45, vengefulness: 0.3, reliability: 0.65, transparency: 0.55,
    agendas: [
      { id: "eastern-flank-rearmament", description: "Rearm rapidly to deter pressure on its eastern flank", weight: 0.75 },
      { id: "bloc-integration", description: "Deepen integration into its regional economic and defense bloc", weight: 0.5 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "border-inviolability", description: "No foreign military transit or incursion across its eastern border." }], alignmentPull: [US_ID] },
});

// Resource exporter, powerTier 3. Accurate charter fit (absolute monarchy,
// royal decree final). Trade balance and reserves both reflect oil-export
// dependence; growth is muted relative to headline oil-price years.
export const saudiNation = NationInput.parse({
  id: SAUDI_ID,
  playable: false,
  identity: { name: "Saudi Arabia", adjective: "Saudi", capital: "Riyadh", government: "charter-absolute-monarchy", languages: ["Arabic"], currency: "SAR" },
  geo: { region: "region-middle-east", lat: 24.7, lon: 46.7, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.25, flood: 0.15 } },
  stats: {
    demography: { population: 36_000_000, urbanization: 0.85, medianAge: 30, growthRate: 0.018, literacy: 0.97, birthRate: 0.0145, deathRate: 0.0035, netMigration: 0.007 },
    economy: { gdp: 1_070_000, gdpPerCapita: 29_722, growth: 0.026489, inflation: 0.016879, unemployment: 0.03518, costOfLiving: 1, debt: 267_500, reserves: 440_000, sovereignRating: "A" },
    trade: { exports: 380_000, imports: 190_000, balance: 190_000, topExports: ["energy-oil", "chemicals"], topPartners: [], tradeDependence: {} },
    energy: { production: 12_000, consumption: 4_000, importDependence: 0.0, mix: { "energy-oil": 0.6, "energy-gas": 0.4 } },
    military: {
      budget: 75_291, activeHeadcount: 258_471, reserveHeadcount: 847, readiness: 0.5, doctrineQuality: 0.45,
      branchStrength: { land: 0.5, air: 0.55, naval: 0.35, cyber: 0.3, space: 0.1 },
      airliftCapacity: 0.4, sealiftCapacity: 0.25, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.15, corruptionIndex: 0.35, insurgencyPressure: 0.2, borderControl: 0.7, intelCapability: 0.55, counterIntel: 0.75 },
    politics: { regimeStability: 0.7, legitimacy: 0.55, factionalism: 0.15, pressFreedom: 0.1, protestPressure: 0.1 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.3, aidGiven: 6_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "chemicals"], { "energy-oil": 0.6, "energy-gas": 0.4 }, 36_000_000, 0.045),
  traits: {
    aggression: 0.4, opportunism: 0.45, legalism: 0.5, isolationism: 0.2, riskTolerance: 0.45, vengefulness: 0.35, reliability: 0.5, transparency: 0.2,
    agendas: [
      { id: "economic-diversification", description: "Diversify state revenue away from hydrocarbons", weight: 0.65 },
      { id: "regional-leadership", description: "Assert leadership within its regional bloc", weight: 0.55 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "succession-integrity", description: "No foreign interference in royal succession." }], alignmentPull: [US_ID] },
});

// Trading hub, powerTier 2. Accurate charter fit (Westminster-style
// parliamentary republic). debtToGdp above 1 reflects gross government debt
// backed by large sovereign assets, not distress — a genuine outlier the
// dataset should be able to represent rather than clamp away.
export const singaporeNation = NationInput.parse({
  id: SINGAPORE_ID,
  playable: false,
  identity: { name: "Singapore", adjective: "Singaporean", capital: "Singapore", government: "charter-parliamentary-republic", languages: ["English", "Mandarin", "Malay", "Tamil"], currency: "SGD" },
  geo: { region: "region-southeast-asia", lat: 1.35, lon: 103.8, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.1, pandemic: 0.15 } },
  stats: {
    demography: { population: 5_900_000, urbanization: 1.0, medianAge: 42, growthRate: 0.01, literacy: 0.97, birthRate: 0.0085, deathRate: 0.006, netMigration: 0.0075 },
    economy: { gdp: 500_000, gdpPerCapita: 84_746, growth: 0.053435, inflation: 0.023895, unemployment: 0.02737, costOfLiving: 1, debt: 650_000, reserves: 400_000, sovereignRating: "AAA" },
    trade: { exports: 670_000, imports: 600_000, balance: 70_000, topExports: ["semiconductors", "energy-oil", "chemicals"], topPartners: [], tradeDependence: {} },
    energy: { production: 20, consumption: 300, importDependence: 0.98, mix: { "energy-gas": 0.95, "energy-renewables": 0.05 } },
    military: {
      budget: 12_000, activeHeadcount: 51_000, reserveHeadcount: 312_000, readiness: 0.6, doctrineQuality: 0.75,
      branchStrength: { land: 0.4, air: 0.55, naval: 0.45, cyber: 0.6, space: 0.05 },
      airliftCapacity: 0.35, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.1, corruptionIndex: 0.05, insurgencyPressure: 0.01, borderControl: 0.9, intelCapability: 0.6, counterIntel: 0.75 },
    politics: { regimeStability: 0.9, legitimacy: 0.75, factionalism: 0.15, pressFreedom: 0.35, protestPressure: 0.1 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.3, aidGiven: 300, aidReceived: 0 },
  },
  sectors: fillSectorMix(["semiconductors", "energy-oil", "chemicals"], { "energy-gas": 0.95, "energy-renewables": 0.05 }, 5_900_000, 0.02),
  traits: {
    aggression: 0.15, opportunism: 0.6, legalism: 0.8, isolationism: 0.1, riskTolerance: 0.4, vengefulness: 0.15, reliability: 0.85, transparency: 0.55,
    agendas: [
      { id: "chokepoint-hub", description: "Protect its position as a strategic trade and finance hub", weight: 0.75 },
      { id: "neutral-hedging", description: "Hedge between larger powers without picking a bloc", weight: 0.6 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "sea-lane-access", description: "No blockade or restriction of its adjacent shipping lanes goes unanswered diplomatically." }], alignmentPull: [US_ID] },
});

// Post-conflict, powerTier 2. Accurate charter fit (2005 constitution is
// parliamentary). Elevated insurgencyPressure and corruptionIndex are
// residual-conflict legacies, consistent with regimeStability/legitimacy
// both sitting well under 0.5.
export const iraqNation = NationInput.parse({
  id: IRAQ_ID,
  playable: false,
  identity: { name: "Iraq", adjective: "Iraqi", capital: "Baghdad", government: "charter-parliamentary-republic", languages: ["Arabic", "Kurdish"], currency: "IQD" },
  geo: { region: "region-middle-east", lat: 33.3, lon: 44.4, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.1 } },
  stats: {
    demography: { population: 44_000_000, urbanization: 0.72, medianAge: 21, growthRate: 0.023, literacy: 0.86, birthRate: 0.025, deathRate: 0.004, netMigration: 0.002 },
    economy: { gdp: 260_000, gdpPerCapita: 5_909, growth: -0.015453, inflation: 0.026117, unemployment: 0.15293, costOfLiving: 1, debt: 117_000, reserves: 90_000, sovereignRating: "B" },
    trade: { exports: 100_000, imports: 65_000, balance: 35_000, topExports: ["energy-oil"], topPartners: [], tradeDependence: {} },
    energy: { production: 4_500, consumption: 900, importDependence: 0.1, mix: { "energy-oil": 0.9, "energy-gas": 0.1 } },
    military: {
      budget: 5_500, activeHeadcount: 193_000, reserveHeadcount: 0, readiness: 0.3, doctrineQuality: 0.3,
      branchStrength: { land: 0.4, air: 0.15, naval: 0.05, cyber: 0.1, space: 0.0 },
      airliftCapacity: 0.1, sealiftCapacity: 0.05, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.55, corruptionIndex: 0.75, insurgencyPressure: 0.55, borderControl: 0.35, intelCapability: 0.3, counterIntel: 0.25 },
    politics: { regimeStability: 0.35, legitimacy: 0.4, factionalism: 0.75, pressFreedom: 0.4, protestPressure: 0.5 },
    softPower: { diplomaticReach: 0.25, culturalReach: 0.3, aidGiven: 0, aidReceived: 3_000 },
  },
  sectors: fillSectorMix(["energy-oil"], { "energy-oil": 0.9, "energy-gas": 0.1 }, 44_000_000, 0.16),
  traits: {
    aggression: 0.3, opportunism: 0.4, legalism: 0.35, isolationism: 0.25, riskTolerance: 0.5, vengefulness: 0.45, reliability: 0.35, transparency: 0.3,
    agendas: [
      { id: "institution-rebuilding", description: "Rebuild state institutions eroded by conflict", weight: 0.6 },
      { id: "factional-balance", description: "Balance rival sectarian and regional factions within government", weight: 0.65 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "sovereignty-over-security", description: "No foreign force operates on its soil without government sanction." }], alignmentPull: [] },
});

// Isolationist, powerTier 2. Charter mapping is a deliberate approximation
// (see file header): modeled as an absolute monarchy for its hereditary
// succession, despite the different formal title. Economic figures are the
// least reliable in this batch — North Korea does not publish standard
// national accounts — and are informed estimates only. Military budget is
// nominal and understates real resource commitment relative to headcount;
// that mismatch is itself realistic, not an error to "fix".
export const northKoreaNation = NationInput.parse({
  id: NORTH_KOREA_ID,
  playable: false,
  identity: { name: "North Korea", adjective: "North Korean", capital: "Pyongyang", government: "charter-absolute-monarchy", languages: ["Korean"], currency: "KPW" },
  geo: { region: "region-east-asia", lat: 39.0, lon: 125.75, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, drought: 0.15 } },
  stats: {
    demography: { population: 26_000_000, urbanization: 0.63, medianAge: 35, growthRate: 0.005, literacy: 0.99, birthRate: 0.0135, deathRate: 0.0095, netMigration: 0.001 },
    economy: { gdp: 18_000, gdpPerCapita: 692, growth: 0.005, inflation: 0.02, unemployment: 0.03539, costOfLiving: 1, debt: 3_600, reserves: 2_000, sovereignRating: "CCC" },
    trade: { exports: 200, imports: 1_500, balance: -1_300, topExports: ["mining", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 150, consumption: 150, importDependence: 0.3, mix: { "energy-oil": 0.7, "energy-renewables": 0.3 } },
    military: {
      budget: 4_000, activeHeadcount: 1_280_000, reserveHeadcount: 600_000, readiness: 0.5, doctrineQuality: 0.4,
      branchStrength: { land: 0.6, air: 0.3, naval: 0.25, cyber: 0.5, space: 0.15 },
      airliftCapacity: 0.1, sealiftCapacity: 0.1, arsenal: { warheads: 30, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.2, corruptionIndex: 0.55, insurgencyPressure: 0.02, borderControl: 0.9, intelCapability: 0.6, counterIntel: 0.95 },
    politics: { regimeStability: 0.85, legitimacy: 0.3, factionalism: 0.05, pressFreedom: 0.0, protestPressure: 0.02 },
    softPower: { diplomaticReach: 0.15, culturalReach: 0.05, aidGiven: 0, aidReceived: 400 },
  },
  sectors: fillSectorMix(["mining", "textiles"], { "energy-oil": 0.7, "energy-renewables": 0.3 }, 26_000_000, 0.04),
  traits: {
    aggression: 0.6, opportunism: 0.35, legalism: 0.3, isolationism: 0.9, riskTolerance: 0.6, vengefulness: 0.55, reliability: 0.25, transparency: 0.05,
    agendas: [
      { id: "regime-survival", description: "Preserve the ruling dynasty against external and internal threat", weight: 0.85 },
      { id: "deterrence-through-arsenal", description: "Use its arsenal as the sole guarantor of leverage", weight: 0.7 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "regime-security", description: "No external action interpreted as targeting the ruling leadership goes unanswered." }], alignmentPull: [CHINA_ID, RUSSIA_ID] },
});

// Client-state, powerTier 2. Accurate charter fit structurally (formally a
// presidential republic). Sanctions-era sovereignRating and thin reserves
// reflect its post-2020 economic isolation.
export const belarusNation = NationInput.parse({
  id: BELARUS_ID,
  playable: false,
  identity: { name: "Belarus", adjective: "Belarusian", capital: "Minsk", government: "charter-presidential-republic", languages: ["Belarusian", "Russian"], currency: "BYN" },
  geo: { region: "region-eastern-europe", lat: 53.9, lon: 27.6, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.15, drought: 0.2 } },
  stats: {
    demography: { population: 9_100_000, urbanization: 0.8, medianAge: 41, growthRate: -0.003, literacy: 0.99, birthRate: 0.0085, deathRate: 0.0135, netMigration: 0.002 },
    economy: { gdp: 73_000, gdpPerCapita: 8_022, growth: 0.0435, inflation: 0.057853, unemployment: 0.03458, costOfLiving: 1, debt: 29_200, reserves: 8_000, sovereignRating: "CCC" },
    trade: { exports: 33_000, imports: 34_000, balance: -1_000, topExports: ["mining", "energy-oil"], topPartners: [], tradeDependence: {} },
    energy: { production: 250, consumption: 260, importDependence: 0.85, mix: { "energy-gas": 0.6, "energy-nuclear": 0.25, "energy-oil": 0.15 } },
    military: {
      budget: 1_200, activeHeadcount: 62_847, reserveHeadcount: 289_847, readiness: 0.45, doctrineQuality: 0.4,
      branchStrength: { land: 0.4, air: 0.3, naval: 0.0, cyber: 0.3, space: 0.0 },
      airliftCapacity: 0.15, sealiftCapacity: 0.0, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.25, corruptionIndex: 0.5, insurgencyPressure: 0.05, borderControl: 0.7, intelCapability: 0.4, counterIntel: 0.8 },
    politics: { regimeStability: 0.55, legitimacy: 0.3, factionalism: 0.2, pressFreedom: 0.05, protestPressure: 0.35 },
    softPower: { diplomaticReach: 0.15, culturalReach: 0.1, aidGiven: 0, aidReceived: 1_000 },
  },
  sectors: fillSectorMix(["mining", "energy-oil"], { "energy-gas": 0.6, "energy-nuclear": 0.25, "energy-oil": 0.15 }, 9_100_000, 0.04),
  traits: {
    aggression: 0.3, opportunism: 0.4, legalism: 0.35, isolationism: 0.45, riskTolerance: 0.35, vengefulness: 0.4, reliability: 0.45, transparency: 0.15,
    agendas: [
      { id: "patron-alignment", description: "Preserve economic and security dependence on its patron power", weight: 0.75 },
      { id: "regime-security", description: "Suppress internal opposition to preserve the ruling administration", weight: 0.6 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "patron-alliance", description: "No realignment away from its patron's security bloc." }], alignmentPull: [RUSSIA_ID] },
});

// Rising power, powerTier 3. Charter mapping is approximate (see file
// header): modeled as a parliamentary-republic for its National Assembly,
// though real leadership turnover runs through internal party mechanisms
// rather than a no-confidence vote. reserveHeadcount reflects a large
// historical mobilization reserve, not an active standing force.
export const vietnamNation = NationInput.parse({
  id: VIETNAM_ID,
  playable: false,
  identity: { name: "Vietnam", adjective: "Vietnamese", capital: "Hanoi", government: "charter-parliamentary-republic", languages: ["Vietnamese"], currency: "VND" },
  geo: { region: "region-southeast-asia", lat: 21.0, lon: 105.85, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.35, flood: 0.3, drought: 0.15 } },
  stats: {
    demography: { population: 99_000_000, urbanization: 0.39, medianAge: 33, growthRate: 0.009, literacy: 0.95, birthRate: 0.0155, deathRate: 0.0065, netMigration: 0 },
    economy: { gdp: 430_000, gdpPerCapita: 4_343, growth: 0.070396, inflation: 0.036211, unemployment: 0.01602, costOfLiving: 1, debt: 159_100, reserves: 90_000, sovereignRating: "BB" },
    trade: { exports: 370_000, imports: 340_000, balance: 30_000, topExports: ["semiconductors", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 900, consumption: 950, importDependence: 0.2, mix: { "energy-oil": 0.45, "energy-renewables": 0.5, "energy-gas": 0.05 } },
    military: {
      budget: 8_000, activeHeadcount: 482_000, reserveHeadcount: 5_000_000, readiness: 0.5, doctrineQuality: 0.45,
      branchStrength: { land: 0.55, air: 0.3, naval: 0.35, cyber: 0.3, space: 0.02 },
      airliftCapacity: 0.2, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.55, insurgencyPressure: 0.05, borderControl: 0.6, intelCapability: 0.45, counterIntel: 0.75 },
    politics: { regimeStability: 0.75, legitimacy: 0.55, factionalism: 0.15, pressFreedom: 0.15, protestPressure: 0.15 },
    softPower: { diplomaticReach: 0.4, culturalReach: 0.3, aidGiven: 0, aidReceived: 2_000 },
  },
  sectors: fillSectorMix(["semiconductors", "textiles"], { "energy-oil": 0.45, "energy-renewables": 0.5, "energy-gas": 0.05 }, 99_000_000, 0.02),
  traits: {
    aggression: 0.3, opportunism: 0.55, legalism: 0.45, isolationism: 0.25, riskTolerance: 0.45, vengefulness: 0.3, reliability: 0.55, transparency: 0.2,
    agendas: [
      { id: "manufacturing-ascent", description: "Climb the manufacturing value chain as regional supply chains diversify", weight: 0.7 },
      { id: "hedged-nonalignment", description: "Hedge between larger powers while avoiding formal alliance", weight: 0.55 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "maritime-claims", description: "No foreign restriction of its claimed maritime economic zone." }], alignmentPull: [] },
});

// Microstate, powerTier 1. Accurate charter fit (parliamentary republic).
// No standing military — activeHeadcount/military fields are genuinely
// zero, not a missing-data placeholder; only a coast guard exists.
export const icelandNation = NationInput.parse({
  id: ICELAND_ID,
  playable: false,
  identity: { name: "Iceland", adjective: "Icelandic", capital: "Reykjavik", government: "charter-parliamentary-republic", languages: ["Icelandic"], currency: "ISK" },
  geo: { region: "region-northern-europe", lat: 64.15, lon: -21.9, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, flood: 0.1 } },
  stats: {
    demography: { population: 390_000, urbanization: 0.94, medianAge: 37, growthRate: 0.01, literacy: 0.99, birthRate: 0.0125, deathRate: 0.007, netMigration: 0.0045 },
    economy: { gdp: 31_000, gdpPerCapita: 79_487, growth: -0.012829, inflation: 0.058568, unemployment: 0.036, costOfLiving: 1, debt: 18_600, reserves: 7_000, sovereignRating: "A" },
    trade: { exports: 12_000, imports: 11_000, balance: 1_000, topExports: ["steel-heavy", "food-processing", "tourism-hospitality"], topPartners: [], tradeDependence: {} },
    energy: { production: 55, consumption: 50, importDependence: 0.0, mix: { "energy-renewables": 1.0 } },
    military: {
      budget: 0, activeHeadcount: 0, reserveHeadcount: 0, readiness: 0.1, doctrineQuality: 0.1,
      branchStrength: { land: 0.0, air: 0.05, naval: 0.15, cyber: 0.2, space: 0.0 },
      airliftCapacity: 0.05, sealiftCapacity: 0.1, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.05, corruptionIndex: 0.1, insurgencyPressure: 0.0, borderControl: 0.7, intelCapability: 0.2, counterIntel: 0.2 },
    politics: { regimeStability: 0.95, legitimacy: 0.9, factionalism: 0.15, pressFreedom: 0.95, protestPressure: 0.1 },
    softPower: { diplomaticReach: 0.3, culturalReach: 0.2, aidGiven: 100, aidReceived: 0 },
  },
  sectors: fillSectorMix(["steel-heavy", "food-processing", "tourism-hospitality"], { "energy-renewables": 1.0 }, 390_000, 0.035),
  traits: {
    aggression: 0.05, opportunism: 0.2, legalism: 0.85, isolationism: 0.3, riskTolerance: 0.25, vengefulness: 0.1, reliability: 0.85, transparency: 0.9,
    agendas: [
      { id: "neutral-hosting", description: "Trade on its neutrality and stability to host diplomacy and finance", weight: 0.5 },
      { id: "fisheries-protection", description: "Protect its exclusive fishing waters from foreign encroachment", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "fishing-waters", description: "No foreign fishing fleet operates within its exclusive economic zone without agreement." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 4. Accurate charter fit (fixed-term elected
// executive, Congress-driven impeachment).
export const brazilNation = NationInput.parse({
  id: BRAZIL_ID,
  playable: false,
  identity: { name: "Brazil", adjective: "Brazilian", capital: "Brasilia", government: "charter-presidential-republic", languages: ["Portuguese"], currency: "BRL" },
  geo: { region: "region-south-america", lat: -15.8, lon: -47.9, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, drought: 0.25, wildfire: 0.15 } },
  stats: {
    demography: { population: 216_000_000, urbanization: 0.87, medianAge: 34, growthRate: 0.006, literacy: 0.93, birthRate: 0.013, deathRate: 0.007, netMigration: 0 },
    economy: { gdp: 2_170_000, gdpPerCapita: 10_046, growth: 0.034193, inflation: 0.043675, unemployment: 0.06801, costOfLiving: 1, debt: 1_844_500, reserves: 355_000, sovereignRating: "BB" },
    trade: { exports: 340_000, imports: 265_000, balance: 75_000, topExports: ["agriculture", "mining", "energy-oil"], topPartners: [], tradeDependence: {} },
    energy: { production: 3_200, consumption: 3_000, importDependence: 0.1, mix: { "energy-renewables": 0.75, "energy-oil": 0.25 } },
    military: {
      budget: 22_000, activeHeadcount: 360_000, reserveHeadcount: 1_340_000, readiness: 0.5, doctrineQuality: 0.45,
      branchStrength: { land: 0.5, air: 0.4, naval: 0.35, cyber: 0.3, space: 0.1 },
      airliftCapacity: 0.25, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.6, corruptionIndex: 0.55, insurgencyPressure: 0.15, borderControl: 0.4, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.55, legitimacy: 0.55, factionalism: 0.55, pressFreedom: 0.6, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.55, aidGiven: 0, aidReceived: 0 },
  },
  sectors: fillSectorMix(["agriculture", "mining", "energy-oil"], { "energy-renewables": 0.75, "energy-oil": 0.25 }, 216_000_000, 0.08),
  traits: {
    aggression: 0.25, opportunism: 0.45, legalism: 0.5, isolationism: 0.2, riskTolerance: 0.45, vengefulness: 0.25, reliability: 0.5, transparency: 0.4,
    agendas: [
      { id: "regional-leadership", description: "Lead regional economic and diplomatic coordination", weight: 0.6 },
      { id: "resource-export-growth", description: "Grow commodity export revenue while resisting deforestation pressure abroad", weight: 0.5 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "sovereign-development", description: "No foreign restriction on how it develops its own territory." }], alignmentPull: [] },
});

// Middle power, powerTier 3. Accurate charter fit.
export const colombiaNation = NationInput.parse({
  id: COLOMBIA_ID,
  playable: false,
  identity: { name: "Colombia", adjective: "Colombian", capital: "Bogota", government: "charter-presidential-republic", languages: ["Spanish"], currency: "COP" },
  geo: { region: "region-south-america", lat: 4.71, lon: -74.07, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.25, flood: 0.25, drought: 0.1 } },
  stats: {
    demography: { population: 52_000_000, urbanization: 0.81, medianAge: 31, growthRate: 0.01, literacy: 0.95, birthRate: 0.014, deathRate: 0.0065, netMigration: 0.0025 },
    economy: { gdp: 363_000, gdpPerCapita: 6_981, growth: 0.014933, inflation: 0.066091, unemployment: 0.09619, costOfLiving: 1, debt: 199_650, reserves: 59_000, sovereignRating: "BB" },
    trade: { exports: 51_000, imports: 61_000, balance: -10_000, topExports: ["mining", "energy-oil", "agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 350, consumption: 330, importDependence: 0.05, mix: { "energy-renewables": 0.65, "energy-oil": 0.2, "energy-gas": 0.15 } },
    military: {
      budget: 10_500, activeHeadcount: 293_000, reserveHeadcount: 35_000, readiness: 0.5, doctrineQuality: 0.45,
      branchStrength: { land: 0.55, air: 0.35, naval: 0.3, cyber: 0.2, space: 0.0 },
      airliftCapacity: 0.2, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.6, corruptionIndex: 0.55, insurgencyPressure: 0.5, borderControl: 0.45, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.5, legitimacy: 0.55, factionalism: 0.5, pressFreedom: 0.6, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.4, culturalReach: 0.4, aidGiven: 0, aidReceived: 500 },
  },
  sectors: fillSectorMix(["mining", "energy-oil", "agriculture"], { "energy-renewables": 0.65, "energy-oil": 0.2, "energy-gas": 0.15 }, 52_000_000, 0.1),
  traits: {
    aggression: 0.3, opportunism: 0.4, legalism: 0.5, isolationism: 0.15, riskTolerance: 0.5, vengefulness: 0.35, reliability: 0.5, transparency: 0.4,
    agendas: [
      { id: "conflict-resolution", description: "Consolidate the peace process with remaining armed groups", weight: 0.6 },
      { id: "trade-diversification", description: "Diversify export markets beyond commodities", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "territorial-control", description: "No armed group is granted de facto territorial authority." }], alignmentPull: [US_ID] },
});

// Resource exporter, powerTier 2. Accurate charter fit structurally.
export const venezuelaNation = NationInput.parse({
  id: VENEZUELA_ID,
  playable: false,
  identity: { name: "Venezuela", adjective: "Venezuelan", capital: "Caracas", government: "charter-presidential-republic", languages: ["Spanish"], currency: "VES" },
  geo: { region: "region-south-america", lat: 10.48, lon: -66.9, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.15 } },
  stats: {
    demography: { population: 28_000_000, urbanization: 0.89, medianAge: 30, growthRate: -0.01, literacy: 0.97, birthRate: 0.016, deathRate: 0.0075, netMigration: -0.0185 },
    economy: { gdp: 96_000, gdpPerCapita: 3_429, growth: 0.055249, inflation: 0.4, unemployment: 0.05321, costOfLiving: 1, debt: 28_800, reserves: 10_000, sovereignRating: "CCC" },
    trade: { exports: 16_000, imports: 14_000, balance: 2_000, topExports: ["energy-oil"], topPartners: [], tradeDependence: {} },
    energy: { production: 1_500, consumption: 700, importDependence: 0.0, mix: { "energy-oil": 0.9, "energy-renewables": 0.1 } },
    military: {
      budget: 5_000, activeHeadcount: 123_000, reserveHeadcount: 8_000, readiness: 0.35, doctrineQuality: 0.3,
      branchStrength: { land: 0.4, air: 0.25, naval: 0.25, cyber: 0.15, space: 0.0 },
      airliftCapacity: 0.15, sealiftCapacity: 0.15, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.7, corruptionIndex: 0.75, insurgencyPressure: 0.25, borderControl: 0.3, intelCapability: 0.3, counterIntel: 0.35 },
    politics: { regimeStability: 0.35, legitimacy: 0.3, factionalism: 0.55, pressFreedom: 0.2, protestPressure: 0.55 },
    softPower: { diplomaticReach: 0.2, culturalReach: 0.25, aidGiven: 0, aidReceived: 1_200 },
  },
  sectors: fillSectorMix(["energy-oil"], { "energy-oil": 0.9, "energy-renewables": 0.1 }, 28_000_000, 0.07),
  traits: {
    aggression: 0.35, opportunism: 0.45, legalism: 0.3, isolationism: 0.45, riskTolerance: 0.5, vengefulness: 0.4, reliability: 0.3, transparency: 0.2,
    agendas: [
      { id: "sanctions-resistance", description: "Circumvent economic sanctions to keep oil revenue flowing", weight: 0.65 },
      { id: "regime-security", description: "Suppress organized opposition to preserve the ruling administration", weight: 0.55 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "oil-sovereignty", description: "No foreign claim over national oil reserves or infrastructure." }], alignmentPull: [RUSSIA_ID, CHINA_ID] },
});

// Isolationist, powerTier 1. Charter mapping is approximate (see file
// header): modeled as a presidential republic despite one-party
// governance, since a formal presidency does exist post-2019.
export const cubaNation = NationInput.parse({
  id: CUBA_ID,
  playable: false,
  identity: { name: "Cuba", adjective: "Cuban", capital: "Havana", government: "charter-presidential-republic", languages: ["Spanish"], currency: "CUP" },
  geo: { region: "region-caribbean", lat: 23.13, lon: -82.38, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.5, drought: 0.15 } },
  stats: {
    demography: { population: 11_000_000, urbanization: 0.77, medianAge: 43, growthRate: -0.002, literacy: 0.99, birthRate: 0.0095, deathRate: 0.0105, netMigration: -0.001 },
    economy: { gdp: 107_000, gdpPerCapita: 9_727, growth: -0.010617, inflation: 0.3, unemployment: 0.01755, costOfLiving: 1, debt: 37_450, reserves: 12_000, sovereignRating: "CCC" },
    trade: { exports: 2_500, imports: 10_000, balance: -7_500, topExports: ["mining", "pharma", "agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 150, consumption: 160, importDependence: 0.4, mix: { "energy-oil": 0.6, "energy-renewables": 0.2, "energy-gas": 0.2 } },
    military: {
      budget: 1_200, activeHeadcount: 49_000, reserveHeadcount: 39_000, readiness: 0.35, doctrineQuality: 0.35,
      branchStrength: { land: 0.5, air: 0.2, naval: 0.25, cyber: 0.2, space: 0.0 },
      airliftCapacity: 0.1, sealiftCapacity: 0.1, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.15, corruptionIndex: 0.45, insurgencyPressure: 0.01, borderControl: 0.8, intelCapability: 0.5, counterIntel: 0.8 },
    politics: { regimeStability: 0.75, legitimacy: 0.4, factionalism: 0.1, pressFreedom: 0.05, protestPressure: 0.15 },
    softPower: { diplomaticReach: 0.3, culturalReach: 0.35, aidGiven: 0, aidReceived: 800 },
  },
  sectors: fillSectorMix(["mining", "pharma", "agriculture"], { "energy-oil": 0.6, "energy-renewables": 0.2, "energy-gas": 0.2 }, 11_000_000, 0.01),
  traits: {
    aggression: 0.15, opportunism: 0.3, legalism: 0.4, isolationism: 0.7, riskTolerance: 0.25, vengefulness: 0.2, reliability: 0.45, transparency: 0.15,
    agendas: [
      { id: "embargo-resilience", description: "Sustain the economy under prolonged trade restrictions", weight: 0.6 },
      { id: "medical-diplomacy", description: "Trade skilled medical missions abroad for revenue and influence", weight: 0.4 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "system-continuity", description: "No externally imposed change of its political system." }], alignmentPull: [RUSSIA_ID] },
});

// Regional power, powerTier 4. Charter mapping is approximate (see file
// header): modeled as a parliamentary republic for its Westminster-style
// cabinet government, though the constitutional-monarchy head of state is
// not represented as a distinct field.
export const canadaNation = NationInput.parse({
  id: CANADA_ID,
  playable: false,
  identity: { name: "Canada", adjective: "Canadian", capital: "Ottawa", government: "charter-parliamentary-republic", languages: ["English", "French"], currency: "CAD" },
  geo: { region: "region-north-america", lat: 45.42, lon: -75.7, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.15, wildfire: 0.4 } },
  stats: {
    demography: { population: 39_000_000, urbanization: 0.82, medianAge: 42, growthRate: 0.009, literacy: 0.99, birthRate: 0.01, deathRate: 0.0085, netMigration: 0.0075 },
    economy: { gdp: 2_140_000, gdpPerCapita: 54_872, growth: 0.020463, inflation: 0.023816, unemployment: 0.06351, costOfLiving: 1, debt: 1_455_200, reserves: 100_000, sovereignRating: "AAA" },
    trade: { exports: 640_000, imports: 620_000, balance: 20_000, topExports: ["energy-oil", "auto"], topPartners: [], tradeDependence: {} },
    energy: { production: 5_500, consumption: 3_200, importDependence: 0.0, mix: { "energy-renewables": 0.6, "energy-oil": 0.15, "energy-gas": 0.1, "energy-nuclear": 0.15 } },
    military: {
      budget: 27_000, activeHeadcount: 68_000, reserveHeadcount: 30_000, readiness: 0.55, doctrineQuality: 0.6,
      branchStrength: { land: 0.4, air: 0.5, naval: 0.4, cyber: 0.5, space: 0.2 },
      airliftCapacity: 0.4, sealiftCapacity: 0.25, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.2, corruptionIndex: 0.1, insurgencyPressure: 0.01, borderControl: 0.7, intelCapability: 0.55, counterIntel: 0.55 },
    politics: { regimeStability: 0.85, legitimacy: 0.8, factionalism: 0.35, pressFreedom: 0.9, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.75, culturalReach: 0.5, aidGiven: 6_500, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "auto"], { "energy-renewables": 0.6, "energy-oil": 0.15, "energy-gas": 0.1, "energy-nuclear": 0.15 }, 39_000_000, 0.055),
  traits: {
    aggression: 0.1, opportunism: 0.3, legalism: 0.8, isolationism: 0.15, riskTolerance: 0.3, vengefulness: 0.1, reliability: 0.8, transparency: 0.75,
    agendas: [
      { id: "resource-export-management", description: "Manage energy and mineral export revenue sustainably", weight: 0.5 },
      { id: "alliance-participation", description: "Participate reliably in its collective-defense alliance", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "arctic-sovereignty", description: "No foreign claim over its Arctic territorial waters." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 3. Accurate charter fit.
export const mexicoNation = NationInput.parse({
  id: MEXICO_ID,
  playable: false,
  identity: { name: "Mexico", adjective: "Mexican", capital: "Mexico City", government: "charter-presidential-republic", languages: ["Spanish"], currency: "MXN" },
  geo: { region: "region-north-america", lat: 19.43, lon: -99.13, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.35, cyclone: 0.35, drought: 0.2, flood: 0.15 } },
  stats: {
    demography: { population: 128_000_000, urbanization: 0.81, medianAge: 29, growthRate: 0.007, literacy: 0.95, birthRate: 0.0145, deathRate: 0.006, netMigration: -0.0015 },
    economy: { gdp: 1_790_000, gdpPerCapita: 13_984, growth: 0.013506, inflation: 0.047223, unemployment: 0.02678, costOfLiving: 1, debt: 859_200, reserves: 200_000, sovereignRating: "BBB" },
    trade: { exports: 590_000, imports: 605_000, balance: -15_000, topExports: ["auto", "semiconductors", "energy-oil"], topPartners: [], tradeDependence: {} },
    energy: { production: 2_200, consumption: 2_100, importDependence: 0.1, mix: { "energy-oil": 0.5, "energy-gas": 0.3, "energy-renewables": 0.2 } },
    military: {
      budget: 8_500, activeHeadcount: 277_000, reserveHeadcount: 82_000, readiness: 0.4, doctrineQuality: 0.35,
      branchStrength: { land: 0.5, air: 0.25, naval: 0.3, cyber: 0.2, space: 0.0 },
      airliftCapacity: 0.2, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.65, corruptionIndex: 0.6, insurgencyPressure: 0.35, borderControl: 0.4, intelCapability: 0.35, counterIntel: 0.35 },
    politics: { regimeStability: 0.55, legitimacy: 0.55, factionalism: 0.45, pressFreedom: 0.55, protestPressure: 0.3 },
    softPower: { diplomaticReach: 0.5, culturalReach: 0.55, aidGiven: 0, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto", "semiconductors", "energy-oil"], { "energy-oil": 0.5, "energy-gas": 0.3, "energy-renewables": 0.2 }, 128_000_000, 0.028),
  traits: {
    aggression: 0.25, opportunism: 0.4, legalism: 0.45, isolationism: 0.2, riskTolerance: 0.45, vengefulness: 0.3, reliability: 0.5, transparency: 0.35,
    agendas: [
      { id: "nearshoring-growth", description: "Capture manufacturing investment shifting closer to its largest export market", weight: 0.6 },
      { id: "security-cooperation", description: "Balance domestic security sovereignty against cross-border cooperation pressure", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "non-intervention", description: "No foreign security force operates unilaterally on its territory." }], alignmentPull: [US_ID] },
});

// Great power, powerTier 4. Accurate charter fit (Prime Minister answerable
// to Parliament; ceremonial head of state not separately modeled).
export const indiaNation = NationInput.parse({
  id: INDIA_ID,
  playable: false,
  identity: { name: "India", adjective: "Indian", capital: "New Delhi", government: "charter-parliamentary-republic", languages: ["Hindi", "English"], currency: "INR" },
  geo: { region: "region-south-asia", lat: 28.6, lon: 77.2, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.3, drought: 0.2, cyclone: 0.15, earthquake: 0.2 } },
  stats: {
    demography: { population: 1_428_627_847, urbanization: 0.36, medianAge: 28, growthRate: 0.008, literacy: 0.77, birthRate: 0.0165, deathRate: 0.0075, netMigration: -0.001 },
    economy: { gdp: 3_730_000, gdpPerCapita: 2_612, growth: 0.070993, inflation: 0.04953, unemployment: 0.04173, costOfLiving: 1, debt: 3_058_600, reserves: 600_000, sovereignRating: "BBB" },
    trade: { exports: 450_000, imports: 715_000, balance: -265_000, topExports: ["energy-oil", "pharma", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 12_000, consumption: 13_500, importDependence: 0.3, mix: { "energy-oil": 0.55, "energy-renewables": 0.35, "energy-gas": 0.07, "energy-nuclear": 0.03 } },
    military: {
      budget: 83_648, activeHeadcount: 1_457_291, reserveHeadcount: 1_154_847, readiness: 0.55, doctrineQuality: 0.5,
      branchStrength: { land: 0.6, air: 0.5, naval: 0.45, cyber: 0.4, space: 0.35 },
      airliftCapacity: 0.35, sealiftCapacity: 0.3, arsenal: { warheads: 172, deliveryTriad: true }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.35, corruptionIndex: 0.45, insurgencyPressure: 0.3, borderControl: 0.5, intelCapability: 0.55, counterIntel: 0.7 },
    politics: { regimeStability: 0.65, legitimacy: 0.65, factionalism: 0.5, pressFreedom: 0.45, protestPressure: 0.35 },
    softPower: { diplomaticReach: 0.65, culturalReach: 0.55, aidGiven: 2_500, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "pharma", "textiles"], { "energy-oil": 0.55, "energy-renewables": 0.35, "energy-gas": 0.07, "energy-nuclear": 0.03 }, 1_428_627_847, 0.08),
  traits: {
    aggression: 0.3, opportunism: 0.45, legalism: 0.55, isolationism: 0.2, riskTolerance: 0.45, vengefulness: 0.3, reliability: 0.55, transparency: 0.4,
    agendas: [
      { id: "manufacturing-ascent", description: "Build a manufacturing base to match its demographic scale", weight: 0.6 },
      { id: "strategic-autonomy", description: "Preserve freedom of action rather than join a formal bloc", weight: 0.65 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "border-integrity", description: "No unilateral change to the status quo along its disputed borders." }], alignmentPull: [] },
});

// Regional power, powerTier 3. Accurate charter fit.
export const pakistanNation = NationInput.parse({
  id: PAKISTAN_ID,
  playable: false,
  identity: { name: "Pakistan", adjective: "Pakistani", capital: "Islamabad", government: "charter-parliamentary-republic", languages: ["Urdu", "English"], currency: "PKR" },
  geo: { region: "region-south-asia", lat: 33.68, lon: 73.05, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.25, flood: 0.35, drought: 0.15 } },
  stats: {
    demography: { population: 240_000_000, urbanization: 0.38, medianAge: 21, growthRate: 0.015, literacy: 0.6, birthRate: 0.026, deathRate: 0.0065, netMigration: -0.0045 },
    economy: { gdp: 341_000, gdpPerCapita: 1_421, growth: 0.030818, inflation: 0.126325, unemployment: 0.05492, costOfLiving: 1, debt: 255_750, reserves: 9_500, sovereignRating: "CCC" },
    trade: { exports: 32_000, imports: 55_000, balance: -23_000, topExports: ["textiles", "agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 700, consumption: 750, importDependence: 0.3, mix: { "energy-gas": 0.35, "energy-renewables": 0.3, "energy-oil": 0.3, "energy-nuclear": 0.05 } },
    military: {
      budget: 10_300, activeHeadcount: 654_000, reserveHeadcount: 550_000, readiness: 0.5, doctrineQuality: 0.5,
      branchStrength: { land: 0.55, air: 0.45, naval: 0.3, cyber: 0.3, space: 0.1 },
      airliftCapacity: 0.25, sealiftCapacity: 0.2, arsenal: { warheads: 170, deliveryTriad: true }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.45, corruptionIndex: 0.6, insurgencyPressure: 0.45, borderControl: 0.4, intelCapability: 0.55, counterIntel: 0.5 },
    politics: { regimeStability: 0.4, legitimacy: 0.45, factionalism: 0.55, pressFreedom: 0.4, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.45, culturalReach: 0.35, aidGiven: 0, aidReceived: 3_000 },
  },
  sectors: fillSectorMix(["textiles", "agriculture"], { "energy-gas": 0.35, "energy-renewables": 0.3, "energy-oil": 0.3, "energy-nuclear": 0.05 }, 240_000_000, 0.08),
  traits: {
    aggression: 0.4, opportunism: 0.4, legalism: 0.4, isolationism: 0.25, riskTolerance: 0.5, vengefulness: 0.4, reliability: 0.4, transparency: 0.25,
    agendas: [
      { id: "debt-stabilization", description: "Stabilize external debt and currency reserves", weight: 0.6 },
      { id: "border-deterrence", description: "Maintain credible deterrence along contested borders", weight: 0.55 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "kashmir-status", description: "No unilateral change to the status of contested Kashmir territory." }], alignmentPull: [CHINA_ID] },
});

// Rising power, powerTier 2. Accurate charter fit.
export const bangladeshNation = NationInput.parse({
  id: BANGLADESH_ID,
  playable: false,
  identity: { name: "Bangladesh", adjective: "Bangladeshi", capital: "Dhaka", government: "charter-parliamentary-republic", languages: ["Bengali"], currency: "BDT" },
  geo: { region: "region-south-asia", lat: 23.81, lon: 90.41, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.4, cyclone: 0.35, earthquake: 0.1 } },
  stats: {
    demography: { population: 173_000_000, urbanization: 0.4, medianAge: 27, growthRate: 0.01, literacy: 0.75, birthRate: 0.0175, deathRate: 0.006, netMigration: -0.0015 },
    economy: { gdp: 446_000, gdpPerCapita: 2_579, growth: 0.042233, inflation: 0.104657, unemployment: 0.03635, costOfLiving: 1, debt: 173_940, reserves: 24_000, sovereignRating: "BB" },
    trade: { exports: 55_000, imports: 75_000, balance: -20_000, topExports: ["textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 400, consumption: 430, importDependence: 0.2, mix: { "energy-gas": 0.55, "energy-oil": 0.35, "energy-renewables": 0.1 } },
    military: {
      budget: 4_700, activeHeadcount: 157_000, reserveHeadcount: 63_000, readiness: 0.4, doctrineQuality: 0.35,
      branchStrength: { land: 0.5, air: 0.25, naval: 0.3, cyber: 0.15, space: 0.0 },
      airliftCapacity: 0.15, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.55, insurgencyPressure: 0.1, borderControl: 0.4, intelCapability: 0.35, counterIntel: 0.35 },
    politics: { regimeStability: 0.5, legitimacy: 0.5, factionalism: 0.45, pressFreedom: 0.35, protestPressure: 0.35 },
    softPower: { diplomaticReach: 0.35, culturalReach: 0.3, aidGiven: 0, aidReceived: 3_500 },
  },
  sectors: fillSectorMix(["textiles"], { "energy-gas": 0.55, "energy-oil": 0.35, "energy-renewables": 0.1 }, 173_000_000, 0.04),
  traits: {
    aggression: 0.2, opportunism: 0.45, legalism: 0.4, isolationism: 0.2, riskTolerance: 0.45, vengefulness: 0.25, reliability: 0.45, transparency: 0.3,
    agendas: [
      { id: "garment-export-ascent", description: "Climb the value chain beyond garment manufacturing", weight: 0.6 },
      { id: "climate-resilience", description: "Build resilience against worsening flood and cyclone exposure", weight: 0.55 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "delta-territory", description: "No foreign restriction on management of its river-delta territory." }], alignmentPull: [] },
});

// Post-conflict, powerTier 1. Charter mapping is approximate (see file
// header): modeled as a theocratic council given governance runs through
// a religious-authority structure, despite the different formal
// institutions. Economic figures are the least reliable in this file after
// North Korea — standard national accounts are not published.
export const afghanistanNation = NationInput.parse({
  id: AFGHANISTAN_ID,
  playable: false,
  identity: { name: "Afghanistan", adjective: "Afghan", capital: "Kabul", government: "charter-theocratic-council", languages: ["Pashto", "Dari"], currency: "AFN" },
  geo: { region: "region-central-asia", lat: 34.53, lon: 69.17, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { earthquake: 0.3, drought: 0.3 } },
  stats: {
    demography: { population: 42_000_000, urbanization: 0.26, medianAge: 18, growthRate: 0.025, literacy: 0.37, birthRate: 0.035, deathRate: 0.0115, netMigration: 0.0015 },
    economy: { gdp: 14_500, gdpPerCapita: 345, growth: 0.018732, inflation: -0.066012, unemployment: 0.13687, costOfLiving: 1, debt: 1_015, reserves: 0, sovereignRating: "D" },
    trade: { exports: 1_000, imports: 6_500, balance: -5_500, topExports: ["food-processing", "textiles", "mining"], topPartners: [], tradeDependence: {} },
    energy: { production: 30, consumption: 35, importDependence: 0.5, mix: { "energy-renewables": 0.5, "energy-gas": 0.3, "energy-oil": 0.2 } },
    military: {
      budget: 400, activeHeadcount: 157_847, reserveHeadcount: 1_291, readiness: 0.3, doctrineQuality: 0.2,
      branchStrength: { land: 0.7, air: 0.05, naval: 0.0, cyber: 0.05, space: 0.0 },
      airliftCapacity: 0.05, sealiftCapacity: 0.0, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.5, corruptionIndex: 0.7, insurgencyPressure: 0.5, borderControl: 0.3, intelCapability: 0.3, counterIntel: 0.3 },
    politics: { regimeStability: 0.5, legitimacy: 0.15, factionalism: 0.3, pressFreedom: 0.05, protestPressure: 0.15 },
    softPower: { diplomaticReach: 0.1, culturalReach: 0.15, aidGiven: 0, aidReceived: 3_000 },
  },
  sectors: fillSectorMix(["food-processing", "textiles", "mining"], { "energy-renewables": 0.5, "energy-gas": 0.3, "energy-oil": 0.2 }, 42_000_000, 0.15),
  traits: {
    aggression: 0.4, opportunism: 0.35, legalism: 0.3, isolationism: 0.75, riskTolerance: 0.5, vengefulness: 0.35, reliability: 0.3, transparency: 0.1,
    agendas: [
      { id: "territorial-consolidation", description: "Hold territorial control against residual insurgent factions", weight: 0.65 },
      { id: "recognition-seeking", description: "Seek international recognition without conceding governance model", weight: 0.4 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "governance-model", description: "No externally imposed change to its system of governance." }], alignmentPull: [] },
});

// Resource exporter, powerTier 2. Accurate charter fit structurally.
export const kazakhstanNation = NationInput.parse({
  id: KAZAKHSTAN_ID,
  playable: false,
  identity: { name: "Kazakhstan", adjective: "Kazakhstani", capital: "Astana", government: "charter-presidential-republic", languages: ["Kazakh", "Russian"], currency: "KZT" },
  geo: { region: "region-central-asia", lat: 51.17, lon: 71.43, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.25 } },
  stats: {
    demography: { population: 20_000_000, urbanization: 0.62, medianAge: 31, growthRate: 0.01, literacy: 0.99, birthRate: 0.0185, deathRate: 0.008, netMigration: -0.0005 },
    economy: { gdp: 262_000, gdpPerCapita: 13_100, growth: 0.05, inflation: 0.086908, unemployment: 0.04833, costOfLiving: 1, debt: 57_640, reserves: 90_000, sovereignRating: "BBB" },
    trade: { exports: 84_000, imports: 47_000, balance: 37_000, topExports: ["energy-oil", "mining", "agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 1_900, consumption: 900, importDependence: 0.0, mix: { "energy-oil": 0.6, "energy-gas": 0.2, "energy-renewables": 0.2 } },
    military: {
      budget: 1_700, activeHeadcount: 39_000, reserveHeadcount: 30_000, readiness: 0.35, doctrineQuality: 0.3,
      branchStrength: { land: 0.5, air: 0.25, naval: 0.05, cyber: 0.15, space: 0.05 },
      airliftCapacity: 0.1, sealiftCapacity: 0.05, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.55, insurgencyPressure: 0.05, borderControl: 0.55, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.6, legitimacy: 0.5, factionalism: 0.3, pressFreedom: 0.3, protestPressure: 0.25 },
    softPower: { diplomaticReach: 0.4, culturalReach: 0.25, aidGiven: 0, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "mining", "agriculture"], { "energy-oil": 0.6, "energy-gas": 0.2, "energy-renewables": 0.2 }, 20_000_000, 0.05),
  traits: {
    aggression: 0.2, opportunism: 0.4, legalism: 0.45, isolationism: 0.3, riskTolerance: 0.4, vengefulness: 0.25, reliability: 0.5, transparency: 0.3,
    agendas: [
      { id: "multi-vector-diplomacy", description: "Balance relations among larger neighboring powers without exclusive alignment", weight: 0.65 },
      { id: "resource-revenue-management", description: "Manage hydrocarbon and mineral export revenue for long-term stability", weight: 0.5 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "sovereign-neutrality", description: "No permanent foreign military basing on its territory." }], alignmentPull: [RUSSIA_ID] },
});

// Regional power, powerTier 3. Accurate charter fit (clerical oversight of
// an elected government).
export const iranNation = NationInput.parse({
  id: IRAN_ID,
  playable: false,
  identity: { name: "Iran", adjective: "Iranian", capital: "Tehran", government: "charter-theocratic-council", languages: ["Persian"], currency: "IRR" },
  geo: { region: "region-middle-east", lat: 35.7, lon: 51.4, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, drought: 0.35 } },
  stats: {
    demography: { population: 89_000_000, urbanization: 0.77, medianAge: 32, growthRate: 0.007, literacy: 0.88, birthRate: 0.015, deathRate: 0.0055, netMigration: -0.0025 },
    economy: { gdp: 388_000, gdpPerCapita: 4_360, growth: 0.036631, inflation: 0.324559, unemployment: 0.08146, costOfLiving: 1, debt: 116_400, reserves: 12_000, sovereignRating: "CCC" },
    trade: { exports: 45_000, imports: 40_000, balance: 5_000, topExports: ["energy-oil", "chemicals", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 9_000, consumption: 8_500, importDependence: 0.0, mix: { "energy-gas": 0.65, "energy-oil": 0.3, "energy-renewables": 0.05 } },
    military: {
      budget: 10_000, activeHeadcount: 610_000, reserveHeadcount: 350_000, readiness: 0.5, doctrineQuality: 0.45,
      branchStrength: { land: 0.55, air: 0.3, naval: 0.35, cyber: 0.45, space: 0.2 },
      airliftCapacity: 0.2, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.55, insurgencyPressure: 0.2, borderControl: 0.55, intelCapability: 0.6, counterIntel: 0.7 },
    politics: { regimeStability: 0.6, legitimacy: 0.4, factionalism: 0.35, pressFreedom: 0.1, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.45, culturalReach: 0.4, aidGiven: 1_500, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "chemicals", "textiles"], { "energy-gas": 0.65, "energy-oil": 0.3, "energy-renewables": 0.05 }, 89_000_000, 0.09),
  traits: {
    aggression: 0.45, opportunism: 0.4, legalism: 0.4, isolationism: 0.55, riskTolerance: 0.45, vengefulness: 0.5, reliability: 0.4, transparency: 0.15,
    agendas: [
      { id: "sanctions-endurance", description: "Sustain the economy under prolonged international sanctions", weight: 0.65 },
      { id: "regional-network", description: "Maintain a network of regional aligned factions as strategic depth", weight: 0.55 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "nuclear-program", description: "No external strike on its declared nuclear facilities goes unanswered." }], alignmentPull: [RUSSIA_ID, CHINA_ID] },
});

// Regional power, powerTier 3. Accurate charter fit.
export const israelNation = NationInput.parse({
  id: ISRAEL_ID,
  playable: false,
  identity: { name: "Israel", adjective: "Israeli", capital: "Jerusalem", government: "charter-parliamentary-republic", languages: ["Hebrew", "Arabic"], currency: "ILS" },
  geo: { region: "region-middle-east", lat: 31.77, lon: 35.21, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.2, wildfire: 0.15 } },
  stats: {
    demography: { population: 9_400_000, urbanization: 0.93, medianAge: 30, growthRate: 0.012, literacy: 0.98, birthRate: 0.0185, deathRate: 0.0055, netMigration: -0.001 },
    economy: { gdp: 525_000, gdpPerCapita: 55_851, growth: 0.009536, inflation: 0.030748, unemployment: 0.03595, costOfLiving: 1, debt: 325_500, reserves: 200_000, sovereignRating: "A" },
    trade: { exports: 145_000, imports: 105_000, balance: 40_000, topExports: ["semiconductors", "pharma", "mining"], topPartners: [], tradeDependence: {} },
    energy: { production: 350, consumption: 320, importDependence: 0.15, mix: { "energy-gas": 0.7, "energy-oil": 0.15, "energy-renewables": 0.15 } },
    military: {
      budget: 24_000, activeHeadcount: 170_000, reserveHeadcount: 465_000, readiness: 0.8, doctrineQuality: 0.85,
      branchStrength: { land: 0.5, air: 0.8, naval: 0.55, cyber: 0.85, space: 0.5 },
      airliftCapacity: 0.5, sealiftCapacity: 0.3,
      // Israel keeps a policy of ambiguity, so `declared` stays false and no surface prints the count. The 90 is SIPRI's
      // estimate of its stockpile at January 2026 (Yearbook 2026, ch. 8, table 8A.10, which also lists aircraft, Jericho
      // missiles and submarine-launched cruise missiles, hence the means to deliver). A zero here read an armed state as unarmed.
      arsenal: { warheads: 90, deliveryTriad: true, declared: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.2, corruptionIndex: 0.3, insurgencyPressure: 0.35, borderControl: 0.7, intelCapability: 0.9, counterIntel: 0.9 },
    politics: { regimeStability: 0.6, legitimacy: 0.6, factionalism: 0.6, pressFreedom: 0.7, protestPressure: 0.45 },
    softPower: { diplomaticReach: 0.55, culturalReach: 0.4, aidGiven: 0, aidReceived: 3_300 },
  },
  sectors: fillSectorMix(["semiconductors", "pharma", "mining"], { "energy-gas": 0.7, "energy-oil": 0.15, "energy-renewables": 0.15 }, 9_400_000, 0.03),
  traits: {
    aggression: 0.5, opportunism: 0.4, legalism: 0.55, isolationism: 0.2, riskTolerance: 0.5, vengefulness: 0.45, reliability: 0.55, transparency: 0.5,
    agendas: [
      { id: "security-primacy", description: "Prioritize deterrence and preemption over diplomatic risk", weight: 0.7 },
      { id: "tech-export-growth", description: "Grow high-technology export revenue as an economic anchor", weight: 0.5 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "existential-threats", description: "No armed threat to its existence goes unanswered." }], alignmentPull: [US_ID] },
});

// Trading hub, powerTier 2. Charter mapping is approximate (see file
// header): modeled as an absolute monarchy given the federation's
// emirate-led structure, though a federal council also exists.
export const uaeNation = NationInput.parse({
  id: UAE_ID,
  playable: false,
  identity: { name: "United Arab Emirates", adjective: "Emirati", capital: "Abu Dhabi", government: "charter-absolute-monarchy", languages: ["Arabic"], currency: "AED", definiteArticle: true },
  geo: { region: "region-middle-east", lat: 24.47, lon: 54.37, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.2, flood: 0.15 } },
  stats: {
    demography: { population: 9_900_000, urbanization: 0.87, medianAge: 33, growthRate: 0.015, literacy: 0.96, birthRate: 0.0105, deathRate: 0.003, netMigration: 0.0075 },
    economy: { gdp: 507_000, gdpPerCapita: 51_212, growth: 0.039918, inflation: 0.016634, unemployment: 0.0216, costOfLiving: 1, debt: 152_100, reserves: 130_000, sovereignRating: "AA" },
    trade: { exports: 425_000, imports: 320_000, balance: 105_000, topExports: ["energy-oil", "mining"], topPartners: [], tradeDependence: {} },
    energy: { production: 4_500, consumption: 900, importDependence: 0.0, mix: { "energy-oil": 0.6, "energy-gas": 0.35, "energy-renewables": 0.05 } },
    military: {
      budget: 22_000, activeHeadcount: 63_000, reserveHeadcount: 0, readiness: 0.55, doctrineQuality: 0.55,
      branchStrength: { land: 0.4, air: 0.55, naval: 0.35, cyber: 0.35, space: 0.15 },
      airliftCapacity: 0.4, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.1, corruptionIndex: 0.3, insurgencyPressure: 0.02, borderControl: 0.8, intelCapability: 0.5, counterIntel: 0.5 },
    politics: { regimeStability: 0.8, legitimacy: 0.6, factionalism: 0.1, pressFreedom: 0.15, protestPressure: 0.05 },
    softPower: { diplomaticReach: 0.55, culturalReach: 0.35, aidGiven: 3_500, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "mining"], { "energy-oil": 0.6, "energy-gas": 0.35, "energy-renewables": 0.05 }, 9_900_000, 0.02),
  traits: {
    aggression: 0.3, opportunism: 0.55, legalism: 0.5, isolationism: 0.15, riskTolerance: 0.45, vengefulness: 0.2, reliability: 0.6, transparency: 0.3,
    agendas: [
      { id: "post-oil-diversification", description: "Build finance, logistics, and tourism sectors ahead of oil decline", weight: 0.6 },
      { id: "regional-hub-status", description: "Anchor its position as the region's trade and finance gateway", weight: 0.6 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "gulf-shipping", description: "No blockade of Gulf shipping lanes goes unanswered diplomatically." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 3. Accurate charter fit (post-2017 executive
// presidency).
export const turkeyNation = NationInput.parse({
  id: TURKEY_ID,
  playable: false,
  identity: { name: "Turkey", adjective: "Turkish", capital: "Ankara", government: "charter-presidential-republic", languages: ["Turkish"], currency: "TRY" },
  geo: { region: "region-middle-east", lat: 39.93, lon: 32.86, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.45, wildfire: 0.2, flood: 0.1 } },
  stats: {
    demography: { population: 85_000_000, urbanization: 0.77, medianAge: 33, growthRate: 0.008, literacy: 0.97, birthRate: 0.0135, deathRate: 0.006, netMigration: 0.0005 },
    economy: { gdp: 1_110_000, gdpPerCapita: 13_059, growth: 0.033276, inflation: 0.585065, unemployment: 0.088, costOfLiving: 1, debt: 355_200, reserves: 130_000, sovereignRating: "B" },
    trade: { exports: 255_000, imports: 360_000, balance: -105_000, topExports: ["auto", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 900, consumption: 1_400, importDependence: 0.7, mix: { "energy-gas": 0.3, "energy-oil": 0.3, "energy-renewables": 0.4 } },
    military: {
      budget: 15_800, activeHeadcount: 355_000, reserveHeadcount: 380_000, readiness: 0.55, doctrineQuality: 0.55,
      branchStrength: { land: 0.55, air: 0.5, naval: 0.45, cyber: 0.35, space: 0.15 },
      airliftCapacity: 0.3, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 2,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.5, insurgencyPressure: 0.25, borderControl: 0.55, intelCapability: 0.55, counterIntel: 0.7 },
    politics: { regimeStability: 0.55, legitimacy: 0.55, factionalism: 0.5, pressFreedom: 0.3, protestPressure: 0.35 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.5, aidGiven: 8_600, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto", "textiles"], { "energy-gas": 0.3, "energy-oil": 0.3, "energy-renewables": 0.4 }, 85_000_000, 0.1),
  traits: {
    aggression: 0.45, opportunism: 0.5, legalism: 0.4, isolationism: 0.2, riskTolerance: 0.5, vengefulness: 0.4, reliability: 0.45, transparency: 0.25,
    agendas: [
      { id: "regional-leverage", description: "Convert its geographic position into diplomatic leverage between blocs", weight: 0.65 },
      { id: "defense-industry-growth", description: "Grow a domestic defense industry to reduce import dependence", weight: 0.5 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "border-security", description: "No armed group is tolerated operating from across its southern border." }], alignmentPull: [US_ID] },
});

// Post-conflict, powerTier 1, collapsing stability. Charter mapping is
// nominal — the recognized government's writ does not extend across the
// whole territory, which the low legitimacy and high factionalism figures
// are meant to represent.
export const yemenNation = NationInput.parse({
  id: YEMEN_ID,
  playable: false,
  identity: { name: "Yemen", adjective: "Yemeni", capital: "Sanaa", government: "charter-parliamentary-republic", languages: ["Arabic"], currency: "YER" },
  geo: { region: "region-middle-east", lat: 15.35, lon: 44.2, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.2, cyclone: 0.15 } },
  stats: {
    demography: { population: 34_000_000, urbanization: 0.38, medianAge: 20, growthRate: -0.02, literacy: 0.7, birthRate: 0.028, deathRate: 0.006, netMigration: -0.042 },
    economy: { gdp: 21_000, gdpPerCapita: 618, growth: -0.02, inflation: 0.3, unemployment: 0.1697, costOfLiving: 1, debt: 16_800, reserves: 1_200, sovereignRating: "D" },
    trade: { exports: 1_700, imports: 8_000, balance: -6_300, topExports: ["energy-oil", "agriculture", "food-processing"], topPartners: [], tradeDependence: {} },
    energy: { production: 60, consumption: 65, importDependence: 0.3, mix: { "energy-oil": 0.8, "energy-gas": 0.1, "energy-renewables": 0.1 } },
    military: {
      budget: 1_400, activeHeadcount: 143_847, reserveHeadcount: 291, readiness: 0.2, doctrineQuality: 0.15,
      branchStrength: { land: 0.6, air: 0.1, naval: 0.1, cyber: 0.05, space: 0.0 },
      airliftCapacity: 0.05, sealiftCapacity: 0.1, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.55, corruptionIndex: 0.8, insurgencyPressure: 0.8, borderControl: 0.2, intelCapability: 0.2, counterIntel: 0.2 },
    politics: { regimeStability: 0.15, legitimacy: 0.25, factionalism: 0.8, pressFreedom: 0.2, protestPressure: 0.5 },
    softPower: { diplomaticReach: 0.1, culturalReach: 0.15, aidGiven: 0, aidReceived: 4_400 },
  },
  sectors: fillSectorMix(["energy-oil", "agriculture", "food-processing"], { "energy-oil": 0.8, "energy-gas": 0.1, "energy-renewables": 0.1 }, 34_000_000, 0.15),
  traits: {
    aggression: 0.4, opportunism: 0.45, legalism: 0.2, isolationism: 0.4, riskTolerance: 0.55, vengefulness: 0.45, reliability: 0.25, transparency: 0.1,
    agendas: [
      { id: "territorial-reunification", description: "Reassert control over territory held by rival factions", weight: 0.6 },
      { id: "humanitarian-relief", description: "Sustain humanitarian access amid ongoing conflict", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "capital-control", description: "No accommodation of a rival faction's claim to the capital." }], alignmentPull: [] },
});

// Post-conflict, powerTier 1, collapsing stability. Charter mapping is
// nominal for the same reason as Yemen — territorial control is contested,
// not exercised uniformly by the modeled government.
export const syriaNation = NationInput.parse({
  id: SYRIA_ID,
  playable: false,
  identity: { name: "Syria", adjective: "Syrian", capital: "Damascus", government: "charter-presidential-republic", languages: ["Arabic"], currency: "SYP" },
  geo: { region: "region-middle-east", lat: 33.5, lon: 36.3, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, drought: 0.3 } },
  stats: {
    demography: { population: 22_000_000, urbanization: 0.55, medianAge: 24, growthRate: -0.01, literacy: 0.86, birthRate: 0.0225, deathRate: 0.0055, netMigration: -0.027 },
    economy: { gdp: 9_000, gdpPerCapita: 409, growth: -0.002025, inflation: 0.35, unemployment: 0.13359, costOfLiving: 1, debt: 4_500, reserves: 500, sovereignRating: "D" },
    trade: { exports: 700, imports: 5_500, balance: -4_800, topExports: ["energy-oil", "food-processing", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 100, consumption: 150, importDependence: 0.4, mix: { "energy-oil": 0.6, "energy-gas": 0.3, "energy-renewables": 0.1 } },
    military: {
      budget: 1_800, activeHeadcount: 130_000, reserveHeadcount: 100_000, readiness: 0.3, doctrineQuality: 0.3,
      branchStrength: { land: 0.55, air: 0.2, naval: 0.1, cyber: 0.1, space: 0.0 },
      airliftCapacity: 0.1, sealiftCapacity: 0.05, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.5, corruptionIndex: 0.75, insurgencyPressure: 0.7, borderControl: 0.3, intelCapability: 0.4, counterIntel: 0.75 },
    politics: { regimeStability: 0.25, legitimacy: 0.3, factionalism: 0.8, pressFreedom: 0.1, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.15, culturalReach: 0.2, aidGiven: 0, aidReceived: 3_800 },
  },
  sectors: fillSectorMix(["energy-oil", "food-processing", "textiles"], { "energy-oil": 0.6, "energy-gas": 0.3, "energy-renewables": 0.1 }, 22_000_000, 0.15),
  traits: {
    aggression: 0.4, opportunism: 0.4, legalism: 0.2, isolationism: 0.5, riskTolerance: 0.5, vengefulness: 0.45, reliability: 0.25, transparency: 0.1,
    agendas: [
      { id: "post-conflict-reconstruction", description: "Rebuild state institutions and infrastructure after prolonged civil war", weight: 0.6 },
      { id: "factional-balance", description: "Balance rival armed factions still holding territory", weight: 0.65 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "territorial-control", description: "No foreign force partitions or annexes its recognized territory." }], alignmentPull: [] },
});

// Regional power, powerTier 3. Accurate charter fit.
export const egyptNation = NationInput.parse({
  id: EGYPT_ID,
  playable: false,
  identity: { name: "Egypt", adjective: "Egyptian", capital: "Cairo", government: "charter-presidential-republic", languages: ["Arabic"], currency: "EGP" },
  geo: { region: "region-north-africa", lat: 30.04, lon: 31.24, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.3, earthquake: 0.1 } },
  stats: {
    demography: { population: 105_000_000, urbanization: 0.43, medianAge: 25, growthRate: 0.019, literacy: 0.74, birthRate: 0.022, deathRate: 0.0055, netMigration: 0.0025 },
    economy: { gdp: 396_000, gdpPerCapita: 3_771, growth: 0.023992, inflation: 0.282706, unemployment: 0.06817, costOfLiving: 1, debt: 376_200, reserves: 35_000, sovereignRating: "B" },
    trade: { exports: 44_000, imports: 85_000, balance: -41_000, topExports: ["energy-oil", "textiles", "agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 3_000, consumption: 3_200, importDependence: 0.1, mix: { "energy-gas": 0.75, "energy-renewables": 0.2, "energy-oil": 0.05 } },
    military: {
      budget: 5_500, activeHeadcount: 440_000, reserveHeadcount: 480_000, readiness: 0.5, doctrineQuality: 0.45,
      branchStrength: { land: 0.55, air: 0.45, naval: 0.35, cyber: 0.25, space: 0.05 },
      airliftCapacity: 0.3, sealiftCapacity: 0.25, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.55, insurgencyPressure: 0.2, borderControl: 0.5, intelCapability: 0.55, counterIntel: 0.55 },
    politics: { regimeStability: 0.55, legitimacy: 0.5, factionalism: 0.35, pressFreedom: 0.2, protestPressure: 0.3 },
    softPower: { diplomaticReach: 0.55, culturalReach: 0.55, aidGiven: 0, aidReceived: 3_600 },
  },
  sectors: fillSectorMix(["energy-oil", "textiles", "agriculture"], { "energy-gas": 0.75, "energy-renewables": 0.2, "energy-oil": 0.05 }, 105_000_000, 0.07),
  traits: {
    aggression: 0.3, opportunism: 0.4, legalism: 0.45, isolationism: 0.2, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.5, transparency: 0.25,
    agendas: [
      { id: "canal-revenue-protection", description: "Protect revenue from its strategic shipping canal", weight: 0.65 },
      { id: "subsidy-reform", description: "Manage the political cost of reducing state subsidies", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "canal-access", description: "No restriction on free passage through its strategic canal goes unanswered." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 3. Accurate charter fit (President elected by
// Parliament, executive answerable to it).
export const southAfricaNation = NationInput.parse({
  id: SOUTH_AFRICA_ID,
  playable: false,
  identity: { name: "South Africa", adjective: "South African", capital: "Pretoria", government: "charter-parliamentary-republic", languages: ["English", "Zulu", "Afrikaans"], currency: "ZAR" },
  geo: { region: "region-southern-africa", lat: -25.75, lon: 28.19, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.2, wildfire: 0.2 } },
  stats: {
    demography: { population: 60_000_000, urbanization: 0.68, medianAge: 28, growthRate: 0.003, literacy: 0.95, birthRate: 0.0185, deathRate: 0.0095, netMigration: -0.006 },
    economy: { gdp: 405_000, gdpPerCapita: 6_750, growth: 0.005348, inflation: 0.043612, unemployment: 0.32279, costOfLiving: 1, debt: 299_700, reserves: 62_000, sovereignRating: "BB" },
    trade: { exports: 122_000, imports: 110_000, balance: 12_000, topExports: ["mining"], topPartners: [], tradeDependence: {} },
    energy: { production: 1_500, consumption: 1_450, importDependence: 0.1, mix: { "energy-oil": 0.7, "energy-renewables": 0.2, "energy-nuclear": 0.1 } },
    military: {
      budget: 3_200, activeHeadcount: 71_000, reserveHeadcount: 15_000, readiness: 0.35, doctrineQuality: 0.35,
      branchStrength: { land: 0.4, air: 0.35, naval: 0.3, cyber: 0.2, space: 0.05 },
      airliftCapacity: 0.2, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.75, corruptionIndex: 0.55, insurgencyPressure: 0.1, borderControl: 0.4, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.55, legitimacy: 0.55, factionalism: 0.5, pressFreedom: 0.75, protestPressure: 0.5 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.5, aidGiven: 0, aidReceived: 0 },
  },
  sectors: fillSectorMix(["mining"], { "energy-oil": 0.7, "energy-renewables": 0.2, "energy-nuclear": 0.1 }, 60_000_000, 0.32),
  traits: {
    aggression: 0.15, opportunism: 0.35, legalism: 0.55, isolationism: 0.15, riskTolerance: 0.35, vengefulness: 0.2, reliability: 0.5, transparency: 0.5,
    agendas: [
      { id: "regional-mediation", description: "Broker stability efforts across its home region", weight: 0.55 },
      { id: "inequality-reduction", description: "Address persistent economic inequality and unemployment", weight: 0.55 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "sovereign-development", description: "No foreign restriction on domestic economic and land policy." }], alignmentPull: [CHINA_ID] },
});

// Rising power, powerTier 2. Accurate charter fit (federal parliamentary
// system, Prime Minister head of government).
export const ethiopiaNation = NationInput.parse({
  id: ETHIOPIA_ID,
  playable: false,
  identity: { name: "Ethiopia", adjective: "Ethiopian", capital: "Addis Ababa", government: "charter-parliamentary-republic", languages: ["Amharic"], currency: "ETB" },
  geo: { region: "region-east-africa", lat: 9.03, lon: 38.74, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.15 } },
  stats: {
    demography: { population: 126_847_291, urbanization: 0.23, medianAge: 19, growthRate: 0.026, literacy: 0.52, birthRate: 0.03, deathRate: 0.006, netMigration: 0.002 },
    economy: { gdp: 156_000, gdpPerCapita: 1_238, growth: 0.076128, inflation: 0.210377, unemployment: 0.03357, costOfLiving: 1, debt: 59_280, reserves: 1_500, sovereignRating: "CCC" },
    trade: { exports: 4_200, imports: 17_000, balance: -12_800, topExports: ["agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 500, consumption: 480, importDependence: 0.05, mix: { "energy-renewables": 0.95, "energy-gas": 0.05 } },
    military: {
      budget: 1_100, activeHeadcount: 162_847, reserveHeadcount: 58_291, readiness: 0.35, doctrineQuality: 0.3,
      branchStrength: { land: 0.65, air: 0.2, naval: 0.0, cyber: 0.1, space: 0.02 },
      airliftCapacity: 0.1, sealiftCapacity: 0.0, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.35, corruptionIndex: 0.55, insurgencyPressure: 0.45, borderControl: 0.4, intelCapability: 0.35, counterIntel: 0.35 },
    politics: { regimeStability: 0.35, legitimacy: 0.4, factionalism: 0.65, pressFreedom: 0.2, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.5, culturalReach: 0.4, aidGiven: 0, aidReceived: 4_500 },
  },
  sectors: fillSectorMix(["agriculture"], { "energy-renewables": 0.95, "energy-gas": 0.05 }, 126_847_291, 0.03),
  traits: {
    aggression: 0.35, opportunism: 0.4, legalism: 0.35, isolationism: 0.25, riskTolerance: 0.5, vengefulness: 0.35, reliability: 0.4, transparency: 0.25,
    agendas: [
      { id: "hydropower-development", description: "Complete and defend hydropower infrastructure over downstream objections", weight: 0.65 },
      { id: "federal-cohesion", description: "Hold its multi-ethnic federal structure together against centrifugal pressure", weight: 0.55 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "dam-control", description: "No foreign veto over operation of its river infrastructure." }], alignmentPull: [CHINA_ID] },
});

// Post-conflict, powerTier 1, collapsing stability. Accurate charter fit.
export const drCongoNation = NationInput.parse({
  id: DR_CONGO_ID,
  playable: false,
  identity: { name: "Democratic Republic of the Congo", adjective: "Congolese", capital: "Kinshasa", government: "charter-presidential-republic", languages: ["French"], currency: "CDF", definiteArticle: true },
  geo: { region: "region-central-africa", lat: -4.32, lon: 15.32, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2, earthquake: 0.15, pandemic: 0.25 } },
  stats: {
    demography: { population: 102_000_000, urbanization: 0.47, medianAge: 17, growthRate: 0.032, literacy: 0.77, birthRate: 0.04, deathRate: 0.008, netMigration: 0 },
    economy: { gdp: 66_000, gdpPerCapita: 647, growth: 0.061025, inflation: 0.2, unemployment: 0.04421, costOfLiving: 1, debt: 10_560, reserves: 5_000, sovereignRating: "CCC" },
    trade: { exports: 25_000, imports: 20_000, balance: 5_000, topExports: ["mining"], topPartners: [], tradeDependence: {} },
    energy: { production: 60, consumption: 60, importDependence: 0.05, mix: { "energy-renewables": 0.9, "energy-oil": 0.1 } },
    military: {
      budget: 700, activeHeadcount: 134_291, reserveHeadcount: 471, readiness: 0.2, doctrineQuality: 0.2,
      branchStrength: { land: 0.6, air: 0.1, naval: 0.05, cyber: 0.05, space: 0.0 },
      airliftCapacity: 0.05, sealiftCapacity: 0.05, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.6, corruptionIndex: 0.75, insurgencyPressure: 0.7, borderControl: 0.2, intelCapability: 0.2, counterIntel: 0.2 },
    politics: { regimeStability: 0.2, legitimacy: 0.3, factionalism: 0.75, pressFreedom: 0.3, protestPressure: 0.45 },
    softPower: { diplomaticReach: 0.2, culturalReach: 0.3, aidGiven: 0, aidReceived: 3_000 },
  },
  sectors: fillSectorMix(["mining"], { "energy-renewables": 0.9, "energy-oil": 0.1 }, 102_000_000, 0.05),
  traits: {
    aggression: 0.35, opportunism: 0.5, legalism: 0.25, isolationism: 0.3, riskTolerance: 0.55, vengefulness: 0.35, reliability: 0.3, transparency: 0.15,
    agendas: [
      { id: "mineral-revenue-capture", description: "Capture more value from mineral extraction for the state", weight: 0.6 },
      { id: "eastern-pacification", description: "Reduce the reach of armed groups in the eastern provinces", weight: 0.6 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "territorial-integrity", description: "No foreign-backed armed group is granted territorial control." }], alignmentPull: [CHINA_ID] },
});

// Rising power, powerTier 1. Accurate charter fit.
export const rwandaNation = NationInput.parse({
  id: RWANDA_ID,
  playable: false,
  identity: { name: "Rwanda", adjective: "Rwandan", capital: "Kigali", government: "charter-presidential-republic", languages: ["Kinyarwanda", "English", "French"], currency: "RWF" },
  geo: { region: "region-east-africa", lat: -1.94, lon: 30.06, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.25, drought: 0.15, earthquake: 0.15 } },
  stats: {
    demography: { population: 14_000_000, urbanization: 0.19, medianAge: 20, growthRate: 0.024, literacy: 0.75, birthRate: 0.027, deathRate: 0.0055, netMigration: 0.0025 },
    economy: { gdp: 13_700, gdpPerCapita: 979, growth: 0.072272, inflation: 0.017703, unemployment: 0.11331, costOfLiving: 1, debt: 8_220, reserves: 2_000, sovereignRating: "B" },
    trade: { exports: 1_800, imports: 4_200, balance: -2_400, topExports: ["agriculture", "mining"], topPartners: [], tradeDependence: {} },
    energy: { production: 25, consumption: 25, importDependence: 0.1, mix: { "energy-renewables": 0.6, "energy-oil": 0.4 } },
    military: {
      budget: 180, activeHeadcount: 33_847, reserveHeadcount: 471, readiness: 0.5, doctrineQuality: 0.5,
      branchStrength: { land: 0.6, air: 0.15, naval: 0.0, cyber: 0.15, space: 0.0 },
      airliftCapacity: 0.1, sealiftCapacity: 0.0, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.2, corruptionIndex: 0.2, insurgencyPressure: 0.05, borderControl: 0.6, intelCapability: 0.55, counterIntel: 0.55 },
    politics: { regimeStability: 0.8, legitimacy: 0.55, factionalism: 0.1, pressFreedom: 0.2, protestPressure: 0.1 },
    softPower: { diplomaticReach: 0.45, culturalReach: 0.3, aidGiven: 0, aidReceived: 1_000 },
  },
  sectors: fillSectorMix(["agriculture", "mining"], { "energy-renewables": 0.6, "energy-oil": 0.4 }, 14_000_000, 0.16),
  traits: {
    aggression: 0.25, opportunism: 0.4, legalism: 0.5, isolationism: 0.2, riskTolerance: 0.4, vengefulness: 0.2, reliability: 0.55, transparency: 0.35,
    agendas: [
      { id: "services-hub-strategy", description: "Build a regional services and logistics hub despite being landlocked", weight: 0.6 },
      { id: "genocide-prevention-legacy", description: "Center reconciliation and prevention in national institutions", weight: 0.5 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "national-security", description: "No cross-border threat to internal stability goes unanswered." }], alignmentPull: [] },
});

// Middle power, powerTier 2. Charter mapping is approximate (see file
// header): modeled as an absolute monarchy given the King's dominant
// executive role, though an elected parliament also exists.
export const moroccoNation = NationInput.parse({
  id: MOROCCO_ID,
  playable: false,
  identity: { name: "Morocco", adjective: "Moroccan", capital: "Rabat", government: "charter-absolute-monarchy", languages: ["Arabic", "French"], currency: "MAD" },
  geo: { region: "region-north-africa", lat: 34.02, lon: -6.83, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.3, drought: 0.3 } },
  stats: {
    demography: { population: 37_000_000, urbanization: 0.64, medianAge: 30, growthRate: 0.009, literacy: 0.76, birthRate: 0.0155, deathRate: 0.0065, netMigration: 0 },
    economy: { gdp: 142_000, gdpPerCapita: 3_838, growth: 0.037934, inflation: 0.009853, unemployment: 0.09103, costOfLiving: 1, debt: 97_980, reserves: 36_000, sovereignRating: "BB" },
    trade: { exports: 40_000, imports: 66_000, balance: -26_000, topExports: ["auto", "mining", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 150, consumption: 400, importDependence: 0.9, mix: { "energy-oil": 0.5, "energy-renewables": 0.35, "energy-gas": 0.15 } },
    military: {
      budget: 5_400, activeHeadcount: 196_000, reserveHeadcount: 150_000, readiness: 0.45, doctrineQuality: 0.4,
      branchStrength: { land: 0.5, air: 0.35, naval: 0.3, cyber: 0.2, space: 0.05 },
      airliftCapacity: 0.2, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.5, insurgencyPressure: 0.1, borderControl: 0.55, intelCapability: 0.55, counterIntel: 0.7 },
    politics: { regimeStability: 0.65, legitimacy: 0.55, factionalism: 0.3, pressFreedom: 0.35, protestPressure: 0.25 },
    softPower: { diplomaticReach: 0.45, culturalReach: 0.4, aidGiven: 0, aidReceived: 500 },
  },
  sectors: fillSectorMix(["auto", "mining", "textiles"], { "energy-oil": 0.5, "energy-renewables": 0.35, "energy-gas": 0.15 }, 37_000_000, 0.12),
  traits: {
    aggression: 0.2, opportunism: 0.4, legalism: 0.5, isolationism: 0.2, riskTolerance: 0.35, vengefulness: 0.25, reliability: 0.55, transparency: 0.3,
    agendas: [
      { id: "manufacturing-diversification", description: "Grow automotive and aerospace manufacturing beyond phosphate dependence", weight: 0.55 },
      { id: "territorial-claims", description: "Consolidate international recognition of its contested southern territory", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "territorial-claims", description: "No foreign recognition of a rival claim to its contested southern territory." }], alignmentPull: [US_ID] },
});

// Resource exporter, powerTier 2. Accurate charter fit.
export const algeriaNation = NationInput.parse({
  id: ALGERIA_ID,
  playable: false,
  identity: { name: "Algeria", adjective: "Algerian", capital: "Algiers", government: "charter-presidential-republic", languages: ["Arabic"], currency: "DZD" },
  geo: { region: "region-north-africa", lat: 36.75, lon: 3.06, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.25, drought: 0.25 } },
  stats: {
    demography: { population: 45_000_000, urbanization: 0.75, medianAge: 29, growthRate: 0.016, literacy: 0.81, birthRate: 0.02, deathRate: 0.0045, netMigration: 0.0005 },
    economy: { gdp: 240_000, gdpPerCapita: 5_333, growth: 0.037, inflation: 0.040461, unemployment: 0.11655, costOfLiving: 1, debt: 120_000, reserves: 68_000, sovereignRating: "B" },
    trade: { exports: 60_000, imports: 45_000, balance: 15_000, topExports: ["energy-oil", "energy-gas"], topPartners: [], tradeDependence: {} },
    energy: { production: 5_000, consumption: 2_000, importDependence: 0.0, mix: { "energy-gas": 0.65, "energy-oil": 0.3, "energy-renewables": 0.05 } },
    military: {
      budget: 23_000, activeHeadcount: 130_000, reserveHeadcount: 400_000, readiness: 0.55, doctrineQuality: 0.5,
      branchStrength: { land: 0.55, air: 0.45, naval: 0.35, cyber: 0.25, space: 0.05 },
      airliftCapacity: 0.25, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.55, insurgencyPressure: 0.15, borderControl: 0.55, intelCapability: 0.55, counterIntel: 0.7 },
    politics: { regimeStability: 0.55, legitimacy: 0.5, factionalism: 0.3, pressFreedom: 0.2, protestPressure: 0.35 },
    softPower: { diplomaticReach: 0.4, culturalReach: 0.3, aidGiven: 0, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "energy-gas"], { "energy-gas": 0.65, "energy-oil": 0.3, "energy-renewables": 0.05 }, 45_000_000, 0.12),
  traits: {
    aggression: 0.3, opportunism: 0.35, legalism: 0.45, isolationism: 0.4, riskTolerance: 0.35, vengefulness: 0.3, reliability: 0.5, transparency: 0.25,
    agendas: [
      { id: "hydrocarbon-revenue-diversification", description: "Diversify state revenue beyond hydrocarbons", weight: 0.55 },
      { id: "regional-deterrence", description: "Maintain a large conventional deterrent against regional rivals", weight: 0.55 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "non-alignment", description: "No permanent foreign military basing on its territory." }], alignmentPull: [RUSSIA_ID] },
});

// Great power, powerTier 4. Charter mapping is approximate (see file
// header): modeled as a parliamentary republic for its Westminster
// cabinet government, though the constitutional-monarchy head of state is
// not represented as a distinct field.
export const ukNation = NationInput.parse({
  id: UK_ID,
  playable: false,
  identity: { name: "United Kingdom", adjective: "British", capital: "London", government: "charter-parliamentary-republic", languages: ["English"], currency: "GBP", definiteArticle: true },
  geo: { region: "region-western-europe", lat: 51.5, lon: -0.13, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2, drought: 0.1 } },
  stats: {
    demography: { population: 68_291_847, urbanization: 0.84, medianAge: 40, growthRate: 0.004, literacy: 0.99, birthRate: 0.0105, deathRate: 0.0095, netMigration: 0.003 },
    economy: { gdp: 3_340_000, gdpPerCapita: 49_118, growth: 0.010803, inflation: 0.032716, unemployment: 0.04361, costOfLiving: 1, debt: 3_340_000, reserves: 170_000, sovereignRating: "AA" },
    trade: { exports: 900_000, imports: 1_000_000, balance: -100_000, topExports: ["pharma", "finance"], topPartners: [], tradeDependence: {} },
    energy: { production: 900, consumption: 1_500, importDependence: 0.35, mix: { "energy-gas": 0.35, "energy-renewables": 0.35, "energy-nuclear": 0.15, "energy-oil": 0.15 } },
    military: {
      budget: 68_472, activeHeadcount: 151_294, reserveHeadcount: 41_847, readiness: 0.65, doctrineQuality: 0.8,
      branchStrength: { land: 0.45, air: 0.65, naval: 0.65, cyber: 0.7, space: 0.3 },
      airliftCapacity: 0.5, sealiftCapacity: 0.4, arsenal: { warheads: 225, deliveryTriad: true }, basesAbroad: 145,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.15, insurgencyPressure: 0.05, borderControl: 0.6, intelCapability: 0.8, counterIntel: 0.75 },
    politics: { regimeStability: 0.75, legitimacy: 0.7, factionalism: 0.45, pressFreedom: 0.85, protestPressure: 0.3 },
    softPower: { diplomaticReach: 0.85, culturalReach: 0.8, aidGiven: 15_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["pharma", "finance"], { "energy-gas": 0.35, "energy-renewables": 0.35, "energy-nuclear": 0.15, "energy-oil": 0.15 }, 68_291_847, 0.04),
  traits: {
    aggression: 0.4, opportunism: 0.4, legalism: 0.65, isolationism: 0.2, riskTolerance: 0.4, vengefulness: 0.25, reliability: 0.65, transparency: 0.6,
    agendas: [
      { id: "global-role-post-empire", description: "Maintain global diplomatic and military reach on a shrinking relative budget", weight: 0.55 },
      { id: "financial-sector-leadership", description: "Defend its financial services sector's global position", weight: 0.5 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "territorial-waters", description: "No incursion into its territorial waters or overseas territories goes unanswered." }], alignmentPull: [] },
});

// Great power, powerTier 4. Charter mapping is approximate (see file
// header): modeled as a presidential republic given the directly elected
// head of state, though the semi-presidential system also has a Prime
// Minister answerable to Parliament.
export const franceNation = NationInput.parse({
  id: FRANCE_ID,
  playable: false,
  identity: { name: "France", adjective: "French", capital: "Paris", government: "charter-presidential-republic", languages: ["French"], currency: "EUR" },
  geo: { region: "region-western-europe", lat: 48.86, lon: 2.35, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.2, wildfire: 0.15, flood: 0.15 } },
  stats: {
    demography: { population: 66_000_000, urbanization: 0.81, medianAge: 42, growthRate: 0.003, literacy: 0.99, birthRate: 0.0105, deathRate: 0.01, netMigration: 0.0025 },
    economy: { gdp: 3_030_000, gdpPerCapita: 45_909, growth: 0.011905, inflation: 0.01999, unemployment: 0.074, costOfLiving: 1, debt: 3_333_000, reserves: 220_000, sovereignRating: "AA" },
    trade: { exports: 800_000, imports: 900_000, balance: -100_000, topExports: ["aerospace", "auto", "pharma"], topPartners: [], tradeDependence: {} },
    energy: { production: 2_000, consumption: 2_400, importDependence: 0.4, mix: { "energy-nuclear": 0.65, "energy-renewables": 0.25, "energy-gas": 0.05, "energy-oil": 0.05 } },
    military: {
      budget: 56_847, activeHeadcount: 203_847, reserveHeadcount: 42_291, readiness: 0.65, doctrineQuality: 0.8,
      branchStrength: { land: 0.5, air: 0.6, naval: 0.6, cyber: 0.65, space: 0.35 },
      airliftCapacity: 0.5, sealiftCapacity: 0.4, arsenal: { warheads: 290, deliveryTriad: true }, basesAbroad: 12,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.2, insurgencyPressure: 0.05, borderControl: 0.55, intelCapability: 0.75, counterIntel: 0.75 },
    politics: { regimeStability: 0.65, legitimacy: 0.6, factionalism: 0.55, pressFreedom: 0.8, protestPressure: 0.5 },
    softPower: { diplomaticReach: 0.85, culturalReach: 0.85, aidGiven: 15_500, aidReceived: 0 },
  },
  sectors: fillSectorMix(["aerospace", "auto", "pharma"], { "energy-nuclear": 0.65, "energy-renewables": 0.25, "energy-gas": 0.05, "energy-oil": 0.05 }, 66_000_000, 0.07),
  traits: {
    aggression: 0.4, opportunism: 0.4, legalism: 0.65, isolationism: 0.2, riskTolerance: 0.4, vengefulness: 0.25, reliability: 0.6, transparency: 0.55,
    agendas: [
      { id: "strategic-autonomy", description: "Pursue defense and industrial autonomy from any single bloc", weight: 0.6 },
      { id: "african-partnerships", description: "Maintain historic partnerships across its former colonial sphere", weight: 0.45 },
    ],
  },
  doctrine: { posture: "assertive", redLines: [{ id: "nuclear-deterrent", description: "No compromise on control of its independent nuclear deterrent." }], alignmentPull: [] },
});

// Regional power, powerTier 3. Accurate charter fit.
export const italyNation = NationInput.parse({
  id: ITALY_ID,
  playable: false,
  identity: { name: "Italy", adjective: "Italian", capital: "Rome", government: "charter-parliamentary-republic", languages: ["Italian"], currency: "EUR" },
  geo: { region: "region-southern-europe", lat: 41.9, lon: 12.5, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, flood: 0.2 } },
  stats: {
    demography: { population: 59_000_000, urbanization: 0.71, medianAge: 47, growthRate: 0.0, literacy: 0.99, birthRate: 0.0068, deathRate: 0.0115, netMigration: 0.0047 },
    economy: { gdp: 2_190_000, gdpPerCapita: 37_119, growth: 0.00783, inflation: 0.009824, unemployment: 0.065, costOfLiving: 1, debt: 3_066_000, reserves: 190_000, sovereignRating: "BBB" },
    trade: { exports: 640_000, imports: 610_000, balance: 30_000, topExports: ["auto", "textiles"], topPartners: [], tradeDependence: {} },
    energy: { production: 400, consumption: 1_200, importDependence: 0.75, mix: { "energy-gas": 0.4, "energy-renewables": 0.35, "energy-oil": 0.25 } },
    military: {
      budget: 32_000, activeHeadcount: 165_000, reserveHeadcount: 18_000, readiness: 0.5, doctrineQuality: 0.55,
      branchStrength: { land: 0.45, air: 0.5, naval: 0.5, cyber: 0.45, space: 0.2 },
      airliftCapacity: 0.3, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 5,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.35, insurgencyPressure: 0.05, borderControl: 0.55, intelCapability: 0.5, counterIntel: 0.5 },
    politics: { regimeStability: 0.55, legitimacy: 0.6, factionalism: 0.55, pressFreedom: 0.7, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.65, culturalReach: 0.7, aidGiven: 6_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto", "textiles"], { "energy-gas": 0.4, "energy-renewables": 0.35, "energy-oil": 0.25 }, 59_000_000, 0.075),
  traits: {
    aggression: 0.2, opportunism: 0.4, legalism: 0.6, isolationism: 0.2, riskTolerance: 0.35, vengefulness: 0.2, reliability: 0.55, transparency: 0.5,
    agendas: [
      { id: "debt-management", description: "Manage a large public debt load without triggering a fiscal crisis", weight: 0.6 },
      { id: "mediterranean-migration", description: "Manage migration flows across the Mediterranean", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "eu-fiscal-sovereignty", description: "No external override of core fiscal policy decisions." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 3. Charter mapping is approximate (see file
// header): modeled as a parliamentary republic for its cabinet government,
// though the constitutional-monarchy head of state is not represented as a
// distinct field.
export const spainNation = NationInput.parse({
  id: SPAIN_ID,
  playable: false,
  identity: { name: "Spain", adjective: "Spanish", capital: "Madrid", government: "charter-parliamentary-republic", languages: ["Spanish"], currency: "EUR" },
  geo: { region: "region-southern-europe", lat: 40.42, lon: -3.7, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, wildfire: 0.35, flood: 0.2 } },
  stats: {
    demography: { population: 48_000_000, urbanization: 0.81, medianAge: 44, growthRate: 0.008, literacy: 0.98, birthRate: 0.007, deathRate: 0.0095, netMigration: 0.0105 },
    economy: { gdp: 1_580_000, gdpPerCapita: 32_917, growth: 0.034553, inflation: 0.027471, unemployment: 0.114, costOfLiving: 1, debt: 1_738_000, reserves: 90_000, sovereignRating: "A" },
    trade: { exports: 430_000, imports: 450_000, balance: -20_000, topExports: ["auto", "agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 300, consumption: 1_000, importDependence: 0.7, mix: { "energy-renewables": 0.45, "energy-gas": 0.25, "energy-nuclear": 0.2, "energy-oil": 0.1 } },
    military: {
      budget: 20_000, activeHeadcount: 122_000, reserveHeadcount: 15_000, readiness: 0.5, doctrineQuality: 0.55,
      branchStrength: { land: 0.4, air: 0.45, naval: 0.5, cyber: 0.4, space: 0.15 },
      airliftCapacity: 0.3, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 2,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.35, insurgencyPressure: 0.05, borderControl: 0.6, intelCapability: 0.5, counterIntel: 0.5 },
    politics: { regimeStability: 0.6, legitimacy: 0.6, factionalism: 0.55, pressFreedom: 0.75, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.65, aidGiven: 3_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto", "agriculture"], { "energy-renewables": 0.45, "energy-gas": 0.25, "energy-nuclear": 0.2, "energy-oil": 0.1 }, 48_000_000, 0.12),
  traits: {
    aggression: 0.2, opportunism: 0.35, legalism: 0.6, isolationism: 0.2, riskTolerance: 0.35, vengefulness: 0.2, reliability: 0.55, transparency: 0.5,
    agendas: [
      { id: "regional-cohesion", description: "Hold together a state with strong regional autonomy movements", weight: 0.55 },
      { id: "renewable-transition", description: "Lead a rapid transition to renewable energy generation", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "territorial-unity", description: "No accommodation of a unilateral regional secession referendum." }], alignmentPull: [US_ID] },
});

// Post-conflict, powerTier 2, volatile stability. Charter mapping is
// approximate (see file header): modeled as a presidential republic for
// its directly elected head of state, closest to its actual
// semi-presidential system.
export const ukraineNation = NationInput.parse({
  id: UKRAINE_ID,
  playable: false,
  identity: { name: "Ukraine", adjective: "Ukrainian", capital: "Kyiv", government: "charter-presidential-republic", languages: ["Ukrainian"], currency: "UAH" },
  geo: { region: "region-eastern-europe", lat: 50.45, lon: 30.52, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.3, flood: 0.15 } },
  stats: {
    demography: { population: 36_000_000, urbanization: 0.7, medianAge: 41, growthRate: -0.05, literacy: 0.99, birthRate: 0.006, deathRate: 0.0185, netMigration: -0.0375 },
    economy: { gdp: 178_000, gdpPerCapita: 4_944, growth: 0.032481, inflation: 0.06502, unemployment: 0.09834, costOfLiving: 1, debt: 160_200, reserves: 40_000, sovereignRating: "CCC" },
    trade: { exports: 42_000, imports: 60_000, balance: -18_000, topExports: ["agriculture", "mining", "steel-heavy"], topPartners: [], tradeDependence: {} },
    energy: { production: 500, consumption: 550, importDependence: 0.3, mix: { "energy-nuclear": 0.5, "energy-oil": 0.25, "energy-renewables": 0.2, "energy-gas": 0.05 } },
    military: {
      budget: 44_000, activeHeadcount: 900_000, reserveHeadcount: 400_000, readiness: 0.7, doctrineQuality: 0.55,
      branchStrength: { land: 0.7, air: 0.35, naval: 0.15, cyber: 0.5, space: 0.05 },
      airliftCapacity: 0.15, sealiftCapacity: 0.05, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.35, corruptionIndex: 0.55, insurgencyPressure: 0.3, borderControl: 0.3, intelCapability: 0.55, counterIntel: 0.55 },
    politics: { regimeStability: 0.35, legitimacy: 0.65, factionalism: 0.35, pressFreedom: 0.55, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.5, aidGiven: 0, aidReceived: 45_000 },
  },
  sectors: fillSectorMix(["agriculture", "mining", "steel-heavy"], { "energy-nuclear": 0.5, "energy-oil": 0.25, "energy-renewables": 0.2, "energy-gas": 0.05 }, 36_000_000, 0.18),
  traits: {
    aggression: 0.5, opportunism: 0.35, legalism: 0.55, isolationism: 0.1, riskTolerance: 0.6, vengefulness: 0.45, reliability: 0.6, transparency: 0.5,
    agendas: [
      { id: "territorial-defense", description: "Recover and hold territory against ongoing invasion", weight: 0.8 },
      { id: "donor-dependence-management", description: "Sustain the war economy on external military and financial support", weight: 0.6 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "territorial-integrity", description: "No permanent cession of internationally recognized territory." }], alignmentPull: [US_ID] },
});

// Great power, powerTier 5. Accurate charter fit structurally (fixed-term
// elected executive, impeachment provision exists constitutionally even
// though it has never removed a sitting president in practice).
export const russiaNation = NationInput.parse({
  id: RUSSIA_ID,
  playable: false,
  identity: { name: "Russia", adjective: "Russian", capital: "Moscow", government: "charter-presidential-republic", languages: ["Russian"], currency: "RUB" },
  geo: { region: "region-eastern-europe", lat: 55.75, lon: 37.6, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { wildfire: 0.4, flood: 0.15, earthquake: 0.25 } },
  stats: {
    demography: { population: 144_382_847, urbanization: 0.75, medianAge: 40, growthRate: -0.002, literacy: 0.99, birthRate: 0.009, deathRate: 0.0135, netMigration: 0.0025 },
    economy: { gdp: 2_020_000, gdpPerCapita: 14_028, growth: 0.049217, inflation: 0.084349, unemployment: 0.0243, costOfLiving: 1, debt: 343_400, reserves: 590_000, sovereignRating: "CCC" },
    trade: { exports: 425_000, imports: 285_000, balance: 140_000, topExports: ["energy-oil", "energy-gas", "steel-heavy"], topPartners: [], tradeDependence: {} },
    energy: { production: 15_000, consumption: 8_000, importDependence: 0.0, mix: { "energy-gas": 0.5, "energy-oil": 0.2, "energy-nuclear": 0.2, "energy-renewables": 0.1 } },
    military: {
      budget: 109_427, activeHeadcount: 1_341_847, reserveHeadcount: 2_000_471, readiness: 0.55, doctrineQuality: 0.55,
      branchStrength: { land: 0.6, air: 0.55, naval: 0.45, cyber: 0.6, space: 0.5 },
      airliftCapacity: 0.3, sealiftCapacity: 0.25, arsenal: { warheads: 5_580, deliveryTriad: true }, basesAbroad: 20,
      // Named formations so a war against this capital can be counted rather
      // than captioned. The rocket forces stay with the ground line they were
      // raised out of; naval infantry is the marine line.
      orderOfBattle: {
        army: {
          headcount: 858_000,
          capabilities: [
            { name: "army.combined-arms-army", count: 11 },
            { name: "army.airborne-division", count: 4 },
          ],
          units: [
            { type: "army.brigade-combat-team", count: 40, readiness: 0.5 },
            { type: "army.air-defense-battalion", count: 18, readiness: 0.48 },
          ],
        },
        navy: {
          headcount: 200_000,
          capabilities: [
            { name: "navy.carrier-strike-group", count: 1 },
            { name: "navy.fleet", label: "Northern and Pacific fleets", count: 2 },
          ],
          units: [
            { type: "navy.aircraft-carrier", count: 1, readiness: 0.4 },
            { type: "navy.surface-combatant", count: 45, readiness: 0.45 },
            { type: "navy.attack-submarine", count: 30, readiness: 0.5 },
          ],
        },
        air: {
          headcount: 200_000,
          capabilities: [{ name: "air.fighter-regiment", count: 24 }],
          units: [
            { type: "air.fighter", count: 700, readiness: 0.5 },
            { type: "air.strategic-bomber", count: 120, readiness: 0.45 },
          ],
        },
        marines: {
          headcount: 47_000,
          capabilities: [{ name: "marines.brigade", label: "Naval infantry brigades", count: 5 }],
          units: [{ type: "marines.infantry-regiment", count: 5, readiness: 0.55 }],
        },
        space: {
          headcount: 20_000,
          capabilities: [{ name: "space.missile-warning-constellation", label: "Missile-warning systems", count: 4 }],
          units: [{ type: "space.missile-warning-constellation", count: 2, readiness: 0.55 }],
        },
        cyber: {
          headcount: 16_000,
          capabilities: [{ name: "cyber.mission-force-team", label: "Information troops", count: 8 }],
          units: [{ type: "cyber.national-mission-team", count: 8, readiness: 0.6 }],
        },
      },
    },
    security: { crimeIndex: 0.35, corruptionIndex: 0.6, insurgencyPressure: 0.15, borderControl: 0.55, intelCapability: 0.8, counterIntel: 0.9 },
    politics: { regimeStability: 0.65, legitimacy: 0.45, factionalism: 0.2, pressFreedom: 0.1, protestPressure: 0.15 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.55, aidGiven: 0, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-oil", "energy-gas", "steel-heavy"], { "energy-gas": 0.5, "energy-oil": 0.2, "energy-nuclear": 0.2, "energy-renewables": 0.1 }, 144_382_847, 0.03),
  traits: {
    aggression: 0.7, opportunism: 0.55, legalism: 0.3, isolationism: 0.45, riskTolerance: 0.6, vengefulness: 0.55, reliability: 0.35, transparency: 0.1,
    agendas: [
      { id: "sphere-of-influence", description: "Reassert dominant influence over its immediate periphery", weight: 0.75 },
      { id: "sanctions-resilience", description: "Reroute trade and finance around sustained international sanctions", weight: 0.6 },
    ],
  },
  doctrine: { posture: "expansionist", redLines: [{ id: "strategic-depth", description: "No further alliance expansion along its border goes unanswered." }], alignmentPull: [CHINA_ID] },
});

// Middle power, powerTier 2. Charter mapping is approximate (see file
// header): modeled as a parliamentary republic for its cabinet government,
// though the constitutional-monarchy head of state is not represented as a
// distinct field.
export const swedenNation = NationInput.parse({
  id: SWEDEN_ID,
  playable: false,
  identity: { name: "Sweden", adjective: "Swedish", capital: "Stockholm", government: "charter-parliamentary-republic", languages: ["Swedish"], currency: "SEK" },
  geo: { region: "region-northern-europe", lat: 59.33, lon: 18.07, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { wildfire: 0.15, flood: 0.1 } },
  stats: {
    demography: { population: 10_500_000, urbanization: 0.88, medianAge: 41, growthRate: 0.006, literacy: 0.99, birthRate: 0.0105, deathRate: 0.0095, netMigration: 0.005 },
    economy: { gdp: 590_000, gdpPerCapita: 56_190, growth: 0.010178, inflation: 0.028358, unemployment: 0.084, costOfLiving: 1, debt: 188_800, reserves: 65_000, sovereignRating: "AAA" },
    trade: { exports: 190_000, imports: 180_000, balance: 10_000, topExports: ["auto", "pharma"], topPartners: [], tradeDependence: {} },
    energy: { production: 200, consumption: 550, importDependence: 0.3, mix: { "energy-renewables": 0.7, "energy-nuclear": 0.3 } },
    military: {
      budget: 8_500, activeHeadcount: 24_000, reserveHeadcount: 22_000, readiness: 0.5, doctrineQuality: 0.65,
      branchStrength: { land: 0.35, air: 0.5, naval: 0.4, cyber: 0.55, space: 0.15 },
      airliftCapacity: 0.25, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.25, corruptionIndex: 0.1, insurgencyPressure: 0.02, borderControl: 0.7, intelCapability: 0.5, counterIntel: 0.5 },
    politics: { regimeStability: 0.9, legitimacy: 0.8, factionalism: 0.35, pressFreedom: 0.95, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.65, culturalReach: 0.5, aidGiven: 5_600, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto", "pharma"], { "energy-renewables": 0.7, "energy-nuclear": 0.3 }, 10_500_000, 0.075),
  traits: {
    aggression: 0.15, opportunism: 0.3, legalism: 0.75, isolationism: 0.15, riskTolerance: 0.35, vengefulness: 0.15, reliability: 0.75, transparency: 0.75,
    agendas: [
      { id: "alliance-integration", description: "Integrate into its new collective-defense alliance after decades of non-alignment", weight: 0.6 },
      { id: "welfare-state-sustainability", description: "Sustain its welfare model under demographic and fiscal pressure", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "baltic-security", description: "No hostile military presence in its adjacent waters goes unanswered." }], alignmentPull: [US_ID] },
});

// Trading hub, powerTier 2. Accurate charter fit — a genuine structural
// match: a Federal Council of ministers answerable to a confederation of
// cantons is exactly what the confederal-council charter models.
export const switzerlandNation = NationInput.parse({
  id: SWITZERLAND_ID,
  playable: false,
  identity: { name: "Switzerland", adjective: "Swiss", capital: "Bern", government: "charter-confederal-council", languages: ["German", "French", "Italian"], currency: "CHF" },
  geo: { region: "region-western-europe", lat: 46.95, lon: 7.45, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.15 } },
  stats: {
    demography: { population: 8_800_000, urbanization: 0.74, medianAge: 43, growthRate: 0.007, literacy: 0.99, birthRate: 0.0095, deathRate: 0.0085, netMigration: 0.006 },
    economy: { gdp: 885_000, gdpPerCapita: 100_568, growth: 0.013903, inflation: 0.010623, unemployment: 0.04343, costOfLiving: 1, debt: 336_300, reserves: 800_000, sovereignRating: "AAA" },
    trade: { exports: 400_000, imports: 340_000, balance: 60_000, topExports: ["pharma"], topPartners: [], tradeDependence: {} },
    energy: { production: 60, consumption: 260, importDependence: 0.5, mix: { "energy-renewables": 0.7, "energy-nuclear": 0.3 } },
    military: {
      budget: 6_300, activeHeadcount: 21_000, reserveHeadcount: 130_000, readiness: 0.45, doctrineQuality: 0.5,
      branchStrength: { land: 0.5, air: 0.35, naval: 0.0, cyber: 0.4, space: 0.05 },
      airliftCapacity: 0.1, sealiftCapacity: 0.0, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.15, corruptionIndex: 0.05, insurgencyPressure: 0.01, borderControl: 0.7, intelCapability: 0.45, counterIntel: 0.5 },
    politics: { regimeStability: 0.95, legitimacy: 0.85, factionalism: 0.2, pressFreedom: 0.9, protestPressure: 0.15 },
    softPower: { diplomaticReach: 0.7, culturalReach: 0.4, aidGiven: 3_600, aidReceived: 0 },
  },
  sectors: fillSectorMix(["pharma"], { "energy-renewables": 0.7, "energy-nuclear": 0.3 }, 8_800_000, 0.02),
  traits: {
    aggression: 0.1, opportunism: 0.35, legalism: 0.8, isolationism: 0.35, riskTolerance: 0.25, vengefulness: 0.1, reliability: 0.85, transparency: 0.7,
    agendas: [
      { id: "permanent-neutrality", description: "Preserve armed neutrality outside formal alliance structures", weight: 0.7 },
      { id: "finance-hub-defense", description: "Defend its position as a global banking and finance hub", weight: 0.55 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "neutrality", description: "No formal military alliance membership that compromises its neutrality." }], alignmentPull: [] },
});

// Client-state, powerTier 2. Accurate charter fit structurally.
export const hungaryNation = NationInput.parse({
  id: HUNGARY_ID,
  playable: false,
  identity: { name: "Hungary", adjective: "Hungarian", capital: "Budapest", government: "charter-parliamentary-republic", languages: ["Hungarian"], currency: "HUF" },
  geo: { region: "region-central-europe", lat: 47.5, lon: 19.05, neighbors: [], coastline: false, chokepoints: [], disasterExposure: { flood: 0.25, drought: 0.25 } },
  stats: {
    demography: { population: 9_600_000, urbanization: 0.73, medianAge: 43, growthRate: -0.003, literacy: 0.99, birthRate: 0.0085, deathRate: 0.0135, netMigration: 0.002 },
    economy: { gdp: 212_000, gdpPerCapita: 22_083, growth: 0.007091, inflation: 0.037037, unemployment: 0.045, costOfLiving: 1, debt: 156_880, reserves: 40_000, sovereignRating: "BBB" },
    trade: { exports: 145_000, imports: 140_000, balance: 5_000, topExports: ["auto", "semiconductors"], topPartners: [], tradeDependence: {} },
    energy: { production: 100, consumption: 300, importDependence: 0.65, mix: { "energy-nuclear": 0.45, "energy-gas": 0.25, "energy-renewables": 0.2, "energy-oil": 0.1 } },
    military: {
      budget: 3_600, activeHeadcount: 37_000, reserveHeadcount: 20_000, readiness: 0.4, doctrineQuality: 0.4,
      branchStrength: { land: 0.4, air: 0.35, naval: 0.0, cyber: 0.3, space: 0.0 },
      airliftCapacity: 0.15, sealiftCapacity: 0.0, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.25, corruptionIndex: 0.45, insurgencyPressure: 0.02, borderControl: 0.65, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.65, legitimacy: 0.5, factionalism: 0.55, pressFreedom: 0.35, protestPressure: 0.3 },
    softPower: { diplomaticReach: 0.35, culturalReach: 0.35, aidGiven: 0, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto", "semiconductors"], { "energy-nuclear": 0.45, "energy-gas": 0.25, "energy-renewables": 0.2, "energy-oil": 0.1 }, 9_600_000, 0.04),
  traits: {
    aggression: 0.25, opportunism: 0.5, legalism: 0.45, isolationism: 0.3, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.4, transparency: 0.3,
    agendas: [
      { id: "bloc-leverage", description: "Use its bloc veto power to extract concessions on unrelated issues", weight: 0.55 },
      { id: "energy-dependence-hedge", description: "Hedge energy supply between competing external patrons", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "sovereignty-over-migration", description: "No externally imposed migration or asylum quota." }], alignmentPull: [RUSSIA_ID] },
});

// Great power, powerTier 4. Charter mapping is approximate (see file
// header): modeled as a parliamentary republic for its cabinet government,
// though the constitutional-monarchy head of state is not represented as a
// distinct field.
export const japanNation = NationInput.parse({
  id: JAPAN_ID,
  playable: false,
  identity: { name: "Japan", adjective: "Japanese", capital: "Tokyo", government: "charter-parliamentary-republic", languages: ["Japanese"], currency: "JPY" },
  geo: { region: "region-east-asia", lat: 35.68, lon: 139.65, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.4, cyclone: 0.3, flood: 0.2 } },
  stats: {
    demography: { population: 124_000_000, urbanization: 0.92, medianAge: 49, growthRate: -0.005, literacy: 0.99, birthRate: 0.0065, deathRate: 0.0125, netMigration: 0.001 },
    economy: { gdp: 4_210_000, gdpPerCapita: 33_952, growth: -0.002401, inflation: 0.027385, unemployment: 0.025, costOfLiving: 1, debt: 10_525_000, reserves: 1_290_000, sovereignRating: "A" },
    trade: { exports: 900_000, imports: 950_000, balance: -50_000, topExports: ["auto", "semiconductors"], topPartners: [], tradeDependence: {} },
    energy: { production: 350, consumption: 1_700, importDependence: 0.9, mix: { "energy-gas": 0.35, "energy-oil": 0.35, "energy-renewables": 0.2, "energy-nuclear": 0.1 } },
    military: {
      budget: 51_847, activeHeadcount: 248_291, reserveHeadcount: 57_847, readiness: 0.6, doctrineQuality: 0.75,
      branchStrength: { land: 0.35, air: 0.6, naval: 0.65, cyber: 0.55, space: 0.35 },
      airliftCapacity: 0.35, sealiftCapacity: 0.4, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.1, corruptionIndex: 0.15, insurgencyPressure: 0.01, borderControl: 0.7, intelCapability: 0.55, counterIntel: 0.7 },
    politics: { regimeStability: 0.8, legitimacy: 0.7, factionalism: 0.3, pressFreedom: 0.7, protestPressure: 0.15 },
    softPower: { diplomaticReach: 0.75, culturalReach: 0.85, aidGiven: 17_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["auto", "semiconductors"], { "energy-gas": 0.35, "energy-oil": 0.35, "energy-renewables": 0.2, "energy-nuclear": 0.1 }, 124_000_000, 0.026),
  traits: {
    aggression: 0.2, opportunism: 0.35, legalism: 0.75, isolationism: 0.25, riskTolerance: 0.3, vengefulness: 0.2, reliability: 0.75, transparency: 0.6,
    agendas: [
      { id: "demographic-adaptation", description: "Adapt the economy and military to a shrinking, aging population", weight: 0.6 },
      { id: "alliance-normalization", description: "Gradually normalize a more active military posture within its alliance", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "island-territory", description: "No incursion into its administered island territory goes unanswered." }], alignmentPull: [] },
});

// Regional power, powerTier 3. Accurate charter fit.
export const southKoreaNation = NationInput.parse({
  id: SOUTH_KOREA_ID,
  playable: false,
  identity: { name: "South Korea", adjective: "South Korean", capital: "Seoul", government: "charter-presidential-republic", languages: ["Korean"], currency: "KRW" },
  geo: { region: "region-east-asia", lat: 37.57, lon: 126.98, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.3, flood: 0.25, earthquake: 0.1 } },
  stats: {
    demography: { population: 51_700_000, urbanization: 0.81, medianAge: 44, growthRate: 0.001, literacy: 0.99, birthRate: 0.0045, deathRate: 0.007, netMigration: 0.0035 },
    economy: { gdp: 1_710_000, gdpPerCapita: 33_076, growth: 0.020036, inflation: 0.023217, unemployment: 0.02784, costOfLiving: 1, debt: 923_400, reserves: 420_000, sovereignRating: "AA" },
    trade: { exports: 630_000, imports: 640_000, balance: -10_000, topExports: ["semiconductors", "auto", "ports-shipping"], topPartners: [], tradeDependence: {} },
    energy: { production: 250, consumption: 550, importDependence: 0.8, mix: { "energy-oil": 0.3, "energy-nuclear": 0.3, "energy-gas": 0.25, "energy-renewables": 0.15 } },
    military: {
      budget: 44_847, activeHeadcount: 556_291, reserveHeadcount: 3_100_847, readiness: 0.75, doctrineQuality: 0.75,
      branchStrength: { land: 0.5, air: 0.55, naval: 0.5, cyber: 0.55, space: 0.2 },
      airliftCapacity: 0.3, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.2, corruptionIndex: 0.35, insurgencyPressure: 0.01, borderControl: 0.75, intelCapability: 0.55, counterIntel: 0.7 },
    politics: { regimeStability: 0.75, legitimacy: 0.65, factionalism: 0.5, pressFreedom: 0.7, protestPressure: 0.3 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.8, aidGiven: 3_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["semiconductors", "auto", "ports-shipping"], { "energy-oil": 0.3, "energy-nuclear": 0.3, "energy-gas": 0.25, "energy-renewables": 0.15 }, 51_700_000, 0.028),
  traits: {
    aggression: 0.35, opportunism: 0.4, legalism: 0.65, isolationism: 0.15, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.6, transparency: 0.55,
    agendas: [
      { id: "border-deterrence", description: "Maintain deterrence against its neighbor across the demilitarized border", weight: 0.7 },
      { id: "tech-export-leadership", description: "Defend leadership in advanced semiconductor manufacturing", weight: 0.6 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "border-provocation", description: "No armed provocation across the demilitarized border goes unanswered." }], alignmentPull: [US_ID] },
});

// Trading hub, powerTier 2. Accurate charter fit (directly elected
// executive).
export const taiwanNation = NationInput.parse({
  id: TAIWAN_ID,
  playable: false,
  identity: { name: "Taiwan", adjective: "Taiwanese", capital: "Taipei", government: "charter-presidential-republic", languages: ["Mandarin"], currency: "TWD" },
  geo: { region: "region-east-asia", lat: 25.03, lon: 121.57, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.45, cyclone: 0.4, flood: 0.15 } },
  stats: {
    demography: { population: 23_600_000, urbanization: 0.8, medianAge: 43, growthRate: 0.001, literacy: 0.99, birthRate: 0.0065, deathRate: 0.008, netMigration: 0.0025 },
    economy: { gdp: 790_000, gdpPerCapita: 33_475, growth: 0.012, inflation: 0.02, unemployment: 0.034, costOfLiving: 1, debt: 221_200, reserves: 570_000, sovereignRating: "AA" },
    trade: { exports: 480_000, imports: 420_000, balance: 60_000, topExports: ["semiconductors"], topPartners: [], tradeDependence: {} },
    energy: { production: 40, consumption: 260, importDependence: 0.95, mix: { "energy-gas": 0.4, "energy-oil": 0.35, "energy-nuclear": 0.1, "energy-renewables": 0.15 } },
    military: {
      budget: 19_000, activeHeadcount: 169_000, reserveHeadcount: 1_657_000, readiness: 0.55, doctrineQuality: 0.55,
      branchStrength: { land: 0.4, air: 0.55, naval: 0.45, cyber: 0.5, space: 0.05 },
      airliftCapacity: 0.2, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.1, corruptionIndex: 0.2, insurgencyPressure: 0.01, borderControl: 0.6, intelCapability: 0.55, counterIntel: 0.55 },
    politics: { regimeStability: 0.7, legitimacy: 0.7, factionalism: 0.5, pressFreedom: 0.85, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.35, culturalReach: 0.45, aidGiven: 300, aidReceived: 0 },
  },
  sectors: fillSectorMix(["semiconductors"], { "energy-gas": 0.4, "energy-oil": 0.35, "energy-nuclear": 0.1, "energy-renewables": 0.15 }, 23_600_000, 0.034),
  traits: {
    aggression: 0.25, opportunism: 0.4, legalism: 0.6, isolationism: 0.25, riskTolerance: 0.4, vengefulness: 0.25, reliability: 0.55, transparency: 0.6,
    agendas: [
      { id: "chip-industry-leverage", description: "Use dominance in advanced chip manufacturing as strategic leverage", weight: 0.65 },
      { id: "status-quo-preservation", description: "Preserve its current political status without provoking cross-strait conflict", weight: 0.65 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "unilateral-status-change", description: "No unilateral change to its current political status by outside force." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 3. Charter mapping is approximate (see file
// header): modeled as a parliamentary republic for its cabinet government,
// though the constitutional-monarchy head of state is not represented as a
// distinct field.
export const australiaNation = NationInput.parse({
  id: AUSTRALIA_ID,
  playable: false,
  identity: { name: "Australia", adjective: "Australian", capital: "Canberra", government: "charter-parliamentary-republic", languages: ["English"], currency: "AUD" },
  geo: { region: "region-oceania", lat: -35.28, lon: 149.13, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.15, drought: 0.25, wildfire: 0.35, cyclone: 0.2 } },
  stats: {
    demography: { population: 26_600_000, urbanization: 0.87, medianAge: 38, growthRate: 0.012, literacy: 0.99, birthRate: 0.0115, deathRate: 0.007, netMigration: 0.0075 },
    economy: { gdp: 1_690_000, gdpPerCapita: 63_534, growth: 0.013734, inflation: 0.031666, unemployment: 0.03942, costOfLiving: 1, debt: 845_000, reserves: 60_000, sovereignRating: "AAA" },
    trade: { exports: 460_000, imports: 400_000, balance: 60_000, topExports: ["mining", "energy-gas"], topPartners: [], tradeDependence: {} },
    energy: { production: 1_400, consumption: 1_300, importDependence: 0.1, mix: { "energy-oil": 0.5, "energy-gas": 0.2, "energy-renewables": 0.3 } },
    military: {
      budget: 32_000, activeHeadcount: 60_000, reserveHeadcount: 30_000, readiness: 0.55, doctrineQuality: 0.65,
      branchStrength: { land: 0.35, air: 0.55, naval: 0.5, cyber: 0.5, space: 0.2 },
      airliftCapacity: 0.35, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.2, corruptionIndex: 0.15, insurgencyPressure: 0.01, borderControl: 0.7, intelCapability: 0.6, counterIntel: 0.7 },
    politics: { regimeStability: 0.85, legitimacy: 0.75, factionalism: 0.35, pressFreedom: 0.8, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.65, culturalReach: 0.5, aidGiven: 3_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["mining", "energy-gas"], { "energy-oil": 0.5, "energy-gas": 0.2, "energy-renewables": 0.3 }, 26_600_000, 0.038),
  traits: {
    aggression: 0.25, opportunism: 0.35, legalism: 0.65, isolationism: 0.2, riskTolerance: 0.4, vengefulness: 0.2, reliability: 0.65, transparency: 0.65,
    agendas: [
      { id: "resource-export-leadership", description: "Defend its position as a leading exporter of iron ore, coal, and gas", weight: 0.55 },
      { id: "indo-pacific-balancing", description: "Balance economic ties and security alignment across the region", weight: 0.55 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "maritime-approaches", description: "No hostile military presence in its immediate maritime approaches goes unanswered." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 3. Presidential republic is an accurate charter
// fit (directly elected, fixed-term, impeachable executive). GDP ~$1.37T
// spread over ~278M people prices gdpPerCapita in the lower-middle band; the
// positive trade balance and large reserves reflect the coal/palm/nickel
// commodity engine, and the military budget is small for its size because
// nonalignment, not force projection, is the standing doctrine — sealift
// leads airlift for the same archipelagic reason.
export const indonesiaNation = NationInput.parse({
  id: INDONESIA_ID,
  playable: false,
  identity: { name: "Indonesia", adjective: "Indonesian", capital: "Jakarta", government: "charter-presidential-republic", languages: ["Indonesian"], currency: "IDR" },
  geo: { region: "region-southeast-asia", lat: -6.2, lon: 106.8, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.45, flood: 0.3, wildfire: 0.2, cyclone: 0.1 } },
  stats: {
    demography: { population: 277_534_122, urbanization: 0.58, medianAge: 30, growthRate: 0.007, literacy: 0.96, birthRate: 0.0155, deathRate: 0.0065, netMigration: -0.002 },
    economy: { gdp: 1_371_000, gdpPerCapita: 4_900, growth: 0.050326, inflation: 0.021815, unemployment: 0.03301, costOfLiving: 1, debt: 534_690, reserves: 145_000, sovereignRating: "BBB" },
    trade: { exports: 292_000, imports: 237_000, balance: 55_000, topExports: ["mining", "food-processing", "steel-heavy"], topPartners: [], tradeDependence: {} },
    energy: { production: 1_800, consumption: 1_600, importDependence: 0.1, mix: { "energy-oil": 0.73, "energy-gas": 0.17, "energy-renewables": 0.1 } },
    military: {
      budget: 8_800, activeHeadcount: 400_000, reserveHeadcount: 400_000, readiness: 0.5, doctrineQuality: 0.45,
      branchStrength: { land: 0.5, air: 0.35, naval: 0.45, cyber: 0.3, space: 0.05 },
      airliftCapacity: 0.25, sealiftCapacity: 0.4, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.4, corruptionIndex: 0.55, insurgencyPressure: 0.2, borderControl: 0.5, intelCapability: 0.4, counterIntel: 0.35 },
    politics: { regimeStability: 0.65, legitimacy: 0.65, factionalism: 0.5, pressFreedom: 0.55, protestPressure: 0.35 },
    softPower: { diplomaticReach: 0.5, culturalReach: 0.4, aidGiven: 200, aidReceived: 1_500 },
  },
  sectors: fillSectorMix(["mining", "food-processing", "steel-heavy"], { "energy-oil": 0.73, "energy-gas": 0.17, "energy-renewables": 0.1 }, 277_534_122, 0.053),
  traits: {
    aggression: 0.25, opportunism: 0.45, legalism: 0.5, isolationism: 0.35, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.6, transparency: 0.45,
    agendas: [
      { id: "maritime-fulcrum", description: "Leverage its position astride the Malacca and Sunda lanes", weight: 0.65 },
      { id: "downstream-industrialization", description: "Move resource exports up the value chain before they leave port", weight: 0.55 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "archipelagic-integrity", description: "No foreign naval presence inside its archipelagic baselines without consent." }], alignmentPull: [] },
});

// Trading hub, powerTier 3. Charter mapping is approximate (see file header):
// modeled as a parliamentary republic for its cabinet government, with the
// monarch not represented as a distinct field. The deepest of the entries
// added after the founding fifty, because it is the one that clears the top
// admission band: Rotterdam and Schiphol put it among the largest European
// counterparties the United States trades goods with, and ASML makes it a
// single point of failure in the semiconductor tool chain. GDP is high
// relative to headcount for the same reason Ireland's is — a great deal of
// output is booked through entities headquartered here.
export const netherlandsNation = NationInput.parse({
  id: NETHERLANDS_ID,
  playable: false,
  identity: { name: "Netherlands", adjective: "Dutch", capital: "Amsterdam", government: "charter-parliamentary-republic", languages: ["Dutch"], currency: "EUR", definiteArticle: true },
  geo: { region: "region-western-europe", lat: 52.37, lon: 4.89, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.45, pandemic: 0.2, earthquake: 0.05, drought: 0.15, cyclone: 0.1 } },
  stats: {
    demography: { population: 17_900_000, urbanization: 0.93, medianAge: 42, growthRate: 0.003, literacy: 0.99, birthRate: 0.0094, deathRate: 0.0095, netMigration: 0.0031 },
    economy: { gdp: 1_218_000, gdpPerCapita: 68_045, growth: 0.010738, inflation: 0.033475, unemployment: 0.037, costOfLiving: 1, debt: 535_920, reserves: 62_000, sovereignRating: "AAA" },
    trade: { exports: 935_000, imports: 830_000, balance: 105_000, topExports: ["semiconductors", "chemicals", "ports-shipping"], topPartners: [], tradeDependence: {} },
    energy: { production: 90, consumption: 240, importDependence: 0.6, mix: { "energy-gas": 0.38, "energy-oil": 0.36, "energy-nuclear": 0.02, "energy-renewables": 0.24 } },
    military: {
      budget: 22_300, activeHeadcount: 48_000, reserveHeadcount: 6_000, readiness: 0.7, doctrineQuality: 0.75,
      branchStrength: { land: 0.4, air: 0.55, naval: 0.55, cyber: 0.6, space: 0.2 },
      airliftCapacity: 0.3, sealiftCapacity: 0.35, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 2,
      // Branch headcounts are the published service strengths re-based onto
      // `activeHeadcount` above, the same treatment the played nation gets:
      // the sources that quote per-service strength and the ones that quote a
      // ministry total count the reserve component differently, so the raw
      // figures do not sum to the total beside them.
      orderOfBattle: {
        army: {
          headcount: 22_000,
          capabilities: [
            { name: "army.mechanized-brigade", count: 2 },
            { name: "army.air-assault-brigade", count: 1 },
          ],
          units: [
            { type: "army.maneuver-battalion", count: 12, readiness: 0.65 },
            { type: "army.air-defense-battery", count: 4, readiness: 0.7 },
          ],
        },
        navy: {
          headcount: 10_500,
          capabilities: [
            { name: "navy.frigate", label: "Air defense and command frigates", count: 4 },
            { name: "navy.attack-submarine", count: 4 },
          ],
          units: [
            { type: "navy.frigate", count: 6, readiness: 0.6 },
            { type: "navy.attack-submarine", count: 4, readiness: 0.5 },
            { type: "navy.mine-countermeasures-vessel", count: 6, readiness: 0.65 },
          ],
        },
        air: {
          headcount: 9_000,
          capabilities: [{ name: "air.fighter-squadron", count: 4 }],
          units: [
            { type: "air.fighter", count: 52, readiness: 0.7 },
            { type: "air.transport", count: 12, readiness: 0.65 },
          ],
        },
        marines: {
          headcount: 4_700,
          capabilities: [{ name: "marines.brigade", count: 2, label: "Marine combat groups" }],
          units: [{ type: "marines.infantry-battalion", count: 4, readiness: 0.7 }],
        },
        space: { headcount: 250 },
        cyber: {
          headcount: 1_600,
          capabilities: [{ name: "cyber.mission-force-team", count: 1, label: "Cyber effects units" }],
          units: [{ type: "cyber.network-defense-team", count: 8, readiness: 0.7 }],
        },
      },
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.15, insurgencyPressure: 0.05, borderControl: 0.65, intelCapability: 0.6, counterIntel: 0.7 },
    politics: { regimeStability: 0.85, legitimacy: 0.8, factionalism: 0.55, pressFreedom: 0.9, protestPressure: 0.25 },
    softPower: { diplomaticReach: 0.65, culturalReach: 0.5, aidGiven: 7_300, aidReceived: 0 },
  },
  sectors: fillSectorMix(["semiconductors", "chemicals", "ports-shipping"], { "energy-gas": 0.38, "energy-oil": 0.36, "energy-nuclear": 0.02, "energy-renewables": 0.24 }, 17_900_000, 0.037),
  traits: {
    aggression: 0.15, opportunism: 0.4, legalism: 0.8, isolationism: 0.15, riskTolerance: 0.35, vengefulness: 0.15, reliability: 0.8, transparency: 0.8,
    agendas: [
      { id: "transshipment-hub", description: "Keep the continent's freight and energy moving through its own ports", weight: 0.6 },
      { id: "semiconductor-tooling-export", description: "Hold the tool monopoly that every advanced chip line depends on", weight: 0.55 },
      { id: "atlantic-alliance-anchor", description: "Keep American forces and American guarantees committed to Europe", weight: 0.5 },
    ],
  },
  doctrine: {
    posture: "defensive",
    redLines: [
      { id: "north-sea-approaches", description: "No hostile military presence in the North Sea approaches to its ports goes unanswered." },
      { id: "tooling-transfer", description: "No transfer of its lithography tooling to a strategic competitor without allied agreement." },
    ],
    alignmentPull: [US_ID, GERMANY_ID],
  },
});

// Regional power, powerTier 2. Charter mapping is approximate (see file
// header): modeled as a parliamentary republic for its cabinet government,
// though neither the throne nor the army's standing role in politics is
// represented as a distinct field. A major non-NATO ally with about $110B of
// two-way goods trade with the United States, which is what puts a
// mid-sized economy this far up the roster; the military budget is small
// against a large standing force because headcount, not equipment, is where
// the money goes.
export const thailandNation = NationInput.parse({
  id: THAILAND_ID,
  playable: false,
  identity: { name: "Thailand", adjective: "Thai", capital: "Bangkok", government: "charter-parliamentary-republic", languages: ["Thai"], currency: "THB" },
  geo: { region: "region-southeast-asia", lat: 13.75, lon: 100.5, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.45, drought: 0.3, cyclone: 0.15, earthquake: 0.1 } },
  stats: {
    demography: { population: 71_700_000, urbanization: 0.53, medianAge: 40, growthRate: 0, literacy: 0.94, birthRate: 0.0085, deathRate: 0.0089, netMigration: 0.0004 },
    economy: { gdp: 529_000, gdpPerCapita: 7_378, growth: 0.029486, inflation: 0.003983, unemployment: 0.00781, costOfLiving: 1, debt: 327_980, reserves: 224_000, sovereignRating: "BBB" },
    trade: { exports: 300_000, imports: 290_000, balance: 10_000, topExports: ["auto", "semiconductors", "food-processing"], topPartners: [], tradeDependence: {} },
    energy: { production: 400, consumption: 900, importDependence: 0.55, mix: { "energy-gas": 0.55, "energy-oil": 0.35, "energy-renewables": 0.1 } },
    military: {
      budget: 5_500, activeHeadcount: 360_000, reserveHeadcount: 200_000, readiness: 0.5, doctrineQuality: 0.45,
      branchStrength: { land: 0.45, air: 0.4, naval: 0.4, cyber: 0.3, space: 0.05 },
      airliftCapacity: 0.2, sealiftCapacity: 0.25, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.35, corruptionIndex: 0.6, insurgencyPressure: 0.25, borderControl: 0.45, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.5, legitimacy: 0.5, factionalism: 0.65, pressFreedom: 0.4, protestPressure: 0.45 },
    softPower: { diplomaticReach: 0.5, culturalReach: 0.55, aidGiven: 100, aidReceived: 400 },
  },
  sectors: fillSectorMix(["auto", "semiconductors", "food-processing"], { "energy-gas": 0.55, "energy-oil": 0.35, "energy-renewables": 0.1 }, 71_700_000, 0.011),
  traits: {
    aggression: 0.25, opportunism: 0.5, legalism: 0.4, isolationism: 0.3, riskTolerance: 0.4, vengefulness: 0.3, reliability: 0.5, transparency: 0.35,
    agendas: [
      { id: "export-manufacturing-base", description: "Keep the assembly lines that employ the country running for foreign buyers", weight: 0.6 },
      { id: "regional-mediation", description: "Be the capital where mainland Southeast Asia's disputes get talked out", weight: 0.5 },
      { id: "institution-continuity", description: "Keep the throne, the army and the ballot in a settlement none of them upsets", weight: 0.55 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "border-sovereignty", description: "No foreign force operates inside its borders against an internal opponent." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 2. Accurate charter fit (directly elected,
// fixed-term, impeachable executive). A treaty ally with a mutual defense
// obligation and a large young population on a small economy, which is the
// combination the score reads as consequence: the country can be the subject
// of a South China Sea decision without being able to answer one alone.
export const philippinesNation = NationInput.parse({
  id: PHILIPPINES_ID,
  playable: false,
  identity: { name: "Philippines", adjective: "Filipino", capital: "Manila", government: "charter-presidential-republic", languages: ["Filipino", "English"], currency: "PHP", definiteArticle: true },
  geo: { region: "region-southeast-asia", lat: 14.6, lon: 120.98, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { cyclone: 0.6, flood: 0.45, earthquake: 0.4, drought: 0.2 } },
  stats: {
    demography: { population: 114_900_000, urbanization: 0.48, medianAge: 26, growthRate: 0.0115, literacy: 0.97, birthRate: 0.0203, deathRate: 0.0063, netMigration: -0.0025 },
    economy: { gdp: 437_000, gdpPerCapita: 3_803, growth: 0.057147, inflation: 0.032126, unemployment: 0.02202, costOfLiving: 1, debt: 249_090, reserves: 106_000, sovereignRating: "BBB" },
    trade: { exports: 105_000, imports: 140_000, balance: -35_000, topExports: ["semiconductors", "agriculture", "mining"], topPartners: [], tradeDependence: {} },
    energy: { production: 120, consumption: 260, importDependence: 0.55, mix: { "energy-oil": 0.55, "energy-gas": 0.15, "energy-renewables": 0.3 } },
    military: {
      budget: 4_300, activeHeadcount: 145_000, reserveHeadcount: 100_000, readiness: 0.4, doctrineQuality: 0.4,
      branchStrength: { land: 0.35, air: 0.25, naval: 0.3, cyber: 0.25, space: 0.05 },
      airliftCapacity: 0.15, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.5, corruptionIndex: 0.65, insurgencyPressure: 0.45, borderControl: 0.35, intelCapability: 0.35, counterIntel: 0.3 },
    politics: { regimeStability: 0.55, legitimacy: 0.55, factionalism: 0.6, pressFreedom: 0.45, protestPressure: 0.4 },
    softPower: { diplomaticReach: 0.45, culturalReach: 0.4, aidGiven: 50, aidReceived: 1_400 },
  },
  sectors: fillSectorMix(["semiconductors", "agriculture", "mining"], { "energy-oil": 0.55, "energy-gas": 0.15, "energy-renewables": 0.3 }, 114_900_000, 0.043),
  traits: {
    aggression: 0.25, opportunism: 0.5, legalism: 0.45, isolationism: 0.2, riskTolerance: 0.45, vengefulness: 0.35, reliability: 0.5, transparency: 0.4,
    agendas: [
      { id: "maritime-claims-defense", description: "Hold its claimed features and fishing grounds against a far larger navy", weight: 0.65 },
      { id: "labor-export-remittances", description: "Protect the workers abroad whose remittances hold the economy up", weight: 0.55 },
      { id: "insurgency-settlement", description: "Finish the settlements that ended two long internal wars", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "occupied-feature", description: "No foreign occupation of a feature its own forces are standing on." }], alignmentPull: [US_ID] },
});

// Middle power, powerTier 2. Charter mapping is approximate (see file
// header): modeled as a parliamentary republic, with the monarch and the
// language communities' veto not represented as distinct fields. Small,
// heavily traded, and the seat of both the alliance and the union
// headquarters, which is what its diplomatic reach is priced on rather than
// its force. Debt above output is authored, not a unit error: it is one of
// the most indebted economies in Europe.
export const belgiumNation = NationInput.parse({
  id: BELGIUM_ID,
  playable: false,
  identity: { name: "Belgium", adjective: "Belgian", capital: "Brussels", government: "charter-parliamentary-republic", languages: ["Dutch", "French", "German"], currency: "EUR" },
  geo: { region: "region-western-europe", lat: 50.85, lon: 4.35, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, pandemic: 0.15 } },
  stats: {
    demography: { population: 11_800_000, urbanization: 0.98, medianAge: 42, growthRate: 0.003, literacy: 0.99, birthRate: 0.0096, deathRate: 0.0097, netMigration: 0.0031 },
    economy: { gdp: 662_000, gdpPerCapita: 56_102, growth: 0.010978, inflation: 0.031435, unemployment: 0.057, costOfLiving: 1, debt: 695_100, reserves: 30_000, sovereignRating: "AA" },
    trade: { exports: 480_000, imports: 470_000, balance: 10_000, topExports: ["chemicals", "pharma", "ports-shipping"], topPartners: [], tradeDependence: {} },
    energy: { production: 60, consumption: 160, importDependence: 0.75, mix: { "energy-nuclear": 0.4, "energy-gas": 0.3, "energy-oil": 0.15, "energy-renewables": 0.15 } },
    military: {
      budget: 8_000, activeHeadcount: 25_000, reserveHeadcount: 6_000, readiness: 0.5, doctrineQuality: 0.6,
      branchStrength: { land: 0.35, air: 0.4, naval: 0.3, cyber: 0.5, space: 0.15 },
      airliftCapacity: 0.25, sealiftCapacity: 0.15, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 1,
    },
    security: { crimeIndex: 0.35, corruptionIndex: 0.2, insurgencyPressure: 0.08, borderControl: 0.6, intelCapability: 0.5, counterIntel: 0.5 },
    politics: { regimeStability: 0.75, legitimacy: 0.7, factionalism: 0.75, pressFreedom: 0.85, protestPressure: 0.35 },
    softPower: { diplomaticReach: 0.7, culturalReach: 0.4, aidGiven: 2_700, aidReceived: 0 },
  },
  sectors: fillSectorMix(["chemicals", "pharma", "ports-shipping"], { "energy-nuclear": 0.4, "energy-gas": 0.3, "energy-oil": 0.15, "energy-renewables": 0.15 }, 11_800_000, 0.056),
  traits: {
    aggression: 0.15, opportunism: 0.35, legalism: 0.8, isolationism: 0.2, riskTolerance: 0.3, vengefulness: 0.15, reliability: 0.7, transparency: 0.7,
    agendas: [
      { id: "institution-host-influence", description: "Turn hosting the alliance and the union into a say larger than its size", weight: 0.55 },
      { id: "chemical-cluster-export", description: "Defend the chemical and pharmaceutical cluster the export book rests on", weight: 0.5 },
      { id: "federal-cohesion", description: "Hold two language communities inside one federal settlement", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "alliance-obligation", description: "An attack on an alliance member is answered as an attack on itself." }], alignmentPull: [US_ID] },
});

// Regional power, powerTier 2. Accurate charter fit (directly elected,
// fixed-term, impeachable executive). The inflation and sovereign-rating
// figures are the point of the entry rather than an anomaly (the 2024 figure,
// 220%, is held at the 200% the model reads): this is
// the roster's worked example of a large, resource-rich economy in a
// long-running debt and currency crisis, which is a different kind of
// counterparty from a poor one.
export const argentinaNation = NationInput.parse({
  id: ARGENTINA_ID,
  playable: false,
  identity: { name: "Argentina", adjective: "Argentine", capital: "Buenos Aires", government: "charter-presidential-republic", languages: ["Spanish"], currency: "ARS" },
  geo: { region: "region-south-america", lat: -34.6, lon: -58.38, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.25, drought: 0.35, wildfire: 0.2 } },
  stats: {
    demography: { population: 46_000_000, urbanization: 0.92, medianAge: 33, growthRate: 0.0055, literacy: 0.99, birthRate: 0.0135, deathRate: 0.0081, netMigration: 0.0001 },
    economy: { gdp: 633_000, gdpPerCapita: 13_761, growth: -0.013429, inflation: 2, unemployment: 0.0715, costOfLiving: 1, debt: 538_050, reserves: 30_000, sovereignRating: "CCC" },
    trade: { exports: 80_000, imports: 60_000, balance: 20_000, topExports: ["agriculture", "food-processing", "energy-oil"], topPartners: [], tradeDependence: {} },
    energy: { production: 900, consumption: 800, importDependence: 0.05, mix: { "energy-gas": 0.5, "energy-oil": 0.3, "energy-nuclear": 0.05, "energy-renewables": 0.15 } },
    military: {
      budget: 3_200, activeHeadcount: 80_000, reserveHeadcount: 30_000, readiness: 0.35, doctrineQuality: 0.4,
      branchStrength: { land: 0.3, air: 0.25, naval: 0.3, cyber: 0.25, space: 0.1 },
      airliftCapacity: 0.15, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.5, corruptionIndex: 0.65, insurgencyPressure: 0.05, borderControl: 0.4, intelCapability: 0.4, counterIntel: 0.35 },
    politics: { regimeStability: 0.5, legitimacy: 0.5, factionalism: 0.7, pressFreedom: 0.65, protestPressure: 0.6 },
    softPower: { diplomaticReach: 0.5, culturalReach: 0.55, aidGiven: 30, aidReceived: 500 },
  },
  sectors: fillSectorMix(["agriculture", "food-processing", "energy-oil"], { "energy-gas": 0.5, "energy-oil": 0.3, "energy-nuclear": 0.05, "energy-renewables": 0.15 }, 46_000_000, 0.075),
  traits: {
    aggression: 0.2, opportunism: 0.55, legalism: 0.4, isolationism: 0.3, riskTolerance: 0.5, vengefulness: 0.3, reliability: 0.35, transparency: 0.4,
    agendas: [
      { id: "debt-restructuring", description: "Get out from under a debt stock no plausible surplus can retire", weight: 0.65 },
      { id: "commodity-export-surge", description: "Turn grain, gas and lithium into the dollars the budget needs", weight: 0.55 },
      { id: "sovereignty-claims", description: "Keep its South Atlantic claim alive in every forum that will hear it", weight: 0.4 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "south-atlantic-claim", description: "No third state's recognition of a rival claim to the islands passes unanswered." }], alignmentPull: [US_ID] },
});

// Middle power, powerTier 2. Charter mapping is approximate (see file
// header): a parliamentary republic for its cabinet government, monarch not
// modeled. Europe's largest remaining gas supplier and the alliance's northern
// flank, which is why the energy and cobalt figures matter more here than the
// size of the economy does. Reserves are the central bank's, not the
// sovereign wealth fund, which is a separate stock this schema does not hold.
export const norwayNation = NationInput.parse({
  id: NORWAY_ID,
  playable: false,
  identity: { name: "Norway", adjective: "Norwegian", capital: "Oslo", government: "charter-parliamentary-republic", languages: ["Norwegian"], currency: "NOK" },
  geo: { region: "region-northern-europe", lat: 59.91, lon: 10.75, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2, wildfire: 0.1, earthquake: 0.05 } },
  stats: {
    demography: { population: 5_550_000, urbanization: 0.84, medianAge: 40, growthRate: 0.006, literacy: 0.99, birthRate: 0.0098, deathRate: 0.0083, netMigration: 0.0045 },
    economy: { gdp: 486_000, gdpPerCapita: 87_568, growth: 0.014237, inflation: 0.031453, unemployment: 0.04, costOfLiving: 1, debt: 213_840, reserves: 84_000, sovereignRating: "AAA" },
    trade: { exports: 175_000, imports: 110_000, balance: 65_000, topExports: ["energy-gas", "energy-oil", "food-processing"], topPartners: [], tradeDependence: {} },
    energy: { production: 2_300, consumption: 350, importDependence: 0, mix: { "energy-renewables": 0.6, "energy-gas": 0.3, "energy-oil": 0.1 } },
    military: {
      budget: 9_800, activeHeadcount: 26_000, reserveHeadcount: 40_000, readiness: 0.6, doctrineQuality: 0.7,
      branchStrength: { land: 0.35, air: 0.55, naval: 0.55, cyber: 0.5, space: 0.15 },
      airliftCapacity: 0.25, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.2, corruptionIndex: 0.08, insurgencyPressure: 0.02, borderControl: 0.7, intelCapability: 0.55, counterIntel: 0.55 },
    politics: { regimeStability: 0.9, legitimacy: 0.85, factionalism: 0.35, pressFreedom: 0.95, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.35, aidGiven: 5_500, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-gas", "energy-oil", "food-processing"], { "energy-renewables": 0.6, "energy-gas": 0.3, "energy-oil": 0.1 }, 5_550_000, 0.04),
  traits: {
    aggression: 0.15, opportunism: 0.3, legalism: 0.8, isolationism: 0.2, riskTolerance: 0.35, vengefulness: 0.15, reliability: 0.8, transparency: 0.8,
    agendas: [
      { id: "gas-supply-security", description: "Stay the supplier Europe can count on when another one stops", weight: 0.6 },
      { id: "arctic-deterrence", description: "Keep the High North quiet without conceding it", weight: 0.55 },
      { id: "sovereign-fund-stewardship", description: "Spend the petroleum inheritance slowly enough to outlive the petroleum", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "high-north", description: "No foreign military activity inside its northern waters without notice and consent." }], alignmentPull: [US_ID] },
});

// Trading hub, powerTier 2. Charter mapping is approximate (see file header):
// a parliamentary republic for its cabinet government, with the rotating
// elective monarchy and the federal states not modeled. It sits on the
// Malacca approaches with a large chip assembly and test base, which is the
// pairing the score reads: a modest economy that two different kinds of
// American supply chain run through.
export const malaysiaNation = NationInput.parse({
  id: MALAYSIA_ID,
  playable: false,
  identity: { name: "Malaysia", adjective: "Malaysian", capital: "Kuala Lumpur", government: "charter-parliamentary-republic", languages: ["Malay"], currency: "MYR" },
  geo: { region: "region-southeast-asia", lat: 3.14, lon: 101.69, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.4, drought: 0.15, pandemic: 0.2 } },
  stats: {
    demography: { population: 34_100_000, urbanization: 0.79, medianAge: 31, growthRate: 0.01, literacy: 0.96, birthRate: 0.0148, deathRate: 0.0055, netMigration: 0.0007 },
    economy: { gdp: 445_000, gdpPerCapita: 13_050, growth: 0.051055, inflation: 0.018341, unemployment: 0.03846, costOfLiving: 1, debt: 289_250, reserves: 116_000, sovereignRating: "A" },
    trade: { exports: 313_000, imports: 270_000, balance: 43_000, topExports: ["semiconductors", "energy-gas", "agriculture"], topPartners: [], tradeDependence: {} },
    energy: { production: 900, consumption: 700, importDependence: 0.1, mix: { "energy-gas": 0.45, "energy-oil": 0.4, "energy-renewables": 0.15 } },
    military: {
      budget: 4_100, activeHeadcount: 113_000, reserveHeadcount: 50_000, readiness: 0.4, doctrineQuality: 0.45,
      branchStrength: { land: 0.4, air: 0.35, naval: 0.4, cyber: 0.3, space: 0.05 },
      airliftCapacity: 0.2, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.35, corruptionIndex: 0.55, insurgencyPressure: 0.1, borderControl: 0.45, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.6, legitimacy: 0.6, factionalism: 0.6, pressFreedom: 0.45, protestPressure: 0.3 },
    softPower: { diplomaticReach: 0.5, culturalReach: 0.35, aidGiven: 60, aidReceived: 100 },
  },
  sectors: fillSectorMix(["semiconductors", "energy-gas", "agriculture"], { "energy-gas": 0.45, "energy-oil": 0.4, "energy-renewables": 0.15 }, 34_100_000, 0.033),
  traits: {
    aggression: 0.2, opportunism: 0.5, legalism: 0.5, isolationism: 0.3, riskTolerance: 0.4, vengefulness: 0.25, reliability: 0.55, transparency: 0.4,
    agendas: [
      { id: "chokepoint-hub", description: "Take a cut of everything that passes through the strait rather than close it", weight: 0.6 },
      { id: "nonalignment-between-powers", description: "Trade with both great powers without being enrolled by either", weight: 0.55 },
      { id: "semiconductor-assembly-export", description: "Move from assembly and test toward the parts of the chip trade that pay", weight: 0.5 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "malacca-transit", description: "No foreign power polices the strait in its own waters without its consent." }], alignmentPull: [CHINA_ID] },
});

// Resource exporter, powerTier 2. Accurate charter fit: an emirate where the
// ruling family's decree is final and the advisory council counsels rather
// than vetoes. Three million people, a top-three LNG position, the largest
// American air base in the region, and a standing role as the channel to
// parties nobody else will talk to. The death rate is authored at the
// schema's floor rather than at the real one: a population this young and this
// migrant-heavy buries fewer people per thousand than the schema can express.
export const qatarNation = NationInput.parse({
  id: QATAR_ID,
  playable: false,
  identity: { name: "Qatar", adjective: "Qatari", capital: "Doha", government: "charter-absolute-monarchy", languages: ["Arabic"], currency: "QAR" },
  geo: { region: "region-middle-east", lat: 25.29, lon: 51.53, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { drought: 0.35, flood: 0.1 } },
  stats: {
    demography: { population: 3_000_000, urbanization: 0.99, medianAge: 34, growthRate: 0.01, literacy: 0.98, birthRate: 0.0093, deathRate: 0.003, netMigration: 0.0037 },
    economy: { gdp: 221_000, gdpPerCapita: 73_667, growth: 0.031096, inflation: 0.012673, unemployment: 0.0013, costOfLiving: 1, debt: 92_820, reserves: 65_000, sovereignRating: "AA" },
    trade: { exports: 100_000, imports: 40_000, balance: 60_000, topExports: ["energy-gas", "chemicals"], topPartners: [], tradeDependence: {} },
    energy: { production: 1_300, consumption: 200, importDependence: 0, mix: { "energy-gas": 0.9, "energy-oil": 0.1 } },
    military: {
      budget: 15_400, activeHeadcount: 17_000, reserveHeadcount: 0, readiness: 0.45, doctrineQuality: 0.4,
      branchStrength: { land: 0.3, air: 0.45, naval: 0.3, cyber: 0.35, space: 0.05 },
      airliftCapacity: 0.3, sealiftCapacity: 0.2, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.1, corruptionIndex: 0.35, insurgencyPressure: 0.02, borderControl: 0.75, intelCapability: 0.5, counterIntel: 0.5 },
    politics: { regimeStability: 0.85, legitimacy: 0.75, factionalism: 0.3, pressFreedom: 0.25, protestPressure: 0.1 },
    softPower: { diplomaticReach: 0.7, culturalReach: 0.5, aidGiven: 800, aidReceived: 0 },
  },
  sectors: fillSectorMix(["energy-gas", "chemicals"], { "energy-gas": 0.9, "energy-oil": 0.1 }, 3_000_000, 0.002),
  traits: {
    aggression: 0.15, opportunism: 0.6, legalism: 0.4, isolationism: 0.2, riskTolerance: 0.5, vengefulness: 0.3, reliability: 0.55, transparency: 0.3,
    agendas: [
      { id: "mediation-brokerage", description: "Be the address every party to a conflict can still call", weight: 0.65 },
      { id: "gas-export-primacy", description: "Hold its share of the world's liquefied gas trade as new supply arrives", weight: 0.6 },
      { id: "hedging-among-patrons", description: "Keep an American base and a working channel to America's adversaries at once", weight: 0.5 },
    ],
  },
  doctrine: { posture: "balanced", redLines: [{ id: "sovereign-airspace", description: "No neighbor's blockade of its airspace or land border goes unchallenged again." }], alignmentPull: [US_ID] },
});

// Trading hub, powerTier 1. Charter mapping is accurate structurally: a
// cabinet answerable to a parliament that can withdraw confidence. The entry
// that the depth score forced and intuition would have skipped. Two-way goods
// trade with the United States runs ahead of France or Italy, almost all of it
// pharmaceutical and semiconductor output booked through multinationals
// domiciled here, which is also why gdpPerCapita reads higher than any lived
// income in the country. Military neutrality is authored, so the force is
// small by design rather than by neglect.
export const irelandNation = NationInput.parse({
  id: IRELAND_ID,
  playable: false,
  identity: { name: "Ireland", adjective: "Irish", capital: "Dublin", government: "charter-parliamentary-republic", languages: ["English", "Irish"], currency: "EUR" },
  geo: { region: "region-western-europe", lat: 53.35, lon: -6.26, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.2 } },
  stats: {
    demography: { population: 5_300_000, urbanization: 0.65, medianAge: 39, growthRate: 0.012, literacy: 0.99, birthRate: 0.0107, deathRate: 0.0067, netMigration: 0.008 },
    economy: { gdp: 560_000, gdpPerCapita: 105_660, growth: 0.025995, inflation: 0.021134, unemployment: 0.043, costOfLiving: 1, debt: 235_200, reserves: 12_000, sovereignRating: "AA" },
    trade: { exports: 320_000, imports: 190_000, balance: 130_000, topExports: ["pharma", "semiconductors", "finance"], topPartners: [], tradeDependence: {} },
    energy: { production: 20, consumption: 180, importDependence: 0.7, mix: { "energy-gas": 0.45, "energy-oil": 0.3, "energy-renewables": 0.25 } },
    military: {
      budget: 1_400, activeHeadcount: 8_000, reserveHeadcount: 2_000, readiness: 0.3, doctrineQuality: 0.35,
      branchStrength: { land: 0.25, air: 0.15, naval: 0.2, cyber: 0.2, space: 0.02 },
      airliftCapacity: 0.05, sealiftCapacity: 0.05, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.15, insurgencyPressure: 0.05, borderControl: 0.5, intelCapability: 0.3, counterIntel: 0.3 },
    politics: { regimeStability: 0.85, legitimacy: 0.8, factionalism: 0.45, pressFreedom: 0.9, protestPressure: 0.25 },
    softPower: { diplomaticReach: 0.55, culturalReach: 0.6, aidGiven: 2_600, aidReceived: 0 },
  },
  sectors: fillSectorMix(["pharma", "semiconductors", "finance"], { "energy-gas": 0.45, "energy-oil": 0.3, "energy-renewables": 0.25 }, 5_300_000, 0.043),
  traits: {
    aggression: 0.1, opportunism: 0.45, legalism: 0.75, isolationism: 0.3, riskTolerance: 0.3, vengefulness: 0.15, reliability: 0.7, transparency: 0.7,
    agendas: [
      { id: "regulatory-arbitrage", description: "Stay the jurisdiction American firms book their European business through", weight: 0.6 },
      { id: "permanent-neutrality", description: "Stay out of military alliances while trading inside every economic one", weight: 0.55 },
      { id: "transatlantic-trade-anchor", description: "Keep the Atlantic trade relationship out of anyone's tariff fight", weight: 0.5 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "military-neutrality", description: "No foreign force is based on its territory and no alliance obligation is signed." }], alignmentPull: [] },
});

// Middle power, powerTier 2. Charter mapping is approximate (see file
// header): a parliamentary republic for its cabinet government, monarch not
// modeled. Small and rich, sitting on the Danish Straits with the Arctic in
// its portfolio through Greenland, and the alliance member most consistently
// forward-deployed for its size.
export const denmarkNation = NationInput.parse({
  id: DENMARK_ID,
  playable: false,
  identity: { name: "Denmark", adjective: "Danish", capital: "Copenhagen", government: "charter-parliamentary-republic", languages: ["Danish"], currency: "DKK" },
  geo: { region: "region-northern-europe", lat: 55.68, lon: 12.57, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { flood: 0.3, cyclone: 0.1 } },
  stats: {
    demography: { population: 5_950_000, urbanization: 0.88, medianAge: 42, growthRate: 0.006, literacy: 0.99, birthRate: 0.0102, deathRate: 0.0093, netMigration: 0.0051 },
    economy: { gdp: 412_000, gdpPerCapita: 69_244, growth: 0.034778, inflation: 0.013722, unemployment: 0.05358, costOfLiving: 1, debt: 123_600, reserves: 100_000, sovereignRating: "AAA" },
    trade: { exports: 250_000, imports: 220_000, balance: 30_000, topExports: ["pharma", "ports-shipping", "food-processing"], topPartners: [], tradeDependence: {} },
    energy: { production: 200, consumption: 220, importDependence: 0.15, mix: { "energy-renewables": 0.65, "energy-oil": 0.2, "energy-gas": 0.15 } },
    military: {
      budget: 9_000, activeHeadcount: 20_000, reserveHeadcount: 12_000, readiness: 0.55, doctrineQuality: 0.65,
      branchStrength: { land: 0.35, air: 0.45, naval: 0.5, cyber: 0.5, space: 0.1 },
      airliftCapacity: 0.2, sealiftCapacity: 0.25, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.25, corruptionIndex: 0.05, insurgencyPressure: 0.02, borderControl: 0.7, intelCapability: 0.55, counterIntel: 0.55 },
    politics: { regimeStability: 0.9, legitimacy: 0.85, factionalism: 0.35, pressFreedom: 0.95, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.6, culturalReach: 0.4, aidGiven: 3_000, aidReceived: 0 },
  },
  sectors: fillSectorMix(["pharma", "ports-shipping", "food-processing"], { "energy-renewables": 0.65, "energy-oil": 0.2, "energy-gas": 0.15 }, 5_950_000, 0.028),
  traits: {
    aggression: 0.15, opportunism: 0.35, legalism: 0.8, isolationism: 0.15, riskTolerance: 0.4, vengefulness: 0.15, reliability: 0.8, transparency: 0.8,
    agendas: [
      { id: "arctic-sovereignty", description: "Hold an Arctic territory it cannot garrison against interest it did not invite", weight: 0.6 },
      { id: "shipping-lane-security", description: "Keep the straits and the world's largest box fleet moving", weight: 0.5 },
      { id: "green-energy-transition", description: "Sell the wind technology it built its own grid on", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "danish-straits-transit", description: "No foreign power dictates who transits the straits it sits on." }], alignmentPull: [US_ID] },
});

// Resource exporter, powerTier 2. Accurate charter fit (directly elected,
// fixed-term, impeachable executive). The copper and lithium position is what
// carries the entry: the United States is more than half reliant on imported
// refined copper and lithium, and this is the leading source of both. The
// disaster exposure is not decoration — it is the most seismically active
// country on the roster after Japan.
export const chileNation = NationInput.parse({
  id: CHILE_ID,
  playable: false,
  identity: { name: "Chile", adjective: "Chilean", capital: "Santiago", government: "charter-presidential-republic", languages: ["Spanish"], currency: "CLP" },
  geo: { region: "region-south-america", lat: -33.45, lon: -70.67, neighbors: [], coastline: true, chokepoints: [], disasterExposure: { earthquake: 0.7, flood: 0.15, drought: 0.4, wildfire: 0.35 } },
  stats: {
    demography: { population: 19_600_000, urbanization: 0.88, medianAge: 36, growthRate: 0.004, literacy: 0.97, birthRate: 0.0098, deathRate: 0.0068, netMigration: 0.001 },
    economy: { gdp: 335_000, gdpPerCapita: 17_092, growth: 0.028051, inflation: 0.042976, unemployment: 0.08718, costOfLiving: 1, debt: 134_000, reserves: 46_000, sovereignRating: "A" },
    trade: { exports: 100_000, imports: 90_000, balance: 10_000, topExports: ["mining", "agriculture", "food-processing"], topPartners: [], tradeDependence: {} },
    energy: { production: 60, consumption: 200, importDependence: 0.6, mix: { "energy-renewables": 0.6, "energy-oil": 0.25, "energy-gas": 0.15 } },
    military: {
      budget: 5_600, activeHeadcount: 77_000, reserveHeadcount: 40_000, readiness: 0.5, doctrineQuality: 0.55,
      branchStrength: { land: 0.4, air: 0.4, naval: 0.45, cyber: 0.3, space: 0.05 },
      airliftCapacity: 0.2, sealiftCapacity: 0.25, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.4, corruptionIndex: 0.3, insurgencyPressure: 0.1, borderControl: 0.5, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.7, legitimacy: 0.65, factionalism: 0.6, pressFreedom: 0.8, protestPressure: 0.45 },
    softPower: { diplomaticReach: 0.45, culturalReach: 0.35, aidGiven: 40, aidReceived: 100 },
  },
  sectors: fillSectorMix(["mining", "agriculture", "food-processing"], { "energy-renewables": 0.6, "energy-oil": 0.25, "energy-gas": 0.15 }, 19_600_000, 0.086),
  traits: {
    aggression: 0.15, opportunism: 0.4, legalism: 0.65, isolationism: 0.25, riskTolerance: 0.35, vengefulness: 0.2, reliability: 0.65, transparency: 0.6,
    agendas: [
      { id: "copper-lithium-revenue", description: "Price its minerals for the buyers who cannot do without them", weight: 0.6 },
      { id: "constitutional-institution-settlement", description: "Land a constitutional settlement two referendums have failed to reach", weight: 0.5 },
      { id: "pacific-trade-integration", description: "Stay the most open trading economy on its continent", weight: 0.45 },
    ],
  },
  doctrine: { posture: "defensive", redLines: [{ id: "border-integrity", description: "No revision of its settled land or maritime borders is entertained." }], alignmentPull: [] },
});

/**
 * Every recognized government not written above: an authored layer drafted
 * from the seed and stated priors (nations-<region>.ts) that states no figure
 * of its own, laid over figures baked from open data
 * (nation-figures.generated.ts). The bake reads this list to know which
 * records compose from its figures rather than state their own.
 */
export const ROSTER_DRAFTS: readonly NationDraft[] = [...africaDrafts, ...americasDrafts, ...asiaDrafts, ...europeDrafts, ...menaDrafts, ...oceaniaDrafts];

export const worldNations = [
  usNation,
  chinaNation,
  germanyNation,
  nigeriaNation,
  polandNation,
  saudiNation,
  singaporeNation,
  iraqNation,
  northKoreaNation,
  belarusNation,
  vietnamNation,
  indonesiaNation,
  icelandNation,
  brazilNation,
  colombiaNation,
  venezuelaNation,
  cubaNation,
  canadaNation,
  mexicoNation,
  indiaNation,
  pakistanNation,
  bangladeshNation,
  afghanistanNation,
  kazakhstanNation,
  iranNation,
  israelNation,
  uaeNation,
  turkeyNation,
  yemenNation,
  syriaNation,
  egyptNation,
  southAfricaNation,
  ethiopiaNation,
  drCongoNation,
  rwandaNation,
  moroccoNation,
  algeriaNation,
  ukNation,
  franceNation,
  italyNation,
  spainNation,
  ukraineNation,
  russiaNation,
  swedenNation,
  switzerlandNation,
  hungaryNation,
  japanNation,
  southKoreaNation,
  taiwanNation,
  australiaNation,
  netherlandsNation,
  thailandNation,
  philippinesNation,
  belgiumNation,
  argentinaNation,
  norwayNation,
  malaysiaNation,
  qatarNation,
  irelandNation,
  denmarkNation,
  chileNation,
  // Every other recognized government, composed from its drafted record.
  ...ROSTER_DRAFTS.map((draft) => composeNation(draft, NATION_FIGURES[draft.id])),
];
