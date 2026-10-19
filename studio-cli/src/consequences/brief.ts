import {
  BRITISH_SPELLINGS,
  CONSEQUENCE_COVERAGE_TARGET,
  CONSEQUENCE_FAILURE_HARM_FLOOR,
  ConsequenceInstrument,
  ConsequenceRungBand,
  ConsequenceValence,
  CORE_CONSEQUENCES,
  LENGTH_CEILINGS,
  LENGTH_FLOORS,
  LENGTH_TARGETS,
  MECHANICS_WORDS,
  NEWS_ORGANIZATIONS,
  type ConsequenceDef,
} from "@admin/content";
import type { JobFile } from "../jobs/job-file.js";
import { PERSONA_FRAME } from "../scenarios/brief.js";
import { PERSONAS, type PersonaId } from "../personas/index.js";

// The aftermath brief: the scenario brief's twin, and deliberately its twin
// rather than its cousin. A consequence batch runs through the same job file,
// the same drivers, the same gate; what differs is only the contract being
// written to. Everything a generator is held to is embedded here in full and
// quoted from the constants the validator reads, so no folklore about the
// aftermath layer can survive a rule change.

export type ConsequenceBriefSpec = {
  readonly instrument: ConsequenceInstrument;
  readonly band: ConsequenceRungBand;
  readonly valence: ConsequenceValence;
  // Free-form steer: which corner of the cell to write into, what the cards
  // should press on, which conditions ought to gate them.
  readonly steer?: string;
  // The director for this cell, overriding both the job flag and the
  // instrument routing. Absent means the caller has not resolved one, and the
  // brief is built with no persona section at all.
  readonly persona?: PersonaId;
  readonly count: number;
};

// Two exemplars chosen to span the space: the smallest diplomatic success, all
// subtext and no movement worth naming, and the largest military failure, where
// the cost has to land without the prose reaching for it. These ARE the bar.
const EXEMPLAR_IDS = [
  "cq-diplomatic-low-success-note-read-in-the-car",
  "cq-military-high-failure-the-second-decision-of-the-night",
] as const;

function exemplars(): readonly ConsequenceDef[] {
  return CORE_CONSEQUENCES.filter((def) => (EXEMPLAR_IDS as readonly string[]).includes(def.id));
}

// The instruments read in different registers, and a card written in the wrong
// one is correct and lifeless. Covert aftermath is withheld information;
// military aftermath is what a room watches happen to people it sent; the two
// talking instruments are the room's own conscience coming back at it. Aid goes
// to the embed as well, for the same reason military does: what it is made of
// is arrival — a flight, a pallet, a crate with a stencil on it — and it is
// written from where the thing lands rather than from where it was decided.
const BY_INSTRUMENT: Readonly<Record<ConsequenceInstrument, PersonaId>> = {
  diplomatic: "the-room",
  economic: "the-room",
  assistance: "the-embed",
  covert: "the-architect-of-dread",
  military: "the-embed",
};

export function personaForInstrument(instrument: ConsequenceInstrument): PersonaId {
  return BY_INSTRUMENT[instrument];
}

/** Per-cell override first, then the job-level flag, then the instrument map. */
export function resolveConsequencePersona(cell: ConsequenceBriefSpec, jobPersona?: PersonaId): PersonaId {
  return cell.persona ?? jobPersona ?? personaForInstrument(cell.instrument);
}

const CRAFT_RULES = `Write the aftermath the way the best political drama writes the morning after:
- The resolver has already decided whether the act worked. A card never argues with that verdict; it
  tells the room what the verdict looked like from inside the building.
- Concrete detail over adjectives. "The note is read in the car," never "a diplomatic setback."
- One image per beat, and the image carries the cost. The narrator states; it does not perform.
- Hard subjects (dead soldiers, dead civilians, ruined people) get restraint and dignity: what it costs
  the room to know, never the spectacle.
- American English spelling throughout.
- A card is drawn for whichever two nations the act happened between, so it may only ever say
  {{actor}} and {{target}}. It knows nothing else about the world and must not pretend to.`;

// Quoted from the same constants the audit checks against. A generator held to
// a stale rule list writes cards that get rejected, and on the unattended path
// that is real money spent on content that was never going to publish.
function gateSummary(): string {
  return `Every consequence card must clear these gates or it is discarded (the validator enforces all of them):
1. Shape. instrument is one of ${ConsequenceInstrument.options.join(", ")}; rungBands is a non-empty subset of
   ${ConsequenceRungBand.options.join(", ")}; valence is one of ${ConsequenceValence.options.join(", ")}; weight is positive;
   beats is one to three lines. Anything outside those enums does not parse at all.
2. The only placeholders are {{actor}} and {{target}}. Any other token is refused — a card cannot reach
   the charter, the cabinet, or the counterpart's title, because it speaks about an act, not a country.
3. None of these words anywhere in player-facing text: ${MECHANICS_WORDS.join(", ")}.
4. American spelling — automatic rejections: ${BRITISH_SPELLINGS.slice(0, 12).join(", ")}, and similar, in every
   form they inflect into.
5. Name no real country, demonym, or capital, and no real news organization
   (${NEWS_ORGANIZATIONS.slice(0, 6).join(", ")}, and similar). The two parties are placeholders and nothing else.
6. Write every number as words, and use no digits and no currency marks anywhere in player-facing text:
   "nine dead", never "9 dead". Counting an ordinary detail out in words is right and wanted; it is the
   digits that are refused.
7. Effects may only be: { kind: "metric", deltas } over treasury/stability/militaryReadiness/standing, optionally
   scaleBySeverity; { kind: "relationship", direction, deltas } over trust/alignment/tension/tradeDependence/
   militaryThreat; { kind: "grudge", cause, weight }; { kind: "feed", headline }. Nothing else exists. A card
   cannot touch nation stats, the cabinet, or the removal arc — those change the shape of a campaign.
8. A card must leave a mark: effects, or "sets" flags, or something remembered. All three empty is refused.
9. A ${ConsequenceValence.options[0]} or ${ConsequenceValence.options[1]} card is not a victory lap. It must carry at least one of: a cost (any
   harmful metric movement, or a harmful relationship delta), a "sets" flag, or a remembered line. Pure gain
   with no forward hook is refused — the room got something, so name what it paid or what it now owes.
10. Valence has to match the arithmetic. A success card may take at most ${CONSEQUENCE_FAILURE_HARM_FLOOR.success} off the board and
    a partial at most ${CONSEQUENCE_FAILURE_HARM_FLOOR.partial}, measured across every harmful movement on one normalized scale.
    Past that the player is told it worked while the numbers say otherwise, which is a lie the gate refuses.
11. riskAffinity names a failure branch of its own instrument, and only a failure card may carry one —
    an outcome that did not fail has no branch to match, so such a card could never be drawn.
12. A flag in conditions.flagsSet must be one that something writes: another card's "sets", a scenario
    reply's "sets", or the card's own fired flag. A card waiting on a flag nothing stamps is unreachable.
13. Coverage is judged over the whole pool, not over this batch: every cell of the
    ${ConsequenceInstrument.options.length} instruments × ${ConsequenceRungBand.options.length} bands ×
    ${ConsequenceValence.options.length} valences matrix needs at least one card with no conditions, no
    riskAffinity and no "once" — the floor has to be there on every campaign, whatever the board looks
    like. ${CONSEQUENCE_COVERAGE_TARGET} cards per cell is the depth at which a player stops recognizing the line.
14. Two cards in one cell that share phrasing are one template wearing two hats. Vary the image, not
    just the wording around it.
15. Length, in characters. Ceilings — over these the document is refused: beat ${LENGTH_CEILINGS.beat},
    feed headline ${LENGTH_CEILINGS.press}, remembered ${LENGTH_CEILINGS.remembered}. Floors — under these it does not parse:
    beat ${LENGTH_FLOORS.beat}, headline ${LENGTH_FLOORS.press}, remembered ${LENGTH_FLOORS.remembered}. Write to these targets, not to the
    floors: beat ${LENGTH_TARGETS.beat}, headline ${LENGTH_TARGETS.press}, remembered ${LENGTH_TARGETS.remembered}.
16. "sets" flags are how an aftermath is remembered; name them as deeds ("burned-the-network"), and
    only when a later scenario or card would plausibly gate on them.`;
}

function personaSection(id: PersonaId): readonly string[] {
  return [PERSONA_FRAME, "", PERSONAS[id].prompt, ""];
}

export function buildConsequenceBrief(spec: ConsequenceBriefSpec): string {
  return [
    `Generate ${spec.count} consequence card(s) for a political simulation game, as a JSON array of ConsequenceDef objects.`,
    `Cell: instrument "${spec.instrument}", rung band "${spec.band}", valence "${spec.valence}".${spec.steer ? ` Steer: ${spec.steer}` : ""}`,
    `Every card must carry instrument "${spec.instrument}", valence "${spec.valence}", and "${spec.band}" among its rungBands.`,
    "",
    ...(spec.persona ? personaSection(spec.persona) : []),
    gateSummary(),
    "",
    CRAFT_RULES,
    "",
    "Conditions make a card conditional on the board it is drawn against — scenarioClass, the tone of the",
    "reply that led here, flags set or clear, minTension, maxTrust. Use them for the cards that earn their",
    "specificity, and leave the cell's floor card unconditioned so the draw can never come back empty.",
    "",
    "These two shipped cards are the quality bar. Match their register exactly:",
    JSON.stringify(exemplars(), null, 2),
    "",
    "Return ONLY the JSON array. No commentary.",
  ].join("\n");
}

/**
 * A consequence batch as a job file the existing runner executes: one item per
 * cell, resumable, spend-journaled — the same discipline every other generation
 * job runs under.
 *
 * The resolved director is written into the payload rather than recomputed
 * later, for the same reason a scenario batch does it: the job file is the
 * durable record of what a batch was generated under, and a routing map edited
 * between the run and the review would otherwise rewrite that history.
 */
export function consequenceJob(
  id: string,
  driver: JobFile["driver"],
  cells: readonly ConsequenceBriefSpec[],
  jobPersona?: PersonaId,
): JobFile {
  return {
    id,
    kind: "consequence-batch",
    driver,
    items: cells.map((cell, index) => {
      const persona = resolveConsequencePersona(cell, jobPersona);
      return {
        id: `${id}-${String(index + 1).padStart(4, "0")}`,
        payload: {
          prompt: buildConsequenceBrief({ ...cell, persona }),
          instrument: cell.instrument,
          band: cell.band,
          valence: cell.valence,
          persona,
        },
      };
    }),
  };
}

/** The procedure a session reads in the work directory, in the aftermath layer's terms. */
export const CONSEQUENCE_README = `# Consequence generation work directory

Each \`*.brief.md\` in this folder is one cell of the aftermath matrix to write. For each brief:

1. Read the brief in full. It contains the JSON contract, the hard gates, the craft
   rules, and two shipped exemplar cards that set the quality bar.
2. Write your cards as a JSON array of ConsequenceDef objects to the matching
   \`<item>.out.json\` (same basename as the brief).
3. Re-run the job (\`studio consequences run <jobId>\`). Every output is validated:
   a clean item is journaled done; a rejected one gets a \`<item>.findings.json\`
   naming each defect — fix the output and run again. Items already done are
   never re-checked or re-spent.

The validator is the same gate every generated card faces regardless of who or
what wrote it. There is no path around it.
`;
