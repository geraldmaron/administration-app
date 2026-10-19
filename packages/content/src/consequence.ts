import { z } from "zod";
import { ReadableFlag, WritableFlag } from "./scenario-deed-flags.js";
import { LENGTH_FLOORS, prose } from "./scenario.js";

// A consequence is the aftermath layer as authored content: what the room is
// told after an outcome has already been decided, and how much further that
// outcome bites. The resolver owns whether an act succeeded; a consequence
// document owns only how it is told. It is data, never code, for the same
// reason a scenario is — it is generated in bulk, and a validator has to be
// able to refuse it.
//
// Every shape here lines up one-for-one with the engine's ConsequenceCard, so
// compiling a document to a card is a rename and nothing else. Where the two
// differ, this side is the narrower one: content may only ever be a subset of
// what the engine is willing to run.

export const ConsequenceInstrument = z.enum(["diplomatic", "economic", "covert", "military", "assistance"]);
export type ConsequenceInstrument = z.infer<typeof ConsequenceInstrument>;

// Three bands rather than five rungs, matching how the engine buckets them:
// the difference between a démarche and a summons is a matter of degree, the
// difference between either and an invasion is a matter of kind.
export const ConsequenceRungBand = z.enum(["low", "mid", "high"]);
export type ConsequenceRungBand = z.infer<typeof ConsequenceRungBand>;

export const ConsequenceValence = z.enum(["success", "partial", "failure"]);
export type ConsequenceValence = z.infer<typeof ConsequenceValence>;

/**
 * Signed movement only, and no approval: approval is derived from the others, so
 * pricing it directly would let a card move a number the simulation computes.
 * The engine's recipe accepts it; content is the narrower side on purpose.
 */
const MetricDeltaShape = z
  .object({
    treasury: z.number().optional(),
    stability: z.number().optional(),
    militaryReadiness: z.number().optional(),
    standing: z.number().optional(),
  })
  .strict();

const RelationshipDeltaShape = z
  .object({
    trust: z.number().optional(),
    alignment: z.number().optional(),
    tension: z.number().optional(),
    tradeDependence: z.number().optional(),
    militaryThreat: z.number().optional(),
  })
  .strict();

/**
 * The closed vocabulary of what an authored aftermath may do: move metrics,
 * move a relationship, plant a grudge, put a line in the feed. Nothing here can
 * reach nation stats, the cabinet, or the removal arc — those change the shape
 * of a campaign, and nothing arriving as generated prose gets to do that.
 */
export const ConsequenceRecipe = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("metric"),
    deltas: MetricDeltaShape,
    // Scale the whole line by how coercive the act was, so one card reads
    // proportionately at rung two and at rung five.
    scaleBySeverity: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("relationship"),
    direction: z.enum(["actor-to-target", "target-to-actor"]),
    deltas: RelationshipDeltaShape,
  }),
  z.object({ kind: z.literal("grudge"), cause: z.string().min(1), weight: z.number().min(0).max(1) }),
  z.object({ kind: z.literal("feed"), headline: prose(LENGTH_FLOORS.press) }),
]);
export type ConsequenceRecipe = z.infer<typeof ConsequenceRecipe>;

/**
 * What the board has to look like for a card to be allowed to speak. Every
 * field is optional and every present field must match — which makes a card
 * with no conditions at all the unconditioned floor that guarantees there is
 * always something to say. The coverage audit is what holds a cell to having
 * one.
 */
export const ConsequenceConditions = z
  .object({
    scenarioClass: z.array(z.string().min(1)).min(1).optional(),
    tone: z.array(z.enum(["conciliatory", "firm", "principled", "evasive", "coercive"])).min(1).optional(),
    flagsSet: z.array(ReadableFlag).min(1).optional(),
    flagsClear: z.array(ReadableFlag).min(1).optional(),
    minTension: z.number().optional(),
    maxTrust: z.number().optional(),
    // Whether the briefing this act came out of turned out to be wrong. `true`
    // makes the card a reveal — it may only ever be told in a week the claim
    // was false, and the audit obliges it to name the check that would have
    // caught it. `false` is the other side of the same bet: the briefing was
    // hedged and it held. Absent on every card that is not about the briefing.
    intelFalse: z.boolean().optional(),
  })
  .strict();
export type ConsequenceConditions = z.infer<typeof ConsequenceConditions>;

export const ConsequenceDef = z.object({
  id: z.string().min(1),
  instrument: ConsequenceInstrument,
  rungBands: z.array(ConsequenceRungBand).min(1),
  valence: ConsequenceValence,
  // Which named failure branch this card is written for. Absent, it fits any
  // branch of its valence; present, it is refused everywhere else — which is
  // why the audit refuses it outright on a valence that has no branches.
  riskAffinity: z.array(z.string().min(1)).min(1).optional(),
  conditions: ConsequenceConditions.optional(),
  weight: z.number().positive(),
  once: z.boolean().optional(),
  // One to three lines, in the game's voice. Only {{actor}} and {{target}} are
  // substituted, so a card cannot reach for any other fact about the world and
  // therefore cannot narrate something the simulation did not do.
  beats: z.array(prose(LENGTH_FLOORS.beat)).min(1).max(3),
  effects: z.array(ConsequenceRecipe),
  sets: z.array(WritableFlag).optional(),
  remembered: prose(LENGTH_FLOORS.remembered).optional(),
});
export type ConsequenceDef = z.infer<typeof ConsequenceDef>;

/** The unit of storage and delivery, mirroring ScenarioPack exactly. */
export const ConsequencePack = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  consequences: z.array(ConsequenceDef).min(1),
});
export type ConsequencePack = z.infer<typeof ConsequencePack>;
