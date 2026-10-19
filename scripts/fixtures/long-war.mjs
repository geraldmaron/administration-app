// A war between two other governments a year in: casualty bands on both
// sides, a held front, and a settlement near. The war opens in the first week
// as a front already gone quiet between two tired armies; a year of the
// campaign's own weeks rests it to within a week of the armistice line and
// counts its losses as it goes.
import { apply } from "../../packages/engine/dist/effects.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { casualtyBand } from "../../packages/engine/dist/war-attrition.js";
import { HELD_FRONT_INTENSITY } from "../../packages/engine/dist/war-tick.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "long-war";

// A pair the opening board never draws, so the fixture's war is the only one between them.
const ALGERIA = "DZA";
const MOROCCO = "MAR";

function openHeldWar(campaign) {
  const war = {
    ...openConflict(ALGERIA, MOROCCO, campaign.turn, "Algeria and Morocco are at war across their border."),
    intensity: 0.15,
    // Rested at a hundredth a week, a year brings this to just above the line
    // a held front must reach before it can be written down as an armistice.
    exhaustion: { aggressor: 0.63, defender: 0.63 },
  };
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: war.cause },
    effects: [{ kind: "conflict", set: war }],
  });
}

function assertWar(campaign) {
  const war = Object.values(campaign.conflicts).find((conflict) => conflict.aggressor === ALGERIA && conflict.defender === MOROCCO);
  if (!war || war.status !== "active") throw new Error(`the war is not still running a year in: ${war?.status}`);
  if (war.intensity >= HELD_FRONT_INTENSITY) throw new Error("the front is not held");
  for (const side of ["aggressor", "defender"]) {
    if (!casualtyBand(campaign, war, side)) throw new Error(`no casualty band on the ${side}`);
  }
  if (Math.max(war.exhaustion.aggressor, war.exhaustion.defender) > 0.15) throw new Error("the front is not near its armistice line");
}

export function build() {
  const campaign = advanceWeeks(openHeldWar(foundFixture({ seedText: "fixture-long-war", leaderName: "Fixture President" })), 52);
  assertWar(campaign);
  return campaign;
}
