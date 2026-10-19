import { compareDates, selectLedger } from "@admin/engine";
// When a decision on the desk was first shown to the President, independent
// of whether it was answered the day it arrived.
//
// No second stamp exists for this: putting a matter off is recorded on the
// ledger like any other act (`deferMatterPacket`, `stop-brief.ts`), which
// `apply()` dates the ordinary way (`causal.createdDate`). The earliest such
// "Put off" entry for this subject is the day the President first saw it and
// chose not now; a decision never put off has no such entry, and is filed
// today.
/** The description `deferMatterPacket` writes for a put-off matter, given its subject. */
function putOffDescription(subject) {
    return `Put off: ${subject}.`;
}
export function scenarioFiledDate(campaign, subject) {
    const description = putOffDescription(subject);
    const earliest = selectLedger(campaign)
        .filter((entry) => entry.actor === "player" && entry.description === description && entry.causal)
        .reduce((earliest, entry) => {
        const date = entry.causal.createdDate;
        return earliest === undefined || compareDates(date, earliest) < 0 ? date : earliest;
    }, undefined);
    return earliest ?? campaign.calendar;
}
