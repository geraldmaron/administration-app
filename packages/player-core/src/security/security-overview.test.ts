import { beforeAll, describe, expect, it } from "vitest";
import { POSTURE_READINESS_COST, apply, type Campaign, type Commitment } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { postureOrder } from "./command-acts";
import { commitmentsReading } from "./commitment-reading";
import { operationRows, readinessReading, securityOverview, REVIEW_SOON_WEEKS } from "./security-overview";
import { securityBoard, serviceReadiness } from "./security-board";

let opening: Campaign;

function commitment(id: string, patch: Partial<Commitment>): Commitment {
  return {
    id,
    kind: "deployment",
    actor: opening.founding.nation,
    target: { kind: "nation", id: "POL" },
    resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 40 },
    source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 2 },
    startedTurn: 0,
    review: "standing",
    status: "active",
    rationale: "test",
    ...patch,
  };
}

const withCommitment = (campaign: Campaign, entry: Commitment): Campaign => ({ ...campaign, commitments: { ...campaign.commitments, [entry.id]: entry } });

beforeAll(() => {
  opening = openingCampaign({ seedText: "security-overview" });
}, 60_000);

describe("security overview", () => {
  it("counts the same operations the commitments ledger lists, plus the findings standing", () => {
    const overview = securityOverview(opening, securityBoard(opening));
    expect(overview.operations.total).toBe(commitmentsReading(opening).rows.length);
    expect(overview.operations.byKind.reduce((sum, entry) => sum + entry.count, 0)).toBe(overview.operations.total);
  });

  it("places a deployment in its theater and flags a review that is about to lapse", () => {
    const soon = commitment("commitment:deployment:test:POL:1", { review: { endsTurn: opening.turn + REVIEW_SOON_WEEKS } });
    const row = operationRows(withCommitment(opening, soon)).find((entry) => entry.id === soon.id)!;
    expect(row.theater?.abbr).toBe("EUCOM");
    expect(row.flag?.tone).toBe("watch");
    expect(row.reviewIn).toBe(REVIEW_SOON_WEEKS);
    const standing = operationRows(withCommitment(opening, commitment("commitment:deployment:test:POL:2", {}))).find((entry) => entry.id.endsWith(":2"))!;
    expect(standing.flag).toBeUndefined();
    expect(standing.reviewIn).toBeUndefined();
  });

  it("drops wound-down commitments from the open operations", () => {
    const gone = commitment("commitment:deployment:test:POL:3", { status: "wound-down" });
    expect(operationRows(withCommitment(opening, gone)).some((row) => row.id === gone.id)).toBe(false);
  });

  it("names the weekly readiness charge exactly as the commands phase takes it", () => {
    expect(readinessReading(opening).weeklyCost).toBeCloseTo(0, 6);
    const surged = apply(opening, postureOrder(opening, "CCMD-INDOPACOM", "surge"));
    const reading = readinessReading(surged);
    expect(reading.charges.map((charge) => charge.abbr)).toEqual(["INDOPACOM"]);
    expect(reading.weeklyCost).toBeCloseTo(POSTURE_READINESS_COST.surge, 6);
    expect(reading.reading.key).toBe("militaryReadiness");
  });

  it("averages each service's shares over its asset lines, never over summed units", () => {
    const services = serviceReadiness(opening);
    expect(services.length).toBeGreaterThan(0);
    for (const service of services) {
      expect(service.lines).toBeGreaterThan(0);
      expect(service.ready + service.abroad + service.resting).toBeLessThanOrEqual(1 + 1e-9);
    }
    const overview = securityOverview(opening, securityBoard(opening));
    expect(overview.force.lines).toBe(services.reduce((sum, service) => sum + service.lines, 0));
    expect(overview.force.ready).toBeGreaterThanOrEqual(0);
    expect(overview.force.ready).toBeLessThanOrEqual(1);
  });

  it("tallies postures over all eleven commands", () => {
    const overview = securityOverview(opening, securityBoard(opening));
    const { surge, heightened, routine, total } = overview.postures;
    expect(total).toBe(11);
    expect(surge + heightened + routine).toBe(11);
  });
});

