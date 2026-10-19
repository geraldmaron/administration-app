import { describe, expect, it } from "vitest";
import { candidateStanding, defaultReplacementId, replacementCandidates, replacementSentence } from "./slot-replacement";
import type { CampaignSummary } from "./save-store";

function summary(id: string, over: Partial<CampaignSummary> = {}): CampaignSummary {
  return {
    id,
    name: `Term ${id}`,
    createdAt: 1,
    updatedAt: 1,
    savedAt: 100,
    turn: 4,
    date: "2029-03-05",
    leader: `President ${id}`,
    nation: "usa",
    payloadKey: `k-${id}`,
    status: "healthy",
    ...over,
  };
}

describe("replacementCandidates", () => {
  it("lists unreadable saves first, then the longest untouched, with the one in play last", () => {
    const ordered = replacementCandidates(
      [summary("a", { savedAt: 500 }), summary("b", { savedAt: 100 }), summary("c", { savedAt: 900, status: "payload-corrupt" }), summary("d", { savedAt: 1 })],
      "d",
    );
    expect(ordered.map((c) => c.id)).toEqual(["c", "b", "a", "d"]);
    expect(ordered.at(-1)?.inPlay).toBe(true);
  });

  it("does not call an unreadable active row a term in play", () => {
    const [only] = replacementCandidates([summary("a", { status: "retired-world" })], "a");
    expect(only?.inPlay).toBe(false);
    expect(only?.unplayable).toBe(true);
    expect(only?.exportable).toBe(true);
  });

  it("gives a damaged payload nothing to export", () => {
    const [only] = replacementCandidates([summary("a", { status: "payload-missing" })], null);
    expect(only?.exportable).toBe(false);
  });

  it("reads the stored date in words", () => {
    const [only] = replacementCandidates([summary("a")], null);
    expect(only?.dateLabel).toMatch(/2029/);
  });
});

describe("defaultReplacementId", () => {
  it("prefers an unreadable save over a healthy one", () => {
    const candidates = replacementCandidates([summary("a"), summary("b", { status: "payload-corrupt" })], null);
    expect(defaultReplacementId(candidates)).toBe("b");
  });

  it("never defaults to the one in play", () => {
    const candidates = replacementCandidates([summary("a")], "a");
    expect(defaultReplacementId(candidates)).toBeNull();
  });
});

describe("replacementSentence", () => {
  const [plain] = replacementCandidates([summary("a")], null);
  const [live] = replacementCandidates([summary("a")], "a");

  it("names what is lost and that no copy exists", () => {
    const text = replacementSentence(plain!, { then: "take the oath", copyKept: false });
    expect(text).toContain("“Term a”");
    expect(text).toContain("President a");
    expect(text).toContain("can't be brought back");
  });

  it("only mentions a copy when one was saved", () => {
    const text = replacementSentence(plain!, { then: "take the oath", copyKept: true });
    expect(text).toContain("copy you saved");
    expect(text).not.toContain("can't be brought back");
  });

  it("warns harder about the administration in play", () => {
    expect(replacementSentence(live!, { then: "take the oath", copyKept: false })).toContain("game you're playing now");
    expect(replacementSentence(plain!, { then: "take the oath", copyKept: false })).not.toContain("game you're playing now");
  });

  it("labels each standing", () => {
    expect(candidateStanding(live!)).toBe("In play");
    expect(candidateStanding(plain!)).toBe("Saved");
  });
});
