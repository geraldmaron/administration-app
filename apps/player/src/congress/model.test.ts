import { describe, expect, it } from "vitest";
import { authorityByCite, type CongressChamber, type CongressSeat, type FloorCount } from "@admin/player-core";
import { LAW, congressView, countWord, holderOf, lensMembers, lineWords, vetoObjections, voteOf } from "./model";

const seat = (id: string, party: CongressSeat["party"], lean: number): CongressSeat => ({ seat: id, chamber: "senate", state: "CA", stateName: "California", party, name: id, lean, vacant: false });

const chamber: CongressChamber = {
  chamber: "senate",
  name: "the Senate",
  seats: 4,
  members: [seat("a", "democrat", -0.6), seat("b", "democrat", -0.1), seat("c", "republican", 0.2), seat("d", "republican", 0.7)],
  unrecorded: 0,
  parties: [],
  caucus: { name: "Democratic caucus", relation: "the President's party", parties: ["democrat", "independent"], seats: 2, opposing: 2 },
  thresholds: [],
  holdsMajority: true,
  majorityLine: "",
  recordsDisagree: false,
};

describe("congress model", () => {
  it("cites only authorities the registry holds", () => {
    for (const cite of Object.values(LAW)) expect(authorityByCite(cite), cite).toBeDefined();
  });

  it("falls back to the overview for an unknown view", () => {
    expect(congressView("bills")).toBe("bills");
    expect(congressView("nonsense")).toBe("overview");
  });

  it("lists the other caucus nearest the President first", () => {
    const shown = lensMembers(chamber, 0, { kind: "across" });
    expect(shown.members.map((member) => member.seat)).toEqual(["c", "d"]);
    expect(shown.from).toBe(0.2);
    expect(shown.to).toBe(0.7);
  });

  it("lists the President's own caucus farthest first as holdouts", () => {
    expect(lensMembers(chamber, 0, { kind: "holdouts" }).members.map((member) => member.seat)).toEqual(["a", "b"]);
  });

  it("lists a slice of the scale across parties", () => {
    expect(lensMembers(chamber, 0, { kind: "slice", at: 0.15 }).members.map((member) => member.seat)).toEqual(["c"]);
  });

  it("reads an override count against the President", () => {
    const count: FloorCount = { chamber: "senate", name: "Senate", yeas: 70, required: 67, seats: 100, passed: true, supportKnown: true };
    expect(countWord(count, true)).toBe("Override would carry");
    expect(countWord({ ...count, yeas: 60 })).toBe("Short by 7");
    expect(countWord({ ...count, supportKnown: false })).toBe("Support not known yet");
  });

  it("names the line by its share of the chamber", () => {
    expect(lineWords(51, 100)).toBe("a majority");
    expect(lineWords(60, 100)).toBe("three-fifths to end debate");
    expect(lineWords(67, 100, true)).toBe("two-thirds to override");
  });

  it("offers the fiscal objection only for a bill that moves money", () => {
    expect(vetoObjections("Act", false).map((entry) => entry.id)).toEqual(["policy", "revision"]);
    expect(vetoObjections("Act", true).map((entry) => entry.id)).toEqual(["policy", "fiscal", "revision"]);
  });

  it("reads a seat's recorded vote and the chamber's holder", () => {
    const roll = { billId: "b", title: "", href: "", question: "", date: "", turn: 1, yeas: 1, nays: 1, required: 1, passed: true, votes: new Map([["a", true], ["b", false]]) };
    expect([voteOf(roll, "a"), voteOf(roll, "b"), voteOf(roll, "c")]).toEqual(["yea", "nay", "none"]);
    expect(holderOf(chamber)).toBe("democrat");
    expect(holderOf({ ...chamber, holdsMajority: false })).toBe("republican");
  });
});
