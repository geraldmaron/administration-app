// A covert finding that was signed, ran for a few weeks and has been closed
// out: the finding's record with its closing day, which the security screens
// read differently from a standing one. `security-desk.mjs` and
// `courts-and-oversight.mjs` only ever leave a finding standing.
//
// Signed and closed through the engine's own acts, with weeks run between so
// the closing day is not the signing day.
import { apply } from "../../packages/engine/dist/effects.js";
import { closeFinding, signFinding, standingFinding } from "../../packages/engine/dist/findings.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "covert-finding-closed";

const TARGET = "IRN";

function applied(campaign, result, act) {
  if (!result.ok) throw new Error(`${act} was refused: ${result.reason}`);
  return apply(campaign, result.packet);
}

export function build() {
  const sworn = foundFixture({ seedText: "fixture-covert-finding-closed", leaderName: "Fixture President" });
  const signed = applied(
    sworn,
    signFinding(sworn, "Disrupt a weapons shipment bound for an armed group", TARGET, "written", "gang-of-eight"),
    "signing the finding",
  );
  const running = advanceWeeks(signed, 3);
  const finding = standingFinding(running, TARGET);
  if (!finding) throw new Error("the finding on Iran is not standing three weeks after it was signed");
  const closed = advanceWeeks(applied(running, closeFinding(running, finding.id), "closing the finding"), 1);
  const record = closed.security.covert.findings.find((entry) => entry.id === finding.id);
  if (record?.closedDay === undefined) throw new Error("the closed finding carries no closing day");
  if (standingFinding(closed, TARGET)) throw new Error("a finding on Iran is still standing after the close");
  return closed;
}
