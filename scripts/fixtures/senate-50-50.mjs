// A Senate split fifty-fifty, so the President of the Senate's tie-break is the
// vote that decides the floor.
//
// Three things have to be true at once for that to be the state the name
// promises, and each is built rather than hoped for: a Vice President is seated
// (the quick oath leaves the chair empty, so this founding names a running mate
// off the same slate the founding screen offers), actual senator identities are
// retained, and the measure on the floor carries the momentum at which this chamber
// counts exactly even. Then the bill reads 51-50 with the chair's vote on the
// record, and the same bill with the chair empty fails.
//
// The momentum is searched rather than the room's mood: a bill's weeks of
// argument are a figure the record already keeps per bill, so the chamber is left
// exactly as the founding seated it and the tie is a fact about this measure.
//
// The presiding officer is written here by hand: the seal that will write it from
// the Vice President's own Hill service is a later change, and a fixture that
// waited for it would import as a Senate with nobody in the chair.
import { apply } from "../../packages/engine/dist/effects.js";
import { requestBudgetResolution } from "../../packages/engine/dist/reconciliation.js";
import { projectPassage } from "../../packages/engine/dist/bill-stages.js";
import { legislativeAct } from "../../packages/engine/dist/legislative-acts.js";
import { makeCampaignSeed } from "../../packages/engine/dist/rng.js";
import { sealFounding } from "../../packages/engine/dist/founding.js";
import { worldDataset } from "../../packages/world/dist/index.js";
import {
  cabinetSlate,
  charterFor,
  foundingOptions,
  openingChoices,
  runningMateSlate,
} from "../../packages/player-core/dist/index.js";

export const name = "senate-50-50";

/** The measure on the floor: a budget-track bill, which is where a simple majority decides passage. */
const ACT_ID = "act-debt-limit-increase";

function foundWithRunningMate(seedText, leaderName) {
  const seed = makeCampaignSeed(seedText);
  const options = foundingOptions(seed);
  const opening = openingChoices(options);
  const leader = { ...opening.leader, name: leaderName };
  const nation = options.nations[0];
  const charter = charterFor(options, nation.identity.government);
  const slate = cabinetSlate(options, charter, nation, leader);
  const cabinet = Object.fromEntries(Object.entries(slate).map(([role, list]) => [role, list[0].id]));
  const mates = runningMateSlate(options, { leader, cabinet });
  const runningMate = mates[0]?.person.id;
  if (!runningMate) throw new Error("the founding slate offers no running mate to seat in the chair");
  return sealFounding(seed, worldDataset, { ...opening, leader, cabinet, runningMate });
}

function withPresidingChair(campaign) {
  const vicePresident = campaign.vicePresident;
  if (!vicePresident) throw new Error("the founding sealed no Vice President to preside");
  return {
    ...campaign,
    congress: {
      ...campaign.congress,
      presidingOfficer: { person: vicePresident, liaison: 0 },
    },
  };
}

/** The weeks of argument at which this chamber counts exactly fifty for the measure. */
function momentumForATie(campaign, act, billId) {
  for (let step = -500; step <= 500; step += 1) {
    const momentum = step / 1000;
    const senate = projectPassage(campaign, act, momentum, billId).find((vote) => vote.chamber === "senate");
    // The tie-break is applied by the count itself, so an even chamber reads as
    // fifty-one carried by the chair.
    if (senate?.tieBrokenBy !== undefined) return momentum;
  }
  throw new Error("no momentum lands this Senate on an even count");
}

function withBillOnTheFloor(campaign, act, momentum) {
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
    momentum,
    beats: [],
    passage: projectPassage(campaign, act, momentum, id),
  };
  return { ...campaign, bills: { ...campaign.bills, [id]: bill } };
}

export function build() {
  const act = legislativeAct(ACT_ID);
  if (!act) throw new Error(`the catalogue has no ${ACT_ID} to put on the floor`);
  const seated = withPresidingChair(foundWithRunningMate("fixture-senate-50-50", "Fixture President"));
  const pending = withBillOnTheFloor(seated, act, 0);
  const billId = `bill:${act.id}:${pending.turn}`;
  const instruction = requestBudgetResolution(pending, billId);
  if (!instruction.ok || !instruction.record.adopted) throw new Error("the chambers did not adopt the debt-limit reconciliation instruction");
  const instructed = apply(pending, instruction.packet);
  const campaign = withBillOnTheFloor(instructed, act, momentumForATie(instructed, act, billId));
  const bill = Object.values(campaign.bills).find((entry) => entry.act === ACT_ID);
  const senate = bill?.passage.find((vote) => vote.chamber === "senate");
  if (!senate || senate.tieBrokenBy !== campaign.vicePresident) {
    throw new Error("the senate-50-50 fixture's bill was not decided by the chair");
  }
  if (senate.yeas !== 51 || senate.nays !== 50 || !senate.passed) {
    throw new Error(`the tie-break did not carry the measure 51-50 (got ${senate.yeas}-${senate.nays})`);
  }
  if (senate.cloture || senate.castingVote?.person !== campaign.vicePresident || senate.castingVote.yea !== true) {
    throw new Error("the majority route did not record the Vice President's additional casting vote");
  }
  if (senate.rollCall?.filter((vote) => vote.yea).length !== 50 || senate.rollCall?.filter((vote) => !vote.yea).length !== 50) {
    throw new Error(`the actual senator ballots do not remain fifty-fifty (${senate.rollCall?.length} recorded, ${senate.rollCall?.filter((vote) => vote.yea).length} yea, ${senate.rollCall?.filter((vote) => !vote.yea).length} nay; ${campaign.congress.members?.length} members)`);
  }
  const withoutChair = projectPassage({ ...campaign, congress: { ...campaign.congress, presidingOfficer: undefined } }, act, bill.momentum, bill.id).find((vote) => vote.chamber === "senate");
  if (withoutChair?.passed || withoutChair?.yeas !== 50 || withoutChair?.nays !== 50) throw new Error("the same senators carry the measure without the chair");
  if (senate.rollCall.length !== campaign.congress.chambers.senate.seats) throw new Error("the recorded senator identities do not match the chamber");
  return campaign;
}
