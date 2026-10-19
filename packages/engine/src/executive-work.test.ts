import { imposeTestTariff } from "./__fixtures__/tariff.js";
import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { foundedForBalance } from "./balance-harness.js";
import { selectCustomsReceipts } from "./trade.js";
import type { Campaign } from "./state.js";
import type { InstitutionId } from "./institutions.js";
import { APPROVAL_FLOOR, CUSTOMS_COLLECTION, selectWorkDelivery, workIsLawful, type WorkDef } from "./executive-work.js";

const { campaign: FOUNDED } = foundedForBalance("executive-work");

function tariffed(): Campaign {
  const result = imposeTestTariff(FOUNDED, "CHN" as Campaign["founding"]["nation"], "consumer-electronics", 0.25);
  if (!result.ok) throw new Error(result.reason);
  return apply(FOUNDED, result.packet);
}

function withQuality(campaign: Campaign, id: InstitutionId, implementationQuality: number): Campaign {
  const runtime = campaign.institutions[id];
  if (!runtime) throw new Error(`no runtime for ${id}`);
  return { ...campaign, institutions: { ...campaign.institutions, [id]: { ...runtime, implementationQuality } } };
}

describe("customs collection belongs to the agency the law gives it to", () => {
  const signed = tariffed();
  const receipts = selectCustomsReceipts(signed);

  it("collects less when Customs and Border Protection is hollowed, however healthy the other trade bodies are", () => {
    expect(receipts).toBeGreaterThan(0);
    const healthyElsewhere = ["INST-USDA", "INST-COMMERCE", "INST-USTR", "INST-BIS"].reduce(
      (campaign, id) => withQuality(campaign, id, 1),
      withQuality(signed, "INST-CBP", 0.1),
    );
    expect(selectCustomsReceipts(healthyElsewhere)).toBeLessThan(receipts * 0.8);
  });

  // The defect this pins: the books charged duty on an import flow the tariff
  // had already cut, then cut it again, so a 25 percent tariff booked well
  // under the revenue the order showed when it was signed.
  it("books a year of duty equal to the revenue the order showed", () => {
    const result = imposeTestTariff(FOUNDED, "CHN" as Campaign["founding"]["nation"], "consumer-electronics", 0.25);
    if (!result.ok) throw new Error(result.reason);
    const nextWeek = { ...signed, turn: signed.turn + 1 };
    expect(selectCustomsReceipts(nextWeek) * 52).toBeCloseTo(result.incidence.revenue, -1);
    expect(Math.abs(selectCustomsReceipts(nextWeek) * 52 - result.incidence.revenue) / result.incidence.revenue).toBeLessThan(0.005);
  });

  it("is not moved by a body that holds no customs authority", () => {
    expect(selectCustomsReceipts(withQuality(signed, "INST-USDA", 0.05))).toBe(receipts);
    expect(selectCustomsReceipts(withQuality(signed, "INST-USDA", 1))).toBe(receipts);
  });
});

describe("work is led by its legal owner and held by the stages it waits on", () => {
  // Arms transfers: the Pentagon runs the case, the State Department must
  // approve the transfer, and the intelligence agencies inform it alongside.
  const transfer: WorkDef = {
    id: "test-transfer",
    name: "Arms transfer",
    owner: "INST-DOD",
    authority: "procurement",
    dependencies: [
      { kind: "approval", institution: "INST-STATE", authority: "foreign-assistance" },
      { kind: "support", institution: "INST-DIA", authority: "military-analysis" },
    ],
  };

  it("names only owners and dependencies the catalog gives the authority to", () => {
    expect(workIsLawful(CUSTOMS_COLLECTION)).toBe(true);
    expect(workIsLawful(transfer)).toBe(true);
    expect(workIsLawful({ ...CUSTOMS_COLLECTION, owner: "INST-USDA" })).toBe(false);
    expect(workIsLawful({ ...transfer, dependencies: [{ kind: "approval", institution: "INST-FED", authority: "foreign-assistance" }] })).toBe(false);
  });

  it("keeps a weak owner in the lead however strong its support is", () => {
    const weakOwner = withQuality(withQuality(withQuality(FOUNDED, "INST-DOD", 0.3), "INST-DIA", 1), "INST-STATE", 1);
    const reading = selectWorkDelivery(weakOwner, transfer);
    expect(reading.owner).toBe("INST-DOD");
    expect(reading.ownerQuality).toBe(0.3);
    // The support can lift it only by its share of the blend.
    expect(reading.capacity).toBeCloseTo(0.3 * 0.7 + 1 * 0.3, 3);
  });

  it("delays the work to the pace of a slow approval, which a strong owner cannot average away", () => {
    const slowApproval = withQuality(withQuality(withQuality(FOUNDED, "INST-DOD", 1), "INST-DIA", 1), "INST-STATE", 0.4);
    const reading = selectWorkDelivery(slowApproval, transfer);
    expect(reading.status).toBe("delayed");
    expect(reading.binding).toBe("INST-STATE");
    expect(reading.capacity).toBe(0.4);
  });

  it("stops the work when the approving body is not clearing its stage at all", () => {
    const stalled = withQuality(withQuality(FOUNDED, "INST-DOD", 1), "INST-STATE", APPROVAL_FLOOR - 0.01);
    const reading = selectWorkDelivery(stalled, transfer);
    expect(reading.status).toBe("blocked");
    expect(reading.capacity).toBe(0);
    expect(reading.binding).toBe("INST-STATE");
  });

  it("delivers at the owner's blend when every approval keeps pace", () => {
    const reading = selectWorkDelivery(withQuality(FOUNDED, "INST-STATE", 1), transfer);
    expect(reading.status).toBe("delivering");
    expect(reading.binding).toBeUndefined();
  });
});
