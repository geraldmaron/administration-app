// A Secretary who has offered to go, with the offer still standing.
//
// The Secretary the room would most expect to offer is found by the engine's
// own forecast, their faith in the administration is taken down the way months
// of being overruled take it down, and the week is run: the offer is theirs to
// make, through the same weighing the Desk will explain.
import { apply } from "../../packages/engine/dist/effects.js";
import { projectMinister } from "../../packages/engine/dist/minister-will.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "resignation-offer";

/** Where a year of being overruled on the calls that mattered leaves a Secretary's faith in the administration. */
const LOST_FAITH = 0.05;

function mostLikelyToOffer(campaign) {
  const seats = Object.entries(campaign.player.cabinet).filter(([role]) => role !== campaign.founding.leadRole);
  const scored = seats.map(([role, person]) => {
    const base = campaign.people[person].base;
    const shaken = { ...base, loyalty: LOST_FAITH };
    return { role, person, shift: LOST_FAITH - base.loyalty, margin: projectMinister(campaign, "minister-offer", role, shaken).margin };
  });
  scored.sort((a, b) => b.margin - a.margin || a.role.localeCompare(b.role));
  return scored[0];
}

export function build() {
  const sworn = foundFixture({ seedText: "fixture-resignation-offer", leaderName: "Fixture President" });
  const pick = mostLikelyToOffer(sworn);
  if (!pick) throw new Error("the fixture's cabinet has nobody seated");
  const shaken = apply(sworn, {
    source: "simulate",
    actor: "world",
    turn: sworn.turn,
    narration: { summary: "A Secretary's faith in the administration runs out." },
    effects: [{ kind: "person", person: pick.person, changes: {}, loyaltyShift: pick.shift }],
  });
  let campaign = shaken;
  for (let week = 0; week < 4 && !(campaign.cabinetAgenda?.offers ?? []).some((offer) => offer.person === pick.person); week += 1) {
    if (campaign.player.cabinet[pick.role] !== pick.person) break;
    campaign = advanceWeeks(campaign, 1);
  }
  const offer = (campaign.cabinetAgenda?.offers ?? []).find((entry) => entry.person === pick.person);
  if (!offer) throw new Error(`the ${pick.role} never offered to resign`);
  if (offer.expiresTurn !== undefined && offer.expiresTurn < campaign.turn) throw new Error("the offer has already lapsed");
  if (campaign.player.cabinet[pick.role] !== pick.person) throw new Error("the Secretary who offered no longer holds the chair");
  return campaign;
}
