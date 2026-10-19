// A continuing resolution short of the votes to keep the lights on, with the
// minority leader who is the counterparty seated and named.
//
// Which continuing resolution matters, and the fixture is explicit about it. A
// clean six-week stopgap inside its deadline is counted on the one question
// members answer to whatever they think of the President — the government
// staying open — and that count clears sixty in the Senate at any disposition a
// chamber can hold. That is deliberate: a sixty-vote stopgap that could fail on
// the room's mood would be a shutdown with no way out of it. So the measure that
// fails is the one the floor reaches when the appropriations process has already
// collapsed — the full-year resolution, which travels on the ordinary track with
// no such floor under it — and the fixture asserts both halves, so a reader
// cannot mistake this for "a CR cannot pass".
import { projectPassage } from "../../packages/engine/dist/bill-stages.js";
import { carried, floorThreshold } from "../../packages/engine/dist/congress.js";
import { countFundingContinuityVote } from "../../packages/engine/dist/congress-votes.js";
import { legislativeAct } from "../../packages/engine/dist/legislative-acts.js";
import { selectHillMember } from "../../packages/engine/dist/hill.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "failing-cr";

const FULL_YEAR = "act-full-year-continuing-resolution";
const STOPGAP = "act-continuing-resolution";

/**
 * The Senate the other side holds, the money two weeks from running out, and a
 * room cold enough that nothing ordinary carries.
 */
function divided(campaign) {
  return {
    ...campaign,
    congress: {
      ...campaign.congress,
      disposition: 0.2,
      appropriation: {
        ...campaign.congress.appropriation,
        // Inside the two-week window the stopgap is taken up in, and running on
        // last year's numbers already.
        throughTurn: campaign.turn + 1,
        onPriorYear: true,
      },
    },
  };
}

function withBillOnTheFloor(campaign, act) {
  const id = `bill:${act.id}:${campaign.turn}`;
  const bill = {
    id,
    act: act.id,
    title: act.title,
    sponsor: act.sponsor,
    introducedTurn: campaign.turn,
    status: "in-progress",
    stage: "floor",
    setbacks: 0,
    momentum: 0,
    beats: [],
    passage: projectPassage(campaign, act),
  };
  return { ...campaign, bills: { ...campaign.bills, [id]: bill } };
}

export function build() {
  const act = legislativeAct(FULL_YEAR);
  const stopgap = legislativeAct(STOPGAP);
  if (!act || !stopgap) throw new Error("the catalogue has no continuing resolution to put on the floor");
  const campaign = withBillOnTheFloor(divided(foundFixture({ seedText: "fixture-failing-cr", leaderName: "Fixture President" })), act);
  const bill = Object.values(campaign.bills).find((entry) => entry.act === FULL_YEAR);
  const senate = bill?.passage.find((vote) => vote.chamber === "senate");
  if (!senate) throw new Error("the failing-cr fixture's bill was never counted");
  if (senate.passed || carried(bill.passage)) {
    throw new Error(`the failing-cr fixture's resolution carries (${senate.yeas} of ${senate.required})`);
  }
  if (senate.required !== 51 || senate.cloture?.required !== floorThreshold(campaign.congress, "senate", "ordinary") || senate.cloture.passed) {
    throw new Error("the failing resolution does not have a failed sixty-vote cloture gate and a separate majority count");
  }
  if (senate.rollCall?.length !== 100 || senate.cloture.rollCall?.length !== 100) throw new Error("the failing resolution has no actual senator roll calls");
  // The counterparty the President is dealing with, seated and nameable.
  const minority = selectHillMember(campaign, "post-senate-minority-leader");
  if (!minority?.person) throw new Error("the failing-cr fixture has no minority leader to name");
  // And the clean stopgap still carries, which is why the lapse has a way out.
  const clean = countFundingContinuityVote(
    campaign.congress,
    "senate",
    stopgap.appeal,
    floorThreshold(campaign.congress, "senate", "ordinary"),
    campaign.states,
    campaign.people,
  );
  if (!clean.passed || !clean.cloture?.passed) throw new Error("the clean stopgap no longer clears sixty; the lapse has no way out");
  return campaign;
}
