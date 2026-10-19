import { addDays, apply, compareDates, dispositionCase, inShutdown, isOpenCase, withRaisedCase, withdrawNomination, answerLowerOrderReview, } from "@admin/engine";
import { COMMODITY_EASED } from "./family-commodity";
import { authoredCourtResponseIds, familySources } from "./family-sources";
// The case registry kept in step with the families' own records. A source
// appearing raises its case; a source that is gone closes it with what
// actually happened; every disposition the Desk offers writes the case and
// the attention record together, so a matter put off in one place is put off
// in the other.
export const FAMILY_KINDS = new Set(["bill", "nomination", "budget", "emergency", "foreign-request", "court-response"]);
function billSettlement(campaign, item) {
    const bill = campaign.bills[item.subject.id];
    if (bill?.status === "law" && bill.enactedBy === "unsigned")
        return { disposition: { kind: "allow-default" }, narration: "Became law without a signature." };
    if (bill?.status === "law")
        return { disposition: { kind: "act", actionId: "signed" }, narration: "Signed into law." };
    if (bill?.status === "vetoed" || bill?.override !== undefined)
        return { disposition: { kind: "act", actionId: "vetoed" }, narration: "Vetoed and sent back to Congress." };
    // Past its tenth day and waiting only for the chamber to record it.
    if (bill?.status === "on-the-desk")
        return { disposition: { kind: "allow-default" }, narration: "The ten days ran out, so it becomes law without a signature." };
    return { disposition: { kind: "allow-default" }, narration: "Left the desk." };
}
function nominationSettlement(campaign, item) {
    const stage = campaign.nominations[item.subject.id]?.stage;
    if (stage === "withdrawn")
        return { disposition: { kind: "decline" }, narration: "The nomination was withdrawn." };
    return { disposition: { kind: "act", actionId: "stood-by" }, narration: stage ? `The nomination moved on to ${stage.replace(/-/g, " ")}.` : "The nomination went on." };
}
function budgetSettlement(campaign, item) {
    if (item.subject.id.startsWith("lapse:"))
        return { disposition: { kind: "act", actionId: "reopened" }, narration: "The government reopened." };
    if (inShutdown(campaign))
        return { disposition: { kind: "allow-default" }, narration: "The money ran out." };
    return { disposition: { kind: "act", actionId: "funded" }, narration: "Funding was passed into law." };
}
function settlementFor(campaign, item) {
    // A market case whose reading came back on its own: nothing was answered,
    // and the Record should not say it was.
    if (item.subject.kind === "commodity")
        return { disposition: { kind: "allow-default" }, narration: COMMODITY_EASED };
    switch (item.kind) {
        case "bill":
            return billSettlement(campaign, item);
        case "nomination":
            return nominationSettlement(campaign, item);
        case "budget":
            return budgetSettlement(campaign, item);
        default:
            // An emergency answered, a declaration continued or ended, an allied
            // call answered: the family's own document took the act. What the world
            // settled on its own reached its deadline first and defaulted there.
            return { disposition: { kind: "act", actionId: "answered" }, narration: "Answered on its own page." };
    }
}
function openFamilyCases(campaign) {
    return Object.values(campaign.cases ?? {}).filter((item) => FAMILY_KINDS.has(item.kind) && isOpenCase(item.status));
}
function settleEffects(campaign, live) {
    return openFamilyCases(campaign)
        .filter((item) => !live.has(item.id))
        .map((item) => {
        const settled = settlementFor(campaign, item);
        const disposition = item.allowedDispositions.includes(settled.disposition.kind) ? settled.disposition : { kind: "act", actionId: "settled" };
        return { kind: "case", actor: "world", transition: { id: item.id, disposition, narration: settled.narration } };
    });
}
function raiseEffect(source) {
    return { kind: "case", actor: "world", raise: source.raise };
}
/**
 * Raises a case for every family source the registry has not seen, and closes
 * every open family case whose source is gone. The same campaign comes back
 * when nothing moved, so a caller can seat on every read path for free.
 */
export function seatFamilyCases(campaign) {
    const sources = familySources(campaign);
    const live = new Set([...sources.map((source) => source.raise.id), ...authoredCourtResponseIds(campaign)]);
    const registry = campaign.cases ?? {};
    const effects = [...settleEffects(campaign, live), ...sources.filter((source) => registry[source.raise.id] === undefined).map(raiseEffect)];
    if (effects.length === 0)
        return campaign;
    return apply(campaign, {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        background: true,
        narration: { summary: "The case registry follows the desk." },
        effects,
    });
}
/** Whether the President has already closed this case, so the matter no longer asks for anything. */
function closedByPresident(item) {
    return item !== undefined && !isOpenCase(item.status) && item.history.at(-1)?.actor === "player";
}
function preview(campaign, source) {
    return {
        ...source.raise,
        status: "raised",
        raisedAt: campaign.calendar,
        lastTouchedAt: campaign.calendar,
        causeIds: [],
        history: [{ at: campaign.calendar, from: "raised", to: "raised", actor: "world", narration: "Raised." }],
    };
}
/**
 * The Desk's case queue: every live family matter the President has not yet
 * closed, with its record. A source not yet seated reads as raised today,
 * which is what the next seat writes.
 */
export function familyQueue(campaign) {
    const registry = campaign.cases ?? {};
    return familySources(campaign)
        .filter((source) => !closedByPresident(registry[source.raise.id]))
        .map((source) => ({ source, record: registry[source.raise.id] ?? preview(campaign, source) }));
}
/** Every id a family row carries, closed or not, so a surface can keep them out of its own lists. */
export function familyRowIds(campaign) {
    return new Set(familySources(campaign).map((source) => source.raise.id));
}
/** The attention urgency a family row keeps once its case is closed: none. */
export function familyRowUrgency(campaign, source) {
    return closedByPresident(campaign.cases?.[source.raise.id]) ? "ambient" : source.row.urgency;
}
function withSeated(campaign, id) {
    if (campaign.cases?.[id] !== undefined)
        return { campaign, raise: [] };
    const source = familySources(campaign).find((candidate) => candidate.raise.id === id);
    if (source === undefined)
        return { campaign, raise: [] };
    return { campaign: withRaisedCase(campaign, source.raise, "world", undefined), raise: [raiseEffect(source)] };
}
/** The day a put-off holds to: never onto or past the case's own deadline. */
function heldUntil(item, until) {
    if (item.clock.kind === "none")
        return until;
    const lastDay = addDays(item.clock.dueAt, -1);
    return compareDates(until, lastDay) < 0 ? until : lastDay;
}
/**
 * A put-off said to the family case as well as to the attention record, for
 * the Desk's own put-off and the Chief of Staff's. Nothing when the id is not
 * a family case, the case cannot be deferred, or its deadline leaves no day.
 */
export function familyPutOffEffects(campaign, id, until) {
    const seated = withSeated(campaign, id);
    const item = seated.campaign.cases?.[id];
    if (item === undefined || !FAMILY_KINDS.has(item.kind) || !isOpenCase(item.status) || !item.allowedDispositions.includes("defer"))
        return [];
    const held = heldUntil(item, until);
    if (compareDates(held, campaign.calendar) <= 0)
        return [];
    return [...seated.raise, { kind: "case", actor: "player", transition: { id, disposition: { kind: "defer", until: held }, narration: "Put off." } }];
}
/** A week: the fixed horizon the tray's "Put off" commits to, absent a date picker. */
const TRAY_DEFER_DAYS = 7;
function deferAnswer(campaign, id) {
    const effects = familyPutOffEffects(campaign, id, addDays(campaign.calendar, TRAY_DEFER_DAYS));
    const move = effects.at(-1);
    if (move === undefined || move.kind !== "case" || move.transition?.disposition.kind !== "defer") {
        return { ok: false, reason: "Its deadline is too close to put it off." };
    }
    const until = move.transition.disposition.until;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", entities: [id], systems: ["cases"] },
            narration: { summary: `Put off: ${campaign.cases?.[id]?.title ?? "a case"}.` },
            effects: [...effects, { kind: "attention", defer: { [id]: until } }],
        },
    };
}
// Withdrawing a nomination is the nomination's own act: the case records the
// decline only because the engine actually pulled the name back.
function withdrawAnswer(campaign, item, raise) {
    const withdrawn = withdrawNomination(campaign, item.subject.id);
    if (!withdrawn.ok)
        return withdrawn;
    const decline = { kind: "case", actor: "player", transition: { id: item.id, disposition: { kind: "decline" }, narration: "The nomination was withdrawn." } };
    return { ok: true, packet: { ...withdrawn.packet, effects: [...raise, ...withdrawn.packet.effects, decline] } };
}
/** Commits one tray disposition on a family case, raising the case first where the registry has not seen it yet. */
export function familyDisposition(campaign, id, kind) {
    if (kind === "defer")
        return deferAnswer(campaign, id);
    const seated = withSeated(campaign, id);
    const item = seated.campaign.cases?.[id];
    if (item === undefined)
        return { ok: false, reason: "We couldn't find that case." };
    if (kind === "decline" && item.kind === "nomination")
        return withdrawAnswer(campaign, item, seated.raise);
    if (kind === "allow-default" && item.kind === "court-response")
        return answerLowerOrderReview(seated.campaign, item.subject.id, "accept");
    const answer = dispositionCase(seated.campaign, id, { kind });
    if (!answer.ok)
        return answer;
    return { ok: true, packet: { ...answer.packet, effects: [...seated.raise, ...answer.packet.effects] } };
}
