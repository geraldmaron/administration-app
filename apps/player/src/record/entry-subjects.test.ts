import { describe, expect, it } from "vitest";
import type { Campaign } from "@admin/engine";
import { entrySubjects } from "./entry-subjects";

// Only the collections the resolver reads are built; the rest of a campaign is not its business.
const campaign = {
  people: { "PER-1": { base: { name: "Candice Walton" } } },
  bills: { "bill:act-a:3": { title: "The Farm Act" } },
  conflicts: { "war:THA:KHM:0": { aggressor: "THA", defender: "KHM" } },
  treaties: {},
  orders: [],
  nations: { THA: { base: { identity: { name: "Thailand" } } }, KHM: { base: { identity: { name: "Cambodia" } } } },
  ledger: [{ causal: { eventId: "ev-1", entities: ["PER-1", "bill:act-a:3", "war:THA:KHM:0", "PER-1", "KHM", "unknown"] } }, { causal: { eventId: "ev-2" } }],
} as unknown as Campaign;

describe("what a Record entry was about", () => {
  it("names each person, bill and war it holds once, each with its screen", () => {
    expect(entrySubjects(campaign, "ev-1").map((subject) => [subject.label, subject.href])).toEqual([
      ["Candice Walton", "/washington/person/PER-1"],
      ["The Farm Act", "/washington/congress/bill/bill%3Aact-a%3A3"],
      ["The war between Thailand and Cambodia", "/world/war/war%3ATHA%3AKHM%3A0"],
    ]);
  });

  it("leaves governments and unknown ids to the lines that already carry them, and reads an entry with no entities as none", () => {
    expect(entrySubjects(campaign, "ev-2")).toEqual([]);
    expect(entrySubjects(campaign, "ev-missing")).toEqual([]);
  });
});
