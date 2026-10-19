// Sealed under its own seed, so the state this fixture stands for (a lapse in appropriations)
// is built on an oath no other fixture shares, and building it moves no other spec.
//
// A natural lapse is not a reliable draw within a fixture's own budget of weeks — it depends on
// how Congress's own appropriation clock and the President's signature happen to land on the
// seed. So the appropriation's own book (`congress.appropriation.throughTurn`, a plain number,
// never a headline) is moved behind the current turn, and `shutdownPhase` — the same phase
// `campaignTurnPhases` runs every week — is asked for the week's packet and applied through
// `apply()`. The headline, the lapse record and the stability cost are the engine's, the way
// `domestic-flood.mjs` asks `openCondition` for a condition's beats rather than writing its own.
import { apply } from "../../packages/engine/dist/effects.js";
import { shutdownPhase } from "../../packages/engine/dist/shutdown.js";
import { SHUTDOWN_GRACE_TURNS, inShutdown } from "../../packages/engine/dist/funding.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "lapse";

function lapsedAppropriation(campaign) {
  const behind = campaign.turn - SHUTDOWN_GRACE_TURNS - 1;
  return {
    ...campaign,
    congress: { ...campaign.congress, appropriation: { ...campaign.congress.appropriation, throughTurn: behind } },
  };
}

export function build() {
  const opened = advanceWeeks(foundFixture({ seedText: "fixture-lapse", leaderName: "Fixture President" }), 2);
  const overdue = lapsedAppropriation(opened);
  const packets = shutdownPhase(overdue);
  const campaign = packets.reduce((state, packet) => apply(state, packet), overdue);
  if (!inShutdown(campaign)) throw new Error("the lapse fixture is not actually in shutdown");
  return campaign;
}
