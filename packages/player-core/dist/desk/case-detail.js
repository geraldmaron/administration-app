import { compareDates, isDeferred, isOpenCase } from "@admin/engine";
import { deferMatterPacket } from "../campaign/stop-brief";
import { attentionItems, matterFor } from "./attention";
import { familyRowViewModel } from "./case-rows";
import { familyDisposition, familyQueue } from "./family-cases";
// The single case a president would open first, read whole: the header, the
// clock, the door to the family's own document and the tray of generic
// answers the family's contract allows. The act itself — signing, funding,
// answering — stays on the document that prices it.
/** The dispositions this compact view commits without a picker: "act" is the door, "delegate" needs a chosen body. */
export const CASE_TRAY_DISPOSITIONS = ["defer", "decline", "allow-default"];
// Each family's generic answers in the words the office uses for them.
const LABELS = {
    bill: { "allow-default": "Let it become law unsigned" },
    nomination: { decline: "Withdraw the nomination" },
    budget: { "allow-default": "Let the money run out" },
    emergency: { decline: "Decline federal help", "allow-default": "Let the request lapse" },
    "foreign-request": { decline: "Decline the call", "allow-default": "Let the deadline pass" },
    "court-response": { "allow-default": "Accept the lower judgment" },
};
// Held off by the case's own deferral, or by the Desk's put-off alone where
// the deadline left the case no day to be deferred to.
function heldOffOn(entry, campaign) {
    if (isDeferred(campaign.deferrals, entry.source.raise.id, campaign.calendar))
        return true;
    return entry.record.deferredUntil !== undefined && compareDates(entry.record.deferredUntil, campaign.calendar) > 0;
}
function dueOf(entry) {
    return entry.record.clock.kind === "none" ? undefined : entry.record.clock.dueAt;
}
/**
 * The case to open first: one that holds the week, then the nearest clock,
 * then the oldest standing matter. A case already put off waits behind the rest.
 */
export function leadCase(campaign) {
    const rank = (entry) => (heldOffOn(entry, campaign) ? 2 : entry.source.row.urgency === "hard" ? 0 : 1);
    return [...familyQueue(campaign)].sort((a, b) => {
        const byRank = rank(a) - rank(b);
        if (byRank !== 0)
            return byRank;
        const [dueA, dueB] = [dueOf(a), dueOf(b)];
        if (dueA && dueB)
            return compareDates(dueA, dueB);
        if (dueA || dueB)
            return dueA ? -1 : 1;
        return compareDates(a.record.raisedAt, b.record.raisedAt);
    })[0];
}
const WORD = { defer: "Put off a week", decline: "Decline", "allow-default": "Let it happen" };
export function caseDetail(campaign, entry) {
    const { record } = entry;
    const open = isOpenCase(record.status);
    // A case already put off is not offered the put-off again until it comes back.
    const heldOff = heldOffOn(entry, campaign);
    return {
        ...familyRowViewModel(campaign, entry),
        clockKind: record.clock.kind,
        reason: entry.source.row.reason,
        options: open
            ? CASE_TRAY_DISPOSITIONS.filter((kind) => record.allowedDispositions.includes(kind) && !(kind === "defer" && heldOff)).map((kind) => ({ kind, label: LABELS[record.kind]?.[kind] ?? WORD[kind] }))
            : [],
        guardStates: entry.source.guardStates ?? [],
        ...(entry.source.context ? { context: entry.source.context } : {}),
        ...(record.clock.kind === "none" ? {} : { dueDate: record.clock.dueAt }),
        ...(heldOff ? { heldUntil: campaign.deferrals[record.id] ?? record.deferredUntil } : {}),
    };
}
/** Every queue entry after the lead, read whole, so each row carries its own put-off. */
export function caseDetails(campaign) {
    return familyQueue(campaign)
        .map((entry) => caseDetail(campaign, entry))
        .sort((a, b) => (a.clock?.daysRemaining ?? Infinity) - (b.clock?.daysRemaining ?? Infinity) || b.ageDays - a.ageDays);
}
/**
 * Commits one of the tray's generic dispositions against a live case. A
 * put-off is the Desk's own put-off, which writes the attention record the
 * engine stops on and the case together; the rest go through the case.
 */
export function commitCaseDisposition(campaign, id, kind) {
    if (kind === "defer") {
        const row = attentionItems(campaign).find((item) => item.id === id);
        // An ambient matter stops nothing, so there is no attention record to hold;
        // it is put off on the case alone.
        if (row && row.urgency !== "ambient")
            return { ok: true, packet: deferMatterPacket(campaign, matterFor(row, campaign.calendar)) };
    }
    return familyDisposition(campaign, id, kind);
}
