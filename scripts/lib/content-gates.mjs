// Which registered fields the scenario corpus gates on. A scenario's
// conditions and cast are JSON (`{"kind":"metric","metric":"stability"}`),
// strings no TypeScript walk reads: the walk sees `conditionMet` reading every
// metric a gate could name, not which ones content actually names. This reads
// the corpus the player is dealt and counts, per field, the scenarios whose
// gate reads it.
//
// The table below says which condition reads which field, and through which
// evaluator. A table is a claim, so each row names the declaration that reads
// the field, and `scripts/verify-metric-registry.mjs` fails when the typed
// walk does not see that declaration reading it. A condition kind the corpus
// uses that is in neither the table nor the list of kinds that read no
// registered field fails too, so a new kind cannot arrive unclassified.

const CAST = "packages/content/src/scenario-cast.ts";

/**
 * Condition kinds that read a registered field. `root` + the condition's `key`
 * value names the field; `map` looks the value up; `field` is one fixed field.
 */
export const GATE_READS = [
  { kind: "metric", key: "metric", root: "MetricSet:", via: `${CAST}#conditionMet` },
  { kind: "counterpartTrait", key: "trait", root: "NationTraits:", via: `${CAST}#conditionMet` },
  { kind: "cabinetAttribute", key: "attribute", root: "Person:", via: `${CAST}#conditionMet` },
  // The cast delegates the coast check to its bodies module, so that is where the walk sees the read.
  { kind: "geography", field: "Nation.geo:coastline", via: "packages/content/src/scenario-cast-bodies.ts#geographyMet" },
  {
    kind: "operatorPressure",
    key: "field",
    map: { insurgency: "NationStats:security.insurgencyPressure", protest: "NationStats:politics.protestPressure" },
    via: `${CAST}#operatorPressure`,
  },
  { kind: "inflationBand", field: "NationStats:economy.inflation", via: "packages/content/src/scenario-pulse.ts#pulseMet" },
  { kind: "unemploymentBand", field: "NationStats:economy.unemployment", via: "packages/content/src/scenario-pulse.ts#pulseMet" },
  { kind: "costOfLivingBand", field: "NationStats:economy.costOfLiving", via: "packages/content/src/scenario-pulse.ts#pulseMet" },
  { kind: "crimeTrend", field: "NationStats:security.crimeIndex", via: "packages/content/src/scenario-pulse.ts#pulseMet" },
];

/** Cast picks that read a registered field: each named key present on the cast reads its field. */
export const CAST_READS = [
  {
    pick: "band",
    present: {
      archetype: "NationBands:archetype",
      powerTier: "NationBands:powerTier",
      militaryTier: "NationBands:militaryTier",
      stabilityBand: "NationBands:stabilityBand",
    },
    via: "packages/content/src/scenario-counterpart.ts#bandMatches",
  },
];

/** Condition kinds that read no registered field, with what they read instead. */
export const GATES_READING_NO_FIELD = {
  alignment: "the President's own alignment, campaign state outside the registered roots",
  relationship: "a relationship edge, which is not a registered root",
  flag: "a campaign flag",
  turn: "the turn counter",
  removalPressure: "a recomputed reading with no stored field",
  charterInstitution: "the founding charter's institutions",
  warState: "the war ledger",
  conditionActive: "the condition ledger",
  coalition: "a coalition flag",
  tradeMeasure: "the trade-measure ledger",
  liveBill: "the bill ledger",
  judicialVacancy: "the court's seats",
  pendingOrderCase: "the order docket",
  sharedMembership: "compact membership",
  sharesBorder: "the nation's land neighbors",
  tariffInForce: "the trade-measure ledger",
  policyStance: "the policy program",
  press: "the press corps",
  revealedPreference: "the revealed-preference ledger",
  stateGrievance: "state grievance marks",
  cohortStrain: "cohort strain",
  calendar: "the calendar",
  ticket: "the platform",
  legislationAvailable: "the transmittable acts",
  collectionReport: "the intelligence product ledger",
  cyclePhase: "the business cycle",
  commodityBand: "the commodity index",
  institutionState: "an executive institution's runtime",
  oversightMatter: "the oversight ledger",
  shutdown: "the appropriation lapse",
  appropriation: "the appropriation",
  pendingRule: "the rulemaking ledger",
};

function conditionFields(table, condition) {
  const row = table.reads.find((r) => r.kind === condition.kind);
  if (!row) return { row: undefined, ids: [] };
  if (row.field) return { row, ids: [row.field] };
  const value = condition[row.key];
  if (typeof value !== "string") return { row, ids: [] };
  const id = row.map ? row.map[value] : `${row.root}${value}`;
  return { row, ids: id ? [id] : [] };
}

function castFields(table, cast) {
  const row = table.casts.find((r) => r.pick === cast?.pick);
  if (!row) return { row: undefined, ids: [] };
  return { row, ids: Object.entries(row.present).filter(([key]) => cast[key] !== undefined).map(([, id]) => id) };
}

const add = (map, key, value) => map.set(key, new Set([...(map.get(key) ?? []), value]));

/**
 * Per registered field, the scenarios that gate on it and the evaluators the
 * table says read it; the condition kinds the table does not classify, with
 * how many scenarios use each.
 */
export function readGates(scenarios, table = { reads: GATE_READS, casts: CAST_READS, none: GATES_READING_NO_FIELD }) {
  const scenariosByField = new Map();
  const viaByField = new Map();
  const unclassified = new Map();
  for (const def of scenarios) {
    const found = [castFields(table, def.cast), ...(def.conditions ?? []).map((condition) => {
      const read = conditionFields(table, condition);
      if (!read.row && !(condition.kind in table.none)) add(unclassified, condition.kind, def.id);
      return read;
    })];
    for (const { row, ids } of found) {
      for (const id of ids) (add(scenariosByField, id, def.id), add(viaByField, id, row.via));
    }
  }
  return {
    scenarios: new Map([...scenariosByField].map(([id, set]) => [id, set.size])),
    via: new Map([...viaByField].map(([id, set]) => [id, [...set].sort()])),
    unclassified: new Map([...unclassified].map(([kind, set]) => [kind, set.size])),
  };
}

/** The corpus the player is dealt, once per id: the authored packs, then the baked shards. */
export function dealtScenarios(packs, shards, parseShardBody) {
  const byId = new Map();
  for (const def of [...packs, ...shards.flatMap((shard) => parseShardBody(shard.jsonl).scenarios)]) byId.set(def.id, def);
  return [...byId.values()];
}
