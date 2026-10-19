import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply, type EffectPacket } from "./effects.js";
import { legislativeAct } from "./legislative-acts.js";
import { billsOnTheAgenda, signBill, transmit, vetoBill } from "./legislation.js";
import { lawOffsetForBill, lawShift, lawShiftOverTenYears } from "./law-offsets.js";
import { militaryConstructionPhase } from "./military-construction.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { hasLawRevisionTakenEffect, selectCurrentLaws, selectLaws, type Bill, type Campaign } from "./state.js";

const HOUSING = "act-housing-supply";

function packet(result: { readonly ok: boolean; readonly packet?: EffectPacket; readonly reason?: string }): EffectPacket {
  if (!result.ok || !result.packet) throw new Error(result.reason ?? "The bill action failed.");
  return result.packet;
}

function housingLaw(campaign: Campaign, text: "base" | "targeted" = "base"): Campaign {
  const act = legislativeAct(HOUSING)!;
  const bill: Bill = { id: "bill:housing:20", act: HOUSING, title: act.title, sponsor: act.sponsor,
    introducedTurn: 18, resolvedTurn: 20, status: "law", enactedBy: "signed", passage: [], text: { enrolled: text } };
  return { ...campaign, turn: 20, bills: { ...campaign.bills, [bill.id]: bill } };
}

function introduce(campaign: Campaign, actId: string): { readonly campaign: Campaign; readonly bill: Bill } {
  const sent = apply(campaign, packet(transmit(campaign, actId)));
  const bill = Object.values(sent.bills).find((entry) => entry.act === actId && entry.status === "in-progress");
  if (!bill) throw new Error(`${actId} was not introduced`);
  return { campaign: sent, bill };
}

function putOnDesk(campaign: Campaign, bill: Bill): Campaign {
  return { ...campaign, bills: { ...campaign.bills, [bill.id]: { ...bill, status: "on-the-desk", stage: undefined } } };
}

describe("bill-based statute lifecycle", () => {
  it("makes repeal a committee bill and ends only ongoing housing provisions when enacted", () => {
    const old = housingLaw(buildCampaign());
    const original = selectLaws(old).find((bill) => bill.act === HOUSING)!;
    expect(lawShift(old).outlays).toBe(lawOffsetForBill(original)?.outlays);
    const { campaign: referred, bill } = introduce(old, "act-housing-repeal");
    expect(bill.stage).toBe("referral");
    expect(bill.revises).toEqual({ billId: original.id, kind: "repeal" });
    expect(lawShift(referred).outlays).toBe(lawShift(old).outlays);
    const desk = putOnDesk(referred, bill);
    const enacted = apply(desk, packet(signBill(desk, bill.id)));
    expect(selectLaws(enacted).map((entry) => entry.id)).toContain(original.id);
    expect(selectLaws(enacted).map((entry) => entry.id)).toContain(bill.id);
    expect(selectCurrentLaws(enacted).map((entry) => entry.id)).not.toContain(original.id);
    expect(lawShift(enacted).outlays).toBe(0);
    expect(billsOnTheAgenda(enacted).map((act) => act.id)).not.toContain("act-housing-renewal");
    expect(billsOnTheAgenda({ ...enacted, turn: enacted.turn + 1 }).map((act) => act.id)).toContain(HOUSING);
  });

  it("renews a sunset provision and replaces it with narrower ongoing terms", () => {
    const expired = { ...housingLaw(buildCampaign()), turn: 20 + TURNS_PER_YEAR * 4 + 1 };
    expect(lawShift(expired).outlays).toBe(0);
    expect(billsOnTheAgenda(expired).map((act) => act.id)).toContain("act-housing-renewal");
    const renewal = introduce(expired, "act-housing-renewal");
    const renewedDesk = putOnDesk(renewal.campaign, renewal.bill);
    const renewed = apply(renewedDesk, packet(signBill(renewedDesk, renewal.bill.id)));
    expect(renewed.bills[renewal.bill.id]?.revises?.provision).toBe("base");
    expect(lawShift(renewed).outlays).toBe(lawOffsetForBill(renewed.bills[renewal.bill.id]!)?.outlays);
    const replacement = introduce({ ...renewed, turn: renewed.turn + 1 }, "act-housing-replacement");
    expect(replacement.bill.revises?.billId).toBe(renewal.bill.id);
    const replacementDesk = putOnDesk(replacement.campaign, replacement.bill);
    const replaced = apply(replacementDesk, packet(signBill(replacementDesk, replacement.bill.id)));
    expect(selectLaws(replaced)).toHaveLength(3);
    expect(selectCurrentLaws(replaced).map((entry) => entry.id)).toEqual([replacement.bill.id]);
    expect(lawShift(replaced).outlays).toBeLessThan(lawShift(renewed).outlays);
    expect(lawShift(replaced).outlays).toBe(lawOffsetForBill(replaced.bills[replacement.bill.id]!)?.outlays);
  });

  it("leaves current law intact after veto or a failed revision, and ignores a stale competing enactment", () => {
    const old = housingLaw(buildCampaign());
    const repeal = introduce(old, "act-housing-repeal");
    const desk = putOnDesk(repeal.campaign, repeal.bill);
    const vetoed = apply(desk, packet(vetoBill(desk, repeal.bill.id, "The grants must continue.")));
    expect(lawShift(vetoed).outlays).toBe(lawShift(old).outlays);
    const dead = { ...vetoed, bills: { ...vetoed.bills, [repeal.bill.id]: { ...vetoed.bills[repeal.bill.id]!, status: "dead" as const } } };
    expect(lawShift(dead).outlays).toBe(lawShift(old).outlays);
    const first = { ...repeal.bill, id: "bill:first", status: "law" as const, resolvedTurn: 21 };
    const stale = { ...repeal.bill, id: "bill:stale", act: "act-housing-renewal", status: "law" as const,
      revises: { billId: "bill:housing:20", kind: "renewal" as const, provision: "base" as const }, resolvedTurn: 22 };
    const contested = { ...old, turn: 22, bills: { ...old.bills, [first.id]: first, [stale.id]: stale } };
    expect(selectCurrentLaws(contested)).toEqual([]);
    expect(selectLaws(contested)).toHaveLength(3);
    expect(lawShift(contested).outlays).toBe(0);
    expect(hasLawRevisionTakenEffect(contested, first.id)).toBe(true);
    expect(hasLawRevisionTakenEffect(contested, stale.id)).toBe(false);
  });

  it("reads a second housing act on an older save as renewal rather than a second annual charge", () => {
    const original = housingLaw(buildCampaign());
    const first = Object.values(original.bills).find((bill) => bill.act === HOUSING)!;
    const second: Bill = { ...first, id: "bill:housing:renewed-before-revisions",
      introducedTurn: 20 + TURNS_PER_YEAR * 4, resolvedTurn: 20 + TURNS_PER_YEAR * 4 };
    const legacy = { ...original, turn: second.resolvedTurn!, bills: { ...original.bills, [second.id]: second } };
    expect(selectLaws(legacy)).toHaveLength(2);
    expect(selectCurrentLaws(legacy).map((bill) => bill.id)).toEqual([second.id]);
    expect(lawShift(legacy).outlays).toBe(lawOffsetForBill(second)?.outlays);
    const repeal = introduce(legacy, "act-housing-repeal");
    expect(repeal.bill.revises?.billId).toBe(second.id);
    const desk = putOnDesk(repeal.campaign, repeal.bill);
    expect(lawShift(apply(desk, packet(signBill(desk, repeal.bill.id)))).outlays).toBe(0);
  });

  it("keeps unpaid construction contracts booked after the source statute is repealed", () => {
    const campaign = buildCampaign();
    const source: Bill = { id: "bill:construction", act: "act-military-facilities-appropriation",
      title: "The Military Facilities Appropriation Act", sponsor: "administration", introducedTurn: 1,
      resolvedTurn: 1, status: "law", passage: [] };
    const repeal: Bill = { id: "bill:construction-repeal", act: "act-housing-repeal",
      title: "The Construction Repeal Act", sponsor: "administration", introducedTurn: 2,
      resolvedTurn: 2, status: "law", passage: [], revises: { billId: source.id, kind: "repeal" } };
    const state: Campaign = { ...campaign, turn: 3, bills: { ...campaign.bills, [source.id]: source, [repeal.id]: repeal },
      militaryConstructionProjects: [{ id: "project:depot", name: "Depot", appropriationBill: source.id,
        appropriated: 1000, obligated: 400, sourceSpent: 100, enactedTurn: 1, status: "active" }] };
    expect(lawShiftOverTenYears(state).outlays).toBeGreaterThan(0);
    const next = militaryConstructionPhase(state).reduce(apply, state);
    expect(next.militaryConstructionProjects?.[0]?.obligated).toBe(400);
    expect(next.militaryConstructionProjects?.[0]?.sourceSpent).toBeGreaterThan(100);
  });
});
