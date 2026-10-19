import type { NationId } from "@admin/world";
import { rungBand, type ConsequenceValence, type RungBand } from "./consequences.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
import { hashFraction } from "./rng.js";
import type { FeedItem } from "./state.js";
import { sentenceCase } from "./naming.js";
import { movePhrase, rungCatalogueName, wireName } from "./wire.js";

// Choosing what the room watches happen between the order and the packet.
//
// The outcome is already decided by the time anything here runs: the resolver
// drew it, priced it and put it in an EffectPacket. A step sequence only
// narrates that outcome, so nothing in this module produces an effect, moves a
// metric or touches state. Everything it hands back is presentation the surface
// reads and the packet does not.
//
// Coverage is partial on purpose. Only the instruments whose acts take hours a
// player should watch pass are banked; a démarche resolves in a room and reads
// fine as a single aftermath card. So "no sequence for this situation" is the
// ordinary answer for most of the ladder, and it has to cost nothing: the
// caller gets a result with no staged key at all, byte-identical to the one it
// got before any of this existed, and plays the unstaged path.

/** The situation a sequence is authored against, as the resolver produces it. */
export type ResolutionSequenceSituation = {
  readonly instrument: InstrumentId;
  readonly rungBand: RungBand;
  readonly valence: ConsequenceValence;
  /** The named failure branch, present only on a failure. */
  readonly riskId?: string;
};

/**
 * The engine's view of an authored step sequence: what selection keys on, and
 * nothing else.
 *
 * The steps, their lines and their slot constraints stay in the content package
 * and never come through here. The engine decides *which* sequence a resolution
 * draws; filling it is the content renderer's job, and a copy of the fill rules
 * on this side would be a second thing to keep in lockstep forever.
 */
export type ResolutionSequenceEntry = {
  readonly id: string;
  readonly instrument: InstrumentId;
  readonly rungBands: readonly RungBand[];
  readonly valence: ConsequenceValence;
  readonly riskAffinity?: readonly string[];
  readonly weight: number;
};

/**
 * What a resolution carries so a surface can play the sequence it drew.
 *
 * The id rather than the document, for the same reason a drawn consequence
 * carries its id: the caller owns the pool it handed over and can look the
 * document back up, and a result that stays plain data still saves and diffs.
 */
export type StagedResolution = {
  readonly sequenceId: string;
  /** The instrument, rung band, valence and branch the draw was keyed on. */
  readonly situationKey: string;
  /**
   * What a renderer joins to name the same formation this act named. Handed
   * back rather than left to be recomposed, because the fill seam lives on the
   * content side and the two have to draw the same unit for the same campaign.
   */
  readonly seedParts: readonly string[];
};

/**
 * The canonical situation string, in the order the content package's own key
 * function writes it. It is a seed and a label, never a contract either side
 * parses: matching is done field by field below.
 */
export function resolutionSituationKey(situation: ResolutionSequenceSituation): string {
  return [situation.instrument, situation.rungBand, situation.valence, situation.riskId ?? "any"].join(":");
}

/** Whether one authored sequence answers one situation. */
function covers(entry: ResolutionSequenceEntry, situation: ResolutionSequenceSituation): boolean {
  if (entry.instrument !== situation.instrument || entry.valence !== situation.valence) return false;
  if (!entry.rungBands.includes(situation.rungBand)) return false;
  // No affinity is the floor for the cell: it fits any branch of its valence.
  if (!entry.riskAffinity) return true;
  return situation.riskId !== undefined && entry.riskAffinity.includes(situation.riskId);
}

/**
 * The sequence this situation plays, or nothing.
 *
 * Keyed rather than streamed: a resolution is read back on the Record and
 * re-rendered every time a screen mounts, and a stateful draw would give the
 * same act different steps on the second reading. The hash is over the campaign
 * seed, the act and the situation, so the same read is the same steps forever
 * and two campaigns that made the same move do not watch the same one.
 */
export function selectResolutionSequence(
  pool: readonly ResolutionSequenceEntry[],
  situation: ResolutionSequenceSituation,
  seed: string,
): ResolutionSequenceEntry | undefined {
  const eligible = pool.filter((entry) => entry.weight > 0 && covers(entry, situation));
  if (eligible.length === 0) return undefined;
  const total = eligible.reduce((sum, entry) => sum + entry.weight, 0);
  const roll = hashFraction(`${seed}::${resolutionSituationKey(situation)}`) * total;
  let cursor = 0;
  for (const entry of eligible) {
    cursor += entry.weight;
    if (roll < cursor) return entry;
  }
  // Floating-point residue at the very top of the range: the last one owns it.
  return eligible[eligible.length - 1]!;
}

/** Everything the draw is keyed on that is not the situation itself. */
export type StagedResolutionAct = {
  readonly campaignSeed: string;
  readonly actor: NationId;
  readonly target: NationId;
  readonly instrument: InstrumentId;
  readonly rung: RungLevel;
  readonly turn: number;
};

function seedPartsFor(act: StagedResolutionAct): readonly string[] {
  return [act.campaignSeed, "resolution-sequence", act.actor, act.target, act.instrument, String(act.rung), String(act.turn)];
}

/**
 * The staged reading of one resolved act, spread straight into the result.
 *
 * An empty object rather than an undefined key, so a resolution nobody banked a
 * sequence for hands back exactly the object it always did.
 */
export function stagedResolutionFor(
  act: StagedResolutionAct,
  valence: ConsequenceValence,
  riskId: string | undefined,
  pool: readonly ResolutionSequenceEntry[] | undefined,
): { readonly staged?: StagedResolution } {
  if (!pool || pool.length === 0) return {};
  const situation: ResolutionSequenceSituation = {
    instrument: act.instrument,
    rungBand: rungBand(act.rung),
    valence,
    ...(riskId === undefined ? {} : { riskId }),
  };
  const seedParts = seedPartsFor(act);
  const chosen = selectResolutionSequence(pool, situation, seedParts.join(":"));
  if (!chosen) return {};
  return { staged: { sequenceId: chosen.id, situationKey: resolutionSituationKey(situation), seedParts } };
}

// --- The wire desk's reading ---

/**
 * What the rendered sequence turned out to have named.
 *
 * The designation arrives from the caller rather than being drawn here. The
 * constraint a step's verbs put on the draw is authored beside the line, on the
 * content side, and an engine that generated its own unit would name a
 * different one than the sequence the player just watched.
 */
export type StagedResolutionReport = {
  readonly act: StagedResolutionAct;
  readonly valence: ConsequenceValence;
  /** The two governments as the roster displays them. */
  readonly actorName: string;
  readonly targetName: string;
  /** Whether this administration is the one that moved. */
  readonly byPlayer: boolean;
  /** Whether anyone outside the building learned it happened. */
  readonly visible: boolean;
  /** The formation the sequence named, absent when no step named one. */
  readonly unit?: string;
};

const HEADLINE: Readonly<Record<ConsequenceValence, (subject: string, move: string, target: string) => string>> = {
  success: (subject, move, target) => `${subject} finished ${move} in ${target}.`,
  partial: (subject, move, target) => `${subject} came out of ${move} in ${target} short of the order.`,
  failure: (subject, move, target) => `${subject} did not bring ${move} in ${target} off.`,
};

/**
 * The wire's one line about a staged act, naming the formation that carried it.
 *
 * A hook, not an emission: it builds a FeedItem and stops there. Whether the
 * week reports this is the caller's call, and the item lands the way every
 * other feed write lands — through a packet — rather than by a second path out
 * of the resolver.
 */
export function stagedResolutionFeedItem(report: StagedResolutionReport): FeedItem {
  const { act } = report;
  // No formation named means no sequence step named one, and the government
  // itself is then the only honest subject the line has.
  const subject = sentenceCase(report.unit ?? wireName(report.actorName));
  const headline = HEADLINE[report.valence](subject, movePhrase(act.instrument, act.rung), wireName(report.targetName));
  const catalogueName = rungCatalogueName(act.instrument, act.rung);
  return {
    turn: act.turn,
    kind: report.byPlayer ? "player-action" : "npc-action",
    visibility: report.visible ? "public" : "intelligence",
    headline,
    actor: act.actor,
    target: act.target,
    facts: {
      ...(report.unit === undefined ? {} : { subject: report.unit }),
      ...(catalogueName === undefined ? {} : { instrument: catalogueName }),
    },
  };
}
