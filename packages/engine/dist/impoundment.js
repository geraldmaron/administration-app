import { CHAMBERS, carried, majorityOf, seatedOf } from "./congress.js";
import { legislativeVoteOn } from "./congress-votes.js";
import { addDays, compareDates, fiscalYearEnd } from "./clock.js";
import { sessionDaysSince } from "./congressional-session.js";
import { sittingDate } from "./signing-window.js";
/** 2 U.S.C. 682(3), 683(b): the window Congress has to complete action on a rescission bill. */
export const RESCISSION_WINDOW_SESSION_DAYS = 45;
/** 2 U.S.C. 687: days of continuous session after the explanatory statement before the Comptroller General may sue. */
export const GAO_SUIT_WAIT_SESSION_DAYS = 25;
/**
 * 2 U.S.C. 688(b)(1): the committee may be discharged after 25 days of
 * continuous session. The one count Congress takes is placed there, the first
 * day a rescission bill can be forced to the floor.
 */
export const RESCISSION_VOTE_SESSION_DAY = 25;
/** The Comptroller General reviews "as promptly as practicable" (685(b)); this is the abstraction's pace. */
export const GAO_REPORT_SESSION_DAYS = 14;
/** Days from the Comptroller General's filing to an order in the District of Columbia; the Act sets no pace, so this is a design judgment. */
export const COURT_ORDER_DAYS = 56;
/** What the Hill thinks of a finding that the administration is withholding money unlawfully. */
export const UNLAWFUL_DEFERRAL_DISPOSITION_COST = 0.08;
/** What the Hill thinks of a rescission message that was sent so the money would expire. */
export const POCKET_RESCISSION_DISPOSITION_COST = 0.08;
/** What each further unlawful deferral of the same funds in a fiscal year adds, up to the cost of the first finding. */
export const REPEAT_UNLAWFUL_DEFERRAL_STEP = 0.02;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
export function selectImpoundments(campaign) {
    return campaign.congress.appropriation.impoundments ?? [];
}
/** The messages whose money is being held back this week. */
export function pendingImpoundments(campaign) {
    return selectImpoundments(campaign).filter((message) => message.status === "pending");
}
/** The share of an account that is held back right now, as an annual share of GDP. */
export function withheldShare(campaign, account) {
    return pendingImpoundments(campaign)
        .filter((message) => message.account === account)
        .reduce((total, message) => total + message.share, 0);
}
function closed(message, status, today) {
    return { ...message, status, closed: today };
}
/** The count on a rescission bill: both chambers at a majority, because the Act's fast track takes the Senate's filibuster away. */
export function countRescission(campaign, appeal) {
    const votes = CHAMBERS.map((chamber) => legislativeVoteOn(campaign, {
        chamber,
        appeal,
        required: majorityOf(seatedOf(campaign.congress, chamber)),
        stance: "administration",
    }));
    return { votes, carried: carried(votes) };
}
function stepRescission(campaign, message, today) {
    const elapsed = sessionDaysSince(message.transmitted, today);
    if (!message.counted && elapsed >= RESCISSION_VOTE_SESSION_DAY) {
        if (countRescission(campaign, message.appeal ?? 0).carried) {
            return { message: closed(message, "rescinded", today), notes: ["Congress passes the rescission bill, and the authority is canceled."], disposition: 0, rescinded: message.share };
        }
        return stepRescission(campaign, { ...message, counted: true }, today);
    }
    if (message.pocket && compareDates(today, fiscalYearEnd(message.fiscalYear)) >= 0) {
        return { message: closed(message, "lapsed", today), notes: ["The fiscal year ends with the money still held, and the budget authority expires."], disposition: 0 };
    }
    if (!message.pocket && elapsed >= RESCISSION_WINDOW_SESSION_DAYS) {
        return {
            message: closed(message, "released", today),
            notes: ["Congress has not completed action in 45 days of continuous session, and the Act requires the money released."],
            disposition: 0,
        };
    }
    return { message, notes: [], disposition: 0 };
}
function stepDeferral(message, today) {
    const elapsed = sessionDaysSince(message.transmitted, today);
    let current = message;
    const notes = [];
    let disposition = 0;
    // 685(b) has the Comptroller General review every message. One that ends
    // before the usual review date is reviewed on the day it ends, so a series of
    // short deferrals cannot be released ahead of the review.
    const ends = current.heldThrough !== undefined && compareDates(today, current.heldThrough) >= 0;
    if (!current.gao && (elapsed >= GAO_REPORT_SESSION_DAYS || ends)) {
        const inAccordance = current.purpose !== "policy";
        current = { ...current, gao: { reported: today, inAccordance } };
        if (!inAccordance) {
            notes.push("The Comptroller General reports that the deferral is not in accordance with existing law.");
            disposition -= UNLAWFUL_DEFERRAL_DISPOSITION_COST;
        }
    }
    if (current.gao && current.gao.inAccordance === false && !current.gao.suitFiled && sessionDaysSince(current.gao.reported, today) >= GAO_SUIT_WAIT_SESSION_DAYS) {
        current = { ...current, gao: { ...current.gao, suitFiled: today } };
        notes.push("The Comptroller General sues in the District of Columbia to have the money released.");
    }
    const suit = current.gao?.suitFiled;
    if (suit && compareDates(today, addDays(suit, COURT_ORDER_DAYS)) >= 0) {
        return { message: closed(current, "court-ordered", today), notes: [...notes, "The court orders the money released."], disposition };
    }
    if (current.heldThrough && compareDates(today, current.heldThrough) >= 0) {
        return { message: closed(current, "released", today), notes: [...notes, "The deferral period ends and the money is available again."], disposition };
    }
    return { message: current, notes, disposition };
}
/**
 * One week of every pending message: the count Congress takes, the default
 * release, the Comptroller General's report and suit, the court's order, and
 * a pocket rescission's expiry. Dated by the sitting date so a week stepped by
 * office day and a week taken whole close the same message in the same week.
 */
export function impoundmentPackets(campaign) {
    const pending = pendingImpoundments(campaign);
    if (pending.length === 0)
        return [];
    const today = sittingDate(campaign);
    const changed = pending
        .map((message) => ({ before: message, step: message.kind === "rescission" ? stepRescission(campaign, message, today) : stepDeferral(message, today) }))
        .filter(({ before, step }) => step.message !== before)
        .map(({ step }) => step);
    if (changed.length === 0)
        return [];
    const byId = new Map(changed.map((step) => [step.message.id, step.message]));
    const impoundments = selectImpoundments(campaign).map((message) => byId.get(message.id) ?? message);
    const disposition = changed.reduce((total, step) => total + step.disposition, 0);
    const congress = {
        ...campaign.congress,
        disposition: round3(clamp01(campaign.congress.disposition + disposition)),
        appropriation: { ...campaign.congress.appropriation, impoundments },
    };
    const rescinded = changed.filter((step) => step.rescinded !== undefined);
    const effects = [
        { kind: "congress", set: congress },
        ...(rescinded.length > 0 ? [{ kind: "budget", allocation: rescindedAllocation(campaign, rescinded) }] : []),
        {
            kind: "feed",
            items: changed.flatMap((step) => step.notes.map((headline) => ({ turn: campaign.turn + 1, kind: "press", visibility: "public", headline }))),
        },
    ];
    return [
        {
            source: "simulate",
            actor: "world",
            turn: campaign.turn + 1,
            background: true,
            narration: { summary: changed.flatMap((step) => step.notes).join(" ") || "A special message moves." },
            effects,
        },
    ];
}
function rescindedAllocation(campaign, rescinded) {
    const allocation = { ...campaign.player.budget };
    for (const step of rescinded) {
        allocation[step.message.account] = Math.max(0, (allocation[step.message.account] ?? 0) - (step.rescinded ?? 0));
    }
    return allocation;
}
