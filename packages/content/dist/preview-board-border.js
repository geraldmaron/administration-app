// The boards a land-border gate needs.
//
// The canonical preview boards cast whichever friend or rival the relationship
// graph ranks first, and for the United States that is rarely a land neighbor,
// so a week gated on `sharesBorder` read as never live and the publish gate
// refused realizable content. One board per neighbor makes that neighbor the
// firmest friend, which is the cast `closest` binds.
import { selectNation } from "@admin/engine";
import { sealedCampaign, withLoneEdge } from "./preview-board.js";
export function borderBoards(defs) {
    const needed = defs.some((def) => def.conditions.some((condition) => condition.kind === "sharesBorder" && condition.present));
    if (!needed)
        return [];
    const board = sealedCampaign();
    const neighbors = selectNation(board, board.founding.nation)?.base.geo.neighbors ?? [];
    return neighbors.filter((id) => selectNation(board, id) !== undefined).map((id) => withLoneEdge(board, id, { trust: 0.95, tension: 0 }));
}
