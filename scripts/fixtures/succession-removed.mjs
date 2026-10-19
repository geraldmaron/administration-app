// A President removed from office, the Vice President sworn in, and the
// epilogue on the ending room.
//
// Founded on the ordinary opening slate, which seats a running mate, and run
// thirty weeks with nothing answered. The conviction itself is planted as one
// removal packet through `apply()` rather than earned: no governing script
// reliably carries a Senate conviction (the reckless proxy stalls at the
// articles with the President's caucus holding), and what this save exists to
// show is the hand-off, not the road to it. The three beats are the
// impeachment charter's own, and the ending names the successor the engine's
// line of succession names, so the room reads the engine rather than the
// fixture.
import { apply } from "../../packages/engine/dist/effects.js";
import { selectEnding } from "../../packages/engine/dist/elections.js";
import { successionHandover, successionOf } from "../../packages/engine/dist/succession.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "succession-removed";

const WEEKS = 30;
const BEATS = ["Lawmakers on a committee start talking about impeaching you.", "Congress votes to impeach you.", "You are found guilty at trial and removed from office."];

function convicted(campaign) {
  const beats = BEATS.map((description, index) => ({ turn: campaign.turn - (BEATS.length - 1 - index) * 3, description }));
  const handover = successionHandover(campaign);
  const arc = {
    ...campaign.removal,
    pressure: Math.max(campaign.removal.pressure, 0.61),
    beats,
    resolved: true,
    endingSummary: handover ? `${BEATS[2]} ${handover}` : BEATS[2],
  };
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: BEATS[2] },
    effects: [{ kind: "removal", arc }],
  });
}

export function build() {
  const opening = foundFixture({ seedText: "fixture-succession-removed", leaderName: "Fixture President" });
  if (!opening.vicePresident) throw new Error("expected the opening slate to seat a running mate");
  const removed = convicted(advanceWeeks(opening, WEEKS));
  const succession = successionOf(removed);
  if (selectEnding(removed) !== "removed" || succession?.successor !== opening.vicePresident) {
    throw new Error(`expected the Vice President to succeed on a removal; got ${selectEnding(removed)} and ${succession?.successor}`);
  }
  return removed;
}
