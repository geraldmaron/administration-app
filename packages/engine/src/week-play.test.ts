import { describe, expect, it } from "vitest";
import { playCampaign, type SkillProxy } from "./balance-harness.js";

const PROXIES = ["passive", "prudent", "reckless", "hawk"] as const satisfies readonly SkillProxy[];
const SEED = "living-clock-a";

function played(player: SkillProxy, layout: boolean) {
  return playCampaign(SEED, player, 52, "democrat", {}, { layout });
}

describe("a year of governing on the office-day cut", () => {
  it.each(PROXIES)("stays within the balance band for a %s President", (player) => {
    const laid = played(player, true);
    const flat = played(player, false);
    const slip = laid.final.approval - flat.final.approval;
    expect(laid.finalPressure).toBe(flat.finalPressure);
    expect(laid.actionsLanded).toBe(flat.actionsLanded);
    expect(laid.removed).toBe(flat.removed);
    expect(laid.ending).toBe(flat.ending);
    expect(laid.cabinetBreaks).toEqual(flat.cabinetBreaks);
    expect(Math.abs(slip)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(laid.final.stability - flat.final.stability)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(laid.final.treasury - flat.final.treasury)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(laid.final.militaryReadiness - flat.final.militaryReadiness)).toBeLessThanOrEqual(0.005);
  });
});
