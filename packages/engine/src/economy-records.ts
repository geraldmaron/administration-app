import { openingDebtLimit } from "./debt-limit.js";
import { openingMacro } from "./macro-state.js";
import { openingBooks } from "./national-books.js";
import { inheritedPolicies } from "./policy.js";
import { selectNation } from "./state-selectors.js";
import type { Campaign } from "./state.js";

/**
 * The economy's three kept records, opened wherever a campaign lacks them: at
 * the oath, and on loading a save that predates them. Each opener
 * reads the campaign as it stands rather than as it was founded, so a load
 * forgives no deterioration the campaign already lived through.
 */
export function withEconomyRecords(campaign: Campaign): Campaign {
  if (campaign.macro !== undefined && campaign.books !== undefined && campaign.debtLimit !== undefined) return campaign;
  return {
    ...campaign,
    macro: campaign.macro ?? openingMacro(campaign),
    books: campaign.books ?? openingBooks(campaign),
    debtLimit: campaign.debtLimit ?? openingDebtLimit(campaign),
  };
}

/**
 * The records at the oath, opened on the country the President inherits: the
 * predecessor's program in every domain. A program the platform holds from the
 * first day is the new President's change to that budget, so the books meet it
 * as one: the push it gives demand, the borrowing it adds to the President's
 * own stock, and the ten-year the market prices for it. Opened on the platform
 * instead, a President who ran on borrowing to build inherited the borrowing
 * and was never charged for it.
 */
export function withOathEconomyRecords(campaign: Campaign): Campaign {
  const inherited = withEconomyRecords({ ...campaign, player: { ...campaign.player, policies: inheritedPolicies() } });
  return { ...campaign, macro: inherited.macro, books: inherited.books, debtLimit: inherited.debtLimit };
}

// A v51 save was written by a build that kept the United States' debt as the
// gross figure, what one arm of the government owes another counted in. v52
// keeps debt held by the public (101% of output in 2026), the stock the
// Treasury actually borrows against and the one every fiscal reading is
// calibrated on. Opened unconverted, a v51 save reads nineteen points more
// debt than the country carries, and the rating, fiscal-crisis pressure, the
// coalitions and purseFit all inherit the inflated ratio.
const GROSS_US_DEBT = 32_998_616;
const PUBLIC_US_DEBT = 27_773_835;

/**
 * Rescales a v51 save's US debt stock from gross debt to debt held by the
 * public before the economy's records open on it. A no-op once the records
 * exist, since only a save that predates them predates the rescale too.
 */
export function withPublicDebtRebase(campaign: Campaign): Campaign {
  if (campaign.macro !== undefined && campaign.books !== undefined && campaign.debtLimit !== undefined) return campaign;
  const us = selectNation(campaign, campaign.founding.nation);
  if (!us) return campaign;
  const rebased = Math.round((us.stats.economy.debt * PUBLIC_US_DEBT) / GROSS_US_DEBT);
  return {
    ...campaign,
    nations: {
      ...campaign.nations,
      [campaign.founding.nation]: { ...us, stats: { ...us.stats, economy: { ...us.stats.economy, debt: rebased } } },
    },
  };
}
