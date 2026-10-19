import { plankById } from "@admin/world";
import { TERM_YEARS, addDays, compareDates, formatGameDate, milestonesBetween } from "./clock.js";
import { OMISSION_DECAY, STRAIN_DECAY } from "./demos.js";
import { markedFlags } from "./marked-flags.js";
import { heldOutcome } from "./pledge-outcomes.js";
import { deliverableInForce, deliverableName, plankDeliverable, plankFitsFirstHundredDays, programWords, } from "./platform-deliverables.js";
import { courtedStrains } from "./route-cohorts.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
/** More than this and the platform is a list the country cannot remember, not a program. */
export const PLATFORM_MAX_PLANKS = 5;
/** More than this and a first hundred days has no priority at all. */
export const FIRST_HUNDRED_DAYS_MAX = 3;
export const FIRST_HUNDRED_DAYS = 100;
// Every campaign is sealed on its first turn, so that is the turn the plank
// flags are dated to.
const SEAL_TURN = 1;
/**
 * What settling a pledge is worth, to the cohorts it courted (strain, before
 * each cohort's attention) and to the country's read of the President's word
 * (integrity).
 *
 * A broken promise weighs twice what a kept one earns, because a kept promise
 * is what a voter expected and a broken one is news. A first-hundred-days
 * pledge is a promise the President chose to put in the window, so both sides
 * of it are much larger: that is the whole trade of promoting one. Polarization
 * damps and compresses every judgment move, so the stake is sized by what it
 * costs on screen: a broken one takes nearly a point of approval the week it
 * breaks and about a point at its deepest over the next quarter (four seeds).
 * At a third of these stakes it cost a quarter of a point, which nobody felt.
 * The strain is at its cap: a cohort's strain weight never exceeds its attention.
 */
export const PLEDGE_STAKES = {
    term: { kept: { strain: 0.15, integrity: 0.01 }, broken: { strain: 0.3, integrity: -0.02 } },
    firstHundredDays: { kept: { strain: 0.5, integrity: 0.06 }, broken: { strain: 1, integrity: -0.12 } },
};
/** The flag a sealed platform raises for each plank it runs on. */
export function plankFlag(plank) {
    return `plank:${plank}`;
}
/** Stable across a save and unique within a ledger, because a platform names each plank once. */
export function pledgeId(plank) {
    return `pledge:${plank}`;
}
/**
 * When a pledge falls due: a hundred days after the oath for a first-hundred-
 * days pledge, and otherwise the first midterm election after it, which is the
 * day the country gets to say whether it was kept.
 */
export function pledgeDueDate(oathDate, firstHundredDays) {
    if (firstHundredDays)
        return addDays(oathDate, FIRST_HUNDRED_DAYS);
    const termEnd = { ...oathDate, year: oathDate.year + TERM_YEARS };
    const midterm = milestonesBetween(oathDate, termEnd).find((milestone) => milestone.kind === "midterm-election");
    if (!midterm)
        throw new Error(`no midterm election falls inside the term that opens ${formatGameDate(oathDate)}`);
    return midterm.date;
}
function plankRejections(platform) {
    const rejections = [];
    if (platform.length > PLATFORM_MAX_PLANKS) {
        rejections.push({ subject: "platform", explanation: "A platform runs on five planks at most. A longer list is not a program anyone remembers." });
    }
    const seen = new Set();
    const byDomain = new Map();
    for (const id of platform) {
        const plank = plankById.get(id);
        const deliverable = plankDeliverable(id);
        if (!plank || !deliverable) {
            rejections.push({ subject: id, explanation: "Nobody drafted a plank by that name, so it can't be run on." });
            continue;
        }
        if (seen.has(id)) {
            rejections.push({ subject: id, explanation: `${plank.title} is on the platform twice. A promise made twice is still one promise.` });
            continue;
        }
        seen.add(id);
        if (deliverable.kind === "sign-order")
            continue;
        const rival = byDomain.get(deliverable.domain);
        if (rival) {
            rejections.push({
                subject: id,
                explanation: `${rival.title} and ${plank.title} both set ${programWords(deliverable.domain)}, and an administration runs one at a time.`,
            });
        }
        else {
            byDomain.set(deliverable.domain, plank);
        }
    }
    return rejections;
}
function priorityRejections(platform, firstHundredDays) {
    const priorities = [...new Set(firstHundredDays.map((id) => id))];
    const onPlatform = new Set(platform.map((id) => id));
    const rejections = [];
    if (priorities.length > FIRST_HUNDRED_DAYS_MAX) {
        rejections.push({ subject: "first-hundred-days", explanation: "A first hundred days with more than three priorities has none. Promise three at most." });
    }
    for (const id of priorities) {
        const title = plankById.get(id)?.title ?? "That plank";
        if (!onPlatform.has(id)) {
            rejections.push({ subject: id, explanation: `${title} isn't on the platform, so it can't be a first-hundred-days priority.` });
        }
        else if (!plankFitsFirstHundredDays(id)) {
            rejections.push({ subject: id, explanation: `${title} is in force from the first day, so it is promised for the term rather than the first hundred days.` });
        }
    }
    return rejections;
}
/**
 * Everything the seal would refuse about a platform and its first-hundred-days
 * priorities: an unknown or repeated plank, two planks that set the same
 * program, too many of either, and a priority that is not on the platform or
 * would be kept by doing nothing.
 */
export function platformRejections(platform, firstHundredDays = []) {
    return [...plankRejections(platform), ...priorityRejections(platform, firstHundredDays)];
}
function requireDeliverable(plank) {
    const deliverable = plankDeliverable(plank);
    if (!deliverable)
        throw new Error(`plank "${plank}" has no deliverable, so a pledge on it can never be settled`);
    return deliverable;
}
function requirePlank(plank) {
    const found = plankById.get(plank);
    if (!found)
        throw new Error(`plank "${plank}" is not in the platform catalog`);
    return found;
}
/**
 * What a chosen platform commits the administration to on the day of the
 * oath. `sealFounding` spreads each part over what it would otherwise write,
 * so an empty seal leaves the founding exactly as it was.
 *
 * One pledge per plank, in the order the planks were chosen. An economic plank
 * also opens the term on its program, which is what makes the platform the
 * administration's opening program rather than a list beside it; the program
 * still has to be stood up like any other, so it reaches the country a month
 * in. Each plank raises a dated `plank:` flag content can gate on.
 */
export function sealPlatform(platform, oathDate, firstHundredDays = []) {
    const rejections = platformRejections(platform, firstHundredDays);
    if (rejections.length > 0) {
        throw new Error(`the platform cannot be sealed: ${rejections.map((rejection) => rejection.explanation).join(" ")}`);
    }
    const promoted = new Set(firstHundredDays.map((id) => id));
    const pledges = platform.map((plank) => {
        const early = promoted.has(plank);
        return { id: pledgeId(plank), plank, madeDate: oathDate, dueDate: pledgeDueDate(oathDate, early), firstHundredDays: early, status: "open" };
    });
    const policies = Object.fromEntries(platform.flatMap((plank) => {
        const deliverable = requireDeliverable(plank);
        return deliverable.kind === "hold-program" ? [[deliverable.domain, deliverable.stance]] : [];
    }));
    const flags = Object.fromEntries(markedFlags(platform.map(plankFlag), SEAL_TURN).map((flag) => [flag, true]));
    return { pledges, policies, flags };
}
function stakeOf(deliverable, act) {
    if (act.kind === "order")
        return deliverable.kind === "sign-order" && deliverable.order === act.order ? "keeps" : undefined;
    if (deliverable.kind === "sign-order" || deliverable.domain !== act.domain)
        return undefined;
    if (deliverable.kind === "adopt-program")
        return deliverable.stance === act.stance ? "keeps" : undefined;
    return deliverable.stance === act.stance ? undefined : "breaks";
}
/**
 * The open pledges an act would keep or break, so a screen can name the
 * promise before the President commits rather than after the Record stamps
 * it. Adopting the pledged program or signing the pledged order keeps one;
 * replacing a program the platform promised to hold breaks one.
 */
export function pledgesAtStake(campaign, act) {
    return (campaign.pledges ?? [])
        .filter((pledge) => pledge.status === "open")
        .flatMap((pledge) => {
        const effect = stakeOf(requireDeliverable(pledge.plank), act);
        return effect ? [{ pledge, plank: requirePlank(pledge.plank), effect }] : [];
    });
}
/** "Breaks your first-hundred-days pledge to secure the border, due April 30, 2029." */
export function pledgeAtStakeLine(stake) {
    const verb = stake.effect === "keeps" ? "Keeps" : "Breaks";
    const promise = stake.pledge.firstHundredDays ? "first-hundred-days pledge" : "pledge";
    return `${verb} your ${promise} to ${lowerFirst(stake.plank.title)}, due ${formatGameDate(stake.pledge.dueDate)}.`;
}
export function applyPledge(state, effect) {
    const ledger = state.pledges ?? [];
    const known = ledger.some((pledge) => pledge.id === effect.set.id);
    const pledges = known ? ledger.map((pledge) => (pledge.id === effect.set.id ? effect.set : pledge)) : [...ledger, effect.set];
    return { ...state, pledges };
}
const STILL_OPEN = { status: "open" };
/**
 * Whether an open pledge settles this week.
 *
 * A pledge falls due in the week its due date lands in, so it is settled before
 * that week closes rather than the week after. A promise to put something in
 * place is kept the week it is in place; a promise to keep a program is broken
 * the week the program goes, and on the due date it is kept only if the program
 * delivered what the plank said it was for. The platform stood the program up
 * at the oath, so standing on the due date is not a result by itself.
 */
export function pledgeVerdict(campaign, pledge) {
    const deliverable = requireDeliverable(pledge.plank);
    const inForce = deliverableInForce(campaign, deliverable, pledge.madeDate);
    const due = compareDates(pledge.dueDate, addDays(campaign.calendar, DAYS_PER_TURN)) < 0;
    if (deliverable.kind === "hold-program") {
        if (!inForce)
            return { status: "broken", settledDate: campaign.calendar, byDeadline: false };
        if (!due)
            return STILL_OPEN;
        const delivered = heldOutcome(deliverable.stance)?.met(campaign) ?? true;
        return { status: delivered ? "kept" : "broken", settledDate: pledge.dueDate, byDeadline: true };
    }
    if (inForce)
        return { status: "kept", settledDate: campaign.calendar, byDeadline: false };
    return due ? { status: "broken", settledDate: pledge.dueDate, byDeadline: true } : STILL_OPEN;
}
function lowerFirst(text) {
    return text.length > 0 ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}
function whatHappened(deliverable, verdict, dueDate) {
    const name = deliverableName(deliverable);
    if (deliverable.kind === "sign-order") {
        return verdict.status === "kept" ? `${name} is signed` : `${formatGameDate(dueDate)} passed and ${name} was never signed`;
    }
    const program = programWords(deliverable.domain);
    if (deliverable.kind === "hold-program") {
        const outcome = heldOutcome(deliverable.stance);
        if (verdict.status === "kept") {
            return outcome ? `${name} is still ${program}, and ${outcome.keptWhen}` : `${name} is still ${program} on ${formatGameDate(dueDate)}`;
        }
        if (!verdict.byDeadline)
            return `${name} is no longer ${program}`;
        return `${formatGameDate(dueDate)} passed and ${outcome?.missed ?? `${name} had delivered nothing`}`;
    }
    return verdict.status === "kept" ? `${name} is now ${program}` : `${formatGameDate(dueDate)} passed and ${name} was never put in place`;
}
function settlementLine(pledge, plank, deliverable, verdict) {
    const promise = pledge.firstHundredDays ? "The first-hundred-days pledge" : "The pledge";
    return `${promise} to ${lowerFirst(plank.title)} is ${verdict.status}: ${whatHappened(deliverable, verdict, pledge.dueDate)}.`;
}
function strainReason(plank, verdict) {
    const outcome = verdict.status === "kept" ? "and you did" : verdict.byDeadline ? "and the deadline passed" : "and then dropped it";
    return `You promised to ${lowerFirst(plank.title)}, ${outcome}.`;
}
// A missed deadline is an omission, which a cohort holds against the
// administration longer than a reversal it watched happen.
function strainDecay(verdict) {
    if (verdict.status === "kept")
        return STRAIN_DECAY[1];
    return verdict.byDeadline ? OMISSION_DECAY : STRAIN_DECAY[-1];
}
function settledPacket(state, pledge, verdict) {
    const plank = requirePlank(pledge.plank);
    const deliverable = requireDeliverable(pledge.plank);
    const turn = state.turn + 1;
    const stakes = PLEDGE_STAKES[pledge.firstHundredDays ? "firstHundredDays" : "term"][verdict.status];
    const flag = `${plankFlag(pledge.plank)}:${verdict.status}`;
    const reason = strainReason(plank, verdict);
    const memory = {
        createdTurn: turn,
        cause: `plank-${verdict.status}:${pledge.plank}`,
        weight: stakes.strain,
        valence: verdict.status === "kept" ? 1 : -1,
        decayRate: strainDecay(verdict),
        reason,
    };
    return {
        source: "simulate",
        actor: "player",
        turn,
        provenance: { origin: verdict.byDeadline ? "scheduled" : "decision", systems: ["platform"], marks: [flag] },
        narration: { summary: settlementLine(pledge, plank, deliverable, verdict) },
        effects: [
            { kind: "pledge", set: { ...pledge, status: verdict.status, settledDate: verdict.settledDate } },
            ...courtedStrains(plank.courts, memory),
            { kind: "opinion", deltas: { integrity: stakes.integrity } },
            { kind: "flag", set: markedFlags([flag], turn) },
        ],
    };
}
/**
 * The week's reckoning with the ledger: a pledge that reaches its due date is
 * settled here, before the public's week is read, so a promise broken this
 * week is in this week's mood rather than next week's. One packet per pledge
 * settled, and nothing at all in a week that settles none.
 */
export const pledgePhase = (state) => (state.pledges ?? [])
    .filter((pledge) => pledge.status === "open")
    .flatMap((pledge) => {
    const verdict = pledgeVerdict(state, pledge);
    return verdict.status === "open" ? [] : [settledPacket(state, pledge, verdict)];
});
