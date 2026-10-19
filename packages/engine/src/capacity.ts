import type { ForceAssetId, MilitaryBranch, NationId } from "@admin/world";
import { BRANCH_STRENGTH_OF, MILITARY_BRANCHES, forceAssetPersonnel } from "@admin/world";
import { selectNation, type Campaign, type NationRuntime } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";

// What the services can actually do this week, as opposed to what they are on
// paper.
//
// Gating the heaviest rungs on `branchStrength` alone would not work, because
// that figure is authored and static: the United States holds land strength at
// 0.7 and would hold it at 0.7 after invading somebody every week for a year.
// With no finite force anywhere, nothing an administration did would reduce
// what it could do next week, and the top of the ladder would stand permanently
// open to whoever was authored above the line. A ceiling nobody can reach is
// not a ceiling.
//
// So branch strength says what a military *is*, and the capacity here says how
// much of it is available now. Readiness is spent by using it and comes back at
// the rate an establishment can regenerate rather than instantly, which is what
// makes the next rung genuinely harder to reach for an administration that has
// been fighting every week.

/**
 * The readiness a nation's establishment can hold, as its recovery anchor.
 *
 * Recovery is toward the authored figure rather than toward 1: what a force
 * can hold indefinitely is what its budget, its bases and its maintenance
 * depots support, and that is exactly what the authored reading is a
 * statement about. A conscript army that opens at 0.3 does not become a
 * professional one by resting.
 *
 * Raised, never lowered, in proportion to what an appropriation has built.
 * The budget writes readiness up and this phase used to pull it straight back
 * to the figure the campaign opened with, so money bought a week of readiness
 * and nothing after it. The establishment the same appropriation builds
 * (doctrine, the services, lift) is what holds a higher figure up, and it is
 * the part nothing else pulls back.
 */
export function readinessAnchor(runtime: NationRuntime): number {
  const handed = runtime.base.stats.military.readiness;
  return Math.min(1, handed * Math.max(1, establishmentGrowth(runtime)));
}

const ESTABLISHMENT_READINGS: readonly ((military: NationRuntime["stats"]["military"]) => number)[] = [
  (military) => military.doctrineQuality,
  (military) => military.branchStrength.land,
  (military) => military.branchStrength.air,
  (military) => military.branchStrength.naval,
  (military) => military.branchStrength.cyber,
  (military) => military.airliftCapacity,
  (military) => military.sealiftCapacity,
];

/** The establishment now over the establishment the campaign opened with: 1 where nothing has moved it. */
function establishmentGrowth(runtime: NationRuntime): number {
  const sum = (military: NationRuntime["stats"]["military"]) => ESTABLISHMENT_READINGS.reduce((total, read) => total + read(military), 0);
  const opened = sum(runtime.base.stats.military);
  return opened > 0 ? sum(runtime.stats.military) / opened : 1;
}

/**
 * How far a service has grown or shrunk since the campaign began: its live
 * branch strength over the strength it was handed.
 *
 * Branch strength is what an appropriation buys, and it is a reading rather
 * than a count; the order of battle is the count. Reading one through the
 * other is what makes money spent on the air force show up as airframes a
 * player can count, rather than as a figure that climbs beside a roster that
 * never moves.
 */
export function establishmentScale(campaign: Campaign, nation: NationId, branch: MilitaryBranch): number {
  const runtime = selectNation(campaign, nation);
  if (!runtime) return 1;
  const key = BRANCH_STRENGTH_OF[branch];
  const opened = runtime.base.stats.military.branchStrength[key];
  return opened > 0 ? runtime.stats.military.branchStrength[key] / opened : 1;
}

/**
 * The share of a fielded force ready to go this week: live readiness over the
 * anchor it recovers toward. Proportional rather than a bar each unit clears
 * or does not, because every unit of a type carries one authored readiness
 * figure and a bar would take all eleven carriers off the board in one week.
 */
export function readyShare(campaign: Campaign, nation: NationId): number {
  const runtime = selectNation(campaign, nation);
  if (!runtime) return 0;
  const anchor = readinessAnchor(runtime);
  return anchor > 0 ? Math.min(1, runtime.stats.military.readiness / anchor) : 0;
}

/** A holding as the establishment carries it after a scale, in whole units. */
function scaledCount(count: number, scale: number): number {
  return Math.floor(count * scale + 1e-9);
}

/**
 * How much readiness a week of peace returns.
 *
 * The rate is what sets the tempo of the whole military ladder: at this figure
 * an expeditionary invasion is affordable roughly every eight weeks and a
 * limited strike every four. Slower than this and a term holds one war; faster
 * and the ceiling stops being felt.
 */
export const READINESS_RECOVERY_PER_TURN = 0.02;

/** What each rung of the military ladder takes out of the force that uses it. */
export const MILITARY_READINESS_COST: Readonly<Record<3 | 4 | 5, number>> = {
  3: 0.05,
  4: 0.08,
  5: 0.15,
};

/**
 * What each rung needs available before it can be ordered.
 *
 * Deliberately below the cost of the rung above it in every case: the gate is
 * meant to be a ceiling on tempo, not a lockout. A force at the floor can still
 * exercise and still deploy forward — signaling is what a military does when
 * it cannot do anything else — and climbing back to a strike is a matter of
 * weeks the player can count rather than a state they cannot leave.
 */
export const MILITARY_READINESS_GATES: Readonly<Record<3 | 4 | 5, number>> = {
  3: 0.3,
  4: 0.45,
  5: 0.6,
};

/**
 * Formations a branch has on the books, whatever their state.
 *
 * Absent for a nation that ships no order of battle, which is most of them —
 * and absent is not zero. A gate that read a missing decomposition as an empty
 * one would refuse every NPC the rungs it has always been able to take, on the
 * strength of authoring that has not happened yet.
 */
export function branchUnits(campaign: Campaign, nation: NationId, branch: MilitaryBranch) {
  return selectNation(campaign, nation)?.stats.military.orderOfBattle?.[branch]?.units;
}

/** What a branch is, in the names a player reads rather than in a count. */
export function branchCapabilities(campaign: Campaign, nation: NationId, branch: MilitaryBranch) {
  return selectNation(campaign, nation)?.stats.military.orderOfBattle?.[branch]?.capabilities;
}

/**
 * Formations of a branch that could actually go somewhere this week.
 *
 * A unit counts as available when its own readiness clears the bar and it is
 * not already committed elsewhere — which is what makes a second crisis find a
 * thinner bench than the first. The count is the establishment's as the budget
 * has grown it, at the share national readiness can field this week, so a
 * force spent in one crisis is visibly smaller in the next. `undefined` where
 * the nation ships no decomposition, for the same reason `branchUnits` is.
 */
export function availableUnits(
  campaign: Campaign,
  nation: NationId,
  branch: MilitaryBranch,
  minimumReadiness = 0.5,
): number | undefined {
  const units = branchUnits(campaign, nation, branch);
  if (!units) return undefined;
  const scale = establishmentScale(campaign, nation, branch) * readyShare(campaign, nation);
  const onTheBooks = units
    .filter((unit) => unit.readiness >= minimumReadiness)
    .reduce((total, unit) => total + scaledCount(unit.count, scale), 0);
  return Math.max(0, onTheBooks - committedUnits(campaign, nation, branch));
}

/**
 * Formations of one named type still free this week.
 *
 * `undefined` where the nation ships no decomposition, for the same reason
 * `availableUnits` is. Zero where the type is missing from an authored branch:
 * naming a package the dataset does not carry is a closed package, not a gate
 * the NPC path can ignore.
 */
export function availableUnitsOfType(
  campaign: Campaign,
  nation: NationId,
  branch: MilitaryBranch,
  unitType: ForceAssetId,
  minimumReadiness = 0.5,
): number | undefined {
  const units = branchUnits(campaign, nation, branch);
  if (!units) return undefined;
  const scale = establishmentScale(campaign, nation, branch) * readyShare(campaign, nation);
  const onTheBooks = units
    .filter((unit) => unit.type === unitType && unit.readiness >= minimumReadiness)
    .reduce((total, unit) => total + scaledCount(unit.count, scale), 0);
  return Math.max(0, onTheBooks - committedUnitsOfType(campaign, nation, branch, unitType));
}

export type ForceBench = {
  readonly branch: MilitaryBranch;
  readonly unitType: ForceAssetId;
  /** What the campaign opened with: the establishment an appropriation is measured against. */
  readonly establishment: number;
  /** What the service holds now, grown or shrunk with its branch strength. */
  readonly fielded: number;
  /** Held abroad by standing commitments. */
  readonly committed: number;
  /** Free to go somewhere this week. */
  readonly available: number;
};

/**
 * One holding's bench: what the campaign opened with, what the budget has made
 * of it, how much is abroad and how much could go this week. `undefined` where
 * the nation ships no order of battle for it, which is most of the world: a
 * count the dataset does not hold is not a count to print.
 */
export function selectForceBench(
  campaign: Campaign,
  nation: NationId,
  branch: MilitaryBranch,
  unitType: ForceAssetId,
): ForceBench | undefined {
  const units = branchUnits(campaign, nation, branch);
  const establishment = units?.filter((unit) => unit.type === unitType).reduce((total, unit) => total + unit.count, 0) ?? 0;
  if (establishment === 0) return undefined;
  return {
    branch,
    unitType,
    establishment,
    fielded: scaledCount(establishment, establishmentScale(campaign, nation, branch)),
    committed: committedUnitsOfType(campaign, nation, branch, unitType),
    available: availableUnitsOfType(campaign, nation, branch, unitType) ?? 0,
  };
}

/**
 * Formations already spoken for by a standing commitment.
 *
 * Reads the commitments a campaign carries rather than a second store, so a
 * deployment is subtracted from the homeland's bench by the same fact that
 * makes it a budget line.
 */
export function committedUnits(campaign: Campaign, nation: NationId, branch: MilitaryBranch): number {
  return reservedInstrumentUnits(campaign, nation, branch) + Object.values(campaign.commitments)
    .filter(
      (commitment) =>
        commitment.actor === nation &&
        commitment.status === "active" &&
        commitment.source.kind === "orderOfBattle" &&
        commitment.source.branch === branch,
    )
    .reduce((total, commitment) => total + (commitment.source.kind === "orderOfBattle" ? commitment.source.count : 0), 0);
}

export function committedUnitsOfType(
  campaign: Campaign,
  nation: NationId,
  branch: MilitaryBranch,
  unitType: ForceAssetId,
): number {
  return reservedInstrumentUnits(campaign, nation, branch, unitType) + Object.values(campaign.commitments)
    .filter(
      (commitment) =>
        commitment.actor === nation &&
        commitment.status === "active" &&
        commitment.source.kind === "orderOfBattle" &&
        commitment.source.branch === branch &&
        commitment.source.unitType === unitType,
    )
    .reduce((total, commitment) => total + (commitment.source.kind === "orderOfBattle" ? commitment.source.count : 0), 0);
}

/**
 * People under arms this nation has standing toward a country or a war, at the
 * catalog's establishment for each holding.
 *
 * In people rather than in counts, because a count is unit-blind: two hundred
 * airframes, four hulls and eight brigades are three different sizes of thing,
 * and adding the numbers made a strike package outweigh a corps.
 */
export function committedPersonnelToward(campaign: Campaign, actor: NationId, targetId: string): number {
  return Object.values(campaign.commitments)
    .filter(
      (commitment) =>
        commitment.actor === actor &&
        commitment.status === "active" &&
        commitment.source.kind === "orderOfBattle" &&
        commitment.target.id === targetId,
    )
    .reduce(
      (total, commitment) =>
        total + (commitment.source.kind === "orderOfBattle" ? forceAssetPersonnel(commitment.source.unitType, commitment.source.count) : 0),
      0,
    );
}

/**
 * How far below its own establishment a nation's standing commitments hold it.
 *
 * Forces abroad are forces not resting, not training and not in the depot, so
 * an administration that has committed a third of a service cannot bring the
 * whole establishment back to full readiness however long it waits. This is
 * what makes a deployment a lasting decision rather than a week's expense.
 */
export function commitmentDrag(campaign: Campaign, nation: NationId): number {
  const runtime = selectNation(campaign, nation);
  if (!runtime) return 0;
  const drag = MILITARY_BRANCHES.reduce((total, branch) => {
    const units = branchUnits(campaign, nation, branch);
    if (!units) return total;
    const onTheBooks = units.reduce((sum, unit) => sum + unit.count, 0);
    if (onTheBooks <= 0) return total;
    return total + committedUnits(campaign, nation, branch) / onTheBooks;
  }, 0);
  return round3(Math.min(0.5, drag / MILITARY_BRANCHES.length));
}

/** The readiness a nation can actually climb back to, given what it has out. */
export function readinessCeiling(campaign: Campaign, nation: NationId): number {
  const runtime = selectNation(campaign, nation);
  if (!runtime) return 0;
  return round3(Math.max(0, readinessAnchor(runtime) - commitmentDrag(campaign, nation)));
}

const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

// --- The intelligence service, on the same terms. --------------------------
//
// Forces were not the only ladder gated on a figure that could not move. The
// covert ladder's top rung reads `security.intelCapability`, which is authored,
// static, and 0.9 for the United States — so overthrowing a government cost the
// service that did it precisely nothing and could be ordered again the
// following Monday, forever. It is the same defect as the military one and it
// takes the same fix: an operation spends the networks, the cover and the
// people it is run with, and recruiting them back is the work of months.

/** What a covert rung takes out of the service that runs it. */
export const COVERT_CAPABILITY_COST: Readonly<Record<4 | 5, number>> = {
  4: 0.05,
  5: 0.1,
};

export const INTEL_RECOVERY_PER_TURN = 0.015;

/**
 * A capacity is an institutional reading that operations spend and time
 * restores toward what the establishment supports.
 *
 * Two of them, one table, one phase: the alternative was two phases with the
 * same arithmetic in both, which is how the two ladders came to have different
 * answers to the same question in the first place.
 */
type CapacityAnchor = {
  readonly read: (runtime: NationRuntime) => number;
  readonly anchor: (campaign: Campaign, nation: NationId, runtime: NationRuntime) => number;
  readonly recovery: number;
  readonly write: (value: number) => Extract<Effect, { kind: "nationStat" }>["setStats"];
};

// Checked against `CapacityAnchor` rather than widened to it, so each entry
// keeps its own `write` and the phase's patch names the field it moves.
const CAPACITIES = [
  {
    read: (runtime) => runtime.stats.military.readiness,
    anchor: (campaign, nation) => readinessCeiling(campaign, nation),
    recovery: READINESS_RECOVERY_PER_TURN,
    write: (value) => ({ military: { readiness: value } }),
  },
  {
    read: (runtime) => runtime.stats.security.intelCapability,
    // No commitment drag: an intelligence service posted abroad is an
    // intelligence service doing its job, which is not the same fact as a
    // brigade abroad being a brigade not at home.
    anchor: (_campaign, _nation, runtime) => runtime.base.stats.security.intelCapability,
    recovery: INTEL_RECOVERY_PER_TURN,
    write: (value) => ({ security: { intelCapability: value } }),
  },
] as const satisfies readonly CapacityAnchor[];

/**
 * A week of rest, refit, rotation and recruiting, everywhere at once.
 *
 * Runs for NPCs on the same arithmetic as for the player, because the ladder is
 * one code path and a rule that only depleted the player's capacity would hand
 * the world a tempo the player cannot match. A nation already at its own
 * ceiling emits nothing, so the ordinary week costs a couple of comparisons per
 * nation and writes no effects at all.
 */
export const capacityPhase: TurnPhase = (state: Campaign) => {
  const effects: Effect[] = [];
  for (const [id, runtime] of Object.entries(state.nations)) {
    const nation = id as NationId;
    for (const capacity of CAPACITIES) {
      const ceiling = capacity.anchor(state, nation, runtime);
      const current = capacity.read(runtime);
      if (Math.abs(current - ceiling) < 1e-6) continue;
      // Above its own ceiling is what a fresh deployment leaves behind, and it
      // settles at the same rate rather than instantly: the units take as long
      // to be missed as they take to come home.
      const next =
        current < ceiling
          ? Math.min(ceiling, current + capacity.recovery)
          : Math.max(ceiling, current - capacity.recovery);
      effects.push({ kind: "nationStat", nation, setStats: capacity.write(round3(next)) });
    }
  }
  if (effects.length === 0) return [];
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn + 1,
      narration: { summary: "Another week of refit, rotation and recruiting across the world's establishments." },
      effects,
      background: true,
    },
  ] satisfies readonly EffectPacket[];
};

function reservedInstrumentUnits(campaign: Campaign, nation: NationId, branch: MilitaryBranch, unitType?: ForceAssetId): number {
  return Object.values(campaign.issuedActs ?? {}).reduce((total, act) => {
    if (act.kind !== "instrument" || !["issued", "in-progress", "awaiting-response"].includes(act.status)) return total;
    const force = act.request.force;
    return total + (act.request.actor === nation && force?.branch === branch && (!unitType || force.unitType === unitType) ? force.count : 0);
  }, 0);
}
