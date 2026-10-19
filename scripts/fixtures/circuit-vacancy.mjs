import { apply } from "../../packages/engine/dist/effects.js";
import { selectDateOfTurn } from "../../packages/engine/dist/clock.js";
import { judicialVacancyPhase } from "../../packages/engine/dist/judicial-vacancies.js";
import { CIRCUIT_SEATS } from "../../packages/engine/dist/lower-bench.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "circuit-vacancy";

/** A founded campaign advanced through the real annual vacancy phase. */
export function build() {
  let campaign = foundFixture({ seedText: "anonymous-circuit-vacancy", leaderName: "Avery Bell" });
  for (let year = 0; year < 8; year += 1) {
    const turn = campaign.turn + 52;
    const date = selectDateOfTurn(campaign, turn);
    const due = { ...campaign, turn, calendar: date };
    campaign = judicialVacancyPhase(due).reduce(apply, due);
    if (CIRCUIT_SEATS.some((seat) => campaign.institutions[seat.id]?.vacancy)) return campaign;
  }
  throw new Error("No circuit vacancy in eight annual assessments on this seed");
}
