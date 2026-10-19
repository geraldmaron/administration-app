import type { Campaign } from "@admin/engine";
import type { ScenarioFinding } from "./scenario-audit.js";
import type { ScenarioDef } from "./scenario.js";
/**
 * Whether a scenario can ever reach a player.
 *
 * Everything else the audit knows is a property of the document: its shape,
 * its prose, its stakes, its coherence. None of that can see the one failure
 * that costs the most — a scenario that clears every rule and is never true
 * on any board a real campaign produces. Two shapes of it were found in the
 * first production batch, and neither was visible to a static rule:
 *
 *  - a `metric: "treasury"` bound written on a nought-to-one scale, when
 *    treasury is absolute and a campaign holds tens of thousands of it;
 *  - a band cast plus a relationship bound, which is two independent filters
 *    rather than one narrower one: the band pick is resolved before the bound
 *    is read and is not chosen to satisfy it, so a scenario asking for a
 *    trading hub the player depends on gets whichever trading hub the band
 *    names and then fails the bound against it.
 *
 * Both were dead content that shipped clean. So reachability is answered the
 * only honest way: cast the scenario against real sealed campaigns and see.
 *
 * What the default boards measure is *early-campaign* reachability — they run
 * to turn nine, and relationships on them are close to what founding seeded.
 * That is deliberately the strict reading, because it is the bar the bundled
 * pack has to clear: a scenario a player cannot meet in their first year is
 * very nearly a scenario they never meet. Content genuinely written for a
 * matured board is not wrong, it just has to say so, by handing this its own
 * boards rather than by being excused from the question.
 */
export type ReachabilityFinding = ScenarioFinding & {
    readonly kind: "unreachable-scenario";
};
/**
 * The boards a batch's later beats have to be measured on.
 *
 * A family pins its counterpart at the opener, and every later beat binds to
 * that pin rather than re-casting. On a board where the family has not opened
 * there is no pin, so the beat binds nothing and this gate calls it
 * unreachable — which it would say about *every* beat of *every* arc ever
 * written, however correct. That is not a property of the content; it is this
 * gate asking the wrong board.
 *
 * It is the identical problem the flag seeding above already solves, one layer
 * up: a follow-up gated on a deed no board has done is dormant for a reason
 * that has nothing to do with whether it is any good. So the board is told
 * what the batch itself opens, in exactly the way a campaign would have opened
 * it — by casting the opener on that board and pinning whatever it bound.
 *
 * An opener that does not itself bind on a board opens no family there, which
 * is right: a beat cannot be reachable through a door that is not.
 */
export declare function withFamiliesOpened(campaign: Campaign, defs: readonly ScenarioDef[]): Campaign;
/**
 * The canonical board spread for a batch: `previewBoards`, told the flags the
 * batch waits on, plus every supplement board its own conditions demand.
 * Exported so a rule that asks a different question of the same boards — does
 * this gate ever exclude one? — reads exactly the boards reachability does.
 */
export declare function reachabilityBoards(defs: readonly ScenarioDef[]): readonly Campaign[];
/**
 * Audit a batch for reachability against the canonical board spread. Boards may
 * be supplied to widen the check; omitted, the batch is measured against
 * `previewBoards`, told the flags this batch itself stamps and waits on, plus
 * whichever supplement boards the batch's own conditions demand.
 *
 * The supplements are added rather than documented because the alternative
 * already failed once. `openMatters` shipped as a gate no default board could
 * satisfy — the boards decline to open an inquiry into an arbitrary agency, and
 * rightly — with the ruling that content gated on it should hand this function
 * its own boards. Nothing enforced that, so the gate parsed clean, passed every
 * bound, and would have gone to a drafter as a live mechanism. A condition kind
 * whose state no default board carries now brings its board with it.
 */
export declare function auditReachability(defs: readonly ScenarioDef[], boards?: readonly Campaign[]): readonly ReachabilityFinding[];
