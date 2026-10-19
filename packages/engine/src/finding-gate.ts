import { requireTrue, type CapabilityCheck, type InstrumentContext } from "./instrument-gates.js";
import { standingFinding } from "./findings.js";

/**
 * The statutory gate on a covert act: the President's own government may not
 * run one without a finding standing over the target (50 U.S.C. §3093(a)). A
 * finding signed under the 48-hour path stands the same as a written one.
 * Other governments' covert acts carry no finding in this model.
 */
export function findingGate(ctx: InstrumentContext): CapabilityCheck {
  if (ctx.actor !== ctx.campaign.founding.nation) return { ok: true };
  return requireTrue(
    standingFinding(ctx.campaign, ctx.target) !== undefined,
    "a standing covert-action finding on the target (50 U.S.C. 3093), signed in writing or under the 48-hour path",
  );
}
