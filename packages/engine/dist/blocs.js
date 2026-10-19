import { selectActiveConflicts, selectActivePursuits, selectConflicts, selectNation, selectPursuits, selectRelationship, } from "./state.js";
// What a compact is worth, and who ends up standing together because of who
// they are all afraid of.
//
// Blocs were scenery. A nation's `memberships` widened a band at founding,
// made an ally marginally likelier to join a war, and did nothing else for the
// rest of the campaign: no compact could be strained, and no compact could be
// shown to be hollow. Meanwhile a state could invade three neighbors in twenty
// turns and the countries watching it never spoke to each other about it —
// every relationship in the world moved toward or away from the aggressor and
// none of them moved toward each other, which is precisely the movement a
// coalition is made of.
//
// Two things happen here, and both are read off the board rather than stored.
//
// **Cohesion.** A compact one of whose signatories is currently coercing
// another is not a compact, and the members who are doing nothing wrong are the
// ones who learn that first. Every remaining member-to-member bond inside a
// fracturing bloc loses a little trust each week the fracture runs.
//
// **Coalition.** Nations that separately read the same state as a danger draw
// toward each other. Nobody negotiates it and nothing announces it; it is the
// arithmetic of a shared problem, which is how most of them actually form.
/** How much trust a week inside a fracturing compact costs its bystanders. */
const FRACTURE_TRUST = 0.02;
/** Below this many members a bloc has no bystanders to disillusion. */
const MIN_BLOC_FOR_FRACTURE = 3;
/**
 * How threatening a nation has to read before another one counts as afraid of
 * it. High enough that ordinary friction does not manufacture alliances, low
 * enough that a state actually behaving badly is noticed.
 */
const ALARM_THRESHOLD = 0.45;
/** How many alarmed nations it takes before they are a coalition rather than a
 * set of separately worried capitals. Exported because a surface that draws the
 * count has to draw it against this line, and a copy of the number on the player
 * side would be a second source of truth for a rule the engine owns. */
export const MIN_COALITION = 3;
/**
 * The largest share of the world one coalition can be.
 *
 * A coalition is a subset of the board that found each other. When four fifths
 * of the governments on it read the same state as a danger, nothing has
 * converged — the alarm rule has saturated, and it was reported to the player
 * as news four times in one presidency, always about the same country. Past
 * this share the line rises to whatever the most alarmed capitals are actually
 * reading, which is what a threshold that moves with world-wide alarm means in
 * practice. The capitals below it have noticed without crossing it, which is
 * the reading the board already draws for them.
 */
const COALITION_ROSTER_SHARE = 0.2;
/** What one week of a shared problem is worth between two capitals. */
const COALITION_ALIGNMENT = 0.02;
/**
 * How far a shared fear on its own can carry two capitals, ever.
 *
 * A ceiling on the reading rather than a limit on the week, so the rule cannot
 * accumulate: uncapped, it was the largest mover of the President's diplomatic
 * position in a presidency where the President did nothing, carrying edges most
 * of the way across the alignment axis on 0.02 a week. Fear of a third party
 * explains a working understanding. It does not explain an alliance, and two
 * governments that end up closer than this got there through instruments and
 * acts that are priced elsewhere.
 */
const COALITION_CEILING = 0.3;
/**
 * How long a shared fear keeps pulling its members together once they find
 * each other: the consultations, the joint statement, the working channel.
 * After that it is the same fear, and two governments that keep moving closer
 * are doing it through acts priced elsewhere. Without it a coalition that
 * stood half a year carried the President's own edges the whole way to the
 * ceiling in a term the President spent doing nothing.
 */
const COALITION_PULL_WEEKS = 6;
/**
 * How aligned with a government a capital has to be to count as its partner.
 * The coalition ceiling: two governments that stand closer than a shared fear
 * could ever carry them got there on purpose.
 */
const PARTNER_ALIGNMENT = COALITION_CEILING;
/**
 * The compacts a government still has with its fellow members: every body it
 * belongs to, less the ones it is turning on itself. A member at war with, or
 * pressing, another member has broken faith with that body, and its partners
 * there owe it nothing.
 */
function compactsKept(campaign, subject) {
    const kept = new Set();
    for (const [org, members] of blocsInPlay(campaign)) {
        if (!members.includes(subject))
            continue;
        if (fracturesIn(campaign, members).some(([actor]) => actor === subject))
            continue;
        kept.add(org);
    }
    return kept;
}
/**
 * Whether a capital stands with the government others fear: aligned with it
 * past what fear alone explains, or inside a compact with it that it has not
 * broken. A partner does not join a coalition against its partner, however
 * loud the record, so Russia does not warm to Washington over a shared fear of
 * Tehran.
 */
function standsWith(campaign, watcher, subject, compacts) {
    if ((selectRelationship(campaign, watcher, subject)?.alignment ?? 0) >= PARTNER_ALIGNMENT)
        return true;
    return (campaign.nations[watcher]?.base.memberships ?? []).some((org) => compacts.has(org));
}
/**
 * How far up the ladder a file has to have gone before the capitals watching
 * read it as menace rather than as argument.
 *
 * A démarche and a tariff schedule are how governments disagree. Sanctions, an
 * operation and force are what a coalition forms about, and counting the two
 * the same is why a Belgian tariff campaign against Belarus moved the United
 * States toward Iran.
 */
const ALARMING_RUNG = 2;
/**
 * How long a state's record keeps frightening the capitals watching it once the
 * last file closes.
 *
 * Not decoration: with alarm read only off currently-open files, a state
 * between campaigns went from menace to blank for one week, the coalition
 * dissolved and re-formed, and a headline guarded to fire once per formation
 * fired again.
 */
const RECORD_MEMORY_TURNS = 8;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/** Every bloc in play, with its members, ordered so a replay walks them the
 * same way regardless of how the nation record was built. */
export function blocsInPlay(campaign) {
    const members = new Map();
    for (const id of Object.keys(campaign.nations).sort()) {
        const runtime = campaign.nations[id];
        for (const org of runtime?.base.memberships ?? []) {
            const list = members.get(org) ?? [];
            list.push(id);
            members.set(org, list);
        }
    }
    return new Map([...members.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
/**
 * Who is currently turning on whom inside a bloc. A running war between two
 * members and a standing campaign by one against another count the same: the
 * compact is being ignored either way, and a member watching cannot tell the
 * difference between the two in terms of what it means for their own security.
 */
export function fracturesIn(campaign, members) {
    const inside = new Set(members);
    const pairs = [];
    for (const conflict of selectActiveConflicts(campaign)) {
        if (inside.has(conflict.aggressor) && inside.has(conflict.defender))
            pairs.push([conflict.aggressor, conflict.defender]);
    }
    for (const pursuit of selectActivePursuits(campaign)) {
        if (inside.has(pursuit.actor) && inside.has(pursuit.target))
            pairs.push([pursuit.actor, pursuit.target]);
    }
    return pairs;
}
/**
 * What a week of a fracturing compact does to the members who are not party to
 * it. Deliberately not aimed at the offender — the ripple system already prices
 * what a bloc partner thinks of the state that betrayed it, and doubling that
 * here would charge the same act twice. This is the other half: what the
 * bystanders now think of *each other*, which is that the paper they are all
 * holding has been demonstrated not to bind.
 */
function fractureEffects(campaign, members, parties) {
    const bystanders = members.filter((id) => !parties.has(id));
    const effects = [];
    for (const from of bystanders) {
        for (const to of bystanders) {
            if (from === to)
                continue;
            if (!selectRelationship(campaign, from, to))
                continue;
            effects.push({ kind: "relationship", from, to, deltas: { trust: -FRACTURE_TRUST } });
        }
    }
    return effects;
}
/** What one file on the ladder is worth to a capital reading the record. */
function severityOf(rungReached) {
    return clamp01((rungReached - ALARMING_RUNG) / (5 - ALARMING_RUNG));
}
/** Full weight while it runs, fading out over the weeks after it closes. A
 * file nobody can date is history rather than a record. */
function recency(campaign, running, closedTurn) {
    if (running)
        return 1;
    if (closedTurn === undefined)
        return 0;
    return Math.max(0, 1 - (campaign.turn - closedTurn) / RECORD_MEMORY_TURNS);
}
/**
 * The record a capital is reading when it decides whether to be afraid, by how
 * far up the ladder each file went rather than by how many are open.
 *
 * Counting open files made a run of tariff disputes read exactly like a run of
 * wars, and one state with a near-permanent low-rung campaign against a
 * neighbor put essentially the whole roster over the line about it. Covert work
 * is left out for the reason the field exists: a campaign nobody can see is not
 * something third parties can read, and it cannot be what they assemble over.
 */
function recordWeight(campaign, subject) {
    let weight = 0;
    for (const conflict of selectConflicts(campaign)) {
        if (conflict.aggressor !== subject)
            continue;
        // There is no rung above shooting, so a war carries the full weight.
        weight += recency(campaign, conflict.status === "active", conflict.endedTurn);
    }
    for (const pursuit of selectPursuits(campaign)) {
        if (pursuit.actor !== subject || !pursuit.overt)
            continue;
        weight += severityOf(pursuit.rungReached) * recency(campaign, pursuit.status === "active", pursuit.closedTurn);
    }
    return weight;
}
/**
 * How alarming one nation currently reads to another, folding the standing
 * relationship together with what the alarming state has actually been doing.
 * A high threat reading on its own is a border and a posture; a high reading
 * against a state that has been sanctioning and shooting is a problem.
 */
export function alarmAt(campaign, watcher, subject) {
    return alarmOver(campaign, watcher, subject, recordWeight(campaign, subject));
}
/** `alarmAt` with the subject's record already weighed, since every watcher reads the same record. */
function alarmOver(campaign, watcher, subject, record) {
    const relationship = selectRelationship(campaign, watcher, subject);
    if (!relationship)
        return 0;
    if (record === 0)
        return 0;
    // Saturating rather than linear: the fourth war does not frighten a capital
    // twice as much as the second, it confirms what the second established.
    const conduct = 1 - 1 / (1 + record);
    return clamp01(relationship.militaryThreat * 0.5 + Math.max(0, -relationship.trust) * 0.3 + conduct * 0.5);
}
/** The most capitals that can be one coalition on a board this size. */
export function coalitionCap(campaign) {
    return Math.max(MIN_COALITION, Math.round(Object.keys(campaign.nations).length * COALITION_ROSTER_SHARE));
}
/**
 * Everyone currently alarmed by one nation and not standing with it, ordered for replay stability and
 * capped at the share of the board a coalition can be. Where more capitals
 * clear the standing line than that, the ones kept are the ones reading highest
 * — the line has risen, which is the only honest thing for it to do when the
 * whole world is alarmed at once.
 */
export function alarmedBy(campaign, subject) {
    // A government with nothing on its record alarms nobody, whatever its borders.
    const record = recordWeight(campaign, subject);
    if (record === 0)
        return [];
    const compacts = compactsKept(campaign, subject);
    const over = Object.keys(campaign.nations)
        .filter((id) => id !== subject && !standsWith(campaign, id, subject, compacts))
        .map((id) => ({ id, alarm: alarmOver(campaign, id, subject, record) }))
        .filter((entry) => entry.alarm >= ALARM_THRESHOLD);
    const cap = coalitionCap(campaign);
    const kept = over.length <= cap
        ? over
        : [...over].sort((a, b) => b.alarm - a.alarm || a.id.localeCompare(b.id)).slice(0, cap);
    return kept.map((entry) => entry.id).sort((a, b) => a.localeCompare(b));
}
/** This week's step toward the ceiling, and nothing once it is reached. */
function converge(current, step) {
    return Math.max(0, Math.min(step, COALITION_CEILING - current));
}
/**
 * What a shared fear does between two capitals that have it. It draws their
 * alignment together, but cannot manufacture trust without a cooperative act.
 *
 * Toward a ceiling rather than by a fixed step each week, so what the rule can
 * be worth over a campaign is bounded by where the pair already stood and not
 * by how long the fear lasted.
 */
function coalitionEffects(campaign, alarmed) {
    const effects = [];
    for (const from of alarmed) {
        for (const to of alarmed) {
            if (from === to)
                continue;
            const edge = selectRelationship(campaign, from, to);
            if (!edge)
                continue;
            const alignment = converge(edge.alignment, COALITION_ALIGNMENT);
            if (alignment === 0)
                continue;
            effects.push({ kind: "relationship", from, to, deltas: { alignment } });
        }
    }
    return effects;
}
function name(campaign, id) {
    return selectNation(campaign, id)?.base.identity.name ?? id;
}
// A coalition forming is news the moment it is large enough to be one. It is
// reported as what it looks like from outside — capitals finding each other —
// rather than as a mechanic, because from inside the game that is all it is.
function coalitionFeedItem(campaign, subject, alarmed, turn) {
    return {
        turn,
        kind: "bloc",
        visibility: "public",
        headline: `${alarmed.length} capitals are now talking to each other about ${name(campaign, subject)}.`,
        target: subject,
    };
}
/**
 * The flag that stands while a coalition exists, so its formation is reported
 * once rather than every week it persists. Same contract conditions.ts uses for
 * `condition:<kind>:<nation>`: a derived world fact that authored content also
 * has a legitimate reason to gate on.
 */
export function coalitionFlag(subject) {
    return `coalition:${subject}`;
}
/** The week a coalition formed, dated in its own key. */
export function coalitionSinceFlag(subject, turn) {
    return `coalition-since:${subject}:${turn}`;
}
function coalitionSinceKeys(campaign, subject) {
    const prefix = coalitionSinceFlag(subject, 0).slice(0, -1);
    return Object.keys(campaign.player.flags).filter((key) => key.startsWith(prefix) && campaign.player.flags[key]);
}
/** Whether a standing coalition is still in the weeks a shared fear pulls its members together. */
function stillPulling(campaign, subject, turn) {
    const formed = coalitionSinceKeys(campaign, subject).map((key) => Number(key.slice(key.lastIndexOf(":") + 1)));
    return formed.length > 0 && turn - Math.max(...formed) < COALITION_PULL_WEEKS;
}
/** Every compact being ignored by one of its own signatories this week. */
function fracturesThisWeek(state) {
    const orgs = [];
    const effects = [];
    for (const [org, members] of blocsInPlay(state)) {
        if (members.length < MIN_BLOC_FOR_FRACTURE)
            continue;
        const pairs = fracturesIn(state, members);
        if (pairs.length === 0)
            continue;
        orgs.push(org);
        effects.push(...fractureEffects(state, members, new Set(pairs.flat())));
    }
    return { orgs, effects };
}
/** Every coalition standing this week: who is converging, and which formations
 * are news. Harder to form than to keep standing, deliberately — a coalition
 * ends when the thing it was about stops happening, not the week it thins. One
 * that had seven capitals and now has two has lost members, and striking it off
 * on that week meant it was re-announced as a new formation a month later,
 * which is how a headline guarded to fire once fired four times in one
 * presidency about the same country. */
function coalitionsThisWeek(state, turn) {
    const subjects = [];
    const effects = [];
    const feed = [];
    const raise = [];
    const lower = [];
    for (const id of Object.keys(state.nations).sort((a, b) => a.localeCompare(b))) {
        const alarmed = alarmedBy(state, id);
        const stood = state.player.flags[coalitionFlag(id)] === true;
        if (stood ? alarmed.length === 0 : alarmed.length < MIN_COALITION) {
            if (stood)
                lower.push(coalitionFlag(id), ...coalitionSinceKeys(state, id));
            continue;
        }
        subjects.push(id);
        if (!stood || stillPulling(state, id, turn))
            effects.push(...coalitionEffects(state, alarmed));
        // Reported on the turn it crosses the bar and not for the forty turns it
        // then persists: a coalition that re-announces itself weekly is a ticker.
        if (!stood) {
            raise.push(coalitionFlag(id), coalitionSinceFlag(id, turn));
            feed.push(coalitionFeedItem(state, id, alarmed, turn));
        }
    }
    if (raise.length > 0 || lower.length > 0) {
        effects.push({ kind: "flag", ...(raise.length > 0 ? { set: raise } : {}), ...(lower.length > 0 ? { clear: lower } : {}) });
    }
    return { subjects, effects, feed };
}
/**
 * The week's work on every compact and every coalition, as one packet.
 *
 * Both halves are recomputed from the live board rather than stored, for the
 * same reason removal pressure is: a fracture is not an event that happened
 * once, it is a description of what the board currently looks like, and a
 * stored version of it would keep charging for a war that had ended.
 */
export const blocPhase = (state) => {
    const turn = state.turn + 1;
    const fractures = fracturesThisWeek(state);
    const coalitions = coalitionsThisWeek(state, turn);
    const effects = [...fractures.effects, ...coalitions.effects];
    if (effects.length === 0)
        return [];
    if (coalitions.feed.length > 0)
        effects.push({ kind: "feed", items: coalitions.feed });
    return [
        {
            source: "simulate",
            actor: "world",
            turn,
            narration: { summary: summarize(state, fractures.orgs, coalitions.subjects) },
            effects,
        },
    ];
};
function summarize(campaign, fracturing, coalitions) {
    const parts = [];
    if (fracturing.length === 0 && coalitions.length === 0) {
        // Reached when the only thing this week did was drop a coalition that no
        // longer has anything to be about. That is still a change worth a line.
        return "A shared alarm that had brought several capitals together quietly stops being one.";
    }
    if (fracturing.length > 0) {
        parts.push(`${fracturing.length} ${fracturing.length === 1 ? "compact is" : "compacts are"} worth less this week than last, to everyone still in ${fracturing.length === 1 ? "it" : "them"}`);
    }
    if (coalitions.length > 0) {
        const named = coalitions.map((id) => name(campaign, id));
        const list = named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} and ${named.at(-1)}`;
        parts.push(`capitals that had not been speaking find they agree about ${list}`);
    }
    return `${parts.join("; ")}.`;
}
