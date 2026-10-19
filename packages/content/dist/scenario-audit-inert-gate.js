import { castScenario, scenarioLive } from "./scenario-cast.js";
import { reachabilityBoards, withFamiliesOpened } from "./scenario-reachability.js";
const PLAYER_BOARD_KINDS = new Set([
    "metric",
    "alignment",
    "removalPressure",
    "institutionState",
    "press",
    "operatorPressure",
    "geography",
    "inflationBand",
    "unemploymentBand",
    "costOfLivingBand",
    "crimeTrend",
    "cyclePhase",
    "commodityBand",
    "cohortStrain",
    "stateGrievance",
    "revealedPreference",
]);
/** Whether a condition reads the player's own board rather than the cast, the clock or a deed. */
export function readsPlayerBoard(condition) {
    if (!PLAYER_BOARD_KINDS.has(condition.kind))
        return false;
    return condition.kind !== "geography" || condition.of !== "counterpart";
}
/**
 * The week with every condition this rule asks about, and the clock and deed
 * gates, taken off: what the cast and the structural gates alone admit. The
 * record gates (a bill, a report, a matter) stay, because the cast cannot bind
 * without them.
 */
function castOnly(def) {
    return {
        ...def,
        conditions: def.conditions.filter((condition) => !readsPlayerBoard(condition) && condition.kind !== "turn" && condition.kind !== "flag"),
    };
}
function liveBoards(def, boards) {
    return boards.flatMap((board) => {
        const cast = castScenario(board, def);
        return cast && scenarioLive(board, def, cast.counterpart) ? [{ board, counterpart: cast.counterpart }] : [];
    });
}
function describe(condition) {
    return JSON.stringify(condition);
}
function inertGatesOf(def, boards) {
    const asked = def.conditions.filter(readsPlayerBoard);
    if (asked.length === 0)
        return [];
    const baseline = castOnly(def);
    const live = liveBoards(baseline, boards);
    // A week no board admits even before these gates is unreachable, which is
    // its own finding; there is nothing here to measure them against.
    if (live.length === 0)
        return [];
    return asked
        .filter((condition) => {
        const alone = { ...baseline, conditions: [...baseline.conditions, condition] };
        return live.every(({ board, counterpart }) => scenarioLive(board, alone, counterpart));
    })
        .map((condition) => ({
        kind: "inert-gate",
        severity: "warning",
        scenario: def.id,
        condition,
        message: `the condition ${describe(condition)} holds on every one of the ${live.length} preview boards this week casts on, ` +
            "so it turns away no President the rest of the week would have reached. A gate added to clear gate-on-nothing has " +
            "to be one the board can fail: take it off and gate on the state the premise is about, or declare the week " +
            "universal with a reason (§6.2 rule 2)",
    }));
}
/**
 * Every inert gate in a batch. `boards` defaults to the reachability spread;
 * a caller that already sealed it for `auditReachability` passes it in, since
 * sealing the boards is the expensive part.
 */
export function auditInertGates(defs, boards = reachabilityBoards(defs)) {
    const opened = boards.map((board) => withFamiliesOpened(board, defs));
    return defs.flatMap((def) => inertGatesOf(def, def.family && def.family.role !== "opener" ? opened : boards));
}
