import { INSTRUMENT_RUNGS } from "./instruments.js";
import { nationName, possessive, sentenceCase } from "./naming.js";
const key = (instrument, rung) => `${instrument}:${rung}`;
const VOICES = {
    "diplomatic:1": {
        did: (t) => `sent a private warning to ${t}`,
        attempted: (t) => `warn ${t} privately`,
        held: "the message was taken seriously",
        phrase: "a private warning",
    },
    "diplomatic:2": {
        did: (t) => `condemned ${t} in public`,
        attempted: (t) => `condemn ${t} in public`,
        held: "the criticism stuck",
        phrase: "a public condemnation",
    },
    "diplomatic:3": {
        did: (t) => `called its ambassador home from ${t}`,
        attempted: (t) => `call its ambassador home from ${t}`,
        held: "every other capital noticed",
        phrase: "a recall of its ambassador",
    },
    "diplomatic:4": {
        did: (t) => `lined up other governments against ${t}`,
        attempted: (t) => `line up other governments against ${t}`,
        held: "the group held together",
        phrase: "a coalition of other governments",
    },
    "diplomatic:5": {
        did: (t) => `broke off relations with ${t}`,
        attempted: (t) => `break off relations with ${t}`,
        held: "both embassies are shut",
        phrase: "a break in relations",
    },
    "economic:1": {
        did: (t) => `warned its companies off doing business in ${t}`,
        attempted: (t) => `warn its companies off doing business in ${t}`,
        held: "the warning held",
        phrase: "a warning to its own companies",
    },
    "economic:2": {
        did: (t) => `raised tariffs on goods from ${t}`,
        attempted: (t) => `raise tariffs on goods from ${t}`,
        held: "importers are paying the new rate",
        phrase: "higher tariffs",
    },
    "economic:3": {
        did: (t) => `blacklisted named companies and officials in ${t}`,
        attempted: (t) => `blacklist named companies and officials in ${t}`,
        held: "the names are off the banking system",
        phrase: "sanctions on named people and companies",
    },
    "economic:4": {
        did: (t) => `froze the money ${t} keeps in its banks`,
        attempted: (t) => `freeze the money ${t} keeps in its banks`,
        held: "not a dollar of it moved",
        phrase: "a freeze on money held in its banks",
    },
    "economic:5": {
        did: (t) => `shut off trade with ${t} altogether`,
        attempted: (t) => `shut off trade with ${t} altogether`,
        held: "the ports are closed to it",
        phrase: "a full embargo",
    },
    "covert:1": {
        did: (t) => `put ${t} under close watch`,
        attempted: (t) => `put ${t} under close watch`,
        held: "the collection is running and nobody has noticed",
        phrase: "close surveillance",
    },
    "covert:2": {
        did: (t) => `ran a quiet influence campaign inside ${t}`,
        attempted: (t) => `run a quiet influence campaign inside ${t}`,
        held: "the story took hold and nothing traced back",
        phrase: "a quiet influence campaign",
    },
    "covert:3": {
        did: (t) => `sabotaged something ${t} depends on`,
        attempted: (t) => `sabotage something ${t} depends on`,
        held: "the damage was done and nobody was caught",
        phrase: "sabotage",
    },
    "covert:4": {
        did: (t) => `armed and paid fighters working against ${t}`,
        attempted: (t) => `arm and pay fighters working against ${t}`,
        held: "the crates arrived with no flag on them",
        phrase: "support for somebody else's fighters",
    },
    "covert:5": {
        did: (t) => `moved in secret to bring down the government of ${t}`,
        attempted: (t) => `bring down the government of ${t} in secret`,
        held: "the operation is running and nobody has named it",
        phrase: "a secret move against a government",
    },
    "military:1": {
        did: (t) => `staged military exercises within reach of ${t}`,
        attempted: (t) => `stage military exercises within reach of ${t}`,
        held: "the point was hard to miss",
        phrase: "military exercises",
    },
    "military:2": {
        did: (t) => `moved forces up to ${possessive(t)} doorstep`,
        attempted: (t) => `move forces up to ${possessive(t)} doorstep`,
        held: "the units are in place",
        phrase: "a deployment to the border",
    },
    "military:3": {
        did: (t) => `blockaded ${possessive(t)} shipping`,
        attempted: (t) => `blockade ${possessive(t)} shipping`,
        held: "nothing is getting in or out by sea",
        phrase: "a naval blockade",
    },
    "military:4": {
        did: (t) => `struck a named target inside ${t}`,
        attempted: (t) => `strike a named target inside ${t}`,
        held: "the target is gone",
        phrase: "an air strike",
    },
    "military:5": {
        did: (t) => `sent troops into ${t}`,
        attempted: (t) => `send troops into ${t}`,
        held: "its soldiers are across the border",
        phrase: "an invasion",
    },
    "assistance:1": {
        did: (t) => `sent emergency relief to ${t}`,
        attempted: (t) => `send emergency relief to ${t}`,
        held: "the supplies reached the people who needed them",
        phrase: "emergency relief",
    },
    "assistance:2": {
        did: (t) => `paid for schools, clinics and roads in ${t}`,
        attempted: (t) => `pay for schools, clinics and roads in ${t}`,
        held: "the money went where it was promised",
        phrase: "development money",
    },
    "assistance:3": {
        did: (t) => `put money and advisers behind the government of ${t}`,
        attempted: (t) => `put money and advisers behind the government of ${t}`,
        held: "the government steadied",
        phrase: "money and advisers",
    },
    "assistance:4": {
        did: (t) => `shipped weapons to ${t}`,
        attempted: (t) => `ship weapons to ${t}`,
        held: "the shipment arrived and was signed for",
        phrase: "a weapons shipment",
    },
    "assistance:5": {
        did: (t) => `promised to defend ${t} if it is attacked`,
        attempted: (t) => `promise to defend ${t} if it is attacked`,
        held: "the promise is on the record",
        phrase: "a promise to defend it",
    },
};
const FAIL_TAILS = {
    rebuffed: (_a, t) => `${t} would not move`,
    "public-humiliation": (a, t) => `${t} published the whole exchange and ${a} came off badly`,
    retaliation: (_a, t) => `${t} answered with measures of its own`,
    "market-blowback": () => "its own markets flinched first",
    exposure: (a, t) => `${t} caught it and named ${a} in public`,
    "asset-lost": () => "the agent it was relying on was picked up and the operation folded",
    blowback: () => "it went wrong and hurt the service that ran it",
    repulsed: (_a, t) => `${possessive(t)} forces held and nothing was gained`,
    escalation: (_a, t) => `${t} hit back harder instead of backing down`,
    "atrocity-scandal": () => "it turned into a scandal that outlasted whatever it was for",
    diverted: () => "the shipment was stolen before it reached anyone who needed it",
    "captured-by-the-wrong-hands": () => "it ended up paying the very people it was meant to weaken",
    "guarantee-called": (_a, t) => `${t} read it as a promise of more and asked for it the same week`,
};
const GENERIC_FAIL = () => "nothing came of it";
// FNV-1a over the act's own coordinates. Phrasing varies, and it varies the
// same way on every replay of the same week — a second shape exists so a feed
// with three economic moves in it does not read as one sentence printed thrice,
// not so that the feed can surprise anyone.
function shapeIndex(seed, modulo) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash % modulo;
}
/** A country as a wire sentence carries it, article and all. */
export const wireName = nationName;
/** The move as a noun phrase a later paragraph can refer back to. */
export function movePhrase(instrument, rung) {
    return VOICES[key(instrument, rung)]?.phrase ?? "the move";
}
/**
 * One sentence, in plain words, about what one government did to another and
 * how it went.
 *
 * Pure and deterministic: the same act in the same week always produces the
 * same sentence, which is what lets a dispatch be composed at read time instead
 * of stored.
 */
export function wireLine(act) {
    const voice = VOICES[key(act.instrument, act.rung)];
    const actor = sentenceCase(act.actor);
    if (!voice) {
        // No bank for this rung: say the plain fact and no more. A sentence with no
        // particulars is better than an invented one.
        return act.landed ? `${actor} moved against ${act.target}, and it worked.` : `${actor} moved against ${act.target}, and it did not.`;
    }
    const seed = `${act.turn}:${act.actor}:${act.target}:${act.instrument}:${act.rung}:${act.landed}`;
    const shape = shapeIndex(seed, 2);
    if (act.landed) {
        return shape === 0
            ? `${actor} ${voice.did(act.target)}, and ${voice.held}.`
            : `${actor} ${voice.did(act.target)} this week. ${sentenceCase(voice.held)}.`;
    }
    const tail = (act.riskId ? FAIL_TAILS[act.riskId] : undefined) ?? GENERIC_FAIL;
    const failure = tail(act.actor, act.target);
    return shape === 0
        ? `${actor} tried to ${voice.attempted(act.target)}, and ${failure}.`
        : `${actor} ${voice.did(act.target)}, and ${failure}.`;
}
/**
 * What the act leaves standing, as a clause an article can build a paragraph
 * on. Never a figure and never a quote: the composer may only restate what the
 * simulation already decided.
 */
export function wireStake(act) {
    const voice = VOICES[key(act.instrument, act.rung)];
    if (act.landed)
        return voice ? voice.held : "the move stands";
    const tail = (act.riskId ? FAIL_TAILS[act.riskId] : undefined) ?? GENERIC_FAIL;
    return tail(act.actor, act.target);
}
// The catalogue name is what the ledger, the projection pane and the Ops board
// key on, so a piece that has only been handed that name still has to be able
// to say the move in plain words. Built off the ladder itself: a rung renamed
// in the catalogue cannot leave a stale phrase behind here.
//
// Built on first use rather than at load: the ladder module sits on an import
// cycle with the people and diplomacy modules that read this file, and a map
// built at load reads the ladder before it exists whenever one of those modules
// happens to load first.
let phraseByRungName;
function phrasesByRungName() {
    phraseByRungName ??= new Map(INSTRUMENT_RUNGS.map((definition) => [definition.name, movePhrase(definition.instrument, definition.rung)]));
    return phraseByRungName;
}
/**
 * The plain-words phrase for a move named the way the catalogue names it.
 * Falls back to the name itself, lower-cased to sit mid-sentence, which is what
 * a caller handing over something that is not a rung at all ("health program")
 * wants anyway.
 */
export function movePhraseNamed(catalogueName) {
    const known = phrasesByRungName().get(catalogueName);
    if (known)
        return known;
    return catalogueName.charAt(0).toLowerCase() + catalogueName.slice(1);
}
let nameByKey;
function namesByKey() {
    nameByKey ??= new Map(INSTRUMENT_RUNGS.map((definition) => [key(definition.instrument, definition.rung), definition.name]));
    return nameByKey;
}
/**
 * The catalogue's own name for a rung. A feed item records it in `facts` so the
 * piece behind the headline can say what the move was without the composer
 * having to be handed the ladder.
 */
export function rungCatalogueName(instrument, rung) {
    return namesByKey().get(key(instrument, rung));
}
// The same failure branches, said forward rather than back.
//
// A projection is a forecast: the player is reading it *before* committing, and
// "Alpland answered with measures of its own" tells them a thing has already
// happened that has not. Same bank, same branch ids, same plain words — only
// the tense moves. The Record keeps `wireStake`, which is past because by then
// it is.
const RISK_FORECASTS = {
    rebuffed: (_a, t) => `${t} will not move`,
    "public-humiliation": (a, t) => `${t} publishes the whole exchange and ${a} comes off badly`,
    retaliation: (_a, t) => `${t} answers with measures of its own`,
    "market-blowback": () => "its own markets flinch first",
    exposure: (a, t) => `${t} catches it and names ${a} in public`,
    "asset-lost": () => "the agent it is relying on is arrested and the operation folds",
    blowback: () => "it goes wrong and hurts the service that runs it",
    repulsed: (_a, t) => `${possessive(t)} forces hold and nothing is gained`,
    escalation: (_a, t) => `${t} hits back harder instead of backing down`,
    "atrocity-scandal": () => "it turns into a scandal that outlasts whatever it is for",
    diverted: () => "somebody steals the shipment before it reaches anyone who needs it",
    "captured-by-the-wrong-hands": () => "it ends up paying the very people it is supposed to weaken",
    "guarantee-called": (_a, t) => `${t} reads it as a promise of more and asks for it the same week`,
};
const GENERIC_FORECAST = () => "nothing comes of it";
/**
 * What the player is warned about before committing: one named failure branch,
 * in plain words, naming the target, in the tense a forecast is written in.
 *
 * Deterministic and phrasing-stable — a forecast that read differently on two
 * openings of the same board would be a second opinion of the same odds.
 */
export function wireRisk(act) {
    const tail = RISK_FORECASTS[act.riskId] ?? GENERIC_FORECAST;
    return tail(act.actor, act.target);
}
const ENGAGEMENT_VOICES = {
    call: {
        between: [
            (a, t) => `${a} and ${t} spoke by phone at the top of government.`,
            (a, t) => `${a} called ${t}; both sides called the conversation useful.`,
        ],
        president: [
            (t) => `The President spoke by phone with the leadership of ${t}.`,
            (t) => `The White House put out a readout of the President's call with ${t}.`,
        ],
        declined: (a, t) => `${a} asked for a call with ${t}, and none was scheduled.`,
    },
    envoy: {
        between: [
            (a, t) => `${a} sent a senior envoy to ${t} for talks.`,
            (a, t) => `An envoy from ${a} spent the week in ${t}, carrying messages both ways.`,
        ],
        president: [
            (t) => `The President sent a personal envoy to ${t}.`,
            (t) => `A presidential envoy arrived in ${t} for private talks.`,
        ],
        declined: (a, t) => `${t} would not receive the envoy ${a} offered to send.`,
    },
    visit: {
        between: [
            (a, t) => `The leader of ${a} made a state visit to ${t}.`,
            (a, t) => `${t} laid on full honors for a state visit from ${a}.`,
        ],
        president: [
            (t) => `The President made a state visit to ${t}.`,
            (t) => `The President landed in ${t} for a state visit, the full ceremony laid on.`,
        ],
        declined: (a, t) => `${t} turned down a state visit from ${a}; no dates were set.`,
    },
    summit: {
        between: [
            (a, t) => `${a} and ${t} held a summit and agreed to keep talking.`,
            (a, t) => `Leaders from ${a} and ${t} met at a summit meant to lower the temperature.`,
        ],
        president: [
            (t) => `The President met the leadership of ${t} at a summit.`,
            (t) => `The President and the leadership of ${t} held a summit and agreed to keep a channel open.`,
        ],
        declined: (a, t) => `${t} would not come to the summit ${a} proposed.`,
    },
    declaration: {
        between: [
            (a, t) => `${a} and ${t} issued a joint declaration setting out common aims.`,
            (a, t) => `${a} and ${t} signed a joint statement on the ties between them.`,
        ],
        president: [
            (t) => `The President and ${t} issued a joint declaration.`,
            (t) => `The United States and ${t} put their names to a joint statement of common aims.`,
        ],
        declined: (a, t) => `${t} would not sign the joint declaration ${a} drafted.`,
    },
};
/** The readout of an engagement, in the week it was made. Deterministic for a given act and week. */
export function engagementLine(act) {
    const voice = ENGAGEMENT_VOICES[act.kind];
    if (!act.received)
        return sentenceCase(voice.declined(act.byPresident ? "the President" : act.actor, act.target));
    const shape = shapeIndex(`${act.turn}:${act.actor}:${act.target}:${act.kind}`, 2);
    if (act.byPresident)
        return voice.president[shape](act.target);
    return sentenceCase(voice.between[shape](act.actor, act.target));
}
