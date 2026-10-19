import { INSTITUTION_KINDS } from "./audit-lexicon.js";
import { NearDuplicateIndex } from "./corpus/near-duplicate.js";
import { PLACE_TOKEN_NAMES } from "./scenario-text.js";
import type { Passage, PassageFindingKind } from "./passage-audit.js";
import type { ScenarioDef, ScenarioReply } from "./scenario.js";
import type { ExecutiveFindingKind } from "./scenario-oversight.js";
import type { GroundingFindingKind } from "./scenario-grounding.js";
import type { ReadoutFindingKind } from "./scenario-audit-readout.js";
import type { TimeFindingKind } from "./scenario-audit-time.js";

// The audit's contract: what a finding is, the length and stakes thresholds
// the rules measure against, and the small reply-weight helpers those
// thresholds are read through. Split out of `scenario-audit.ts`, which
// re-exports every public name here — the studio CLI, the generation brief and
// the other content audits all still resolve them from `@admin/content`.

/**
 * The corpus a batch is landing in. Both halves are indexes rather than the
 * content itself, so validating a batch against a five-figure corpus costs the
 * batch's size, not the corpus's.
 */
export type CorpusContext = {
  /** Every id already shipped, so a batch cannot re-use one. */
  readonly installedIds?: Iterable<string>;
  /** The near-duplicate index of everything already shipped. */
  readonly overlapIndex?: NearDuplicateIndex;
  /**
   * Every flag the shipped corpus's conditions gate on. The read half of the
   * flag economy, mirroring the write half the gate already takes as
   * `knownFlags`: a batch's promise (a reply announcing a review) is kept if
   * anything reads the flag it stamps, and "anything" has to include the
   * corpus the batch is landing in, not just the batch itself.
   */
  readonly readFlags?: Iterable<string>;
  /**
   * Every family the shipped corpus already opens. An arc is normally written
   * across several batches, so an opener that shipped last month is a perfectly
   * good door for a beat shipping today — without this index the gate would
   * refuse every continuation of an existing arc.
   */
  readonly familyOpeners?: Iterable<string>;
  /**
   * Every family the shipped corpus already closes, for the same reason: an
   * opener shipping today may be answered by a close that shipped last month.
   */
  readonly familyCloses?: Iterable<string>;
  /**
   * Five-word runs the shipped corpus already carries, and how many scenarios
   * carry each. The third index, and the one that closes `stock-phrasing`'s
   * blind spot: the rule counts carriers within whatever set it is handed, so a
   * batch borrowing a phrase from the *corpus* was invisible to a batch gate
   * however carefully it was run.
   *
   * Only runs at or above `PHRASE_INDEX_FLOOR` carriers are worth shipping in
   * this index, which is what makes it an index rather than a copy of the
   * corpus — see that constant for the measurement and for the one case the
   * cut deliberately gives up.
   */
  readonly phraseCarriers?: Iterable<readonly [string, number]>;
};

// The gate a scenario clears before it may ship, mirroring the engine's
// runtime gate but running where it belongs for generated content: over the
// whole pack, in CI and in the publish pipeline, before a player ever loads
// it. The runtime gate stays as the last line; this one is the cheap one.
//
// An error is a defect the pack cannot ship with. A warning is a smell worth
// a writer's attention that should not stop a publish — the distinction
// exists so soft, threshold-shaped rules can be useful without holding a
// pack hostage to a heuristic.

export type ScenarioFindingKind =
  | PassageFindingKind
  | "single-tone"
  | "costless-position"
  | "indistinct-replies"
  | "unknown-placeholder"
  | "generic-subject"
  | "ungated-institution-token"
  // Premise and binding, answered in scenario-audit-premise.ts.
  | "premise-class-ungated"
  | "ungated-organization-token"
  | "ungated-tariff-token"
  | "domestic-incoherence"
  | "implausible-host"
  | "inert-boost"
  | "ungrounded-conflict-move"
  | "ungrounded-join"
  | "ungrounded-report"
  | "ungrounded-command"
  | "ungrounded-transmission"
  | "classified-report-disclosure"
  | ReadoutFindingKind
  | "ungrounded-state-grievance"
  | "undeclared-set-piece"
  | "pointless-set-piece"
  | "duplicate-reply-id"
  | "duplicate-scenario-id"
  | "flag-condition-never-set"
  | "template-overlap"
  | "duty-log-opening"
  | "manufactured-clock"
  | "severity-monotone"
  | "unnamed-capability"
  | "shallow-stakes"
  | "token-position"
  | "dominated-reply"
  | "all-downside"
  | "island-pack"
  | "tone-tuple-monoculture"
  | "opening-framing-monoculture"
  | "condition-coverage-thin"
  | "flag-economy-imbalance"
  | "callback-never-ripens"
  | "callback-concentration"
  | "dilemma-shape-monoculture"
  | "motif-monoculture"
  | "stock-phrasing"
  // Words the game uses about itself, reaching a player who was never taught them.
  | "insider-shorthand"
  // A decision briefed with no quantity anywhere in it.
  | "briefing-without-a-figure"
  // Authored prose asserting a geography the locus resolver decides.
  | "locus-asserts-landform"
  // A cast scenario pinned onto the player's own soil while its prose stands on
  // the counterpart's: the map says Washington and the sentence says occupation.
  | "locus-ground-mismatch"
  | "unplaced-domestic"
  // Plant/factory/tax-holiday copy that names a stand-in metro instead of {{city}}.
  | "generic-place"
  // A coast, harbor, ship or navy on the counterpart's ground with no gate on the counterpart having a coast.
  | "coastal-counterpart-ungated"
  // A real US city in the prose of a week set in the field with no city bound to the map.
  | "unplaced-city-name"
  // A city gazetteer recipe with no locus.city to apply it to.
  | "city-effect-unplaced"
  // A domestic week with locus.state whose replies never route (no gazetteer, no domestic).
  | "unrouted-domestic-act"
  // A trade act stated in a reply's words, answered in scenario-audit-trade.ts.
  | "unrouted-trade-act"
  | "trade-act-terms-mismatch"
  | "unstated-trade-act"
  | "unplaced-domestic-signature"
  | "dead-grievance-gate"
  | "unnamed-group-toll"
  | "cohort-toll-implausible"
  | "dead-cohort-gate"
  // Domestic economy bound to a city that never writes {{city}} in the briefing.
  | "missing-city-token"
  // locus.city set to an id the dataset does not carry, or a city whose nation
  // is not this week's ground — {{city}} stays literal and applyCity throws.
  | "unknown-city"
  // Player-facing text about the player's own government written for a
  // constitution this game does not contain.
  | "parliamentary-vocabulary"
  // Money declared louder than the week the writer said this was.
  | "financial-scale-exceeds-severity"
  | "financial-basis-without-band"
  | "financial-basis-off-band"
  | "financial-basis-incomplete"
  // A heavy authored treasury line beside an emergency-or-larger financial
  // band. The two are separate books post-split (§3) and a reply may
  // honestly carry both, so this is the pairing worth a second read rather
  // than proof of an actual double-bill — see `costAndImpactBothPriced`.
  | "financial-scale-duplicates-cost"
  // An instrument reply whose sentence commits a different rung than its number.
  | "instrument-reply-contradicts-rung"
  // A heavy answer in a loud week that the papers are given nothing to print.
  | "press-missing-on-heavy-reply"
  // A batch where who the player appointed changes nothing.
  | "cabinet-gate-unused"
  | "promised-follow-up-unread"
  // An arc's later beat with no opener anywhere: the family never pins a
  // country, so the follow-up can never be dealt at all.
  | "family-without-opener"
  // Two openers for one family: the second can only ever land as a beat, so the
  // country it was written about is not the one it will arrive against.
  | "family-two-openers"
  // An opener with no close anywhere: the arc can only end by lapsing.
  | "family-without-close"
  // A week whose prose has a body count and whose answers declare no impact, so
  // the dead move nothing and the writing is decoration.
  | "impact-undeclared"
  // A declared band contradicting the author's own sentence about it.
  | "impact-contradicts-prose"
  // An impact field that prices nothing where it stands: agency or borneBy with no toll beside it.
  | "inert-impact-field"
  // A toll declared "acted-upon" and borne "abroad": the rally priced for somebody else's dead.
  | "acted-upon-abroad"
  // Whether a position's answer says anything the choice had not already said.
  // Whether it answers at all is the schema's job now, not this one's.
  | "rejoinder-restates"
  // An instrument or join rejoinder that claims to know how the attempt went.
  // It is spoken before the dice and must be true on every branch.
  | "rejoinder-presumes-outcome"
  // A chain that only comes back down one of its branches.
  | "arc-branch-unread"
  // Answered in scenario-intel.ts, beside the mechanism they are the fairness
  // half of: a briefing that can be wrong must carry its tell, and must be
  // answerable with an act, or the doubt it creates cannot be resolved by skill.
  | "intel-tell-missing"
  | "intel-doubt-unanswerable"
  // Answered in scenario-reachability.ts rather than here: it is the one rule
  // that needs a board rather than a document. The kind lives with its
  // siblings so a caller handles one finding type, not two.
  | "unreachable-scenario"
  // A condition on the player's own board that holds on every board the week
  // casts on, so it gates nothing; see scenario-audit-inert-gate.ts.
  | "inert-gate"
  // A cabinet speaker hinted "lead" in an opening or rejoinder. The schema
  // narrows a speaker's roleHint to exclude "lead" (see `ScenarioSpeakerRoleHint`
  // in scenario.ts), so a well-typed ScenarioDef cannot carry one — this rule
  // is the second line of defense for content built outside that type, e.g. by
  // hand, by an older generator, or read back off disk before it is re-parsed.
  | "lead-speaker-addresses-self"
  // A topic outside the closed vocabulary. `topics` is a zod enum, so a
  // well-typed ScenarioDef cannot carry one — this is the same second line
  // of defense as `lead-speaker-addresses-self`, for content built or edited
  // outside that type (hand-authored JSON, an older generator, a value read
  // back off disk before it is re-parsed).
  | "topic-tag-unknown"
  // An entity id outside the closed registry. `entities` is a zod enum, so a
  // well-typed ScenarioDef cannot carry one — this is the same second line
  // of defense as `topic-tag-unknown`, for content built or edited outside
  // that type (hand-authored JSON, an older generator, a value read back off
  // disk before it is re-parsed).
  | "unknown-entity"
  // Every gate on the executive branch's own state, answered beside the
  // condition kinds they guard in scenario-institutions.ts and
  // scenario-oversight.ts, and named there so a caller still handles one
  // finding type. "unknown-institution" among them is the same second line of
  // defense as "unknown-entity", for content built or edited outside the type.
  | ExecutiveFindingKind
  // The seam between the writing and the game, answered in
  // scenario-grounding.ts beside the doctrine sections (§6.1, §6.2) it enforces.
  | GroundingFindingKind
  // Commit-time copy narrating weeks or months that have not passed yet,
  // answered in scenario-audit-time.ts.
  | TimeFindingKind
  // A speaker briefing on a matter their department does not own, answered in
  // scenario-audit-speakers.ts.
  | "speaker-department-mismatch"
  // The three binding rules, answered in scenario-audit-bind.ts. All warnings:
  // each is a scenario that will play and will read slightly wrong, not one the
  // board cannot resolve.
  //
  // `unbound-disaster` is a scenario about a live condition whose locus rolls its
  // own place, so the week can open in a state that is not affected.
  // `narrated-vacancy` is prose that names a chair the scenario does not gate on
  // being filled. `season-literal` is a month or a season written into the prose
  // instead of gated on the calendar, which reads wrong the first time the gate
  // fires in the other half of the year.
  | "unbound-disaster"
  | "narrated-vacancy"
  | "season-literal";

export type ScenarioFindingSeverity = "error" | "warning";

export type ScenarioFinding = {
  readonly kind: ScenarioFindingKind;
  readonly severity: ScenarioFindingSeverity;
  readonly scenario: string;
  readonly message: string;
};

// The binder's whole vocabulary: the counterpart and player identity tokens,
// plus one token per institution kind, filled from the founding charter.
export const PLACEHOLDERS: readonly string[] = [
  "counterpart",
  "counterpartAdjective",
  "leader",
  "title",
  "nation",
  // The congressional caucuses by name, across from and beside the administration.
  "opposition",
  "oppositionAdjective",
  "caucus",
  "caucusAdjective",
  // The place tokens come from the binder's own list, so a token it fills is
  // never refused here and a token registered here is never left blank.
  ...PLACE_TOKEN_NAMES,
  ...INSTITUTION_KINDS,
];

/**
 * Ceilings per field rather than one number for all copy: a subject is a
 * headline, a beat is a paragraph, and a reply is something a leader says out
 * loud in one breath. Exported so the generation brief quotes the numbers the
 * validator actually enforces instead of a remembered copy of them.
 */
export const LENGTH_CEILINGS = {
  subject: 70,
  beat: 400,
  reply: 160,
  remembered: 220,
  press: 130,
  locus: 90,
  // Shorter than a beat on purpose. A transmission is a document read aloud in the
  // room, and the ones that land are the short ones — a government that needed
  // four paragraphs to make its threat was not making a threat.
  transmission: 320,
} as const;

/**
 * What a writer is aiming for, under the ceiling and well over the schema's
 * refusal floor (`LENGTH_FLOORS`). Copy between the floor and the target parses
 * and ships; it just reads thin — a beat that states the situation without
 * setting a scene, a reply that picks a side without saying anything a person
 * would say out loud. That is a judgment about writing, not a defect, so it is
 * a warning: at corpus scale it is the signal that tells a reviewer which of
 * seven hundred scenarios to read first.
 *
 * A subject has no target. A headline earns its force by being short, and the
 * ceiling is the only bound worth putting on one.
 */
export const LENGTH_TARGETS = { beat: 90, reply: 70, remembered: 80, press: 50, locus: 30, transmission: 110 } as const;

export function passages(def: ScenarioDef): readonly Passage[] {
  return [
    { label: "subject", text: def.subject },
    { label: "locus", text: def.locus.descriptor },
    // Label and value audited as one passage: a real nation's name is just as
    // disqualifying in either half, and splitting them would double the noise.
    ...(def.particulars ?? []).map((particular, index) => ({
      label: `particular[${index}]`,
      text: `${particular.label}: ${particular.value}`,
    })),
    // The standing brief is player copy like any other passage. Left out, a
    // context block could name a real country, quote a real outlet or drift out
    // of register — under a gate that reads every other sentence in the file.
    ...(def.context
      ? [
          { label: "context.standing", text: def.context.standing },
          { label: "context.precedent", text: def.context.precedent },
          { label: "context.inaction", text: def.context.inaction },
          { label: "context.unknown", text: def.context.unknown },
          ...def.context.pressures.map((pressure, index) => ({
            label: `context.pressures[${index}]`,
            text: pressure.want,
          })),
        ]
      : []),
    ...def.opening.map((beat, index) => ({ label: `opening[${index}]`, text: beat.text })),
    // A transmission is player copy like any other. It reaches the screen down a
    // different path than the thread does, which is exactly why it has to be
    // audited on the same pass — copy that skips the language gates is copy
    // that eventually ships a real country's name in a foreign cable.
    ...(def.transmission
      ? [
          { label: "transmission", text: def.transmission.text },
          { label: "transmission attribution", text: def.transmission.attribution },
        ]
      : []),
    ...def.replies.flatMap((reply) => [
      { label: `reply "${reply.id}"`, text: reply.text },
      ...(reply.press ? [{ label: `press for "${reply.id}"`, text: reply.press }] : []),
      ...(reply.commitment.kind === "position"
        ? [{ label: `remembered for "${reply.id}"`, text: reply.commitment.remembered }]
        : []),
      // A rejoinder is spoken in the room, whichever commitment it follows, so
      // it is a beat and audited as one: same neutrality, same register, same
      // length ceiling as any other line a chair says out loud.
      ...(reply.commitment.rejoinder
        ? [{ label: `rejoinder for "${reply.id}"`, text: reply.commitment.rejoinder.text }]
        : []),
    ]),
  ];
}

export type LengthField = keyof typeof LENGTH_CEILINGS;

export function fieldFor(label: string): LengthField {
  if (label === "subject") return "subject";
  // The standing brief is prose in the register of a beat, not a spoken reply.
  // Read against the reply ceiling it refused every context block ever written.
  if (label.startsWith("context.pressures")) return "reply";
  if (label.startsWith("context.")) return "beat";
  if (label === "locus") return "locus";
  if (label.startsWith("opening")) return "beat";
  if (label.startsWith("press")) return "press";
  if (label.startsWith("remembered")) return "remembered";
  if (label.startsWith("rejoinder")) return "beat";
  if (label.startsWith("transmission")) return "transmission";
  return "reply";
}

// A scenario that pins a nation is a declared, owned exception; everything
// else has to survive being cast onto whichever nation the live board picks,
// so it may not name a country, quote a country's figures, or assume a
// charter. The declaration is the difference, not the cast.
export function isDeclaredSetPiece(def: ScenarioDef): boolean {
  return def.setPiece !== undefined;
}

/**
 * The depth floor. The language gates keep a batch clean; these keep it a
 * game. A generator held only to prohibitions learns that the cheapest way
 * through is a set of near-zero, all-loss, interchangeable answers — every
 * one of them valid, none of them a decision. Exported so the generation
 * brief quotes the numbers the validator actually enforces.
 *
 * `heavy*` is what makes one reply a door the player is afraid of: an
 * instrument at the rung where it stops being a gesture, a metric move a
 * player can feel, a treasury line worth a cabinet argument, or an alignment
 * pull that changes who this government is. `token*` is the other end: a
 * position under every one of those thresholds that also stamps no flag has
 * no consequence of any kind, and "reply that does nothing" is a defect, not
 * a style.
 */
export const STAKES_FLOORS = {
  heavyRung: 3,
  heavyMetric: 0.04,
  heavyTreasury: 60,
  heavyPull: 0.06,
  tokenMetric: 0.02,
  tokenTreasury: 20,
  tokenPull: 0.03,
} as const;

export function costEntries(reply: ScenarioReply): { metrics: number[]; treasury: number; pulls: number[] } {
  if (reply.commitment.kind !== "position") return { metrics: [], treasury: 0, pulls: [] };
  const { treasury = 0, ...rest } = reply.commitment.cost;
  return {
    metrics: Object.values(rest).filter((value): value is number => value !== undefined),
    treasury,
    pulls: Object.values(reply.commitment.pull ?? {}).filter((value): value is number => value !== undefined),
  };
}

export function isHeavy(reply: ScenarioReply): boolean {
  if (reply.commitment.kind === "instrument") return reply.commitment.rung >= STAKES_FLOORS.heavyRung;
  if (reply.commitment.kind === "position" && (reply.commitment.relief || reply.commitment.localeAct || reply.commitment.transmit ||
    reply.commitment.tariff || reply.commitment.tariffLift || reply.commitment.directive || reply.commitment.billText || reply.commitment.judicialNomination || reply.commitment.orderRescission || reply.commitment.orderReview)) return true;
  const { metrics, treasury, pulls } = costEntries(reply);
  return (
    metrics.some((value) => Math.abs(value) >= STAKES_FLOORS.heavyMetric) ||
    Math.abs(treasury) >= STAKES_FLOORS.heavyTreasury ||
    pulls.some((value) => Math.abs(value) >= STAKES_FLOORS.heavyPull) ||
    // A declared impact carries weight the authored-cost fields cannot see.
    // Without this, a scenario whose expensive door is "hundreds dead, ours"
    // reads to the stakes rule as a week where nothing was at issue.
    impactWeight(reply) >= STAKES_FLOORS.heavyMetric
  );
}

export function isToken(reply: ScenarioReply): boolean {
  if (reply.commitment.kind !== "position") return false;
  if (reply.commitment.collection) return false;
  if (reply.commitment.relief) return false;
  if (reply.commitment.localeAct) return false;
  if (reply.commitment.transmit) return false;
  if (reply.commitment.tariff || reply.commitment.tariffLift || reply.commitment.directive || reply.commitment.billText || reply.commitment.judicialNomination || reply.commitment.orderRescission || reply.commitment.orderReview) return false;
  if (reply.sets && reply.sets.length > 0) return false;
  const { metrics, treasury, pulls } = costEntries(reply);
  return (
    metrics.every((value) => Math.abs(value) < STAKES_FLOORS.tokenMetric) &&
    Math.abs(treasury) < STAKES_FLOORS.tokenTreasury &&
    pulls.every((value) => Math.abs(value) < STAKES_FLOORS.tokenPull)
  );
}

/** The board behavior used to reject two differently worded copies of one answer. */
export function outcomeFingerprint(reply: ScenarioReply): string {
  const sets = [...(reply.sets ?? [])].sort().join(",");
  if (reply.commitment.kind === "instrument") return `instrument:${reply.commitment.instrument}:${reply.commitment.rung}|${sets}`;
  if (reply.commitment.kind === "join") return `join:${reply.commitment.side}|${sets}`;
  const entries = (record: Record<string, number | undefined>) => Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`).join(",");
  return `position:${entries(reply.commitment.cost)}:${entries(reply.commitment.pull ?? {})}:${JSON.stringify(reply.commitment.collection ?? null)}:${Boolean(reply.commitment.relief)}:${reply.commitment.localeAct ?? ""}:${reply.commitment.transmit ?? ""}:${JSON.stringify(reply.commitment.tariff ?? null)}:${JSON.stringify(reply.commitment.tariffLift ?? null)}:${JSON.stringify(reply.commitment.directive ?? null)}:${JSON.stringify(reply.commitment.billText ?? null)}:${JSON.stringify(reply.commitment.judicialNomination ?? null)}:${JSON.stringify(reply.commitment.orderRescission ?? null)}:${JSON.stringify(reply.commitment.orderReview ?? null)}|${sets}`;
}

/**
 * How many ways a reply costs something.
 *
 * Reads the declared impact as well as the authored cost, because a reply that
 * declares a human toll and an emergency appropriation is not a costless
 * decision — it is a decision whose price is computed rather than typed. Before
 * this, every scenario written the new way tripped `costless-position`, which
 * would have made the rule a reason not to migrate.
 *
 * The two are alternatives, never layers: a reply states what it spent or what
 * it did, and counting both would let one decision be billed twice.
 */
export function positionCost(reply: ScenarioReply): number {
  if (reply.commitment.kind !== "position") return 1;
  // A lawful collection command changes the standing requirement itself. Its
  // real cost is the capability and time it occupies, not an invented metric.
  if (reply.commitment.collection || reply.commitment.relief || reply.commitment.localeAct || reply.commitment.transmit ||
    reply.commitment.tariff || reply.commitment.tariffLift || reply.commitment.directive || reply.commitment.billText || reply.commitment.judicialNomination || reply.commitment.orderRescission || reply.commitment.orderReview) return 1;
  const authored = Object.values(reply.commitment.cost).filter((value) => value !== undefined && value !== 0).length;
  if (authored > 0) return authored;
  const impact = reply.commitment.impact;
  if (!impact) return 0;
  const human = impact.human ?? {};
  return (
    (human.lives !== undefined && human.lives !== "none" ? 1 : 0) +
    (human.displaced !== undefined && human.displaced !== "none" ? 1 : 0) +
    (impact.financial?.scale !== undefined && impact.financial.scale !== "none" ? 1 : 0) +
    (impact.institutional?.length ?? 0) +
    (impact.divisive ? 1 : 0)
  );
}

/**
 * Whether this reply's authored `cost.treasury` and its declared
 * `impact.financial.scale` read as one price named twice.
 *
 * Before the treasury/budget-authority split, the two books were the same
 * book, so any reply naming both was billing one decision twice by
 * construction — the corpus-wide count `docs/CONTENT_DOCTRINE.md` §3 used to
 * quote. Since the split, `cost.treasury` is what the reply obligates against
 * the administration's own authority and `impact.financial` is what it does
 * to the *bearing nation's* debt (`resolveImpact` books a `choiceBorrowing`
 * amount added to the live stock, never the President's authority) — two pots a single decision can
 * genuinely draw from at once, e.g. an order that spends a little now and
 * triggers a much larger supplemental later.
 *
 * What is still worth flagging is the pairing that reads like one price typed
 * twice rather than two real pots: a treasury line already at the heavy
 * floor sitting beside a financial band big enough to be its own emergency
 * appropriation. The schema cannot tell intent apart from coincidence, so
 * this is read as a warning for a reviewer, never a refusal — see
 * `docs/CONTENT_DOCTRINE.md` §3.
 */
export function costAndImpactBothPriced(reply: ScenarioReply): boolean {
  if (reply.commitment.kind !== "position") return false;
  const treasury = reply.commitment.cost.treasury;
  const scale = reply.commitment.impact?.financial?.scale;
  if (treasury === undefined || scale === undefined || scale === "none") return false;
  return Math.abs(treasury) >= STAKES_FLOORS.heavyTreasury && (scale === "emergency" || scale === "structural");
}

/**
 * How heavy the heaviest thing this reply does is, on the 0..1 scale the stakes
 * rule reads. Mirrors the impact model's own ordering without importing its
 * tables — the audit asks whether an option is expensive, not what it costs.
 */
export function impactWeight(reply: ScenarioReply): number {
  if (reply.commitment.kind !== "position") return 0;
  const impact = reply.commitment.impact;
  if (!impact) return 0;
  const livesWeight = { none: 0, isolated: 0.02, dozens: 0.05, hundreds: 0.08, thousands: 0.12, mass: 0.2 };
  const financialWeight = { none: 0, discretionary: 0.01, supplemental: 0.05, emergency: 0.09, structural: 0.12 };
  return Math.max(
    livesWeight[impact.human?.lives ?? "none"],
    financialWeight[impact.financial?.scale ?? "none"],
    (impact.institutional?.length ?? 0) >= 2 ? 0.05 : 0,
  );
}
