import { actionTermsProblem } from "./action-support.js";
import type { Effect } from "./effects.js";
import { rungDefinition } from "./instruments.js";
import { actionContext, type ResolutionRequest } from "./resolution.js";
import type { RngStreams } from "./rng.js";
import { selectRelationship, type Campaign } from "./state.js";

/**
 * What the rung writes if it works, with no draw: the success half of
 * resolveAction, for a reader that sets options side by side before one is
 * chosen. It is the same resolve the commit runs, so a reading of it cannot
 * promise what a landed act does not do. The gate is not checked, so a screen
 * can say what a locked rung would do once its gate opens; undefined where the
 * terms are invalid or there is no relationship to act through.
 */
export function projectSuccessEffects(campaign: Campaign, request: ResolutionRequest, streams: RngStreams): readonly Effect[] | undefined {
  if (actionTermsProblem(campaign, request) || !selectRelationship(campaign, request.actor, request.target)) return undefined;
  return rungDefinition(request.instrument, request.rung).resolve(actionContext(campaign, request, streams));
}
