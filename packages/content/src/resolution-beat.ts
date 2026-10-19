import {
  branchesFor,
  MILITARY_BRANCHES,
  UNIT_ECHELONS,
  type MilitaryBranch,
  type UnitDesignationConstraint,
  type UnitEchelon,
} from "@admin/world";
import { z } from "zod";
import { ConsequenceInstrument, ConsequenceRungBand, ConsequenceValence } from "./consequence.js";
import { LENGTH_FLOORS, prose } from "./scenario.js";

// The staged resolution layer: what the room watches happen between the order
// and the packet. A consequence document is the aftermath card told once the
// dust settles; this is the ordered sequence of steps played while it settles,
// and the two never share a line.
//
// It is pre-authored template data selected by a pure key, because the game
// makes no model call at play time. Everything a step can say has to be
// writable months earlier by a person who does not know which campaign will
// draw it, which is why the only facts a step may reach for arrive through the
// four named-particular slots below.
//
// Nothing here carries an effect. The outcome is already computed before the
// first step plays and lands through the EffectPacket the resolver built; a
// sequence only narrates it. That is also why there is no "pending" or
// "unknown" step outcome to author: a step that claimed the result was still
// open would be jeopardy the packet has already contradicted.

/**
 * The only facts a step may name.
 *
 * Each one has a known filler at selection time — the two nations from the
 * resolution request, a generated unit designation, a name-bank person. A slot
 * with no generator behind it would be a line that can never be completed, so
 * the list is closed and grows only when a filler ships with it.
 */
export const ResolutionParticular = z.enum(["actor", "target", "unit", "person"]);
export type ResolutionParticular = z.infer<typeof ResolutionParticular>;

/** What a step is, in the grammar of an act being carried out. */
export const ResolutionStepKind = z.enum([
  "order-given",
  "movement",
  "contact",
  "named-unit-attack",
  "loss",
  "rescue",
  "hold",
  "stand-down",
  "report-back",
]);
export type ResolutionStepKind = z.infer<typeof ResolutionStepKind>;

/**
 * A step's own turn, one of four settled values.
 *
 * `held` is a step where nothing moved either way — an order read out, a column
 * on the road. It is not suspense; it is the part of the act with no local
 * result yet.
 */
export const ResolutionStepOutcome = z.enum(["held", "gain", "cost", "mixed"]);
export type ResolutionStepOutcome = z.infer<typeof ResolutionStepOutcome>;

const ALL_OUTCOMES: readonly ResolutionStepOutcome[] = ["held", "gain", "cost", "mixed"];

// What each kind is allowed to turn out as. A loss that reads as a gain and an
// order given that already reads as a victory are both the same defect: the
// step's words and the step's marker disagreeing.
const KIND_OUTCOMES: Readonly<Record<ResolutionStepKind, readonly ResolutionStepOutcome[]>> = {
  "order-given": ["held"],
  movement: ["held"],
  contact: ALL_OUTCOMES,
  "named-unit-attack": ["gain", "cost", "mixed"],
  loss: ["cost"],
  rescue: ["gain", "mixed"],
  hold: ["held", "mixed"],
  "stand-down": ["held", "cost", "mixed"],
  "report-back": ["gain", "cost", "mixed"],
};

// A step that is about a formation has to name one, and a strike has to name
// what it struck. Left to prose review this is exactly the field that goes
// missing, and a step reading "the attack went in" is the generic line the
// whole family exists to avoid.
const REQUIRED_PARTICULARS: Readonly<Record<ResolutionStepKind, readonly ResolutionParticular[]>> = {
  "order-given": [],
  movement: [],
  contact: [],
  "named-unit-attack": ["unit", "target"],
  loss: ["unit"],
  rescue: [],
  hold: [],
  "stand-down": [],
  "report-back": [],
};

/**
 * The last step's outcome, per valence the key carries.
 *
 * This is where outcome honesty stops being an editorial note. A sequence drawn
 * for a failure ends on a cost, and there is no way to author one that ends on
 * a gain, so a sequence cannot end by claiming a result the packet then denies.
 */
export const TERMINAL_OUTCOME: Readonly<Record<z.infer<typeof ConsequenceValence>, ResolutionStepOutcome>> = {
  success: "gain",
  partial: "mixed",
  failure: "cost",
};

// A designation arrives through the {{unit}} slot, generated, or it does not
// arrive. Naming a real formation or a real ship puts a living service in a
// game about hurting one, and once the line is authored nothing downstream can
// take it back out.
const REAL_DESIGNATIONS: readonly RegExp[] = [
  /\b\d+(?:st|nd|rd|th)\s+(?:Airborne|Armored|Cavalry|Infantry|Marine|Ranger|Fleet|Division|Brigade|Battalion|Squadron|Regiment|Wing)\b/,
  /\b(?:USS|HMS|USNS|RFA)\s+[A-Z]/,
  /\b(?:Delta Force|SEAL Team|Task Force\s+\d+|Spetsnaz|Wagner Group)\b/i,
];

/**
 * What the step's verbs need the {{unit}} draw to be.
 *
 * Without this a line is written for one kind of formation and filled from all
 * six branches at unit scale, so "is wheels up ahead of the weather" comes back
 * against an undersea squadron five times in six and "puts two battalions
 * across" comes back against a battalion. Prose can be written down to what six
 * branches have in common, and where it can be it should be; where the act
 * itself is aviation or a corps-scale maneuver, no neutral phrasing exists and
 * the constraint has to travel with the line instead.
 */
export const UnitAffinity = z
  .object({
    branches: z.array(z.enum(MILITARY_BRANCHES)).min(1).optional(),
    echelon: z.enum(UNIT_ECHELONS).optional(),
  })
  .strict()
  .superRefine((affinity, ctx) => {
    if (affinity.branches === undefined && affinity.echelon === undefined) {
      ctx.addIssue({ code: "custom", message: "declares a unit affinity that constrains nothing" });
    }
    if (affinity.branches && new Set(affinity.branches).size !== affinity.branches.length) {
      ctx.addIssue({ code: "custom", message: "lists the same branch twice" });
    }
    // An affinity no draw can satisfy is a step that throws at fill time, which
    // is the same class of defect as a sequence no key can reach.
    if (branchesFor(affinity).length === 0) {
      ctx.addIssue({ code: "custom", message: "asks for a formation scale none of its branches has" });
    }
  });
export type UnitAffinity = z.infer<typeof UnitAffinity>;

const PARTICULAR_TOKEN = /\{\{([a-z]+)\}\}/g;

function tokensIn(line: string): readonly string[] {
  return [...line.matchAll(PARTICULAR_TOKEN)].map((match) => match[1] ?? "");
}

const StepShape = z
  .object({
    kind: ResolutionStepKind,
    /** One line, in the game's voice, with its particulars as slots. */
    line: prose(LENGTH_FLOORS.beat),
    outcome: ResolutionStepOutcome,
    /** Every slot the line uses, and no slot it does not. */
    particulars: z.array(ResolutionParticular).max(4),
    /** Only where the line's verbs cannot survive an unconstrained draw. */
    unitAffinity: UnitAffinity.optional(),
  })
  .strict();

type StepShape = z.infer<typeof StepShape>;

function checkOutcome(step: StepShape, ctx: z.RefinementCtx): void {
  if (!KIND_OUTCOMES[step.kind].includes(step.outcome)) {
    ctx.addIssue({ code: "custom", message: `a ${step.kind} step cannot turn out "${step.outcome}"` });
  }
}

function checkParticulars(step: StepShape, ctx: z.RefinementCtx): void {
  const declared = new Set<string>(step.particulars);
  if (declared.size !== step.particulars.length) {
    ctx.addIssue({ code: "custom", message: "declares the same particular twice" });
  }
  const used = new Set(tokensIn(step.line));
  for (const token of used) {
    if (!declared.has(token)) ctx.addIssue({ code: "custom", message: `uses {{${token}}} without declaring it` });
  }
  for (const particular of declared) {
    if (!used.has(particular)) ctx.addIssue({ code: "custom", message: `declares "${particular}" and never uses it` });
  }
  for (const required of REQUIRED_PARTICULARS[step.kind]) {
    if (!declared.has(required)) ctx.addIssue({ code: "custom", message: `a ${step.kind} step has to name {{${required}}}` });
  }
  if (step.unitAffinity && !declared.has("unit")) {
    ctx.addIssue({ code: "custom", message: "constrains the {{unit}} draw on a step that never names one" });
  }
}

function checkDesignations(step: StepShape, ctx: z.RefinementCtx): void {
  for (const pattern of REAL_DESIGNATIONS) {
    if (pattern.test(step.line)) {
      ctx.addIssue({ code: "custom", message: "names a real unit or ship; designations arrive through {{unit}}" });
    }
  }
}

export const ResolutionBeat = StepShape.superRefine((step, ctx) => {
  checkOutcome(step, ctx);
  checkParticulars(step, ctx);
  checkDesignations(step, ctx);
});
export type ResolutionBeat = z.infer<typeof ResolutionBeat>;

const SequenceShape = z
  .object({
    id: z.string().min(1),
    instrument: ConsequenceInstrument,
    rungBands: z.array(ConsequenceRungBand).min(1),
    valence: ConsequenceValence,
    // Which named failure branch this sequence is written for, from the same
    // vocabulary a consequence card uses. Absent, it fits any branch of its
    // valence; present, it is refused everywhere else.
    riskAffinity: z.array(z.string().min(1)).min(1).optional(),
    weight: z.number().positive(),
    /** Ordered, and read in order. The last one carries the result. */
    steps: z.array(ResolutionBeat).min(2).max(5),
  })
  .strict();

type SequenceShape = z.infer<typeof SequenceShape>;

function checkKey(def: SequenceShape, ctx: z.RefinementCtx): void {
  if (def.riskAffinity && def.valence !== "failure") {
    ctx.addIssue({ code: "custom", message: `names a failure branch on a "${def.valence}" sequence` });
  }
  if (new Set(def.rungBands).size !== def.rungBands.length) {
    ctx.addIssue({ code: "custom", message: "lists the same rung band twice" });
  }
  if (def.riskAffinity && new Set(def.riskAffinity).size !== def.riskAffinity.length) {
    ctx.addIssue({ code: "custom", message: "lists the same failure branch twice" });
  }
}

// Words too common to mean two lines are about the same thing. Everything else
// of four letters or more counts as naming something.
const COMMON_WORDS = new Set([
  "about", "after", "again", "against", "along", "already", "also", "another", "anybody", "anything", "back",
  "because", "been", "before", "behind", "being", "between", "both", "brought", "came", "cannot", "come", "comes",
  "could", "days", "does", "done", "down", "each", "else", "even", "ever", "every", "first", "four", "from", "gets",
  "give", "given", "goes", "going", "gone", "half", "hardly", "have", "here", "hour", "hours", "inside", "into",
  "itself", "just", "keep", "kept", "last", "later", "less", "like", "made", "make", "many", "more", "most", "much",
  "must", "near", "never", "next", "nine", "nobody", "none", "only", "onto", "other", "over", "past", "same", "says",
  "second", "seven", "since", "some", "still", "such", "take", "taken", "takes", "than", "that", "their", "them",
  "then", "there", "these", "they", "thing", "this", "those", "three", "time", "times", "told", "took", "twice",
  "under", "until", "upon", "very", "week", "weeks", "well", "went", "were", "what", "when", "where", "which",
  "while", "whole", "will", "with", "within", "without", "would", "year", "years",
]);

function namedThings(line: string): ReadonlySet<string> {
  const words = line
    .toLowerCase()
    .replace(PARTICULAR_TOKEN, " ")
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 4 && !COMMON_WORDS.has(word));
  return new Set(words);
}

// §8.1 rule one in full: a rescue gets back what was lost. The kind ordering
// alone clears on a technicality — a sequence that loses a vehicle and a radio
// and then walks a person out satisfies "some loss precedes" while recovering
// nothing the player was shown losing. So the recovered thing has to be named
// in both lines, or share the slot it arrived in.
function recoversSomethingLost(rescue: StepShape, earlier: readonly StepShape[]): boolean {
  const recovered = namedThings(rescue.line);
  // {{unit}} is the actor on both sides of most of these lines, so sharing it
  // proves nothing; {{person}} lost and {{person}} back is the same person.
  const sharesPerson = rescue.particulars.includes("person");
  return earlier
    .filter((step) => step.kind === "loss")
    .some((loss) => {
      if (sharesPerson && loss.particulars.includes("person")) return true;
      return [...namedThings(loss.line)].some((word) => recovered.has(word));
    });
}

function checkArc(def: SequenceShape, ctx: z.RefinementCtx): void {
  const last = def.steps[def.steps.length - 1]!;
  const required = TERMINAL_OUTCOME[def.valence];
  if (last.outcome !== required) {
    ctx.addIssue({ code: "custom", message: `a ${def.valence} sequence has to end on "${required}", not "${last.outcome}"` });
  }
  def.steps.forEach((step, index) => {
    const terminal = index === def.steps.length - 1;
    // A rescue with nothing lost, and a stand-down the act continues past, are
    // both suspense manufactured after the fact.
    if (step.kind === "rescue") {
      const earlier = def.steps.slice(0, index);
      if (!earlier.some((before) => before.kind === "loss")) {
        ctx.addIssue({ code: "custom", message: "rescues something the sequence never lost" });
      } else if (!recoversSomethingLost(step, earlier)) {
        ctx.addIssue({ code: "custom", message: "rescues something other than what the loss step lost; name it in both lines" });
      }
    }
    if (step.kind === "stand-down" && !terminal) {
      ctx.addIssue({ code: "custom", message: "stands down and then keeps going" });
    }
  });
  if (new Set(def.steps.map((step) => step.line)).size !== def.steps.length) {
    ctx.addIssue({ code: "custom", message: "repeats a line inside one sequence" });
  }
}

/**
 * The one constraint the sequence's {{unit}} draw has to satisfy.
 *
 * A sequence names one formation however many steps mention it, so the step
 * affinities are merged rather than applied separately: branches intersect, and
 * a single step asking for corps scale sets the scale for the sequence.
 */
export function unitConstraintOf(def: SequenceShape): UnitDesignationConstraint {
  let branches: readonly MilitaryBranch[] | undefined;
  let echelon: UnitEchelon | undefined;
  for (const step of def.steps) {
    const affinity = step.unitAffinity;
    if (!affinity) continue;
    const asked = affinity.branches;
    if (asked) branches = branches === undefined ? asked : branches.filter((branch) => asked.includes(branch));
    if (affinity.echelon === "formation") echelon = "formation";
  }
  return { ...(branches === undefined ? {} : { branches }), ...(echelon === undefined ? {} : { echelon }) };
}

function checkUnitAffinity(def: SequenceShape, ctx: z.RefinementCtx): void {
  if (!def.steps.some((step) => step.unitAffinity)) return;
  if (branchesFor(unitConstraintOf(def)).length === 0) {
    ctx.addIssue({ code: "custom", message: "its steps ask for unit affinities no single formation can satisfy" });
  }
}

export const ResolutionSequenceDef = SequenceShape.superRefine((def, ctx) => {
  checkKey(def, ctx);
  checkArc(def, ctx);
  checkUnitAffinity(def, ctx);
});
export type ResolutionSequenceDef = z.infer<typeof ResolutionSequenceDef>;

/** The unit of storage and delivery, mirroring ConsequencePack exactly. */
export const ResolutionSequencePack = z
  .object({
    id: z.string().min(1),
    version: z.number().int().min(1),
    sequences: z.array(ResolutionSequenceDef).min(1),
  })
  .strict()
  .superRefine((pack, ctx) => {
    if (new Set(pack.sequences.map((sequence) => sequence.id)).size !== pack.sequences.length) {
      ctx.addIssue({ code: "custom", message: "two sequences share an id" });
    }
  });
export type ResolutionSequencePack = z.infer<typeof ResolutionSequencePack>;

/**
 * The tuple a resolution produces and a sequence is authored against.
 *
 * `riskId` is present only on a failure, and only when the sequence claims a
 * branch; a failure sequence without one is the floor for its instrument, so
 * there is always something to play.
 */
export type ResolutionSequenceKey = {
  readonly instrument: z.infer<typeof ConsequenceInstrument>;
  readonly rungBand: z.infer<typeof ConsequenceRungBand>;
  readonly valence: z.infer<typeof ConsequenceValence>;
  readonly riskId?: string;
};

/** The canonical string form: one key, one stable seed, one deterministic draw. */
export function resolutionSequenceKey(key: ResolutionSequenceKey): string {
  return [key.instrument, key.rungBand, key.valence, key.riskId ?? "any"].join(":");
}

/** Every key a document answers to, which is its rung bands crossed with its branches. */
export function sequenceKeysOf(def: ResolutionSequenceDef): readonly ResolutionSequenceKey[] {
  const branches: readonly (string | undefined)[] = def.riskAffinity ?? [undefined];
  return def.rungBands.flatMap((rungBand) =>
    branches.map((riskId) => ({
      instrument: def.instrument,
      rungBand,
      valence: def.valence,
      ...(riskId === undefined ? {} : { riskId }),
    })),
  );
}
