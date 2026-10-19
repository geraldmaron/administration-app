// An inflation shock injected through a condition, strong enough that prices
// pull approval down on the Desk and on the approval file.
//
// United States inflation cannot reach the public's pain line on its own: it
// rests at its published figure and the cycle adds at most about three points,
// and the inflation-shock condition may not write the rate it opens on. So the
// shock arrives the way a crisis does in the engine, as one world packet that
// opens the condition and moves prices with it, and the country then lives
// three ordinary weeks with it: inside the four the Desk looks back over when
// it names what is pulling approval down. Later than that the read moves on,
// honestly, to the slowdown the shock sets off.
//
// A year and a half in rather than on the morning of the oath: a public opens
// with its sense of safety above where order at home can hold it and its sense
// of prosperity below where the economy would put it. The condition is a label
// that bills approval nothing of its own, so prices reach it only through the
// rate prosperity reads, and through the first year the settling of both
// judgments outweighs that.
import { apply } from "../../packages/engine/dist/effects.js";
import { selectSalience } from "../../packages/engine/dist/opinion.js";
import { approvalDrag } from "../../packages/player-core/dist/index.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "inflation-shock";

/** Points of inflation above where the term began: past the public's pain line, short of a price-shock onset. */
const SHOCK = 0.045;
const WEEKS_BEFORE = 78;
const WEEKS_AFTER = 3;

function shock(campaign) {
  const nation = campaign.founding.nation;
  const inflation = campaign.nations[nation].base.stats.economy.inflation + SHOCK;
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: "Prices jump: consumer inflation runs four and a half points above where the term began." },
    effects: [
      {
        kind: "condition",
        set: {
          id: `condition:inflation-shock:${nation}:${campaign.turn}`,
          nation,
          kind: "inflation-shock",
          scope: "nation",
          severity: 0.6,
          startedTurn: campaign.turn,
          status: "active",
          beats: [{ turn: campaign.turn, description: "Prices jump across the country." }],
        },
      },
      { kind: "flag", set: [`condition:inflation-shock:${nation}`] },
      { kind: "nationStat", nation, setStats: { economy: { inflation } } },
    ],
  });
}

export function build() {
  const settled = advanceWeeks(foundFixture({ seedText: "fixture-inflation-shock", leaderName: "Fixture President" }), WEEKS_BEFORE);
  const campaign = advanceWeeks(shock(settled), WEEKS_AFTER);

  if (!selectSalience(campaign).includes("economicPain")) throw new Error("the shock no longer makes the week about prices");
  // The Desk names the judgment that fell furthest over the last four weeks and
  // the term inside it that moved, so a save inside that window has to read
  // prices as the thing pulling approval down.
  const drag = approvalDrag(campaign);
  if (drag?.cause !== "Prices") throw new Error(`the Desk reads ${JSON.stringify(drag)} as the drag, not prices`);
  const prosperityFall = settled.player.opinion.prosperity - campaign.player.opinion.prosperity;
  if (prosperityFall < 0.01) {
    throw new Error(`the price shock moved the prosperity judgment ${prosperityFall.toFixed(4)}, under the point a shock has to cost`);
  }
  // The headline itself is deliberately not asserted. It is the sum of six
  // judgments, the President's own partisan base and a decaying honeymoon, so it
  // answers "what is the country carrying" rather than "did prices bite".
  // Requiring the headline to fall would be asking the whole board a question
  // about one of its terms.
  return campaign;
}
