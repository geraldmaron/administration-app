// A scandal the country can already read, past its first week, with the three
// answers to it still open.
//
// The same emergency declaration `scandal-breaking` opens, in a week the papers
// have already turned on the administration, so the story gets legs rather than
// dying the week after it broke. Three of the engine's own weeks later it is a
// running story that names the Attorney General and has not been answered.
import { apply } from "../../packages/engine/dist/effects.js";
import { selectScandals } from "../../packages/engine/dist/press-scandal.js";
import { scandalResponseTaken } from "../../packages/engine/dist/scandal-response.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";
import { signDeclaration } from "./scandal-breaking.mjs";

export const name = "scandal-live";

const WEEKS_RUNNING = 3;
// Hostile enough that the charge clears the legs bar: a story needs its
// gravity times the press climate above `SCANDAL_LEGS_BAR`, and the climate
// reads every national desk, so a corps only mildly cool lets the
// emergency-powers charge die the week after it broke.
const HOSTILE = 0.05;

function pressTurns(campaign) {
  const dispositions = Object.fromEntries(Object.keys(campaign.press.dispositions).map((id) => [id, HOSTILE]));
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: "The press corps turns on the administration." },
    effects: [{ kind: "press", set: { ...campaign.press, standing: HOSTILE, dispositions } }],
  });
}

export function build() {
  const opening = advanceWeeks(foundFixture({ seedText: "fixture-scandal-live", leaderName: "Fixture President" }), 2);
  const campaign = advanceWeeks(pressTurns(signDeclaration(opening)), WEEKS_RUNNING);
  const story = selectScandals(campaign).find((scandal) => scandal.origin.kind === "own-act");
  if (!story || story.stage === "resolved" || story.stage === "breaking") {
    throw new Error(`the story is ${story?.stage ?? "missing"}, not running`);
  }
  if (campaign.turn - story.brokeTurn < 1) throw new Error("the story is still in the week it broke");
  if (scandalResponseTaken(campaign, story.id)) throw new Error("the story has already been answered");
  return campaign;
}
