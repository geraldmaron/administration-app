import { EXTENSION_OPENS_DAYS, LOBBY_APPROACH_ORDER, certifyExtension, issueLobbying, legislativeTrack, projectLobbyingOptions, selectBillsAwaitingSignature, figureRapport, selectHillMember, selectNation, selectObligations, selectSigningWindow, signBill, terminationClockRuns, terminationDaysRemaining, transmit, transmittableActs, vetoBill, } from "@admin/engine";
import { reachByGroup, reachSentence } from "../policy/reach.js";
import { formatDate, formatRatio, formatSignedPoints } from "../format/figures.js";
import { formatMoney } from "../format/money.js";
import { costLines } from "../economy/lever-comparison.js";
import { warPowersHome } from "../world/war-powers-home.js";
import { fiscalPreview } from "../economy/fiscal-books.js";
import { actEffects, billAndAct, billFundingLines, billRestingLines, enactmentEffects, overrideReading } from "../legislation/bill-reading.js";
import { CHAMBER_TITLE } from "./floor-schedule.js";
import { actCell, congressAfter, dispositionMove } from "./act-comparison.js";
// The acts the Hill answers: signing or returning a bill, sending one up,
// working a member, and certifying a war-powers extension. Each column is
// read as its change from today and built from the same engine call its
// commit makes; a wait that runs a clock is the comparison's waiting line.
// --- Sign or veto ----------------------------------------------------------
const DESK_ROWS = [
    { key: "happens", label: "What happens" },
    { key: "hill", label: "How Congress feels about you" },
    { key: "law", label: "What the law does" },
    { key: "books", label: "Effect on the deficit" },
    { key: "override", label: "If Congress tries to override" },
];
/** A veto message is the President's own words; the preview prices it on a placeholder, because the price does not read them. */
const PREVIEW_OBJECTION = "The President's objection.";
function lawLines(campaign, act, bill) {
    const lines = actEffects(campaign, act).map((effect) => `${effect.label} ${effect.value}`);
    lines.push(...billRestingLines(act, bill));
    if (act.domestic) {
        lines.push(act.domestic.reason);
        const reach = reachSentence(reachByGroup(campaign, act.domestic));
        if (reach)
            lines.push(reach);
    }
    return actCell(lines.length > 0 ? lines : ["Doesn't directly change your numbers or the country's"]);
}
function booksLine(campaign, bill) {
    const preview = fiscalPreview(campaign, {}, enactmentEffects(campaign, bill));
    if (!preview || preview.cost.deficit === 0)
        return actCell("No change to the deficit");
    const adds = preview.cost.deficit > 0;
    return actCell(`${adds ? "Adds" : "Cuts"} ${formatMoney(Math.abs(preview.cost.deficit))} a year ${adds ? "to" : "from"} the deficit`, adds ? "caution" : "favorable");
}
function deskColumns(campaign, bill, act) {
    const before = campaign.congress.disposition;
    const signed = signBill(campaign, bill.id);
    const vetoed = vetoBill(campaign, bill.id, PREVIEW_OBJECTION);
    const law = lawLines(campaign, act, bill);
    const books = booksLine(campaign, bill);
    const override = overrideReading(campaign, bill);
    const none = actCell("Nothing changes");
    return [
        {
            id: "sign", label: "Sign the bill", verb: "Sign the bill into law",
            ...(signed.ok ? {} : { refusal: signed.reason }),
            review: `${bill.title} becomes law today with your signature.`,
            cells: { happens: actCell("It becomes law today"), hill: dispositionMove(before, signed.ok ? congressAfter(signed.packet) : undefined), law, books, override: actCell("No veto, so no override") },
        },
        {
            id: "veto", label: "Veto it", verb: "Veto and return it",
            ...(vetoed.ok ? {} : { refusal: vetoed.reason }),
            review: `${bill.title} goes back to Congress with your message. ${override.headline}.`,
            cells: { happens: actCell("It goes back to Congress with your message"), hill: dispositionMove(before, vetoed.ok ? congressAfter(vetoed.packet) : undefined), law: none, books: actCell("No change to the deficit"), override: actCell([override.headline, override.detail], override.stance) },
        },
    ];
}
/** The bill on the desk, signed or returned; left there, it becomes law unsigned on its deadline. Undefined once it is off the desk. */
export function deskComparison(campaign, billId) {
    const found = billAndAct(campaign, billId);
    if (!found || !selectBillsAwaitingSignature(campaign).some((bill) => bill.id === billId))
        return undefined;
    const deadline = formatDate(selectSigningWindow(campaign, found.bill).deadline);
    return { rows: DESK_ROWS, columns: deskColumns(campaign, found.bill, found.act), waiting: `If you neither sign nor veto it, it becomes law without your signature on ${deadline}, and you look a little weaker for it.` };
}
/** The packet a desk choice commits. A veto refused for want of a message throws in the engine's words. */
export function deskPacket(campaign, billId, choice, objection) {
    const result = choice === "sign" ? signBill(campaign, billId) : vetoBill(campaign, billId, objection);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
// --- Sending a bill up -----------------------------------------------------
const TRANSMIT_ROWS = [
    { key: "does", label: "What it does" },
    { key: "tradeoff", label: "Who wants what" },
    { key: "funding", label: "Federal money if it passes" },
    { key: "effects", label: "Expected effects if it passes" },
    { key: "hill", label: "How Congress feels about you" },
    { key: "count", label: "Votes today" },
];
function proposedFunding(campaign, act) {
    const lines = billFundingLines(campaign, act);
    return actCell(lines.length ? lines : ["Doesn't directly spend or raise money"]);
}
function countLines(campaign, act) {
    return actCell(["house", "senate"].map((chamber) => {
        const seats = campaign.congress.chambers[chamber].seats;
        const threshold = Math.floor(seats / 2) + 1;
        const cloture = chamber === "senate" && legislativeTrack(campaign, act) === "ordinary" ? ", and 60 to end debate" : "";
        return `${CHAMBER_TITLE[chamber]}: support unknown, ${threshold} votes needed to pass${cloture}`;
    }), "neutral");
}
function transmitColumn(campaign, act) {
    const result = transmit(campaign, act.id);
    return {
        id: act.id, label: act.title, verb: "Send the bill to Congress",
        ...(result.ok ? {} : { refusal: result.reason }),
        review: `${act.title} goes to Congress today, and a committee looks at it first. It uses some of Congress's limited voting time, whether it passes or not.`,
        cells: { does: actCell(act.summary), tradeoff: actCell(act.tradeoff ?? "Getting it passed uses up some of your goodwill in Congress, and both the House and the Senate have to agree."), funding: proposedFunding(campaign, act), effects: lawLines(campaign, act), hill: dispositionMove(campaign.congress.disposition, result.ok ? congressAfter(result.packet) : undefined), count: countLines(campaign, act) },
    };
}
/** The administration's own bills it could send up this week. */
export function transmitComparison(campaign) {
    return { rows: TRANSMIT_ROWS, columns: transmittableActs(campaign).map((act) => transmitColumn(campaign, act)) };
}
export function transmitPacket(campaign, actId) {
    const result = transmit(campaign, actId);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
// --- Working a member -----------------------------------------------------
/** Every play, by the key the engine knows them by, in the order the engine lists them. */
export const LOBBY_APPROACHES = LOBBY_APPROACH_ORDER;
const LOBBY_VERB = {
    call: "Make the call",
    trade: "Open the negotiation",
    public: "Go to their voters",
    credit: "Share the credit",
    campaign: "Campaign with them",
};
const LOBBY_ROWS = [
    { key: "play", label: "What it is" },
    { key: "cost", label: "What it costs now" },
    { key: "odds", label: "Chance it works" },
    { key: "member", label: "The member, if it works or not" },
    { key: "chamber", label: "Their chamber, if it works or not" },
    { key: "resents", label: "Who resents it" },
    { key: "risk", label: "If it fails" },
    { key: "when", label: "When you find out" },
];
const pct = (value) => formatRatio(value);
/** What the play spends beyond the metric cost: credit given away, ground lent in a state, the base's faith. */
function costBeyond(projection) {
    const lines = [];
    if (projection.credit) {
        lines.push(`${pct(projection.credit.fraction)} of the credit for ${projection.credit.title} goes to ${projection.target} when it becomes law`);
    }
    const stop = projection.campaign;
    if (stop) {
        lines.push(`Your support in ${stop.stateName} goes from ${formatSignedPoints(stop.standingBefore)} to ${formatSignedPoints(stop.standingAfter)} points`);
    }
    return lines;
}
function costCell(projection) {
    const lines = [...costLines(projection.play.cost), ...costBeyond(projection)];
    return actCell(lines.length > 0 ? lines : ["Nothing up front"], lines.length > 0 ? "caution" : undefined);
}
function memberCell(projection, today) {
    const lines = [`Today: ${pct(today)}`, `Lands: ${pct(projection.rapportIfGood)}`, `Misses: ${pct(projection.rapportIfBad)}`];
    if (projection.trustIfGood !== undefined && projection.trustIfBad !== undefined) {
        lines.push(`Trust in your word: ${pct(projection.trustIfGood)} if it lands, ${pct(projection.trustIfBad)} if not`);
    }
    if (projection.repeatCall !== undefined)
        lines.push(`Calling again with nothing to ask costs ${formatSignedPoints(projection.repeatCall)} points with them (already counted above)`);
    return actCell(lines, projection.repeatCall !== undefined ? "caution" : undefined);
}
/** Everyone else the play costs, by name, from where they stand to where it leaves them. */
function resentsCell(campaign, projection) {
    const onlyIfLands = projection.approach === "trade" ? ", if the deal lands" : "";
    const lines = projection.resentments.map((entry) => {
        const before = memberRapport(campaign, entry.post);
        const after = Math.round(Math.max(0, Math.min(1, before + entry.delta)) * 1000) / 1000;
        return `${entry.name}: ${pct(before)} to ${pct(after)}${onlyIfLands}`;
    });
    return lines.length > 0 ? actCell(lines, "adverse") : actCell("No one else");
}
function riskCell(projection) {
    const lines = [...costLines(projection.play.backfire)];
    if (projection.grudgeIfMissed !== undefined)
        lines.push(`${projection.target} holds a grudge against you`);
    return actCell(lines.length > 0 ? lines : ["Nothing else"], lines.length > 0 ? "adverse" : undefined);
}
function lobbyColumn(campaign, post, projection) {
    const issued = issueLobbying(campaign, post, projection.approach);
    return {
        id: projection.approach, label: projection.play.name, verb: LOBBY_VERB[projection.approach],
        ...(issued.ok ? {} : { refusal: issued.reason }),
        review: `${projection.play.name} with ${projection.target}. ${projection.reasoning}`,
        cells: {
            play: actCell(projection.play.summary),
            cost: costCell(projection),
            odds: actCell(`${sentence(projection.forecast.likelihood)}, ${projection.forecast.confidence} confidence`),
            member: memberCell(projection, memberRapport(campaign, post)),
            chamber: actCell([`Today: ${pct(projection.chamberBefore)}`, `Lands: ${pct(projection.chamberIfGood)}`, `Misses: ${pct(projection.chamberIfBad)}`]),
            resents: resentsCell(campaign, projection),
            risk: riskCell(projection),
            when: actCell(projection.delayDays === 1 ? "Tomorrow" : `In ${projection.delayDays} days`),
        },
    };
}
const sentence = (text) => text.charAt(0).toUpperCase() + text.slice(1);
/** How warm the member holding a post is toward the administration; nothing when the post is empty. */
function memberRapport(campaign, post) {
    const member = selectHillMember(campaign, post);
    return member ? figureRapport(campaign.people, member.figure) : 0;
}
/** Every way to work a member, each read from where they and their chamber stand today. Undefined when nobody holds the post. */
export function lobbyComparison(campaign, post) {
    const options = projectLobbyingOptions(campaign, post);
    if (options.length === 0)
        return undefined;
    return { rows: LOBBY_ROWS, columns: options.map((projection) => lobbyColumn(campaign, post, projection)) };
}
export function lobbyPacket(campaign, post, approach) {
    const result = issueLobbying(campaign, post, approach);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
/** A placeholder necessity, so the preview asks the engine every question but the one only the President can answer. */
const PREVIEW_NECESSITY = "Unavoidable military necessity.";
/**
 * The grounds a President can certify, with the target named. The statute asks
 * for unavoidable military necessity in the course of bringing the force out,
 * and the reasons that meet that test are few and the same for every country;
 * the engine records the sentence and Congress reads it back, so a fixed set
 * keeps the record legible without asking the player to draft legal prose.
 */
export function extensionGrounds(target) {
    return [
        `Our forces are in contact with ${target}'s forces and cannot disengage safely inside the sixty days.`,
        `Americans still in ${target} have to be brought out before the force can leave.`,
        "Allied forces need the time to take over the positions ours now hold.",
        "The units and their equipment cannot be moved out of the theater any faster.",
    ].map((sentence) => ({ value: sentence, label: sentence }));
}
function extensionRefusal(campaign, id, daysLeft) {
    if (daysLeft > EXTENSION_OPENS_DAYS) {
        const wait = daysLeft - EXTENSION_OPENS_DAYS;
        return `You can ask for the extension when ${EXTENSION_OPENS_DAYS} days are left, which is ${wait} day${wait === 1 ? "" : "s"} from now. Until then, you can ask Congress to approve the mission or bring your forces home.`;
    }
    const result = certifyExtension(campaign, id, PREVIEW_NECESSITY);
    return result.ok ? undefined : result.reason;
}
/** Every introduction whose sixty-day clock is running, and whether its thirty-day extension can be certified now. */
export function extensionNotices(campaign) {
    return selectObligations(campaign)
        .filter((obligation) => terminationClockRuns(campaign, obligation))
        .map((obligation) => {
        const daysLeft = terminationDaysRemaining(campaign, obligation);
        const target = selectNation(campaign, obligation.target)?.base.identity.name ?? obligation.target;
        const certified = obligation.extension?.necessity;
        const refusal = certified === undefined ? extensionRefusal(campaign, obligation.id, daysLeft) : undefined;
        return {
            id: obligation.id,
            target,
            daysLeft,
            line: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left before your forces in ${target} must come home, unless Congress votes to approve.`,
            home: warPowersHome(campaign, obligation.target),
            ...(refusal ? { refusal } : {}),
            ...(certified !== undefined ? { certified } : {}),
        };
    });
}
const EXTENSION_ROWS = [
    { key: "does", label: "What it does" },
    { key: "clock", label: "The clock" },
];
/** Certifying the thirty days; uncertified, the sixty run out, which is the waiting line. */
export function extensionComparison(notice) {
    return {
        rows: EXTENSION_ROWS,
        waiting: `Unless Congress votes, your forces in ${notice.target} must come home in ${notice.daysLeft} days. Every week they stay past that costs more than the week before.`,
        columns: [
            {
                id: "certify", label: "Certify 30 more days", verb: "Certify the extension",
                ...(notice.refusal ? { refusal: notice.refusal } : {}),
                review: "You tell Congress in writing that your forces can't safely leave any sooner and need 30 more days to come home. The extra time is only for leaving, not for more fighting.",
                cells: { does: actCell("30 days to withdraw, on your written promise"), clock: actCell(`${notice.daysLeft + 30} days left, from ${notice.daysLeft}, only for leaving`) },
            },
        ],
    };
}
export function extensionPacket(campaign, id, necessity) {
    const result = certifyExtension(campaign, id, necessity);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
