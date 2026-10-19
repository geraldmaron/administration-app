import { IDEOLOGY_AXES } from "@admin/world";
import { EXECUTIVE_ORDERS, executiveOrder } from "./orders.js";
import { PRESS_ACT_MEMORY_TURNS, outletReading } from "./press-beliefs.js";
export const DECISION_FRAMINGS = {
    resolve: {
        key: "resolve",
        name: "Resolve",
        line: "This administration decided, and it will not be talked out of it.",
        pull: { authLibertarian: 0.6, nationalistGlobalist: 0.3 },
    },
    restraint: {
        key: "restraint",
        name: "Restraint",
        line: "The President did less than the office allows, on purpose.",
        pull: { authLibertarian: -0.6, nationalistGlobalist: -0.1 },
    },
    necessity: {
        key: "necessity",
        name: "Necessity",
        line: "Nothing about this was chosen. It was the only course still open.",
        pull: { authLibertarian: 0.3, nationalistGlobalist: -0.3 },
    },
    regret: {
        key: "regret",
        name: "Regret",
        line: "The President is sorry it came to this, and says so plainly.",
        pull: { authLibertarian: -0.35, economicLeftRight: -0.35 },
    },
};
export const DECISION_FRAMING_KEYS = Object.keys(DECISION_FRAMINGS);
/** How far back the podium can reach for an act to explain. */
export const FRAMING_WINDOW_TURNS = 2;
/**
 * How long a framing stands before the desks have read the order themselves.
 * One week: the podium leads the evening bulletins, and the text is filed by
 * the time the Sunday pieces are written.
 */
export const FRAMING_SCRUTINY_TURNS = 1;
/**
 * How far a framing can carry a desk. Smaller than PRESS_BELIEF_WEIGHT (0.4)
 * because it has to be: an administration that could talk its way to the same
 * place signing nothing would make the record decorative.
 */
export const FRAMING_WEIGHT = 0.15;
/**
 * What a caught framing costs, as a multiple of what it bought.
 *
 * Above one, and that is the whole design: a president who framed honestly and
 * a president who framed a retreat as resolve must not end the month in the
 * same place, and the second must not end it merely back where an unframed act
 * would have left them. The desks that ran the line are the ones with a
 * correction to write.
 */
export const FRAMING_BACKLASH = 1.75;
/** What being caught costs at every desk, including the ones that never bought it. */
export const FRAMING_CREDIBILITY_HIT = 0.25;
/**
 * How far a framing has to argue against its own act before it is a lie rather
 * than a gloss. Small, but not zero: a framing is allowed to be a reading of an
 * act, and only an argument pointing the other way is a contradiction.
 */
export const FRAMING_CONTRADICTION_THRESHOLD = 0.1;
const clamp11 = (value) => Math.max(-1, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * Whether the framing points the opposite way to the act it is put on.
 *
 * The one contradiction class this models, and it is mechanical rather than
 * interpretive: the act's authored alignment and the framing's authored pull
 * are two vectors in the same space, and their fold is negative exactly when
 * the podium is arguing against the page the President signed. Framing a
 * withdrawal of executive power as resolve is the case it was built for.
 */
export function framingContradicts(alignment, framing) {
    const pull = DECISION_FRAMINGS[framing].pull;
    const shared = IDEOLOGY_AXES.filter((axis) => (alignment[axis] ?? 0) !== 0 && (pull[axis] ?? 0) !== 0);
    if (shared.length === 0)
        return false;
    const fold = shared.reduce((sum, axis) => sum + alignment[axis] * pull[axis], 0) / shared.length;
    return fold <= -FRAMING_CONTRADICTION_THRESHOLD;
}
/** Whether this record's framing argues against the order it sits on. */
function recordContradicts(record) {
    const order = EXECUTIVE_ORDERS.find((entry) => entry.id === record.order);
    return record.framing !== undefined && order !== undefined && framingContradicts(order.alignment, record.framing.framing);
}
/** The framed acts still inside the window the desks are arguing about. */
function framedInWindow(campaign) {
    return campaign.orders.filter((record) => record.framing !== undefined && campaign.turn - record.framing.turn <= PRESS_ACT_MEMORY_TURNS);
}
/** Whether the desks have had time to read the order behind a framing. */
function caught(campaign, record) {
    return (recordContradicts(record) && campaign.turn >= (record.framing?.turn ?? 0) + FRAMING_SCRUTINY_TURNS);
}
/**
 * What one masthead makes of how this administration has been explaining
 * itself, signed the way `outletReading` is signed.
 *
 * A framing still standing is read as the argument it is: the desk that agrees
 * with it moves toward the administration and the desk it was never going to
 * persuade moves away. A framing the record has since contradicted is read as
 * the correction it became — every desk is worse off than if the act had gone
 * unexplained, and the desks that ran the line are worst off, which is the term
 * that makes framing a retreat as resolve a decision rather than free upside.
 */
export function outletFramingReading(campaign, beliefs) {
    const total = framedInWindow(campaign).reduce((sum, record) => {
        const read = outletReading(beliefs, DECISION_FRAMINGS[record.framing.framing].pull);
        if (!caught(campaign, record))
            return sum + read;
        return sum + Math.min(read, 0) - Math.max(read, 0) * FRAMING_BACKLASH - FRAMING_CREDIBILITY_HIT;
    }, 0);
    return round3(clamp11(total));
}
/** The acts the podium could still explain: signed recently, and not yet framed. */
export function frameableOrders(campaign) {
    return campaign.orders.filter((record) => record.framing === undefined && campaign.turn - record.turn <= FRAMING_WINDOW_TURNS);
}
/** Whether the administration has already put a framing on something this week. */
export function framedThisWeek(campaign) {
    return campaign.orders.some((record) => record.framing?.turn === campaign.turn);
}
/**
 * What the player reads before saying it, holding the contract `projectOrder`
 * and `projectPressAction` hold: this is the only estimator, and the framing
 * itself writes nothing this does not show.
 *
 * The contradiction is disclosed rather than hidden, and that is deliberate. A
 * president knows whether the sentence they are about to read out is true; the
 * interesting decision is saying it anyway, and a screen that concealed the
 * risk would be inventing an ignorance the office does not have.
 */
export function projectFraming(campaign, record, framing, outlets, targetOf) {
    const framed = {
        ...campaign,
        orders: campaign.orders.map((entry) => entry.id === record.id ? { ...entry, framing: { framing, turn: campaign.turn } } : entry),
    };
    const order = executiveOrder(record.order);
    const contradicts = order ? framingContradicts(order.alignment, framing) : false;
    return {
        framing: DECISION_FRAMINGS[framing],
        order: record,
        contradicts,
        movements: outlets.map((outlet) => ({
            outlet,
            target: targetOf(campaign, outlet),
            framedTarget: targetOf(framed, outlet),
        })),
        reasoning: contradicts
            ? `The order itself argues the other way. The desks have the text, and in ${FRAMING_SCRUTINY_TURNS} week they will have read it — the ones that ran this line will run the correction harder.`
            : "The order supports the line. Each desk moves as far as it believes what the line says.",
    };
}
function framingItem(campaign, name, def) {
    return {
        turn: campaign.turn,
        kind: "player-action",
        visibility: "public",
        headline: `The White House explains ${name} as a matter of ${def.name.toLowerCase()}.`,
        target: campaign.founding.nation,
        facts: { stake: `how the administration says it meant ${name}` },
    };
}
/**
 * Put a framing on an act, on the record.
 *
 * Writes the framing onto the order's own ledger entry and nothing else: no
 * metric, no cost, no outcome. One act a week, because the podium makes one
 * statement a week, and never a second framing on the same act — an
 * administration that could keep re-explaining the same order until a desk
 * agreed would be arguing with the record rather than standing on it.
 */
export function frameDecision(campaign, recordId, framing) {
    const record = campaign.orders.find((entry) => entry.id === recordId);
    if (!record)
        return { ok: false, reason: "That act is not on this administration's record." };
    if (record.framing)
        return { ok: false, reason: "That act has already been explained, and the record stands." };
    if (campaign.turn - record.turn > FRAMING_WINDOW_TURNS) {
        return { ok: false, reason: "That act is too old to be the subject of this week's briefing." };
    }
    if (framedThisWeek(campaign)) {
        return { ok: false, reason: "The podium has already explained one act this week." };
    }
    const order = executiveOrder(record.order);
    if (!order)
        return { ok: false, reason: "That act is not one of the orders in the catalogue." };
    const def = DECISION_FRAMINGS[framing];
    const contradicts = framingContradicts(order.alignment, framing);
    const summary = `${order.name} is put to the country as a matter of ${def.name.toLowerCase()}. ${def.line}`;
    return {
        ok: true,
        framing: def,
        contradicts,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary },
            effects: [
                { kind: "orderFraming", id: record.id, framing: { framing, turn: campaign.turn } },
                { kind: "feed", items: [framingItem(campaign, order.name, def)] },
            ],
        },
    };
}
/**
 * The framings the record catches up with this week, reported once.
 *
 * Dated off the framing rather than accumulated, for the reason the press
 * drivers are derived: a correction the campaign remembers having run is a
 * stale flag, and a correction computed from the record is the record.
 */
export function framingCaughtItems(campaign, turn) {
    return campaign.orders.flatMap((record) => {
        if (!record.framing || !recordContradicts(record))
            return [];
        if (record.framing.turn + FRAMING_SCRUTINY_TURNS !== turn)
            return [];
        const name = executiveOrder(record.order)?.name ?? record.order;
        const def = DECISION_FRAMINGS[record.framing.framing];
        return [
            {
                turn,
                kind: "press",
                visibility: "public",
                headline: `The text of ${name} does not say what the White House said it said.`,
                target: campaign.founding.nation,
                facts: { stake: `the administration called ${name} a matter of ${def.name.toLowerCase()}` },
            },
        ];
    });
}
