import type { ScenarioDef } from "./scenario.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
/** The value of a spelled cardinal phrase ("four hundred and twelve"), or undefined. */
export declare function spelledValue(phrase: string): number | undefined;
/**
 * The death toll a piece of prose states, as a count. Undefined where the prose
 * states no toll — which is most prose, and is not a defect.
 */
export declare function statedTollIn(text: string): number | undefined;
/**
 * A week with a body count whose answers price nothing.
 *
 * The scenario-level half of the impact contract. If the room is called in over
 * something that killed people, displaced them, or has to be paid for, then at
 * least one answer to it did something the model can price — and a corpus where
 * none of them do is one where the dead are set dressing. That was literally
 * true of every scenario written before the bands existed, which is why this is
 * an error rather than a warning: the field is optional in the schema so that
 * a reply with genuinely nothing to declare can stay silent, and this is what
 * stops "optional" from meaning "never".
 */
export declare function auditImpactDeclared(def: ScenarioDef, findings: ScenarioFinding[]): void;
/**
 * The one impact field that can invert what it prices.
 *
 * `acted-upon` carries a negative multiplier, because a country attacked from
 * outside closes ranks: the toll term flips sign and the death becomes a
 * standing gain. That is right for a strike on our own people and wrong for
 * every case that merely resembles it — "we declined, and someone else's crew
 * died" reads like the same shape and is not, and a scenario declaring it pays
 * the player for a death.
 *
 * Checked mechanically, because the tell is mechanical: what rallies a country
 * is harm to its own. A toll declared "abroad" was borne by people who are not
 * the public doing the rallying, so the two cannot both be true.
 *
 * An omitted `borneBy` is refused for the same reason and is the nastier half.
 * The default routing is "diffuse" — our own people, spread across the country
 * — which is precisely the case "acted-upon" exists for, so silence here does
 * not fail open into something visibly wrong. It fails open into the one shape
 * that looks most legitimate, at the full negative multiplier, with nothing
 * left for the check above to compare. Saying who bore the toll is work the
 * author owes anyway, so nothing correct is refused by asking for it.
 */
export declare function auditActedUponToll(def: ScenarioDef, findings: ScenarioFinding[]): void;
/**
 * An agency declared over nothing.
 *
 * `agency` is read only inside the toll branch of `opinionDeltas`, where it
 * multiplies what a death costs a government's reputation. Written with no
 * `lives` band beside it, it moves no number and says nothing to a player,
 * while reading to the next author as though the block declares something.
 * Mechanical enough to check without reading a word of prose, which is the
 * point: this is the field an author reaches for once a rule has told them the
 * block must not be empty, and the answer to an empty block is to delete it
 * rather than to furnish it.
 *
 * `borneBy` has the same problem and is deliberately not checked here: whether
 * a bare one should price something is an open question about the model rather
 * than about the writing, and a rule that hardens today's answer would have to
 * be unwritten if it changes.
 */
export declare function auditInertImpactFields(def: ScenarioDef, findings: ScenarioFinding[]): void;
/**
 * A declared band against the author's own sentence.
 *
 * Checked against the reply's own prose rather than the briefing's, and the
 * distinction is what keeps the rule honest: a briefing states what has already
 * happened, while an impact states what this answer did. An answer that
 * escalates legitimately declares a higher band than the week opened with, so
 * comparing it against the opening would refuse the correct scenario. Comparing
 * it against the sentence the author wrote about their own decision is the
 * arithmetic check `tollBandFor` exists for.
 */
export declare function auditImpactMatchesProse(def: ScenarioDef, findings: ScenarioFinding[]): void;
