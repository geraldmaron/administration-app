/**
 * Updates starting metrics and metric equilibria for all 50 canonical countries.
 * Deletes 30 non-canonical country documents.
 *
 * Values are calibrated to the scoring system where:
 *   - All metrics 0–100; thresholds vary per metric
 *   - Inverse metrics (corruption, inflation, crime, bureaucracy, unrest,
 *     economic_bubble, foreign_influence): lower raw = better outcome
 *   - Equilibria represent the natural drift target without intervention
 *
 * Run from functions/:
 *   pnpm tsx src/tools/update-country-starting-metrics.ts --mode=dry-run
 *   pnpm tsx src/tools/update-country-starting-metrics.ts --mode=apply
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const isDryRun = process.argv.includes('--mode=dry-run');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'the-administration-3a072';
  const saKeyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../../../serviceAccountKey.json');

  const appOptions: admin.AppOptions = { projectId };

  if (fs.existsSync(saKeyPath)) {
    const sa = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'));
    appOptions.credential = admin.credential.cert(sa);
  }

  admin.initializeApp(appOptions);
}

const db = admin.firestore();

// 30 excess countries to delete
const DELETE_COUNTRIES = [
  'ae', 'at', 'bb', 'be', 'bo', 'bs', 'cm', 'cr', 'cz', 'do',
  'dz', 'ec', 'et', 'fj', 'ht', 'ie', 'iq', 'lk', 'ma', 'np',
  'pa', 'pe', 'pg', 'ro', 'sn', 'tn', 'tt', 'tz', 'ug', 'uy',
];

interface StartingMetrics {
  metric_economy: number;
  metric_employment: number;
  metric_health: number;
  metric_education: number;
  metric_democracy: number;
  metric_sovereignty: number;
  metric_military: number;
  metric_innovation: number;
  metric_trade: number;
  metric_energy: number;
  metric_infrastructure: number;
  metric_housing: number;
  metric_foreign_relations: number;
  metric_public_order: number;
  metric_equality: number;
  metric_liberty: number;
  metric_budget: number;
  metric_environment: number;
  metric_immigration: number;
  // Inverse (lower = better)
  metric_corruption: number;
  metric_inflation: number;
  metric_crime: number;
  metric_bureaucracy: number;
  metric_unrest: number;
  metric_economic_bubble: number;
  metric_foreign_influence: number;
}

// Equilibria: natural drift target per metric.
// Standard metrics decay ~5%; inverse metrics worsen ~8%.
// These are overridden per country where structural factors demand it.
function defaultEquilibria(m: StartingMetrics): StartingMetrics {
  const decay = (v: number) => Math.max(15, Math.round(v * 0.94));
  const worsen = (v: number) => Math.min(90, Math.round(v * 1.08));
  return {
    metric_economy:           decay(m.metric_economy),
    metric_employment:        decay(m.metric_employment),
    metric_health:            decay(m.metric_health),
    metric_education:         decay(m.metric_education),
    metric_democracy:         decay(m.metric_democracy),
    metric_sovereignty:       decay(m.metric_sovereignty),
    metric_military:          decay(m.metric_military),
    metric_innovation:        decay(m.metric_innovation),
    metric_trade:             decay(m.metric_trade),
    metric_energy:            decay(m.metric_energy),
    metric_infrastructure:    decay(m.metric_infrastructure),
    metric_housing:           decay(m.metric_housing),
    metric_foreign_relations: decay(m.metric_foreign_relations),
    metric_public_order:      decay(m.metric_public_order),
    metric_equality:          decay(m.metric_equality),
    metric_liberty:           decay(m.metric_liberty),
    metric_budget:            decay(m.metric_budget),
    metric_environment:       decay(m.metric_environment),
    metric_immigration:       decay(m.metric_immigration),
    metric_corruption:        worsen(m.metric_corruption),
    metric_inflation:         worsen(m.metric_inflation),
    metric_crime:             worsen(m.metric_crime),
    metric_bureaucracy:       worsen(m.metric_bureaucracy),
    metric_unrest:            worsen(m.metric_unrest),
    metric_economic_bubble:   worsen(m.metric_economic_bubble),
    metric_foreign_influence: worsen(m.metric_foreign_influence),
  };
}

// ─── Country Data ────────────────────────────────────────────────────────────
// All 50 canonical countries with research-grounded starting metrics.
// Grades use per-metric thresholds (see Colors.swift metricThresholds).

const countryMetrics: Record<string, StartingMetrics> = {

  // ── UNITED STATES ──────────────────────────────────────────────────────────
  // World's largest economy; polarised democracy; global military dominance.
  // Housing crisis, high inequality, high crime vs. OECD peers.
  us: {
    metric_economy: 72,           // Strong but post-pandemic normalisation
    metric_employment: 68,        // ~3.7% unemployment, strong labour market
    metric_health: 62,            // Costly system; life expectancy below OECD avg
    metric_education: 72,         // Top universities; K-12 uneven
    metric_democracy: 70,         // Flawed democracy; institutional stress
    metric_sovereignty: 80,       // Dominant geopolitical actor
    metric_military: 90,          // Unrivalled global projection
    metric_innovation: 84,        // Global R&D leader
    metric_trade: 70,             // Chronic deficit but reserve-currency insulation
    metric_energy: 72,            // Energy independent; shale revolution
    metric_infrastructure: 65,    // Aging grid/roads; underinvested vs. GDP
    metric_housing: 48,           // Affordability crisis; supply shortage
    metric_foreign_relations: 68, // Respected but polarising; alliance tensions
    metric_public_order: 62,      // Manageable; periodic unrest
    metric_equality: 45,          // High Gini; widening wealth gap
    metric_liberty: 74,           // Strong protections; some erosion
    metric_budget: 45,            // Chronic deficit; ~6% of GDP
    metric_environment: 55,       // Progress on emissions; fossil dependence
    metric_immigration: 55,       // High pressure; contested policy
    // Inverse
    metric_corruption: 30,        // Moderate; lobbying / dark money
    metric_inflation: 35,         // Post-2022 spike; normalising
    metric_crime: 45,             // High vs. peers; geographic variation
    metric_bureaucracy: 38,       // Federal complexity
    metric_unrest: 28,            // Periodic; January 6 type events
    metric_economic_bubble: 38,   // Equity / housing valuations elevated
    metric_foreign_influence: 22, // Some interference; strong CI posture
  },

  // ── CHINA ──────────────────────────────────────────────────────────────────
  // State-capitalist model; authoritarian one-party rule; rapid growth slowing.
  cn: {
    metric_economy: 65,
    metric_employment: 62,
    metric_health: 62,
    metric_education: 70,
    metric_democracy: 12,         // Single-party; no competitive elections
    metric_sovereignty: 75,
    metric_military: 78,
    metric_innovation: 68,
    metric_trade: 75,             // Export powerhouse
    metric_energy: 60,
    metric_infrastructure: 75,    // World-class new build; rural gaps
    metric_housing: 38,           // Evergrande-era crisis; bubble risk
    metric_foreign_relations: 48, // Tense with West; BRI influence elsewhere
    metric_public_order: 72,      // Enforced stability
    metric_equality: 32,          // High Gini despite communist branding
    metric_liberty: 15,           // Severe censorship; surveillance state
    metric_budget: 52,
    metric_environment: 42,       // Major polluter; transition underway
    metric_immigration: 28,       // Net emigration of wealthy; low intake
    // Inverse
    metric_corruption: 58,
    metric_inflation: 32,
    metric_crime: 30,
    metric_bureaucracy: 62,
    metric_unrest: 35,
    metric_economic_bubble: 58,   // Property sector systemic risk
    metric_foreign_influence: 20,
  },

  // ── RUSSIA ─────────────────────────────────────────────────────────────────
  // War-footing economy; Western sanctions; authoritarian consolidation.
  ru: {
    metric_economy: 40,
    metric_employment: 58,        // Low official unemployment; war economy
    metric_health: 50,
    metric_education: 60,
    metric_democracy: 15,
    metric_sovereignty: 68,
    metric_military: 72,
    metric_innovation: 42,        // Brain drain; sanctioned tech
    metric_trade: 35,             // Diverted to Asia; West cut off
    metric_energy: 75,            // Energy exporter; key leverage
    metric_infrastructure: 55,
    metric_housing: 50,
    metric_foreign_relations: 22, // Pariah to West; partial non-West relations
    metric_public_order: 58,      // Enforced; dissent suppressed
    metric_equality: 32,
    metric_liberty: 15,
    metric_budget: 38,            // War spending straining surplus
    metric_environment: 35,
    metric_immigration: 32,       // Net emigration; labour imported from CIS
    // Inverse
    metric_corruption: 70,
    metric_inflation: 55,         // War-driven price pressure
    metric_crime: 50,
    metric_bureaucracy: 65,
    metric_unrest: 42,
    metric_economic_bubble: 30,
    metric_foreign_influence: 28,
  },

  // ── UNITED KINGDOM ─────────────────────────────────────────────────────────
  // Post-Brexit transition; NHS pressure; housing affordability crisis.
  gb: {
    metric_economy: 65,
    metric_employment: 65,
    metric_health: 68,
    metric_education: 74,
    metric_democracy: 80,
    metric_sovereignty: 65,       // Brexit regained formal sovereignty; trade costs
    metric_military: 72,
    metric_innovation: 74,
    metric_trade: 60,             // Post-Brexit friction
    metric_energy: 58,
    metric_infrastructure: 62,
    metric_housing: 42,           // Severe affordability crisis
    metric_foreign_relations: 68,
    metric_public_order: 65,
    metric_equality: 58,
    metric_liberty: 78,
    metric_budget: 42,
    metric_environment: 65,
    metric_immigration: 55,
    // Inverse
    metric_corruption: 22,
    metric_inflation: 42,         // Above-average post-pandemic
    metric_crime: 38,
    metric_bureaucracy: 38,
    metric_unrest: 28,
    metric_economic_bubble: 35,
    metric_foreign_influence: 25,
  },

  // ── FRANCE ─────────────────────────────────────────────────────────────────
  // Strong welfare state; frequent unrest; pension/labour reform tensions.
  fr: {
    metric_economy: 65,
    metric_employment: 55,        // ~7% unemployment; youth particularly high
    metric_health: 76,
    metric_education: 70,
    metric_democracy: 74,
    metric_sovereignty: 70,
    metric_military: 72,
    metric_innovation: 68,
    metric_trade: 62,
    metric_energy: 72,            // Nuclear-heavy; energy independent
    metric_infrastructure: 74,
    metric_housing: 52,
    metric_foreign_relations: 72,
    metric_public_order: 58,
    metric_equality: 60,
    metric_liberty: 74,
    metric_budget: 40,
    metric_environment: 65,
    metric_immigration: 52,       // Integration tensions
    // Inverse
    metric_corruption: 28,
    metric_inflation: 35,
    metric_crime: 42,
    metric_bureaucracy: 55,
    metric_unrest: 48,            // Yellow vests / pension protests culture
    metric_economic_bubble: 32,
    metric_foreign_influence: 28,
  },

  // ── GERMANY ────────────────────────────────────────────────────────────────
  // Industrial powerhouse; energy transition challenge; export-driven growth.
  de: {
    metric_economy: 70,
    metric_employment: 70,
    metric_health: 75,
    metric_education: 74,
    metric_democracy: 82,
    metric_sovereignty: 68,
    metric_military: 58,          // Underfunded historically; now expanding
    metric_innovation: 75,
    metric_trade: 80,             // Export champion
    metric_energy: 52,            // Energiewende transition; gas dependency ended
    metric_infrastructure: 70,
    metric_housing: 50,
    metric_foreign_relations: 76,
    metric_public_order: 68,
    metric_equality: 65,
    metric_liberty: 80,
    metric_budget: 55,
    metric_environment: 65,
    metric_immigration: 55,
    // Inverse
    metric_corruption: 18,
    metric_inflation: 38,
    metric_crime: 28,
    metric_bureaucracy: 45,
    metric_unrest: 25,
    metric_economic_bubble: 30,
    metric_foreign_influence: 25,
  },

  // ── JAPAN ──────────────────────────────────────────────────────────────────
  // Ageing population; deflation now reversing; pacifist constitution shifting.
  jp: {
    metric_economy: 65,
    metric_employment: 68,        // Near-full employment; hidden underemployment
    metric_health: 84,            // World-leading longevity
    metric_education: 82,
    metric_democracy: 74,
    metric_sovereignty: 62,       // US alliance constrains some options
    metric_military: 62,
    metric_innovation: 78,
    metric_trade: 72,
    metric_energy: 42,            // Import dependent; nuclear restart underway
    metric_infrastructure: 84,
    metric_housing: 58,           // Reasonable by global standards
    metric_foreign_relations: 65,
    metric_public_order: 80,
    metric_equality: 62,
    metric_liberty: 68,
    metric_budget: 32,            // Massive public debt (~260% GDP)
    metric_environment: 58,
    metric_immigration: 32,       // Very low intake; demographic pressure
    // Inverse
    metric_corruption: 18,
    metric_inflation: 35,
    metric_crime: 14,             // Among lowest globally
    metric_bureaucracy: 58,
    metric_unrest: 15,
    metric_economic_bubble: 38,
    metric_foreign_influence: 28,
  },

  // ── INDIA ──────────────────────────────────────────────────────────────────
  // Fastest-growing large economy; democratic backsliding; inequality.
  in: {
    metric_economy: 62,
    metric_employment: 50,        // High informal employment; formal weak
    metric_health: 50,
    metric_education: 55,
    metric_democracy: 58,         // World's largest but institutions stressed
    metric_sovereignty: 65,
    metric_military: 68,
    metric_innovation: 58,
    metric_trade: 55,
    metric_energy: 50,
    metric_infrastructure: 48,
    metric_housing: 40,
    metric_foreign_relations: 62, // Non-aligned; BRICS; Quad
    metric_public_order: 52,
    metric_equality: 35,          // Extreme Gini; caste compounding
    metric_liberty: 52,           // Press freedom declining
    metric_budget: 40,
    metric_environment: 40,
    metric_immigration: 30,
    // Inverse
    metric_corruption: 60,
    metric_inflation: 42,
    metric_crime: 52,
    metric_bureaucracy: 65,
    metric_unrest: 42,
    metric_economic_bubble: 38,
    metric_foreign_influence: 32,
  },

  // ── BRAZIL ─────────────────────────────────────────────────────────────────
  // Resource-rich; extreme inequality; corruption legacy; strong democracy.
  br: {
    metric_economy: 50,
    metric_employment: 50,
    metric_health: 58,
    metric_education: 48,
    metric_democracy: 58,
    metric_sovereignty: 62,
    metric_military: 58,
    metric_innovation: 45,
    metric_trade: 55,
    metric_energy: 62,            // Hydro and oil; pre-salt oil
    metric_infrastructure: 45,
    metric_housing: 40,
    metric_foreign_relations: 58,
    metric_public_order: 38,
    metric_equality: 28,          // One of highest Gini globally
    metric_liberty: 58,
    metric_budget: 35,
    metric_environment: 48,       // Deforestation pressure
    metric_immigration: 45,
    // Inverse
    metric_corruption: 62,
    metric_inflation: 45,
    metric_crime: 70,             // Very high homicide rate
    metric_bureaucracy: 60,
    metric_unrest: 48,
    metric_economic_bubble: 35,
    metric_foreign_influence: 32,
  },

  // ── CANADA ─────────────────────────────────────────────────────────────────
  // Stable democracy; housing crisis the main stress point.
  ca: {
    metric_economy: 70,
    metric_employment: 68,
    metric_health: 74,
    metric_education: 76,
    metric_democracy: 82,
    metric_sovereignty: 70,
    metric_military: 55,          // Underspending vs. NATO targets
    metric_innovation: 70,
    metric_trade: 68,
    metric_energy: 74,            // Fossil exporter + hydro
    metric_infrastructure: 68,
    metric_housing: 35,           // Severe affordability crisis esp. Toronto/Vancouver
    metric_foreign_relations: 78,
    metric_public_order: 68,
    metric_equality: 68,
    metric_liberty: 82,
    metric_budget: 48,
    metric_environment: 62,
    metric_immigration: 58,       // High intake; integration strain emerging
    // Inverse
    metric_corruption: 18,
    metric_inflation: 38,
    metric_crime: 30,
    metric_bureaucracy: 32,
    metric_unrest: 20,
    metric_economic_bubble: 38,   // Housing bubble risk
    metric_foreign_influence: 20,
  },

  // ── AUSTRALIA ──────────────────────────────────────────────────────────────
  // Commodity-driven; housing crisis; strong institutions.
  au: {
    metric_economy: 70,
    metric_employment: 68,
    metric_health: 76,
    metric_education: 76,
    metric_democracy: 82,
    metric_sovereignty: 70,
    metric_military: 60,
    metric_innovation: 65,
    metric_trade: 65,
    metric_energy: 65,
    metric_infrastructure: 68,
    metric_housing: 35,           // World's least affordable major cities
    metric_foreign_relations: 70,
    metric_public_order: 70,
    metric_equality: 65,
    metric_liberty: 78,
    metric_budget: 50,
    metric_environment: 55,       // Coal dependence; climate vulnerability
    metric_immigration: 60,
    // Inverse
    metric_corruption: 20,
    metric_inflation: 40,
    metric_crime: 28,
    metric_bureaucracy: 32,
    metric_unrest: 18,
    metric_economic_bubble: 40,   // Housing bubble
    metric_foreign_influence: 22,
  },

  // ── SOUTH KOREA ────────────────────────────────────────────────────────────
  // Miracle economy; political volatility; North Korea threat.
  kr: {
    metric_economy: 68,
    metric_employment: 62,
    metric_health: 76,
    metric_education: 84,         // Top PISA scores globally
    metric_democracy: 70,         // Volatile; recent martial law incident
    metric_sovereignty: 58,       // US alliance; North Korea constraint
    metric_military: 70,
    metric_innovation: 78,
    metric_trade: 72,
    metric_energy: 42,            // Import dependent
    metric_infrastructure: 80,
    metric_housing: 40,           // Seoul pricing crisis
    metric_foreign_relations: 60,
    metric_public_order: 68,
    metric_equality: 50,
    metric_liberty: 65,
    metric_budget: 48,
    metric_environment: 50,
    metric_immigration: 35,
    // Inverse
    metric_corruption: 35,
    metric_inflation: 32,
    metric_crime: 22,
    metric_bureaucracy: 48,
    metric_unrest: 32,
    metric_economic_bubble: 42,
    metric_foreign_influence: 48, // Significant NK/China pressure
  },

  // ── ITALY ──────────────────────────────────────────────────────────────────
  // Slow growth; high debt; political fragmentation; strong culture.
  it: {
    metric_economy: 55,
    metric_employment: 50,        // High youth unemployment
    metric_health: 74,
    metric_education: 62,
    metric_democracy: 68,
    metric_sovereignty: 60,       // EU constraints
    metric_military: 58,
    metric_innovation: 55,
    metric_trade: 62,
    metric_energy: 48,
    metric_infrastructure: 60,    // North-south divide
    metric_housing: 55,
    metric_foreign_relations: 65,
    metric_public_order: 60,
    metric_equality: 52,
    metric_liberty: 72,
    metric_budget: 35,            // Debt ~145% GDP
    metric_environment: 60,
    metric_immigration: 45,
    // Inverse
    metric_corruption: 45,
    metric_inflation: 38,
    metric_crime: 42,
    metric_bureaucracy: 65,
    metric_unrest: 38,
    metric_economic_bubble: 32,
    metric_foreign_influence: 28,
  },

  // ── SPAIN ──────────────────────────────────────────────────────────────────
  // Tourism-driven; high youth unemployment; Catalan tensions.
  es: {
    metric_economy: 60,
    metric_employment: 48,        // ~11% unemployment; youth ~28%
    metric_health: 75,
    metric_education: 65,
    metric_democracy: 72,
    metric_sovereignty: 62,       // Catalan independence tension
    metric_military: 55,
    metric_innovation: 55,
    metric_trade: 60,
    metric_energy: 60,            // Renewables leader
    metric_infrastructure: 65,
    metric_housing: 45,
    metric_foreign_relations: 68,
    metric_public_order: 60,
    metric_equality: 55,
    metric_liberty: 72,
    metric_budget: 38,
    metric_environment: 62,
    metric_immigration: 52,
    // Inverse
    metric_corruption: 40,
    metric_inflation: 35,
    metric_crime: 35,
    metric_bureaucracy: 52,
    metric_unrest: 42,
    metric_economic_bubble: 30,
    metric_foreign_influence: 25,
  },

  // ── MEXICO ─────────────────────────────────────────────────────────────────
  // Cartel violence; AMLO-era state expansion; nearshoring boom.
  mx: {
    metric_economy: 50,
    metric_employment: 48,
    metric_health: 52,
    metric_education: 48,
    metric_democracy: 52,
    metric_sovereignty: 52,
    metric_military: 48,
    metric_innovation: 40,
    metric_trade: 60,             // USMCA integration
    metric_energy: 52,
    metric_infrastructure: 45,
    metric_housing: 40,
    metric_foreign_relations: 55,
    metric_public_order: 30,      // Cartel violence endemic
    metric_equality: 30,
    metric_liberty: 50,
    metric_budget: 38,
    metric_environment: 45,
    metric_immigration: 42,
    // Inverse
    metric_corruption: 70,
    metric_inflation: 45,
    metric_crime: 75,             // High homicide rate
    metric_bureaucracy: 60,
    metric_unrest: 52,
    metric_economic_bubble: 32,
    metric_foreign_influence: 50,
  },

  // ── INDONESIA ──────────────────────────────────────────────────────────────
  // Archipelago; world's 4th most populous; resource economy diversifying.
  id: {
    metric_economy: 58,
    metric_employment: 52,
    metric_health: 55,
    metric_education: 52,
    metric_democracy: 58,
    metric_sovereignty: 62,
    metric_military: 55,
    metric_innovation: 42,
    metric_trade: 58,
    metric_energy: 55,
    metric_infrastructure: 48,
    metric_housing: 45,
    metric_foreign_relations: 62,
    metric_public_order: 58,
    metric_equality: 40,
    metric_liberty: 55,
    metric_budget: 45,
    metric_environment: 40,       // Deforestation; peatland fires
    metric_immigration: 40,
    // Inverse
    metric_corruption: 58,
    metric_inflation: 40,
    metric_crime: 45,
    metric_bureaucracy: 58,
    metric_unrest: 35,
    metric_economic_bubble: 28,
    metric_foreign_influence: 38,
  },

  // ── TURKEY ─────────────────────────────────────────────────────────────────
  // NATO member; authoritarian drift; chronic hyperinflation.
  tr: {
    metric_economy: 48,
    metric_employment: 52,
    metric_health: 60,
    metric_education: 55,
    metric_democracy: 32,         // Erdoğan consolidation
    metric_sovereignty: 60,
    metric_military: 65,
    metric_innovation: 42,
    metric_trade: 52,
    metric_energy: 48,
    metric_infrastructure: 58,
    metric_housing: 38,
    metric_foreign_relations: 42,
    metric_public_order: 52,
    metric_equality: 38,
    metric_liberty: 28,
    metric_budget: 35,
    metric_environment: 42,
    metric_immigration: 45,       // Major Syrian refugee host
    // Inverse
    metric_corruption: 58,
    metric_inflation: 78,         // 65–85% peak CPI
    metric_crime: 45,
    metric_bureaucracy: 55,
    metric_unrest: 52,
    metric_economic_bubble: 45,
    metric_foreign_influence: 42,
  },

  // ── SAUDI ARABIA ───────────────────────────────────────────────────────────
  // Oil-funded modernisation; Vision 2030; absolute monarchy.
  sa: {
    metric_economy: 65,
    metric_employment: 55,
    metric_health: 65,
    metric_education: 55,
    metric_democracy: 10,
    metric_sovereignty: 70,
    metric_military: 68,
    metric_innovation: 42,
    metric_trade: 62,
    metric_energy: 90,            // World's top oil exporter
    metric_infrastructure: 65,
    metric_housing: 55,
    metric_foreign_relations: 55,
    metric_public_order: 68,
    metric_equality: 25,          // Severe gender and worker inequality
    metric_liberty: 18,
    metric_budget: 62,
    metric_environment: 35,
    metric_immigration: 35,       // Large migrant worker population; kafala system
    // Inverse
    metric_corruption: 52,
    metric_inflation: 28,
    metric_crime: 28,
    metric_bureaucracy: 48,
    metric_unrest: 28,
    metric_economic_bubble: 42,
    metric_foreign_influence: 32,
  },

  // ── ARGENTINA ──────────────────────────────────────────────────────────────
  // Serial crisis economy; hyperinflation; IMF dependency; Milei shock therapy.
  ar: {
    metric_economy: 35,
    metric_employment: 48,
    metric_health: 58,
    metric_education: 58,
    metric_democracy: 60,
    metric_sovereignty: 52,
    metric_military: 45,
    metric_innovation: 42,
    metric_trade: 35,
    metric_energy: 52,
    metric_infrastructure: 45,
    metric_housing: 38,
    metric_foreign_relations: 48,
    metric_public_order: 45,
    metric_equality: 32,
    metric_liberty: 60,
    metric_budget: 20,            // Near-zero fiscal space; IMF conditions
    metric_environment: 55,
    metric_immigration: 45,
    // Inverse
    metric_corruption: 60,
    metric_inflation: 90,         // 200%+ annual CPI at peak
    metric_crime: 52,
    metric_bureaucracy: 62,
    metric_unrest: 60,
    metric_economic_bubble: 48,
    metric_foreign_influence: 38,
  },

  // ── NORWAY ─────────────────────────────────────────────────────────────────
  // Top HDI; sovereign wealth fund; oil-funded welfare state.
  no: {
    metric_economy: 80,
    metric_employment: 76,
    metric_health: 84,
    metric_education: 82,
    metric_democracy: 90,
    metric_sovereignty: 78,
    metric_military: 62,
    metric_innovation: 78,
    metric_trade: 72,
    metric_energy: 85,            // North Sea oil + renewables
    metric_infrastructure: 82,
    metric_housing: 60,
    metric_foreign_relations: 84,
    metric_public_order: 82,
    metric_equality: 82,
    metric_liberty: 90,
    metric_budget: 80,            // Oil fund surplus
    metric_environment: 72,
    metric_immigration: 60,
    // Inverse
    metric_corruption: 10,
    metric_inflation: 30,
    metric_crime: 14,
    metric_bureaucracy: 22,
    metric_unrest: 12,
    metric_economic_bubble: 28,
    metric_foreign_influence: 14,
  },

  // ── SWEDEN ─────────────────────────────────────────────────────────────────
  // High trust society; gang crime emerging; strong welfare.
  se: {
    metric_economy: 74,
    metric_employment: 72,
    metric_health: 82,
    metric_education: 80,
    metric_democracy: 88,
    metric_sovereignty: 70,
    metric_military: 60,          // NATO joiner; rebuilding
    metric_innovation: 82,
    metric_trade: 72,
    metric_energy: 78,            // Renewables + hydro + nuclear
    metric_infrastructure: 78,
    metric_housing: 52,
    metric_foreign_relations: 82,
    metric_public_order: 68,      // Gang violence issue in suburbs
    metric_equality: 78,
    metric_liberty: 90,
    metric_budget: 68,
    metric_environment: 80,
    metric_immigration: 50,       // Integration challenges
    // Inverse
    metric_corruption: 10,
    metric_inflation: 30,
    metric_crime: 28,             // Gang crime elevated vs. Nordic norm
    metric_bureaucracy: 24,
    metric_unrest: 18,
    metric_economic_bubble: 28,
    metric_foreign_influence: 16,
  },

  // ── NETHERLANDS ────────────────────────────────────────────────────────────
  // Trade hub; housing crisis; nitrogen policy crisis.
  nl: {
    metric_economy: 75,
    metric_employment: 72,
    metric_health: 78,
    metric_education: 78,
    metric_democracy: 84,
    metric_sovereignty: 68,
    metric_military: 55,
    metric_innovation: 78,
    metric_trade: 82,             // Rotterdam; Schiphol gateway
    metric_energy: 60,
    metric_infrastructure: 82,
    metric_housing: 38,           // Severe shortage
    metric_foreign_relations: 78,
    metric_public_order: 70,
    metric_equality: 70,
    metric_liberty: 86,
    metric_budget: 58,
    metric_environment: 58,       // Nitrogen crisis; flooding risk
    metric_immigration: 48,
    // Inverse
    metric_corruption: 14,
    metric_inflation: 32,
    metric_crime: 28,
    metric_bureaucracy: 28,
    metric_unrest: 22,
    metric_economic_bubble: 32,
    metric_foreign_influence: 20,
  },

  // ── SWITZERLAND ────────────────────────────────────────────────────────────
  // Direct democracy; financial hub; neutrality.
  ch: {
    metric_economy: 84,
    metric_employment: 75,
    metric_health: 82,
    metric_education: 84,
    metric_democracy: 88,
    metric_sovereignty: 82,
    metric_military: 52,
    metric_innovation: 86,        // Top R&D per capita
    metric_trade: 80,
    metric_energy: 74,
    metric_infrastructure: 84,
    metric_housing: 48,
    metric_foreign_relations: 80,
    metric_public_order: 80,
    metric_equality: 70,
    metric_liberty: 88,
    metric_budget: 75,
    metric_environment: 74,
    metric_immigration: 55,
    // Inverse
    metric_corruption: 10,
    metric_inflation: 24,
    metric_crime: 16,
    metric_bureaucracy: 20,
    metric_unrest: 12,
    metric_economic_bubble: 28,
    metric_foreign_influence: 14,
  },

  // ── POLAND ─────────────────────────────────────────────────────────────────
  // Rapid development; NATO frontline; rule-of-law tensions.
  pl: {
    metric_economy: 62,
    metric_employment: 62,
    metric_health: 62,
    metric_education: 65,
    metric_democracy: 58,         // Backsliding reversed; still recovering
    metric_sovereignty: 55,
    metric_military: 65,          // Frontline NATO; ramping defence
    metric_innovation: 52,
    metric_trade: 62,
    metric_energy: 50,            // Coal-heavy; transition underway
    metric_infrastructure: 62,
    metric_housing: 52,
    metric_foreign_relations: 58,
    metric_public_order: 62,
    metric_equality: 52,
    metric_liberty: 58,
    metric_budget: 45,
    metric_environment: 48,
    metric_immigration: 45,       // Major Ukrainian refugee intake
    // Inverse
    metric_corruption: 40,
    metric_inflation: 45,
    metric_crime: 32,
    metric_bureaucracy: 50,
    metric_unrest: 35,
    metric_economic_bubble: 30,
    metric_foreign_influence: 45,
  },

  // ── UKRAINE ────────────────────────────────────────────────────────────────
  // At war; territory lost; massive displacement; aid-dependent.
  ua: {
    metric_economy: 30,
    metric_employment: 38,
    metric_health: 45,
    metric_education: 55,
    metric_democracy: 60,
    metric_sovereignty: 28,       // Active invasion; occupied territory
    metric_military: 68,          // Effective resistance; depleted
    metric_innovation: 42,
    metric_trade: 25,
    metric_energy: 32,            // Grid under attack
    metric_infrastructure: 28,   // War damage
    metric_housing: 25,           // Massive displacement
    metric_foreign_relations: 65, // Western support; aid flows
    metric_public_order: 42,
    metric_equality: 42,
    metric_liberty: 58,
    metric_budget: 22,            // Aid-dependent budget
    metric_environment: 28,
    metric_immigration: 28,       // Net refugee outflow
    // Inverse
    metric_corruption: 65,
    metric_inflation: 65,
    metric_crime: 52,
    metric_bureaucracy: 65,
    metric_unrest: 55,
    metric_economic_bubble: 28,
    metric_foreign_influence: 75, // Russian interference; existential
  },

  // ── ISRAEL ─────────────────────────────────────────────────────────────────
  // High-tech economy; Gaza war context; coalition instability.
  il: {
    metric_economy: 65,
    metric_employment: 62,
    metric_health: 76,
    metric_education: 74,
    metric_democracy: 60,         // Judicial overhaul crisis
    metric_sovereignty: 60,
    metric_military: 80,
    metric_innovation: 84,        // Start-up nation
    metric_trade: 60,
    metric_energy: 55,
    metric_infrastructure: 68,
    metric_housing: 35,           // Severe affordability crisis
    metric_foreign_relations: 38, // Isolated; Gaza fallout
    metric_public_order: 48,
    metric_equality: 45,
    metric_liberty: 58,
    metric_budget: 38,            // War spending; deficit spike
    metric_environment: 52,
    metric_immigration: 60,       // Aliyah (Jewish immigration) policy
    // Inverse
    metric_corruption: 40,
    metric_inflation: 40,
    metric_crime: 32,
    metric_bureaucracy: 42,
    metric_unrest: 58,            // Protest movement + war
    metric_economic_bubble: 42,
    metric_foreign_influence: 40,
  },

  // ── IRAN ───────────────────────────────────────────────────────────────────
  // Sanctions regime; nuclear program; theocratic government; protests.
  ir: {
    metric_economy: 28,
    metric_employment: 40,
    metric_health: 55,
    metric_education: 55,
    metric_democracy: 12,
    metric_sovereignty: 55,
    metric_military: 55,
    metric_innovation: 32,
    metric_trade: 20,             // Sanctions severely limit trade
    metric_energy: 65,            // Oil but sanctions-constrained export
    metric_infrastructure: 42,
    metric_housing: 35,
    metric_foreign_relations: 15,
    metric_public_order: 50,
    metric_equality: 28,
    metric_liberty: 12,           // Severe; Woman Life Freedom crackdown
    metric_budget: 25,
    metric_environment: 38,
    metric_immigration: 35,
    // Inverse
    metric_corruption: 70,
    metric_inflation: 82,         // Triple-digit CPI; sanctions-driven
    metric_crime: 50,
    metric_bureaucracy: 70,
    metric_unrest: 68,            // 2022 protest wave; simmering
    metric_economic_bubble: 35,
    metric_foreign_influence: 30,
  },

  // ── EGYPT ──────────────────────────────────────────────────────────────────
  // Military-ruled; food insecurity; Suez dependence; IMF program.
  eg: {
    metric_economy: 38,
    metric_employment: 42,
    metric_health: 48,
    metric_education: 46,
    metric_democracy: 18,
    metric_sovereignty: 55,
    metric_military: 60,          // Military runs large economic sector
    metric_innovation: 32,
    metric_trade: 45,             // Suez toll revenue
    metric_energy: 48,
    metric_infrastructure: 48,
    metric_housing: 35,
    metric_foreign_relations: 52,
    metric_public_order: 52,
    metric_equality: 28,
    metric_liberty: 20,
    metric_budget: 28,
    metric_environment: 40,
    metric_immigration: 38,
    // Inverse
    metric_corruption: 65,
    metric_inflation: 72,         // 30%+ CPI; pound devaluation
    metric_crime: 48,
    metric_bureaucracy: 68,
    metric_unrest: 50,
    metric_economic_bubble: 35,
    metric_foreign_influence: 52,
  },

  // ── SOUTH AFRICA ───────────────────────────────────────────────────────────
  // Load-shedding crisis; high inequality; crime; ANC coalition shift.
  za: {
    metric_economy: 42,
    metric_employment: 32,        // ~32% unemployment; youth ~60%
    metric_health: 48,
    metric_education: 48,
    metric_democracy: 65,
    metric_sovereignty: 60,
    metric_military: 48,
    metric_innovation: 40,
    metric_trade: 50,
    metric_energy: 32,            // Eskom load-shedding collapse
    metric_infrastructure: 42,
    metric_housing: 32,
    metric_foreign_relations: 58,
    metric_public_order: 35,
    metric_equality: 22,          // World's highest Gini coefficient
    metric_liberty: 65,
    metric_budget: 32,
    metric_environment: 42,
    metric_immigration: 42,
    // Inverse
    metric_corruption: 65,
    metric_inflation: 48,
    metric_crime: 80,             // World's highest murder rate (non-conflict)
    metric_bureaucracy: 58,
    metric_unrest: 58,
    metric_economic_bubble: 30,
    metric_foreign_influence: 38,
  },

  // ── NIGERIA ────────────────────────────────────────────────────────────────
  // Africa's largest economy; oil curse; insecurity; young population.
  ng: {
    metric_economy: 35,
    metric_employment: 35,
    metric_health: 35,
    metric_education: 38,
    metric_democracy: 42,
    metric_sovereignty: 48,
    metric_military: 42,
    metric_innovation: 28,
    metric_trade: 38,
    metric_energy: 35,            // Oil exporter but power grid failing
    metric_infrastructure: 28,
    metric_housing: 28,
    metric_foreign_relations: 48,
    metric_public_order: 25,      // Boko Haram; banditry; kidnapping
    metric_equality: 22,
    metric_liberty: 42,
    metric_budget: 25,
    metric_environment: 32,
    metric_immigration: 35,
    // Inverse
    metric_corruption: 78,
    metric_inflation: 65,         // 25–30% CPI
    metric_crime: 75,
    metric_bureaucracy: 70,
    metric_unrest: 62,
    metric_economic_bubble: 28,
    metric_foreign_influence: 45,
  },

  // ── PAKISTAN ───────────────────────────────────────────────────────────────
  // IMF bailout cycle; military power; Kashmir; nuclear state.
  pk: {
    metric_economy: 28,
    metric_employment: 35,
    metric_health: 38,
    metric_education: 35,
    metric_democracy: 30,         // Military interference endemic
    metric_sovereignty: 40,
    metric_military: 58,          // Oversized vs. economy; nuclear
    metric_innovation: 25,
    metric_trade: 32,
    metric_energy: 32,
    metric_infrastructure: 35,
    metric_housing: 30,
    metric_foreign_relations: 35,
    metric_public_order: 30,
    metric_equality: 25,
    metric_liberty: 32,
    metric_budget: 18,
    metric_environment: 35,
    metric_immigration: 35,
    // Inverse
    metric_corruption: 70,
    metric_inflation: 75,         // 20–38% CPI
    metric_crime: 65,
    metric_bureaucracy: 70,
    metric_unrest: 68,
    metric_economic_bubble: 30,
    metric_foreign_influence: 65,
  },

  // ── VENEZUELA ──────────────────────────────────────────────────────────────
  // Economic collapse; sanctions; Maduro authoritarianism; diaspora.
  ve: {
    metric_economy: 18,
    metric_employment: 30,
    metric_health: 30,
    metric_education: 38,
    metric_democracy: 15,
    metric_sovereignty: 40,
    metric_military: 42,
    metric_innovation: 18,
    metric_trade: 15,
    metric_energy: 52,            // Oil reserves but collapsed production
    metric_infrastructure: 22,
    metric_housing: 22,
    metric_foreign_relations: 18,
    metric_public_order: 20,
    metric_equality: 20,
    metric_liberty: 15,
    metric_budget: 12,
    metric_environment: 42,
    metric_immigration: 15,       // 8M emigrated; inflow negligible
    // Inverse
    metric_corruption: 82,
    metric_inflation: 95,         // Hyperinflation; millions of % at peak
    metric_crime: 85,
    metric_bureaucracy: 75,
    metric_unrest: 72,
    metric_economic_bubble: 22,
    metric_foreign_influence: 58,
  },

  // ── THAILAND ───────────────────────────────────────────────────────────────
  // Tourism; semi-democratic; military influence; middle-income trap.
  th: {
    metric_economy: 52,
    metric_employment: 58,
    metric_health: 65,
    metric_education: 58,
    metric_democracy: 40,         // Military-backed constitution
    metric_sovereignty: 60,
    metric_military: 55,
    metric_innovation: 45,
    metric_trade: 62,
    metric_energy: 52,
    metric_infrastructure: 60,
    metric_housing: 48,
    metric_foreign_relations: 58,
    metric_public_order: 58,
    metric_equality: 38,
    metric_liberty: 38,
    metric_budget: 45,
    metric_environment: 48,
    metric_immigration: 42,
    // Inverse
    metric_corruption: 55,
    metric_inflation: 32,
    metric_crime: 42,
    metric_bureaucracy: 52,
    metric_unrest: 40,
    metric_economic_bubble: 35,
    metric_foreign_influence: 42,
  },

  // ── VIETNAM ────────────────────────────────────────────────────────────────
  // Export manufacturing boom; one-party; foreign investment magnet.
  vn: {
    metric_economy: 62,
    metric_employment: 62,
    metric_health: 60,
    metric_education: 65,
    metric_democracy: 18,
    metric_sovereignty: 62,
    metric_military: 52,
    metric_innovation: 42,
    metric_trade: 72,             // Export-oriented; major FDI destination
    metric_energy: 52,
    metric_infrastructure: 58,
    metric_housing: 50,
    metric_foreign_relations: 58,
    metric_public_order: 65,
    metric_equality: 48,
    metric_liberty: 20,
    metric_budget: 45,
    metric_environment: 42,
    metric_immigration: 35,
    // Inverse
    metric_corruption: 58,
    metric_inflation: 38,
    metric_crime: 32,
    metric_bureaucracy: 60,
    metric_unrest: 20,
    metric_economic_bubble: 35,
    metric_foreign_influence: 40,
  },

  // ── SINGAPORE ──────────────────────────────────────────────────────────────
  // City-state; world-class everything; soft authoritarianism.
  sg: {
    metric_economy: 84,
    metric_employment: 76,
    metric_health: 84,
    metric_education: 86,
    metric_democracy: 52,         // PAP dominant; clean but not competitive
    metric_sovereignty: 78,
    metric_military: 68,
    metric_innovation: 84,
    metric_trade: 90,             // World's busiest port per capita
    metric_energy: 72,
    metric_infrastructure: 90,
    metric_housing: 55,           // Expensive; public housing managed well
    metric_foreign_relations: 80,
    metric_public_order: 85,
    metric_equality: 52,          // High Gini for a wealthy city
    metric_liberty: 58,
    metric_budget: 75,
    metric_environment: 68,
    metric_immigration: 55,
    // Inverse
    metric_corruption: 8,         // World's least corrupt
    metric_inflation: 35,
    metric_crime: 8,              // Virtually no crime
    metric_bureaucracy: 18,
    metric_unrest: 12,
    metric_economic_bubble: 42,   // Property market elevated
    metric_foreign_influence: 28,
  },

  // ── MALAYSIA ───────────────────────────────────────────────────────────────
  // Middle-income; ethnic politics; natural resources; digital hub ambitions.
  my: {
    metric_economy: 60,
    metric_employment: 62,
    metric_health: 65,
    metric_education: 62,
    metric_democracy: 50,
    metric_sovereignty: 62,
    metric_military: 52,
    metric_innovation: 50,
    metric_trade: 70,
    metric_energy: 62,
    metric_infrastructure: 62,
    metric_housing: 50,
    metric_foreign_relations: 62,
    metric_public_order: 62,
    metric_equality: 45,
    metric_liberty: 48,
    metric_budget: 45,
    metric_environment: 45,
    metric_immigration: 42,
    // Inverse
    metric_corruption: 52,
    metric_inflation: 32,
    metric_crime: 40,
    metric_bureaucracy: 48,
    metric_unrest: 28,
    metric_economic_bubble: 32,
    metric_foreign_influence: 38,
  },

  // ── PHILIPPINES ────────────────────────────────────────────────────────────
  // Archipelago; poverty; remittance economy; drug war legacy.
  ph: {
    metric_economy: 48,
    metric_employment: 48,
    metric_health: 50,
    metric_education: 52,
    metric_democracy: 52,
    metric_sovereignty: 50,
    metric_military: 45,
    metric_innovation: 35,
    metric_trade: 50,
    metric_energy: 45,
    metric_infrastructure: 42,
    metric_housing: 32,
    metric_foreign_relations: 52,
    metric_public_order: 40,
    metric_equality: 28,
    metric_liberty: 48,
    metric_budget: 35,
    metric_environment: 40,
    metric_immigration: 40,
    // Inverse
    metric_corruption: 65,
    metric_inflation: 42,
    metric_crime: 62,
    metric_bureaucracy: 62,
    metric_unrest: 48,
    metric_economic_bubble: 30,
    metric_foreign_influence: 55,
  },

  // ── NORTH KOREA ────────────────────────────────────────────────────────────
  // Most isolated country; totalitarian; nuclear arsenal; juche ideology.
  kp: {
    metric_economy: 15,
    metric_employment: 48,        // Forced labour; near-full formal employment
    metric_health: 28,
    metric_education: 48,         // Universal but ideological
    metric_democracy: 5,          // Zero
    metric_sovereignty: 70,       // Defined by isolation
    metric_military: 65,          // Nuclear deterrent; conventional weak
    metric_innovation: 15,
    metric_trade: 10,             // Near-total sanctions
    metric_energy: 18,
    metric_infrastructure: 22,
    metric_housing: 15,
    metric_foreign_relations: 5,
    metric_public_order: 78,      // Enforced by terror
    metric_equality: 15,          // Elite/gulag binary
    metric_liberty: 5,
    metric_budget: 25,
    metric_environment: 35,
    metric_immigration: 5,        // Emigration = death penalty
    // Inverse
    metric_corruption: 78,
    metric_inflation: 55,
    metric_crime: 30,             // Low reported; unreported different
    metric_bureaucracy: 75,
    metric_unrest: 22,            // Suppressed; not absent
    metric_economic_bubble: 15,
    metric_foreign_influence: 20,
  },

  // ── CHILE ──────────────────────────────────────────────────────────────────
  // Latin America's most stable economy; pension / constitution reform tensions.
  cl: {
    metric_economy: 60,
    metric_employment: 58,
    metric_health: 70,
    metric_education: 65,
    metric_democracy: 68,
    metric_sovereignty: 65,
    metric_military: 52,
    metric_innovation: 52,
    metric_trade: 68,             // Copper export; TPP member
    metric_energy: 60,
    metric_infrastructure: 65,
    metric_housing: 48,
    metric_foreign_relations: 65,
    metric_public_order: 52,
    metric_equality: 38,          // High Gini despite prosperity
    metric_liberty: 68,
    metric_budget: 52,
    metric_environment: 60,
    metric_immigration: 48,
    // Inverse
    metric_corruption: 28,
    metric_inflation: 40,
    metric_crime: 42,
    metric_bureaucracy: 38,
    metric_unrest: 42,            // 2019 estallido social legacy
    metric_economic_bubble: 30,
    metric_foreign_influence: 28,
  },

  // ── COLOMBIA ───────────────────────────────────────────────────────────────
  // Post-FARC peace; coca production; urban violence; Petro reforms.
  co: {
    metric_economy: 48,
    metric_employment: 48,
    metric_health: 55,
    metric_education: 50,
    metric_democracy: 55,
    metric_sovereignty: 52,
    metric_military: 52,
    metric_innovation: 35,
    metric_trade: 48,
    metric_energy: 52,
    metric_infrastructure: 42,
    metric_housing: 38,
    metric_foreign_relations: 52,
    metric_public_order: 32,      // FARC successor groups; ELN
    metric_equality: 25,
    metric_liberty: 52,
    metric_budget: 35,
    metric_environment: 52,
    metric_immigration: 45,       // Venezuela refugee host
    // Inverse
    metric_corruption: 65,
    metric_inflation: 42,
    metric_crime: 72,
    metric_bureaucracy: 58,
    metric_unrest: 52,
    metric_economic_bubble: 28,
    metric_foreign_influence: 48,
  },

  // ── GREECE ─────────────────────────────────────────────────────────────────
  // Post-bailout recovery; tourism economy; migration pressure.
  gr: {
    metric_economy: 50,
    metric_employment: 50,        // ~10% unemployment; youth ~22%
    metric_health: 72,
    metric_education: 62,
    metric_democracy: 68,
    metric_sovereignty: 55,
    metric_military: 58,          // High spend vs. GDP; Turkey threat
    metric_innovation: 45,
    metric_trade: 52,
    metric_energy: 52,
    metric_infrastructure: 58,
    metric_housing: 52,
    metric_foreign_relations: 62,
    metric_public_order: 58,
    metric_equality: 50,
    metric_liberty: 68,
    metric_budget: 30,            // Debt ~170% GDP
    metric_environment: 55,
    metric_immigration: 42,       // Frontline EU migration
    // Inverse
    metric_corruption: 48,
    metric_inflation: 35,
    metric_crime: 35,
    metric_bureaucracy: 62,
    metric_unrest: 42,
    metric_economic_bubble: 32,
    metric_foreign_influence: 38,
  },

  // ── BANGLADESH ─────────────────────────────────────────────────────────────
  // Garment export success; climate vulnerability; political instability.
  bd: {
    metric_economy: 45,
    metric_employment: 45,
    metric_health: 45,
    metric_education: 42,
    metric_democracy: 35,         // Sheikh Hasina ousted 2024
    metric_sovereignty: 50,
    metric_military: 42,
    metric_innovation: 25,
    metric_trade: 48,             // Garment exports
    metric_energy: 40,
    metric_infrastructure: 38,
    metric_housing: 30,
    metric_foreign_relations: 48,
    metric_public_order: 40,
    metric_equality: 28,
    metric_liberty: 35,
    metric_budget: 28,
    metric_environment: 30,       // Extreme climate vulnerability
    metric_immigration: 35,
    // Inverse
    metric_corruption: 70,
    metric_inflation: 48,
    metric_crime: 55,
    metric_bureaucracy: 68,
    metric_unrest: 52,
    metric_economic_bubble: 25,
    metric_foreign_influence: 48,
  },

  // ── HUNGARY ────────────────────────────────────────────────────────────────
  // Orbán illiberalism; EU friction; Russia ties; strong economy relative to region.
  hu: {
    metric_economy: 58,
    metric_employment: 62,
    metric_health: 62,
    metric_education: 62,
    metric_democracy: 42,         // Competitive authoritarian
    metric_sovereignty: 58,       // EU member but defiant
    metric_military: 50,
    metric_innovation: 50,
    metric_trade: 62,
    metric_energy: 48,            // Russian gas dependency
    metric_infrastructure: 62,
    metric_housing: 50,
    metric_foreign_relations: 48,
    metric_public_order: 62,
    metric_equality: 50,
    metric_liberty: 42,
    metric_budget: 40,
    metric_environment: 50,
    metric_immigration: 35,       // Anti-immigration policy; low intake
    // Inverse
    metric_corruption: 50,
    metric_inflation: 50,         // 25% peak; normalising
    metric_crime: 32,
    metric_bureaucracy: 50,
    metric_unrest: 32,
    metric_economic_bubble: 32,
    metric_foreign_influence: 55, // Russian influence significant
  },

  // ── PORTUGAL ───────────────────────────────────────────────────────────────
  // Post-austerity recovery; tourism boom; digital nomad hub; brain drain.
  pt: {
    metric_economy: 58,
    metric_employment: 58,
    metric_health: 72,
    metric_education: 68,
    metric_democracy: 78,
    metric_sovereignty: 65,
    metric_military: 50,
    metric_innovation: 52,
    metric_trade: 60,
    metric_energy: 65,            // Renewables leader in Europe
    metric_infrastructure: 65,
    metric_housing: 38,           // Lisbon / Porto affordability crisis
    metric_foreign_relations: 72,
    metric_public_order: 68,
    metric_equality: 58,
    metric_liberty: 78,
    metric_budget: 40,
    metric_environment: 68,
    metric_immigration: 55,       // High intake relative to size
    // Inverse
    metric_corruption: 28,
    metric_inflation: 32,
    metric_crime: 28,
    metric_bureaucracy: 42,
    metric_unrest: 25,
    metric_economic_bubble: 32,
    metric_foreign_influence: 25,
  },

  // ── NEW ZEALAND ────────────────────────────────────────────────────────────
  // Small open economy; Pacific leader; housing crisis.
  nz: {
    metric_economy: 65,
    metric_employment: 68,
    metric_health: 76,
    metric_education: 78,
    metric_democracy: 88,
    metric_sovereignty: 72,
    metric_military: 45,
    metric_innovation: 68,
    metric_trade: 65,
    metric_energy: 70,            // High renewables share
    metric_infrastructure: 68,
    metric_housing: 32,           // Among worst globally for affordability
    metric_foreign_relations: 76,
    metric_public_order: 74,
    metric_equality: 68,
    metric_liberty: 88,
    metric_budget: 48,
    metric_environment: 68,
    metric_immigration: 58,
    // Inverse
    metric_corruption: 10,
    metric_inflation: 38,
    metric_crime: 28,
    metric_bureaucracy: 28,
    metric_unrest: 16,
    metric_economic_bubble: 35,
    metric_foreign_influence: 18,
  },

  // ── KENYA ──────────────────────────────────────────────────────────────────
  // East Africa's economic hub; IMF austerity protests; tech innovation.
  ke: {
    metric_economy: 45,
    metric_employment: 42,
    metric_health: 45,
    metric_education: 50,
    metric_democracy: 50,
    metric_sovereignty: 55,
    metric_military: 45,
    metric_innovation: 38,        // Nairobi tech hub growing
    metric_trade: 45,
    metric_energy: 45,
    metric_infrastructure: 40,
    metric_housing: 30,
    metric_foreign_relations: 52,
    metric_public_order: 40,
    metric_equality: 28,
    metric_liberty: 50,
    metric_budget: 28,
    metric_environment: 48,
    metric_immigration: 40,
    // Inverse
    metric_corruption: 65,
    metric_inflation: 50,
    metric_crime: 62,
    metric_bureaucracy: 62,
    metric_unrest: 50,            // 2024 Gen Z protests
    metric_economic_bubble: 28,
    metric_foreign_influence: 42,
  },

  // ── GHANA ──────────────────────────────────────────────────────────────────
  // West Africa's democracy model; debt default 2022; cocoa and gold.
  gh: {
    metric_economy: 42,
    metric_employment: 45,
    metric_health: 48,
    metric_education: 52,
    metric_democracy: 65,         // Strong democratic tradition for Africa
    metric_sovereignty: 58,
    metric_military: 40,
    metric_innovation: 32,
    metric_trade: 45,
    metric_energy: 42,
    metric_infrastructure: 40,
    metric_housing: 35,
    metric_foreign_relations: 55,
    metric_public_order: 58,
    metric_equality: 38,
    metric_liberty: 62,
    metric_budget: 22,            // Post-default restructuring
    metric_environment: 45,
    metric_immigration: 42,
    // Inverse
    metric_corruption: 55,
    metric_inflation: 62,         // 50%+ at 2022 peak
    metric_crime: 45,
    metric_bureaucracy: 58,
    metric_unrest: 35,
    metric_economic_bubble: 25,
    metric_foreign_influence: 38,
  },

  // ── JAMAICA ────────────────────────────────────────────────────────────────
  // Tourism-dependent; high crime; vibrant culture; IMF-constrained.
  jm: {
    metric_economy: 45,
    metric_employment: 48,
    metric_health: 60,
    metric_education: 60,
    metric_democracy: 68,
    metric_sovereignty: 60,
    metric_military: 32,
    metric_innovation: 35,
    metric_trade: 52,
    metric_energy: 42,
    metric_infrastructure: 45,
    metric_housing: 40,
    metric_foreign_relations: 60,
    metric_public_order: 38,
    metric_equality: 38,
    metric_liberty: 68,
    metric_budget: 30,
    metric_environment: 55,       // Climate-vulnerable; coral reefs
    metric_immigration: 42,
    // Inverse
    metric_corruption: 50,
    metric_inflation: 40,
    metric_crime: 75,             // Very high murder rate per capita
    metric_bureaucracy: 50,
    metric_unrest: 38,
    metric_economic_bubble: 22,
    metric_foreign_influence: 35,
  },

  // ── CUBA ───────────────────────────────────────────────────────────────────
  // Communist state; US sanctions; economic crisis; emigration wave.
  cu: {
    metric_economy: 22,
    metric_employment: 52,        // State employment; near-zero official rate
    metric_health: 65,            // Strong primary care; medicine shortages
    metric_education: 70,         // Literacy near-100%; university access
    metric_democracy: 10,
    metric_sovereignty: 58,       // Anti-US stance; sovereignty narrative
    metric_military: 50,
    metric_innovation: 25,
    metric_trade: 15,             // Embargo severely limits trade
    metric_energy: 28,            // Blackouts endemic
    metric_infrastructure: 35,
    metric_housing: 32,
    metric_foreign_relations: 22,
    metric_public_order: 62,
    metric_equality: 58,          // Relative equality but in poverty
    metric_liberty: 10,
    metric_budget: 15,
    metric_environment: 52,
    metric_immigration: 12,       // Massive emigration; intake negligible
    // Inverse
    metric_corruption: 55,
    metric_inflation: 75,         // State prices controlled but parallel market
    metric_crime: 30,
    metric_bureaucracy: 75,
    metric_unrest: 48,            // 2021 protests; suppressed
    metric_economic_bubble: 18,
    metric_foreign_influence: 58, // Russia/Venezuela dependency
  },

  // ── QATAR ──────────────────────────────────────────────────────────────────
  // LNG wealth; 2022 World Cup legacy; kafala labour system; Gulf diplomacy.
  qa: {
    metric_economy: 75,
    metric_employment: 60,        // Native Qataris; migrant workers majority
    metric_health: 72,
    metric_education: 62,
    metric_democracy: 18,
    metric_sovereignty: 72,
    metric_military: 58,
    metric_innovation: 52,
    metric_trade: 72,
    metric_energy: 92,            // World's top LNG exporter
    metric_infrastructure: 75,
    metric_housing: 60,
    metric_foreign_relations: 60,
    metric_public_order: 75,
    metric_equality: 22,          // Citizen/migrant divide extreme
    metric_liberty: 22,
    metric_budget: 70,
    metric_environment: 32,
    metric_immigration: 32,       // 85%+ population are migrant workers
    // Inverse
    metric_corruption: 48,
    metric_inflation: 28,
    metric_crime: 18,
    metric_bureaucracy: 40,
    metric_unrest: 15,
    metric_economic_bubble: 38,
    metric_foreign_influence: 30,
  },
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Countries to update: ${Object.keys(countryMetrics).length}`);
  console.log(`Countries to delete: ${DELETE_COUNTRIES.length}`);

  // Delete excess countries
  for (const code of DELETE_COUNTRIES) {
    const ref = db.collection('countries').doc(code);
    if (isDryRun) {
      console.log(`[DRY RUN] Would delete: countries/${code}`);
    } else {
      const snap = await ref.get();
      if (snap.exists) {
        await ref.delete();
        console.log(`Deleted: countries/${code}`);
      } else {
        console.log(`Skip (not found): countries/${code}`);
      }
    }
  }

  // Update canonical countries
  for (const [code, metrics] of Object.entries(countryMetrics)) {
    const equilibria = defaultEquilibria(metrics);
    const ref = db.collection('countries').doc(code);

    if (isDryRun) {
      console.log(`[DRY RUN] Would update: countries/${code}`);
      console.log(`  economy: ${metrics.metric_economy} | inflation: ${metrics.metric_inflation} | corruption: ${metrics.metric_corruption} | democracy: ${metrics.metric_democracy}`);
    } else {
      const snap = await ref.get();
      if (!snap.exists) {
        console.warn(`WARNING: countries/${code} does not exist — skipping`);
        continue;
      }
      await ref.update({
        'gameplay.starting_metrics': metrics,
        'gameplay.metric_equilibria': equilibria,
      });
      console.log(`Updated: countries/${code}`);
    }
  }

  console.log('\nDone.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
