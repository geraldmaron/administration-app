/**
 * The two world matters that stop the clock on arrival: a market crash at
 * home, and a coup in a government the President's services read.
 *
 * Each is soft only in the week it happened and absent after, so a crash a
 * month old never stops Continue again. A coup in a government the services
 * cannot read is logged as the world changing and never pauses: the President
 * learns of it the way the wire does.
 */
import { type Campaign } from "@admin/engine";
import type { AttentionItem } from "./attention-row";
/** The crash row, the week the index fell past the line; nothing in any other week. */
export declare function marketShockItems(campaign: Campaign): readonly AttentionItem[];
/** A coup this week, from the engine's one reading of it: it pauses where the services read that government, and is logged where they do not. */
export declare function coupItems(campaign: Campaign): readonly AttentionItem[];
