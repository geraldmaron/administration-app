/**
 * What each of a person's five readings actually moves, said once.
 *
 * Two tables used to answer this question — one on the dossier, one on the
 * cabinet roster — and they disagreed. Worse, both were false about charisma
 * for a Secretary: the roster promised it set "how well they carry the
 * administration in public," and no rule reads a Secretary's charisma for
 * anything of the kind. The Hill reads the charisma of whoever holds the lead
 * chair, and the podium reads it for the lead chair and the press secretary (a
 * White House post, not a cabinet seat), and nobody else's.
 *
 * That is why this table is keyed by subject rather than by attribute alone.
 * The truth about charisma genuinely differs between the president and a
 * cabinet officer, and one string per attribute cannot hold both without
 * lying to one of them.
 *
 * The table used to collapse every standing but the President's own into
 * "officer," which is true of a sitting secretary and false of everyone
 * else: a justice's file told the player a dismissal would cost Standing
 * ("what dismissing them costs you"), and nothing in the game can dismiss a
 * justice. `ConsequenceSubject` now has one entry per `PersonStanding` kind,
 * so a sentence can only ever describe the rule that actually runs for the
 * file it is printed on.
 */
import type { PersonTrait } from "@admin/world";
import type { AttributeKey } from "@admin/engine";
import type { PersonStanding } from "./person-dossier";
/**
 * Whose file this is, one entry per standing kind `person-dossier.ts` assigns.
 * A kind with no reader of its own (`governor`, `agency`, `foreign`) says so
 * in words rather than borrowing the cabinet's copy; `available` and `former`
 * read the cabinet copy under an "If seated:" conditional, because it is true
 * of them only once the President seats them.
 */
export type ConsequenceSubject = PersonStanding["kind"];
export declare const CHALLENGE_AMBITION_MARK = 0.65;
export declare const CHARISMATIC_CHALLENGE_DISCOUNT = 0.1;
/**
 * The ambition mark this particular person is measured against.
 *
 * A charismatic chair does not need as much of it: charm is what turns a
 * grievance into a following, so the bar for mounting a challenge rather than
 * walking out sits lower for them than for an equally disloyal but charmless
 * colleague.
 */
export declare function challengeMarkFor(traits: readonly PersonTrait[]): number;
/** One line, and what (if anything) in the simulation it names. */
export type ConsequenceLine = {
    readonly text: string;
    /** The exported engine function(s) this line describes, when it names a mechanic. Absent when nothing reads the attribute. */
    readonly readBy?: readonly string[];
};
export declare const ATTRIBUTE_CONSEQUENCE: Readonly<Record<AttributeKey, Readonly<Record<ConsequenceSubject, ConsequenceLine>>>>;
/** The consequence line for one reading on one kind of file. */
export declare function attributeConsequence(key: AttributeKey, subject: ConsequenceSubject): string;
/**
 * Whether any decision reads this reading for a person of this standing. A
 * file whose rows say nothing reads them must not then name one of them as
 * the reading to plan around.
 */
export declare function attributeIsRead(key: AttributeKey, subject: ConsequenceSubject): boolean;
/**
 * What each of a person's ten temperament traits actually moves, said once.
 *
 * The two-way graded/pressure split lives on `AssessmentReading` now, and a trait
 * word is not a fifth reading to grade. The paired test walks `PersonTrait`'s
 * own enum, not this table's keys, so a trait the dataset adds with nothing
 * behind it fails there instead of arriving on a file as a word with no
 * consequence.
 */
export declare const TRAIT_EFFECT: Readonly<Record<PersonTrait, string>>;
/** What a trait moves, in a sentence. */
export declare function traitEffect(trait: PersonTrait): string;
/**
 * What ideology moves, in one line under the three axes: a justice's lean on
 * a case (`strike-odds.ts`), how fast a secretary's loyalty wears down against
 * the President's politics (`loyalty.ts`), the cabinet chart, and the Fed
 * chair's tilt (`monetary.ts`). Not "how united your cabinet is": that figure
 * is the mean loyalty of the secretaries and reads no ideology.
 */
export declare const IDEOLOGY_CONSEQUENCE = "For a justice, this decides which way they lean on a case. For a secretary, the further their politics are from yours, the faster their loyalty slips. It also decides how well they get along with colleagues on the cabinet chart. For the Federal Reserve chair, their economic views tilt the Fed toward fighting high prices or protecting jobs. It shows where they stand, not how good they are.";
