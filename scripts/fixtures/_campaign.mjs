// What fixture modules share: founding the way the founding screen seals, and
// running weeks with the phases the campaign's own charter runs.
//
// Imported only through scripts/make-fixture-saves.mjs, which installs the
// resolver player-core's dist needs under plain Node.
import { emptyMarkets } from "../../packages/engine/dist/markets.js";
import { campaignTurnPhases } from "../../packages/engine/dist/turn-phases.js";
import { advanceTurn } from "../../packages/engine/dist/turn-loop.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { openingCampaign } from "../../packages/player-core/dist/__fixtures__/opening.js";

/** Seals the founding screen's opening slate under a fixed seed and name. */
export function foundFixture({ seedText, leaderName }) {
  return openingCampaign({ seedText, leaderName });
}

/**
 * Runs whole weeks with nothing answered. This is the engine's turn, not the
 * Desk's Continue, so a staged decision left open is carried rather than
 * priced as silence; a fixture that needs the player's own pace should drive
 * the store instead.
 */
export function advanceWeeks(campaign, weeks) {
  if (!Number.isInteger(weeks) || weeks < 0) throw new Error(`advanceWeeks needs a whole number of weeks, got ${weeks}`);
  const phases = campaignTurnPhases(charterOf(campaign));
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) working = advanceTurn(working, phases);
  return working;
}

/**
 * The campaign with every commodity back at its opening level. Markets drift
 * from the first week, so a fixture that stages one matter must not also
 * carry whatever price case the drift happened to raise by then; an empty
 * commodity record reads at the opening levels, which raise no case.
 */
export function withOpeningCommodities(campaign) {
  return { ...campaign, markets: { ...(campaign.markets ?? emptyMarkets()), commodities: {} } };
}
