import { describe, expect, it } from "vitest";
import type { NationId, StateId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { addDays } from "./clock.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { declareArmedForcesEmergency, renewEmergency } from "./emergency.js";
import { constructionAuthorityAvailable, militaryConstructionPhase } from "./military-construction.js";
import { constructionOrderSubjects } from "./order-subjects.js";
import { signOrder } from "./orders.js";
import { createRngStreams } from "./rng.js";
import type { Bill, Campaign } from "./state.js";

const { campaign: base, charter } = foundedForBalance("construction-clock");

function fundedEmergency(): Campaign {
  const conflict = openConflict(base.founding.nation, "IRN" as NationId, base.turn, "Armed forces required.");
  const war = { ...base, conflicts: { [conflict.id]: conflict } };
  const result = declareArmedForcesEmergency(war, conflict.id);
  if (!result.ok) throw new Error(result.reason);
  const declared = apply(war, result.packet);
  const bill: Bill = { id: "bill:construction", act: "act-military-facilities-appropriation", title: "Military facilities",
    sponsor: "administration", status: "law", introducedTurn: base.turn, passage: [] };
  return { ...declared, bills: { ...declared.bills, [bill.id]: bill }, militaryConstructionProjects: [{
    id: "milcon:source", name: "Existing military base project", hostState: "NC" as StateId,
    appropriationBill: bill.id, appropriated: 1000, obligated: 100, enactedTurn: base.turn, status: "active",
  }] };
}

describe("construction reads current emergency authority", () => {
  it("allows the final civil-anniversary day and refuses issuance at the deadline", () => {
    const funded = fundedEmergency();
    const before = { ...funded, turn: funded.turn + 52, calendar: addDays(funded.calendar, 364) };
    expect(constructionOrderSubjects(before)).toHaveLength(1);
    const expired = { ...funded, calendar: addDays(funded.calendar, 365) };
    expect(constructionOrderSubjects(expired)).toEqual([]);
  });

  it("keeps an early continuation's anniversary even after fifty-two weeks from notice", () => {
    const funded = fundedEmergency();
    const id = Object.keys(funded.emergencies)[0]!;
    const notice = { ...funded, calendar: addDays(funded.calendar, 275), turn: funded.turn + 39 };
    const result = renewEmergency(notice, id);
    if (!result.ok) throw new Error(result.reason);
    const renewed = apply(notice, result.packet);
    expect(constructionOrderSubjects({ ...renewed, calendar: addDays(funded.calendar, 650), turn: funded.turn + 92 })).toHaveLength(1);
  });

  it("stops new contracts at the shared ceiling while paying existing commitments", () => {
    const funded = fundedEmergency();
    const subject = constructionOrderSubjects(funded)[0]!;
    const signed = signOrder(funded, charter, "order-emergency-construction", createRngStreams(funded.seed), subject);
    if (!signed.ok) throw new Error(signed.reason);
    const after = apply(funded, signed.packet);
    const clock = Object.values(after.authorityClocks ?? {})[0]!;
    const ceiling = addDays(funded.calendar, 90);
    const constrained = { ...after, authorityClocks: { [clock.id]: { ...clock, terminatedDate: ceiling } } };
    expect(constructionAuthorityAvailable({ ...constrained, calendar: addDays(ceiling, -1) }, signed.record)).toBe(true);
    const expired = { ...constrained, calendar: ceiling, turn: funded.turn + 13,
      militaryConstructionProjects: after.militaryConstructionProjects!.map((project) => ({ ...project, redirectedObligated: 20 })) };
    expect(constructionAuthorityAvailable(expired, signed.record)).toBe(false);
    const paid = militaryConstructionPhase(expired).reduce(apply, expired).militaryConstructionProjects![0]!;
    expect(paid.redirectedObligated).toBe(20);
    expect(paid.redirectedSpent).toBeGreaterThan(0);
  });
});
