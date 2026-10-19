import { apply } from "../../packages/engine/dist/effects.js";
import { advanceBills, projectPassage } from "../../packages/engine/dist/bill-stages.js";
import { selectDateOfTurn } from "../../packages/engine/dist/clock.js";
import { legislativeAct } from "../../packages/engine/dist/legislative-acts.js";
import { proposeHousingText, recommendHousingConferenceText } from "../../packages/engine/dist/bill-text-actions.js";
import { foundFixture } from "./_campaign.mjs";

const ACT = "act-housing-supply";
export const HOUSING_BILL_ID = "bill:act-housing-supply:fixture";

function commit(campaign, result) {
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
}

function step(campaign) {
  const turn = campaign.turn + 1;
  const dated = { ...campaign, turn, calendar: selectDateOfTurn(campaign, turn) };
  const advanced = advanceBills(dated);
  return advanced.effects.length
    ? apply(dated, { source: "simulate", actor: "world", turn, narration: { summary: advanced.accounts.join(" ") || "Congress meets." }, effects: advanced.effects })
    : dated;
}

function reach(campaign, target) {
  let current = campaign;
  for (let week = 0; week < 50; week += 1) {
    current = step(current);
    const bill = current.bills[HOUSING_BILL_ID];
    if (bill?.stage === target || bill?.status === target) return current;
    if (bill?.status === "dead") throw new Error(`housing bill died before ${target}`);
  }
  throw new Error(`housing bill never reached ${target}`);
}

export function conferenceHousing() {
  const original = foundFixture({ seedText: "fixture-housing-conference", leaderName: "Fixture President" });
  const act = legislativeAct(ACT);
  if (!act) throw new Error("housing act missing");
  const campaign = { ...original, congress: { ...original.congress, disposition: 0.9, chambers: {
    house: { seats: 435, administration: 280, opposition: 155, independent: 0 },
    senate: { seats: 100, administration: 70, opposition: 30, independent: 0 },
  } } };
  const bill = { id: HOUSING_BILL_ID, act: ACT, title: act.title, sponsor: act.sponsor,
    introducedTurn: campaign.turn, status: "in-progress", stage: "markup", passage: projectPassage(campaign, act), beats: [] };
  const introduced = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
  const amended = commit(introduced, proposeHousingText(introduced, bill.id));
  const conference = reach(amended, "conference");
  if (conference.bills[bill.id]?.text?.house !== "base" || conference.bills[bill.id]?.text?.senate !== "targeted") {
    throw new Error("Congress did not pass different housing texts");
  }
  return conference;
}

export function enrolledHousing() {
  const conference = conferenceHousing();
  const recommended = commit(conference, recommendHousingConferenceText(conference, HOUSING_BILL_ID, "targeted"));
  const enrolled = reach(recommended, "on-the-desk");
  if (enrolled.bills[HOUSING_BILL_ID]?.text?.enrolled !== "targeted") throw new Error("targeted housing text was not enrolled");
  return enrolled;
}
