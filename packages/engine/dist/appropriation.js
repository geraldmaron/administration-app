import { CHAMBERS, carried, floorThreshold, headOfGovernment, } from "./congress.js";
import { legislativeVoteOn } from "./congress-votes.js";
import { possessive } from "./naming.js";
import { sentenceList } from "./policy.js";
import { BUDGET_ACCOUNT_SPECS, selectBudget } from "./budget.js";
import { fiscalYearEnd, fiscalYearOf, selectBudgetYear, selectFiscalYearEndTurn, turnOnDate } from "./clock.js";
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
