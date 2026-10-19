// A save founded before the leader table existed, opened by a build that ships it.
//
// Such a save loads and plays: its people are stored in it and are never
// re-dealt. But its foreign leaders were drawn at random, so a woman can hold
// the chair the table records as a King's. What this save must not do is wear
// the table's titles or carry the note that its leaders were modeled on real
// governments. A save from before the table is told apart by the one thing it
// lacks: the founding's leader-table stamp, which is stripped here.
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "before-leader-table";

export function build() {
  const campaign = advanceWeeks(foundFixture({ seedText: "fixture-before-leader-table", leaderName: "Fixture President" }), 2);
  const { leaderTable, ...founding } = campaign.founding;
  if (leaderTable === undefined) throw new Error("the founding carries no leader-table stamp to strip");
  return { ...campaign, founding };
}
