import type { Campaign, ScenarioFamilyRun } from "@admin/engine";
import type { NationId } from "@admin/world";
import { previewBoards } from "./preview-board.js";
import { supplementBoards } from "./preview-board-oversight.js";
import { reportBoards } from "./preview-board-report.js";
import { tradeBoards } from "./preview-board-trade.js";
import { borderBoards } from "./preview-board-border.js";
import { billBoards } from "./preview-board-bill.js";
import { judicialBoards } from "./preview-board-judicial.js";
import { orderCaseBoards } from "./preview-board-order-case.js";
import { bindCounterpart, castScenario, scenarioLive } from "./scenario-cast.js";
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

export type ReachabilityFinding = ScenarioFinding & { readonly kind: "unreachable-scenario" };

/**
 * The flags a batch waits on, as a board would carry them. A follow-up gated
 * on a deed no board has done is dormant for a reason that has nothing to do
 * with its correctness, so the boards are told what this batch expects to have
 * happened rather than being asked to have guessed it.
 */
function flagsWaitedOn(defs: readonly ScenarioDef[]): Record<string, boolean> {
  return Object.fromEntries(
    defs
      .flatMap((def) => def.conditions)
      .filter((condition) => condition.kind === "flag" && condition.is)
      .map((condition) => [(condition as { flag: string }).flag, true as const]),
  );
}

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
export function withFamiliesOpened(campaign: Campaign, defs: readonly ScenarioDef[]): Campaign {
  const openers = defs.filter((def) => def.family?.role === "opener");
  const orphans = defs.filter((def) => def.family && def.family.role !== "opener" && !openers.some((opener) => opener.family!.id === def.family!.id));
  if (openers.length === 0 && orphans.length === 0) return campaign;
  const runs: Record<string, ScenarioFamilyRun> = { ...campaign.scenarioFamilies };
  const open = (family: string, from: ScenarioDef, counterpart: NationId) => {
    runs[family] = { family, counterpart, openedTurn: campaign.turn, lastTurn: campaign.turn, beats: [from.id] };
  };
  for (const opener of openers) {
    const family = opener.family!.id;
    if (runs[family]) continue;
    const cast = castScenario(campaign, opener);
    if (cast) open(family, opener, cast.counterpart);
  }
  // A beat or close revised or written without its opener in hand — the opener
  // shipped in an earlier batch — is asked of a board where its family opened
  // against the country the member's own cast rule picks there. The opener's
  // rule and the member's are written to bind the same kind of country (the
  // arc gate refuses a pair that is not), so this is the board a campaign that
  // dealt the opener would plausibly hold; without it every lone continuation
  // is refused for a door that is simply not in the batch.
  for (const member of orphans) {
    const family = member.family!.id;
    if (runs[family]) continue;
    const { family: _pin, ...unpinned } = member;
    const counterpart = bindCounterpart(campaign, unpinned);
    if (counterpart) open(family, member, counterpart);
  }
  return { ...campaign, scenarioFamilies: runs };
}

function reachable(def: ScenarioDef, boards: readonly Campaign[]): boolean {
  return boards.some((campaign) => {
    // A cast scenario that never binds a counterpart is as unreachable as one
    // whose conditions never hold, and the two fail for different reasons —
    // both are asked here so neither hides behind the other. Conditions are
    // then read against the counterpart actually bound, because a relationship
    // bound means nothing until there is an edge for it to be about.
    const cast = castScenario(campaign, def);
    if (cast === undefined) return false;
    return scenarioLive(campaign, def, cast.counterpart);
  });
}

/**
 * The canonical board spread for a batch: `previewBoards`, told the flags the
 * batch waits on, plus every supplement board its own conditions demand.
 * Exported so a rule that asks a different question of the same boards — does
 * this gate ever exclude one? — reads exactly the boards reachability does.
 */
export function reachabilityBoards(defs: readonly ScenarioDef[]): readonly Campaign[] {
  return [...previewBoards(flagsWaitedOn(defs)), ...supplementBoards(defs), ...reportBoards(defs), ...tradeBoards(defs), ...billBoards(defs), ...judicialBoards(defs), ...orderCaseBoards(defs), ...borderBoards(defs)];
}

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
export function auditReachability(
  defs: readonly ScenarioDef[],
  boards: readonly Campaign[] = reachabilityBoards(defs),
): readonly ReachabilityFinding[] {
  // Measured on boards where the batch's own openers have opened, for the
  // reason `withFamiliesOpened` gives. Beats are the only defs this changes:
  // an opener casts the ordinary way and reads none of it.
  const opened = boards.map((board) => withFamiliesOpened(board, defs));
  return defs
    .filter((def) => !reachable(def, def.family && def.family.role !== "opener" ? opened : boards))
    .map((def) => ({
      kind: "unreachable-scenario" as const,
      severity: "error" as const,
      scenario: def.id,
      message:
        `never live on any of the ${boards.length} boards the gate casts against — its conditions, its cast, or ` +
        `both are never satisfied together, so no player ever sees it`,
    }));
}
