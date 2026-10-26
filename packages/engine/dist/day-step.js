import { tariffAuthorityPhase } from "./tariff-orders.js";
import { emergencyExpiryPhase } from "./emergency.js";
import { advanceImpactEvents } from "./impact-lifecycle.js";
import { expireTradeMeasures } from "./trade-effects.js";
import { resolveDueInstruments } from "./instrument-issued.js";
// One calendar day. The office-day group runs only when the phases carry a
// layout; otherwise the week still ticks as one list on the seventh day.
import { addDays, campaignFoundingDate, daysBetween } from "./clock.js";
import { campaignIsOver, holdElectionsDueToday } from "./elections.js";
import { resolveDueAuthorizations } from "./force-authorization.js";
import { resolveDueLobbying } from "./lobbying-due.js";
import { resolveDuePress } from "./press-issued.js";
import { resolveDueTreaties } from "./treaties.js";
import { orderExpiryPhase } from "./order-lifecycle.js";
import { DAYS_PER_TURN, closeWeek, openWeek, runPhase, tickWeek } from "./turn-loop.js";
function stepCalendar(state) {
    const dated = state.foundingDate ? state : { ...state, foundingDate: campaignFoundingDate(state) };
    const next = { ...dated, calendar: addDays(dated.calendar, 1) };
    const afterExpiry = runPhase(runPhase(next, emergencyExpiryPhase, next.turn), orderExpiryPhase, next.turn);
    const afterLobby = resolveDueLobbying(afterExpiry);
    const afterPress = resolveDuePress(afterLobby.campaign);
    const afterTreaties = resolveDueTreaties(afterPress.campaign);
    const afterAuthorizations = resolveDueAuthorizations(afterTreaties.campaign);
    const afterInstruments = resolveDueInstruments(afterAuthorizations.campaign).campaign;
    const afterClocks = runPhase(afterInstruments, tariffAuthorityPhase, next.turn);
    return holdElectionsDueToday(advanceImpactEvents(expireTradeMeasures(afterClocks)));
}
function rememberOpening(state) {
    if (state.week)
        return state;
    return { ...state, week: openWeek(state) };
}
function runOfficeDay(state, phases, day) {
    const opened = day === 1 ? rememberOpening(state) : state;
    const after = runPhase(opened, phases.days?.[day - 1] ?? [], opened.turn + 1);
    if (day !== DAYS_PER_TURN || !after.week)
        return after;
    return closeWeek(after, phases, after.week);
}
/** Advances the calendar one day, then the week's work that belongs to that day. */
export function advanceOneDay(state, phases) {
    const working = stepCalendar(state);
    if (campaignIsOver(working))
        return working;
    const elapsed = daysBetween(campaignFoundingDate(working), working.calendar);
    if (elapsed <= 0)
        return working;
    if (!phases.days)
        return elapsed % DAYS_PER_TURN === 0 ? tickWeek(working, phases) : working;
    return runOfficeDay(working, phases, ((elapsed - 1) % DAYS_PER_TURN) + 1);
}
