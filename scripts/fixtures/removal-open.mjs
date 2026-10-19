// A removal proceeding under way, with the House and the Senate counted by
// caucus on the removal screen.
//
// Founded and governed the way the balance harness's reckless proxy is: a
// Democrat sworn in on the harness's own founding, a program of emergency
// powers, conscription and surveillance, and every week the heaviest act the
// treasury can cover, the costliest first, with nothing answered at the desk.
// The seed seats a House the opposition holds, so the articles carry on the
// opposition's own benches. It runs until they have, then stops with the
// Senate counting and the President's own caucus holding, which is the week a
// President reads how many of their own senators would have to break.
import { candidateTargetsForBalance, foundedForBalance } from "../../packages/engine/dist/balance-harness.js";
import { apply } from "../../packages/engine/dist/effects.js";
import { INSTRUMENT_IDS, RUNG_LEVELS } from "../../packages/engine/dist/instrument-ids.js";
import { enactPolicy } from "../../packages/engine/dist/policy-draft.js";
import { selectRemovalVotes } from "../../packages/engine/dist/removal.js";
import { projectAction, resolveAction } from "../../packages/engine/dist/resolution.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { campaignTurnPhases } from "../../packages/engine/dist/turn-phases.js";
import { advanceTurn } from "../../packages/engine/dist/turn-loop.js";

export const name = "removal-open";

const PROGRAM = ["civil-emergency-powers", "industry-extraction", "defense-conscription", "security-surveillance"];

// Long enough for the reading to climb two rungs and the House to count, short
// enough that a change which stops the articles carrying fails here rather
// than running out the year.
const MOST_WEEKS = 60;

function enactProgram(campaign) {
  return PROGRAM.reduce((working, stanceId) => {
    const enacted = enactPolicy(working, stanceId);
    return enacted.ok ? apply(working, enacted.packet) : working;
  }, campaign);
}

/**
 * The reckless proxy's pick: the highest rung the treasury can cover, and
 * among those the one that spends the most (a spend is a negative figure).
 * Resolved on fresh streams, as the harness resolves it.
 */
function heaviestAct(campaign) {
  const streams = createRngStreams(campaign.seed);
  const actor = campaign.founding.nation;
  const options = candidateTargetsForBalance(campaign)
    .flatMap((target) => INSTRUMENT_IDS.flatMap((instrument) => RUNG_LEVELS.map((rung) => ({ actor, target, instrument, rung }))))
    .map((request) => ({ request, projected: projectAction(campaign, request, streams) }))
    .filter((option) => option.projected.ok);
  const cost = (option) => option.projected.projection.cost.treasury ?? 0;
  const [chosen] = options
    .filter((option) => Math.abs(cost(option)) <= campaign.player.metrics.treasury)
    .sort((a, b) => b.request.rung - a.request.rung || cost(a) - cost(b));
  if (!chosen) return campaign;
  const result = resolveAction(campaign, chosen.request, createRngStreams(campaign.seed), "action");
  return result.ok ? apply(campaign, result.packet) : campaign;
}

function assertOpen(campaign, charter) {
  const [articles, conviction] = selectRemovalVotes(campaign, charter);
  const house = campaign.congress.chambers.house;
  if (house.opposition <= house.administration || articles?.caucus.yeas !== 0) {
    throw new Error(`expected the articles carried by the opposition alone; the House is ${house.administration}-${house.opposition}`);
  }
  if (!conviction || conviction.vote.passed || conviction.caucus.yeas !== 0 || conviction.caucus.mustBreak === 0) {
    throw new Error(
      `expected the Senate short with the President's caucus holding; it counts ${conviction?.vote.yeas}/` +
        `${conviction?.vote.required} with ${conviction?.caucus.yeas} of ${conviction?.caucus.seats} breaking`,
    );
  }
  return campaign;
}

export function build() {
  const { campaign: opening, charter } = foundedForBalance("fixture-removal-open-articles", "democrat");
  const phases = campaignTurnPhases(charter);
  let campaign = enactProgram(opening);
  for (let week = 0; week < MOST_WEEKS && !campaign.removal.resolved; week += 1) {
    campaign = advanceTurn(heaviestAct(campaign), phases);
    if (campaign.removal.beats.length === 2) return assertOpen(campaign, charter);
  }
  throw new Error(
    `expected the House to vote the articles within ${MOST_WEEKS} weeks; the arc stands at ` +
      `${campaign.removal.beats.length} beats, pressure ${campaign.removal.pressure.toFixed(3)}, resolved ${campaign.removal.resolved}`,
  );
}
