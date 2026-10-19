import { describe, expect, it } from "vitest";
import { EMPTY_TIE, type Bill, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { spreadVotes, whipByState, whipCount } from "./whip-count";

const base = openingCampaign();

function bill(status: Bill["status"]): Bill {
  return {
    id: `bill:act-tax-relief-and-growth:${base.turn}`,
    act: "act-tax-relief-and-growth",
    title: "Tax Relief and Growth Act",
    sponsor: "bipartisan",
    introducedTurn: base.turn,
    status,
    ...(status === "in-progress" ? { stage: "floor" as const, setbacks: 0, momentum: 0, beats: [] } : { presentedOn: base.calendar }),
    passage: [],
  };
}

function withBill(campaign: Campaign, entry: Bill): Campaign {
  return { ...campaign, bills: { ...campaign.bills, [entry.id]: entry } };
}

function withDisposition(campaign: Campaign, state: "CA" | "TX", disposition: number): Campaign {
  const runtime = campaign.states[state]!;
  return { ...campaign, states: { ...campaign.states, [state]: { ...runtime, delegation: { ...runtime.delegation!, disposition } } } };
}

describe("spreading a caucus's yeas across delegations", () => {
  const rows = [
    { key: "CA" as const, cap: 10, weight: 0.8 },
    { key: "TX" as const, cap: 10, weight: 0.2 },
    { key: "OH" as const, cap: 3, weight: 0.5 },
  ];

  it("places exactly the caucus's yeas, never more than a delegation's seats", () => {
    for (const total of [0, 1, 7, 12, 22, 23]) {
      const placed = spreadVotes(total, rows);
      expect([...placed.values()].reduce((sum, n) => sum + n, 0)).toBe(total);
      for (const row of rows) expect(placed.get(row.key)!).toBeLessThanOrEqual(row.cap);
    }
  });

  it("gives a warmer delegation more of the yeas than a cooler one of the same size", () => {
    const placed = spreadVotes(10, rows);
    expect(placed.get("CA")!).toBeGreaterThan(placed.get("TX")!);
  });
});

describe("the public whip assessment", () => {
  it("keeps future tallies unresolved and separate from recorded votes", () => {
    const entry = bill("in-progress");
    const whip = whipCount(withBill(base, entry), entry);
    expect(whip.question).toBe("passage");
    expect(whip.chambers).toEqual([]);
    expect(whip.assessment[0]?.members).toHaveLength(435);
    expect(whip.assessment.map((row) => row.interval)).toEqual([{ lower: 0, upper: 435 }, { lower: 0, upper: 100 }]);
    expect(whip.assessment.every((row) => row.confidence === "unknown")).toBe(true);
    expect(whip.assessment[1]?.clotureRequired).toBeUndefined(); // Revenue reconciliation skips cloture.
  });

  it("does not expose hidden disposition, rapport or individual conviction", () => {
    const entry = bill("in-progress");
    const cold = withDisposition(withBill(base, entry), "CA", 0);
    const warm = withDisposition(withBill(base, entry), "CA", 1);
    const changed: Campaign = { ...warm, congress: { ...warm.congress, disposition: 1 }, people: Object.fromEntries(Object.entries(warm.people).map(([id, person]) => [id, { ...person, base: { ...person.base, ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 } }, tie: { ...(person.tie ?? EMPTY_TIE), rapport: 1 } }])) };
    expect(whipCount(changed, entry)).toEqual(whipCount(cold, entry));
    expect(whipByState(whipCount(changed, entry), "house").size).toBe(0);
  });

  it("does not label a committee death's forecast as a recorded vote", () => {
    const entry: Bill = { ...bill("dead"), passage: [{ chamber: "house", yeas: 230, nays: 205, required: 218, passed: true }] };
    expect(whipCount(withBill(base, entry), entry).chambers).toEqual([]);
  });

  it("preserves snapshotted recorded constituency instead of inventing state votes", () => {
    const member = base.congress.members![0]!;
    const entry: Bill = { ...bill("law"), passage: [{ chamber: "house", yeas: 1, nays: 0, required: 218, passed: false, recordedTurn: 3,
      rollCall: [{ person: member.person, seat: member.seat, state: "TX", party: member.party, yea: true, support: 0.9, reasons: [] }] }] };
    const whip = whipCount(withBill(base, entry), entry);
    expect(whipByState(whip, "house").get("TX")?.yeas).toBe(1);
    expect(whip.assessment).toEqual([]);
    expect(whip.chambers[0]?.delegations).toHaveLength(1);
    const aggregate = { ...entry, passage: entry.passage.map(({ rollCall: _rollCall, ...vote }) => vote) };
    expect(whipCount(withBill(base, aggregate), aggregate).chambers[0]?.delegations).toEqual([]);
  });

  it("uses the constitutional override thresholds without predicting a result", () => {
    const entry = bill("on-the-desk");
    const whip = whipCount(withBill(base, entry), entry);
    expect(whip.question).toBe("override");
    expect(whip.frame).toBe("against");
    expect(whip.chambers).toEqual([]);
    expect(whip.assessment.map((row) => row.required)).toEqual([290, 67]);
  });
});
