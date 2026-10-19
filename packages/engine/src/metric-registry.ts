import type { QuantityKind, WritePolicy } from "@admin/world";
import { INSTRUMENT_IDS, type InstrumentId } from "./instrument-ids.js";
import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { PRESSURE_WEIGHTS, type PressureTermKey } from "./removal.js";

export type MetricNodeId = string;

export type MetricNode = {
  readonly id: MetricNodeId;
  readonly label: string;
  readonly definition: string;
  readonly unit: "ratio" | "usd" | "count" | "band" | "composite";
  readonly parents: readonly MetricNodeId[];
  readonly children: readonly MetricNodeId[];
  /** Engine export name for the weight table if any */
  readonly weightsExport?: string;
  readonly provenance: string;
  readonly updateCadence: "derived" | "per-turn" | "per-effect" | "founding";
  /** What kind of quantity it is, in the vocabulary the world registries share. A container of other nodes has none. */
  readonly kind?: QuantityKind;
  /** Who may change it once a campaign runs (`WritePolicy` in the world registry). */
  readonly writePolicy: WritePolicy;
  /**
   * Where it is stored, as `Type.field`, for a node the campaign keeps rather
   * than recomputes. `scripts/report-metric-registry.mjs` lists the readers and
   * writers of the field it names.
   */
  readonly field?: `${"MetricSet" | "PublicMood"}.${string}`;
};

/** Player-visible metrics that must stay connected in the dependency graph. */
export const CORE_METRIC_NODE_IDS = [
  "approval",
  "treasury",
  "treasuryHealth",
  "stability",
  "militaryReadiness",
  "standing",
  "removalPressure",
  "polarization",
  ...OPINION_DRIVERS,
  "congressHostility",
  "instruments",
  ...INSTRUMENT_IDS,
] as const satisfies readonly MetricNodeId[];

type MetricNodeSeed = Omit<MetricNode, "children">;

const PRESSURE_CHILDREN = Object.keys(PRESSURE_WEIGHTS) as PressureTermKey[];

const INSTRUMENT_CHILDREN = INSTRUMENT_IDS as readonly InstrumentId[];

const NODE_SEEDS: readonly MetricNodeSeed[] = [
  // The root. There is one headline and this is it. The graph used to carry a
  // weighted composite above this node under two different names at once — id
  // `capital`, label "Mandate" — with every state metric hanging off it as a
  // term of that sum. They hang off the public judgments they actually move
  // now, so a walk down from here is the causal chain rather than a picture of
  // a weighted average.
  {
    id: "approval",
    label: "Approval rating",
    definition: "The headline — what the governed think of this administration, as the polls report it: the share-weighted sum of the five partisan blocs.",
    unit: "ratio",
    parents: [],
    weightsExport: "OPINION_WEIGHTS",
    provenance: "packages/engine/src/opinion.ts",
    updateCadence: "per-effect",
    kind: "modeled-score",
    writePolicy: "derived-only",
    field: "MetricSet.approval",
  },
  {
    id: "polarization",
    label: "Polarization",
    definition: "How divided the country is: the era's anchor plus what this administration added or healed. Sets how far apart the partisan blocs start and how little the identifiers move on the record.",
    unit: "ratio",
    parents: ["approval"],
    provenance: "packages/engine/src/polarization.ts",
    updateCadence: "per-effect",
    kind: "modeled-score",
    writePolicy: "effect-written",
    field: "PublicMood.polarization",
  },
  // The two causes of budget authority, so a walk down from it is the
  // constitutional sentence rather than a stock with no origin: Congress
  // appropriates, the administration obligates, and what is left is what the
  // President may still commit.
  {
    id: "appropriation",
    label: "The appropriation",
    definition: "What Congress has enacted for the discretionary year, released a week at a time.",
    unit: "usd",
    parents: [],
    provenance: "packages/engine/src/fiscal.ts",
    updateCadence: "per-turn",
    kind: "flow",
    writePolicy: "phase-written",
  },
  {
    id: "obligations",
    label: "Obligations",
    definition: "What the administration has already committed the appropriation to — orders, acts, standing promises and the accounts' own weekly draw.",
    unit: "usd",
    parents: [],
    provenance: "packages/engine/src/funding.ts",
    updateCadence: "per-effect",
    kind: "flow",
    writePolicy: "effect-written",
  },
  {
    id: "treasury",
    label: "Budget authority",
    definition:
      "The part of the enacted appropriation this administration is still holding — what it may obligate before going back to Congress.",
    unit: "usd",
    parents: ["appropriation", "obligations"],
    provenance: "packages/engine/src/fiscal.ts",
    updateCadence: "per-effect",
    kind: "stock",
    writePolicy: "effect-written",
    field: "MetricSet.treasury",
  },
  {
    id: "treasuryHealth",
    label: "Treasury health",
    definition: "Solvency reading against the calibrated reference — whether there is authority to show up with.",
    unit: "ratio",
    parents: ["services", "treasury"],
    provenance: "packages/engine/src/metrics.ts",
    updateCadence: "derived",
    kind: "modeled-score",
    writePolicy: "derived-only",
  },
  {
    id: "stability",
    label: "Stability",
    definition: "Order at home — whether the government is holding the line against unrest and disorder.",
    unit: "ratio",
    parents: ["security", "competence"],
    provenance: "packages/engine/src/state-campaign.ts",
    updateCadence: "per-effect",
    kind: "modeled-score",
    writePolicy: "effect-written",
    field: "MetricSet.stability",
  },
  {
    id: "militaryReadiness",
    label: "Military readiness",
    definition: "Force posture — whether the armed services can answer when called.",
    unit: "ratio",
    parents: ["competence"],
    provenance: "packages/engine/src/state-campaign.ts",
    updateCadence: "per-effect",
    kind: "modeled-score",
    writePolicy: "effect-written",
    field: "MetricSet.militaryReadiness",
  },
  {
    id: "standing",
    label: "Standing",
    definition: "Foreign regard — how other nations read this government abroad.",
    unit: "ratio",
    parents: ["competence"],
    provenance: "packages/engine/src/state-campaign.ts",
    updateCadence: "per-effect",
    kind: "modeled-score",
    writePolicy: "effect-written",
    field: "MetricSet.standing",
  },
  ...OPINION_DRIVERS.map(
    (driver): MetricNodeSeed => ({
      id: driver,
      label: driver.charAt(0).toUpperCase() + driver.slice(1),
      definition: `Public judgment: ${driver}.`,
      unit: "ratio",
      parents: ["approval"],
      provenance: "packages/engine/src/opinion.ts",
      updateCadence: "per-effect",
      kind: "modeled-score",
      writePolicy: "effect-written",
      field: `PublicMood.${driver}`,
    }),
  ),
  {
    id: "removalPressure",
    label: "Removal pressure",
    definition: "Institutional survival — how close the charter's removal arc is to its next beat.",
    unit: "ratio",
    parents: [],
    weightsExport: "PRESSURE_WEIGHTS",
    provenance: "packages/engine/src/removal.ts",
    updateCadence: "per-turn",
    kind: "modeled-score",
    writePolicy: "phase-written",
  },
  ...PRESSURE_CHILDREN.map(
    (term): MetricNodeSeed => ({
      id: term,
      label: term === "unpopularity" ? "Unpopularity" : term === "floors" ? "Floor breaches" : term.charAt(0).toUpperCase() + term.slice(1),
      definition:
        term === "unpopularity"
          ? "Pressure from low approval — one minus the headline rating."
          : term === "congress"
            ? "Pressure from a hostile chamber and unauthorized force."
            : term === "floors"
              ? "Pressure from weeks spent out of budget authority or at metric floors."
              : term === "alignment"
                ? "Pressure from governing against what the charter's institutions expect."
                : "Pressure from recent approval-damaging decisions in the ledger.",
      unit: "ratio",
      parents: ["removalPressure"],
      provenance: "packages/engine/src/removal.ts",
      updateCadence: "derived",
      kind: "modeled-score",
      writePolicy: "derived-only",
    }),
  ),
  {
    id: "congressHostility",
    label: "Congressional hostility",
    definition: "How far the Hill has turned against the administration — one minus chamber disposition.",
    unit: "ratio",
    parents: ["removalPressure", "congress"],
    provenance: "packages/engine/src/removal.ts",
    updateCadence: "derived",
    kind: "modeled-score",
    writePolicy: "derived-only",
  },
  {
    id: "instruments",
    label: "Instruments",
    definition: "The coercive and assistance ladder — five instruments, five rungs each, one shared path for every actor.",
    unit: "composite",
    parents: [],
    provenance: "packages/engine/src/instruments.ts",
    updateCadence: "per-effect",
    writePolicy: "effect-written",
  },
  ...INSTRUMENT_CHILDREN.map(
    (instrument): MetricNodeSeed => ({
      id: instrument,
      label: instrument.charAt(0).toUpperCase() + instrument.slice(1),
      definition: `${instrument.charAt(0).toUpperCase() + instrument.slice(1)} instrument on the shared ladder.`,
      unit: "band",
      parents: ["instruments"],
      provenance: "packages/engine/src/instruments.ts",
      updateCadence: "per-effect",
      kind: "ordinal",
      writePolicy: "effect-written",
    }),
  ),
];

function linkChildren(seeds: readonly MetricNodeSeed[]): readonly MetricNode[] {
  const childIds = new Map<MetricNodeId, MetricNodeId[]>();
  for (const seed of seeds) {
    for (const parentId of seed.parents) {
      const siblings = childIds.get(parentId) ?? [];
      siblings.push(seed.id);
      childIds.set(parentId, siblings);
    }
  }
  return seeds.map((seed) => ({
    ...seed,
    children: [...(childIds.get(seed.id) ?? [])].sort(),
  }));
}

export const METRIC_REGISTRY: readonly MetricNode[] = linkChildren(NODE_SEEDS);

const REGISTRY_BY_ID = new Map(METRIC_REGISTRY.map((node) => [node.id, node]));

export function metricNode(id: MetricNodeId): MetricNode | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function metricChildren(id: MetricNodeId): readonly MetricNode[] {
  const node = REGISTRY_BY_ID.get(id);
  if (!node) return [];
  return node.children
    .map((childId) => REGISTRY_BY_ID.get(childId))
    .filter((child): child is MetricNode => child !== undefined);
}

export function metricParents(id: MetricNodeId): readonly MetricNode[] {
  const node = REGISTRY_BY_ID.get(id);
  if (!node) return [];
  return node.parents
    .map((parentId) => REGISTRY_BY_ID.get(parentId))
    .filter((parent): parent is MetricNode => parent !== undefined);
}
