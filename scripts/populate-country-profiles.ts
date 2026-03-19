/*
 * Populate canonical countries.geopolitical and countries.gameplay fields from
 * the existing top-level Firestore countries collection.
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { GEO_TAGS, type GeopoliticalTag } from '../functions/src/data/schemas/geopoliticalTags';
import { METRIC_IDS } from '../functions/src/data/schemas/metricIds';
import { BUNDLE_IDS } from '../functions/src/data/schemas/bundleIds';
import type {
  BundleId,
  CountryGameplayProfile,
  CountryRelationship,
  GeopoliticalProfile,
  GovernmentCategory,
  MetricId,
} from '../functions/src/types';

type AllianceMembership = { name: string; role?: string };

type SourceCountry = {
  id: string;
  name?: string;
  code?: string;
  region?: string;
  governmentType?: string;
  economicSystem?: string;
  alliances?: {
    economic?: AllianceMembership[];
    military?: AllianceMembership[];
    trade?: AllianceMembership[];
  };
  borders?: string[];
  maritimeBorders?: string[];
  profile?: {
    tags?: string[];
    geography?: string;
    economicScale?: string;
    incomeLevel?: string;
    vulnerabilities?: string[];
    strengths?: string[];
  };
  economy?: {
    primary_export?: string;
    primary_import?: string;
    trade_dependencies?: string[];
    system?: string;
    gdp_per_capita?: number;
  };
  military?: {
    strength?: number;
    posture?: string;
    nuclearCapabilities?: boolean;
    navyPower?: number;
    cyberCapability?: number;
  };
  diplomacy?: {
    allies?: string[];
    rivals?: string[];
    relationship?: number;
    alignment?: string;
  };
};

const serviceAccountPath = path.join(process.cwd(), '../serviceAccountKey.json');
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();
const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');

const FIVE_EYES = new Set(['us', 'gb', 'ca', 'au', 'nz']);
const QUAD = new Set(['us', 'jp', 'in', 'au']);
const AUKUS = new Set(['us', 'gb', 'au']);
const ASEAN = new Set(['id', 'my', 'ph', 'sg', 'th', 'vn']);
const EU = new Set(['at', 'be', 'cz', 'de', 'es', 'fr', 'gr', 'hu', 'ie', 'it', 'nl', 'pl', 'pt', 'ro', 'se']);
const G7 = new Set(['us', 'gb', 'ca', 'fr', 'de', 'it', 'jp']);
const G20 = new Set(['us', 'ar', 'au', 'br', 'ca', 'cn', 'fr', 'de', 'in', 'id', 'it', 'jp', 'kr', 'mx', 'ru', 'sa', 'za', 'tr', 'gb']);
const BRICS = new Set(['br', 'ru', 'in', 'cn', 'za']);
const OPEC = new Set(['ae', 'dz', 'iq', 'ir', 'qa', 'sa', 've']);
const OPEC_PLUS = new Set(['ae', 'dz', 'iq', 'ir', 'qa', 'ru', 'sa', 've']);
const CSTO = new Set(['ru']);
const SCO = new Set(['cn', 'in', 'pk', 'ru']);
const AFRICAN_UNION = new Set(['cm', 'dz', 'eg', 'et', 'gh', 'ke', 'ma', 'ng', 'sn', 'tn', 'tz', 'ug', 'za']);
const EU_CANDIDATES = new Set(['tr', 'ua']);
const RELIGIOUS_STATE = new Set(['ae', 'ir', 'qa', 'sa']);
const SANCTIONED = new Set(['cu', 'ir', 'kp', 'ru', 've']);
const CONFLICT_ZONE = new Set(['et', 'iq', 'kp', 'pk', 'ua']);
const FAILED_STATE_RISK = new Set(['ht']);
const COASTAL_OVERRIDES = new Set(['au', 'cn', 'gb', 'in', 'ru']);
const CURATED_TREATY_NAMES = new Set(['ANZUS', 'AUKUS', 'CSTO', 'GCC', 'NATO', 'QUAD', 'SCO', 'US-JAPAN ALLIANCE', 'US-ROK ALLIANCE']);
const PAIR_TREATY_OVERRIDES: Record<string, string> = {
  'au:gb': 'AUKUS',
  'au:us': 'ANZUS',
  'in:us': 'QUAD',
  'jp:us': 'US-JAPAN ALLIANCE',
  'kr:us': 'US-ROK ALLIANCE',
};
const POWER_TAG_OVERRIDES: Record<string, GeopoliticalTag> = {
  ar: GEO_TAGS.MIDDLE_POWER,
  au: GEO_TAGS.MIDDLE_POWER,
  ca: GEO_TAGS.MIDDLE_POWER,
  cu: GEO_TAGS.SMALL_STATE,
  in: GEO_TAGS.REGIONAL_POWER,
  kr: GEO_TAGS.MIDDLE_POWER,
};
const HARD_ADVERSARIES: Partial<Record<string, Set<string>>> = {
  us: new Set(['ir', 'kp', 'ru']),
  gb: new Set(['ir', 'ru']),
  de: new Set(['ru']),
  fr: new Set(['ir', 'ru']),
  jp: new Set(['kp']),
  kr: new Set(['kp']),
  sa: new Set(['ir']),
  il: new Set(['ir']),
  ua: new Set(['ru']),
};
const ACTIVE_CONFLICTS = new Set(['ru:ua', 'ua:ru', 'kp:kr', 'kr:kp']);

const GOVERNMENT_CATEGORY_OVERRIDES: Partial<Record<string, GovernmentCategory>> = {
  ae: 'absolute_monarchy',
  ar: 'liberal_democracy',
  bb: 'constitutional_monarchy',
  be: 'constitutional_monarchy',
  bs: 'constitutional_monarchy',
  bd: 'hybrid_regime',
  br: 'liberal_democracy',
  ca: 'constitutional_monarchy',
  ch: 'liberal_democracy',
  cl: 'liberal_democracy',
  cm: 'authoritarian',
  cn: 'authoritarian',
  co: 'liberal_democracy',
  cr: 'liberal_democracy',
  cu: 'authoritarian',
  do: 'liberal_democracy',
  dz: 'authoritarian',
  ec: 'liberal_democracy',
  eg: 'authoritarian',
  et: 'authoritarian',
  fj: 'liberal_democracy',
  gb: 'constitutional_monarchy',
  gh: 'liberal_democracy',
  hu: 'illiberal_democracy',
  id: 'liberal_democracy',
  in: 'illiberal_democracy',
  il: 'liberal_democracy',
  ir: 'theocracy',
  iq: 'hybrid_regime',
  jm: 'constitutional_monarchy',
  jp: 'constitutional_monarchy',
  kr: 'liberal_democracy',
  kp: 'totalitarian',
  ma: 'constitutional_monarchy',
  mx: 'liberal_democracy',
  my: 'constitutional_monarchy',
  ng: 'hybrid_regime',
  nl: 'constitutional_monarchy',
  no: 'constitutional_monarchy',
  nz: 'constitutional_monarchy',
  pa: 'liberal_democracy',
  ph: 'illiberal_democracy',
  pk: 'hybrid_regime',
  qa: 'absolute_monarchy',
  ru: 'authoritarian',
  sa: 'absolute_monarchy',
  se: 'constitutional_monarchy',
  sg: 'illiberal_democracy',
  tt: 'liberal_democracy',
  th: 'constitutional_monarchy',
  tn: 'hybrid_regime',
  tr: 'illiberal_democracy',
  tz: 'hybrid_regime',
  ua: 'hybrid_regime',
  ug: 'authoritarian',
  uy: 'liberal_democracy',
  ve: 'authoritarian',
  vn: 'authoritarian',
  za: 'liberal_democracy',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function asSet(values: string[] | undefined): Set<string> {
  return new Set((values ?? []).map((value) => value.toLowerCase()));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeAllianceName(value: string): string {
  return value.trim().toUpperCase();
}

function pairKey(left: string, right: string): string {
  return [left, right].sort().join(':');
}

function getAllianceNames(country: SourceCountry): Set<string> {
  const result = new Set<string>();
  const groups = [country.alliances?.economic, country.alliances?.military, country.alliances?.trade];
  for (const group of groups) {
    for (const entry of group ?? []) {
      if (entry?.name) result.add(normalizeAllianceName(entry.name));
    }
  }
  return result;
}

function inferGovernmentCategory(country: SourceCountry): GovernmentCategory {
  const override = GOVERNMENT_CATEGORY_OVERRIDES[country.id];
  if (override) return override;

  const governmentType = (country.governmentType ?? '').toLowerCase();
  const allianceNames = getAllianceNames(country);
  const tags = new Set((country.profile?.tags ?? []).map((tag) => tag.toLowerCase()));

  if (governmentType === 'presidential' || governmentType === 'parliamentary') {
    return 'liberal_democracy';
  }

  if (EU.has(country.id) || G7.has(country.id) || allianceNames.has('NATO') || tags.has('anglosphere')) {
    return 'liberal_democracy';
  }

  if (RELIGIOUS_STATE.has(country.id)) {
    return 'absolute_monarchy';
  }

  if ((country.diplomacy?.alignment ?? '').toLowerCase() === 'competing') {
    return 'authoritarian';
  }

  return 'hybrid_regime';
}

function inferPowerTag(country: SourceCountry): GeopoliticalTag {
  const override = POWER_TAG_OVERRIDES[country.id];
  if (override) return override;

  const strength = country.military?.strength ?? 50;
  const scale = (country.profile?.economicScale ?? '').toLowerCase();
  if (country.id === 'us') return GEO_TAGS.SUPERPOWER;
  if (((country.profile?.tags ?? []).includes('permanent_un_sc') && scale === 'major') || (strength >= 80 && ['major', 'large'].includes(scale))) {
    return GEO_TAGS.GREAT_POWER;
  }
  if (strength >= 65 || G20.has(country.id)) return GEO_TAGS.REGIONAL_POWER;
  if (strength >= 50 || scale === 'medium' || scale === 'large') return GEO_TAGS.MIDDLE_POWER;
  return GEO_TAGS.SMALL_STATE;
}

function inferGeopoliticalTags(country: SourceCountry): GeopoliticalTag[] {
  const tags = new Set<GeopoliticalTag>();
  const rawTags = new Set((country.profile?.tags ?? []).map((tag) => tag.toLowerCase()));
  const strengths = new Set((country.profile?.strengths ?? []).map((value) => value.toLowerCase()));
  const primaryExport = (country.economy?.primary_export ?? '').toLowerCase();
  const region = (country.region ?? '').toLowerCase();
  const neighbors = unique([...(country.borders ?? []), ...(country.maritimeBorders ?? [])]);
  const economicSystem = (country.economicSystem ?? country.economy?.system ?? '').toLowerCase();
  const geography = (country.profile?.geography ?? '').toLowerCase();
  const isLandlocked = rawTags.has('landlocked') || geography === 'landlocked';
  const isIslandNation = rawTags.has('island_nation') || rawTags.has('archipelago') || geography === 'island' || geography === 'archipelago' || ((country.borders?.length ?? 0) === 0 && (country.maritimeBorders?.length ?? 0) > 0);
  const hasCoast = !isLandlocked && (isIslandNation || (country.maritimeBorders?.length ?? 0) > 0 || geography === 'coastal' || COASTAL_OVERRIDES.has(country.id));

  tags.add(inferPowerTag(country));

  if (country.military?.nuclearCapabilities) tags.add(GEO_TAGS.NUCLEAR_STATE);
  if ((country.military?.cyberCapability ?? 50) >= 50 && (strengths.has('technology') || strengths.has('innovation') || rawTags.has('tech_hub') || (country.military?.strength ?? 0) >= 70)) {
    tags.add(GEO_TAGS.CYBER_POWER);
  }
  if (hasCoast || region === 'caribbean' || region === 'oceania') {
    tags.add(GEO_TAGS.NAVAL_POWER);
  }
  if (rawTags.has('permanent_un_sc') || strengths.has('technology') || strengths.has('innovation') || G7.has(country.id) || country.id === 'cn') {
    tags.add(GEO_TAGS.SPACE_CAPABLE);
  }
  if ((country.military?.strength ?? 0) >= 75 && (country.military?.nuclearCapabilities || G7.has(country.id) || BRICS.has(country.id))) {
    tags.add(GEO_TAGS.MAJOR_ARMS_EXPORTER);
  }

  if (G7.has(country.id)) tags.add(GEO_TAGS.G7);
  if (G20.has(country.id)) tags.add(GEO_TAGS.G20);
  if (BRICS.has(country.id) || rawTags.has('bric') || rawTags.has('brics')) tags.add(GEO_TAGS.BRICS);
  if (OPEC.has(country.id)) tags.add(GEO_TAGS.OPEC);
  if (OPEC_PLUS.has(country.id)) tags.add(GEO_TAGS.OPEC_PLUS);
  if ((country.profile?.incomeLevel ?? '').toLowerCase() === 'high') {
    tags.add(GEO_TAGS.DEVELOPED_ECONOMY);
  }
  if (['upper_middle', 'lower_middle'].includes((country.profile?.incomeLevel ?? '').toLowerCase()) || ['emerging market economy', 'developing mixed economy', 'developing market economy', 'state capitalism', 'socialist market economy'].includes(economicSystem)) {
    tags.add(GEO_TAGS.EMERGING_MARKET);
  }
  if (primaryExport.includes('oil') || rawTags.has('oil') || rawTags.has('oil_dependent')) tags.add(GEO_TAGS.OIL_EXPORTER);
  if (primaryExport.includes('gas')) tags.add(GEO_TAGS.GAS_EXPORTER);
  if (strengths.has('financial_services') || rawTags.has('financial_services')) tags.add(GEO_TAGS.FINANCIAL_CENTER);
  if (strengths.has('manufacturing') || primaryExport.includes('manufacturing') || primaryExport.includes('automobile') || primaryExport.includes('technology')) tags.add(GEO_TAGS.MANUFACTURING_HUB);

  if (EU.has(country.id) || rawTags.has('eu')) tags.add(GEO_TAGS.EU);
  if (EU_CANDIDATES.has(country.id)) tags.add(GEO_TAGS.EU_CANDIDATE);
  if (ASEAN.has(country.id) || rawTags.has('asean')) tags.add(GEO_TAGS.ASEAN);
  if (AFRICAN_UNION.has(country.id) || region === 'africa') tags.add(GEO_TAGS.AFRICAN_UNION);
  if (country.id === 'ru') tags.add(GEO_TAGS.CIS);
  if (SCO.has(country.id)) tags.add(GEO_TAGS.SCO);
  if (QUAD.has(country.id)) tags.add(GEO_TAGS.QUAD);
  if (AUKUS.has(country.id)) tags.add(GEO_TAGS.AUKUS);
  if (FIVE_EYES.has(country.id) || rawTags.has('anglosphere')) tags.add(GEO_TAGS.FIVE_EYES);
  if (CSTO.has(country.id)) tags.add(GEO_TAGS.CSTO);
  if (getAllianceNames(country).has('NATO') || rawTags.has('nato')) tags.add(GEO_TAGS.NATO);

  if (isIslandNation) tags.add(GEO_TAGS.ISLAND_NATION);
  if (isLandlocked) tags.add(GEO_TAGS.LANDLOCKED);
  if (hasCoast) tags.add(GEO_TAGS.COASTAL);
  if (rawTags.has('arctic')) tags.add(GEO_TAGS.ARCTIC_STATE);
  if (rawTags.has('archipelago')) tags.add(GEO_TAGS.ARCHIPELAGO);
  if (SANCTIONED.has(country.id) || economicSystem.includes('sanctioned')) tags.add(GEO_TAGS.SANCTIONED);
  if (CONFLICT_ZONE.has(country.id)) tags.add(GEO_TAGS.CONFLICT_ZONE);
  if (FAILED_STATE_RISK.has(country.id)) tags.add(GEO_TAGS.FAILED_STATE_RISK);
  if (RELIGIOUS_STATE.has(country.id)) tags.add(GEO_TAGS.RELIGIOUS_STATE);
  if (!RELIGIOUS_STATE.has(country.id)) tags.add(GEO_TAGS.SECULAR_STATE);
  if (country.id === 'iq') tags.add(GEO_TAGS.POST_CONFLICT);

  return [...tags];
}

function sharedAllianceTreaty(source: SourceCountry, target: SourceCountry): string | undefined {
  const override = PAIR_TREATY_OVERRIDES[pairKey(source.id, target.id)];
  if (override) return override;

  const orderedGroups = [source.alliances?.military ?? [], source.alliances?.trade ?? [], source.alliances?.economic ?? []];
  const targetNames = getAllianceNames(target);
  for (const group of orderedGroups) {
    for (const entry of group) {
      if (!entry?.name) continue;
      const name = normalizeAllianceName(entry.name);
      if (targetNames.has(name) && CURATED_TREATY_NAMES.has(name)) return name;
    }
  }
  return undefined;
}

function relationStrength(type: CountryRelationship['type']): number {
  switch (type) {
    case 'formal_ally': return 75;
    case 'strategic_partner': return 55;
    case 'neutral': return 10;
    case 'rival': return -55;
    case 'adversary': return -75;
    case 'conflict': return -85;
  }
}

function inferRivalType(sourceId: string, targetId: string, sharedBorder: boolean): CountryRelationship['type'] {
  if (ACTIVE_CONFLICTS.has(`${sourceId}:${targetId}`)) return 'conflict';
  if (HARD_ADVERSARIES[sourceId]?.has(targetId)) return 'adversary';
  return sharedBorder ? 'rival' : 'rival';
}

function makeRelationship(source: SourceCountry, targetId: string, type: CountryRelationship['type'], sharedBorder: boolean, target?: SourceCountry): CountryRelationship {
  const treaty = (type === 'formal_ally' || type === 'strategic_partner') && target ? sharedAllianceTreaty(source, target) : undefined;
  return {
    countryId: targetId,
    type,
    strength: relationStrength(type),
    ...(treaty ? { treaty } : {}),
    sharedBorder,
  };
}

function regimeStabilityFor(category: GovernmentCategory, country: SourceCountry, tags: Set<GeopoliticalTag>): number {
  const vulnerabilities = new Set((country.profile?.vulnerabilities ?? []).map((value) => value.toLowerCase()));
  let score = (() => {
    switch (category) {
      case 'liberal_democracy': return 72;
      case 'constitutional_monarchy': return 76;
      case 'illiberal_democracy': return 64;
      case 'hybrid_regime': return 55;
      case 'authoritarian': return 68;
      case 'totalitarian': return 80;
      case 'theocracy': return 64;
      case 'absolute_monarchy': return 74;
    }
  })();

  const income = (country.profile?.incomeLevel ?? '').toLowerCase();
  if (income === 'high') score += 6;
  else if (income === 'upper_middle') score += 2;
  else if (income === 'lower_middle') score -= 4;
  else if (income === 'low') score -= 8;

  if (vulnerabilities.has('aging_population')) score -= 2;
  if (vulnerabilities.has('debt_burden') || vulnerabilities.has('debt_stressed')) score -= 4;
  if (vulnerabilities.has('unemployment') || vulnerabilities.has('energy_crisis') || vulnerabilities.has('property_sector')) score -= 6;
  if (tags.has(GEO_TAGS.CONFLICT_ZONE)) score -= 12;
  if (tags.has(GEO_TAGS.FAILED_STATE_RISK)) score -= 18;

  return clamp(round(score), 25, 90);
}

function inferRelationships(country: SourceCountry, countries: Map<string, SourceCountry>): Pick<GeopoliticalProfile, 'neighbors' | 'allies' | 'adversaries'> {
  const playableIds = new Set(countries.keys());
  const allies = asSet(country.diplomacy?.allies);
  const rivals = asSet(country.diplomacy?.rivals);
  const borderSet = new Set(unique([...(country.borders ?? []), ...(country.maritimeBorders ?? [])]).filter((id) => playableIds.has(id)));

  const allyList: CountryRelationship[] = [...allies]
    .filter((id) => playableIds.has(id))
    .map((id) => {
      const target = countries.get(id);
      const treaty = target ? sharedAllianceTreaty(country, target) : undefined;
      const type: CountryRelationship['type'] = treaty && ['ANZUS', 'NATO', 'CSTO', 'US-JAPAN ALLIANCE', 'US-ROK ALLIANCE'].includes(treaty) ? 'formal_ally' : 'strategic_partner';
      return makeRelationship(country, id, type, borderSet.has(id), target);
    });

  const adversaryList: CountryRelationship[] = [...rivals]
    .filter((id) => playableIds.has(id))
    .map((id) => makeRelationship(country, id, inferRivalType(country.id, id, borderSet.has(id)), borderSet.has(id), countries.get(id)));

  const neighbors: CountryRelationship[] = [...borderSet].map((id) => {
    if (allies.has(id)) {
      const ally = allyList.find((entry) => entry.countryId === id);
      return ally ?? makeRelationship(country, id, 'strategic_partner', true, countries.get(id));
    }
    if (rivals.has(id)) {
      const rival = adversaryList.find((entry) => entry.countryId === id);
      return rival ?? makeRelationship(country, id, inferRivalType(country.id, id, true), true, countries.get(id));
    }
    return makeRelationship(country, id, 'neutral', true, countries.get(id));
  });

  return {
    neighbors: unique(neighbors.map((entry) => entry.countryId)).map((id) => neighbors.find((entry) => entry.countryId === id)!),
    allies: allyList,
    adversaries: adversaryList,
  };
}

function baseScoreFromScale(scale: string | undefined): number {
  switch ((scale ?? '').toLowerCase()) {
    case 'major': return 78;
    case 'large': return 68;
    case 'medium': return 58;
    case 'small': return 48;
    default: return 52;
  }
}

function incomeAdjustment(income: string | undefined): number {
  switch ((income ?? '').toLowerCase()) {
    case 'high': return 10;
    case 'upper_middle': return 2;
    case 'lower_middle': return -8;
    case 'low': return -15;
    default: return 0;
  }
}

function democracyScore(category: GovernmentCategory): number {
  switch (category) {
    case 'liberal_democracy': return 82;
    case 'constitutional_monarchy': return 78;
    case 'illiberal_democracy': return 62;
    case 'hybrid_regime': return 48;
    case 'authoritarian': return 24;
    case 'totalitarian': return 10;
    case 'theocracy': return 18;
    case 'absolute_monarchy': return 20;
  }
}

function libertyScore(category: GovernmentCategory): number {
  switch (category) {
    case 'liberal_democracy': return 78;
    case 'constitutional_monarchy': return 74;
    case 'illiberal_democracy': return 56;
    case 'hybrid_regime': return 44;
    case 'authoritarian': return 24;
    case 'totalitarian': return 8;
    case 'theocracy': return 18;
    case 'absolute_monarchy': return 22;
  }
}

function corruptionScore(category: GovernmentCategory, income: string | undefined): number {
  let score = 42;
  if (['high', 'upper_middle'].includes((income ?? '').toLowerCase())) score -= 8;
  switch (category) {
    case 'liberal_democracy': score -= 8; break;
    case 'constitutional_monarchy': score -= 6; break;
    case 'illiberal_democracy': score += 2; break;
    case 'hybrid_regime': score += 8; break;
    case 'authoritarian': score += 14; break;
    case 'theocracy': score += 16; break;
    case 'absolute_monarchy': score += 14; break;
    case 'totalitarian': score += 18; break;
  }
  return clamp(score, 15, 75);
}

function deriveBundleWeights(tags: Set<GeopoliticalTag>, country: SourceCountry, corruption: number): Partial<Record<BundleId, number>> {
  const weights: Partial<Record<BundleId, number>> = {};
  const strengths = new Set((country.profile?.strengths ?? []).map((value) => value.toLowerCase()));
  const vulnerabilities = new Set((country.profile?.vulnerabilities ?? []).map((value) => value.toLowerCase()));

  if (tags.has(GEO_TAGS.G7) || tags.has(GEO_TAGS.G20) || tags.has(GEO_TAGS.MANUFACTURING_HUB) || tags.has(GEO_TAGS.FINANCIAL_CENTER)) {
    weights[BUNDLE_IDS.ECONOMY] = 1.25;
  }
  if (tags.has(GEO_TAGS.SUPERPOWER) || tags.has(GEO_TAGS.GREAT_POWER) || tags.has(GEO_TAGS.NUCLEAR_STATE) || (country.military?.strength ?? 0) >= 70) {
    weights[BUNDLE_IDS.MILITARY] = 1.3;
  }
  if ((country.diplomacy?.allies?.length ?? 0) + (country.diplomacy?.rivals?.length ?? 0) >= 4) {
    weights[BUNDLE_IDS.DIPLOMACY] = 1.25;
  }
  if (tags.has(GEO_TAGS.CYBER_POWER) || tags.has(GEO_TAGS.SPACE_CAPABLE) || strengths.has('technology') || strengths.has('innovation')) {
    weights[BUNDLE_IDS.TECH] = 1.2;
  }
  if (tags.has(GEO_TAGS.OIL_EXPORTER) || strengths.has('mining') || strengths.has('energy')) {
    weights[BUNDLE_IDS.RESOURCES] = 1.3;
  }
  if (tags.has(GEO_TAGS.ISLAND_NATION) || vulnerabilities.has('climate_disaster_exposure') || vulnerabilities.has('climate_vulnerable') || vulnerabilities.has('water_stress')) {
    weights[BUNDLE_IDS.ENVIRONMENT] = 1.2;
  }
  if (vulnerabilities.has('inequality') || vulnerabilities.has('unemployment') || vulnerabilities.has('aging_population')) {
    weights[BUNDLE_IDS.SOCIAL] = 1.15;
  }
  if (corruption >= 50) {
    weights[BUNDLE_IDS.CORRUPTION] = 1.2;
    weights[BUNDLE_IDS.JUSTICE] = 1.1;
  }
  if (vulnerabilities.has('energy_crisis') || strengths.has('engineering') || strengths.has('infrastructure')) {
    weights[BUNDLE_IDS.INFRASTRUCTURE] = 1.1;
  }

  return weights;
}

function inferGameplay(country: SourceCountry, geopolitical: GeopoliticalProfile): CountryGameplayProfile & { term_turn_fraction: number; difficulty: 'low' | 'medium' | 'high' | 'expert' } {
  const scale = country.profile?.economicScale;
  const income = country.profile?.incomeLevel;
  const strengths = new Set((country.profile?.strengths ?? []).map((value) => value.toLowerCase()));
  const vulnerabilities = new Set((country.profile?.vulnerabilities ?? []).map((value) => value.toLowerCase()));
  const relation = country.diplomacy?.relationship ?? 50;
  const governmentCategory = geopolitical.governmentCategory;
  const tags = new Set(geopolitical.tags);
  const baseEconomy = baseScoreFromScale(scale) + incomeAdjustment(income);
  const economy = clamp(baseEconomy, 25, 90);
  const military = clamp(country.military?.strength ?? 50, 20, 95);
  const democracy = democracyScore(governmentCategory);
  const liberty = libertyScore(governmentCategory);
  const corruption = corruptionScore(governmentCategory, income);
  const publicOrder = clamp(geopolitical.regimeStability * 0.9 + (tags.has(GEO_TAGS.CONFLICT_ZONE) ? -12 : 0), 20, 90);
  const foreignRelations = clamp(relation + geopolitical.allies.length * 4 - geopolitical.adversaries.length * 3, 20, 85);
  const innovation = clamp(50 + (strengths.has('technology') ? 12 : 0) + (strengths.has('innovation') ? 10 : 0) + (tags.has(GEO_TAGS.MANUFACTURING_HUB) ? 6 : 0) + incomeAdjustment(income), 20, 90);
  const trade = clamp(48 + (country.economy?.trade_dependencies?.length ?? 0) * 3 + (tags.has(GEO_TAGS.MANUFACTURING_HUB) ? 8 : 0) + (tags.has(GEO_TAGS.FINANCIAL_CENTER) ? 6 : 0), 20, 90);
  const energy = clamp(50 + (tags.has(GEO_TAGS.OIL_EXPORTER) ? 20 : 0) + (tags.has(GEO_TAGS.GAS_EXPORTER) ? 10 : 0) - ((country.economy?.primary_import ?? '').toLowerCase().includes('energy') || (country.economy?.primary_import ?? '').toLowerCase().includes('oil') ? 12 : 0), 20, 90);
  const employment = clamp(economy - (vulnerabilities.has('unemployment') ? 18 : 0), 20, 90);
  const equality = clamp(55 + incomeAdjustment(income) / 2 - (vulnerabilities.has('inequality') ? 18 : 0) - (tags.has(GEO_TAGS.OIL_EXPORTER) ? 4 : 0), 20, 85);
  const health = clamp(52 + incomeAdjustment(income) + (vulnerabilities.has('aging_population') ? -4 : 0), 20, 90);
  const education = clamp(54 + incomeAdjustment(income) + (strengths.has('technology') ? 8 : 0), 20, 92);
  const infrastructure = clamp(52 + incomeAdjustment(income) + (strengths.has('engineering') ? 8 : 0) + (strengths.has('infrastructure') ? 8 : 0) - (vulnerabilities.has('energy_crisis') ? 8 : 0), 20, 90);
  const housing = clamp(50 + incomeAdjustment(income) - (vulnerabilities.has('inequality') ? 8 : 0), 20, 85);
  const environment = clamp(50 - (tags.has(GEO_TAGS.OIL_EXPORTER) ? 8 : 0) - (vulnerabilities.has('climate_disaster_exposure') || vulnerabilities.has('climate_vulnerable') ? 10 : 0) + (tags.has(GEO_TAGS.DEVELOPED_ECONOMY) ? 4 : 0), 20, 85);
  const sovereignty = clamp(55 + (tags.has(GEO_TAGS.SUPERPOWER) || tags.has(GEO_TAGS.GREAT_POWER) ? 15 : 0) - (tags.has(GEO_TAGS.EU) ? 5 : 0), 20, 95);
  const immigration = clamp(48 + (governmentCategory === 'liberal_democracy' || governmentCategory === 'constitutional_monarchy' ? 10 : 0) + (income === 'high' ? 6 : 0) - (tags.has(GEO_TAGS.CONFLICT_ZONE) ? 8 : 0), 15, 85);
  const inflation = clamp(35 - (income === 'high' ? 8 : 0) + (vulnerabilities.has('debt_burden') ? 8 : 0), 10, 70);
  const crime = clamp(36 - (publicOrder - 50) * 0.3 + (tags.has(GEO_TAGS.CONFLICT_ZONE) ? 12 : 0), 10, 75);
  const bureaucracy = clamp(42 + (governmentCategory === 'authoritarian' || governmentCategory === 'absolute_monarchy' ? 8 : 0) + (governmentCategory === 'hybrid_regime' ? 4 : 0), 15, 70);

  const starting_metrics: Partial<Record<MetricId, number>> = {
    [METRIC_IDS.ECONOMY]: round(economy),
    [METRIC_IDS.PUBLIC_ORDER]: round(publicOrder),
    [METRIC_IDS.HEALTH]: round(health),
    [METRIC_IDS.EDUCATION]: round(education),
    [METRIC_IDS.INFRASTRUCTURE]: round(infrastructure),
    [METRIC_IDS.ENVIRONMENT]: round(environment),
    [METRIC_IDS.FOREIGN_RELATIONS]: round(foreignRelations),
    [METRIC_IDS.MILITARY]: round(military),
    [METRIC_IDS.LIBERTY]: round(liberty),
    [METRIC_IDS.EQUALITY]: round(equality),
    [METRIC_IDS.EMPLOYMENT]: round(employment),
    [METRIC_IDS.INNOVATION]: round(innovation),
    [METRIC_IDS.TRADE]: round(trade),
    [METRIC_IDS.ENERGY]: round(energy),
    [METRIC_IDS.HOUSING]: round(housing),
    [METRIC_IDS.DEMOCRACY]: round(democracy),
    [METRIC_IDS.SOVEREIGNTY]: round(sovereignty),
    [METRIC_IDS.IMMIGRATION]: round(immigration),
    [METRIC_IDS.CORRUPTION]: round(corruption),
    [METRIC_IDS.INFLATION]: round(inflation),
    [METRIC_IDS.CRIME]: round(crime),
    [METRIC_IDS.BUREAUCRACY]: round(bureaucracy),
  };

  const metric_equilibria: Partial<Record<MetricId, number>> = Object.fromEntries(
    Object.entries(starting_metrics).map(([metricId, value]) => [metricId, round(Number(value))])
  ) as Partial<Record<MetricId, number>>;

  const bundle_weight_overrides = deriveBundleWeights(tags, country, corruption);
  const priority_tags = geopolitical.tags.filter((tag) => ![GEO_TAGS.SECULAR_STATE, GEO_TAGS.COASTAL].includes(tag)).slice(0, 6);
  const neighbor_event_chance = round(clamp(0.04 + geopolitical.neighbors.length * 0.025 + geopolitical.adversaries.length * 0.03 + (tags.has(GEO_TAGS.CONFLICT_ZONE) ? 0.05 : 0), 0.05, 0.3));
  const difficultyScore = (100 - economy) + corruption + (100 - democracy) + (tags.has(GEO_TAGS.CONFLICT_ZONE) ? 20 : 0);
  const difficulty = difficultyScore >= 210 ? 'expert' : difficultyScore >= 170 ? 'high' : difficultyScore >= 130 ? 'medium' : 'low';

  return {
    starting_metrics,
    metric_equilibria,
    bundle_weight_overrides,
    priority_tags,
    suppressed_tags: [],
    neighbor_event_chance,
    term_turn_fraction: 1.0,
    difficulty,
  };
}

async function main() {
  const countriesSnap = await db.collection('countries').get();
  if (countriesSnap.empty) {
    throw new Error('countries collection is empty.');
  }

  const countries = new Map<string, SourceCountry>();
  countriesSnap.forEach((doc) => {
    const data = doc.data() as SourceCountry;
    countries.set(doc.id, { ...data, id: doc.id });
  });

  const batch = db.batch();
  const summaries: Array<{ id: string; name: string; tags: GeopoliticalTag[]; neighborCount: number; allyCount: number; adversaryCount: number }> = [];

  for (const country of countries.values()) {
    const tags = inferGeopoliticalTags(country);
    const governmentCategory = inferGovernmentCategory(country);
    const relationships = inferRelationships(country, countries);
    if (relationships.adversaries.some((entry) => entry.type === 'conflict') && !tags.includes(GEO_TAGS.CONFLICT_ZONE)) {
      tags.push(GEO_TAGS.CONFLICT_ZONE);
    }
    const geopolitical: GeopoliticalProfile = {
      neighbors: relationships.neighbors,
      allies: relationships.allies,
      adversaries: relationships.adversaries,
      tags,
      governmentCategory,
      regimeStability: regimeStabilityFor(governmentCategory, country, new Set(tags)),
    };

    const gameplay = inferGameplay(country, geopolitical);

    summaries.push({
      id: country.id,
      name: country.name ?? country.id,
      tags,
      neighborCount: geopolitical.neighbors.length,
      allyCount: geopolitical.allies.length,
      adversaryCount: geopolitical.adversaries.length,
    });

    if (!isDryRun) {
      batch.set(db.collection('countries').doc(country.id), { geopolitical, gameplay }, { merge: true });
    }
  }

  if (isDryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      totalCountries: summaries.length,
      sample: summaries.slice(0, 10),
    }, null, 2));
    return;
  }

  await batch.commit();
  console.log(JSON.stringify({
    updated: summaries.length,
    sample: summaries.slice(0, 10),
  }, null, 2));
}

main().catch((error) => {
  console.error('[populate-country-profiles] Failed:', error);
  process.exit(1);
});