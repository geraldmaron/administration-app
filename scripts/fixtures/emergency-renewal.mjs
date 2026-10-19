// A state of emergency the President declared and has held for most of a year,
// now inside its continuation window: the emergency board shows it with both
// of its acts, renew and end, and the Desk carries the renewal case. No other
// fixture holds a declaration at all.
//
// The hurricane is staged the way `hurricane-request.mjs` stages it, the
// declaration is the engine's own act over that live condition, and the weeks
// to the window are run by the engine's own turn, so the standing cost each of
// them charged is on the record.
import { apply } from "../../packages/engine/dist/effects.js";
import {
  EMERGENCY_NOTICE_TURNS,
  EMERGENCY_RENEWAL_TURNS,
  declareEmergency,
  endEmergency,
  renewEmergency,
  renewalIsOpen,
  selectDeclaredEmergencies,
} from "../../packages/engine/dist/emergency.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";
import { cycloneCondition } from "./hurricane-request.mjs";

export const name = "emergency-renewal";

function onset(campaign) {
  const condition = cycloneCondition(campaign);
  const headline = condition.beats[0].description;
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: headline },
    effects: [{ kind: "condition", set: condition }],
  });
}

export function build() {
  const struck = onset(advanceWeeks(foundFixture({ seedText: "fixture-emergency-renewal", leaderName: "Fixture President" }), 1));
  const declaration = declareEmergency(struck, { kind: "nation" }, "cyclone");
  if (!declaration.ok) throw new Error(`declaring the emergency was refused: ${declaration.reason}`);
  const declared = apply(struck, declaration.packet);
  const campaign = advanceWeeks(declared, EMERGENCY_RENEWAL_TURNS - EMERGENCY_NOTICE_TURNS);
  const [standing, ...others] = selectDeclaredEmergencies(campaign);
  if (!standing || others.length > 0) throw new Error(`expected one declaration in force, found ${others.length + (standing ? 1 : 0)}`);
  if (!renewalIsOpen(standing, campaign.turn)) throw new Error(`the continuation window is not open on turn ${campaign.turn}`);
  if (!renewEmergency(campaign, standing.id).ok) throw new Error("the declaration cannot be renewed inside its window");
  if (!endEmergency(campaign, standing.id).ok) throw new Error("the declaration cannot be ended");
  return campaign;
}
