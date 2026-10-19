import type { ConditionBoardRow, EmergencyBoard } from "@admin/player-core";

/** Each condition and incident running at home, the most severe first: the order the President should look in. Ties read by headline so the order never shifts between renders. */
export function prioritizedIncidents(board: Pick<EmergencyBoard, "conditions" | "incidents">): readonly ConditionBoardRow[] {
  return [...board.conditions, ...board.incidents].sort((a, b) => b.severity.fraction - a.severity.fraction || a.headline.localeCompare(b.headline));
}
