import { auditFinancialBasis } from "./scenario-audit-cost.js";
import {
  CLOCK_TIME, COUNTDOWN_PHRASES, GENERIC_MINISTER_PATTERN, GENERIC_SUBJECT_PHRASES,
  INSTITUTION_KINDS, OPERATIONAL_COUNT, PROCESS_ANNOUNCEMENT, UNNAMED_CAPABILITY, phraseIn,
  ROUTINE_OPERATIONS_NOUNS, UNIVERSAL_INSTITUTION_KINDS,
} from "./audit-lexicon.js";
import { auditPassageLanguage, auditPassageNeutrality, excerpt, type PassageEmit } from "./passage-audit.js";
import { NearDuplicateIndex, jaccard } from "./corpus/near-duplicate.js";
import { DESK_FLAG_PREFIX, ENGINE_STATE_FLAGS, engineOwnedFlag } from "./scenario-deeds.js";
import { auditIntelConfidence } from "./scenario-intel.js";
import { scenarioFiredFlag, type Motif, type ScenarioDef, type ScenarioReply } from "./scenario.js";
import { auditTopicTags } from "./scenario-topics.js";
import { auditExecutiveStateGates } from "./scenario-oversight.js";
import { auditEntities } from "./entity-registry.js";
import { auditArcBranchCoverage, auditFamilies } from "./scenario-audit-arcs.js";
import { auditFlagEconomy, auditGrounding, auditGroundingBatch } from "./scenario-grounding.js";
import {
  auditCohortTollImplausible, auditDeadCohortGate, auditDeadGrievanceGate, auditStateGrievance,
  auditUnnamedGroupToll, auditUnplacedDomesticSignature, auditUnroutedDomesticAct, type FindingSink,
} from "./scenario-audit-cohorts.js";
import { auditReadout } from "./scenario-audit-readout.js";
import {
  auditActedUponToll, auditImpactDeclared, auditImpactMatchesProse, auditInertImpactFields,
} from "./scenario-audit-impact.js";
import { auditTimeFraming } from "./scenario-audit-time.js";
import {
  auditCityEffectUnplaced, auditCoastalCounterpart, auditGenericPlace, auditUnplacedCity, auditLocusGround, auditLocusLandform, auditMissingCityToken,
  auditUnknownCity, auditUnplacedDomestic,
} from "./scenario-audit-place.js";
import { auditSpeakerDepartments } from "./scenario-audit-speakers.js";
import { auditBindings } from "./scenario-audit-bind.js";
import { auditCollectionReport } from "./scenario-audit-report.js";
import { auditScenarioCommands } from "./scenario-audit-command.js";
import { auditLegislativeTransmission } from "./scenario-audit-legislation.js";
import { auditPremiseBinding } from "./scenario-audit-premise.js";
import { auditStockPhrasing } from "./scenario-audit-phrasing.js";
import {
  CABINET_GATE_BATCH_FLOOR, CABINET_GATE_SHARE_FLOOR, cabinetGatedCount, committedRungName,
  parliamentaryHits, readRungVocabulary, scaleExceedsSeverity, SEVERITY_SCALE_CEILING,
} from "./scenario-vocabulary.js";

export * from "./scenario-audit-contract.js";
export { statedTollIn } from "./scenario-audit-impact.js";
export * from "./scenario-audit-time.js";
import {
  costAndImpactBothPriced,
  costEntries,
  fieldFor,
  isDeclaredSetPiece,
  isHeavy,
  isToken,
  LENGTH_CEILINGS,
  passages,
  PLACEHOLDERS,
  LENGTH_TARGETS,
  positionCost,
  outcomeFingerprint,
  STAKES_FLOORS,
  type CorpusContext,
  type ScenarioFinding,
  type ScenarioFindingKind,
  type ScenarioFindingSeverity,
} from "./scenario-audit-contract.js";

function make(kind: ScenarioFindingKind, severity: ScenarioFindingSeverity, scenario: string, message: string): ScenarioFinding {
  return { kind, severity, scenario, message };
}

function emitter(def: ScenarioDef, findings: ScenarioFinding[]): PassageEmit<ScenarioFindingKind> {
  return (kind, severity, message) => findings.push(make(kind, severity, def.id, message));
}

function auditLanguage(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const emit = emitter(def, findings);
  for (const passage of passages(def)) {
    // A particular is a data field, not prose: figures are its native tongue,
    // and its lengths are the schema's business, not a writing judgment.
    const isParticular = passage.label.startsWith("particular");
    // An attribution is a label — "their foreign ministry" — not prose. It is
    // held to every language rule and to none of the length ones, for the same
    // reason a particular is: there is no thin or overlong way to name an
    // office, and the schema already bounds it.
    const isLabel = isParticular || passage.label === "transmission attribution";
    const field = fieldFor(passage.label);
    auditPassageLanguage(
      passage,
      {
        placeholders: [...PLACEHOLDERS, ...(def.subjects ?? []).map((slot) => slot.key)],
        placeholderKind: "unknown-placeholder",
        numerals: !isParticular,
        ceiling: isLabel ? undefined : LENGTH_CEILINGS[field],
        target: field === "subject" || isLabel ? undefined : LENGTH_TARGETS[field],
      },
      emit,
    );
  }
  const mush = phraseIn(def.subject, GENERIC_SUBJECT_PHRASES);
  if (mush) {
    findings.push(
      make("generic-subject", "error", def.id, `the subject says a scenario is happening rather than which one: "${mush}"`),
    );
  }
}

// The country-bleed family. The question is "does this survive being cast onto
// any nation under any charter", not "does this name a US institution". A
// declared set-piece is the one exception, and it has an owner.
function auditWorldNeutrality(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const emit = emitter(def, findings);
  const allowNationNames = isDeclaredSetPiece(def);
  for (const passage of passages(def)) auditPassageNeutrality(passage, { allowNationNames }, emit);
}

// `{{assembly}}` always resolves — every charter has one, and the dataset
// validator keeps it that way. The other institution tokens are only sometimes
// real: a junta has no independent court, a confederal council no single
// executive seat. A scenario that writes one without gating on it would
// eventually reach a player with the raw token still in the sentence, so it
// has to declare the government it is talking about.
function auditInstitutionTokens(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const gated = new Set(
    def.conditions.filter((c) => c.kind === "charterInstitution" && c.present).map((c) => (c as { institution: string }).institution),
  );
  const seen = new Set<string>();
  for (const { label, text } of passages(def)) {
    for (const match of text.matchAll(/\{\{\s*([a-zA-Z]+)\s*\}\}/g)) {
      const token = match[1]!;
      if (!INSTITUTION_KINDS.includes(token as (typeof INSTITUTION_KINDS)[number])) continue;
      if (UNIVERSAL_INSTITUTION_KINDS.includes(token as (typeof INSTITUTION_KINDS)[number])) continue;
      if (gated.has(token) || seen.has(token)) continue;
      seen.add(token);
      findings.push(
        make(
          "ungated-institution-token",
          "error",
          def.id,
          `${label} names {{${token}}}, which not every charter has — condition on charterInstitution "${token}" present, or the token reaches a player unfilled`,
        ),
      );
    }
  }
}

function auditPlayability(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const error = (kind: ScenarioFindingKind, message: string) => findings.push(make(kind, "error", def.id, message));
  if (new Set(def.replies.map((reply) => reply.tone)).size < 2) {
    error("single-tone", "every reply strikes the same tone: not a choice");
  }
  for (const reply of def.replies) {
    if (positionCost(reply) === 0) error("costless-position", `reply "${reply.id}" costs nothing: no costless decisions reach a player`);
    if (costAndImpactBothPriced(reply)) {
      findings.push(
        make(
          "financial-scale-duplicates-cost",
          "warning",
          def.id,
          `reply "${reply.id}" carries a heavy treasury cost beside an emergency-or-larger financial band — confirm these are two different pots of money, not one price named twice`,
        ),
      );
    }
  }
  const seenIds = new Set<string>();
  const seenOutcomes = new Map<string, string>();
  for (const reply of def.replies) {
    if (seenIds.has(reply.id)) error("duplicate-reply-id", `reply id "${reply.id}" appears twice`);
    seenIds.add(reply.id);

    const fingerprint = outcomeFingerprint(reply);
    const twin = seenOutcomes.get(fingerprint);
    if (twin) error("indistinct-replies", `replies "${twin}" and "${reply.id}" resolve identically: two ways to say the same thing`);
    else seenOutcomes.set(fingerprint, reply.id);
  }
}

// The stakes gates. Costlessness per reply was already refused; these refuse
// the subtler failure the corpus actually exhibited — every reply valid,
// every reply trivial, the whole decision a choice between rounding errors.
function auditStakes(def: ScenarioDef, findings: ScenarioFinding[]): void {
  // A routine week is not a crisis and is not supposed to have an expensive
  // door. The severity enum says so in as many words — a budget squabble, an
  // appointment, a provincial complaint — and THE BEAT exists to write them.
  // Demanding a heavy option of every scenario is what pushed ordinary weeks
  // into manufacturing one, which is the tell the register audit then catches
  // one rule later. `costless-position` still holds the floor: a routine week
  // must cost something, it just need not cost a great deal.
  if (def.severity !== "routine" && !def.replies.some(isHeavy)) {
    findings.push(
      make(
        "shallow-stakes",
        "error",
        def.id,
        `no reply commits heavily: nothing reaches instrument rung ${STAKES_FLOORS.heavyRung}, ` +
          `moves a metric by ${STAKES_FLOORS.heavyMetric}, spends ${STAKES_FLOORS.heavyTreasury} of treasury, ` +
          `or pulls alignment by ${STAKES_FLOORS.heavyPull} — a crisis with no expensive door is not a crisis`,
      ),
    );
  }
  for (const reply of def.replies) {
    if (isToken(reply)) {
      findings.push(
        make(
          "token-position",
          "error",
          def.id,
          `reply "${reply.id}" moves nothing a player can feel and stamps no flag — it neither costs nor is remembered`,
        ),
      );
    }
  }
  // Dominance is only decidable when two positions differ in nothing but
  // their metric costs: same flags, same pulls, neither making news. Then a
  // reply that is at least as good on every metric and better on one is the
  // other reply with the downside removed — a free lunch wearing a tone.
  const comparable = def.replies.filter(
    (reply): reply is ScenarioReply & { commitment: { kind: "position" } } =>
      reply.commitment.kind === "position" && !reply.press,
  );
  const key = (reply: ScenarioReply) =>
    [...(reply.sets ?? [])].sort().join(",") +
    "|" +
    (reply.commitment.kind === "position"
      ? `${JSON.stringify({ collection: reply.commitment.collection, relief: reply.commitment.relief,
          localeAct: reply.commitment.localeAct, transmit: reply.commitment.transmit,
          tariff: reply.commitment.tariff, tariffLift: reply.commitment.tariffLift, directive: reply.commitment.directive,
          billText: reply.commitment.billText, judicialNomination: reply.commitment.judicialNomination,
          orderRescission: reply.commitment.orderRescission, orderReview: reply.commitment.orderReview })}:` + Object.entries(reply.commitment.pull ?? {})
          .filter(([, value]) => value !== undefined && value !== 0)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([axis, value]) => `${axis}=${value}`)
          .join(",")
      : "");
  const METRICS = ["treasury", "stability", "militaryReadiness", "standing"] as const;
  for (let i = 0; i < comparable.length; i += 1) {
    for (let j = i + 1; j < comparable.length; j += 1) {
      const a = comparable[i]!;
      const b = comparable[j]!;
      if (key(a) !== key(b)) continue;
      const costA = a.commitment.cost as Record<string, number | undefined>;
      const costB = b.commitment.cost as Record<string, number | undefined>;
      const diffs = METRICS.map((metric) => (costA[metric] ?? 0) - (costB[metric] ?? 0));
      if (diffs.every((d) => d >= 0) && diffs.some((d) => d > 0)) {
        findings.push(
          make("dominated-reply", "error", def.id, `reply "${b.id}" is "${a.id}" with extra downside and nothing gained — no one would ever pick it`),
        );
      } else if (diffs.every((d) => d <= 0) && diffs.some((d) => d < 0)) {
        findings.push(
          make("dominated-reply", "error", def.id, `reply "${a.id}" is "${b.id}" with extra downside and nothing gained — no one would ever pick it`),
        );
      }
    }
  }
  // Pure loss in every direction is a punishment screen, not a dilemma. Only
  // a smell — a tragedy may honestly offer nothing to gain — so it warns.
  const positions = def.replies.filter((reply) => reply.commitment.kind === "position");
  const hasInstrument = def.replies.some((reply) => reply.commitment.kind === "instrument");
  if (!hasInstrument && positions.length >= 2) {
    const anyGain = positions.some((reply) => {
      if (reply.commitment.kind === "position" && (reply.commitment.relief || reply.commitment.localeAct === "relief")) return true;
      const { metrics, treasury } = costEntries(reply);
      if (metrics.some((value) => value > 0) || treasury > 0) return true;
      // An impact can carry upside too, and the two that do are the two a
      // government actually banks: credit earned with an ally, and relief the
      // public can see arriving. Without this the rule reads every
      // impact-declared scenario as a punishment screen.
      const impact = reply.commitment.kind === "position" ? reply.commitment.impact : undefined;
      if (!impact) return false;
      const scale = impact.financial?.scale;
      return (
        (impact.institutional ?? []).includes("alliance-credit-earned") ||
        scale === "emergency" ||
        scale === "supplemental"
      );
    });
    if (!anyGain) {
      findings.push(
        make("all-downside", "warning", def.id, "every reply is pure loss: nothing anywhere to gain, so the choice is only damage triage"),
      );
    }
  }
}

/**
 * The altitude rule: a head of government is not opened with a duty log.
 *
 * "The dockers did not clock on at six, every container quay in this country
 * is stopped, and the vote is called for two this afternoon" is accurate,
 * concrete, and the wrong register — it is a watch officer reading their shift
 * notes to a president who is waiting to be told what is at stake. The facts
 * belong in the scene; they do not belong in the sentence the room opens with.
 *
 * Two independent signals are required, in the *first sentence* only, and both
 * of them narrow. A clock reading alone is not the defect: "they shot down one
 * of our planes at dawn" opens on an act of war and is exactly right. What
 * makes it a duty log is a clock reading *plus* the vocabulary of a working
 * day — a shift, a roster, a count of depots — with no consequence between
 * them. Requiring both is what keeps the rule off good writing.
 *
 * It warns rather than errors, and that is deliberate rather than timid. The
 * underlying judgment is a craft judgment about what a sentence is *doing*,
 * which no pattern decides; what this measures is a proxy that correlates with
 * it. A warning routes the scenario to the review tier, where a person reads
 * it — which is the honest place for a judgment of this kind. The hard version
 * of the rule is stated in the brief, where it shapes what gets written in the
 * first place.
 */
function auditBriefingRegister(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const opening = def.opening[0];
  if (!opening) return;
  const firstSentence = opening.text.split(/(?<=[.?!])\s/)[0] ?? opening.text;
  const clock = CLOCK_TIME.exec(firstSentence)?.[0];
  if (!clock) return;
  const routine = phraseIn(firstSentence, ROUTINE_OPERATIONS_NOUNS) ?? OPERATIONAL_COUNT.exec(firstSentence)?.[0];
  if (!routine) return;
  findings.push(
    make(
      "duty-log-opening",
      "warning",
      def.id,
      `the room opens on a duty log rather than on what is at stake — "${excerpt(firstSentence)}" leads with "${routine}" and "${clock}". ` +
        "Say what this costs the country and what is being decided; the shift detail belongs further down, or in particulars",
    ),
  );
}

// A scenario with no counterpart has no one abroad to speak, act against, or
// be measured by — any of those in a domestic scenario is authored confusion.
function auditDomesticCoherence(def: ScenarioDef, findings: ScenarioFinding[]): void {
  if (def.cast.pick !== "none") return;
  const complain = (message: string) => findings.push(make("domestic-incoherence", "error", def.id, message));
  // A counterpart speaking in the opening needs no rule here: the speaker kind
  // does not exist, and the transmission equivalent is refused by the schema.
  if (def.replies.some((reply) => reply.commitment.kind === "instrument")) {
    complain("a domestic scenario offers an instrument, but there is no counterpart to aim it at");
  }
  // Every condition that reads the bound counterpart. A domestic scenario's
  // counterpart slot points back at the player's own nation, so each of these
  // asks a question about the player that reads as a question about somebody
  // else — a compact shared with oneself, a coalition standing against oneself.
  const readsCounterpart = (condition: ScenarioDef["conditions"][number]): boolean =>
    condition.kind === "relationship" ||
    condition.kind === "counterpartTrait" ||
    condition.kind === "sharedMembership" || condition.kind === "sharesBorder" || condition.kind === "tariffInForce" ||
    (condition.kind === "coalition" && condition.against === "counterpart");
  if (def.conditions.some(readsCounterpart)) {
    complain("a domestic scenario conditions on a counterpart it does not have");
  }
  for (const { text } of passages(def)) {
    if (/\{\{\s*counterpart/.test(text)) complain(`"${excerpt(text)}" names a counterpart the scenario does not cast`);
    // Only one government exists in a domestic scenario's fiction, so "the
    // minister" can only mean the player's own cabinet — and not every
    // charter calls its chairs that (see GENERIC_MINISTER_PATTERN). Reported
    // as cabinet-title-literal, the same kind a Title Case chair name gets:
    // it is the identical defect, just lowercase and unattached to a portfolio.
    if (GENERIC_MINISTER_PATTERN.test(text)) {
      findings.push(
        make(
          "cabinet-title-literal",
          "error",
          def.id,
          `"${excerpt(text)}" calls the player's own cabinet chair a "minister" — not every charter does; use a role hint or a charter-neutral word ("chair", "official")`,
        ),
      );
    }
  }
  // Both of these boosts read the relationship with the cast counterpart, and
  // a domestic scenario's counterpart is the player's own nation — the boost
  // multiplies by zero every turn instead of doing nothing visible.
  for (const boost of def.boosts ?? []) {
    if (boost.source === "tension" || boost.source === "distrust") {
      findings.push(
        make("inert-boost", "error", def.id, `a domestic scenario boosts on "${boost.source}", which reads a relationship it has none of`),
      );
    }
  }
}

// The prefix form, for the per-scenario rules: a rule looking at one document
// has no pack to check an id against, and a deed flag is a phrase ("cleared-
// the-square") that reaches neither prefix.
const ENGINE_FLAG_PREFIXES: readonly string[] = [DESK_FLAG_PREFIX, scenarioFiredFlag(""), ...ENGINE_STATE_FLAGS];

/**
 * A callback has to ripen, or it is a lottery ticket.
 *
 * A flag-gated scenario goes live the turn the deed is remembered and then
 * competes at flat weight against every other live scenario, forever. In a pool
 * of hundreds that is a follow-up the player may simply never be dealt — the
 * deed was remembered by the save and by nothing the player can see. A
 * `flagAge` boost is the force that pulls it onto the desk: weight climbs the
 * longer the flag has stood, so the answer arrives instead of merely being
 * possible. A warning rather than an error, because a deliberately rare
 * follow-up is a legitimate thing to write — it should just be a decision.
 *
 * The inverse is an error and rides the existing inert-boost kind: a `flagAge`
 * boost on a scenario that waits on no flag reads an age nothing ever stamps
 * and multiplies by nothing every turn.
 */
function auditCallbackRipening(def: ScenarioDef, findings: ScenarioFinding[]): void {
  // Only a deed ripens. The engine's own markers carry no age stamp — a gate on
  // one reads as fully ripe from the turn it stands, so the boost would be a
  // constant multiplier and asking for it would be asking for noise.
  const gated = def.conditions.some(
    (condition) => condition.kind === "flag" && condition.is && !ENGINE_FLAG_PREFIXES.some((prefix) => condition.flag.startsWith(prefix)),
  );
  const ripens = (def.boosts ?? []).some((boost) => boost.source === "flagAge");
  if (gated && !ripens) {
    findings.push(
      make(
        "callback-never-ripens",
        "warning",
        def.id,
        'waits on a flag but carries no "flagAge" boost: a live follow-up competing at flat weight against the whole pool forever — ' +
          'add { "source": "flagAge", "factor": 1 } so the callback ripens onto the desk instead of waiting on a draw',
      ),
    );
  }
  if (!gated && ripens) {
    findings.push(
      make("inert-boost", "error", def.id, 'boosts on "flagAge" but waits on no flag, so there is no deed for the weight to age'),
    );
  }
}

/**
 * A reply may only move a war the scenario can actually be about.
 *
 * A conflict move settles, cools or puts terms to the war between the player
 * and the cast counterpart. On a scenario that is not gated on the player being
 * at war, there is nothing for it to reach on most boards it opens on: the
 * reply reads as ending a war and ends nothing, which is precisely the lie the
 * move exists to stop. `role: "none"` gates on a war the player is *out* of, so
 * it grounds nothing either — you cannot sign terms for someone else's front —
 * and a domestic scenario has no counterpart to sign with at all.
 */
function auditConflictMoves(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const moved = def.replies.filter(
    (reply) => reply.commitment.kind === "position" && reply.commitment.conflictMove !== undefined,
  );
  if (moved.length === 0) return;
  const complain = (message: string) => findings.push(make("ungrounded-conflict-move", "error", def.id, message));
  const ids = moved.map((reply) => reply.id).join(", ");
  if (def.cast.pick === "none") {
    complain(`replies ${ids} move a war, but a domestic scenario has no counterpart to be at war with`);
    return;
  }
  const belligerent = def.conditions.some((c) => c.kind === "warState" && c.role !== "none");
  if (!belligerent) {
    complain(
      `replies ${ids} settle, cool or put terms to a war, but the scenario is not gated on the player being in one ` +
        `(add a warState condition with role "any", "aggressor" or "defender")`,
    );
    return;
  }
  // The move reaches the conflict between the player and the *bound*
  // counterpart, and finds nothing when they are not fighting it. Every other
  // cast is a way of ranking relationships, and a war gate elsewhere on the
  // board holds it open regardless — so the room agrees to stop and the front
  // goes on billing, which is the failure the move exists to prevent.
  if (def.cast.pick !== "warCounterpart") {
    complain(
      `replies ${ids} move the war with the counterpart, but the scenario casts "${def.cast.pick}", which need not be ` +
        `the nation the player is fighting (cast "warCounterpart")`,
    );
  }
}

/**
 * A reply may only enter a war the cast nation is actually fighting.
 *
 * Entering is resolved against the counterpart's own conflict, so a scenario
 * that casts somebody who need not be at war offers the player a door onto an
 * empty field. `belligerent` is the cast that guarantees one — it binds a
 * principal of a live war — and a domestic scenario has no one to stand with.
 */
function auditJoins(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const joins = def.replies.filter((reply) => reply.commitment.kind === "join");
  if (joins.length === 0) return;
  const ids = joins.map((reply) => reply.id).join(", ");
  const complain = (message: string) => findings.push(make("ungrounded-join", "error", def.id, message));
  if (def.cast.pick === "none") {
    complain(`replies ${ids} enter a war, but a domestic scenario casts nobody to enter one beside`);
    return;
  }
  if (def.cast.pick !== "belligerent") {
    complain(
      `replies ${ids} enter the war the counterpart is fighting, but the scenario casts "${def.cast.pick}", which ` +
        `need not be at war with anyone (cast "belligerent")`,
    );
  }
}

// The schema now requires a locus of every scenario, so there is nothing left
// to warn about a missing one; what remains is the pin that contradicts its
// own cast.
function auditLocus(def: ScenarioDef, findings: ScenarioFinding[]): void {
  if (def.locus.ground === "counterpart" && def.cast.pick === "none") {
    findings.push(
      make("domestic-incoherence", "error", def.id, "a domestic scenario places its locus on a counterpart it does not have"),
    );
  }
}

// The schema asks a set-piece's reason to be non-empty, which "n/a" satisfies.
// A declaration that says nothing is the same as no declaration: it passes the
// check without recording why the exception was granted, which is the entire
// point of requiring one.
const MIN_SET_PIECE_REASON = 12;

function auditSetPiece(def: ScenarioDef, findings: ScenarioFinding[]): void {
  if (def.cast.pick === "nation" && !def.setPiece) {
    findings.push(make("undeclared-set-piece", "error", def.id, `pins nation ${def.cast.nation} without declaring itself a set-piece`));
  }
  if (def.cast.pick !== "nation" && def.setPiece) {
    findings.push(
      make("pointless-set-piece", "error", def.id, "declares a set-piece exception but casts by board state, so the exception buys nothing"),
    );
  }
  if (def.setPiece && def.setPiece.reason.trim().length < MIN_SET_PIECE_REASON) {
    findings.push(
      make("undeclared-set-piece", "error", def.id, "declares a set-piece with a reason too short to be a reason"),
    );
  }
}

// Classes whose premise is that somebody other than the government is holding
// ground the government is supposed to hold. A hostage-taking, a terror cell,
// or an insurgency staged inside a counterpart's territory says something about
// that counterpart, whether or not the writer meant it to.
const NONSTATE_GROUND_CLASSES = new Set(["hostage", "terror", "insurgency"]);

// Casts that mean "a state whose writ does not run everywhere". `stabilityBand`
// does not, whatever it sounds like: it is a four-way split of a continuous
// score, and its middle rung ("fragile") holds the United States, the United
// Kingdom and France alongside genuinely contested states.
const WEAK_CONTROL_ARCHETYPES = new Set(["post-conflict", "client-state"]);

/**
 * A scenario may not stage a non-state armed group inside a country the cast
 * does not establish has lost control of that ground.
 *
 * The hostage scenario cast on `stabilityBand: "fragile"` and drew the United
 * States, so the player was briefed on four of their citizens held for ransom
 * by a militia somewhere in the American interior — and the intercept card
 * credited it to "United States". Every part of that passed every existing
 * rule: the writing is good, the locus is consistent with the cast, and the
 * band was a real band. What nothing checked was whether the premise survives
 * the nation the board hands it.
 */
function auditHostPlausibility(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const nonstateVoice = def.transmission?.voice === "nonstate";
  const stagedAbroad = def.locus.ground === "counterpart";
  if (!stagedAbroad) return;
  if (!nonstateVoice && !NONSTATE_GROUND_CLASSES.has(def.class)) return;

  const cast = def.cast;
  const establishesWeakControl =
    // A pinned nation is a set-piece: the writer chose the country by hand and
    // already had to justify it.
    cast.pick === "nation" ||
    (cast.pick === "band" && cast.archetype !== undefined && WEAK_CONTROL_ARCHETYPES.has(cast.archetype)) ||
    (cast.pick === "band" && (cast.stabilityBand === "volatile" || cast.stabilityBand === "collapsing"));

  if (!establishesWeakControl) {
    findings.push(
      make(
        "implausible-host",
        "error",
        def.id,
        `stages a non-state armed group on a counterpart's ground without casting a state that has lost control of it — ` +
          `cast on archetype "post-conflict" or "client-state", or on stabilityBand "volatile" or "collapsing". ` +
          `"fragile" is not weak enough: great powers land in it`,
      ),
    );
  }
}

/**
 * A reply may not order a capability it does not name.
 *
 * The opening already has an altitude rule (`duty-log-opening`); the replies
 * had none, and they are the half the player actually says out loud. The core
 * pack's hostage scenario offered "Send the team", which presumes a force
 * nobody in the room mentioned and no particular reported — the player is
 * agreeing to something the game never told them they had. What a head of
 * government is choosing between in a hostage crisis is precisely *which*
 * instrument, so a reply that elides it has removed the decision and kept the
 * consequence.
 */
function auditReplyAltitude(def: ScenarioDef, findings: ScenarioFinding[]): void {
  for (const reply of def.replies) {
    const vague = UNNAMED_CAPABILITY.exec(reply.text);
    if (!vague) continue;
    findings.push(
      make(
        "unnamed-capability",
        "error",
        def.id,
        `reply "${reply.id}" orders a force it does not name: "${vague[0]}". ` +
          "Name what is being committed — a rescue squadron, a special forces team, a strike package — " +
          "since which instrument it is is the decision the player is being asked to take",
      ),
    );
  }
}

/**
 * The register-by-severity rule: the clock has to be earned by the week.
 *
 * A countdown phrase in a critical scenario is honest — the reserves really do
 * run out, the tide really does turn. The same phrase in a routine week is a
 * manufactured clock: a budget squabble does not get an ultimatum, and a
 * corpus in which every scenario opens on one plays at a single volume, which
 * is the failure the severity field exists to make refusable. An error for
 * routine, because no writer's judgment makes an ultimatum routine; a warning
 * for serious, because a real crisis may honestly carry a deadline and a
 * person should read whether this one earned it.
 */
function auditManufacturedClock(def: ScenarioDef, findings: ScenarioFinding[]): void {
  if (def.severity === "critical") return;
  // Every player-visible channel, not just the thread: a transmission or a
  // rejoinder reads exactly as urgent as an opening beat, and a countdown
  // routed through one still manufactures the same clock.
  for (const { label, text } of passages(def)) {
    const clock = phraseIn(text, COUNTDOWN_PHRASES);
    if (!clock) continue;
    findings.push(
      make(
        "manufactured-clock",
        def.severity === "routine" ? "error" : "warning",
        def.id,
        `a ${def.severity} scenario puts the decision on a countdown — ${label} says "${clock}". ` +
          "A routine week does not get an ultimatum: either the fiction earns the clock (raise the severity) or the prose drops it",
      ),
    );
    return;
  }
}

/**
 * How much of a rejoinder may be the sentence it follows.
 *
 * A rejoinder exists to add what the room did not know — the first cost
 * arriving, the fact that only surfaces once the decision is made. The
 * `remembered` line has already said what was decided, so a rejoinder that
 * re-says it is a beat the player learns to skip, and skipped beats are exactly
 * the flatness the field was added to fix.
 *
 * Word-triple Jaccard against `remembered` and against the reply itself, on the
 * same shingling the corpus compares whole scenarios with. Provisional and
 * untuned: no shipped scenario carries a rejoinder yet, so this threshold is
 * argued rather than measured, and it is a warning for that reason. Retune it
 * against the first real batch instead of trusting the number here.
 */
const REJOINDER_ECHO_CEILING = 0.25;

/**
 * Words a commit-time line cannot honestly say before the resolver rolls.
 *
 * An instrument or join rejoinder is spoken between the order and the world's
 * answer, so it must hold on every branch. A line that reports success or
 * failure is the aftermath's job said early — and wrong on half the rolls.
 * Word-list rather than semantics, so a warning, and retuned against real
 * batches the same way the echo ceiling is.
 */
const OUTCOME_CLAIMS =
  /\b(succeeded|failed|worked|backfired|it (?:worked|failed)|went (?:well|badly)|mission accomplished)\b/i;

function auditRejoinders(def: ScenarioDef, findings: ScenarioFinding[]): void {
  for (const reply of def.replies) {
    if (!reply.commitment.rejoinder) continue;
    if (reply.commitment.kind !== "position" && OUTCOME_CLAIMS.test(reply.commitment.rejoinder.text)) {
      findings.push(
        make(
          "rejoinder-presumes-outcome",
          "warning",
          def.id,
          `reply "${reply.id}" answers before the dice land: its rejoinder claims to know how the attempt went. ` +
            "A commit-time line must be true whichever branch resolves — acknowledgment, first friction, dissent, " +
            "not a result",
        ),
      );
    }
    const rejoinder = shinglesOf(reply.commitment.rejoinder.text);
    // An instrument or join has no remembered line — the resolver narrates the
    // decision — so the only sentence its rejoinder can echo is the reply.
    const against: readonly (readonly [string, string])[] = [
      ...(reply.commitment.kind === "position"
        ? ([["the remembered line", reply.commitment.remembered]] as const)
        : []),
      ["the reply itself", reply.text],
    ];
    for (const [what, text] of against) {
      const echo = jaccard(rejoinder, shinglesOf(text));
      if (echo < REJOINDER_ECHO_CEILING) continue;
      findings.push(
        make(
          "rejoinder-restates",
          "warning",
          def.id,
          `reply "${reply.id}" answers itself: its rejoinder repeats ${Math.round(echo * 100)}% of ${what}. ` +
            "A rejoinder is what the room did not know when it advised — the first cost arriving, the fact the decision " +
            "surfaced — not the decision said again in another voice",
        ),
      );
      break;
    }
  }
}

/**
 * A `{ kind: "cabinet", roleHint: "lead" }` speaker in an opening beat or a
 * rejoinder, which always resolves to the player's own persona — the lead
 * chair is, by construction, filled by whoever the player composed at
 * founding (see `founding.ts`'s `FoundingChoices.cabinet` doc comment), and
 * it is the only "lead"-shaped seat in the player's own cabinet map. A player
 * cast as a speaker addressing the player reads as the president talking to
 * themselves, one beat before the game asks them to pick their real reply.
 *
 * The schema already refuses this for any content built through
 * `ScenarioSpeaker`/`ScenarioRejoinderSpeaker` (both narrowed to
 * `ScenarioSpeakerRoleHint`, which excludes "lead"). This rule exists for
 * content that reaches the audit without having gone through that type —
 * hand-built fixtures, an older generator's output, or a shard read back off
 * disk before it is re-validated against the current schema.
 */
function auditLeadSpeaker(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const isLeadCabinetSpeaker = (speaker: { readonly kind: string; readonly roleHint?: string }) =>
    speaker.kind === "cabinet" && speaker.roleHint === "lead";
  for (const beat of def.opening) {
    if (!isLeadCabinetSpeaker(beat.speaker)) continue;
    findings.push(
      make(
        "lead-speaker-addresses-self",
        "error",
        def.id,
        'an opening beat speaks as { "kind": "cabinet", "roleHint": "lead" }, which always resolves to the player\'s own ' +
          "character — the lead chair is the player's own persona by construction, so this beat reads as the president " +
          "talking to themselves. Use a real department hint (foreign, interior, defense, finance, justice), " +
          '{ "kind": "narrator" }, or { "kind": "player" } if the line is genuinely meant to be player-voiced',
      ),
    );
  }
  for (const reply of def.replies) {
    if (!reply.commitment.rejoinder) continue;
    if (!isLeadCabinetSpeaker(reply.commitment.rejoinder.speaker)) continue;
    findings.push(
      make(
        "lead-speaker-addresses-self",
        "error",
        def.id,
        `reply "${reply.id}"'s rejoinder speaks as { "kind": "cabinet", "roleHint": "lead" }, which always resolves to ` +
          "the player's own character for the same reason an opening beat cannot use it. Use a real department hint, " +
          'or { "kind": "narrator" }',
      ),
    );
  }
}

// --- What the room says, and whether a player can act on it ------------------

/**
 * Words the game uses about itself, said to someone who was never taught them.
 *
 * "Chair" is the app's own term for a cabinet seat, and it is right in the code
 * and right on the cabinet screen, where the seat is drawn with a title under a
 * face. Inside a sentence a minister speaks it is opaque: a player reading
 * "both chairs think it's theirs" cannot tell whether that is a person, a
 * committee or furniture, and every other surface in the game calls that person
 * the Secretary of the Treasury. "The line" is the same failure in the money
 * register — a budget line to whoever wrote it, a line of what to whoever is
 * reading it.
 *
 * These are not bad sentences. They are sentences written from inside the
 * building by someone who forgot they were briefing a newcomer, which is the
 * failure this corpus is most prone to because it is the one that reads as
 * competence.
 *
 * Both probes are deliberately narrow, because both words have honest uses that
 * no rule should touch: an orchestra cannot fill its chairs, a family sits in
 * them, a front line holds, a government holds the line, and a rail line runs
 * past the shops. So "chair" is flagged only where it is doing something only a
 * person does, and "line" only where money is being paid out of it, drawn on
 * it, or split across it. Tuned against the shipped corpus until what fired was
 * what a reader would also have marked.
 */
const INSIDER_SHORTHAND: readonly { readonly probe: RegExp; readonly say: string }[] = [
  {
    probe:
      /\bchairs?\s+(?:who|think|thinks|wants?|asking|agree|agrees|disagree|runs?|says?|refuses?)\b|\b(?:two|three|both|several)\s+chairs\b|\bchair\s+of\s+(?:that|the)\s+(?:program|agency|fund|department|ministry)\b|\b(?:the|their)\s+(?:security|finance|defen[cs]e|health|interior|justice)\s+chair\b|\bchair\s+you\s+appointed\b/i,
    say: 'name the seat the way the cabinet screen names it — "the Secretary of the Treasury", "the Secretary of Defense"',
  },
  {
    probe:
      /\b(?:out of|from|against|on|onto)\s+(?:the|that|this)\s+same\s+line\b|\b(?:out of|against)\s+(?:the|that|this)\s+line\b|\b(?:the|that|this)\s+line\s+that\s+(?:funds?|funded|pays?|paid|was supposed to fund)\b|\b(?:split|splitting|drew on|draw on|drawn from|drawing on)\s+(?:the|that|this)\s+(?:same\s+)?line\b|\bthe line was drawn from\b/i,
    say: "say what the money was for, or call it the budget",
  },
];

function auditInsiderShorthand(def: ScenarioDef, findings: ScenarioFinding[]): void {
  for (const passage of passages(def)) {
    if (passage.label.startsWith("particular")) continue;
    for (const { probe, say } of INSIDER_SHORTHAND) {
      const hit = probe.exec(passage.text)?.[0];
      if (!hit) continue;
      findings.push(
        make(
          "insider-shorthand",
          "warning",
          def.id,
          `${passage.label} speaks the building's own shorthand at a player who was never taught it — "${hit.trim()}" in "${excerpt(passage.text)}". ${say}`,
        ),
      );
      break;
    }
  }
}

/**
 * A decision briefed without a single magnitude.
 *
 * The screen a player decides on carries a row of figures across the top, fed
 * by `particulars`, and it is there because nobody chooses between two programs
 * on atmosphere. More than half this corpus ships no particulars, and that on
 * its own is a shortfall rather than a defect: a briefing can carry its numbers
 * in its own prose. What this catches is the scenario with neither — no figures
 * block, and not one magnitude in anything the room says — so the player is
 * asked to choose between the clinics and the fleet without being told how
 * much, how many, or how long.
 *
 * "One" is not counted as a magnitude, which looks like an oversight and is
 * not: "I know which one people notice losing" is the sentence that made the
 * first draft of this rule pass the very scenario it was written for.
 */
const SPELLED_NUMBER =
  "(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen)";

const A_MAGNITUDE = new RegExp(
  `\\d|\\b${SPELLED_NUMBER}\\b|\\bper ?cent|%|\\b(?:a|one) (?:third|quarter|fifth|half)\\b|\\bhalf (?:a|the|of)\\b`,
  "i",
);

function auditBriefingFigures(def: ScenarioDef, findings: ScenarioFinding[]): void {
  if ((def.particulars ?? []).length > 0) return;
  const briefing = [...def.opening.map((beat) => beat.text), def.transmission?.text ?? ""].join(" ");
  if (A_MAGNITUDE.test(briefing)) return;
  findings.push(
    make(
      "briefing-without-a-figure",
      "warning",
      def.id,
      "the room asks for a decision without stating one magnitude: no particulars, and no figure in anything it says. " +
        "Give it particulars — how much, how many, how long — or put the number in the sentence that needs it",
    ),
  );
}

/**
 * Player-facing text about the player's own government, written for a
 * constitution this game does not contain.
 *
 * One nation is playable and it is a presidency. Charter-agnostic writing
 * reaches for "the no-confidence motion", "backbenchers" and "the finance
 * ministry's fifth floor", and a player reads every one of them as a bug —
 * they describe a constitution nobody in this game holds. The counterpart's
 * government is exempt: "their
 * foreign minister" describes somebody else's constitution, which this game
 * does not model down to the chair title.
 *
 * A transmission is exempt whole. It is a foreign government's own document,
 * and a cable from a parliamentary state naming its own prime minister is the
 * correct thing for it to say.
 *
 * Reported once per passage with the replacement named, because a rule that
 * only forbids teaches a drafter to reach for the next wrong word.
 */
function auditParliamentaryVocabulary(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const readable = passages(def).filter((passage) => def.transmission?.domesticSubject || !passage.label.startsWith("transmission"));
  // The bare "minister" family on a domestic scenario is already refused by
  // `cabinet-title-literal` with a message of its own. One defect, one finding.
  for (const { label, hit, say } of parliamentaryHits(readable, def.cast.pick === "none")) {
    findings.push(
      make(
        "parliamentary-vocabulary",
        "error",
        def.id,
        `${label} says "${hit}" about the player's own government, and the seat this game ships is the United States presidency — ${say}. ` +
          "A counterpart's government keeps its own words: \"their foreign minister\" is fine, and a transmission is exempt whole",
      ),
    );
  }
}

/**
 * Money declared louder than the week the writer said this was.
 *
 * `impact.financial` is banded and hidden until the Record, so nothing on the
 * decision board contradicts it at the moment the player commits — which is
 * exactly why it drifts. A rendered routine week billed about eleven billion
 * dollars at the Record off a `structural` band nobody had to look at. The
 * ceiling per tier is in `SEVERITY_SCALE_CEILING`; `permanent` is held to the
 * two loud tiers because a permanent claim on the budget is not something a
 * routine week can decide.
 */
function auditFinancialScale(def: ScenarioDef, findings: ScenarioFinding[]): void {
  for (const reply of def.replies) {
    if (reply.commitment.kind !== "position") continue;
    const financial = reply.commitment.impact?.financial;
    if (!financial) continue;
    if (financial.scale && scaleExceedsSeverity(def.severity, financial.scale)) {
      findings.push(
        make(
          "financial-scale-exceeds-severity",
          "error",
          def.id,
          `reply "${reply.id}" declares financial scale "${financial.scale}" on a "${def.severity}" week, whose ceiling is ` +
            `"${SEVERITY_SCALE_CEILING[def.severity]}". Either the money is smaller than the band says or the week is louder than "${def.severity}" — ` +
            "the Record bills the band, and the board shows the player nothing to warn them",
        ),
      );
    }
    if (financial.horizon === "permanent" && def.severity === "routine") {
      findings.push(
        make(
          "financial-scale-exceeds-severity",
          "error",
          def.id,
          `reply "${reply.id}" makes a "permanent" claim on the budget in a routine week. A permanent horizon triples the band's cost forever; ` +
            'a budget squabble does not decide one — use "one-off" or "multi-year", or write the week as serious',
        ),
      );
    }
  }
}

/**
 * An instrument reply whose sentence commits a different rung than its number.
 *
 * The player chooses the sentence and the engine resolves the number, so when
 * they disagree the game does something the player did not pick and then
 * narrates it back to them as their own decision. A shipped reply reading "open
 * talks on the fisheries line" is authored as diplomatic rung 3 — Recall
 * Ambassador — and both the Record and the drawn aftermath card said the
 * ambassador had come home.
 *
 * Deliberately conservative in both directions. An error only where the reply
 * names another rung's word and none of its own, which is the unambiguous case;
 * a warning where it names no rung word at all, which is a legibility problem
 * rather than a lie. The vocabulary's spine is each rung's own engine name, so
 * a renamed rung updates the rule rather than drifting away from it.
 */
function auditInstrumentRungLanguage(def: ScenarioDef, findings: ScenarioFinding[]): void {
  for (const reply of def.replies) {
    if (reply.commitment.kind !== "instrument") continue;
    const { instrument, rung } = reply.commitment;
    const name = committedRungName(instrument, rung);
    const reading = readRungVocabulary(reply.text, instrument, rung);
    if (reading.own.length > 0) continue;
    if (reading.other.length > 0) {
      const wrong = reading.other[0]!;
      findings.push(
        make(
          "instrument-reply-contradicts-rung",
          "error",
          def.id,
          `reply "${reply.id}" commits ${instrument} rung ${rung} (${name}) and says "${wrong.word}", which is rung ${wrong.rung} (${wrong.name}). ` +
            "The player chooses the sentence and the engine resolves the number: say what this rung actually does, or move the reply to the rung it describes",
        ),
      );
      continue;
    }
    findings.push(
      make(
        "instrument-reply-contradicts-rung",
        "warning",
        def.id,
        `reply "${reply.id}" commits ${instrument} rung ${rung} (${name}) without naming what that is. ` +
          "A player cannot tell one rung from another by tone; write the act into the sentence",
      ),
    );
  }
}

/**
 * A loud week the world prints nothing about.
 *
 * A `press` headline is the only aftermath a scenario can author beyond the
 * rejoinder, and in a rendered loop none of the three chosen replies carried
 * one — so the biggest decision of the campaign so far left no trace in the
 * feed. Scoped to the scenario rather than to the reply, and to a set that has
 * a genuinely expensive door in it: the brief's own rule 16 is that a headline
 * on every answer is a headline on none, so this asks for one somewhere in the
 * set, not for one on each.
 *
 * Critical only, though the loud tiers are two. Measured against the approved
 * reference set — the bar this corpus is being rewritten to — two scenarios in
 * ten carry a headline and four of the six serious-or-critical weeks carry
 * none, so a rule reaching serious would be a rule that flags the bar. The week
 * the building shakes is the one the papers certainly lead with.
 */
function auditPressOnHeavyReplies(def: ScenarioDef, findings: ScenarioFinding[]): void {
  if (def.severity !== "critical") return;
  if (def.replies.some((reply) => reply.press)) return;
  const heavy = def.replies.find((reply) => reply.commitment.kind === "position" && isHeavy(reply));
  if (!heavy) return;
  findings.push(
    make(
      "press-missing-on-heavy-reply",
      "warning",
      def.id,
      `a "${def.severity}" week whose expensive door is "${heavy.id}" authors no press headline on any reply, so the world prints nothing about ` +
        "the biggest thing the player did here. Put one on the answer the papers would have led with",
    ),
  );
}

export function auditScenario(def: ScenarioDef): ScenarioFinding[] {
  const findings: ScenarioFinding[] = [];
  auditTopicTags(def, findings);
  auditEntities(def, findings);
  auditPlayability(def, findings);
  auditRejoinders(def, findings);
  auditLeadSpeaker(def, findings);
  auditStakes(def, findings);
  auditLanguage(def, findings);
  auditWorldNeutrality(def, findings);
  auditInstitutionTokens(def, findings);
  auditPremiseBinding(def, findings);
  auditBriefingRegister(def, findings);
  auditInsiderShorthand(def, findings);
  auditBriefingFigures(def, findings);
  auditImpactDeclared(def, findings);
  auditInertImpactFields(def, findings);
  auditActedUponToll(def, findings);
  auditImpactMatchesProse(def, findings);
  auditLocusLandform(def, findings); auditCoastalCounterpart(def, findings); auditUnplacedCity(def, findings);
  auditLocusGround(def, findings);
  auditUnplacedDomestic(def, findings);
  auditGenericPlace(def, findings);
  auditCityEffectUnplaced(def, findings);
  auditMissingCityToken(def, findings);
  auditUnknownCity(def, findings);
  auditParliamentaryVocabulary(def, findings);
  auditFinancialScale(def, findings);
  auditFinancialBasis(def, findings);
  auditInstrumentRungLanguage(def, findings);
  auditPressOnHeavyReplies(def, findings);
  auditManufacturedClock(def, findings);
  auditReplyAltitude(def, findings);
  auditDomesticCoherence(def, findings);
  auditCallbackRipening(def, findings);
  auditConflictMoves(def, findings);
  auditJoins(def, findings);
  auditStateGrievance(def, findings as FindingSink);
  auditUnroutedDomesticAct(def, findings as FindingSink);
  auditUnplacedDomesticSignature(def, findings as FindingSink);
  auditExecutiveStateGates(def, findings as FindingSink);
  auditUnnamedGroupToll(def, findings as FindingSink);
  auditCohortTollImplausible(def, findings as FindingSink);
  auditLocus(def, findings);
  auditCollectionReport(def, findings);
  auditScenarioCommands(def, findings);
  auditLegislativeTransmission(def, findings);
  auditHostPlausibility(def, findings);
  auditSetPiece(def, findings);
  auditIntelConfidence(def, findings);
  auditGrounding(def, findings as FindingSink);
  auditReadout(def, findings as FindingSink);
  auditTimeFraming(def, findings as FindingSink);
  return findings;
}

// --- Pack-level rules -------------------------------------------------------

// How many scenarios a batch can hold before "no scenario here reads any
// flag" stops being small-batch noise and starts being a structural absence.
const ISLAND_PACK_FLOOR = 5;

// Continuity is the other half of what "sets" is for: a reply's flag is how
// an answer is remembered, and something has to do the remembering. A batch
// of this size in which nothing conditions on any flag — not its own, not the
// installed corpus's — is a pool of disconnected one-shots: every deed
// stamped, none of them ever returning. A warning, not an error, because any
// individual scenario is allowed to stand alone; it is the whole batch
// standing alone that a reviewer should see.
function auditContinuity(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  if (defs.length < ISLAND_PACK_FLOOR) return;
  const ids = new Set(defs.map((def) => def.id));
  const readsAuthoredFlag = defs.some((def) =>
    def.conditions.some((condition) => condition.kind === "flag" && !engineOwnedFlag(condition.flag, ids)),
  );
  if (!readsAuthoredFlag) {
    findings.push(
      make(
        "island-pack",
        "warning",
        defs[0]!.id,
        `${defs.length} scenarios and not one conditions on a flag: every answer is stamped and none is ever remembered — write follow-ups`,
      ),
    );
  }
}

// How many scenarios a batch can hold before its severity mix is a shape
// rather than an accident of a small sample.
const SEVERITY_MIX_FLOOR = 4;

const CRITICAL_SHARE_CEILING = 0.5;

// The other half of the volume dial: a single scenario is allowed to be any
// severity, but a batch that is mostly critical, or that contains no routine
// week at all, plays at one volume — and the criticals in it stop landing,
// because nothing quieter surrounds them. A warning in the island-pack style:
// it is the batch's shape a reviewer should see, not any one document's fault.
function auditSeverityMix(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  if (defs.length < SEVERITY_MIX_FLOOR) return;
  const criticals = defs.filter((def) => def.severity === "critical").length;
  const routines = defs.filter((def) => def.severity === "routine").length;
  const complain = (message: string) => findings.push(make("severity-monotone", "warning", defs[0]!.id, message));
  if (criticals / defs.length > CRITICAL_SHARE_CEILING) {
    complain(
      `${criticals} of ${defs.length} scenarios are critical: a batch that is mostly building-shaking weeks plays at one volume — write the ordinary governing between them`,
    );
  } else if (routines === 0) {
    complain(
      `${defs.length} scenarios and not one routine week: routine is the connective tissue that makes a critical land — write the budget squabbles and the appointments`,
    );
  }
}

// Pool-scale distributional rules, deferred until phase-1 content existed to
// tune them against (the bundled pack was 13 scenarios, the live corpus 53 —
// both too small for a threshold to mean anything rather than measure the
// sample). The floor below every one of these is picked to keep them off a
// batch too small to have a shape at all, and every ratio is provisional:
// each ships stamped with the pool it was calibrated on (none — these are
// first-cut numbers, not fitted ones) so a reviewer knows to retune once the
// 2,000-scenario corpus target is actually reached.
const MONOCULTURE_FLOOR = 8;

// A player who has read enough scenarios learns the game's grammar whether or
// not that was the intent; the grammar becomes a tell instead of a decision
// only once one shape dominates the batch. Ordered so "firm then coercive"
// and "coercive then firm" are different tuples — the order is part of what
// a player learns to predict.
const TONE_TUPLE_SHARE_CEILING = 0.4;

function toneTuple(def: ScenarioDef): string {
  return def.replies.map((reply) => reply.tone).join(">");
}

function auditToneTupleMonoculture(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  if (defs.length < MONOCULTURE_FLOOR) return;
  const counts = new Map<string, number>();
  for (const def of defs) counts.set(toneTuple(def), (counts.get(toneTuple(def)) ?? 0) + 1);
  for (const [tuple, count] of counts) {
    const share = count / defs.length;
    if (share <= TONE_TUPLE_SHARE_CEILING) continue;
    findings.push(
      make(
        "tone-tuple-monoculture",
        "warning",
        defs[0]!.id,
        `${count} of ${defs.length} scenarios (${Math.round(share * 100)}%) offer the exact reply-tone tuple "${tuple}", ` +
          `over the ${Math.round(TONE_TUPLE_SHARE_CEILING * 100)}% ceiling: a player who learns this tuple can predict every ` +
          "answer's shape before reading it — provisional threshold, untuned against a real pool",
      ),
    );
  }
}

// Coarser than the tone tuple — this is what speaks first, not how. Warns
// later than the tone rule (60% vs 40%) because an opening framing is a
// narrower signal on its own: "cabinet then narrator" repeating is a much
// weaker tell than the tones of every reply matching.
const OPENING_FRAMING_SHARE_CEILING = 0.6;

function openingFraming(def: ScenarioDef): string {
  return def.opening.map((beat) => beat.speaker.kind).join(">");
}

function auditOpeningFramingMonoculture(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  if (defs.length < MONOCULTURE_FLOOR) return;
  const counts = new Map<string, number>();
  for (const def of defs) counts.set(openingFraming(def), (counts.get(openingFraming(def)) ?? 0) + 1);
  for (const [sequence, count] of counts) {
    const share = count / defs.length;
    if (share <= OPENING_FRAMING_SHARE_CEILING) continue;
    findings.push(
      make(
        "opening-framing-monoculture",
        "warning",
        defs[0]!.id,
        `${count} of ${defs.length} scenarios (${Math.round(share * 100)}%) open with the same speaker sequence "${sequence}", ` +
          `over the ${Math.round(OPENING_FRAMING_SHARE_CEILING * 100)}% ceiling: every room is staged the same way — ` +
          "provisional threshold, untuned against a real pool",
      ),
    );
  }
}

// Half the batch, not all of it: a pool where the majority of scenarios are
// unconditional is a pool where the board's actual state barely matters to
// what a player sees, which is the opposite of what conditionality is for.
const CONDITION_COVERAGE_FLOOR = 8;
const CONDITION_COVERAGE_RATIO = 0.5;

function auditConditionCoverage(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  if (defs.length < CONDITION_COVERAGE_FLOOR) return;
  const conditioned = defs.filter((def) => def.conditions.length > 0).length;
  const ratio = conditioned / defs.length;
  if (ratio >= CONDITION_COVERAGE_RATIO) return;
  findings.push(
    make(
      "condition-coverage-thin",
      "warning",
      defs[0]!.id,
      `only ${conditioned} of ${defs.length} scenarios (${Math.round(ratio * 100)}%) carry any authored condition, ` +
        `under the ${Math.round(CONDITION_COVERAGE_RATIO * 100)}% floor: a pool this unconditional barely reacts to the board ` +
        "it is supposedly about — provisional threshold, untuned against a real pool",
    ),
  );
}

// The other half of the flag economy `auditFlagEconomy` and `auditContinuity`
// already own. Neither catches this: `auditFlagEconomy` only rejects a read
// of a flag nothing sets, and `auditContinuity` (island-pack) only fires once
// a batch is 5+ scenarios that read *nothing at all*. A batch that writes a
// lot of governance memory while reading none of it — its own or the corpus
// it lands in — is the write side of that same imbalance, and can trip below
// island-pack's size floor if the writes are dense in a small batch.
const FLAG_WRITE_FLOOR = 10;

// A batch can read plenty of governance memory and still have none of the
// variety that makes memory feel like memory. The failure is concentration: a
// pool where four separate weeks call back to the same leak hunt reads as one
// deed the government cannot stop relitigating, not as a file being kept.
//
// It shows up when a writer reaches for the deeds in front of them — the small
// bundled vocabulary quoted in the brief — instead of the corpus's much larger
// pool. A real batch did exactly that under repair pressure: 25 of its 31
// callbacks landed on 12 core deeds while 487 sat unread in the corpus, and
// every rule here passed it, because each callback was individually legitimate.
const CALLBACK_REPEAT_CEILING = 3;

function auditCallbackConcentration(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  const ids = new Set(defs.map((def) => def.id));
  const reads = new Map<string, string[]>();
  for (const def of defs) {
    for (const condition of def.conditions) {
      if (condition.kind !== "flag" || condition.is === false) continue;
      if (engineOwnedFlag(condition.flag, ids)) continue;
      reads.set(condition.flag, [...(reads.get(condition.flag) ?? []), def.id]);
    }
  }
  for (const [flag, readers] of reads) {
    if (readers.length <= CALLBACK_REPEAT_CEILING) continue;
    findings.push(
      make(
        "callback-concentration",
        "warning",
        readers[0]!,
        `${readers.length} scenarios in this batch gate on the same deed "${flag}": a file the player recognizes is ` +
          "one the government answers for once, not every other week — spend a different deed from the corpus",
      ),
    );
  }
}

// The stock-phrasing family moved to scenario-audit-phrasing.ts; the corpus
// index it builds is re-exported here, because the shard store and the tests
// resolve it from this module.
export { phraseCarrierIndex } from "./scenario-audit-phrasing.js";


// What `class` cannot see.
//
// A batch spread across eight classes looks varied and can still be one
// argument eight times: the same loyalty test at a ministry, a barracks, a
// registry, a court. The phrasing index cannot catch it — the duplicates that
// prompted this shared about 2% of their wording — because they are not the
// same words, they are the same decision.
//
// The ceiling is a share rather than a count, so it means the same thing to a
// batch of six and a batch of sixty. Below the floor it stays quiet: three
// scenarios of one shape is a theme, not a rut.
const SHAPE_SHARE_CEILING = 0.5;
const SHAPE_BATCH_FLOOR = 6;

function auditDilemmaShapeSpread(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  // No missing-shape rule here: the schema refuses a scenario without one, so
  // an audit for it would be a check on something the parser has already made
  // unrepresentable. It was a warning only for as long as the shipped corpus
  // had not been backfilled.
  if (defs.length < SHAPE_BATCH_FLOOR) return;
  const counts = new Map<string, number>();
  for (const def of defs) counts.set(def.dilemmaShape, (counts.get(def.dilemmaShape) ?? 0) + 1);
  for (const [shape, count] of counts) {
    if (count / defs.length <= SHAPE_SHARE_CEILING) continue;
    findings.push(
      make(
        "dilemma-shape-monoculture",
        "warning",
        defs.find((def) => def.dilemmaShape === shape)!.id,
        `${count} of ${defs.length} scenarios are the same dilemma ("${shape}"): a player who learns this argument ` +
          "once plays the rest of the batch already knowing the answer — spread the shapes, not just the classes",
      ),
    );
  }
}

// The `motifs` counterpart to `auditDilemmaShapeSpread`, and deliberately
// separate rather than folded into it: a scenario carries one dilemma shape
// but up to three motifs, and the field is optional where `dilemmaShape` is
// required, so "how many scenarios chose to say anything" has to be the base
// a share is measured against, not the batch size. See the `Motif` doc
// comment in scenario.ts for why this vocabulary is seeded rather than
// measured — the ceiling below is provisional for the same reason.
const MOTIF_SHARE_CEILING = 0.4;
const MOTIF_BATCH_FLOOR = 8;

function auditMotifSpread(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  const labeled = defs.filter((def) => def.motifs && def.motifs.length > 0);
  if (labeled.length < MOTIF_BATCH_FLOOR) return;
  const counts = new Map<Motif, number>();
  for (const def of labeled) {
    for (const motif of new Set(def.motifs)) {
      counts.set(motif, (counts.get(motif) ?? 0) + 1);
    }
  }
  for (const [motif, count] of counts) {
    if (count / labeled.length <= MOTIF_SHARE_CEILING) continue;
    findings.push(
      make(
        "motif-monoculture",
        "warning",
        labeled.find((def) => def.motifs?.includes(motif))!.id,
        `${count} of ${labeled.length} labeled scenarios reuse the same image ("${motif}"): the argument can differ ` +
          "while the picture repeats — reach for a different motif, or leave one unset rather than force a fit",
      ),
    );
  }
}

/**
 * A promise the pool never keeps.
 *
 * A reply that opens a review, convenes an inquiry, or orders an investigation
 * has told the player a process is now running — and the shipped scenario
 * this rule was written against did exactly that ("open a formal review of
 * every chair's disclosures"), stamped its flag, and nothing anywhere read it.
 * The player who chose the biggest answer in the room got the only one with
 * no consequence of any kind, which teaches that scandals evaporate once
 * answered — the exact opposite of what governance memory is for.
 *
 * The rule reads the announcement off the prose (reply text and remembered
 * line) and asks whether any flag the reply stamps is read by this batch or
 * by the corpus it is landing in. A warning rather than an error: a batch may
 * legitimately set the flag for a reader the *next* batch will write — but a
 * reviewer should see the promise being deferred, because measured against
 * the real corpus, deferred meant never for 794 of 826 flags.
 */
function auditPromisedFollowUps(
  defs: readonly ScenarioDef[],
  corpus: CorpusContext,
  findings: ScenarioFinding[],
): void {
  const readAnywhere = new Set<string>(corpus.readFlags ?? []);
  for (const def of defs) {
    for (const condition of def.conditions) {
      if (condition.kind === "flag" && condition.is) readAnywhere.add(condition.flag);
    }
  }
  for (const def of defs) {
    for (const reply of def.replies) {
      const remembered = reply.commitment.kind === "position" ? reply.commitment.remembered : "";
      const announced = PROCESS_ANNOUNCEMENT.exec(reply.text)?.[0] ?? PROCESS_ANNOUNCEMENT.exec(remembered)?.[0];
      if (!announced) continue;
      // The engine's state claim remains live and its deadline is deferred by
      // the typed review; it is already the reader of this process.
      if (reply.commitment.kind === "position" && reply.commitment.localeAct === "review") continue;
      const sets = reply.sets ?? [];
      if (sets.length === 0) {
        findings.push(
          make(
            "promised-follow-up-unread",
            "warning",
            def.id,
            `reply "${reply.id}" announces a process ("${announced.trim()}") and stamps no flag, so nothing can ever ` +
              "report back — give it a sets flag and write the scenario that collects",
          ),
        );
        continue;
      }
      if (sets.some((flag) => readAnywhere.has(flag))) continue;
      findings.push(
        make(
          "promised-follow-up-unread",
          "warning",
          def.id,
          `reply "${reply.id}" announces a process ("${announced.trim()}") whose flag nothing here or in the shipped ` +
            `corpus reads (${sets.join(", ")}) — a review the player never hears of again teaches that scandals ` +
            "evaporate; write the reader, staged with agedAtLeast and a flagAge boost",
        ),
      );
    }
  }
}

function auditFlagWriteReadImbalance(
  defs: readonly ScenarioDef[],
  knownFlags: ReadonlySet<string>,
  findings: ScenarioFinding[],
): void {
  const ids = new Set(defs.map((def) => def.id));
  const written = new Set(defs.flatMap((def) => def.replies.flatMap((reply) => reply.sets ?? [])));
  if (written.size < FLAG_WRITE_FLOOR) return;
  const readsAnyAuthoredFlag = defs.some((def) =>
    def.conditions.some((condition) => condition.kind === "flag" && !engineOwnedFlag(condition.flag, ids)),
  );
  if (readsAnyAuthoredFlag) return;
  findings.push(
    make(
      "flag-economy-imbalance",
      "warning",
      defs[0]!.id,
      `writes ${written.size} distinct flags and reads none of them, and none from the packs already installed either: ` +
        "an economy that only mints memory and never spends it — provisional threshold, untuned against a real pool",
    ),
  );
}

/**
 * A scenario's phrasing fingerprint: overlapping word triples across every
 * passage, placeholders stripped. Exported because the corpus store persists a
 * sketch of exactly this set — two implementations would silently stop
 * agreeing, and a duplicate check whose sketches disagree finds nothing.
 */
export function scenarioShingles(def: ScenarioDef): ReadonlySet<string> {
  return shinglesOf(passages(def).map((passage) => passage.text).join(" "));
}

/**
 * Overlapping word triples for one span of prose, placeholders stripped. Split
 * out of `scenarioShingles` so the rejoinder check compares two lines the same
 * way the corpus compares two scenarios — a second, slightly different
 * shingling would be a similarity score that agrees with nothing else here.
 */
function shinglesOf(text: string): ReadonlySet<string> {
  const words = text
    .toLowerCase()
    .replace(/\{\{[^}]*\}\}/g, " ")
    .split(/[^a-z']+/)
    .filter(Boolean);
  return new Set(words.slice(0, Math.max(0, words.length - 2)).map((_, index) => words.slice(index, index + 3).join(" ")));
}

const OVERLAP_CEILING = 0.35;

/** The near-duplicate index for a corpus, ready to be asked what a new batch collides with. */
export function corpusOverlapIndex(defs: readonly ScenarioDef[]): NearDuplicateIndex {
  const index = new NearDuplicateIndex({ threshold: OVERLAP_CEILING });
  for (const def of defs) index.add(def.id, def.class, scenarioShingles(def));
  return index;
}

/**
 * Overlap is asked of an index rather than of every other scenario, so the
 * check stays linear as the corpus grows. `installed` is the corpus a batch is
 * landing in: passing it is what makes a batch's duplicates of *already
 * shipped* content visible, which a batch-against-itself comparison never saw.
 */
function auditTemplateOverlap(
  defs: readonly ScenarioDef[],
  findings: ScenarioFinding[],
  installed?: NearDuplicateIndex,
): void {
  const index = installed ?? new NearDuplicateIndex({ threshold: OVERLAP_CEILING });
  const reported = new Set<string>();
  for (const def of defs) {
    const print = scenarioShingles(def);
    for (const match of index.matches(def.id, def.class, print)) {
      // One finding per pair, whichever side of it comes up first.
      const pair = [def.id, match.otherId].sort().join("\u0000");
      if (reported.has(pair)) continue;
      reported.add(pair);
      findings.push(
        make(
          "template-overlap",
          "warning",
          def.id,
          `shares ${match.estimated ? "about " : ""}${Math.round(match.similarity * 100)}% of its phrasing with "${match.otherId}": one template wearing two hats`,
        ),
      );
    }
    index.add(def.id, def.class, print);
  }
}

/**
 * Audit a whole batch. `knownFlags` is the governance memory the packs already
 * installed can write — a batch is validated against the world it will land
 * in, not as if it were the only content that exists.
 */
export function auditScenarios(
  defs: readonly ScenarioDef[],
  knownFlags: readonly string[] = [],
  corpus: CorpusContext = {},
): ScenarioFinding[] {
  const findings = defs.flatMap(auditScenario);
  const seen = new Set<string>(corpus.installedIds ?? []);
  for (const def of defs) {
    if (seen.has(def.id)) {
      findings.push(make("duplicate-scenario-id", "error", def.id, `scenario id "${def.id}" appears twice`));
    }
    seen.add(def.id);
  }
  auditFlagEconomy(defs, new Set(knownFlags), findings as FindingSink);
  auditDeadGrievanceGate(defs, findings as FindingSink);
  auditDeadCohortGate(defs, findings as FindingSink);
  auditContinuity(defs, findings);
  auditSeverityMix(defs, findings);
  auditTemplateOverlap(defs, findings, corpus.overlapIndex);
  auditToneTupleMonoculture(defs, findings);
  auditOpeningFramingMonoculture(defs, findings);
  auditConditionCoverage(defs, findings);
  auditFlagWriteReadImbalance(defs, new Set(knownFlags), findings);
  auditCallbackConcentration(defs, findings);
  auditArcBranchCoverage(defs, new Set(corpus.readFlags ?? []), findings as FindingSink);
  auditPromisedFollowUps(defs, corpus, findings);
  auditFamilies(defs, corpus.familyOpeners, findings as FindingSink, corpus.familyCloses);
  auditDilemmaShapeSpread(defs, findings);
  auditMotifSpread(defs, findings);
  auditStockPhrasing(defs, new Map(corpus.phraseCarriers ?? []), findings);
  auditBindings(defs, findings);
  auditCabinetGates(defs, findings);
  auditGroundingBatch(defs, findings as FindingSink);
  auditSpeakerDepartments(defs, findings as FindingSink);
  return findings;
}

/**
 * A batch where who the player appointed changes nothing.
 *
 * The `cabinetAttribute` condition is built, tested, and read by not one
 * shipped scenario — so the promise that the cabinet the player assembled is
 * legible in this week's decision is currently kept by no content at all. A
 * pool-scale warning rather than a per-scenario one, because most individual
 * weeks genuinely have no chair to bind: it is the batch that owes the share.
 */
function auditCabinetGates(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void {
  if (defs.length < CABINET_GATE_BATCH_FLOOR) return;
  const gated = cabinetGatedCount(defs);
  if (gated / defs.length >= CABINET_GATE_SHARE_FLOOR) return;
  findings.push(
    make(
      "cabinet-gate-unused",
      "warning",
      defs[0]!.id,
      `${gated} of ${defs.length} scenarios gate on a cabinetAttribute, under the ${Math.round(CABINET_GATE_SHARE_FLOOR * 100)}% this pool is planned on. ` +
        'Bind one week to the chair the player actually seated — { "kind": "cabinetAttribute", "roleHint": "finance", "attribute": "integrity", "atMost": 0.4 } — ' +
        "or the cabinet screen is a screen the decisions never read",
    ),
  );
}

/** Whether a set of findings is shippable: warnings inform, errors stop. */
export function auditPasses(findings: readonly ScenarioFinding[]): boolean {
  return findings.every((finding) => finding.severity !== "error");
}
