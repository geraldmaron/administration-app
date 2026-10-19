import { type Campaign } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
export declare function sealedCampaign(seedLabel?: string, charterId?: string, cradleId?: string, nationId?: string): Campaign;
/**
 * The same campaign with every player relationship flattened and one edge
 * retuned — how tests stage "this nation is a friend" or "this nation is the
 * adversary" without inventing a board.
 */
export declare function withLoneEdge(campaign: Campaign, to: string, patch: {
    trust: number;
    tension: number;
}): Campaign;
/**
 * The deeds a set of scenarios waits on, as a board would carry them, and the
 * key that keeps two batches waiting on different deeds from sharing a board.
 * A supplement board carries the state a gate needs; a reader gated on that
 * state and on an earlier deed was unreachable on it for want of the deed,
 * which the canonical boards are already told about and these were not.
 */
export declare function deedsWaitedOn(defs: readonly ScenarioDef[]): {
    readonly flags: Record<string, boolean>;
    readonly key: string;
};
export declare function withFlags(campaign: Campaign, flags: Record<string, boolean>): Campaign;
/**
 * A campaign that has been going badly. Every sealed founding is a healthy
 * one — full treasury, stability well over half, no removal pressure — so
 * without this board, content written for a government in trouble has nowhere
 * to be true and reads as unreachable for a reason that has nothing to do
 * with its own correctness.
 *
 * The removal arc is stored on the campaign and recomputed only by the turn
 * loop, so a board that never takes a turn has to carry the pressure rather
 * than imply it from a low approval.
 */
export declare function underStrain(campaign: Campaign): Campaign;
/**
 * The canonical spread a batch is checked for reachability against: a turn
 * range for turn-gated conditions, a charter that actually seats every
 * institution kind (the default charter has no judiciary, so a
 * `charterInstitution` condition on it can never be met), one board in
 * trouble, one board mid-war, and one board watching a war it is not in.
 * `flags` is folded onto the late boards, because a follow-up waits on deeds a
 * fresh campaign has not done. Onto the two late war boards as well as the
 * healthy one: a callback whose earlier deed was itself wartime has nowhere
 * else to be true, and stamping it only on a board with no war makes the flag
 * and the war two filters that can never close together — the scenario is then
 * unwritable for a reason that is about the fixtures, not about the content.
 *
 * The last five carry board state no amount of patching a healthy founding
 * produces: a war the capitals have taken sides in, a government that has
 * actually legislated, a landlocked compact member whose firmest friend is a
 * fellow signatory, and the two poles of a record long enough for the world to
 * have read it — the government that pays and the government that climbs.
 */
export declare function previewBoards(flags?: Record<string, boolean>): readonly Campaign[];
