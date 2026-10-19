import { foundFixture, advanceWeeks } from "./_campaign.mjs";

export const name = "congress-members";

export function build() {
  let campaign = foundFixture({ seedText: "fixture-congress-members", leaderName: "Fixture President" });
  for (let week = 0; week < 52; week += 1) {
    campaign = advanceWeeks(campaign, 1);
    const recorded = Object.values(campaign.bills).some((bill) => bill.passage.some((vote) =>
      vote.recordedTurn !== undefined && (vote.rollCall?.length ?? 0) > 0));
    if (recorded) return campaign;
  }
  throw new Error("No individual floor vote was recorded in the first year.");
}
