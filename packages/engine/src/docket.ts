import type { AlignmentVector, Campaign } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { institutionDef, type InstitutionId } from "./institutions.js";
import { campaignDay } from "./nomination.js";
import { hashFraction } from "./rng.js";
import { JUDICIAL_REVIEW_TURNS } from "./orders.js";
import { DAYS_PER_TURN } from "./turn-clock.js";

// The regulatory docket: what a rulemaking body does on its own clock,
// between the confirmations that decide who sits on it.
//
// An executive order's rulemaking (rulemaking.ts) is the President directing
// an agency to write a rule; this is a body writing one because its own
// statute told it to, on a schedule nobody in the West Wing set and nobody
// there can shorten. The two share a vocabulary — proposed, a comment
// period, a final rule, a court case that can undo it — because they are the
// same legal machinery. What is authored here rather than duplicated from
// `rulemaking.ts` is `omb-review`: centralized White House review under
// Executive Order 12866 reaches an executive agency's rule (EPA, FDA, CMS)
// and by design does not reach an independent commission's (SEC, FTC, FCC,
// CFPB, CFTC, FDIC, NRC, NLRB, the Federal Reserve) — that carve-out is the
// actual doctrine, not a simplification, and it is why the stage sequence
// below is read off the institution rather than fixed.
//
// Every item here is derived, never stored. Its identity (which body, which
// cycle), its stage on any given day, and whether it is ever challenged are
// all pure functions of the campaign's seed and the calendar, the same way
// `campaignDay` and the nomination pipeline's own clocks are. A stored
// mutable record would need a writer wired into the one mutation gate
// (`apply()` in effects.ts); a derived one needs nothing but a selector, and
// two calls with the same inputs already agree by construction, which is the
// property a save's replay depends on.

export type DocketStage = "proposed" | "omb-review" | "comment" | "final" | "litigated" | "vacated";

// Every institution whose rulemaking this module tracks — the independent
// commissions the removal mechanism cannot touch, plus the executive-branch
// regulators whose rules still run the APA's full public process even though
// the President can direct their leadership. `institutionDef` (read off the
// catalog, not duplicated here) is what tells the two apart at the OMB stage.
export const DOCKET_INSTITUTIONS: readonly InstitutionId[] = [
  "INST-SEC",
  "INST-FTC",
  "INST-FCC",
  "INST-CFPB",
  "INST-CFTC",
  "INST-FDIC",
  "INST-NRC",
  "INST-NLRB",
  "INST-FED",
  "INST-EPA",
  "INST-FDA",
  "INST-CMS",
];

// Median days in each stage before OMB review is filtered out below. Executive
// review adds roughly the ninety days Executive Order 12866 allows; the
// comment period is the APA's ordinary thirty-to-sixty-day notice, taken at
// its longer end because these are the rules controversial enough for a
// player to notice. A struck rule's case runs the same clock a challenged
// executive order's does (`JUDICIAL_REVIEW_TURNS`), so the two proceedings
// stay legible against each other.
const PROPOSED_DAYS = 30;
const OMB_REVIEW_DAYS = 90;
const COMMENT_DAYS = 60;
const LITIGATION_DAYS = JUDICIAL_REVIEW_TURNS * DAYS_PER_TURN;

/** Whether this body's rules pass through centralized White House review at all. */
function ombReviewRequired(institution: InstitutionId): boolean {
  return institutionDef(institution)?.independence !== "independent";
}

/** How long a fresh item takes to reach a final rule, for this body. */
function cycleDays(institution: InstitutionId): number {
  return PROPOSED_DAYS + (ombReviewRequired(institution) ? OMB_REVIEW_DAYS : 0) + COMMENT_DAYS;
}

// How often a body opens a fresh rulemaking. A body with no docket item in
// flight is not a body doing nothing — this is the belt's ordinary pace, one
// rulemaking at a time per agency, each waiting out the last one's court case
// before the next opens. Deliberately longer than any single cycle so the
// litigation window (below) always closes before the next item's own clock
// would otherwise overlap it.
const DOCKET_PERIOD_DAYS = 420;

/**
 * A stable, small offset per body so the whole belt does not open its first
 * rulemaking in the same week. Derived from the id rather than authored,
 * because the actual stagger does not matter — only that it differs by body,
 * the same reason `institution-catalog.ts`'s seat terms are staggered rather
 * than synchronized.
 */
function docketOffsetDays(institution: InstitutionId): number {
  return Math.floor(hashFraction(`docket-offset:${institution}`) * DOCKET_PERIOD_DAYS);
}

/**
 * How far this institution's alignment sits from the administration's own,
 * read straight off the same vector the President's own program accumulates
 * into (`player.alignments`) and a lean drawn once per item, deterministically,
 * from its own id. Independent of anything the President has done: what
 * varies the number is which rulemaking this happens to be, never who is in
 * office, because the body would be writing the same rule under any
 * administration.
 */
function itemLean(id: string): AlignmentVector {
  return {
    economicLeftRight: hashFraction(`docket-lean:economic:${id}`) * 2 - 1,
    authLibertarian: hashFraction(`docket-lean:auth:${id}`) * 2 - 1,
    nationalistGlobalist: hashFraction(`docket-lean:national:${id}`) * 2 - 1,
  };
}

function alignmentDistance(a: AlignmentVector, b: AlignmentVector): number {
  const axes = [
    a.economicLeftRight - b.economicLeftRight,
    a.authLibertarian - b.authLibertarian,
    a.nationalistGlobalist - b.nationalistGlobalist,
  ];
  return axes.reduce((total, gap) => total + Math.abs(gap), 0) / (axes.length * 2);
}

// A rule far from anything the current administration would have written is
// the kind of rule an affected industry or an opposed state attorney general
// actually sues over; one close to the administration's own program mostly
// is not, because nobody the President answers to is unhappy about it. This
// is the only place `itemLean`'s distance from the administration is read at
// all — it never touches whether or when a rule advances, only whether it
// is challenged once it lands, which is a fact about outside parties, not
// about the President.
const BASE_CHALLENGE_CHANCE = 0.12;
const CHALLENGE_DISTANCE_WEIGHT = 0.4;

export type DocketItem = {
  readonly id: string;
  readonly institution: InstitutionId;
  readonly cycle: number;
  readonly openedDay: number;
  readonly landsDay: number;
  readonly stage: DocketStage;
  readonly stageEnteredDay: number;
  readonly lean: AlignmentVector;
  readonly challenged: boolean;
  /** Set only once the item has reached `litigated`: the day the case resolves. */
  readonly resolvesDay?: number;
  /**
   * Why the President cannot move this, stated rather than left for a
   * surface to infer from an absent button. For an independent body this is
   * the whole of the President's reach; for an executive one it names the
   * lever that does exist — direction through the confirmed officer — and
   * why that is not the same as writing the rule.
   */
  readonly constraint: string;
};

const INDEPENDENT_CONSTRAINT =
  "An independent commission with for-cause removal. The President has no vote on this rulemaking and cannot direct it — only the seat that opens when a term ends.";
const EXECUTIVE_CONSTRAINT =
  "An executive agency. The President can direct it through the confirmed officer in the chair, but the rule itself is written on the agency's own statutory clock, not the President's.";

function docketConstraint(institution: InstitutionId): string {
  return institutionDef(institution)?.independence === "independent" ? INDEPENDENT_CONSTRAINT : EXECUTIVE_CONSTRAINT;
}

/** The stage and its own start day for one item, read off nothing but the calendar. */
function stageOn(
  institution: InstitutionId,
  id: string,
  openedDay: number,
  challenged: boolean,
  day: number,
): { readonly stage: DocketStage; readonly enteredDay: number } {
  const ombDays = ombReviewRequired(institution) ? OMB_REVIEW_DAYS : 0;
  const commentStarts = openedDay + PROPOSED_DAYS + ombDays;
  const landsDay = commentStarts + COMMENT_DAYS;
  const litigationEnds = landsDay + LITIGATION_DAYS;

  if (day < openedDay + PROPOSED_DAYS) return { stage: "proposed", enteredDay: openedDay };
  if (ombDays > 0 && day < openedDay + PROPOSED_DAYS + ombDays) {
    return { stage: "omb-review", enteredDay: openedDay + PROPOSED_DAYS };
  }
  if (day < commentStarts + COMMENT_DAYS) return { stage: "comment", enteredDay: commentStarts };
  if (!challenged || day >= litigationEnds) {
    // A vacated rule stays vacated for the rest of its cycle: there is
    // nothing left in the country to keep contesting once the case is over.
    const vacated = challenged && !challengeUpheld(id);
    return { stage: vacated ? "vacated" : "final", enteredDay: challenged ? litigationEnds : landsDay };
  }
  return { stage: "litigated", enteredDay: landsDay };
}

function challengeUpheld(id: string): boolean {
  // "Upheld" from the rule's own point of view: the court leaves it standing.
  // Read once per item id, so asking twice never re-rolls the case.
  return hashFraction(`docket-outcome:${id}`) >= 0.5;
}

function isChallenged(id: string, lean: AlignmentVector, administration: AlignmentVector): boolean {
  const chance = Math.min(0.9, BASE_CHALLENGE_CHANCE + alignmentDistance(lean, administration) * CHALLENGE_DISTANCE_WEIGHT);
  return hashFraction(`docket-challenge:${id}`) < chance;
}

/** The one item currently in flight (or just resolved) for this body, as of the given day. */
function docketItemAt(institution: InstitutionId, day: number, administration: AlignmentVector): DocketItem {
  const offset = docketOffsetDays(institution);
  const cycle = Math.floor((day - offset) / DOCKET_PERIOD_DAYS);
  const openedDay = offset + cycle * DOCKET_PERIOD_DAYS;
  const id = `docket:${institution}:${cycle}`;
  const lean = itemLean(id);
  const challenged = isChallenged(id, lean, administration);
  const { stage, enteredDay } = stageOn(institution, id, openedDay, challenged, day);
  const landsDay = openedDay + cycleDays(institution);
  return {
    id,
    institution,
    cycle,
    openedDay,
    landsDay,
    stage,
    stageEnteredDay: enteredDay,
    lean,
    challenged,
    ...(challenged ? { resolvesDay: landsDay + LITIGATION_DAYS } : {}),
    constraint: docketConstraint(institution),
  };
}

/** Every body's current item, for a room that wants the whole belt at once. */
export function selectActiveDocket(campaign: Campaign): readonly DocketItem[] {
  const day = campaignDay(campaign);
  return DOCKET_INSTITUTIONS.filter((institution) => campaign.institutions[institution] !== undefined).map(
    (institution) => docketItemAt(institution, day, campaign.player.alignments),
  );
}

export function selectDocketItem(campaign: Campaign, institution: InstitutionId): DocketItem | undefined {
  if (campaign.institutions[institution] === undefined) return undefined;
  return docketItemAt(institution, campaignDay(campaign), campaign.player.alignments);
}

// --- Consequences, routed through the paths that already move a campaign ---

const CHALLENGE_DEFENSE_COST = 0.00002; // ~ agency litigation cost, as a metric-scale treasury draw
const ALIGNED_LANDING_STANDING = 0.004;
const OPPOSED_LANDING_STANDING = -0.004;

/** What a landing or a vacatur does to the campaign, through registered effect kinds only. */
function docketConsequence(item: DocketItem, administration: AlignmentVector, turn: number): readonly Effect[] {
  const name = institutionDef(item.institution)?.name ?? item.institution;
  const distance = alignmentDistance(item.lean, administration);
  if (item.stage === "vacated") {
    return [
      { kind: "metric", deltas: { treasury: -Math.round(CHALLENGE_DEFENSE_COST * 1_000_000_000) } },
      {
        kind: "feed",
        items: [
          {
            turn,
            kind: "governance",
            visibility: "public",
            headline: `A court vacates ${name}'s rule; the agency's own case, not the President's — nothing here was his to defend.`,
            facts: { instrument: name },
          },
        ],
      },
    ];
  }
  // Landed. A rule close to the administration's own program reads as a
  // quiet win it did not have to spend anything to get; one far from it
  // reads as friction it cannot undo, sized the same distance either way.
  const standing = distance < 0.5 ? ALIGNED_LANDING_STANDING : OPPOSED_LANDING_STANDING;
  return [
    { kind: "metric", deltas: { standing } },
    {
      kind: "feed",
      items: [
        {
          turn,
          kind: "governance",
          visibility: "public",
          headline:
            standing > 0
              ? `${name} finalizes a rule that runs with this administration's own program.`
              : `${name} finalizes a rule the administration did not write and could not stop.`,
          facts: { instrument: name },
        },
      ],
    },
  ];
}

/**
 * The belt's own week: every body's rulemaking moves whether or not the
 * President did anything, and a landing or a vacatur this week is reported
 * the same turn it happens rather than waiting to be asked about.
 */
export const docketPhase: TurnPhase = (state: Campaign) => {
  const day = campaignDay(state);
  const lastWeek = day - DAYS_PER_TURN;
  const administration = state.player.alignments;
  const landed: string[] = [];
  const vacated: string[] = [];
  const effects: Effect[] = [];

  for (const institution of DOCKET_INSTITUTIONS) {
    if (state.institutions[institution] === undefined) continue;
    const today = docketItemAt(institution, day, administration);
    const before = docketItemAt(institution, lastWeek, administration);
    if (today.stage === before.stage) continue;
    if (today.stage !== "final" && today.stage !== "vacated") continue;
    effects.push(...docketConsequence(today, administration, state.turn));
    (today.stage === "final" ? landed : vacated).push(institutionDef(institution)?.abbr ?? institution);
  }

  if (effects.length === 0) return [];

  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      provenance: { origin: "institution", systems: ["docket"] },
      narration: { summary: docketSummary(landed, vacated) },
      effects,
    },
  ] satisfies readonly EffectPacket[];
};

function docketSummary(landed: readonly string[], vacated: readonly string[]): string {
  const parts: string[] = [];
  if (landed.length > 0) parts.push(`${landed.join(", ")} finalize${landed.length === 1 ? "s" : ""} a rule this week.`);
  if (vacated.length > 0) parts.push(`A court vacates a rule from ${vacated.join(", ")}.`);
  return parts.join(" ");
}
