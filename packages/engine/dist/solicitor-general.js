export const SOLICITOR_GENERAL_BASELINE = 50;
const MAX_EVENTS = 24;
export function solicitorGeneralStanding(record) {
    return record?.standing ?? SOLICITOR_GENERAL_BASELINE;
}
export function solicitorGeneralAssessment(standing) {
    return standing < 40 ? "strained" : standing >= 60 ? "strong" : "mixed";
}
/** At most seven percentage points either way; this is a game parameter, not an observed court rate. */
export function standingAdjustment(record) {
    return Math.round((solicitorGeneralStanding(record) - SOLICITOR_GENERAL_BASELINE) * 0.2) / 100;
}
export function recordSolicitorGeneral(record, event) {
    if (record?.events.some((entry) => entry.proceedingId === event.proceedingId && entry.kind === event.kind))
        return record;
    return { standing: Math.min(85, Math.max(15, solicitorGeneralStanding(record) + event.change)),
        events: [...(record?.events ?? []), event].slice(-MAX_EVENTS) };
}
