import { ACUTE_CONDITIONS } from "@admin/engine";
import { CABINET_CHAIR_TITLES, CABINET_TITLE_PATTERN, PLAYABLE_CHAIR_TITLES, PLAYABLE_GOVERNMENT_TITLES, } from "./audit-lexicon.js";
import { passages } from "./scenario-audit-contract.js";
// The binding family: rules about the gap between what a scenario's prose asserts
// and what its gates actually bind.
//
// Three rules, and none of them is about craft. A week that says "the flooding in
// Missouri" and lets the resolver pick the state will sooner or later print a
// state that is not flooded; a card that says the Secretary resigned while the
// chair stays filled leaves the player governing beside a minister who walked out;
// a line that says "this winter" fires in July. Each reads correctly nine times
// and wrong the tenth, which is why a reviewer does not catch them and a rule
// does.
//
// All three are warnings. Each is a scenario that will play and will read slightly
// wrong, not one the board cannot resolve — and `unbound-disaster` in particular
// is a warning by decision until the corpus has been re-bound.
//
// Beside the audit rather than inside it for the reason the other families are: the
// audit is one table of rules, and a family is easier to change on its own.
const ACUTE = new Set(ACUTE_CONDITIONS);
/** The months and seasons a writer types into prose instead of gating on. */
const SEASON_WORDS = [
    "january",
    "february",
    "march",
    "april",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "winter",
    "spring",
    "summer",
    "autumn",
    "fall",
    "midwinter",
    "midsummer",
];
/**
 * Words that only appear when prose is narrating somebody leaving a post.
 *
 * "resign" and "resignation" carry it on their own. "steps down", "walks out"
 * and "clears the desk" are the idioms a card reaches for instead, and each is a
 * departure whatever the sentence around it says.
 */
const DEPARTURE_PHRASES = [
    "resigns",
    "resigned",
    "resignation",
    "resigning",
    "steps down",
    "stepped down",
    "stands down",
    "stood down",
    "quits the cabinet",
    "quit the cabinet",
    "hands in",
    "handed in",
    "cleared out the office",
    "cleared the desk",
    "is out of the cabinet",
    "leaves the cabinet",
    "left the cabinet",
];
/**
 * Every way prose names a chair the game actually seats.
 *
 * The rule needs this because "their deputy resigned" and "the official who
 * wrote the later draft resigned" are ordinary aftermath about people the game
 * does not model, and flagging them would train an author to ignore the rule. A
 * departure only matters mechanically when the person leaving holds a seat.
 */
const CHAIR_TITLES = [
    ...new Set([...PLAYABLE_CHAIR_TITLES, ...PLAYABLE_GOVERNMENT_TITLES, ...CABINET_CHAIR_TITLES]),
].sort((a, b) => b.length - a.length);
/** "the Secretary", "our minister" — the seat named without its department. */
const BARE_CHAIR_PATTERN = /\b(?:the|our|your|his|her|their)\s+(?:secretary|minister|attorney general|chief of staff)\b/i;
function namesAChair(sentence) {
    const lowered = sentence.toLowerCase();
    if (CHAIR_TITLES.some((title) => lowered.includes(title.toLowerCase())))
        return true;
    return CABINET_TITLE_PATTERN.test(sentence) || BARE_CHAIR_PATTERN.test(sentence);
}
/** Prose split the way a reader reads it, so a chair and a departure have to be in one breath. */
function sentencesOf(text) {
    return text.split(/(?<=[.!?])\s+/);
}
/** "march" is also an order and a protest; "fall" is also a collapse. */
const SEASON_FALSE_FRIENDS = {
    march: ["march on", "marching", "a march", "the march", "marches"],
    fall: ["fall of", "fall in", "fall apart", "falls", "fallen", "falling", "fall back", "fall short"],
    spring: ["spring of", "springs", "sprang", "spring back", "spring tide"],
};
function phraseIn(haystack, needles) {
    const text = haystack.toLowerCase();
    return needles.find((needle) => new RegExp(`\\b${needle}\\b`).test(text));
}
function seasonWordIn(text) {
    const lowered = text.toLowerCase();
    for (const word of SEASON_WORDS) {
        if (!new RegExp(`\\b${word}\\b`).test(lowered))
            continue;
        const friends = SEASON_FALSE_FRIENDS[word];
        if (friends && friends.some((friend) => lowered.includes(friend)))
            continue;
        return word;
    }
    return undefined;
}
/** The acute kinds a scenario's own `conditionActive` gates name. */
function acuteKindsGated(def) {
    return def.conditions.flatMap((condition) => condition.kind === "conditionActive" && condition.condition !== undefined && ACUTE.has(condition.condition)
        ? [condition.condition]
        : []);
}
/**
 * A week about something that struck a place, placed somewhere else.
 *
 * The gate says a wildfire is burning; the locus rolls a province at random. The
 * two are never checked against each other, so the decision opens in a state
 * with no fire in it and the prose about "the ridge above the reservoir" is
 * about nowhere. Either `bind: "condition"` (the place follows the fire) or an
 * authored `state` (the place is a set piece) answers it.
 *
 * Only a home-ground scenario: the fifty states are the only places the dataset
 * can put a condition in, so a foreign-ground disaster has nothing to bind to
 * and is placed by the resolver by design.
 */
function auditUnboundDisaster(def, findings) {
    if (def.locus.ground !== "home")
        return;
    if (def.locus.bind === "condition" || def.locus.state !== undefined)
        return;
    const kinds = acuteKindsGated(def);
    if (kinds.length === 0)
        return;
    findings.push({
        kind: "unbound-disaster",
        severity: "warning",
        scenario: def.id,
        message: `gates on ${kinds.join(", ")} at home but its locus rolls its own place: add locus.bind "condition" so the week opens where the thing is happening, or an authored locus.state.`,
    });
}
/**
 * A month or a season in the prose, with nothing holding the gate to it.
 *
 * A line that says "before the winter sets in" is true the week it was written
 * and wrong the first time the draw deals it in July. The `calendar` condition is
 * what makes the sentence safe; without one the writer has asserted a time of
 * year the board never checked. `{{season}}` renders the real one and is the
 * other way out.
 */
function auditSeasonLiteral(def, findings) {
    if (def.conditions.some((condition) => condition.kind === "calendar"))
        return;
    for (const passage of passages(def)) {
        const word = seasonWordIn(passage.text);
        if (word === undefined)
            continue;
        findings.push({
            kind: "season-literal",
            severity: "warning",
            scenario: def.id,
            message: `${passage.label} says "${word}" with no calendar condition behind it: gate the scenario on the months or the season, or write {{season}}.`,
        });
        return;
    }
}
/**
 * Whether a reply actually empties the chair its prose says was emptied.
 *
 * Nothing on a reply can do that yet — the departure path is the cabinet
 * workstream's, and this is the one read that changes when it lands. Until then
 * every narrated resignation is unbacked, which is exactly what the rule is for:
 * the prose is already in the corpus and the mechanics are not.
 */
function carriesVacancy(_reply) {
    return false;
}
/**
 * A card that says somebody resigned while the seat stays filled.
 *
 * The player reads that the Secretary walked out and then finds them still
 * briefing next week, which is the worst kind of incoherence: the game
 * contradicts its own aftermath copy rather than merely under-simulating it.
 */
function auditNarratedVacancy(def, findings) {
    for (const reply of def.replies) {
        const spoken = [
            reply.press,
            reply.commitment.kind === "position" ? reply.commitment.remembered : undefined,
            reply.commitment.rejoinder?.text,
        ].filter((text) => text !== undefined);
        const phrase = spoken
            .flatMap((text) => sentencesOf(text))
            .filter((sentence) => namesAChair(sentence))
            .map((sentence) => phraseIn(sentence, DEPARTURE_PHRASES))
            .find((found) => found !== undefined);
        if (phrase === undefined || carriesVacancy(reply))
            continue;
        findings.push({
            kind: "narrated-vacancy",
            severity: "warning",
            scenario: def.id,
            message: `reply "${reply.id}" narrates a departure ("${phrase}") that empties no chair: the seat stays filled and the player meets the same person next week.`,
        });
    }
}
/** Push the binding findings for a batch. */
export function auditBindings(defs, findings) {
    for (const def of defs) {
        auditUnboundDisaster(def, findings);
        auditSeasonLiteral(def, findings);
        auditNarratedVacancy(def, findings);
    }
}
