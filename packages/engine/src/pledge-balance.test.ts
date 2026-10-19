import { describe, expect, it } from "vitest";
import type { PlankId } from "@admin/world";
import { balanceSeeds, runBalanceHarness, type BalanceReport, type HarnessPlatform, type SkillProxy } from "./balance-harness.js";
import { CAMPAIGN_OPENING_DATE, turnOnDate } from "./clock.js";
import { pledgeDueDate, type PledgeStatus } from "./pledges.js";
import { plankDeliverable } from "./platform-deliverables.js";

// The balance gate on a platform.
//
// Every other run founds the way the quick oath does, on no platform, so the
// gate never saw a pledge settle. This one founds a Republican on a full
// platform with a first-hundred-days priority and plays it to the first
// midterm, when every term pledge falls due. The proxies know nothing of the
// promises: what the ledger says at the end is what a President who ignored
// the platform would be told they had kept and broken.

const PLATFORM: HarnessPlatform = {
  platform: ["plank-balanced-budget", "plank-fair-trade", "plank-energy-dominance", "plank-secure-border", "plank-rebuild-military"].map(
    (id) => id as PlankId,
  ),
  firstHundredDays: ["plank-secure-border" as PlankId],
};

/** Through the first midterm, when every term pledge falls due, and a week more for it to settle. */
const HORIZON = turnOnDate(CAMPAIGN_OPENING_DATE, pledgeDueDate(CAMPAIGN_OPENING_DATE, false)) + 1;
const SEEDS = balanceSeeds(4);
const PROXIES: readonly SkillProxy[] = ["passive", "prudent"];

let cached: BalanceReport | undefined;
function report(): BalanceReport {
  cached ??= runBalanceHarness(SEEDS, HORIZON, PROXIES, "republican", PLATFORM);
  return cached;
}

function statuses(skill: SkillProxy, only?: (plank: string) => boolean): readonly PledgeStatus[] {
  return report()
    .outcomes.filter((outcome) => outcome.skill === skill)
    .flatMap((outcome) => outcome.pledges.filter((pledge) => only?.(pledge.plank as string) ?? true).map((pledge) => pledge.status));
}

const heldProgram = (plank: string) => plankDeliverable(plank)?.kind === "hold-program";

describe("the balance of a campaign run on a platform", () => {
  it("reports what the promises came to", () => {
    for (const skill of PROXIES) {
      const all = statuses(skill);
      const count = (status: PledgeStatus) => all.filter((entry) => entry === status).length;
      console.info(`[republican ${skill} on a platform] kept ${count("kept")}, broken ${count("broken")}, open ${count("open")} of ${all.length}`);
    }
  });

  it("settles every promise by the first midterm", () => {
    for (const skill of PROXIES) expect(statuses(skill), skill).not.toContain("open");
  });

  it("breaks a first-hundred-days promise nobody acted on", () => {
    expect(statuses("passive", (plank) => plank === "plank-secure-border")).toEqual(SEEDS.map(() => "broken"));
  });

  it("removes neither a careful nor a passive President over the platform they ran on", () => {
    for (const skill of PROXIES) expect(report().bySkill[skill].removalRate, skill).toBe(0);
  });

  // A held program settles on the outcome its plank names, measured from the
  // oath, and only the President's own act counts toward it: a law they
  // signed, or for an energy pledge an energy order, since the extraction
  // program the platform opens on cuts imports by a third on its own.
  it("keeps no promise for a President who did nothing", () => {
    expect(statuses("passive", heldProgram)).not.toContain("kept");
  });
});
