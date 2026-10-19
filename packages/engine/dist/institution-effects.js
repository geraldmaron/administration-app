import { currentEventId } from "./causality.js";
import { institutionDef, deriveImplementationQuality, leaderCompetenceOf, leadsInstitution, officeInstitution, seatOfficer } from "./institutions.js";
function withDerived(people, runtime, changes) {
    const next = { ...runtime, ...changes };
    const def = institutionDef(runtime.id);
    // Implementation quality is never written by a caller: it is what the other
    // fields add up to, so a handler that let one through would let a surface
    // claim delivery the state does not support.
    return def ? { ...next, implementationQuality: deriveImplementationQuality(next, def, leaderCompetenceOf({ people }, next)) } : next;
}
/**
 * File the week's instructions, and stamp each one onto the body it was given
 * to.
 *
 * The join is written here rather than by the caller for the reason
 * `seatCabinetOffice` seats a minister in both records at once: a directive
 * that existed in the store and not on the institution would be an instruction
 * no screen reading the agency could find.
 */
function fileDirectives(state, institutions, filed) {
    const directives = { ...(state.directives ?? {}) };
    const next = { ...institutions };
    for (const directive of filed) {
        directives[directive.id] = directive;
        const runtime = next[directive.institution];
        if (!runtime || runtime.directives.includes(directive.id))
            continue;
        next[directive.institution] = { ...runtime, directives: [...runtime.directives, directive.id] };
    }
    return { directives, institutions: next };
}
export function applyInstitution(state, effect) {
    let institutions = state.institutions;
    let directives = state.directives;
    if (effect.directives && effect.directives.length > 0) {
        const filed = fileDirectives(state, institutions, effect.directives);
        directives = filed.directives;
        institutions = filed.institutions;
    }
    if (effect.ticks) {
        const next = { ...institutions };
        for (const tick of effect.ticks) {
            const runtime = next[tick.id];
            if (!runtime)
                continue;
            next[tick.id] = { ...runtime, ...tick.changes };
        }
        institutions = next;
    }
    if (effect.actingLapsed && effect.actingLapsed.length > 0) {
        const next = { ...institutions };
        for (const id of effect.actingLapsed) {
            const runtime = next[id];
            if (!runtime)
                continue;
            // The authority lapses, the office does not fill itself: what is left is
            // a vacancy with nobody signing, which is the actual consequence the
            // Vacancies Act's time limit produces.
            const { actingLeader: _dropped, actingExpiresDay: _expired, ...rest } = runtime;
            next[id] = withDerived(state.people, rest, { vacancy: true });
        }
        institutions = next;
    }
    if (effect.institution && (effect.changes || effect.vacate)) {
        const runtime = institutions[effect.institution];
        if (runtime) {
            const { leader: _departed, actingLeader: _acting, actingExpiresDay: _expires, ...emptied } = runtime;
            // The vacancy clock restarts from the removal rather than carrying the
            // last one's total: what the delivery reading is about is how long
            // nobody has been in this chair.
            const base = effect.vacate ? emptied : runtime;
            const changes = effect.vacate
                ? { vacancy: true, vacantDays: 0, ...effect.changes }
                : effect.changes;
            institutions = { ...institutions, [effect.institution]: withDerived(state.people, base, changes) };
        }
    }
    const services = effect.services && effect.services.length > 0
        ? { ...(state.services ?? {}), ...Object.fromEntries(effect.services.map((service) => [service.id, service])) }
        : state.services;
    const projects = effect.projects && effect.projects.length > 0
        ? { ...(state.projects ?? {}), ...Object.fromEntries(effect.projects.map((program) => [program.id, program])) }
        : state.projects;
    if (institutions === state.institutions && directives === state.directives && services === state.services && projects === state.projects)
        return state;
    return { ...state, institutions, directives, ...(services ? { services } : {}), ...(projects ? { projects } : {}) };
}
// A confirmed leader lifts morale a little: the building reads it as being
// taken seriously, whoever the person is.
const CONFIRMATION_MORALE_LIFT = 0.05;
/**
 * Confirmation is the moment the institution stops being headless. The body,
 * its cabinet chair where it has one, and the person all move through the one
 * writer (`seatOfficer`), or a confirmed officer still reads as unseated to
 * anything walking the cast — the confirmed Administrator of FEMA offered for
 * the CDC the next time the President filled a vacancy.
 *
 * Only the office a body's leader holds seats anybody. A deputy's office has no
 * record of its own to seat, and treating it as the top chair made a confirmed
 * Deputy Secretary the Secretary, displacing whoever the Senate was about to
 * confirm for the chair itself.
 */
function seatConfirmed(state, nomination) {
    const institution = officeInstitution(nomination.office);
    const before = institution ? state.institutions[institution.id] : undefined;
    if (!institution || !before || !leadsInstitution(nomination.office))
        return state;
    const seated = seatOfficer(state, institution.id, nomination.nominee);
    const led = seated.institutions[institution.id];
    const judicial = institution.kind === "judiciary"
        ? { judicialProvenance: { serviceStartYear: state.calendar.year, appointingParty: state.congress.administrationParty }, judicialAssessmentYear: state.calendar.year }
        : {};
    const lowerBenchSeat = before.lowerBenchSeat
        ? { lowerBenchSeat: { ...before.lowerBenchSeat, appointingParty: state.congress.administrationParty } }
        : {};
    return {
        ...seated,
        institutions: {
            ...seated.institutions,
            [institution.id]: withDerived(seated.people, led, { morale: Math.min(1, before.morale + CONFIRMATION_MORALE_LIFT), ...judicial, ...lowerBenchSeat }),
        },
    };
}
export function applyNomination(state, effect) {
    let nominations = state.nominations;
    let confirmed;
    if (effect.nomination) {
        // The event that sent the name up, written here because it is only
        // knowable inside the fold. The confirmation phase reads it back off
        // months later to name what it is finishing.
        const event = currentEventId();
        const opened = effect.nomination.causedBy === undefined && event !== undefined
            ? { ...effect.nomination, causedBy: event }
            : effect.nomination;
        nominations = { ...nominations, [opened.id]: opened };
    }
    if (effect.advance) {
        const existing = nominations[effect.advance.id];
        if (existing) {
            const advanced = {
                ...existing,
                stage: effect.advance.stage,
                stageEnteredDay: effect.advance.day,
                history: [
                    ...existing.history,
                    { stage: effect.advance.stage, day: effect.advance.day, note: effect.advance.note },
                ],
                ...(effect.advance.outcome ? { outcome: effect.advance.outcome } : {}),
            };
            nominations = { ...nominations, [effect.advance.id]: advanced };
            if (effect.advance.stage === "confirmed")
                confirmed = existing;
        }
    }
    if (nominations === state.nominations)
        return state;
    const next = { ...state, nominations };
    return confirmed ? seatConfirmed(next, confirmed) : next;
}
