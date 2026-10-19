import { agendaTheme } from "@admin/world";
import { audienceCost } from "./governance.js";
import { INSTRUMENT_COERCION } from "./instruments.js";
import { selectActivePursuits, selectNation, selectPursuitAgainst, } from "./state.js";
import { nationName, sentenceCase } from "./naming.js";
// A nation pressing another one for weeks, not for an afternoon.
//
// The agent already chose the best single move available each turn, which
// produced a world where a nation sanctioned a neighbor on Monday, forgot about
// it by Friday, and picked whoever happened to score highest next week. Nothing
// accumulated, so nothing between two capitals ever became a story: there was
// no such thing as a state being *worked on*.
//
// A pursuit is that missing fact. One nation, one target, one aim, carried
// across turns: what it has already spent, how far up the ladder it has gone,
// and whether any of it is working. The agent reads it as a preference to keep
// going, so a nation returns to a target it has invested in rather than
// starting fresh every week — and a pursuit that is spending without gaining
// escalates, which is how a démarche becomes an embargo becomes a war without
// anything scripting that sequence.
//
// It is not a second action system. Every move a pursuit produces is the same
// `resolveAction` move the player commits through, priced the same way. What is
// added is memory.
/** How far a démarche is from a campaign. Below this a move is an incident. */
const PURSUIT_COERCION_FLOOR = 0.5;
/**
 * What one more week of pressing costs the actor, as a share of itself.
 *
 * A fifth of itself per act gave every campaign in the world a life of exactly
 * five acts, since a pursuit that has spent everything and gained nothing is
 * abandoned — and a five-rung ladder cannot be climbed in five acts when the
 * climb only starts once enough has been spent to have something to lose. The
 * ceiling that produced was arithmetic rather than judgment: no state anywhere
 * could reach the top two rungs of any ladder by pressing, however long it
 * pressed. A seventh of itself gives a campaign about seven of the actor's own
 * turns, which is a campaign that can go the distance and still ends.
 */
const COMMITMENT_STEP = 0.14;
/** What a landed move buys, before the rung scales it. */
const PROGRESS_ON_SUCCESS = 0.22;
/** What a failed one costs. Deliberately less than a success buys: pressure
 * that fails still tells the target it is being pressed. */
const PROGRESS_ON_FAILURE = 0.14;
/** Commitment above which a stalled pursuit reaches for the next rung. A
 * nation escalates because it has already paid, not because it is losing.
 * Two acts in: enough to be a program the government owns rather than an
 * incident, and early enough that the climb has somewhere to go. */
const ESCALATE_ABOVE = 0.25;
/**
 * How long a capital waits between weeks of its own.
 *
 * Sixty governments share three weekly slots, so a state's own turn comes round
 * about every twentieth week — a figure the measured world agrees with. Both
 * figures below are scaled by it, because a pursuit's clock is the actor's
 * attention and not the calendar: charging a campaign for the weeks in which
 * its author was never asked charges it for the cap rather than for anything
 * the government did. Six weeks of calendar was six weeks of everybody else's
 * attention, and it closed every campaign in the world before the state running
 * it could return to it, which is why nothing ever accumulated enough
 * commitment to climb a rung.
 */
const WEEKS_BETWEEN_TURNS_OF_ITS_OWN = 20;
/**
 * Weeks a pursuit may go untouched before the actor has plainly moved on —
 * two turns of its own, so a campaign lapses because the government passed on
 * it twice rather than because it was never asked.
 */
const STALE_AFTER = 2 * WEEKS_BETWEEN_TURNS_OF_ITS_OWN;
/** What an untouched week takes off what has been committed. */
const COMMITMENT_DECAY = 0.1 / WEEKS_BETWEEN_TURNS_OF_ITS_OWN;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const clampSigned = (value) => Math.max(-1, Math.min(1, value));
/** The aim a nation is actually after, from the heaviest of its rolled agendas. */
export function leadingAim(runtime) {
    const ranked = [...runtime.traits.agendas].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
    for (const agenda of ranked) {
        const theme = agendaTheme(agenda.id);
        if (theme)
            return theme;
    }
    return undefined;
}
export function pursuitId(actor, target, openedTurn) {
    return `pursuit:${actor}:${target}:${openedTurn}`;
}
/**
 * Whether a move is the kind of thing a campaign is built out of. A démarche
 * is how states talk; an embargo, an operation or a strike is a state deciding
 * to change another one's behavior and being willing to spend to do it.
 */
export function opensPursuit(instrument) {
    return INSTRUMENT_COERCION[instrument] >= PURSUIT_COERCION_FLOOR;
}
export function openPursuit(actor, target, aim, turn, instrument, rung, cause) {
    return {
        id: pursuitId(actor, target, turn),
        actor,
        target,
        aim,
        openedTurn: turn,
        commitment: COMMITMENT_STEP,
        progress: 0,
        rungReached: rung,
        overt: instrument !== "covert",
        lastActedTurn: turn,
        status: "active",
        beats: [{ turn, description: cause }],
    };
}
/**
 * The rung a pursuit wants next.
 *
 * It holds where it is while it is gaining, and steps up once it has spent
 * enough to have something to lose and is not getting it. That is the whole
 * escalation ladder: nothing decides in advance that this pair goes to war, and
 * a pursuit that starts working never climbs.
 */
export function wantedRung(pursuit) {
    const stalled = pursuit.progress <= 0 && pursuit.commitment > ESCALATE_ABOVE;
    return Math.max(1, Math.min(5, pursuit.rungReached + (stalled ? 1 : 0)));
}
/** One week of pressing, folded into what the pursuit already was. */
export function advancePursuit(pursuit, outcome, turn) {
    // A move lands for what it is: the top of the ladder moves a target further
    // than the bottom of it does, in both directions.
    const weight = 0.6 + 0.4 * (outcome.rung / 5);
    const movement = outcome.success ? PROGRESS_ON_SUCCESS * weight : -PROGRESS_ON_FAILURE * weight;
    const progress = clampSigned(pursuit.progress + movement);
    const commitment = clamp01(pursuit.commitment + COMMITMENT_STEP);
    const beats = [...pursuit.beats, { turn, description: outcome.summary }];
    return {
        ...pursuit,
        commitment,
        progress,
        rungReached: Math.max(pursuit.rungReached, outcome.rung),
        overt: pursuit.overt || outcome.instrument !== "covert",
        lastActedTurn: turn,
        beats,
        ...settle(progress, commitment, turn),
    };
}
/**
 * Whether this week ended it. A pursuit closes when it got what it came for,
 * or when it has spent everything it had and moved the target backwards — the
 * two ways a campaign actually stops, as against a timer.
 */
function settle(progress, commitment, turn) {
    if (progress >= 1)
        return { status: "achieved", closedTurn: turn };
    if (commitment >= 1 && progress <= 0)
        return { status: "abandoned", closedTurn: turn };
    return {};
}
// --- What the agent reads ---
/** The weight the focus term carries at full commitment. */
const FOCUS_WEIGHT = 0.8;
/**
 * How much this nation wants *this* move because of a campaign it is already
 * running. Zero when there is no pursuit against the target, so a nation with
 * no history anywhere behaves exactly as it did before pursuits existed.
 */
export function focusFor(campaign, actor, target, rung) {
    const pursuit = selectPursuitAgainst(campaign, actor, target);
    if (!pursuit)
        return 0;
    const invested = FOCUS_WEIGHT * (0.35 + 0.65 * pursuit.commitment);
    // The pull is toward the rung the campaign wants, not toward any move
    // against the target: a nation running an embargo does not suddenly find a
    // démarche compelling because it is aimed at the right country.
    //
    // The falloff is steep for the same reason. Spread across the whole ladder it
    // left a campaign that had decided it needed the next rung almost as content
    // with the rung below, which every other term then outvoted — so a pursuit
    // could want rung four for the rest of the campaign and never once take it,
    // and the ladder the escalation model exists to climb stopped at three. Two
    // rungs off its own aim is a different act, and reads as one.
    const distance = Math.min(1, Math.abs(rung - wantedRung(pursuit)) / 2);
    return invested * (1 - distance);
}
// --- The turn phase: what happens to a pursuit nobody touched ---
function feedItemFor(campaign, pursuit, turn, headline) {
    // A covert campaign that has never surfaced is not news. Once any part of it
    // has been run in the open, the shape of it is readable from the outside.
    if (!pursuit.overt)
        return undefined;
    // The name as a sentence carries it: "against the United States", and "The
    // Gambia" when it opens one. The bare dataset name printed "against United States".
    const name = (id) => {
        const identity = selectNation(campaign, id)?.base.identity;
        return identity ? nationName(identity) : id;
    };
    return {
        turn,
        kind: "pursuit",
        visibility: "public",
        headline: sentenceCase(headline.replace("{actor}", name(pursuit.actor)).replace("{target}", name(pursuit.target))),
        actor: pursuit.actor,
        target: pursuit.target,
    };
}
export function closingHeadline(pursuit) {
    if (pursuit.status === "achieved")
        return "{actor} gets what it wanted out of {target}.";
    return "{actor} lets its campaign against {target} lapse.";
}
/**
 * Pursuits age whether or not anyone acted on them.
 *
 * Without this a nation that pressed a target once and never came back would
 * carry that pursuit — and the preference to escalate it — for the rest of the
 * campaign. What a state has stopped doing has to stop counting, or the board
 * accumulates commitments nobody is honoring.
 */
export const pursuitPhase = (state) => {
    const turn = state.turn + 1;
    const effects = [];
    const feed = [];
    let lapsed = 0;
    for (const pursuit of selectActivePursuits(state)) {
        if (pursuit.lastActedTurn >= state.turn)
            continue;
        const idle = state.turn - pursuit.lastActedTurn;
        // What it costs this particular government to be seen dropping something
        // it started. A multiparty cabinet with a chamber full of people whose job
        // is to name the reversal carries a campaign longer and gives up less of
        // what it has spent; a one-party state can drop it on Monday and nobody
        // will ask. Absent an actor the campaign has outlived its own author, and
        // there is nobody left for whom folding is expensive.
        const actor = selectNation(state, pursuit.actor);
        const exposure = actor ? audienceCost(actor) : 0;
        if (idle >= STALE_AFTER * (1 + exposure)) {
            const closed = {
                ...pursuit,
                status: "abandoned",
                closedTurn: turn,
                beats: [...pursuit.beats, { turn, description: `${pursuit.actor} stops pressing ${pursuit.target}.` }],
            };
            effects.push({ kind: "pursuit", set: closed });
            const item = feedItemFor(state, closed, turn, closingHeadline(closed));
            if (item)
                feed.push(item);
            lapsed += 1;
            continue;
        }
        const commitment = clamp01(pursuit.commitment - COMMITMENT_DECAY * (1 - exposure * 0.5));
        if (commitment === pursuit.commitment)
            continue;
        effects.push({ kind: "pursuit", set: { ...pursuit, commitment } });
    }
    if (effects.length === 0)
        return [];
    if (feed.length > 0)
        effects.push({ kind: "feed", items: feed });
    const packet = {
        source: "simulate",
        actor: "world",
        turn,
        narration: {
            summary: lapsed > 0
                ? `${lapsed} standing ${lapsed === 1 ? "campaign" : "campaigns"} between capitals lapses for want of attention.`
                : "Pressure held over from earlier weeks loses some of its force.",
        },
        effects,
    };
    return [packet];
};
