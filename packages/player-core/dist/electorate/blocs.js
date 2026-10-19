import { DISPLAY_BLOCS, ZERO_ISSUE, blocApprovals, displayRollup, opinionCourse, rawApproval, salientWeights, selectBlocTurnout, selectElectorate, selectOpinionCauses, heaviestCause, OPINION_CAUSE_LABELS, OPINION_DRIVERS, OPINION_WEIGHTS, valenceOf, valenceSlope, BLOC_HABIT, BLOCS, } from "@admin/engine";
import { readingBand } from "../reading";
// The country as the three readings a player is shown. The engine keeps five
// blocs (identifiers and leaners of each party, and the independents who lean
// neither way); the display rolls the leaners into their party. Every figure is
// the engine's own reading, rolled up by `displayRollup`; the only arithmetic
// here is a counterfactual of that same formula and a difference between two
// readings the engine already filed.
const PARTY_PLURAL = { democrat: "Democrats", republican: "Republicans" };
const OTHER_PARTY = { democrat: "republican", republican: "democrat" };
const rollupOf = (reading, change = {}) => displayRollup(reading.shares, blocApprovals({ ...reading, ...change }));
function nameOf(id, campaign) {
    const anchor = campaign.congress.caucusAnchor;
    if (id === "independent")
        return "Independents";
    return `${PARTY_PLURAL[id === "own" ? anchor : OTHER_PARTY[anchor]]} and those who lean their way`;
}
function valenceAt(campaign, sample) {
    const mood = { ...campaign.player.opinion, ...sample.judgments, polarization: sample.polarization };
    return valenceOf(rawApproval(mood, salientWeights(campaign)), campaign.turn);
}
/**
 * The last closed week's move per bloc, split into what the six judgments did
 * and everything else. The split reads both weeks' judgments at this week's
 * weights and division, so it is exactly the record's part of the move; the
 * rest is scandal erosion, the force record, the fade of a new term's goodwill
 * and rounding, which the campaign does not keep week by week and cannot be
 * told apart without inventing figures.
 */
/**
 * The record's line, naming what led it: the judgment that moved most this
 * week at its weight, and the heaviest cause behind that judgment now, so the
 * record's part of a move is never a level standing without its reason.
 */
function recordLabel(campaign, last, before) {
    const moved = [...OPINION_DRIVERS].sort((a, b) => Math.abs(OPINION_WEIGHTS[b] * (last.judgments[b] - before.judgments[b])) - Math.abs(OPINION_WEIGHTS[a] * (last.judgments[a] - before.judgments[a])))[0];
    const reading = selectOpinionCauses(campaign).find((entry) => entry.driver === moved);
    const cause = reading ? heaviestCause(reading) : undefined;
    return cause ? `How people rate your work, mostly because of ${OPINION_CAUSE_LABELS[cause.key].toLowerCase()}` : "How people rate your work";
}
function weekMoves(campaign, reading) {
    const course = opinionCourse(campaign);
    const last = course[course.length - 1];
    const before = course[course.length - 2];
    if (!last || !before)
        return {};
    const after = rollupOf(reading, { valence: valenceAt(campaign, last) });
    const prior = rollupOf(reading, { valence: valenceAt(campaign, before) });
    return Object.fromEntries(DISPLAY_BLOCS.flatMap((id) => {
        const now = last.blocs[id];
        const was = before.blocs[id];
        if (now === undefined || was === undefined)
            return [];
        const record = after[id].value - prior[id].value;
        const change = now - was;
        const moves = [
            { key: "record", label: recordLabel(campaign, last, before), delta: record },
            { key: "rest", label: "Scandals, use of force, and your early goodwill wearing off", delta: change - record },
        ];
        return [[id, { change, moves }]];
    }));
}
/** A war's rally in valence units. */
const rallyOf = (reading) => reading.rally;
function holdsOf(id, reading) {
    const now = rollupOf(reading)[id].value;
    const rally = now - rollupOf(reading, { valence: reading.valence - rallyOf(reading) })[id].value;
    const scandal = now - rollupOf(reading, { erosion: 0 })[id].value;
    const force = now - rollupOf(reading, { issue: ZERO_ISSUE })[id].value;
    return [
        ...(id === "own" && Math.abs(scandal) >= 0.0005 ? [{ key: "scandal", label: "Scandals are costing you support in your own party", delta: scandal }] : []),
        ...(Math.abs(rally) >= 0.0005 ? [{ key: "rally", label: "People rallying behind the war", delta: rally }] : []),
        ...(Math.abs(force) >= 0.0005 ? [{ key: "force", label: force > 0 ? "This group likes your use of force and sanctions" : "This group dislikes your use of force and sanctions", delta: force }] : []),
    ];
}
const byBloc = (read) => Object.fromEntries(BLOCS.map((bloc) => [bloc, read(bloc)]));
/** The three blocs this week, each with its share, approval, what moved it and who turns out. */
export function blocTopline(campaign) {
    const reading = selectElectorate(campaign);
    const approvals = rollupOf(reading);
    const slopes = displayRollup(reading.shares, byBloc((bloc) => valenceSlope(reading.partisanship[bloc], reading.polarization)));
    const turnout = selectBlocTurnout(campaign);
    const now = displayRollup(reading.shares, byBloc((bloc) => turnout.find((row) => row.bloc === bloc)?.turnout ?? BLOC_HABIT[bloc]));
    const habit = displayRollup(reading.shares, BLOC_HABIT);
    const moves = weekMoves(campaign, reading);
    const blocs = DISPLAY_BLOCS.map((id) => {
        const approval = approvals[id].value;
        const band = readingBand("standing", approval);
        const week = moves[id];
        return {
            id,
            name: nameOf(id, campaign),
            base: id === "own",
            share: approvals[id].share,
            approval,
            stance: band?.stance ?? "neutral",
            word: band?.word ?? "",
            contribution: approvals[id].share * approval,
            responsiveness: slopes[id].value,
            ...(week ? { week } : {}),
            holds: holdsOf(id, reading),
            turnout: { habit: habit[id].value, now: now[id].value },
        };
    });
    return { blocs, headline: reading.headline, ownIdentifiers: reading.approvals.ownId };
}
