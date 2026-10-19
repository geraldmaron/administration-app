import { closingDayOnOrAfter, daysBetween, isSameDate, } from "@admin/engine";
// The player's own settings, applied to the engine's candidates before they
// compete for a stop — never to what the engine already chose to present:
// filtering after composition would let a "wait" matter hide behind a
// "pause" one it collided with and never resurface, and every de-duplication
// and the cap of three would already have run against a list the settings
// had not touched yet.
//
// Kept pure over its own inputs (matter, date, settings, founding date)
// rather than reaching into a campaign or a store, so a future caller that
// decides an arrival day instead of a Continue press can reuse it unchanged.
/** How close to its own deadline a "wait" matter is allowed to sit unseen before it gets its one last call. */
export const LAST_CALL_DAYS = 2;
/**
 * Every kind the engine's union has, in the order a settings screen lists
 * them. A separate runtime array rather than a cast off the type, because the
 * type-level check below fails to compile the day `AttentionSource` grows a
 * member this array has not: a settings row cannot silently stay a member
 * short.
 */
export const ATTENTION_SOURCES = [
    "constitutional-deadline",
    "appropriations-deadline",
    "bill-signature",
    "nomination",
    "court-ruling",
    "intelligence-warning",
    "military-escalation",
    "treaty-deadline",
    "agency-request",
    "governor-request",
    "market-threshold",
    "standing-threshold",
    "disaster",
    "diplomatic-request",
    "consequence-return",
    "investigation",
    "pledge",
    "scandal",
    "incident",
    "resignation-offer",
    "market-shock",
    "coup",
    "scenario",
];
const _attentionSourcesExhaustive = true;
void _attentionSourcesExhaustive;
/**
 * The kind this presidency has no setting for yet. A staged decision carries
 * no deadline of its own — nothing has stamped one on it — so a "wait" or
 * "log" setting would either vanish it forever or hold it past the moment the
 * director staged it for. It always behaves as "pause" and always shows its
 * own reason, whatever a stored preference says.
 */
const POLICY_EXEMPT = new Set(["scenario"]);
/**
 * The game's own opening position for each kind, read when the player has not
 * set one: a hard matter (which this policy never touches anyway), a
 * disaster, an escalation or an intelligence warning interrupts on arrival;
 * everything else waits for its last call.
 */
const PAUSE_BY_DEFAULT = new Set([
    "constitutional-deadline",
    "appropriations-deadline",
    "bill-signature",
    "military-escalation",
    "intelligence-warning",
    "disaster",
    "scandal",
    "incident",
    "market-shock",
    "coup",
    "scenario",
]);
export function defaultAttentionSetting(source) {
    return PAUSE_BY_DEFAULT.has(source) ? "pause" : "wait";
}
function settingFor(source, settings) {
    return settings?.[source] ?? defaultAttentionSetting(source);
}
/**
 * Whether "log" is a real answer for this kind, offered on the settings
 * screen only where both hold: nothing here ever carries a deadline (so "log"
 * cannot silently drop an obligation nobody chose to be told about), and
 * nothing here prices staying silent (the exemption above already covers the
 * one kind that does).
 */
const LOG_ELIGIBLE = new Set([
    "market-threshold",
    "standing-threshold",
    "agency-request",
    "diplomatic-request",
    "investigation",
]);
export function logEligible(source) {
    return LOG_ELIGIBLE.has(source);
}
/**
 * One candidate, filtered against the player's settings.
 *
 * Hard and ambient matters pass through untouched: a hard matter can never be
 * muted, and composition already keeps ambient out of the running. A soft
 * matter set to "pause" also passes through: that is what "stop on arrival"
 * already means, so pause changes nothing about how the matter competes.
 * "Log" removes it from the running entirely; the row still exists for
 * whoever reads the log, but it never stops Continue. "Wait" holds it back
 * until its own last call — and, if that deadline is missed anyway, drops it
 * to the founding weekday's cadence rather than presenting it again on every
 * subsequent day, the same cadence a matter with no setting at all falls back
 * to once its own deadline has passed unattended.
 */
function applyOne(matter, settings, date, foundingDate) {
    if (matter.urgency !== "soft" || POLICY_EXEMPT.has(matter.source))
        return matter;
    const setting = settingFor(matter.source, settings);
    if (setting === "pause")
        return matter;
    if (setting === "log")
        return undefined;
    // "wait": nothing to wait against never earns a last call, so it never
    // competes for the three — the same answer "log" gives it, until something
    // can say when a matter with no deadline has waited long enough.
    if (matter.dueDate === undefined)
        return undefined;
    const daysLeft = daysBetween(date, matter.dueDate);
    if (daysLeft > LAST_CALL_DAYS)
        return undefined;
    if (daysLeft >= 0)
        return matter;
    return isSameDate(date, closingDayOnOrAfter(date, foundingDate)) ? matter : undefined;
}
/**
 * The candidates a stop may actually be composed from, after the player's
 * settings have run.
 *
 * Called before `composeAttentionStop`, by every source that raises matters
 * (`applyAttentionPolicy` over the desk's own matter source) and by every
 * surface that reads what the desk owes (`presentedItems`, `owedItems`), so
 * the two never disagree about what a "wait" setting is currently holding
 * back.
 */
export function applyAttentionPolicy(matters, settings, date, foundingDate) {
    return matters.flatMap((matter) => {
        const kept = applyOne(matter, settings, date, foundingDate);
        return kept ? [kept] : [];
    });
}
