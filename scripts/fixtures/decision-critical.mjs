// Sealed under its own seed, so the state this fixture stands for (a critical
// decision on the Desk, briefed and unflagged) is built on an oath no other
// fixture shares, and building it moves no other spec.
//
// The director draws per turn from a seeded stream (scenario-director.ts),
// so "the next critical decision" cannot be assumed off one seed or one week:
// this walks a fixed list of both until the pending scenario is severity
// "critical" and carries a `context` block (all five of its fields), so the
// brief puts the context block's inaction on screen before the decision.
import { pendingConversation } from "../../packages/player-core/dist/index.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "decision-critical";

const SEEDS = ["fixture-decision-critical", "fixture-decision-critical-2", "fixture-decision-critical-3"];
const MAX_WEEKS = 40;

function isReady(pending) {
  return pending !== undefined && pending.def.severity === "critical" && pending.def.context !== undefined;
}

export function build() {
  for (const seedText of SEEDS) {
    let campaign = foundFixture({ seedText, leaderName: "Fixture President" });
    for (let week = 0; week <= MAX_WEEKS; week += 1) {
      const pending = pendingConversation(campaign);
      if (isReady(pending)) return campaign;
      campaign = advanceWeeks(campaign, 1);
    }
  }
  throw new Error("no seed in the fixed list staged a critical, briefed, unflagged decision inside the week budget");
}
