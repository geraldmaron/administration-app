import type { RoleId } from "@admin/world";
import type { CounselStance } from "./counsel.js";
import type { ActionCounsel, Campaign } from "./state.js";
/**
 * The stance this chair actually took on one decision, or nothing.
 *
 * The whole meeting is on the record, so the whole meeting is read. Scoring
 * only the primary chair charged the president for overruling the one seat the
 * subject routed to and let every other objection in the room cost nothing —
 * a Secretary of Defense who argued against a course and watched it signed
 * anyway had no grievance, because the decision had been filed under State.
 * The primary fields are the fallback for an entry with no room stamped, which
 * is where they are the only stance the record kept.
 */
export declare function stanceOf(counsel: ActionCounsel, role: RoleId): CounselStance | undefined;
/**
 * How many times the President went against this chair's stated advice from
 * `sinceTurn` on. The count a minister deciding whether to stay, speak or go
 * carries in with them, read off the same stamps the weekly shift is.
 */
export declare function timesOverruled(campaign: Campaign, role: RoleId, sinceTurn: number): number;
