// A scandal in the week it broke, before the administration has said anything
// about it.
//
// Two weeks in, the President signs an emergency declaration on the Attorney
// General's counsel: a decision that reaches for emergency powers, which is a
// charge the papers can run. The save is taken the same week, so the story is
// breaking, names the Attorney General, and has not been answered: the state in
// which the Desk asks for the President and the story's page offers all three
// answers.
import { apply } from "../../packages/engine/dist/effects.js";
import { selectScandals } from "../../packages/engine/dist/press-scandal.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "scandal-breaking";

const ATTORNEY_GENERAL = "role-attorney-general";

/** The declaration, as a decided reply writes it: the declared cost and the chair whose counsel it took. */
export function signDeclaration(campaign) {
  const person = campaign.player.cabinet[ATTORNEY_GENERAL];
  if (!person) throw new Error("the fixture founding seats no Attorney General");
  return apply(campaign, {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    narration: { summary: "The President declares a national emergency over the border crossings and redirects construction funds." },
    institutional: ["emergency-powers-invoked"],
    counsel: { role: ATTORNEY_GENERAL, person, stance: "for" },
    effects: [],
  });
}

export function build() {
  const opening = advanceWeeks(foundFixture({ seedText: "fixture-scandal-breaking", leaderName: "Fixture President" }), 2);
  const campaign = signDeclaration(opening);
  const story = selectScandals(campaign).find((scandal) => scandal.origin.kind === "own-act");
  if (!story) throw new Error("the declaration opened no story");
  if (story.stage !== "breaking" || story.brokeTurn !== campaign.turn) {
    throw new Error(`the story is ${story.stage} from turn ${story.brokeTurn}, not breaking this week (turn ${campaign.turn})`);
  }
  return campaign;
}
