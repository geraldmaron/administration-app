import { EMERGENCY_NOTICE_TURNS, EMERGENCY_RENEWAL_TURNS, hazardLabel, emergencyCauseLabel, liveCauses, renewalIsOpen, selectDateOfTurn, selectDeclaredEmergencies, underDeclaredEmergency, weeklyStandingCost, weeksToLapse, } from "@admin/engine";
import { STATE_IDS, stateById } from "@admin/world";
import { WILLINGNESS_WORDS } from "../act/preview";
import { guardRequestCandidates } from "../desk/attention-requests";
import { conditionReadings } from "../world/board-state";
// The emergency board: every declaration in force with its renewal window and
// what it costs this week, every condition running at home and whether it
// could carry a declaration, the incidents, and the states a Guard
// federalization could be asked of. The acts and their comparisons are
// `emergency-choices.ts`.
/** Where a declaration reaches, in words. */
export function scopeWords(scope) {
    return scope.kind === "nation" ? "The whole country" : (stateById.get(scope.state)?.name ?? scope.state);
}
/** The camera key for a scope. */
export function scopeCamera(scope) {
    return scope.kind === "nation" ? "us" : `state:${scope.state}`;
}
function declarationRow(campaign, emergency) {
    const left = weeksToLapse(emergency, campaign.turn);
    return {
        id: emergency.id,
        scope: emergency.scope,
        where: scopeWords(emergency.scope),
        cause: emergency.cause,
        causeLabel: emergencyCauseLabel(emergency.cause),
        declared: selectDateOfTurn(campaign, emergency.declaredTurn),
        weeksStanding: Math.max(0, campaign.turn - emergency.declaredTurn),
        weeksToLapse: left,
        lapses: selectDateOfTurn(campaign, emergency.renewedTurn + EMERGENCY_RENEWAL_TURNS),
        renewalOpen: renewalIsOpen(emergency, campaign.turn),
        renewalOpensIn: Math.max(0, left - EMERGENCY_NOTICE_TURNS),
        weeklyCost: weeklyStandingCost(emergency, campaign.turn),
        causeRunning: emergency.cause === "armed-conflict"
            ? Object.values(campaign.conflicts).some((conflict) => conflict.id === emergency.armedForcesConflictId && conflict.status === "active")
            : liveCauses(campaign, emergency.scope).some((condition) => condition.kind === emergency.cause),
        camera: scopeCamera(emergency.scope),
    };
}
/** Every declaration in force, the one closest to lapsing first. */
export function declarationRows(campaign) {
    return selectDeclaredEmergencies(campaign)
        .map((emergency) => declarationRow(campaign, emergency))
        .sort((a, b) => a.weeksToLapse - b.weeksToLapse || a.id.localeCompare(b.id));
}
function scopesFor(campaign, reading) {
    const candidates = [...(reading.state ? [{ kind: "state", state: reading.state }] : []), { kind: "nation" }];
    return candidates.flatMap((scope) => {
        const live = liveCauses(campaign, scope).some((condition) => condition.id === reading.id);
        const held = underDeclaredEmergency(campaign, scope.kind === "state" ? scope.state : undefined);
        return live && !held ? [{ scope, where: scopeWords(scope) }] : [];
    });
}
function boardRow(campaign, reading) {
    return {
        ...reading,
        declarable: scopesFor(campaign, reading),
        covered: underDeclaredEmergency(campaign, reading.state),
        camera: reading.state ? `state:${reading.state}` : "us",
    };
}
export function emergencyBoard(campaign) {
    const rows = conditionReadings(campaign).map((reading) => boardRow(campaign, reading));
    const declarations = declarationRows(campaign);
    return {
        declarations,
        conditions: rows.filter((row) => !row.incident),
        incidents: rows.filter((row) => row.incident),
        guard: guardRequestCandidates(campaign).map((candidate) => ({
            state: candidate.state,
            stateName: candidate.stateName,
            conditionLabel: hazardLabel(candidate.condition.kind),
            forecast: WILLINGNESS_WORDS[candidate.forecast.forecast],
        })),
        weeklyCost: declarations.reduce((sum, row) => sum + row.weeklyCost, 0),
    };
}
/**
 * Conditions by state, for the map: each state's worst running condition and
 * whether a declaration reaches it. A condition across the whole country is
 * felt in every state, so it counts everywhere.
 */
export function stateConditions(campaign) {
    const running = conditionReadings(campaign);
    return new Map(STATE_IDS.map((state) => {
        const here = running.filter((reading) => reading.state === state || reading.state === undefined);
        return [
            state,
            {
                state,
                severity: here.reduce((worst, reading) => Math.max(worst, reading.severity.fraction), 0),
                labels: here.map((reading) => reading.headline),
                declared: underDeclaredEmergency(campaign, state),
            },
        ];
    }));
}
