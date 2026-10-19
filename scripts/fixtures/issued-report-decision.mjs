import { readFileSync } from "node:fs";
import { reportBoards } from "../../packages/content/dist/preview-board-report.js";
import { castScenario } from "../../packages/content/dist/scenario-cast.js";
import { withScenarioCases } from "../../packages/player-core/dist/conversation/scenario-cases.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "issued-report-decision";

export function build() {
  // Keep the reviewed draft out of the published pool. The frozen case itself
  // carries the authoring snapshot into the player, as a real issued report does.
  const file = new URL("./data/issued-report-decision.json", import.meta.url);
  const [def] = JSON.parse(readFileSync(file, "utf8"));
  if (!def) throw new Error("issued report scenario draft missing");
  const preview = reportBoards([def])[0];
  if (!preview) throw new Error("no board issued a matching report");
  // Reachability boards are test foundings. Import the issued product into a
  // player founding so the browser exercises the real oath/save/UI lifecycle.
  const base = foundFixture({ seedText: "fixture-issued-report-decision", leaderName: "Morgan Avery" });
  const campaign = { ...base, security: { ...base.security, intelligence: preview.security.intelligence } };
  const cast = castScenario(campaign, def);
  if (!cast?.report || cast.report.status !== "findings") throw new Error("the report decision did not bind a finding");
  const seated = withScenarioCases(campaign, [cast]);
  const id = `scenario:${cast.occurrence ?? cast.def.id}`;
  if (seated.cases?.[id]?.status !== "raised") throw new Error("the report decision was not frozen in a case");
  return seated;
}
