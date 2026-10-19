import { BEAT_THRESHOLDS, DAYS_PER_TURN, campaignFoundingDate, compareDates, composeAttentionStop, institutionDef, institutionForRole, selectActiveConflicts, selectConditionsFor, selectDeliveryShortfall, selectNextMilestones, selectOrders, selectRemoval, selectVacancies, seatKindOf, withoutDeferred, } from "@admin/engine";
import { readingBand } from "../reading";
import { cabinetSeats } from "../cabinet/seats";
import { unauthorizedReadings } from "../congress/congress-reading";
import { formatRatio, stanceForPressure, stanceForRatio, } from "../format/figures";
import { PLACES, anchored, place } from "../navigation/places";
import { institutionActionsHref, roleActionsHref } from "../shell/office-of";
import { subjectHref } from "../shell/subject";
import { appropriationDue } from "../summons/due-legislative";
import { summonsItems } from "../summons/rows";
import { conditionReadings, warReadings } from "../world/board-state";
import { warPowersHome } from "../world/war-powers-home";
import { justHappened } from "./attention-row";
import { applyAttentionPolicy } from "./attention-policy";
import { familyRowUrgency } from "./family-cases";
import { BUDGET_FUNDING, familySources } from "./family-sources";
import { conditionRoute } from "./condition-route";
import { conditionsInReliefCases } from "./family-emergency";
// The other direction (the President asking a governor for the Guard) is not
// an interruption, so it carries no row in `buildRows` below — the Desk's
// "Federal help" section reads it directly, and it is re-exported here
// because this is player-core's one desk barrel line for the module.
export { guardCandidateHeadline, guardRequestCandidates } from "./attention-requests";
import { outstandingInstrumentItems, outstandingAuthorizationItems, outstandingLobbyItems, outstandingPressItems, outstandingTreatyItems } from "./attention-outstanding";
import { cabinetProposalItems, resignationOfferItems } from "./attention-cabinet";
import { scandalAttentionItems } from "./attention-scandal";
import { briefAttentionItems } from "./attention-brief";
import { pledgeItems } from "./attention-pledges";
import { fiscalAttentionItems } from "./attention-fiscal";
import { coupItems, marketShockItems } from "./attention-markets";
import { investigationItems, retaliationItems, rulingItems, tariffExpiryItems } from "./attention-trade";
import { dayCount, weekCount } from "../summons/clock-math";
// Re-exported here (rather than a new line in the integrator-held barrel)
// so a settings screen can build its rows straight off the source union: the
// policy itself, its default table, the last-call window and which kinds
// "log" is a real answer for.
export { ATTENTION_SOURCES, applyAttentionPolicy, defaultAttentionSetting, LAST_CALL_DAYS, logEligible } from "./attention-policy";
/**
 * What needs the president this week, ranked, each row a real surface.
 *
 * The folio is the week's one act. This list is everything else that is loud
 * enough to interrupt: a war, a bill on the desk, a vacant chair. Quiet
 * categories stay off the page so an empty week does not train the player to
 * stop looking.
 */
/**
 * The severity in words, so the row's spoken name carries what ranks it.
 *
 * Severity reaches a sighted player two ways, the filament down the row's
 * left edge and the trail's tint, and both are color. The list is ordered by
 * it, so a reader arrowing down a ranked list with no term in the name hears
 * equally weighted matters in an order whose meaning is invisible.
 */
export function stanceSpoken(stance) {
    return STANCE_SPOKEN[stance];
}
const STANCE_SPOKEN = {
    adverse: "Urgent",
    caution: "Needs attention",
    neutral: "Routine",
    favorable: "In hand",
};
/**
 * A row for a standing fact only earns the right to stop the presidency the
 * week the fact actually moves. Otherwise it stays ambient: still on the
 * board, still open to whoever goes looking, just not competing for the
 * three — which is what keeps a war a year old from re-stopping Continue
 * every fortnight for the rest of the term.
 */
function warItems(campaign) {
    const conflicts = new Map(selectActiveConflicts(campaign).map((conflict) => [conflict.id, conflict]));
    return warReadings(campaign).map((war) => {
        const heat = war.readings[0];
        const lastBeat = conflicts.get(war.id)?.beats.at(-1)?.turn;
        return {
            id: `war:${war.id}`,
            source: "military-escalation",
            urgency: justHappened(campaign, lastBeat) ? "soft" : "ambient",
            subject: `war:${war.id}`,
            title: war.headline,
            reason: war.standfirst,
            href: anchored(subjectHref({ kind: "war", id: war.id }), "war-state"),
            stance: heat?.stance ?? "caution",
            figure: heat?.value,
            icon: "instrumentMilitary",
        };
    });
}
function conditionItems(campaign) {
    const running = new Map(selectConditionsFor(campaign, campaign.founding.nation).map((condition) => [condition.id, condition]));
    // A condition a governor has asked Washington about is that relief case's
    // matter, and the case row says it.
    const inCases = conditionsInReliefCases(campaign);
    return conditionReadings(campaign).filter((condition) => !inCases.has(condition.id)).map((condition) => {
        const lastBeat = running.get(condition.id)?.beats.at(-1)?.turn;
        return {
            id: `condition:${condition.id}`,
            // An incident is one afternoon, not a standing file the government is
            // carrying, and the Desk's own source vocabulary already keeps the two
            // apart (review F12): a disaster row would tell a "pause" reader that a
            // resolved incident is a system to log against, which it is not.
            source: condition.incident ? "incident" : "disaster",
            urgency: justHappened(campaign, lastBeat) ? "soft" : "ambient",
            subject: `condition:${condition.id}`,
            title: condition.headline,
            reason: condition.standfirst,
            href: conditionRoute(condition),
            stance: condition.severity.stance,
            figure: condition.severity.value,
            icon: "escalate",
        };
    });
}
function unauthorizedItems(campaign) {
    return unauthorizedReadings(campaign).map((action) => ({
        id: `unauthorized:${action.id}`,
        source: "military-escalation",
        urgency: "hard",
        subject: "war-powers",
        title: `Force used against ${action.targetName} without Congress's approval`,
        reason: `${action.weeksRemaining} ${action.weeksRemaining === 1 ? "week" : "weeks"} left on the 60-day War Powers time limit.`,
        href: warPowersHome(campaign, action.target),
        stance: action.weeksRemaining <= 2 ? "adverse" : "caution",
        figure: weekCount(action.weeksRemaining),
        icon: "escalate",
        clock: {
            kind: "statutory",
            name: "War Powers clock",
            window: action.windowWeeks,
            consumed: action.weeksElapsed,
            unit: "week",
            statute: "War Powers Resolution",
        },
    }));
}
function removalItems(campaign) {
    const removal = selectRemoval(campaign);
    const stance = stanceForPressure(removal.pressure);
    if (stance !== "caution" && stance !== "adverse")
        return [];
    // The same reading family as the fold's own removal line (desk-standing.ts)
    // and the Record's approval clock, so a player never meets two different
    // words for the identical figure depending on which section they read.
    const word = readingBand("pressure", removal.pressure)?.word ?? "Rising";
    return [
        {
            id: "removal",
            // The case a Congress builds against a president is an investigation of one.
            source: "investigation",
            urgency: justHappened(campaign, removal.beats.at(-1)?.turn) ? "soft" : "ambient",
            subject: "removal",
            title: "Removal pressure",
            reason: `${word}. At ${formatRatio(BEAT_THRESHOLDS[1])} the House votes on impeachment. At ${formatRatio(BEAT_THRESHOLDS[2])} the Senate holds a trial, and two thirds of senators can remove you.`,
            href: place.approval(),
            stance,
            figure: formatRatio(removal.pressure),
            icon: "gavel",
        },
    ];
}
/**
 * The families' matters — a bill on the desk, a nominee in trouble, the money
 * running out, an emergency waiting, an ally's call — each under its case id.
 * A case the President has already closed asks for nothing more, so its row
 * stays on the record and leaves the running.
 */
function familyRows(campaign) {
    return familySources(campaign).map((source) => {
        const urgency = familyRowUrgency(campaign, source);
        return urgency === source.row.urgency ? source.row : { ...source.row, urgency };
    });
}
/** The appointments desk opened on this seat, where the Senate confirms it; otherwise nothing, and the office page is the door. */
function seatHref(office) {
    return office && seatKindOf(office) ? place.appointments(office) : undefined;
}
function vacancyItems(campaign) {
    const vacant = cabinetSeats(campaign).filter((seat) => !seat.isPlayer && seat.holder === undefined);
    if (vacant.length === 0)
        return [];
    return [
        {
            id: "cabinet-vacant",
            source: "agency-request",
            urgency: "soft",
            subject: "cabinet",
            title: vacant.length === 1 ? "One cabinet seat is empty" : `${vacant.length} cabinet seats are empty`,
            reason: "Each empty seat makes the public think you're less able to run the government. Nominate someone to fill it.",
            href: seatHref(institutionForRole(vacant[0].role)?.offices[0]?.id) ?? roleActionsHref(vacant[0].role),
            stance: vacant.length > 1 ? "adverse" : "caution",
            figure: String(vacant.length),
            icon: "emptyCabinet",
        },
    ];
}
// Where the shortfall stops being a warning and becomes the loud kind. Below
// this the government is short-handed; above it, it is not running, and the
// public has begun marking the administration down for it.
const DELIVERY_ADVERSE = 0.45;
const DELIVERY_CAUTION = 0.2;
/**
 * The half of the government nobody is in.
 *
 * The public now marks an administration down for offices it has left empty,
 * and at eight years of leaving them all empty that alone is enough to end a
 * presidency. A consequence that heavy cannot arrive first through the removal
 * arc: staffing is the least visible thing a president does, and a player who
 * is losing the country over it should be told by the desk long before they
 * are told by an impeachment.
 *
 * Deliberately not a hard interruption. It is a standing condition rather than
 * an event, and a room that stops the week every week for the same unfilled
 * office is a room a player learns to click through.
 */
function deliveryItems(campaign) {
    const shortfall = selectDeliveryShortfall(campaign);
    if (shortfall < DELIVERY_CAUTION)
        return [];
    const vacancies = selectVacancies(campaign);
    const unled = vacancies.length;
    const longest = vacancies[0]?.vacantDays;
    return [
        {
            id: "executive-delivery",
            source: "agency-request",
            urgency: "soft",
            subject: "delivery",
            title: unled === 1 ? "One agency has no leader" : `${unled} agencies have no leader`,
            reason: shortfall >= DELIVERY_ADVERSE
                ? "People have started to blame you for what the government isn't getting done."
                : "An agency with no leader gets less of your plans done, and people notice.",
            // The office empty longest, since that is the vacancy the consequence compounds on.
            href: vacancies[0] ? (seatHref(institutionDef(vacancies[0].id)?.offices[0]?.id) ?? institutionActionsHref(vacancies[0].id)) : place.washington(),
            stance: shortfall >= DELIVERY_ADVERSE ? "adverse" : "caution",
            figure: `${Math.round((1 - shortfall) * 100)}%`,
            icon: "emptyCabinet",
            // No statute puts a clock on staffing. What there is instead is how long
            // the office that has been empty longest has been empty, which is the
            // count the consequence actually compounds on.
            ...(longest === undefined
                ? {}
                : { clock: { kind: "elapsed", name: "Longest empty seat", elapsed: longest, unit: "day" } }),
        },
    ];
}
function pressItems(campaign) {
    const standing = campaign.press.standing;
    const stance = stanceForRatio(standing);
    if (stance !== "caution" && stance !== "adverse")
        return [];
    return [
        {
            id: "press",
            // A standing figure crossed a line and the world noticed; nothing asked
            // the President for anything. "market-threshold" is reserved for the
            // fiscal rows (the rating outlook, the debt limit) — a figure that
            // actually moves a market — so the press's own standing reads under its
            // own name and a per-kind setting on one can never mute the other.
            source: "standing-threshold",
            urgency: "ambient",
            subject: "press",
            title: "The press has turned cooler toward you",
            reason: "How the press sees you shapes what they write about you.",
            href: anchored(place.pressView("desks"), "press-desks"),
            stance,
            figure: formatRatio(standing),
            icon: "press",
        },
    ];
}
function orderReviewItems(campaign) {
    const due = selectOrders(campaign).filter((order) => order.review?.status === "pending" && order.review.dueTurn <= campaign.turn);
    if (due.length === 0)
        return [];
    // The window is the bench's own: from the week the order was signed to the
    // week it said it would rule. A schedule rather than a statute, so the dial
    // carries the denominator without claiming a rule set it.
    const lead = due[0];
    const window = Math.max(1, lead.review.dueTurn - lead.turn);
    // A review that fell due the week it is read is news; one still sitting
    // pending turns later — the bench running behind its own schedule — is a
    // standing fact the room already knows, not a fresh filing.
    const filed = due.some((order) => justHappened(campaign, order.review.dueTurn));
    return [
        {
            id: "order-review",
            source: "court-ruling",
            urgency: filed ? "soft" : "ambient",
            subject: "order-review",
            title: due.length === 1 ? "Court ruling due on your order" : `${due.length} court rulings due on your orders`,
            reason: "A court rules this week on an order you signed.",
            href: anchored(place.case(lead.id), "case-identity"),
            stance: "caution",
            figure: String(due.length),
            icon: "law",
            clock: {
                kind: "statutory",
                name: "Before the court",
                window,
                consumed: Math.max(0, campaign.turn - lead.turn),
                unit: "week",
            },
        },
    ];
}
/**
 * How far ahead the constitutional calendar is worth reading.
 *
 * Three, because that is what `selectNextMilestones` defaults to and what the
 * calendar realistically holds inside a quarter: convening, a fiscal year, an
 * election. Reading further would put a date eighteen months out on a desk that
 * is meant to be about this month.
 */
const MILESTONES_AHEAD = 3;
/** Inside this many days a date on the constitution's calendar is this month's work. */
const MILESTONE_CLOSE_DAYS = 2 * DAYS_PER_TURN;
/**
 * Where a player can actually prepare for a date the Constitution set.
 *
 * The electoral dates open the approval reading, because the public's verdict
 * is what an election counts. They used to open "campaigns" — the room of that
 * name is the device's save library, so the Desk's "Presidential election" row
 * sent the player to their save files.
 */
const MILESTONE_DOORS = {
    "congress-convenes": { href: anchored(place.congress(), "hill-seats"), icon: PLACES.congress.icon },
    "fiscal-year-start": { href: BUDGET_FUNDING, icon: PLACES.budget.icon },
    "appropriations-deadline": { href: BUDGET_FUNDING, icon: PLACES.budget.icon },
    "presidential-election": { href: place.approval(), icon: "election" },
    "midterm-election": { href: place.approval(), icon: "election" },
    // Two governors' chairs the administration does not hold a vote on, read the
    // same way the national contests are: as a verdict on it.
    "gubernatorial-election": { href: place.approval(), icon: "election" },
    inauguration: { href: place.approval(), icon: "election" },
};
/**
 * The dates the Constitution puts on this president's calendar.
 *
 * Always ambient, however close, and that is a rule rather than a caution. A
 * president can sign a bill, fill a chair and bring a force home; nothing the
 * office can do moves Inauguration Day. A matter that stops the world and has
 * no answer is a Continue that spends no time and never will, so the calendar
 * reaches the feed, the Record and the week ahead, and never the three.
 *
 * The banding survives in the reading: a date inside a fortnight is this
 * month's work and says so, which is what a surface ranks it on.
 */
/**
 * The calendar's appropriations deadline and the appropriation clock are one
 * fact when the money runs out on that deadline, so the row takes the clock's
 * subject and the collapse below keeps one of them. Listed apart, the Desk gave
 * the same money two dates.
 */
function milestoneSubject(campaign, milestone) {
    if (milestone.kind === "appropriations-deadline") {
        const due = appropriationDue(campaign);
        if (due !== undefined && compareDates(due.dueDate, milestone.date) === 0)
            return due.subject;
    }
    return `milestone:${milestone.kind}`;
}
function milestoneItems(campaign) {
    return selectNextMilestones(campaign, MILESTONES_AHEAD).map((milestone) => {
        const close = milestone.daysAway <= MILESTONE_CLOSE_DAYS;
        const door = MILESTONE_DOORS[milestone.kind];
        return {
            id: `milestone:${milestone.kind}`,
            source: "constitutional-deadline",
            urgency: "ambient",
            subject: milestoneSubject(campaign, milestone),
            title: milestone.label,
            reason: milestone.daysAway <= 0
                ? `${milestone.label}: today.`
                : `${milestone.label}: in ${milestone.daysAway} ${milestone.daysAway === 1 ? "day" : "days"}.`,
            href: door.href,
            stance: close ? "caution" : "neutral",
            figure: dayCount(Math.max(0, milestone.daysAway)),
            icon: door.icon,
            dueDate: milestone.date,
        };
    });
}
/** How badly a row is going, for the tiebreak inside one urgency. */
const STANCE_RANK = { adverse: 0, caution: 1, neutral: 2, favorable: 3 };
const URGENCY_RANK = { hard: 0, soft: 1, ambient: 2 };
/**
 * Everything the President has been raised for, worst first.
 *
 * The order is: what the presidency cannot continue past, then what it can,
 * then the world's pulse; and inside each, the worst-going first. Before this
 * it was ten builders concatenated in source order, so two vacant chairs
 * (adverse) drew below one enrolled bill (caution) under a heading that said
 * "worst first", and the chapter badge could read adverse because of a row
 * sitting fourth.
 *
 * Three producers feed it and there is no fourth: the Desk's standing
 * conditions, the statutory clocks, and the constitutional calendar. They used
 * to be separate systems with separate rankings that had to negotiate by hand
 * over which of them was allowed to badge a fact — `SummonsSpec.badgedBy` was
 * that negotiation, in a field. What replaced it is below: two rows about one
 * subject are one row.
 */
export function attentionItems(campaign) {
    const held = ROWS.get(campaign);
    if (held !== undefined)
        return held;
    const rows = buildRows(campaign);
    ROWS.set(campaign, rows);
    return rows;
}
/**
 * The rows for one campaign, computed once.
 *
 * Six things read this list on a single Desk render — the chapter, the Desk's
 * own badge, the dock, the header, the interruption sheet and the matter source
 * — and each pass runs fourteen statutory clocks and ten builders over campaign
 * state. A campaign is immutable and is replaced whenever a packet applies, so
 * a weak map keyed on it is exact rather than a cache with an invalidation
 * problem: the entry for a superseded campaign becomes unreachable with it.
 *
 * It also makes the rows stable by identity, which is what lets a filtered view
 * of this list be provably the same rows rather than an equal-looking copy.
 */
const ROWS = new WeakMap();
const RAW = new WeakMap();
/**
 * Every row every producer raised, ranked, before two rows about one subject
 * become one.
 *
 * The collapse is right for what interrupts the President and wrong for what
 * the President is waiting on: two press plays share the subject "press", and
 * a list of pending work that kept one of them would lose the other's date.
 */
export function attentionRows(campaign) {
    const held = RAW.get(campaign);
    if (held !== undefined)
        return held;
    const rows = rankedRows(campaign);
    RAW.set(campaign, rows);
    return rows;
}
function buildRows(campaign) {
    return collapseBySubject(attentionRows(campaign));
}
function rankedRows(campaign) {
    return ([
        ...warItems(campaign),
        ...conditionItems(campaign),
        ...unauthorizedItems(campaign),
        ...removalItems(campaign),
        ...familyRows(campaign),
        ...vacancyItems(campaign),
        ...deliveryItems(campaign),
        ...pressItems(campaign),
        ...orderReviewItems(campaign),
        ...outstandingInstrumentItems(campaign),
        ...outstandingLobbyItems(campaign),
        ...outstandingPressItems(campaign),
        ...outstandingTreatyItems(campaign),
        ...outstandingAuthorizationItems(campaign),
        ...investigationItems(campaign),
        ...rulingItems(campaign),
        ...retaliationItems(campaign),
        ...tariffExpiryItems(campaign),
        ...pledgeItems(campaign),
        ...cabinetProposalItems(campaign),
        ...resignationOfferItems(campaign),
        ...scandalAttentionItems(campaign),
        ...briefAttentionItems(campaign),
        ...fiscalAttentionItems(campaign),
        ...marketShockItems(campaign),
        ...coupItems(campaign),
        ...milestoneItems(campaign),
        ...summonsItems(campaign),
    ].sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || STANCE_RANK[a.stance] - STANCE_RANK[b.stance]));
}
/**
 * Two rows about one subject are one row — the loudest of them, keeping the
 * door the quieter one carried.
 *
 * A bill on the desk is a standing condition and a statutory clock at the same
 * time, and both producers are right to raise it. What a player must never see
 * is two claims on one signature, and what the surviving row must never lose is
 * the folio behind the clock: the interruption sheet opens off this list, so a
 * collapse that dropped the clock would silently stop presenting the sheet for
 * every fact the Desk also draws.
 */
function collapseBySubject(rows) {
    const kept = new Map();
    for (const row of rows) {
        const held = kept.get(row.subject);
        if (held === undefined) {
            kept.set(row.subject, row);
            continue;
        }
        // A family's row is the case the matter is recorded under, so it is the
        // one that survives, at the louder urgency and with the clock's door.
        if (isCaseRow(row) && !isCaseRow(held)) {
            const urgency = URGENCY_RANK[held.urgency] < URGENCY_RANK[row.urgency] ? held.urgency : row.urgency;
            kept.set(row.subject, { ...row, urgency, ...(row.summons === undefined && held.summons !== undefined ? { summons: held.summons } : {}) });
            continue;
        }
        if (held.summons === undefined && row.summons !== undefined) {
            kept.set(row.subject, { ...held, summons: row.summons });
        }
    }
    return [...kept.values()];
}
function isCaseRow(row) {
    return row.id.startsWith("case:");
}
/** The rows as the engine's composer takes them: the one projection, said once. */
function mattersOf(items, date) {
    return items.map((item) => ({
        id: item.id,
        source: item.source,
        urgency: item.urgency,
        title: item.title,
        reason: item.reason,
        subject: item.subject,
        date,
        ...(item.dueDate === undefined ? {} : { dueDate: item.dueDate }),
    }));
}
/** One row as the matter the engine keys a deferral on, for a surface that puts it off. */
export function matterFor(item, date) {
    return mattersOf([item], date)[0];
}
/**
 * The Desk's rows, as a source the engine's advance can ask.
 *
 * This is the adapter that stops the app and the engine having two unrelated
 * ideas of what needs the President. The rows were already computed, already
 * ranked and already drawn; what they could not do was stop time, because
 * nothing connected them to `advanceUntilAttention`. Now the same producers
 * answer both questions, and a row cannot be loud enough to badge a room and
 * too quiet to interrupt a quiet fortnight.
 *
 * The player's settings run here, over every candidate, before the engine
 * ever composes a stop out of them — never afterward, and never over
 * `presented` alone, so a "wait" matter cannot be shadowed by a "pause" one
 * it collided with and then never resurface.
 */
export function deskMatterSource(campaign, date, settings) {
    return applyAttentionPolicy(mattersOf(attentionItems(campaign), date), settings, date, campaignFoundingDate(campaign));
}
/**
 * The one composition, with the rows kept alongside so a surface can draw them.
 *
 * The store also holds a stop — the one the world handed back when it stopped
 * running — and the two are the same composition at different moments. This one
 * is what a surface reads, because a badge computed at the last advance goes
 * stale the instant a bill is signed, and a Desk that told a player about a
 * signature they had already given would be the old digest's lie in a new place.
 *
 * Reads the same settings `deskMatterSource` does, over the same candidates,
 * before the same composer: a screen and the loop that actually stops the
 * world can never disagree about what a "wait" setting is currently holding
 * back.
 */
function composed(campaign, settings) {
    const items = attentionItems(campaign);
    const matters = applyAttentionPolicy(mattersOf(items, campaign.calendar), settings, campaign.calendar, campaignFoundingDate(campaign));
    return {
        stop: composeAttentionStop(withoutDeferred(matters, campaign.deferrals, campaign.calendar)),
        byId: new Map(items.map((item) => [item.id, item])),
    };
}
function rowsFor(matters, byId) {
    return matters.flatMap((matter) => {
        const item = byId.get(matter.id);
        return item === undefined ? [] : [item];
    });
}
/**
 * The at-most-three the composer presents, back as the rows a surface draws.
 *
 * Ranking, the cap and the subject collapse all happen once, in the engine, and
 * this is how a screen reads the result without re-deciding any of it.
 */
export function presentedItems(campaign, settings) {
    const { stop, byId } = composed(campaign, settings);
    return rowsFor(stop.presented, byId);
}
/**
 * Everything the President is actually owed: the three, then what is queued
 * behind them.
 *
 * Ambient rows are not here and that is the point. A press number that drifted
 * and an election eleven months out reach the feed and the Record; a chapter
 * headed NEEDS YOU that listed them would be teaching the player that the
 * heading is decoration. What the chapter draws is the stop, and the count
 * under it is what the stop is holding back.
 */
export function owedItems(campaign, settings) {
    const { stop, byId } = composed(campaign, settings);
    return [...rowsFor(stop.presented, byId), ...rowsFor(stop.deferred, byId)];
}
