import { addDays } from "../../packages/engine/dist/clock.js";
import { apply } from "../../packages/engine/dist/effects.js";
import { CORE_SCENARIOS } from "../../packages/content/dist/packs/core.js";
import { castBound, scenarioOccurrenceKey } from "../../packages/content/dist/scenario-cast.js";
import { withScenarioCases } from "../../packages/player-core/dist/conversation/scenario-cases.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "scenario-recurrence";

export function build() {
  const def = CORE_SCENARIOS.find((scenario) => scenario.id === "the-morning-the-country-stopped");
  if (!def || def.once || def.family) throw new Error("repeatable core scenario missing");
  const opening = foundFixture({ seedText: "fixture-scenario-recurrence", leaderName: "Fixture President" });
  const firstCast = castBound(opening, def, opening.founding.nation);
  const first = withScenarioCases(opening, [firstCast]);
  const firstId = `scenario:${scenarioOccurrenceKey(firstCast)}`;
  const answered = apply(first, { source: "action", actor: "player", turn: first.turn,
    narration: { summary: "Answered." }, effects: [{ kind: "case", actor: "player", transition: { id: firstId, disposition: { kind: "act", actionId: def.replies[0].id }, narration: "Answered." } }],
  });
  const later = { ...answered, turn: answered.turn + 8, calendar: addDays(answered.calendar, 56) };
  const nextCast = castBound(later, def, later.founding.nation);
  const nextId = `scenario:${scenarioOccurrenceKey(nextCast)}`;
  const repeated = withScenarioCases(later, [nextCast]);
  if (nextId === firstId || repeated.cases[firstId]?.status !== "acted" || repeated.cases[nextId]?.status !== "raised") {
    throw new Error("repeat occurrence did not retain both case records");
  }
  return repeated;
}
