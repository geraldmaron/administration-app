import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { branchBudgetAdequacy } from "./funding.js";
import { INSTITUTION_CATALOG, institutionDef, officeDef, selectVacancies } from "./institutions.js";
import { CIRCUIT_SEATS, CIRCUIT_SEAT_DEFS, DISTRICT_FORUM_READINGS, DISTRICT_FORUMS, SHARED_DISTRICT_SEATS, districtStrikeChance } from "./lower-bench.js";
import { CIRCUIT_SEAT_SOURCE, DISTRICT_SEAT_SOURCE } from "./lower-bench-source.js";
import { openNomination } from "./nomination.js";
import { executiveOrder } from "./orders.js";

describe("the sourced lower bench", () => {
  it("preserves the dated seat totals and the shared-district distinction", () => {
    expect(CIRCUIT_SEAT_SOURCE).toHaveLength(13);
    expect(CIRCUIT_SEATS).toHaveLength(179);
    expect(CIRCUIT_SEAT_DEFS).toHaveLength(179);
    expect(DISTRICT_SEAT_SOURCE).toHaveLength(94);
    expect(DISTRICT_FORUMS).toHaveLength(91);
    expect(SHARED_DISTRICT_SEATS).toHaveLength(3);
    expect(DISTRICT_SEAT_SOURCE.reduce((sum, row) => sum + row.authorized, 0)).toBe(673);
    expect(DISTRICT_SEAT_SOURCE.reduce((sum, row) => sum + row.vacancies, 0)).toBe(28);
    expect(DISTRICT_SEAT_SOURCE.reduce((sum, row) => sum + row.activeRepublican + row.activeDemocratic, 0)).toBe(647);
  });

  it("keeps anonymous occupied circuit seats out of executive workloads and nominations", () => {
    const campaign = foundedForBalance("lower-bench-source").campaign;
    const first = CIRCUIT_SEATS[0]!;
    expect(campaign.institutions[first.id]?.vacancy).toBe(false);
    expect(campaign.institutions[first.id]?.leader).toBeUndefined();
    expect(campaign.institutions[first.id]?.lowerBenchSeat?.appointingParty).toBeDefined();
    expect(institutionDef(first.id)?.offices[0]?.id).toBe(first.office);
    expect(officeDef(first.office)?.appointmentClass).toBe("judicial");
    expect(INSTITUTION_CATALOG.some((def) => def.id === first.id)).toBe(false);
    expect(selectVacancies(campaign).some((seat) => seat.id === first.id)).toBe(false);
    expect(branchBudgetAdequacy(campaign)).toBeGreaterThan(0);
    const candidate = Object.values(campaign.people).find((person) => person.alive && !person.currentRole)!;
    const attempt = openNomination(campaign, first.office, candidate.base.id);
    expect(attempt).toMatchObject({ ok: false, reason: expect.stringContaining("occupied") });
  });

  it("keeps the appointer adjustment subordinate to merits and reverses it with policy direction", () => {
    const forum = DISTRICT_FORUM_READINGS.find((row) => row.activeDemocratic > row.activeRepublican)!;
    const order = executiveOrder("order-relief-program")!;
    const opposite = { ...order, alignment: { ...order.alignment, economicLeftRight: 0.2 } };
    const baseline = 0.55;
    expect(districtStrikeChance(baseline, forum, order)).toBeLessThan(baseline);
    expect(districtStrikeChance(baseline, forum, opposite)).toBeGreaterThan(baseline);
    expect(districtStrikeChance(baseline, forum, { ...order, alignment: {} })).toBe(baseline);
    expect(Math.abs(districtStrikeChance(baseline, forum, order) - baseline)).toBeLessThanOrEqual(0.04);
  });
});
