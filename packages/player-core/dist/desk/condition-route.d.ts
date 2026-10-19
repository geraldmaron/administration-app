import type { ConditionReading } from "../world/board-state";
import type { AttentionRoute } from "./attention-row";
/**
 * Where an emergency at home actually opens, on the list that draws it.
 *
 * The narrowest place the condition names, not its `scope` field: a
 * `scope: "region"` condition still carries the state it is running in, and the
 * state is the more useful destination than the country. A condition naming no
 * place at all is genuinely national. The President's own country has no file
 * of its own, so a national condition opens the Nation screen's states view.
 *
 * A district is deliberately never a destination here. A condition is never
 * drawn at district granularity, so routing there would invent a precision the
 * data does not carry.
 */
export declare function conditionRoute(condition: Pick<ConditionReading, "id" | "kind" | "state">): AttentionRoute;
