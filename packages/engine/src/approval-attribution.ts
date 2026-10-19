import { OPINION_DRIVERS, type OpinionDriver } from "./opinion-drivers.js";
import { OPINION_WEEK_SUMMARY, OPINION_WEIGHTS } from "./opinion.js";
import { approvalPathOf, type ApprovalMovement, type ApprovalPath } from "./opinion-movement.js";
import { opinionTargets } from "./opinion-causes.js";
import type { ActionRecord, Campaign } from "./state.js";

// Which road approval's movement came in on, charged to what moved the
// public's judgment rather than to the weekly revision that carried it there.
//
// A decision almost never writes the mood. It moves the economy, the order or
// the office, and those move where each judgment is heading (`opinionTargets`);
// the weekly revision then walks the mood toward that target. Read off the
// ledger alone, every such step belongs to the revision, so a year of the
// heaviest act every week read as moving approval not at all. This keeps, for
// each judgment, how far each road has pushed its target and the mood has not
// yet followed, and pays each week's revision out to the roads in proportion to
// what they still hold open.

type Gaps = Readonly<Record<ApprovalPath, Readonly<Record<OpinionDriver, number>>>>;

export type ApprovalAttribution = {
  /** Target movement each road is owed and the mood has not yet caught up to. */
  readonly gaps: Gaps;
  /** Weighted movement credited so far, by judgment. */
  readonly byDriver: Readonly<Record<OpinionDriver, number>>;
  /** Weighted movement credited so far, by road. */
  readonly byPath: Readonly<Record<ApprovalPath, number>>;
};

const PATHS: readonly ApprovalPath[] = ["drift", "decisions", "pledges", "world"];
const zeroDrivers = (): Record<OpinionDriver, number> => Object.fromEntries(OPINION_DRIVERS.map((d) => [d, 0])) as Record<OpinionDriver, number>;
const zeroGaps = (): Record<ApprovalPath, Record<OpinionDriver, number>> =>
  Object.fromEntries(PATHS.map((path) => [path, zeroDrivers()])) as Record<ApprovalPath, Record<OpinionDriver, number>>;

function copyGaps(gaps: Gaps): Record<ApprovalPath, Record<OpinionDriver, number>> {
  return Object.fromEntries(PATHS.map((path) => [path, { ...gaps[path] }])) as Record<ApprovalPath, Record<OpinionDriver, number>>;
}

/** Whatever the opening left between the mood and its targets is the world's to close. */
export function openAttribution(campaign: Campaign): ApprovalAttribution {
  const targets = opinionTargets(campaign);
  const gaps = zeroGaps();
  for (const driver of OPINION_DRIVERS) gaps.world[driver] = targets[driver] - campaign.player.opinion[driver];
  return { gaps, byDriver: zeroDrivers(), byPath: { drift: 0, decisions: 0, pledges: 0, world: 0 } };
}

type Targets = Readonly<Record<OpinionDriver, number>>;

/** Charges a road with how far it moved each judgment's target. */
function chargeTargets(ledger: ApprovalAttribution, from: Targets, to: Targets, path: ApprovalPath): ApprovalAttribution {
  const gaps = copyGaps(ledger.gaps);
  for (const driver of OPINION_DRIVERS) gaps[path][driver] += to[driver] - from[driver];
  return { ...ledger, gaps };
}

/**
 * Credits one ledger entry's mood movement. A direct write belongs to its own
 * road and leaves that road holding the gap it opened. The weekly revision is
 * paid out across the roads by the share of the open gap each holds, and
 * closes each road's gap by the fraction it closed of the whole.
 */
function creditEntry(ledger: ApprovalAttribution, entry: ActionRecord): ApprovalAttribution {
  if (!entry.mood) return ledger;
  const gaps = copyGaps(ledger.gaps);
  const byDriver = { ...ledger.byDriver };
  const byPath = { ...ledger.byPath };
  const revision = entry.description === OPINION_WEEK_SUMMARY;
  for (const driver of OPINION_DRIVERS) {
    const moved = entry.mood[driver] ?? 0;
    if (moved === 0) continue;
    const weighted = Math.abs(moved) * OPINION_WEIGHTS[driver];
    byDriver[driver] += weighted;
    if (!revision) {
      const path = approvalPathOf(entry);
      byPath[path] += weighted;
      gaps[path][driver] -= moved;
      continue;
    }
    const open = PATHS.reduce((sum, path) => sum + gaps[path][driver], 0);
    const held = PATHS.reduce((sum, path) => sum + Math.abs(gaps[path][driver]), 0);
    const closed = open !== 0 ? moved / open : 0;
    if (held === 0 || closed <= 0) {
      byPath.drift += weighted;
      continue;
    }
    for (const path of PATHS) {
      byPath[path] += (weighted * Math.abs(gaps[path][driver])) / held;
      gaps[path][driver] *= 1 - Math.min(1, closed);
    }
  }
  return { gaps, byDriver, byPath };
}

/** The state one phase planned against, as the harness observed it. */
export type PhaseStart = { readonly id: string; readonly state: Campaign };

/**
 * The phases that act for the President inside the turn: the standing program
 * they chose does its week's work in the policy phase, and the pledges they ran
 * on are judged in theirs. Every other phase is the world.
 */
const PHASE_ROADS: Readonly<Record<string, ApprovalPath>> = { policyPhase: "decisions", budgetPhase: "decisions", pledgePhase: "pledges" };

type Segment = { readonly road: ApprovalPath; readonly from: Campaign; readonly to: Campaign };

function attributeSegment(targetsOf: (campaign: Campaign) => Targets) {
  return (ledger: ApprovalAttribution, segment: Segment): ApprovalAttribution => {
    if (segment.from === segment.to) return ledger;
    const charged = chargeTargets(ledger, targetsOf(segment.from), targetsOf(segment.to), segment.road);
    return segment.to.ledger.slice(segment.from.ledger.length).reduce(creditEntry, charged);
  };
}

/**
 * One week of a harness campaign: `start` before the President acted,
 * `decided` after their acts and appointments, then each phase of the turn from
 * the state it planned against to the next one's, and `end` after the turn
 * ran. Each stretch's target movement is charged to its road before the mood
 * movement it wrote is credited, so the revision late in the turn pays out
 * against everything the week moved before it.
 */
export function attributeWeek(
  ledger: ApprovalAttribution,
  start: Campaign,
  decided: Campaign,
  phases: readonly PhaseStart[],
  end: Campaign,
): ApprovalAttribution {
  const seen = new Map<Campaign, Targets>();
  const targetsOf = (campaign: Campaign): Targets => {
    const known = seen.get(campaign) ?? opinionTargets(campaign);
    seen.set(campaign, known);
    return known;
  };
  const turn: readonly Segment[] =
    phases.length > 0
      ? phases.map((phase, index) => ({ road: PHASE_ROADS[phase.id] ?? "world", from: phase.state, to: phases[index + 1]?.state ?? end }))
      : [{ road: "world", from: decided, to: end }];
  const segments: readonly Segment[] = [{ road: "decisions", from: start, to: decided }, ...turn];
  return segments.reduce(attributeSegment(targetsOf), ledger);
}

/** The credited movement as shares, in the shape the harness reports. */
export function attributedMovement(ledger: ApprovalAttribution): ApprovalMovement {
  const total = OPINION_DRIVERS.reduce((sum, driver) => sum + ledger.byDriver[driver], 0);
  const share = (value: number) => (total > 0 ? Math.round((value / total) * 1000) / 1000 : 0);
  return {
    byDriver: Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, share(ledger.byDriver[driver])])) as Record<OpinionDriver, number>,
    byPath: Object.fromEntries(PATHS.map((path) => [path, share(ledger.byPath[path])])) as Record<ApprovalPath, number>,
    total: Math.round(total * 10_000) / 10_000,
  };
}
