import { CHAMBERS, carried, floorThreshold, headOfGovernment, } from "./congress.js";
import { legislativeVoteOn } from "./congress-votes.js";
import { possessive } from "./naming.js";
import { sentenceList } from "./policy.js";
import { BUDGET_ACCOUNT_SPECS, selectBudget } from "./budget.js";
import { addDays, compareDates, fiscalYearEnd, fiscalYearOf, selectBudgetYear, selectFiscalYearEndTurn, turnOnDate } from "./clock.js";
import { sessionDayDate } from "./congressional-session.js";
import { sittingDate } from "./signing-window.js";
import { countRescission, pendingImpoundments, POCKET_RESCISSION_DISPOSITION_COST, REPEAT_UNLAWFUL_DEFERRAL_STEP, UNLAWFUL_DEFERRAL_DISPOSITION_COST, RESCISSION_WINDOW_SESSION_DAYS, selectImpoundments, withheldShare, } from "./impoundment.js";
import { enactBudget, projectBudgetDraft, } from "./budget-draft.js";
// The money, and the fact that Congress votes it line by line.
//
// Split out of congress.ts, which sits at the recorded size ceiling, and split
// along the seam legislative-acts.ts was split along: congress.ts owns the
// chambers, the arithmetic of a floor count and the three constitutional
// questions a president puts to them, and this file owns the one measure whose
// substance is a book of accounts rather than a yes or no.
//
// The dependency runs one way. This file reads congress.ts for the count and
// budget-draft.ts for the allocation; neither reads it back, so the appropriation
// stays composed out of the one vote-counter and the one budget-writer rather
// than growing a second of either.
/**
 * The appropriation a new administration inherits on the day of the oath:
 * the book its predecessor's Congress passed for the fiscal year already
 * running, which lapses on that year's September 30. An oath in January
 * therefore inherits eight months of money, and the first budget it owes is
 * the next year's, due before October.
 */
export function openingAppropriation(foundingDate, turn) {
    const lapses = fiscalYearEnd(fiscalYearOf(foundingDate));
    return {
        enactedTurn: turn,
        // The same date-to-turn rule `selectFiscalYearEndTurn` uses for every later
        // book, counted from the turn the oath is taken on.
        throughTurn: turn - 1 + turnOnDate(foundingDate, lapses),
        onPriorYear: false,
        priorYear: [],
    };
}
/**
 * How the floor is disposed toward each account before anybody asks for a
 * raise.
 *
 * Congress does not vote one number on a budget; it votes a book, and the
 * chambers are not equally fond of every line in it. Defense and the domestic
 * program are the two lines with a constituency in every district, and the
 * sovereign fund is money the appropriators cannot point at anything with — it
 * is the hardest line in the book to defend at home, which is exactly why a
 * president who wants reserves has to spend standing on them.
 */
const ACCOUNT_APPEAL = {
    military: 0.06,
    domestic: 0.04,
    diplomatic: -0.03,
    covert: -0.02,
    economic: -0.05,
};
/**
 * What asking for a raise costs on the floor, per point of GDP share added.
 *
 * Only a raise. Congress does not have to be talked into spending less on
 * something, and pricing a cut the same way would have made every economy a
 * president proposed harder to pass than the spending it replaced.
 */
const RAISE_RESISTANCE = 6;
function accountAppeal(campaign, account, requested) {
    const standing = selectBudget(campaign)[account];
    return ACCOUNT_APPEAL[account] - RAISE_RESISTANCE * Math.max(0, requested - standing);
}
/**
 * The whip count on a budget, line by line.
 *
 * Appropriations originate in the House and are the one vote where the
 * administration's own program is on the floor rather than a question about the
 * world, so there is no threat to rally anyone — it is disposition and what the
 * Hill makes of each line, which is why a president who has spent their
 * standing governs on last year's numbers.
 *
 * A regular appropriation is ordinary legislation. The House needs a majority.
 * The Senate needs sixty. Revenue, tax and the debt limit stay on reconciliation.
 *
 * Only the accounts a request actually *changes* are voted. An account nobody
 * proposed to move is already law, and putting it back on the floor every year
 * would let the Hill strike out a line the President never touched.
 */
export function projectAppropriation(campaign, candidate) {
    const count = (appeal) => CHAMBERS.map((chamber) => legislativeVoteOn(campaign, {
        chamber,
        appeal,
        required: floorThreshold(campaign.congress, chamber, "ordinary"),
        // Nobody's bill: the appropriators of both caucuses mark the money up,
        // and the sponsor term is the whipping a side does for a measure it
        // wrote alone. What is the administration's here is the program inside
        // the lines, which is what `accountAppeal` prices.
        stance: "neutral",
    }));
    const votes = count(0);
    const accounts = (candidate?.changed ?? []).map((account) => {
        const perAccount = count(accountAppeal(campaign, account, candidate.allocation[account]));
        return { account, votes: perAccount, carried: carried(perAccount) };
    });
    const refused = accounts.filter((entry) => !entry.carried).map((entry) => entry.account);
    return {
        votes,
        accounts,
        wouldPass: accounts.length > 0 ? refused.length === 0 : carried(votes),
        wouldEnact: accounts.length > 0 ? accounts.some((entry) => entry.carried) : carried(votes),
        refused,
        reasoning: refused.length > 0
            ? `The book carries, but ${sentenceList(refused.map((account) => BUDGET_ACCOUNT_SPECS[account].name.toLowerCase()))} would be struck out and left at last year's rates.`
            : "A budget is the one vote with nothing in it but what the Hill thinks of this administration.",
    };
}
/**
 * Take a drafted appropriation to the Hill.
 *
 * The allocation itself is still written by `enactBudget` in budget.ts, which
 * stays the one place a budget is set; this is the vote in front of it, and it
 * composes that packet rather than building a second one.
 *
 * Three outcomes, and they are genuinely different facts:
 *
 *   - Every line carries. A new book is enacted and the clock resets.
 *   - Some lines carry. A book still passed, so the government is funded and
 *     `throughTurn` still moves — a struck-out line is not a funding lapse. The
 *     accounts the floor refused are simply left at the rate they were already
 *     running at, and named in `appropriation.priorYear` so every surface can
 *     say which ones.
 *   - Nothing carries. There is no new book at all: `onPriorYear` goes true and
 *     `throughTurn` does not move, which is what leaves the shutdown clock
 *     running. A refused president is left governing on the appropriation they
 *     already had — the honest outcome, not a government that stops.
 *
 * The whole-book facts and the per-account ones therefore never contradict:
 * `throughTurn` and `onPriorYear` are about the book, `priorYear` is about the
 * lines inside a book that did pass, and it is empty whenever `onPriorYear` is
 * true because there is no book for a line to be missing from.
 */
export function requestAppropriation(campaign, candidate) {
    const projection = projectAppropriation(campaign, candidate);
    if (!projection.wouldEnact) {
        return {
            ok: true,
            packet: {
                source: "action",
                actor: "player",
                turn: campaign.turn,
                narration: {
                    summary: `Congress does not pass ${possessive(headOfGovernment(campaign))} budget, and the government continues on the prior year's appropriation.`,
                },
                effects: [
                    {
                        kind: "congress",
                        set: {
                            ...campaign.congress,
                            appropriation: { ...campaign.congress.appropriation, onPriorYear: true, priorYear: [] },
                        },
                    },
                ],
            },
        };
    }
    // A book pays for a fiscal year, not for a year from whenever it passed: a
    // budget enacted in March 2029 is FY2030's, and funds the government through
    // September 30, 2030 rather than through the next March.
    const congress = {
        ...campaign.congress,
        appropriation: {
            enactedTurn: campaign.turn,
            throughTurn: Math.max(campaign.congress.appropriation.throughTurn, selectFiscalYearEndTurn(campaign, selectBudgetYear(campaign))),
            onPriorYear: false,
            priorYear: projection.refused,
        },
    };
    const enacted = enactBudget(campaign, carriedOnly(campaign, candidate, projection));
    if (!enacted.ok)
        return enacted;
    return {
        ok: true,
        packet: {
            ...enacted.packet,
            narration: {
                ...enacted.packet.narration,
                summary: projection.refused.length > 0
                    ? `${enacted.packet.narration.summary} ${projection.reasoning}`
                    : enacted.packet.narration.summary,
            },
            effects: [...enacted.packet.effects, { kind: "congress", set: congress }],
        },
    };
}
/**
 * The request with the struck-out lines taken back out of it, re-projected
 * through `projectBudgetDraft` rather than assembled by hand — a refused
 * account has to come out of the outlook and the changed list as well as the
 * allocation, and the draft path is the one place that arithmetic lives.
 */
function carriedOnly(campaign, candidate, projection) {
    if (projection.refused.length === 0)
        return candidate;
    const draft = Object.fromEntries(projection.accounts
        .filter((entry) => entry.carried)
        .map((entry) => [entry.account, candidate.allocation[entry.account]]));
    const restricted = projectBudgetDraft(campaign, draft);
    // Cannot fail: every share in it was already accepted by the draft that
    // produced `candidate`, under the same caps and on the same turn.
    return restricted.ok ? restricted.candidate : candidate;
}
// --- Withholding what the book appropriated -----------------------------------
//
// A book is a ceiling the President may not quietly spend under. The two lawful
// ways to spend less are a rescission and a deferral, both by special message
// under the Impoundment Control Act; `impoundment.ts` runs them week by week.
/** What a cut costs on the floor per share of the account asked back; the standing appeal of the account is read the other way. */
const RESCISSION_RESISTANCE = 0.5;
/** Asking Congress to cancel money is a political act whatever the vote: a base cost and one that grows with how much is asked. */
const RESCISSION_BASE_COST = 0.02;
const RESCISSION_PORTION_COST = 0.05;
const SHARE_EPSILON = 0.0005;
function availableShare(campaign, account) {
    return Math.max(0, selectBudget(campaign)[account] - withheldShare(campaign, account));
}
function withholdingRefusal(campaign, request) {
    if (!(request.portion > 0 && request.portion <= 1))
        return "Ask for a fraction of the account: more than none and no more than all of it.";
    const spec = BUDGET_ACCOUNT_SPECS[request.account];
    if (availableShare(campaign, request.account) * request.portion < SHARE_EPSILON)
        return `The ${spec.name.toLowerCase()} line has nothing appropriated that is not already held.`;
    if (pendingImpoundments(campaign).some((message) => message.account === request.account)) {
        return `A special message on the ${spec.name.toLowerCase()} line is already before Congress.`;
    }
    return undefined;
}
export function projectRescission(campaign, request) {
    const today = sittingDate(campaign);
    const windowEnds = sessionDayDate(today, RESCISSION_WINDOW_SESSION_DAYS);
    const appeal = -ACCOUNT_APPEAL[request.account] - RESCISSION_RESISTANCE * request.portion;
    return {
        share: Math.round(availableShare(campaign, request.account) * request.portion * 10000) / 10000,
        windowEnds,
        pocket: compareDates(windowEnds, fiscalYearEnd(fiscalYearOf(today))) > 0,
        votes: countRescission(campaign, appeal),
    };
}
function messagePacket(campaign, message, summary, cost) {
    const congress = {
        ...campaign.congress,
        disposition: Math.round(Math.max(0, Math.min(1, campaign.congress.disposition - cost)) * 1000) / 1000,
        appropriation: { ...campaign.congress.appropriation, impoundments: [...selectImpoundments(campaign), message] },
    };
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary },
            effects: [
                { kind: "congress", set: congress },
                { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline: summary }] },
            ],
        },
    };
}
/**
 * Ask Congress to cancel part of an account's appropriation (2 U.S.C. 683).
 *
 * The money is held while Congress considers the bill, and released if it has
 * not completed action within 45 days of continuous session. A message sent
 * so late that those days end after the fiscal year does is a pocket
 * rescission: allowed to proceed, but contested, and priced.
 */
export function proposeRescission(campaign, request) {
    const refusal = withholdingRefusal(campaign, request);
    if (refusal)
        return { ok: false, reason: refusal };
    const today = sittingDate(campaign);
    const fiscalYear = fiscalYearOf(today);
    const spec = BUDGET_ACCOUNT_SPECS[request.account];
    if (selectImpoundments(campaign).some((m) => m.kind === "rescission" && m.account === request.account && m.fiscalYear === fiscalYear && m.status === "released")) {
        return { ok: false, reason: `The ${spec.name.toLowerCase()} money was released after the last rescission message this fiscal year, and the Act bars proposing it for rescission again.` };
    }
    const projection = projectRescission(campaign, request);
    const message = {
        id: `impound:rescission:${request.account}:${campaign.turn}`,
        kind: "rescission",
        account: request.account,
        share: projection.share,
        transmitted: today,
        transmittedTurn: campaign.turn,
        fiscalYear,
        appeal: -ACCOUNT_APPEAL[request.account] - RESCISSION_RESISTANCE * request.portion,
        ...(projection.pocket ? { pocket: true } : {}),
        status: "pending",
    };
    const summary = projection.pocket
        ? `A rescission message on the ${spec.name.toLowerCase()} line is sent too late for Congress to act before the money expires, and the Comptroller General is expected to call it unlawful.`
        : `A rescission message asks Congress to cancel part of the ${spec.name.toLowerCase()} line; the money is held for up to 45 days of continuous session.`;
    const cost = RESCISSION_BASE_COST + RESCISSION_PORTION_COST * request.portion + (projection.pocket ? POCKET_RESCISSION_DISPOSITION_COST : 0);
    return messagePacket(campaign, message, summary, cost);
}
/**
 * Hold part of an account's appropriation for a period inside the fiscal year
 * (2 U.S.C. 684). Only a contingency or savings from efficiency is a lawful
 * purpose; a deferral for policy reasons is sent anyway if the President
 * chooses, and the Comptroller General reports it as unlawful and may sue.
 */
export function proposeDeferral(campaign, request) {
    const refusal = withholdingRefusal(campaign, request);
    if (refusal)
        return { ok: false, reason: refusal };
    if (!(request.days > 0))
        return { ok: false, reason: "A deferral has to name a period." };
    const today = sittingDate(campaign);
    const heldThrough = addDays(today, request.days);
    if (compareDates(heldThrough, fiscalYearEnd(fiscalYearOf(today))) > 0) {
        return { ok: false, reason: "A deferral cannot run past the end of the fiscal year it is sent in." };
    }
    const spec = BUDGET_ACCOUNT_SPECS[request.account];
    // The same funds withheld again in the same fiscal year carry the earlier
    // review with them, so a string of short deferrals does not restart the
    // Comptroller General's clock or the suit's.
    const unlawful = selectImpoundments(campaign).filter((m) => m.kind === "deferral" && m.account === request.account && m.fiscalYear === fiscalYearOf(today) && m.gao?.inAccordance === false && request.purpose === "policy");
    const earlier = unlawful.at(-1);
    // Doing it again after the Comptroller General has said it is unlawful costs
    // the Hill each time, a little more with each repeat, up to the first finding's price.
    const repeatCost = Math.min(UNLAWFUL_DEFERRAL_DISPOSITION_COST, REPEAT_UNLAWFUL_DEFERRAL_STEP * unlawful.length);
    const message = {
        ...(earlier?.gao ? { gao: earlier.gao } : {}),
        id: `impound:deferral:${request.account}:${campaign.turn}`,
        kind: "deferral",
        account: request.account,
        share: Math.round(availableShare(campaign, request.account) * request.portion * 10000) / 10000,
        transmitted: today,
        transmittedTurn: campaign.turn,
        fiscalYear: fiscalYearOf(today),
        purpose: request.purpose,
        heldThrough,
        status: "pending",
    };
    return messagePacket(campaign, message, `A deferral message holds part of the ${spec.name.toLowerCase()} line for ${request.days} days.`, repeatCost);
}
