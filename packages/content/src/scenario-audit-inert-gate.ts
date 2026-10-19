// The inert gate: a condition that reads the player's own board and is true on
// every board the week can be cast on.
//
// `gate-on-nothing` asks whether a week carries a condition at all, and a
// writer clearing it can always add one that holds everywhere: approval at
// most 0.75, stability at most 0.9, the Justice Department's politicization
// under a ceiling no government reaches, the player's own coast, a pulse band
// listing every band but one. The week then parses as gated and is dealt to
// every President exactly as before. A static rule cannot see that; the
// preview boards can, so each such condition is asked on its own whether it
// ever turns away a board the rest of the week would have accepted.
//
// Only conditions on the player's own board are asked. A relationship bound on
// the cast pick, a counterpart's coast or border, a flag and the clock all vary
// in play in ways a handful of early boards do not, and on those the boards
// would call honest premises inert.
import type { Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { ScenarioCondition } from "./scenario-conditions.js";
import { castScenario, scenarioLive } from "./scenario-cast.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
import { reachabilityBoards, withFamiliesOpened } from "./scenario-reachability.js";
import type { ScenarioDef } from "./scenario.js";

export type InertGateFinding = ScenarioFinding & { readonly kind: "inert-gate"; readonly condition: ScenarioCondition };

const PLAYER_BOARD_KINDS: ReadonlySet<ScenarioCondition["kind"]> = new Set<ScenarioCondition["kind"]>([
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
export function readsPlayerBoard(condition: ScenarioCondition): boolean {
  if (!PLAYER_BOARD_KINDS.has(condition.kind)) return false;
  return condition.kind !== "geography" || condition.of !== "counterpart";
}

type LiveBoard = { readonly board: Campaign; readonly counterpart: NationId };

/**
 * The week with every condition this rule asks about, and the clock and deed
 * gates, taken off: what the cast and the structural gates alone admit. The
 * record gates (a bill, a report, a matter) stay, because the cast cannot bind
 * without them.
 */
function castOnly(def: ScenarioDef): ScenarioDef {
  return {
    ...def,
    conditions: def.conditions.filter((condition) => !readsPlayerBoard(condition) && condition.kind !== "turn" && condition.kind !== "flag"),
  };
}

function liveBoards(def: ScenarioDef, boards: readonly Campaign[]): readonly LiveBoard[] {
  return boards.flatMap((board) => {
    const cast = castScenario(board, def);
    return cast && scenarioLive(board, def, cast.counterpart) ? [{ board, counterpart: cast.counterpart }] : [];
  });
}

function describe(condition: ScenarioCondition): string {
  return JSON.stringify(condition);
}

function inertGatesOf(def: ScenarioDef, boards: readonly Campaign[]): readonly InertGateFinding[] {
  const asked = def.conditions.filter(readsPlayerBoard);
  if (asked.length === 0) return [];
  const baseline = castOnly(def);
  const live = liveBoards(baseline, boards);
  // A week no board admits even before these gates is unreachable, which is
  // its own finding; there is nothing here to measure them against.
  if (live.length === 0) return [];
  return asked
    .filter((condition) => {
      const alone = { ...baseline, conditions: [...baseline.conditions, condition] };
      return live.every(({ board, counterpart }) => scenarioLive(board, alone, counterpart));
    })
    .map((condition) => ({
      kind: "inert-gate" as const,
      severity: "warning" as const,
      scenario: def.id,
      condition,
      message:
        `the condition ${describe(condition)} holds on every one of the ${live.length} preview boards this week casts on, ` +
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
export function auditInertGates(
  defs: readonly ScenarioDef[],
  boards: readonly Campaign[] = reachabilityBoards(defs),
): readonly InertGateFinding[] {
  const opened = boards.map((board) => withFamiliesOpened(board, defs));
  return defs.flatMap((def) => inertGatesOf(def, def.family && def.family.role !== "opener" ? opened : boards));
}
