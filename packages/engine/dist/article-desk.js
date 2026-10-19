import { worldDataset } from "@admin/world";
import { outletStance } from "./press-outlets.js";
import { pickOutletForFeedItem } from "./press-filing.js";
import { FORMAT_VOICE } from "./article-formats.js";
// An article is composed at read time, so every bank draw is keyed off the
// item's own content: re-reading the same dispatch three turns later has to
// produce the same piece.
import { reporterFor } from "./article-bylines.js";
import { hashIndex } from "./rng.js";
import { movePhraseNamed } from "./wire.js";
import { possessive } from "./naming.js";
export function pick(item, section, bank) {
    return bank[hashIndex(`${item.turn}:${item.headline}:${section}`, bank.length)];
}
/** One of the lines the desk can honestly fill, keyed off the item so a re-read is the same piece; nothing when none can be. */
export function pickLine(desk, section, bank) {
    const filled = bank.map((line) => line(desk)).filter((text) => text !== undefined);
    if (filled.length === 0)
        return undefined;
    return filled[hashIndex(`${desk.item.turn}:${desk.item.headline}:${section}`, filled.length)];
}
export const KIND_STANDFIRST = {
    press: "What was reported, and who it names.",
    "npc-action": "What a foreign government did, and to whom.",
    "player-action": "What the administration ordered, and where.",
    operator: "What is operating outside any government's control, and what can reach it.",
    drift: "What moved without a decision behind it.",
    conflict: "Where a war stands, and who is in it.",
    condition: "Where an emergency stands, and who it reaches.",
    governance: "What changed in the rules a government works under.",
    pursuit: "A campaign one government is running against another.",
    bloc: "What a bloc of governments did, and who it names.",
};
// The headline is the one particular every item is guaranteed to carry, so the
// body is allowed to lean on it — but as a sentence a reporter would write, not
// as a quoted string. Trailing punctuation goes, because it lands mid-sentence.
export function claim(desk) {
    return desk.item.headline.replace(/[.!?]+\s*$/, "");
}
/** The headline as the tail of a sentence: "The ministry confirms" reads "the ministry confirms" after a colon; a name keeps its capital. */
export function headlineClause(desk) {
    const text = bareBodyNames(claim(desk));
    return /^(?:The|A|An)\s/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}
/** Bodies whose name is said as a word and takes no article: "leaves OPEC+", never "leaves the OPEC+". */
export const BARE_BODY_NAMES = new Set(["NATO", "BRICS", "ASEAN", "OPEC", "OPEC+"]);
// Items filed before the bloc templates stopped writing "the OPEC+" still carry
// it in their headline and stake; the body prints the name as it is said.
const ARTICLED_BODY = new RegExp(`\\b[Tt]he (${[...BARE_BODY_NAMES].map((name) => name.replace("+", "\\+")).join("|")})(?![\\w+])`, "g");
export function bareBodyNames(text) {
    return text.replace(ARTICLED_BODY, "$1");
}
export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
export function sentence(text) {
    const trimmed = text.trim().replace(/[.!?]+\s*$/, "");
    return `${capitalize(trimmed)}.`;
}
/**
 * The stake, unless the headline already ends on it, made to stand as its own
 * sentence. A wire stake is written as the tail of its headline, so it can open
 * on "its" or "it" meaning the actor; printed alone that is a pronoun with
 * nothing to refer to ("Its own markets flinched first."), so the actor is put
 * back, or the line is dropped when there is no actor to put back.
 */
export function freshStake(desk) {
    const stake = desk.stake ? bareBodyNames(desk.stake.trim()) : undefined;
    if (!stake || echoesHeadlineClose(stake, desk.item.headline) || desk.item.headline.toLowerCase().includes(stake.toLowerCase()))
        return undefined;
    const pronoun = stake.match(/^(its|it|they|their|them|this|that)\b\s*/i)?.[1]?.toLowerCase();
    if (pronoun === undefined)
        return stake;
    if (!desk.actor || (pronoun !== "its" && pronoun !== "it"))
        return undefined;
    const rest = stake.replace(/^\S+\s*/, "");
    return pronoun === "its" ? `${possessive(desk.actor)} ${rest}` : `${desk.actor} ${rest}`;
}
// Every display name a country goes by on the board, as a subject line would
// print it. Read once, on first use, from the dataset the engine already holds.
let nationNames;
function isNationName(name) {
    nationNames ??= new Set(worldDataset.nations.map((nation) => nation.identity.name));
    return nationNames.has(name.replace(/^the\s+/i, ""));
}
// "Logan Hall" -> "Hall", and nothing else -> anything.
//
// A body ("the Emergency Committee") and a country ("China", "Saudi Arabia")
// must not be put through this: "Committee has not resigned" and "Arabia has
// not resigned" are how a template written for a person announces that it was
// handed something that is not one. Undefined here is the signal to use a bank
// that does not assume a human subject at all.
export function personShortName(full) {
    if (isNationName(full.trim()))
        return undefined;
    const parts = full.trim().split(/\s+/);
    if (parts.length < 2 || parts.length > 3)
        return undefined;
    if (!parts.every((part) => /^[A-Z][\p{L}'’.-]*$/u.test(part)))
        return undefined;
    return parts.at(-1);
}
/** Whether a subject is a country rather than a person or a body: a party to a story, not its center. */
export function subjectIsNation(subject) {
    return subject !== undefined && isNationName(subject.trim());
}
// The catalogue's own name for a rung is a label, not a phrase: "tariff
// Increase" is what lower-casing it produces and no reader has ever seen that
// written down. The wire desk keeps the plain-words phrase for every rung, and
// anything that is not a rung (a governance program, say) comes back lower-cased
// as before.
export function moveName(name) {
    return CATALOGUE_ID_PHRASE[name] ?? movePhraseNamed(name);
}
// Engagements and world events file their catalogue id as the instrument,
// and an id is not a phrase: "reached for engagement:call" is what printing it
// produced.
const CATALOGUE_ID_PHRASE = {
    "engagement:call": "a call between leaders",
    "engagement:envoy": "an envoy",
    "engagement:visit": "a state visit",
    "engagement:summit": "a summit",
    "engagement:declaration": "a joint declaration",
    "world-event:sanctions-package": "a sanctions package",
    "world-event:border-clash": "a clash on the border",
    "world-event:accession": "a change of membership",
    "world-event:disaster-aid": "disaster aid",
    "world-event:election-interference": "interference in an election",
};
// Moves that give rather than take. A sentence that puts a target after one
// writes it as help sent to, not a move made against.
const GIVING_MOVE = /\b(?:relief|development money|aid|a call between leaders|an envoy|a state visit|a summit|a joint declaration)\b/;
/** The preposition a move takes before its target: help goes to a country, pressure goes against one. */
export function moveToward(name) {
    return GIVING_MOVE.test(moveName(name)) ? "to" : "against";
}
export function firstSentence(text) {
    const match = text.trim().match(/^[^.!?]+[.!?]?/);
    return match?.[0]?.trim() ?? text.trim();
}
function lastSentence(text) {
    const parts = text.trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return parts?.at(-1)?.trim() ?? text.trim();
}
function normalizeClause(text) {
    return text.trim().replace(/[.!?]+\s*$/, "").replace(/\s+/g, " ").toLowerCase();
}
/** True when `clause` is already the headline's closing sentence — do not restate it. */
export function echoesHeadlineClose(clause, headline) {
    return normalizeClause(clause) === normalizeClause(lastSentence(headline));
}
// A country name that carries its article sits mid-sentence as "the United
// States" and opens one as "The United States". Every bank writes the
// mid-sentence form, so the capital is put back on at the end, once, where the
// sentence boundaries are visible.
export function polish(text) {
    return text.replace(/(^|[.!?]\s+)([a-z])/g, (_match, lead, letter) => `${lead}${letter.toUpperCase()}`);
}
// --- The masthead: who publishes the piece, in whose voice, and when. ---
const INTELLIGENCE_OUTLET = "Restricted Circulation";
// A masthead's view of an act of this administration, by its stance at filing.
// Printed only over a story about such an act, so each line is a view of the
// act and nothing else: no briefing, statement or answer is described, because
// the item records none.
const OUTLET_VOICE_PREFIX = {
    "outlet-washington-chronicle": {
        hostile: "The paper is against the move, and says so.",
        skeptical: "The paper doubts the move will do what it is meant to.",
        neutral: "The paper reports the move without taking a side.",
        friendly: "The paper backs the move, with questions.",
    },
    "outlet-capital-register": {
        hostile: "The paper leads with the case against the White House.",
        skeptical: "The paper asks what the move leaves out.",
        neutral: "The paper reports the move and the objections to it.",
        friendly: "The paper takes the White House at its word, with a caveat.",
    },
    // The wire does not editorialize in either direction, so its stance shows in
    // the order it puts things in, not in an adjective.
    "outlet-national-wire": {
        hostile: "The wire leads with the criticism of the move.",
        skeptical: "The wire puts the administration's case after its critics'.",
        neutral: "The wire reports it straight.",
        friendly: "The wire leads with what the administration says the move achieves.",
    },
    "outlet-american-review": {
        hostile: "Even this administration's friendliest outlet is not defending the move.",
        skeptical: "The review is less friendly to the move than the White House would like.",
        neutral: "The review gives the move a hearing, and no more.",
        friendly: "The review takes the administration's side, with caveats.",
    },
    "outlet-continental-broadcasting": {
        hostile: "The broadcast leads with what the move costs.",
        skeptical: "The broadcast weighs the administration's case and finds it thin.",
        neutral: "The broadcast reports the move without a verdict.",
        friendly: "The broadcast carries the move as the administration frames it.",
    },
    // The markets daily reaches for a number before it reaches for a verdict.
    "outlet-business-record": {
        hostile: "The desk reads the move as bad for business.",
        skeptical: "The desk doubts the move adds up.",
        neutral: "The desk reports what the move means for markets, without a verdict.",
        friendly: "The desk reads the move as good for business, which it does not say often.",
    },
};
/** The stance a piece is voiced in: the desk's at filing when it was kept, or the one the caller read off the corps. */
export function voiceStance(item, disposition) {
    if (item.desk)
        return item.desk.stance;
    return disposition === undefined ? undefined : outletStance(disposition);
}
function voicePrefix(outlet, stance) {
    if (stance === undefined)
        return undefined;
    return OUTLET_VOICE_PREFIX[outlet.id]?.[stance] ?? FORMAT_VOICE[outlet.format]?.[stance];
}
export function applyOutletVoice(standfirst, outlet, stance) {
    const prefix = voicePrefix(outlet, stance);
    if (!prefix)
        return standfirst;
    return `${prefix} ${standfirst}`;
}
export function outletFor(item) {
    if (item.visibility === "intelligence")
        return { outlet: INTELLIGENCE_OUTLET };
    const pressOutlet = pickOutletForFeedItem(item);
    if (!pressOutlet)
        return { outlet: INTELLIGENCE_OUTLET };
    return { outlet: pressOutlet.name, outletId: pressOutlet.id, pressOutlet };
}
export function bylineFor(item, facts, filedOn, outletId) {
    const when = filedOn ?? `week ${item.turn}`;
    const bare = `${filedOn ? "on" : "in"} ${when}`;
    if (item.visibility === "intelligence") {
        return facts.dateline
            ? `Circulated from ${facts.dateline}, ${when}. Not for publication.`
            : `Circulated ${bare}. Not for publication.`;
    }
    const filed = facts.dateline ? `Filed from ${facts.dateline}, ${when}.` : `Filed ${bare}.`;
    // The reporter the desk put on it at filing, when that was kept: a stored
    // byline is the one the campaign's own staff drew, and it never re-rolls.
    const stored = item.desk && item.desk.outletId === outletId ? item.desk.byline : undefined;
    const reporter = stored ?? (outletId ? reporterFor(outletId, item) : undefined);
    return reporter ? `${reporter}. ${filed}` : filed;
}
