import { selectMarkOnset } from "./causality.js";
import { COHORT_MOTIVATION } from "./demos.js";
// What a standing stance is besides a setting.
//
// Six domains, one position held in each, changed by picking another one: the
// shape of the surface was the shape of a preferences panel, and it read as one
// because nothing about a change was political. Nobody objected, nothing had to
// draw on an authority, and the money arrived on the next tick.
//
// Nothing here is authored per stance, which is the point. A program's opponent
// is read off the country the game already models — the cohort whose own
// beliefs sit furthest from the direction the program pushes — so a stance
// cannot be written without one and cannot have one invented for it. Its
// authority is a fact about the domain rather than about the position: what a
// president may do about tariffs and what a president may do about tax are
// different constitutional questions, and the same one whichever program is
// picked.
//
// Imports from policy.ts are type-only, deliberately. policy.ts reads this
// module every week and a runtime edge back the other way would be a cycle
// between the program and its own teeth.
// --- Standing a program up -------------------------------------------------
//
// A stance used to pay its first dividend on the tick after it was signed,
// which is the shape that made the surface read as a settings panel: the
// President moved a dial and the money arrived. Nothing a government adopts
// works that way. Somebody has to write the rule, hire against it and get it
// out to the field, and the weeks between the signature and the first effect
// are the weeks the opposition to it organizes in.
//
// The clock is read off the record rather than kept as a second field on the
// campaign. The weekly packet marks the program it is carrying, and the first
// week that mark appears is the week the program went to work — so a save
// written before this existed reloads with an honest "not recorded" rather
// than a fabricated start date, and no save migration is owed. The one thing
// it cannot tell apart is a program returned to after being dropped, which
// reads as still standing: a department that ran this program last year does
// not have to build it twice, so that is the right answer rather than a limit.
/**
 * How long a newly adopted program takes to reach the country.
 *
 * A month. Long enough that the signature and the first effect are separate
 * events a player can tell apart — which is the whole point — and short enough
 * that a four-year term is not mostly spent waiting. The inherited program is
 * exempt: it was already running on the morning of the oath.
 */
export const PROGRAM_STANDUP_TURNS = 4;
/** What the record calls a program that has gone to work. */
export function programMark(domain, stanceId) {
    return `program:${domain}:${stanceId}`;
}
/** The turn this program first appeared in the record, or nothing where it has not. */
export function programStandingSince(campaign, domain, stanceId) {
    return selectMarkOnset(campaign.ledger, programMark(domain, stanceId))?.turn;
}
/**
 * Weeks left before a newly adopted program delivers anything. Zero once it
 * does.
 *
 * Counted from the first week the program was at work, which is the week after
 * the signature: the mark is written by the phase that runs at the end of the
 * week it was signed in, so the recorded week is already the first week of
 * work. Inclusive of that week, so a program signed in week 10 is at work from
 * 11 and paying from 15 — a month between the signature and the first effect,
 * which is what the wait is for.
 */
export function programStandUpRemaining(campaign, domain, stance) {
    if (stance.inherited)
        return 0;
    const since = programStandingSince(campaign, domain, stance.id);
    if (since === undefined)
        return PROGRAM_STANDUP_TURNS;
    return Math.max(0, PROGRAM_STANDUP_TURNS - (campaign.turn - since + 1));
}
/** Whether a program has been standing long enough to be worth anything yet. */
export function programBites(campaign, domain, stance) {
    return programStandUpRemaining(campaign, domain, stance) === 0;
}
// --- Who it is against -----------------------------------------------------
/**
 * How hard a program pushes against what one group holds.
 *
 * A stance may leave an axis out, meaning it does not push there; a cohort
 * always holds all three. An absent axis contributes nothing rather than
 * counting as a centrist position, which would let a stance that pushes hard
 * on one axis read as moderate because it says nothing about the other two.
 */
function pushAgainst(stance, beliefs) {
    const axes = [
        "economicLeftRight",
        "authLibertarian",
        "nationalistGlobalist",
    ];
    return axes.reduce((total, axis) => {
        const push = stance.alignment[axis];
        return push === undefined ? total : total - push * beliefs[axis];
    }, 0);
}
/**
 * The constituency a program is worst for.
 *
 * Nothing here is a judgment about the program: it is the arithmetic of the
 * direction the stance declares against the beliefs sixteen cohorts already
 * hold. A stance that pushes nowhere has nobody to be against, which is the
 * honest reading of the inherited program — continuity is what everyone is
 * already living with — and a failure for anything else, which is what the
 * gate in policy-teeth.test.ts refuses.
 */
export function stanceOpposition(stance) {
    const worst = Object.keys(COHORT_MOTIVATION)
        .map((cohort) => ({ cohort, strength: pushAgainst(stance, COHORT_MOTIVATION[cohort].beliefs) }))
        .filter((entry) => entry.strength > 0)
        .sort((a, b) => b.strength - a.strength || a.cohort.localeCompare(b.cohort))[0];
    if (!worst)
        return undefined;
    return {
        cohort: worst.cohort,
        name: COHORT_MOTIVATION[worst.cohort].name,
        strength: Math.round(worst.strength * 1000) / 1000,
    };
}
// --- What it rests on ------------------------------------------------------
/**
 * What a president may actually do about this domain.
 *
 * Written per domain rather than per stance because it is a fact about the
 * power, not about the position: what the office may do about tariffs and what
 * it may do about tax are different constitutional questions whichever program
 * is picked. In a US register, because this is a game about the American
 * presidency and a neutral phrasing here would say nothing.
 */
const DOMAIN_AUTHORITY = {
    fiscal: "the revenue power, which is Congress's and not the President's",
    industry: "delegated rulemaking, which the departments have to publish and defend",
    trade: "the tariff schedule, the one revenue power Congress has delegated to the President",
    civil: "enforcement discretion, which the courts may take back",
    security: "the standing intelligence authorities, reported to the oversight committees",
    defense: "the annual authorization, which the President proposes and Congress funds",
};
export function domainAuthority(domain) {
    return DOMAIN_AUTHORITY[domain];
}
