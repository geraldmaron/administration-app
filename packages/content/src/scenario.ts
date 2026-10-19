import { ScenarioSubjectSlot } from "./scenario-subjects.js";
import { IC_ELEMENTS, POSITION_RELATIONSHIP_LIMIT, type IcElementId } from "@admin/engine";
import { worldCities, worldSettlements, SettlementId, CityId, SectorId, StateId } from "@admin/world";
import { z } from "zod";
import { DomesticSignatureShape } from "./domestic-signature.js";
import { WritableFlag } from "./scenario-deed-flags.js";
import { TRANSMISSION_RELAY_KINDS } from "./presentation.js";
// Vocabulary only, and type-only in the other direction, so the two modules
// describe one model without importing each other at runtime.
import { SCENE_REGISTERS } from "./scene.js";
import { ScenarioImpact } from "./impact.js";
import { checkEraAssumptionCoherence, ScenarioEraAssumption, ScenarioTopicTag } from "./scenario-topics.js";
import { EntityRegistryId } from "./entity-registry.js";
// Re-exported (not just imported) — `scenario-cast.ts`, `scenario-audit.ts`,
// and the studio-cli generation brief all import these names from `scenario.js`
// (or from `@admin/content`, which re-exports this module wholesale), so the
// split must not move where they resolve from.
export {
  ScenarioRejoinderSpeaker,
  ScenarioRoleHint,
  ScenarioSpeaker,
  ScenarioSpeakerRoleHint,
} from "./scenario-speaker.js";
export { scenarioEra, ScenarioEraAssumption, TOPIC_TAGS, ScenarioTopicTag } from "./scenario-topics.js";
export { ENTITY_REGISTRY, EntityRegistryId } from "./entity-registry.js";
export type { EntityRegistryEntry } from "./entity-registry.js";
export {
  DilemmaShape,
  Motif,
  ScenarioClass,
  ScenarioInstrument,
  PressureSource,
  ScenarioConflictMove,
  ScenarioIntelConfidence,
  ScenarioLocusSite,
  ScenarioPolicyDomain,
  ScenarioSeverity,
  ScenarioTone,
} from "./scenario-labels.js";
import {
  DilemmaShape,
  Motif,
  ScenarioClass,
  ScenarioInstrument,
  PressureSource,
  ScenarioConflictMove,
  ScenarioIntelConfidence,
  ScenarioLocusSite,
  ScenarioSeverity,
  ScenarioTone,
} from "./scenario-labels.js";
import { ScenarioRejoinderSpeaker, ScenarioSpeaker, ScenarioSpeakerRoleHint } from "./scenario-speaker.js";
import { ConditionKind, ScenarioCast, ScenarioCondition } from "./scenario-conditions.js";

export {
  DomesticMagnitudeSchema,
  DomesticSignatureShape,
  MAGNITUDE_STEP,
  STATE_ROUTE_CAP,
  STATE_ROUTE_TURN_CAP,
} from "./domestic-signature.js";
export type { DomesticMagnitudeSchema as DomesticMagnitude, DomesticSignatureShape as DomesticSignature } from "./domestic-signature.js";

// A scenario is a decision in waiting: a piece of authored writing plus the
// conditions under which the live board makes it true. It is data, never code
// — bulk generation, validation, storage, and delivery all depend on a
// scenario being a JSON document a validator can refuse.

// The cast pick and the condition union moved to scenario-conditions.ts and
// are re-exported here, so every import path that named this file still
// resolves.
export { ConditionKind, ScenarioCast, ScenarioCondition } from "./scenario-conditions.js";

/**
 * How many times the record has to have tested a trait before content may
 * assert the world has read it.
 *
 * The profile answers every question about a fresh campaign with the midpoint,
 * because "the record does not say" and "they do both about equally" are the
 * same number — so a bare bound would fire a scenario about the player's
 * established pattern on a government that has not yet done anything. Three is
 * the smallest count a person would call a pattern rather than a coincidence,
 * and it is the number the design argues from: a state that has conceded three
 * times is one whose next probe gets priced cheaper.
 */
export const REVEALED_PREFERENCE_EVIDENCE_FLOOR = 3;

// Dynamic urgency: a scenario's draw weight scales with how bad things
// actually are, so a tense border makes border trouble likelier rather than
// merely possible.
export const WeightBoost = z.object({
  // `conditionSeverity` and `warIntensity` are the two that read the board's own
  // multi-turn state rather than a metric standing in for it: a famine getting
  // worse makes famine content likelier as it gets worse, which is the thing
  // "dynamic urgency" was always supposed to mean.
  //
  // `flagAge` is the one that reads the player's own file instead of the world:
  // it climbs the longer the scenario's gating flag has stood, so a follow-up
  // ripens onto the desk rather than competing at flat weight against the whole
  // live pool forever. It is only meaningful on a scenario that carries a
  // `{ kind: "flag", is: true }` condition — there is no flag to age otherwise,
  // and the audit refuses it as inert.
  // `institutionStrain` is `flagAge`'s counterpart on the executive branch, and inert without an `institutionState` condition: see scenario-institutions.ts.
  source: z.enum(["tension", "distrust", "instability", "removalPressure", "conditionSeverity", "warIntensity", "flagAge", "institutionStrain"]),
  factor: z.number(),
  // Read by `conditionSeverity` alone: one kind's severity instead of the worst on the board, so a flood cannot raise an inflation week.
  kind: ConditionKind.optional(),
});
export type WeightBoost = z.infer<typeof WeightBoost>;

/**
 * The shortest a prose field may be and still be prose. `min(1)` accepted a
 * single character, which meant a generator that emitted `"text": "."` produced
 * a document the schema called valid and the audit then measured for register,
 * neutrality and overlap — every one of which passes trivially on nothing.
 *
 * These are refusal floors, not authoring targets: each sits under the shortest
 * line in the shipped packs, so what they catch is a stub rather than a writer's
 * deliberate brevity. The target a writer aims for is a warning
 * (`LENGTH_TARGETS`), and the point a field stops fitting its surface is the
 * ceiling (`LENGTH_CEILINGS`) — both in scenario-audit.ts. Exported so the
 * generation brief quotes the numbers the schema actually enforces.
 */
export const LENGTH_FLOORS = {
  subject: 12,
  beat: 60,
  reply: 40,
  remembered: 50,
  press: 40,
  locus: 20,
  transmission: 60,
} as const;

/** Shared with every other content document type, so one register has one floor helper. */
export const prose = (floor: number) => z.string().trim().min(floor);

/**
 * What the room already knows, that a briefing would not stop to say.
 *
 * The opening beats are what is *spoken*; this is what is on the table. It
 * exists because the corpus measured thin for a reason that was structural
 * rather than literary: a scenario was obliged to state a dilemma and never
 * obliged to brief it, so a player had no way to answer the questions the
 * person in that chair would ask first — has this happened before, who is
 * pushing it, what does it cost me to do nothing, and what do we not know.
 *
 * Optional, on the same path `dilemmaShape` and `impact` took. It arrives
 * optional because 303 shipped scenarios do not carry one, and it becomes
 * required once they do — leaving it optional past that point is how a surface
 * becomes one nothing has to fill in and so nothing does.
 */
export const ScenarioContext = z
  .object({
    /** How this arrived and how long it has been true. */
    standing: prose(LENGTH_FLOORS.beat),
    /**
     * What happened the last time a government faced this. Written about
     * governments rather than about a named country, so it survives casting.
     */
    precedent: prose(LENGTH_FLOORS.beat),
    /**
     * Two to four parties and what each wants. This is the field that makes a
     * decision feel governed rather than solved: a dilemma with no constituency
     * behind either answer is a puzzle, and a government does not face puzzles.
     */
    pressures: z.array(z.object({ source: PressureSource, want: prose(LENGTH_FLOORS.reply) })).min(2).max(4),
    /**
     * The honest price of not deciding. A scenario whose "do nothing" costs
     * nothing is a scenario with no stakes, and this is where that is caught.
     */
    inaction: prose(LENGTH_FLOORS.beat),
    /**
     * What the room cannot tell you. Paired with `intelConfidence` when the
     * briefing is doubtful: this is the sentence a reveal answers.
     */
    unknown: prose(LENGTH_FLOORS.reply),
  })
  .strict();
export type ScenarioContext = z.infer<typeof ScenarioContext>;

/**
 * What a scenario that reads no board state says about itself.
 *
 * A scenario filed in a state-dependent class (economy, war, disaster, public
 * health, unrest) normally gates on that state. One that cannot has to say
 * why, in the open: either it is the kind of week that deals on any board, or
 * it is the incident that creates the state it describes. Silence is not a
 * declaration, and the audit refuses it.
 */
export const ScenarioPremise = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("universal"), reason: prose(LENGTH_FLOORS.reply) }).strict(),
  z.object({ kind: z.literal("introduces"), what: prose(LENGTH_FLOORS.reply) }).strict(),
]);
export type ScenarioPremise = z.infer<typeof ScenarioPremise>;

export const ScenarioBeat = z.object({
  speaker: ScenarioSpeaker,
  text: prose(LENGTH_FLOORS.beat),
});
export type ScenarioBeat = z.infer<typeof ScenarioBeat>;

export const ScenarioLocus = z.object({
  site: ScenarioLocusSite,
  // Whose ground the event is on, said out loud rather than inferred. This was
  // optional, and resolveLocus filled the gap with "counterpart" — which is not
  // a neutral default, because a scenario almost always carries a cast. An
  // author who simply did not think about ground got their event geolocated in
  // whichever foreign nation the board had cast, and 132 domestic scenarios
  // shipped on foreign soil without failing a single check: the field was
  // optional so the parse passed, and the default was legal so the audit passed.
  ground: z.enum(["home", "counterpart"]),
  descriptor: prose(LENGTH_FLOORS.locus),
  city: CityId.optional(),
  settlement: z.enum(["small", "commercial-port", "road-border"]).optional(),
  settlementId: SettlementId.optional(),
  state: StateId.optional(),
  sector: SectorId.optional(),
  // Bind the place to the thing that is happening rather than rolling one.
  // Without this a scenario about a live condition picked its own state, so a
  // week about the wildfires could open in a state that was not burning. Absent
  // is the ordinary case: the resolver places the event as it always has.
  bind: z.literal("condition").optional(),
  // A border site that is the counterpart's frontier with the player's own
  // country, rather than with whichever neighbor the roll lands on. Without it
  // a "checkpoint our trucks are held at" week was datelined on a frontier the
  // President has no side of. Pair it with a `sharesBorder` condition so the
  // week is only dealt for a neighbor.
  frontier: z.literal("home").optional(),
});
export type ScenarioLocus = z.infer<typeof ScenarioLocus>;

// The hard facts of the event, structured so a screen can set them as data
// instead of mining them back out of prose: a casualty count, a clock time,
// what the trace amounts to. Prose still says "nineteen dead so far" — a
// particular says `Dead so far · 19`, in the register of a wire desk's slug
// line. Figures are welcome here and only here (the numeral-in-prose audit
// deliberately skips particulars), but every other language rule — register,
// world-neutrality, no real outlets — still applies, because a particular is
// player copy like anything else.
export const ScenarioParticular = z.object({
  label: z.string().trim().min(2).max(24),
  value: z.string().trim().min(1).max(36),
});
export type ScenarioParticular = z.infer<typeof ScenarioParticular>;

// What the counterpart said, and how it got here.
//
// This is the whole of a foreign government's voice in a scenario. It is not a
// beat and cannot be one: it is relayed material the room reads, so it renders
// as a document attached to the channel rather than as a message inside it. A
// head of state does not text a president.
//
// `relay` is authored because how the words arrived changes what they are
// worth — a cable is what they chose to send, an intercept is what they did
// not, and a broadcast was aimed at their own people at least as much as at
// yours. `attribution` names the office that issued it, never a person: the
// board decides which nation this is cast onto, and its officials are rolled
// per campaign.
export const ScenarioTransmission = z.object({
  domesticSubject: z.string().regex(/^[a-zA-Z]{2,24}$/).optional(),
  relay: z.enum(TRANSMISSION_RELAY_KINDS as unknown as [string, ...string[]]),
  attribution: z.string().trim().min(4).max(48),
  text: prose(LENGTH_FLOORS.transmission),
  /**
   * Whether the counterpart government is the one speaking.
   *
   * A transmission is stamped with the nation it was cast onto, and for a
   * cable from their foreign ministry that is exactly right. For an armed
   * group holding hostages inside that nation it is a libel: the card read
   * "United States · the group holding them", which says the American
   * government is the hostage-taker. A non-state voice is placed *in* the
   * nation instead of being credited to it. Absent means a government spoke.
   */
  voice: z.enum(["state", "nonstate"]).optional(),
});
export type ScenarioTransmission = z.infer<typeof ScenarioTransmission>;

// Signed movement, never absolutes, and approval is derived so it cannot be
// priced directly.
//
// `readiness` was the field's name before commit 65635de7 renamed it to
// `militaryReadiness`. The local corpus was migrated, but a
// remote content service can still serve shards cut before that migration —
// deploying its replacement needs an interactive credential this app cannot
// assume it has. A `.strict()` shape has no way to say "known-old name,"
// so it drops the whole scenario, silently, on a rename it did not cause.
// Normalizing the deprecated key here — before the strict shape ever sees
// it — is the same proof the migration itself relied on: a shard authored
// under the old name still means what it always meant.
const MetricCostShape = z.preprocess((raw) => {
  if (raw && typeof raw === "object" && "readiness" in raw && !("militaryReadiness" in raw)) {
    const { readiness, ...rest } = raw as Record<string, unknown>;
    return { ...rest, militaryReadiness: readiness };
  }
  return raw;
}, z
  .object({
    treasury: z.number().optional(),
    stability: z.number().optional(),
    militaryReadiness: z.number().optional(),
    standing: z.number().optional(),
  })
  .strict());

const AlignmentPullShape = z
  .object({
    economicLeftRight: z.number().optional(),
    authLibertarian: z.number().optional(),
    nationalistGlobalist: z.number().optional(),
  })
  .strict();

/**
 * The bounded reach a spoken answer has into the world it is about.
 *
 * A position that moved the player's own metrics and nothing else would let a
 * reply say the war was over while the front went on billing the country every
 * week. These are the two ways authored words touch the board:
 * what the two governments now make of each other, and what happens to the war
 * they are fighting. Both are deliberately small. The bound is the engine's
 * own — imported rather than restated, so content cannot drift past what the
 * engine considers a sentence's worth of movement — and the enum is the
 * engine's list of peace moves, for the same reason.
 */
const relationshipReach = z.number().min(-POSITION_RELATIONSHIP_LIMIT).max(POSITION_RELATIONSHIP_LIMIT);

const PositionRelationshipShape = z
  .object({
    trust: relationshipReach.optional(),
    tension: relationshipReach.optional(),
    militaryThreat: relationshipReach.optional(),
  })
  .strict();

const GazetteerReach = z
  .object({
    cityEmployment: z.number().int().optional(),
    taxBase: z.number().optional(),
    adminLean: z.number().min(-1).max(1).optional(),
    taxHolidayYears: z.number().int().min(0).max(15).optional(),
    stateLean: z.number().min(-0.15).max(0.15).optional(),
    sectorEmployment: z.number().int().optional(),
    sectorLaborPressure: z.number().min(-0.2).max(0.2).optional(),
  })
  .strict();

// Re-exported rather than restated so the generation brief, which may not
// depend on the engine, still quotes the number the parser enforces.
export { POSITION_RELATIONSHIP_LIMIT };

/**
 * What comes back after the player commits, before the week closes.
 *
 * The one beat a position reply has never had. An instrument reply goes through
 * the resolver and earns an aftermath: a branch, odds that held or did not, a
 * drawn consequence card. A position resolves into arithmetic and a narrator
 * restating the sentence the player picked — measured across the shipped corpus
 * that is 749 of 827 replies, so nine answers in ten produce no event at all.
 * The player chooses, a number moves, and the week ends.
 *
 * A generic aftermath pool cannot fill this. `eligibleConsequences` keys on
 * instrument, rung band and valence, and a position has no instrument, no rung
 * and no uncertain outcome to narrate — a card general enough to fit every
 * position would be vague by construction, which is worse than silence. So this
 * is authored, per reply, and specific to the answer it follows.
 *
 * The rule that makes it worth writing: a rejoinder is NOT a summary. The
 * `remembered` line already says what was decided. This is the first cost
 * arriving, or the thing the room did not know when it advised — the chair who
 * agreed naming what it will take, the fact that only surfaces once the
 * decision is made. A rejoinder that restates the choice is a beat the player
 * learns to skip, and the audit measures it.
 *
 * Prose only, and no effects. What the answer costs is priced on the commitment
 * and measured by the stakes rules; letting a rejoinder move the board on top of
 * that would put a second, unaudited price on every position. This narrates the
 * commitment; it does not add to it.
 */
export const ScenarioRejoinder = z.object({
  speaker: ScenarioRejoinderSpeaker,
  text: prose(LENGTH_FLOORS.beat),
});
export type ScenarioRejoinder = z.infer<typeof ScenarioRejoinder>;

export const ScenarioReply = z.object({
  id: z.string().min(1),
  tone: ScenarioTone,
  text: prose(LENGTH_FLOORS.reply),
  // Governance memory: flags stamped when this reply is chosen, which later
  // scenarios may condition on. How a player answers becomes who they are.
  sets: z.array(WritableFlag).optional(),
  // A press headline for answers big enough that the papers would have one.
  // Authored, templated, and rare on purpose: if every reply makes news,
  // none of them do.
  press: prose(LENGTH_FLOORS.press).optional(),
  /**
   * How the arc ends if this is the answer, on the replies of a family's
   * `close` member and nowhere else. Every reply there carries one, and a close
   * holds at least one of each, so no arc has a single cutscene ending. `lapsed`
   * is not authorable: it is the engine's word for an arc nobody ended.
   */
  resolves: z.enum(["held", "lost"]).optional(),
  commitment: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("position"),
      importSuspensionDays: z.number().int().min(1).max(365).optional(),
      cost: MetricCostShape,
      pull: AlignmentPullShape.optional(),
      remembered: prose(LENGTH_FLOORS.remembered),
      // Required, on the same path `dilemmaShape` took: the field arrived
      // optional because no corpus carried it, and all 749 shipped positions
      // now do. Leaving it optional past that point is how a surface becomes
      // one nothing has to fill in and so nothing does, which is this repo's
      // recurring defect class. A position that answers nothing is now a
      // document the parser refuses rather than a warning somebody reads.
      rejoinder: ScenarioRejoinder,
      /**
       * What this answer did to people and to money, declared in bands the
       * impact model prices against the nation that bore it (impact-model.ts).
       *
       * Optional only while the corpus migrates off authored `cost`. The two
       * are alternatives rather than layers: a reply states what it spent, or
       * it states what it did, and a reply doing both would be billed twice for
       * one decision.
       */
      impact: ScenarioImpact.optional(),
      // Signed movement on the edge with the cast counterpart, in both
      // directions: an answer changes what each government makes of the other.
      relationship: PositionRelationshipShape.optional(),
      // Only on a scenario gated on the player being at war — the audit refuses
      // it anywhere else, because a peace move in a week that cannot be wartime
      // is a promise the board can never keep.
      conflictMove: ScenarioConflictMove.optional(),
      // Executes against this case's pinned issued report at commit time. A
      // writer supplies only the next question and lawful element/discipline;
      // target and tasking id come from the report, never authored copy.
      collection: z.discriminatedUnion("action", [
        z.object({ action: z.literal("close") }),
        z.object({ action: z.literal("task"), element: z.enum(IC_ELEMENTS.map((entry) => entry.id) as [IcElementId, ...IcElementId[]]),
          discipline: z.enum(["humint", "sigint", "geoint", "masint", "osint", "finint", "all-source"]),
          question: z.string().trim().min(12).max(180) }),
      ]).optional(),
      /** Sign the existing federal relief order against this report's pinned governor request. */
      relief: z.literal(true).optional(),
      /** Take an existing state response against this report's pinned governor request. */
      localeAct: z.enum(["relief", "review"]).optional(),
      /**
       * A real tariff on the counterpart's goods, under the trade law that fits.
       * On a `tradeMeasure` cast it answers the pinned retaliation and must match
       * the gate's response sector and rate; on any other nation cast it is laid
       * on the counterpart at the stated sector and rate.
       */
      tariff: z.object({ sector: z.string().min(1), rate: z.number().positive().max(1) }).optional(),
      /**
       * Lift a tariff of this administration's on the counterpart: `answered`
       * (the default) is the one the pinned retaliation answers, `response` the
       * one laid back on the retaliation gate's response goods. `theirs` lifts
       * the pinned retaliation on the same day, as the agreement says. Needs a
       * `tradeMeasure` cast and a `tariffInForce` gate of the same `of`.
       */
      tariffLift: z.object({ theirs: z.boolean(), which: z.enum(["answered", "response"]).optional() }).optional(),
      /** Direct an investigation into the pinned open inspector-general matter. */
      directive: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("investigation") }),
        z.object({ kind: z.literal("enforcement-posture"), subject: z.string().trim().min(12).max(180) }),
        z.object({ kind: z.literal("inspector-removal-notice"), reason: z.string().trim().min(12).max(180) }),
      ]).optional(),
      /** Transmit an eligible administration bill through the existing congressional calendar. */
      transmit: z.string().min(1).optional(),
      /** Act on the specific live bill frozen by the scenario binder. */
      billText: z.discriminatedUnion("action", [
        z.object({ action: z.literal("propose") }),
        z.object({ action: z.literal("recommend"), text: z.enum(["base", "targeted", "house", "senate"]) }),
      ]).optional(),
      /** Submit the candidate frozen with an actual vacant Court seat. */
      judicialNomination: z.object({ action: z.literal("submit"), candidate: z.enum(["first", "alternate"]) }).optional(),
      /** Prospectively rescind the signed order frozen with a pending court case. */
      orderRescission: z.object({ action: z.literal("rescind") }).optional(),
      /** Answer the frozen adverse lower judgment through its existing court-response case. */
      orderReview: z.object({ choice: z.enum(["accept", "seek", "seek-with-stay"]) }).optional(),
      gazetteer: GazetteerReach.optional(),
      // Systemic who-it-hits-at-home, compiled beside gazetteer (locus-specific).
      // A reply may carry either or both; they are not alternatives the way
      // cost and impact are.
      domestic: DomesticSignatureShape.optional(),
    }),
    z.object({
      kind: z.literal("instrument"),
      instrument: ScenarioInstrument,
      // Literals rather than a bounded number so the inferred type is the
      // engine's RungLevel and a generated 2.5 or 6 cannot parse.
      rung: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      domestic: DomesticSignatureShape.optional(),
      /**
       * The room answering the order at the moment it is given. An instrument's
       * outcome is narrated by the resolver and the consequence bank; this beat
       * is earlier — the acknowledgment, the first friction, the dissent going
       * on the record — and it is written blind to the roll. It must be true
       * whichever branch resolves: no "it worked", no "it failed", no odds
       * restated. Optional while the corpus backfills, on the same path
       * `rejoinder` took on position replies before it became required.
       */
      rejoinder: ScenarioRejoinder.optional(),
    }),
    // Entering a war somebody else is already fighting. Without this the only
    // way to write "our forces go and stand with them" was a military rung
    // aimed at the cast nation — which, cast onto the ally being defended,
    // invades the country the reply meant to save.
    z.object({
      kind: z.literal("join"),
      // Whose side, relative to the nation the scenario cast. "beside" is the
      // common case (the ally asked and the answer is yes); "against" is
      // entering opposite them, which is how a guarantor answers an invasion.
      side: z.enum(["beside", "against"]),
      // Same commit-time beat an instrument carries, under the same
      // blind-to-the-outcome rule.
      rejoinder: ScenarioRejoinder.optional(),
    }),
  ]),
});
export type ScenarioReply = z.infer<typeof ScenarioReply>;

export const ScenarioDef = z.object({
  id: z.string().min(1),
  class: ScenarioClass,
  severity: ScenarioSeverity,
  // Required, since the backfill landed: all 247 shipped scenarios, both packs,
  // and every batch carry a shape. It arrived optional so the field could exist
  // before the corpus did; leaving it optional after that would have made it
  // the thing it exists to prevent — a surface nothing has to fill in, going
  // quietly unread.
  dilemmaShape: DilemmaShape,
  // Additive: absent on every scenario shipped before this field existed, and
  // those still parse — an untagged scenario is unclassified, not off-topic.
  // The corpus is retagged by a separate content-lead pass, not by this schema
  // change.
  topics: z.array(ScenarioTopicTag).optional(),
  // Additive, same contract as `topics`: absent on every scenario shipped
  // before this field existed, and those still parse. Which recurring
  // fictional corporate/institutional actors this scenario names — see
  // `entity-registry.ts` for why the table lives here and not in
  // `@admin/world`, and for the closed vocabulary itself.
  entities: z.array(EntityRegistryId).optional(),
  subjects: z.array(ScenarioSubjectSlot).max(8).optional(),
  // Optional and read as "evergreen" wherever absent (see `scenarioEra`),
  // rather than defaulted by the schema — a zod `.default()` here would make
  // the field non-optional on `z.infer<typeof ScenarioDef>`, which every
  // hand-typed literal in packs/core.ts and the fixtures would then fail to
  // satisfy without being touched, and this change is not a corpus edit.
  eraAssumption: ScenarioEraAssumption.optional(),
  staleAfter: z.string().min(1).optional(),
  // Optional and capped at three: see the `Motif` doc comment for why this
  // field is seeded rather than measured, and why leaving it unset is the
  // honest default until a corpus exists to measure against.
  motifs: z.array(Motif).min(1).max(3).optional(),
  // Absent on almost every scenario, and that is the design: a board where any
  // briefing might be a lie is a board nobody can plan against. Present, it
  // obliges the prose to carry its tell and the replies to include something
  // the aftermath layer can answer — both audit-enforced.
  intelConfidence: ScenarioIntelConfidence.optional(),
  subject: prose(LENGTH_FLOORS.subject),
  cast: ScenarioCast,
  conditions: z.array(ScenarioCondition),
  weight: z.number().positive(),
  boosts: z.array(WeightBoost).optional(),
  // A scenario that can only happen to a country once. Enforced through the
  // same flag set replies write to, so "once" and "remembered" are one system.
  once: z.boolean().optional(),
  // Marked, not deleted: a retired scenario is pulled out of the drawable
  // pool (see `memoryPool` in corpus/pool.ts, the one place selectors are
  // built from bodies) while its body and the flags its replies set stay on
  // disk and in the campaign's memory — a scenario a player already answered
  // is a promise the corpus keeps regardless of whether it can be dealt
  // again. Absent everywhere: retirement is an event on a shipped scenario,
  // never an authored starting state.
  retired: z.boolean().optional(),
  /**
   * The arc this scenario belongs to, where it belongs to one.
   *
   * `opener` binds its counterpart the ordinary way and pins it; `beat` and
   * `close` bind to the pin instead of re-ranking, so a callback written about
   * last month's crisis arrives about the country the president actually dealt
   * with rather than about whoever tops the ranking this week. A `close` ends
   * the family: nothing further in it is dealt.
   *
   * Absent on a standalone scenario, which is most of them. A family is what a
   * multi-part story needs and a single dilemma does not.
   */
  family: z
    .object({ id: z.string().min(1), role: z.enum(["opener", "beat", "close"]) })
    .optional(),
  setPiece: z.object({ reason: z.string().min(1), owner: z.string().min(1) }).optional(),
  // Required. A diffuse event still has a site the room would be told about —
  // a currency run has the branch with the queue outside it, a contested
  // swearing-in has the chamber that refused — and every scenario the map can
  // pin is a scenario the situation room can brief. Making this optional made
  // the choice a coin flip per batch and left the map with nothing to point at.
  locus: ScenarioLocus,
  // What the room already knows. See `ScenarioContext` for why it is optional
  // and what has to be true before it stops being.
  context: ScenarioContext.optional(),
  premise: ScenarioPremise.optional(),
  /**
   * The department that answers for the matter, where the first cabinet chair
   * to speak is not it. The memo's letterhead, preparer and audit read this
   * before they fall back to speaker order, which otherwise decides who briefs.
   */
  responsibleOffice: ScenarioSpeakerRoleHint.optional(),
  // Optional and capped at four: a wire strip is a glance, not a table, and a
  // scenario whose facts will not fit in four particulars should spend them on
  // the four that would make a minister stop walking.
  particulars: z.array(ScenarioParticular).min(1).max(4).optional(),
  // How the place looks by the time it is photographed, when the derivation
  // would get it wrong. Everything else about the still is joined from facts
  // the scenario already carries — its class and its locus site — and the
  // register is derived from the board state it is gated on, so this is an
  // override and not a required tag. It exists because derivation cannot know
  // the one case an author can: a triumph held in a city that is still ruined,
  // a trial conducted in a courthouse with its windows out. Left unset on
  // almost every scenario, which is the point.
  scene: z.object({ register: z.enum(SCENE_REGISTERS) }).optional(),
  opening: z.array(ScenarioBeat).min(1),
  // What the counterpart said, if they said anything. At most one: a transmission
  // is a document the room reads, and a room reading two of them is a thread
  // wearing a different coat.
  transmission: ScenarioTransmission.optional(),
  replies: z.array(ScenarioReply).min(2),
}).superRefine((def, ctx) => {
  if (new Set(def.subjects?.map((slot) => slot.key)).size !== (def.subjects?.length ?? 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subjects"], message: "Subject keys must be unique" });
  }
  if (def.conditions.filter((condition) => condition.kind === "sharedMembership" && condition.present).length > 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conditions"], message: "One positive sharedMembership gate per scenario, so the body it names is the one it accepted" });
  }
  if (def.locus.frontier && (def.locus.site !== "border" || def.locus.ground !== "counterpart")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["locus", "frontier"], message: "A home frontier belongs to a border site on the counterpart's ground" });
  }
  if (def.locus.frontier && !def.conditions.some((condition) => condition.kind === "sharesBorder" && condition.present)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conditions"], message: "A home frontier needs a sharesBorder condition so the week is only dealt for a neighbor" });
  }
  if (def.locus.city && (def.locus.settlement || def.locus.settlementId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["locus"], message: "Bind one settlement or one economic city, not both" });
  if (def.locus.settlementId && !worldSettlements.some((place) => place.id === def.locus.settlementId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["locus", "settlementId"], message: "Unknown sourced settlement" });
  def.replies.forEach((reply, index) => {
    if (reply.commitment.kind === "position" && reply.commitment.impact?.financial?.scope === "city" && !worldCities.some((city) => city.id === def.locus.city && city.population > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["replies", index, "commitment", "impact", "financial", "scope"], message: "city financial scope requires a bound locus.city" });
    }
  });
  // A transmission is words from the counterpart, so a scenario with no
  // counterpart cannot have one. Caught here rather than in the audit because
  // it is incoherence rather than craft: there is no writer's judgment under
  // which trouble entirely at home arrives as a foreign cable.
  if (def.transmission && def.cast.pick === "none" && !def.transmission.domesticSubject) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["transmission"],
      message: "a scenario with no counterpart (cast.pick: none) cannot carry a transmission: there is nobody to have sent it",
    });
  }
  if (def.transmission?.domesticSubject && (def.locus.ground !== "home" || !["letter", "readout"].includes(def.transmission.relay) ||
    !def.subjects?.some((slot) => slot.key === def.transmission?.domesticSubject && ["governor", "mayor", "member", "inherit"].includes(slot.source)))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["transmission", "domesticSubject"], message: "A domestic letter/readout requires a declared bound official on home ground" });
  }
  // An unreliable briefing needs somewhere to be proved wrong, and the only
  // path that reaches the aftermath pool is a reply that commits an instrument
  // — which a scenario with no counterpart may not carry. So the combination is
  // not a scenario a writer can fix; it is one the design cannot currently
  // deliver, and it is refused here so that fact arrives once, at parse, saying
  // why.
  //
  // Discovered the hard way: left to the audit, the same scenario drew
  // `intel-doubt-unanswerable` for having no instrument reply and
  // `domestic-incoherence` for adding one, and a writer could bounce between
  // the two indefinitely without either finding admitting the other existed.
  //
  // This is containment, not the fix. Making the domestic half of the corpus
  // able to carry a doubtful briefing means letting a reveal be drawn off a
  // position commitment, which widens the engine's consequence contract.
  if (def.intelConfidence !== undefined && def.intelConfidence !== "confirmed" && def.cast.pick === "none") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["intelConfidence"],
      message:
        `a scenario with no counterpart (cast.pick: none) cannot be marked "${def.intelConfidence}": a doubtful briefing is ` +
        "resolved by a reply that reaches for an instrument, and a domestic scenario has none to reach for, so the claim " +
        "could never be proved wrong to the player — write it as an ordinary briefing, or give it a counterpart",
    });
  }
  // An age is read off the marker a flag leaves when it is set, and a flag that
  // must still be unset has none: the gate would open the week after, not N
  // weeks after. Date the wait from the deed that did happen instead.
  def.conditions.forEach((condition, index) => {
    if (condition.kind !== "flag" || condition.is || condition.agedAtLeast === undefined) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["conditions", index, "agedAtLeast"],
      message: `agedAtLeast on "${condition.flag}" with is: false ages nothing; gate on a flag that was set, such as the opener's scenario:<id>, and age that`,
    });
  });
  checkCloseDispositions(def, ctx);
  // The masthead token is filled only by an outlet cast; anywhere else it would
  // reach the screen as a raw brace.
  if (def.cast.pick !== "outlet" && JSON.stringify(def).includes("{{outlet}}")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cast"],
      message: '{{outlet}} names the newspaper an outlet week is about, and this scenario is not cast on one (cast.pick: "outlet")',
    });
  }
  // Era-assumption/staleAfter coherence lives in scenario-topics.ts, next to
  // the rest of the era-assumption vocabulary.
  checkEraAssumptionCoherence(def, ctx);
});
export type ScenarioDef = z.infer<typeof ScenarioDef>;

/**
 * A close says how the arc ended, on every door, with both endings possible.
 * Refused at parse rather than audited: an arc whose ending is missing or has
 * only one outcome is a document the Record cannot report, not a craft call.
 */
function checkCloseDispositions(
  def: { readonly family?: { readonly role: string }; readonly replies: readonly { readonly id: string; readonly resolves?: "held" | "lost" }[] },
  ctx: z.RefinementCtx,
): void {
  const closing = def.family?.role === "close";
  def.replies.forEach((reply, index) => {
    if (closing && reply.resolves === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replies", index, "resolves"],
        message: `reply "${reply.id}" closes an arc and does not say how it ended: mark it "held" or "lost"`,
      });
    }
    if (!closing && reply.resolves !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replies", index, "resolves"],
        message: `reply "${reply.id}" says how an arc ended, but this scenario is not a family's close`,
      });
    }
  });
  if (!closing) return;
  for (const ending of ["held", "lost"] as const) {
    if (def.replies.some((reply) => reply.resolves === ending)) continue;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["replies"],
      message: `a close with no "${ending}" reply has one ending whatever the President says: give at least one reply each`,
    });
  }
}

// The unit of storage and delivery: what studio-cli validates and publishes,
// what the API serves, and what the app bundles as its offline floor.
export const ScenarioPack = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  scenarios: z.array(ScenarioDef).min(1),
});
export type ScenarioPack = z.infer<typeof ScenarioPack>;

/** The flag a committed scenario stamps, which `once` scenarios gate on. */
export function scenarioFiredFlag(id: string): string {
  return `scenario:${id}`;
}

/**
 * Which door the president took, the last time this document was on the desk.
 *
 * `scenarioFiredFlag` says the decision was taken and its marker says when;
 * this says *what was decided*, which is the half a returning scenario needs
 * to open by acknowledging the earlier answer rather than as if the week had
 * never happened. Keyed by reply rather than carrying the text, because the
 * course a player reads is authored prose that a republished corpus may have
 * rewritten — the flag record is an id, and the sentence is resolved from
 * whichever version of the scenario is installed now.
 */
export function scenarioAnsweredFlag(id: string, replyId: string): string {
  return `scenario-answer:${id}:${replyId}`;
}

/**
 * The flag stamped when a scenario of this class reaches the desk, which is
 * what the pacing director reads back to know what the player has recently been
 * shown. Kept here beside `scenarioFiredFlag` rather than in the director,
 * because the writer of it is `rememberReply` and the reader is the director —
 * a helper each of them imports is not a helper either of them should own.
 */
export function classStagedFlag(scenarioClass: ScenarioClass, turn: number): string {
  return `staged:${scenarioClass}:${turn}`;
}

/**
 * The severity counterpart of `classStagedFlag`: stamped when a scenario of
 * this severity is answered, read back by the director to keep two
 * building-shaking weeks from arriving back to back. Same home, same reason —
 * `rememberReply` writes it and the director reads it.
 */
export function severityStagedFlag(severity: ScenarioSeverity, turn: number): string {
  return `staged-severity:${severity}:${turn}`;
}
