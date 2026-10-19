// A story that ran its course while the committee it started kept going.
//
// A scenario reply stamps an authored scandal flag with its week, and in a week
// the Hill has turned on the administration the committee inquiry phase opens a
// file on the loudest live story. The corps carries the story until it fades
// and is declared over, and the inquiry is still gathering evidence after it:
// the state in which the story's own page is the only place left to learn who
// is still asking.
//
// The founding Congress sits with the President, and a panel that is with the
// administration opens nothing, so the week the story breaks is also a week the
// Hill sours; everything after it is the engine's own weeks.
import { apply } from "../../packages/engine/dist/effects.js";
import { markedFlags } from "../../packages/engine/dist/marked-flags.js";
import { selectScandals } from "../../packages/engine/dist/press-scandal.js";
import { matterForScandal } from "../../packages/engine/dist/committee-inquiry.js";
import { isMatterOpen } from "../../packages/engine/dist/oversight.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "scandal-ended";

const SCANDAL_FLAG = "scandal:the-hotel-contracts";
const WEEKS_TO_RUN_ITS_COURSE = 13;

export function build() {
  const opening = advanceWeeks(foundFixture({ seedText: "fixture-scandal-ended", leaderName: "Fixture President" }), 2);
  const broke = apply(opening, {
    source: "action",
    actor: "player",
    turn: opening.turn,
    narration: { summary: "The hotel contracts reach the papers." },
    effects: [{ kind: "flag", set: markedFlags([SCANDAL_FLAG], opening.turn) }],
  });
  const soured = apply(broke, {
    source: "simulate",
    actor: "world",
    turn: broke.turn,
    narration: { summary: "The Hill turns on the administration." },
    effects: [{ kind: "congress", set: { ...broke.congress, disposition: 0.3 } }],
  });
  const campaign = advanceWeeks(soured, WEEKS_TO_RUN_ITS_COURSE);
  const scandal = selectScandals(campaign).find((story) => story.origin.kind === "flagged" && story.origin.flag === SCANDAL_FLAG);
  if (scandal?.stage !== "resolved") throw new Error(`the story is ${scandal?.stage ?? "missing"}, not over`);
  const matter = matterForScandal(campaign, scandal.id);
  if (!matter || !isMatterOpen(matter)) throw new Error("no committee is still asking about the story");
  return campaign;
}
