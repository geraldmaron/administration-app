// A foreign election just held: a new head of government seated with the
// offset their character brings, and the foreign press's first coverage.
//
// The run goes a week at a time from the oath and stops the week after the
// first election abroad that changes a chair, so the save opens with that
// change on the country file and in the feed, and with a week of the press
// abroad already filed. A year with no such election is a broken calendar, not
// a quiet one, so the build fails rather than handing the browser a save that
// only looks right.
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "foreign-election";

const LIMIT_WEEKS = 52;

function changedChair(campaign) {
  return (campaign.foreignPolitics?.recent ?? []).find((change) => change.kind === "election" && !change.held && !change.projected);
}

export function build() {
  let working = foundFixture({ seedText: "fixture-foreign-election", leaderName: "Fixture President" });
  for (let week = 0; week < LIMIT_WEEKS; week += 1) {
    working = advanceWeeks(working, 1);
    const change = changedChair(working);
    if (change && working.foreignCoverage && working.foreignPolitics?.seats[change.nation]?.provenance === "played") return working;
  }
  throw new Error(`no election abroad changed a chair in the first ${LIMIT_WEEKS} weeks of fixture-foreign-election`);
}
