/**
 * Populates metricBiases, popularBase, and coalitionWillingness on PoliticalParty documents.
 *
 * Queries the `parties` collection, matches by countryId + name, and writes gameplay data.
 * Usage: npx tsx functions/src/scripts/populate-party-profiles.ts [--write]
 *
 * metricBiases: -1 to +1. Positive = party base cares strongly and rewards aligned decisions.
 *   Negative = party base actively opposes decisions in this domain.
 * coalitionWillingness: 0–1. 1 = fully supportive of player, 0 = total opposition.
 */

import admin from 'firebase-admin';
import type { MetricId } from '../data/schemas/metricIds';

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

interface PartyGameplayProfile {
  metricBiases: Partial<Record<MetricId, number>>;
  popularBase: string[];
  coalitionWillingness: number;
  suggestedSkills: string[];
}

// Keyed by countryId → array of party profile patches matched by name substring
const PARTY_DATA: Record<string, Array<{ nameContains: string } & PartyGameplayProfile>> = {
  us: [
    {
      nameContains: 'Democratic',
      metricBiases: {
        metric_equality: 0.35, metric_environment: 0.30, metric_health: 0.25,
        metric_liberty: 0.20, metric_education: 0.20, metric_immigration: 0.15,
        metric_military: -0.10, metric_sovereignty: -0.10,
      },
      popularBase: ['urban', 'youth', 'minority', 'educated', 'coastal'],
      coalitionWillingness: 0.8,
      suggestedSkills: ['skill_social_reformer', 'skill_diplomat', 'skill_environmental', 'skill_legal_mind'],
    },
    {
      nameContains: 'Republican',
      metricBiases: {
        metric_economy: 0.30, metric_military: 0.30, metric_sovereignty: 0.25,
        metric_corruption: -0.15, metric_immigration: -0.20, metric_trade: 0.20,
        metric_equality: -0.15, metric_environment: -0.15,
      },
      popularBase: ['rural', 'religious', 'business', 'veterans', 'suburban'],
      coalitionWillingness: 0.8,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_military_tactician', 'skill_trade_expert', 'skill_intelligence'],
    },
  ],
  gb: [
    {
      nameContains: 'Labour',
      metricBiases: {
        metric_equality: 0.35, metric_health: 0.30, metric_education: 0.25,
        metric_employment: 0.25, metric_housing: 0.20, metric_liberty: 0.15,
        metric_trade: -0.10,
      },
      popularBase: ['urban', 'youth', 'labor', 'minority', 'public_sector'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_social_reformer', 'skill_orator', 'skill_economist', 'skill_environmental'],
    },
    {
      nameContains: 'Conservative',
      metricBiases: {
        metric_economy: 0.30, metric_sovereignty: 0.25, metric_trade: 0.20,
        metric_military: 0.20, metric_corruption: -0.10, metric_equality: -0.10,
      },
      popularBase: ['rural', 'business', 'elderly', 'homeowners', 'suburban'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_trade_expert', 'skill_military_tactician', 'skill_crisis_manager'],
    },
    {
      nameContains: 'Liberal Democrat',
      metricBiases: {
        metric_liberty: 0.35, metric_environment: 0.30, metric_equality: 0.25,
        metric_education: 0.20, metric_democracy: 0.20,
      },
      popularBase: ['urban', 'educated', 'youth', 'professionals'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_diplomat', 'skill_environmental', 'skill_legal_mind', 'skill_integrity'],
    },
  ],
  de: [
    {
      nameContains: 'Social Democrat',
      metricBiases: {
        metric_equality: 0.30, metric_employment: 0.30, metric_health: 0.25,
        metric_education: 0.20, metric_housing: 0.20,
      },
      popularBase: ['labor', 'urban', 'public_sector', 'youth'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_social_reformer', 'skill_economist', 'skill_orator', 'skill_environmental'],
    },
    {
      nameContains: 'Christian Democrat',
      metricBiases: {
        metric_economy: 0.25, metric_sovereignty: 0.20, metric_trade: 0.20,
        metric_military: 0.15, metric_immigration: -0.15,
      },
      popularBase: ['rural', 'religious', 'business', 'elderly'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_crisis_manager', 'skill_trade_expert', 'skill_military_tactician'],
    },
    {
      nameContains: 'Green',
      metricBiases: {
        metric_environment: 0.45, metric_liberty: 0.30, metric_equality: 0.25,
        metric_energy: 0.30, metric_immigration: 0.15,
      },
      popularBase: ['urban', 'youth', 'educated', 'environmental'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_environmental', 'skill_social_reformer', 'skill_diplomat', 'skill_legal_mind'],
    },
    {
      nameContains: 'Free Democrat',
      metricBiases: {
        metric_economy: 0.35, metric_liberty: 0.30, metric_innovation: 0.25,
        metric_trade: 0.25, metric_corruption: -0.15,
      },
      popularBase: ['business', 'professionals', 'urban', 'educated'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_economist', 'skill_trade_expert', 'skill_technocrat', 'skill_fiscal_hawk'],
    },
    {
      nameContains: 'Alternative',
      metricBiases: {
        metric_sovereignty: 0.40, metric_immigration: -0.40, metric_democracy: -0.20,
        metric_liberty: -0.15, metric_environment: -0.20,
      },
      popularBase: ['rural', 'eastern_germany', 'economically_anxious'],
      coalitionWillingness: 0.20,
      suggestedSkills: ['skill_populist', 'skill_military_tactician', 'skill_media_savvy', 'skill_orator'],
    },
  ],
  fr: [
    {
      nameContains: 'Renaissance',
      metricBiases: {
        metric_economy: 0.25, metric_trade: 0.25, metric_innovation: 0.20,
        metric_equality: 0.15, metric_sovereignty: 0.15,
      },
      popularBase: ['urban', 'educated', 'professionals', 'centrist'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_diplomat', 'skill_economist', 'skill_trade_expert', 'skill_technocrat'],
    },
    {
      nameContains: 'Rassemblement National',
      metricBiases: {
        metric_sovereignty: 0.45, metric_immigration: -0.45, metric_public_order: 0.25,
        metric_democracy: -0.20, metric_liberty: -0.20, metric_foreign_relations: -0.25,
      },
      popularBase: ['rural', 'suburban', 'working_class', 'economically_anxious'],
      coalitionWillingness: 0.25,
      suggestedSkills: ['skill_populist', 'skill_military_tactician', 'skill_media_savvy', 'skill_crisis_manager'],
    },
    {
      nameContains: 'Socialiste',
      metricBiases: {
        metric_equality: 0.35, metric_health: 0.30, metric_education: 0.25,
        metric_employment: 0.25, metric_environment: 0.20,
      },
      popularBase: ['urban', 'labor', 'public_sector', 'youth'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_social_reformer', 'skill_environmental', 'skill_orator', 'skill_legal_mind'],
    },
  ],
  jp: [
    {
      nameContains: 'Liberal Democratic',
      metricBiases: {
        metric_economy: 0.30, metric_trade: 0.25, metric_military: 0.20,
        metric_sovereignty: 0.20, metric_innovation: 0.20, metric_equality: -0.10,
      },
      popularBase: ['business', 'rural', 'elderly', 'corporate'],
      coalitionWillingness: 0.80,
      suggestedSkills: ['skill_economist', 'skill_trade_expert', 'skill_military_tactician', 'skill_technocrat'],
    },
    {
      nameContains: 'Constitutional Democratic',
      metricBiases: {
        metric_liberty: 0.30, metric_democracy: 0.30, metric_equality: 0.25,
        metric_environment: 0.20, metric_health: 0.20,
      },
      popularBase: ['urban', 'youth', 'educated', 'labor'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_legal_mind', 'skill_diplomat', 'skill_integrity', 'skill_social_reformer'],
    },
  ],
  cn: [
    {
      nameContains: 'Communist',
      metricBiases: {
        metric_economy: 0.25, metric_sovereignty: 0.40, metric_military: 0.30,
        metric_public_order: 0.30, metric_democracy: -0.40, metric_liberty: -0.40,
        metric_innovation: 0.20, metric_equality: 0.10,
      },
      popularBase: ['party_members', 'urban', 'military', 'state_enterprise'],
      coalitionWillingness: 0.90,
      suggestedSkills: ['skill_military_tactician', 'skill_technocrat', 'skill_crisis_manager', 'skill_intelligence'],
    },
  ],
  ru: [
    {
      nameContains: 'United Russia',
      metricBiases: {
        metric_sovereignty: 0.45, metric_military: 0.40, metric_public_order: 0.30,
        metric_democracy: -0.30, metric_liberty: -0.30, metric_foreign_relations: -0.20,
      },
      popularBase: ['military', 'government_workers', 'elderly', 'rural'],
      coalitionWillingness: 0.85,
      suggestedSkills: ['skill_military_tactician', 'skill_intelligence', 'skill_crisis_manager', 'skill_media_savvy'],
    },
    {
      nameContains: 'Communist',
      metricBiases: {
        metric_equality: 0.35, metric_employment: 0.30, metric_health: 0.25,
        metric_sovereignty: 0.20, metric_economy: -0.10,
      },
      popularBase: ['elderly', 'industrial_workers', 'rural'],
      coalitionWillingness: 0.45,
      suggestedSkills: ['skill_orator', 'skill_social_reformer', 'skill_economist', 'skill_populist'],
    },
  ],
  in: [
    {
      nameContains: 'Bharatiya Janata',
      metricBiases: {
        metric_sovereignty: 0.35, metric_economy: 0.25, metric_military: 0.25,
        metric_immigration: -0.20, metric_liberty: -0.15, metric_equality: -0.10,
      },
      popularBase: ['hindu_nationalist', 'urban_middle_class', 'rural', 'business'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_military_tactician', 'skill_orator', 'skill_populist', 'skill_crisis_manager'],
    },
    {
      nameContains: 'Indian National Congress',
      metricBiases: {
        metric_equality: 0.30, metric_health: 0.25, metric_education: 0.25,
        metric_democracy: 0.25, metric_liberty: 0.20, metric_employment: 0.20,
      },
      popularBase: ['minority', 'rural_poor', 'youth', 'educated', 'urban'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_diplomat', 'skill_social_reformer', 'skill_legal_mind', 'skill_environmental'],
    },
  ],
  br: [
    {
      nameContains: 'Workers',
      metricBiases: {
        metric_equality: 0.40, metric_employment: 0.35, metric_health: 0.30,
        metric_education: 0.25, metric_housing: 0.25, metric_corruption: -0.15,
      },
      popularBase: ['labor', 'urban_poor', 'youth', 'northeast'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_orator', 'skill_social_reformer', 'skill_environmental', 'skill_populist'],
    },
    {
      nameContains: 'Liberal',
      metricBiases: {
        metric_economy: 0.30, metric_sovereignty: 0.25, metric_public_order: 0.20,
        metric_environment: -0.20, metric_equality: -0.15, metric_liberty: -0.10,
      },
      popularBase: ['agribusiness', 'evangelical', 'military', 'rural'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_economist', 'skill_trade_expert', 'skill_military_tactician'],
    },
  ],
  ca: [
    {
      nameContains: 'Liberal',
      metricBiases: {
        metric_equality: 0.25, metric_environment: 0.25, metric_health: 0.20,
        metric_immigration: 0.20, metric_innovation: 0.15, metric_trade: 0.15,
      },
      popularBase: ['urban', 'immigrant', 'youth', 'educated'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_diplomat', 'skill_environmental', 'skill_social_reformer', 'skill_media_savvy'],
    },
    {
      nameContains: 'Conservative',
      metricBiases: {
        metric_economy: 0.30, metric_trade: 0.25, metric_energy: 0.25,
        metric_sovereignty: 0.20, metric_immigration: -0.15, metric_environment: -0.15,
      },
      popularBase: ['rural', 'business', 'western_canada', 'religious'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_trade_expert', 'skill_economist', 'skill_military_tactician'],
    },
    {
      nameContains: 'New Democratic',
      metricBiases: {
        metric_equality: 0.40, metric_health: 0.35, metric_employment: 0.30,
        metric_housing: 0.25, metric_environment: 0.25,
      },
      popularBase: ['labor', 'youth', 'urban', 'indigenous'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_social_reformer', 'skill_orator', 'skill_environmental', 'skill_integrity'],
    },
  ],
  au: [
    {
      nameContains: 'Australian Labor',
      metricBiases: {
        metric_equality: 0.30, metric_health: 0.30, metric_employment: 0.25,
        metric_education: 0.25, metric_environment: 0.20,
      },
      popularBase: ['labor', 'urban', 'youth', 'public_sector'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_social_reformer', 'skill_economist', 'skill_environmental', 'skill_orator'],
    },
    {
      nameContains: 'Liberal',
      metricBiases: {
        metric_economy: 0.30, metric_trade: 0.25, metric_military: 0.20,
        metric_sovereignty: 0.20, metric_environment: -0.10,
      },
      popularBase: ['business', 'suburban', 'elderly', 'rural'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_trade_expert', 'skill_military_tactician', 'skill_technocrat'],
    },
    {
      nameContains: 'Greens',
      metricBiases: {
        metric_environment: 0.50, metric_equality: 0.30, metric_liberty: 0.25,
        metric_housing: 0.25, metric_democracy: 0.20,
      },
      popularBase: ['urban', 'youth', 'educated', 'environmental'],
      coalitionWillingness: 0.50,
      suggestedSkills: ['skill_environmental', 'skill_integrity', 'skill_social_reformer', 'skill_diplomat'],
    },
  ],
  kr: [
    {
      nameContains: 'Democratic',
      metricBiases: {
        metric_democracy: 0.30, metric_equality: 0.25, metric_liberty: 0.25,
        metric_foreign_relations: 0.20, metric_corruption: -0.20,
      },
      popularBase: ['urban', 'youth', 'educated', 'labor'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_legal_mind', 'skill_integrity', 'skill_diplomat', 'skill_social_reformer'],
    },
    {
      nameContains: 'People Power',
      metricBiases: {
        metric_economy: 0.25, metric_military: 0.25, metric_sovereignty: 0.25,
        metric_trade: 0.20, metric_foreign_relations: 0.15,
      },
      popularBase: ['business', 'elderly', 'conservative', 'suburban'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_military_tactician', 'skill_economist', 'skill_trade_expert', 'skill_technocrat'],
    },
  ],
  il: [
    {
      nameContains: 'Likud',
      metricBiases: {
        metric_sovereignty: 0.40, metric_military: 0.35, metric_public_order: 0.25,
        metric_democracy: -0.15, metric_foreign_relations: -0.10,
      },
      popularBase: ['religious', 'sephardic', 'security_hawks', 'settlers'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_military_tactician', 'skill_intelligence', 'skill_crisis_manager', 'skill_media_savvy'],
    },
    {
      nameContains: 'National Unity',
      metricBiases: {
        metric_military: 0.30, metric_democracy: 0.25, metric_economy: 0.20,
        metric_foreign_relations: 0.15, metric_sovereignty: 0.20,
      },
      popularBase: ['military_veterans', 'centrist', 'secular'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_military_tactician', 'skill_diplomat', 'skill_crisis_manager', 'skill_technocrat'],
    },
  ],
  sa: [
    {
      nameContains: 'no_parties',
      metricBiases: {
        metric_sovereignty: 0.50, metric_public_order: 0.35, metric_military: 0.25,
        metric_democracy: -0.50, metric_liberty: -0.40, metric_equality: -0.20,
        metric_economy: 0.20, metric_energy: 0.30,
      },
      popularBase: ['royal_family', 'religious_establishment', 'military', 'tribal_leaders'],
      coalitionWillingness: 0.95,
      suggestedSkills: ['skill_military_tactician', 'skill_intelligence', 'skill_crisis_manager', 'skill_trade_expert'],
    },
  ],
  tr: [
    {
      nameContains: 'Justice and Development',
      metricBiases: {
        metric_sovereignty: 0.40, metric_public_order: 0.30, metric_economy: 0.20,
        metric_democracy: -0.25, metric_liberty: -0.25, metric_foreign_relations: -0.10,
      },
      popularBase: ['conservative', 'religious', 'rural', 'working_class'],
      coalitionWillingness: 0.80,
      suggestedSkills: ['skill_crisis_manager', 'skill_media_savvy', 'skill_populist', 'skill_orator'],
    },
    {
      nameContains: 'Republican People',
      metricBiases: {
        metric_democracy: 0.35, metric_liberty: 0.30, metric_equality: 0.25,
        metric_education: 0.20, metric_sovereignty: 0.15,
      },
      popularBase: ['urban', 'secular', 'educated', 'youth'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_legal_mind', 'skill_integrity', 'skill_diplomat', 'skill_social_reformer'],
    },
  ],
  ir: [
    {
      nameContains: 'Principlist',
      metricBiases: {
        metric_sovereignty: 0.50, metric_military: 0.40, metric_public_order: 0.35,
        metric_democracy: -0.45, metric_liberty: -0.50, metric_foreign_relations: -0.30,
      },
      popularBase: ['revolutionary_guard', 'religious_clergy', 'basij', 'conservative_rural'],
      coalitionWillingness: 0.90,
      suggestedSkills: ['skill_military_tactician', 'skill_intelligence', 'skill_crisis_manager', 'skill_populist'],
    },
  ],
  ng: [
    {
      nameContains: 'All Progressives Congress',
      metricBiases: {
        metric_economy: 0.25, metric_public_order: 0.20, metric_sovereignty: 0.20,
        metric_corruption: -0.15,
      },
      popularBase: ['northern', 'business', 'military_veterans'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_economist', 'skill_crisis_manager', 'skill_trade_expert', 'skill_military_tactician'],
    },
    {
      nameContains: "People's Democratic",
      metricBiases: {
        metric_equality: 0.25, metric_employment: 0.20, metric_health: 0.20,
        metric_education: 0.20,
      },
      popularBase: ['southern', 'christian', 'urban', 'youth'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_social_reformer', 'skill_orator', 'skill_environmental', 'skill_integrity'],
    },
  ],
  mx: [
    {
      nameContains: 'Morena',
      metricBiases: {
        metric_equality: 0.35, metric_corruption: -0.40, metric_health: 0.25,
        metric_sovereignty: 0.25, metric_democracy: 0.15, metric_economy: -0.05,
      },
      popularBase: ['urban_poor', 'indigenous', 'youth', 'labor'],
      coalitionWillingness: 0.80,
      suggestedSkills: ['skill_orator', 'skill_populist', 'skill_social_reformer', 'skill_integrity'],
    },
    {
      nameContains: 'PAN',
      metricBiases: {
        metric_economy: 0.30, metric_democracy: 0.25, metric_liberty: 0.20,
        metric_trade: 0.20, metric_corruption: -0.20,
      },
      popularBase: ['business', 'educated', 'urban_middle_class', 'northern'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_economist', 'skill_legal_mind', 'skill_trade_expert', 'skill_fiscal_hawk'],
    },
  ],
  gh: [
    {
      nameContains: 'National Democratic Congress',
      metricBiases: { metric_equality: 0.30, metric_health: 0.25, metric_economy: 0.20, metric_employment: 0.25, metric_environment: 0.20 },
      popularBase: ['urban', 'youth', 'lower_income', 'volta_region'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_social_reformer', 'skill_environmental', 'skill_orator', 'skill_economist'],
    },
    {
      nameContains: 'New Patriotic Party',
      metricBiases: { metric_economy: 0.35, metric_innovation: 0.25, metric_foreign_relations: 0.20, metric_employment: 0.20, metric_military: 0.10 },
      popularBase: ['business', 'ashanti_region', 'middle_class', 'diaspora'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_economist', 'skill_trade_expert', 'skill_technocrat', 'skill_fiscal_hawk'],
    },
  ],
  jm: [
    {
      nameContains: 'Jamaica Labour Party',
      metricBiases: { metric_economy: 0.35, metric_foreign_relations: 0.25, metric_innovation: 0.20, metric_employment: 0.20 },
      popularBase: ['business', 'rural', 'middle_class', 'tourism_sector'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_economist', 'skill_trade_expert', 'skill_fiscal_hawk', 'skill_diplomat'],
    },
    {
      nameContains: "People's National Party",
      metricBiases: { metric_equality: 0.35, metric_health: 0.30, metric_employment: 0.25, metric_liberty: 0.20, metric_environment: 0.15 },
      popularBase: ['urban', 'youth', 'lower_income', 'labour_unions'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_social_reformer', 'skill_orator', 'skill_environmental', 'skill_legal_mind'],
    },
  ],
  ua: [
    {
      nameContains: 'Servant of the People',
      metricBiases: { metric_sovereignty: 0.40, metric_military: 0.35, metric_foreign_relations: 0.35, metric_economy: 0.20, metric_democracy: 0.25 },
      popularBase: ['urban', 'youth', 'pro_european', 'middle_class'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_crisis_manager', 'skill_diplomat', 'skill_military_tactician', 'skill_media_savvy'],
    },
    {
      nameContains: 'European Solidarity',
      metricBiases: { metric_democracy: 0.35, metric_foreign_relations: 0.40, metric_liberty: 0.30, metric_economy: 0.25, metric_sovereignty: 0.30 },
      popularBase: ['pro_european', 'educated', 'urban', 'diaspora'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_diplomat', 'skill_legal_mind', 'skill_integrity', 'skill_trade_expert'],
    },
  ],
  za: [
    {
      nameContains: 'African National Congress',
      metricBiases: { metric_equality: 0.35, metric_employment: 0.30, metric_health: 0.25, metric_economy: 0.20, metric_foreign_relations: 0.15 },
      popularBase: ['black_african', 'rural', 'labour_unions', 'lower_income'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_social_reformer', 'skill_orator', 'skill_economist', 'skill_environmental'],
    },
    {
      nameContains: 'Democratic Alliance',
      metricBiases: { metric_economy: 0.40, metric_corruption: -0.40, metric_innovation: 0.25, metric_foreign_relations: 0.20, metric_liberty: 0.25 },
      popularBase: ['white', 'coloured', 'urban', 'business', 'middle_class'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_economist', 'skill_integrity', 'skill_legal_mind', 'skill_fiscal_hawk'],
    },
    {
      nameContains: 'Economic Freedom Fighters',
      metricBiases: { metric_equality: 0.45, metric_employment: 0.40, metric_foreign_influence: -0.35, metric_economy: 0.20 },
      popularBase: ['youth', 'black_african', 'lower_income', 'radical_left'],
      coalitionWillingness: 0.30,
      suggestedSkills: ['skill_populist', 'skill_orator', 'skill_social_reformer', 'skill_crisis_manager'],
    },
  ],
  id: [
    {
      nameContains: 'Gerindra',
      metricBiases: { metric_military: 0.30, metric_sovereignty: 0.35, metric_economy: 0.30, metric_public_order: 0.25, metric_foreign_relations: 0.15 },
      popularBase: ['nationalist', 'military_veterans', 'rural', 'middle_class'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_military_tactician', 'skill_crisis_manager', 'skill_populist', 'skill_trade_expert'],
    },
    {
      nameContains: 'PDIP',
      metricBiases: { metric_equality: 0.30, metric_employment: 0.30, metric_economy: 0.25, metric_democracy: 0.25, metric_health: 0.20 },
      popularBase: ['secular_nationalist', 'urban', 'labour_unions', 'lower_income'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_social_reformer', 'skill_orator', 'skill_economist', 'skill_environmental'],
    },
  ],
  sg: [
    {
      nameContains: "People's Action Party",
      metricBiases: { metric_economy: 0.40, metric_innovation: 0.35, metric_foreign_relations: 0.35, metric_public_order: 0.30, metric_infrastructure: 0.30 },
      popularBase: ['business', 'educated', 'middle_class', 'establishment'],
      coalitionWillingness: 0.40,
      suggestedSkills: ['skill_technocrat', 'skill_economist', 'skill_trade_expert', 'skill_fiscal_hawk'],
    },
    {
      nameContains: 'Workers Party',
      metricBiases: { metric_equality: 0.35, metric_liberty: 0.30, metric_health: 0.25, metric_employment: 0.25, metric_democracy: 0.30 },
      popularBase: ['urban', 'youth', 'lower_income', 'educated'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_social_reformer', 'skill_legal_mind', 'skill_integrity', 'skill_orator'],
    },
  ],
  eg: [
    {
      nameContains: 'Nation Future Party',
      metricBiases: { metric_public_order: 0.35, metric_military: 0.30, metric_economy: 0.30, metric_foreign_relations: 0.25, metric_sovereignty: 0.30 },
      popularBase: ['military_aligned', 'establishment', 'rural', 'nationalist'],
      coalitionWillingness: 0.50,
      suggestedSkills: ['skill_military_tactician', 'skill_crisis_manager', 'skill_intelligence', 'skill_media_savvy'],
    },
    {
      nameContains: 'Wafd Party',
      metricBiases: { metric_economy: 0.30, metric_foreign_relations: 0.25, metric_liberty: 0.20, metric_democracy: 0.20 },
      popularBase: ['liberal', 'urban', 'business', 'educated'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_diplomat', 'skill_legal_mind', 'skill_trade_expert', 'skill_economist'],
    },
  ],
  it: [
    {
      nameContains: 'Fratelli',
      metricBiases: { metric_sovereignty: 0.35, metric_public_order: 0.30, metric_economy: 0.25, metric_immigration: -0.30, metric_foreign_relations: -0.15 },
      popularBase: ['nationalist', 'conservative', 'southern', 'small_business'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_military_tactician', 'skill_crisis_manager', 'skill_media_savvy', 'skill_orator'],
    },
    {
      nameContains: 'Lega',
      metricBiases: { metric_sovereignty: 0.35, metric_economy: 0.25, metric_immigration: -0.35, metric_public_order: 0.20 },
      popularBase: ['northern', 'business', 'rural', 'populist'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_populist', 'skill_fiscal_hawk', 'skill_trade_expert', 'skill_orator'],
    },
    {
      nameContains: 'Democratico',
      metricBiases: { metric_equality: 0.35, metric_environment: 0.25, metric_health: 0.25, metric_education: 0.20, metric_immigration: 0.15 },
      popularBase: ['urban', 'educated', 'progressive', 'youth'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_social_reformer', 'skill_diplomat', 'skill_environmental', 'skill_legal_mind'],
    },
    {
      nameContains: 'Movimento',
      metricBiases: { metric_corruption: 0.40, metric_environment: 0.20, metric_equality: 0.20, metric_public_order: 0.15 },
      popularBase: ['youth', 'anti_establishment', 'digital', 'urban'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_integrity', 'skill_technocrat', 'skill_media_savvy', 'skill_populist'],
    },
  ],
  ar: [
    {
      nameContains: 'Peronista',
      metricBiases: { metric_equality: 0.35, metric_employment: 0.30, metric_health: 0.25, metric_education: 0.20, metric_trade: -0.10, metric_foreign_relations: -0.10 },
      popularBase: ['labor', 'urban_poor', 'trade_unions', 'youth'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_populist', 'skill_social_reformer', 'skill_orator', 'skill_crisis_manager'],
    },
    {
      nameContains: 'Libertad',
      metricBiases: { metric_economy: 0.40, metric_trade: 0.30, metric_corruption: 0.25, metric_equality: -0.20, metric_health: -0.15 },
      popularBase: ['youth', 'urban_middle_class', 'libertarian', 'business'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_economist', 'skill_trade_expert', 'skill_media_savvy'],
    },
    {
      nameContains: 'Cambiemos',
      metricBiases: { metric_economy: 0.30, metric_corruption: 0.30, metric_foreign_relations: 0.20, metric_trade: 0.20, metric_equality: -0.10 },
      popularBase: ['middle_class', 'business', 'urban', 'educated'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_diplomat', 'skill_trade_expert', 'skill_technocrat'],
    },
  ],
  cl: [
    {
      nameContains: 'Frente Amplio',
      metricBiases: { metric_equality: 0.40, metric_environment: 0.30, metric_health: 0.25, metric_education: 0.25, metric_trade: -0.10 },
      popularBase: ['youth', 'students', 'progressive', 'urban'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_social_reformer', 'skill_environmental', 'skill_orator', 'skill_legal_mind'],
    },
    {
      nameContains: 'Renovacion',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.30, metric_sovereignty: 0.20, metric_public_order: 0.20, metric_equality: -0.15 },
      popularBase: ['business', 'middle_class', 'conservative', 'suburban'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_trade_expert', 'skill_economist', 'skill_crisis_manager'],
    },
  ],
  co: [
    {
      nameContains: 'Pacto',
      metricBiases: { metric_equality: 0.35, metric_environment: 0.30, metric_health: 0.25, metric_corruption: 0.25, metric_military: -0.15 },
      popularBase: ['youth', 'indigenous', 'rural_poor', 'urban_progressive'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_social_reformer', 'skill_environmental', 'skill_orator', 'skill_diplomat'],
    },
    {
      nameContains: 'Centro',
      metricBiases: { metric_economy: 0.30, metric_public_order: 0.30, metric_military: 0.25, metric_trade: 0.20, metric_equality: -0.15 },
      popularBase: ['business', 'military_aligned', 'conservative', 'regional_elites'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_military_tactician', 'skill_fiscal_hawk', 'skill_crisis_manager', 'skill_trade_expert'],
    },
  ],
  cu: [
    {
      nameContains: 'Comunista',
      metricBiases: { metric_sovereignty: 0.45, metric_equality: 0.30, metric_health: 0.25, metric_education: 0.25, metric_trade: -0.20, metric_liberty: -0.30 },
      popularBase: ['party_cadres', 'military', 'state_workers', 'rural'],
      coalitionWillingness: 0.95,
      suggestedSkills: ['skill_crisis_manager', 'skill_military_tactician', 'skill_intelligence', 'skill_orator'],
    },
  ],
  kp: [
    {
      nameContains: 'Rodong',
      metricBiases: { metric_sovereignty: 0.50, metric_military: 0.45, metric_public_order: 0.35, metric_trade: -0.35, metric_liberty: -0.50 },
      popularBase: ['military', 'party_elite', 'state_workers'],
      coalitionWillingness: 0.95,
      suggestedSkills: ['skill_military_tactician', 'skill_intelligence', 'skill_crisis_manager', 'skill_orator'],
    },
  ],
  vn: [
    {
      nameContains: 'Communist',
      metricBiases: { metric_sovereignty: 0.40, metric_economy: 0.30, metric_public_order: 0.30, metric_trade: 0.20, metric_liberty: -0.25 },
      popularBase: ['party_cadres', 'military', 'state_enterprise', 'rural'],
      coalitionWillingness: 0.95,
      suggestedSkills: ['skill_technocrat', 'skill_economist', 'skill_trade_expert', 'skill_intelligence'],
    },
  ],
  ve: [
    {
      nameContains: 'PSUV',
      metricBiases: { metric_sovereignty: 0.40, metric_equality: 0.30, metric_military: 0.25, metric_trade: -0.20, metric_corruption: -0.30 },
      popularBase: ['rural', 'urban_poor', 'military', 'state_workers'],
      coalitionWillingness: 0.80,
      suggestedSkills: ['skill_orator', 'skill_populist', 'skill_military_tactician', 'skill_crisis_manager'],
    },
    {
      nameContains: 'Plataforma',
      metricBiases: { metric_liberty: 0.40, metric_corruption: 0.40, metric_democracy: 0.35, metric_trade: 0.20 },
      popularBase: ['urban_middle_class', 'youth', 'diaspora', 'educated'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_legal_mind', 'skill_diplomat', 'skill_integrity', 'skill_media_savvy'],
    },
  ],
  gr: [
    {
      nameContains: 'Nea Dimokratia',
      metricBiases: { metric_economy: 0.30, metric_sovereignty: 0.25, metric_foreign_relations: 0.20, metric_public_order: 0.20, metric_equality: -0.10 },
      popularBase: ['business', 'conservative', 'middle_class', 'suburban'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_diplomat', 'skill_crisis_manager', 'skill_economist'],
    },
    {
      nameContains: 'SYRIZA',
      metricBiases: { metric_equality: 0.40, metric_health: 0.30, metric_employment: 0.25, metric_sovereignty: 0.20, metric_economy: -0.10 },
      popularBase: ['labor', 'youth', 'urban_progressive', 'public_sector'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_social_reformer', 'skill_legal_mind', 'skill_diplomat', 'skill_populist'],
    },
    {
      nameContains: 'PASOK',
      metricBiases: { metric_equality: 0.30, metric_health: 0.25, metric_education: 0.25, metric_foreign_relations: 0.20 },
      popularBase: ['center_left', 'labor', 'public_sector', 'educated'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_social_reformer', 'skill_diplomat', 'skill_crisis_manager', 'skill_legal_mind'],
    },
  ],
  hu: [
    {
      nameContains: 'Fidesz',
      metricBiases: { metric_sovereignty: 0.40, metric_public_order: 0.30, metric_immigration: -0.35, metric_economy: 0.25, metric_liberty: -0.20 },
      popularBase: ['rural', 'religious', 'conservative', 'nationalist'],
      coalitionWillingness: 0.80,
      suggestedSkills: ['skill_orator', 'skill_media_savvy', 'skill_crisis_manager', 'skill_populist'],
    },
    {
      nameContains: 'Tisza',
      metricBiases: { metric_corruption: 0.40, metric_liberty: 0.35, metric_foreign_relations: 0.30, metric_equality: 0.20 },
      popularBase: ['urban', 'educated', 'youth', 'pro_european'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_integrity', 'skill_diplomat', 'skill_legal_mind', 'skill_media_savvy'],
    },
  ],
  pl: [
    {
      nameContains: 'Platforma',
      metricBiases: { metric_foreign_relations: 0.35, metric_trade: 0.30, metric_economy: 0.25, metric_liberty: 0.20, metric_sovereignty: -0.10 },
      popularBase: ['urban', 'educated', 'business', 'pro_european'],
      coalitionWillingness: 0.75,
      suggestedSkills: ['skill_diplomat', 'skill_trade_expert', 'skill_economist', 'skill_legal_mind'],
    },
    {
      nameContains: 'Prawo',
      metricBiases: { metric_sovereignty: 0.40, metric_public_order: 0.30, metric_military: 0.25, metric_immigration: -0.25, metric_foreign_relations: -0.15 },
      popularBase: ['rural', 'religious', 'conservative', 'nationalist'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_military_tactician', 'skill_crisis_manager', 'skill_populist', 'skill_orator'],
    },
  ],
  cz: [
    {
      nameContains: 'ODS',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.25, metric_sovereignty: 0.20, metric_corruption: -0.15 },
      popularBase: ['business', 'middle_class', 'conservative', 'urban'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_trade_expert', 'skill_economist', 'skill_diplomat'],
    },
    {
      nameContains: 'ANO',
      metricBiases: { metric_economy: 0.30, metric_corruption: -0.10, metric_public_order: 0.25, metric_sovereignty: 0.20 },
      popularBase: ['business', 'rural', 'populist', 'anti_establishment'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_technocrat', 'skill_crisis_manager', 'skill_media_savvy', 'skill_trade_expert'],
    },
  ],
  se: [
    {
      nameContains: 'Socialdemokraterna',
      metricBiases: { metric_equality: 0.40, metric_health: 0.30, metric_education: 0.30, metric_employment: 0.25, metric_environment: 0.20 },
      popularBase: ['labor', 'public_sector', 'urban', 'trade_unions'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_social_reformer', 'skill_crisis_manager', 'skill_diplomat', 'skill_legal_mind'],
    },
    {
      nameContains: 'Sverigedemokraterna',
      metricBiases: { metric_sovereignty: 0.40, metric_public_order: 0.35, metric_immigration: -0.40, metric_equality: 0.20 },
      popularBase: ['working_class', 'rural', 'nationalist', 'anti_immigration'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_populist', 'skill_orator', 'skill_crisis_manager', 'skill_military_tactician'],
    },
    {
      nameContains: 'Moderaterna',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.25, metric_public_order: 0.20, metric_equality: -0.10 },
      popularBase: ['business', 'middle_class', 'suburban', 'educated'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_economist', 'skill_trade_expert', 'skill_diplomat'],
    },
  ],
  no: [
    {
      nameContains: 'Arbeiderpartiet',
      metricBiases: { metric_equality: 0.35, metric_health: 0.30, metric_employment: 0.30, metric_environment: 0.20, metric_education: 0.25 },
      popularBase: ['labor', 'trade_unions', 'coastal', 'public_sector'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_social_reformer', 'skill_crisis_manager', 'skill_diplomat', 'skill_environmental'],
    },
    {
      nameContains: 'Hoyre',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.25, metric_education: 0.20, metric_health: 0.15 },
      popularBase: ['business', 'middle_class', 'urban', 'educated'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_economist', 'skill_trade_expert', 'skill_technocrat'],
    },
  ],
  nl: [
    {
      nameContains: 'PVV',
      metricBiases: { metric_sovereignty: 0.40, metric_immigration: -0.40, metric_public_order: 0.30, metric_equality: -0.15 },
      popularBase: ['working_class', 'anti_immigration', 'rural', 'nationalist'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_populist', 'skill_orator', 'skill_media_savvy', 'skill_crisis_manager'],
    },
    {
      nameContains: 'VVD',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.30, metric_liberty: 0.20, metric_immigration: -0.15 },
      popularBase: ['business', 'middle_class', 'urban', 'educated'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_trade_expert', 'skill_economist', 'skill_diplomat'],
    },
    {
      nameContains: 'GroenLinks',
      metricBiases: { metric_environment: 0.40, metric_equality: 0.35, metric_health: 0.25, metric_immigration: 0.20, metric_trade: 0.10 },
      popularBase: ['youth', 'urban', 'educated', 'progressive'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_environmental', 'skill_social_reformer', 'skill_diplomat', 'skill_legal_mind'],
    },
  ],
  pt: [
    {
      nameContains: 'Socialista',
      metricBiases: { metric_equality: 0.35, metric_health: 0.30, metric_education: 0.25, metric_employment: 0.20, metric_foreign_relations: 0.15 },
      popularBase: ['labor', 'public_sector', 'urban', 'youth'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_social_reformer', 'skill_diplomat', 'skill_crisis_manager', 'skill_legal_mind'],
    },
    {
      nameContains: 'Social Democrata',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.25, metric_foreign_relations: 0.20, metric_public_order: 0.15 },
      popularBase: ['business', 'middle_class', 'conservative', 'suburban'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_economist', 'skill_diplomat', 'skill_trade_expert'],
    },
  ],
  es: [
    {
      nameContains: 'Partido Socialista',
      metricBiases: { metric_equality: 0.35, metric_health: 0.30, metric_education: 0.25, metric_environment: 0.20, metric_employment: 0.20 },
      popularBase: ['labor', 'urban', 'youth', 'progressive', 'regional_minorities'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_social_reformer', 'skill_diplomat', 'skill_crisis_manager', 'skill_environmental'],
    },
    {
      nameContains: 'Popular',
      metricBiases: { metric_economy: 0.30, metric_public_order: 0.25, metric_sovereignty: 0.25, metric_trade: 0.20, metric_equality: -0.10 },
      popularBase: ['business', 'conservative', 'religious', 'middle_class'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_crisis_manager', 'skill_trade_expert', 'skill_diplomat'],
    },
    {
      nameContains: 'Vox',
      metricBiases: { metric_sovereignty: 0.45, metric_immigration: -0.40, metric_public_order: 0.35, metric_military: 0.25, metric_equality: -0.20 },
      popularBase: ['nationalist', 'conservative', 'rural', 'anti_immigration'],
      coalitionWillingness: 0.50,
      suggestedSkills: ['skill_military_tactician', 'skill_orator', 'skill_populist', 'skill_crisis_manager'],
    },
  ],
  ch: [
    {
      nameContains: 'SVP',
      metricBiases: { metric_sovereignty: 0.45, metric_immigration: -0.40, metric_economy: 0.25, metric_trade: -0.10 },
      popularBase: ['rural', 'conservative', 'farmers', 'nationalist'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_populist', 'skill_fiscal_hawk', 'skill_crisis_manager', 'skill_orator'],
    },
    {
      nameContains: 'SP',
      metricBiases: { metric_equality: 0.40, metric_health: 0.30, metric_environment: 0.25, metric_employment: 0.25, metric_trade: -0.10 },
      popularBase: ['labor', 'urban', 'youth', 'trade_unions'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_social_reformer', 'skill_environmental', 'skill_diplomat', 'skill_legal_mind'],
    },
    {
      nameContains: 'FDP',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.35, metric_liberty: 0.25, metric_foreign_relations: 0.20 },
      popularBase: ['business', 'educated', 'urban', 'international'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_trade_expert', 'skill_economist', 'skill_diplomat', 'skill_technocrat'],
    },
  ],
  nz: [
    {
      nameContains: 'Labour',
      metricBiases: { metric_equality: 0.35, metric_health: 0.30, metric_housing: 0.25, metric_environment: 0.25, metric_education: 0.20 },
      popularBase: ['labor', 'urban', 'youth', 'maori', 'progressive'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_social_reformer', 'skill_environmental', 'skill_diplomat', 'skill_crisis_manager'],
    },
    {
      nameContains: 'National',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.30, metric_public_order: 0.20, metric_equality: -0.10 },
      popularBase: ['business', 'rural', 'suburban', 'conservative'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_trade_expert', 'skill_economist', 'skill_crisis_manager'],
    },
    {
      nameContains: 'ACT',
      metricBiases: { metric_liberty: 0.40, metric_economy: 0.35, metric_trade: 0.30, metric_equality: -0.20 },
      popularBase: ['libertarian', 'business', 'urban_professional', 'youth'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_fiscal_hawk', 'skill_economist', 'skill_legal_mind', 'skill_trade_expert'],
    },
  ],
  my: [
    {
      nameContains: 'Pakatan',
      metricBiases: { metric_corruption: 0.40, metric_equality: 0.30, metric_economy: 0.25, metric_liberty: 0.25, metric_trade: 0.20 },
      popularBase: ['urban', 'chinese_malaysian', 'indian_malaysian', 'educated'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_integrity', 'skill_diplomat', 'skill_trade_expert', 'skill_legal_mind'],
    },
    {
      nameContains: 'Perikatan',
      metricBiases: { metric_sovereignty: 0.35, metric_public_order: 0.30, metric_economy: 0.25, metric_immigration: -0.20 },
      popularBase: ['malay', 'rural', 'religious', 'conservative'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_crisis_manager', 'skill_military_tactician', 'skill_populist', 'skill_fiscal_hawk'],
    },
  ],
  ph: [
    {
      nameContains: 'Lakas',
      metricBiases: { metric_economy: 0.30, metric_public_order: 0.30, metric_trade: 0.25, metric_foreign_relations: 0.20 },
      popularBase: ['business', 'regional_elites', 'conservative', 'military_aligned'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_trade_expert', 'skill_diplomat', 'skill_crisis_manager', 'skill_fiscal_hawk'],
    },
    {
      nameContains: 'Liberal',
      metricBiases: { metric_liberty: 0.35, metric_corruption: 0.30, metric_equality: 0.25, metric_foreign_relations: 0.20 },
      popularBase: ['urban', 'educated', 'youth', 'progressive'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_legal_mind', 'skill_diplomat', 'skill_integrity', 'skill_social_reformer'],
    },
  ],
  pk: [
    {
      nameContains: 'Nawaz',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.30, metric_foreign_relations: 0.25, metric_public_order: 0.20 },
      popularBase: ['business', 'punjabi', 'conservative', 'urban_middle_class'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_trade_expert', 'skill_diplomat', 'skill_economist', 'skill_fiscal_hawk'],
    },
    {
      nameContains: 'Tehreek',
      metricBiases: { metric_corruption: 0.40, metric_sovereignty: 0.35, metric_economy: 0.25, metric_foreign_relations: -0.20 },
      popularBase: ['youth', 'urban_middle_class', 'educated', 'anti_establishment'],
      coalitionWillingness: 0.50,
      suggestedSkills: ['skill_orator', 'skill_integrity', 'skill_populist', 'skill_media_savvy'],
    },
    {
      nameContains: 'Bhutto',
      metricBiases: { metric_equality: 0.35, metric_employment: 0.30, metric_health: 0.20, metric_infrastructure: 0.25 },
      popularBase: ['sindhi', 'rural_poor', 'labor', 'feudal_networks'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_populist', 'skill_crisis_manager', 'skill_social_reformer', 'skill_diplomat'],
    },
  ],
  bd: [
    {
      nameContains: 'Awami',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.25, metric_public_order: 0.25, metric_sovereignty: 0.20, metric_liberty: -0.20 },
      popularBase: ['secular', 'urban', 'business', 'liberation_war_veterans'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_trade_expert', 'skill_economist', 'skill_crisis_manager', 'skill_diplomat'],
    },
    {
      nameContains: 'Nationalist',
      metricBiases: { metric_sovereignty: 0.35, metric_trade: 0.25, metric_economy: 0.20, metric_equality: -0.10 },
      popularBase: ['conservative', 'business', 'rural', 'religious'],
      coalitionWillingness: 0.55,
      suggestedSkills: ['skill_crisis_manager', 'skill_fiscal_hawk', 'skill_trade_expert', 'skill_military_tactician'],
    },
  ],
  ke: [
    {
      nameContains: 'Kenya Kwanza',
      metricBiases: { metric_economy: 0.30, metric_trade: 0.25, metric_infrastructure: 0.20, metric_corruption: -0.10 },
      popularBase: ['kikuyu', 'kalenjin', 'rural', 'business'],
      coalitionWillingness: 0.70,
      suggestedSkills: ['skill_trade_expert', 'skill_economist', 'skill_diplomat', 'skill_fiscal_hawk'],
    },
    {
      nameContains: 'Azimio',
      metricBiases: { metric_equality: 0.35, metric_health: 0.25, metric_employment: 0.25, metric_foreign_relations: 0.20 },
      popularBase: ['luo', 'coastal', 'urban_poor', 'progressive'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_social_reformer', 'skill_populist', 'skill_diplomat', 'skill_crisis_manager'],
    },
  ],
  th: [
    {
      nameContains: 'Pheu Thai',
      metricBiases: { metric_economy: 0.35, metric_equality: 0.25, metric_housing: 0.25, metric_employment: 0.20 },
      popularBase: ['rural', 'northern', 'labor', 'urban_poor'],
      coalitionWillingness: 0.65,
      suggestedSkills: ['skill_populist', 'skill_economist', 'skill_social_reformer', 'skill_trade_expert'],
    },
    {
      nameContains: 'People',
      metricBiases: { metric_corruption: 0.40, metric_liberty: 0.35, metric_equality: 0.30, metric_environment: 0.20 },
      popularBase: ['youth', 'urban', 'educated', 'progressive'],
      coalitionWillingness: 0.60,
      suggestedSkills: ['skill_integrity', 'skill_legal_mind', 'skill_social_reformer', 'skill_media_savvy'],
    },
  ],
  qa: [
    {
      nameContains: 'Al-Thani',
      metricBiases: { metric_sovereignty: 0.45, metric_economy: 0.35, metric_trade: 0.30, metric_military: 0.20, metric_liberty: -0.25 },
      popularBase: ['ruling_family', 'state_employees', 'military'],
      coalitionWillingness: 0.90,
      suggestedSkills: ['skill_diplomat', 'skill_trade_expert', 'skill_intelligence', 'skill_crisis_manager'],
    },
  ],
};

async function run(): Promise<void> {
  console.log(`Processing party profiles — ${WRITE ? 'WRITING' : 'DRY RUN'}`);

  const countryIds = Object.keys(PARTY_DATA);
  let updated = 0;
  let skipped = 0;
  let totalDocs = 0;

  for (const countryId of countryIds) {
    const partiesSnap = await db
      .collection('countries')
      .doc(countryId)
      .collection('parties')
      .get();

    if (partiesSnap.empty) {
      console.warn(`  ${countryId}: no parties subcollection — skipping`);
      continue;
    }

    totalDocs += partiesSnap.size;
    const countryProfiles = PARTY_DATA[countryId];

    for (const doc of partiesSnap.docs) {
      const partyName: string = doc.data().name ?? '';

      const profile = countryProfiles.find(p =>
        partyName.toLowerCase().includes(p.nameContains.toLowerCase()),
      );
      if (!profile) { skipped++; continue; }

      const { nameContains: _, ...updates } = profile;
      console.log(`  ${countryId}/${partyName}: ${Object.keys(updates.metricBiases).length} biases, ${updates.suggestedSkills.length} skills`);

      if (WRITE) {
        await doc.ref.update(updates);
        updated++;
      } else {
        updated++;
      }
    }
  }

  console.log(`\nScanned ${totalDocs} party documents across ${countryIds.length} countries`);
  console.log(`Done — ${WRITE ? `updated ${updated}` : `would update ${updated} (dry run)`}, skipped ${skipped}`);
}

run().catch(err => { console.error(err); process.exit(1); });
