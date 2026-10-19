import { describe, expect, it } from "vitest";
import { authorityByCite } from "@admin/player-core";
import { LAW, caseStatusWords, circuitWords, courtsView, dueWords, forumOf, governingWords, initials, strikeVerdict, weeksWords } from "./model";

describe("courts model", () => {
  it("cites only authorities the registry holds", () => {
    for (const cite of Object.values(LAW)) expect(authorityByCite(cite), cite).toBeDefined();
  });

  it("falls back to the bench for an unknown view", () => {
    expect(courtsView("docket")).toBe("docket");
    expect(courtsView(undefined)).toBe("bench");
  });

  it("names circuits, weeks and initials", () => {
    expect(circuitWords("District of Columbia")).toBe("D.C. Circuit");
    expect(circuitWords("Ninth")).toBe("Ninth Circuit");
    expect([weeksWords(0), weeksWords(1), weeksWords(3)]).toEqual(["this week", "next week", "in 3 weeks"]);
    expect(initials("Ada Byron King")).toBe("AB");
  });

  it("reads a strike-down chance against the President", () => {
    expect(strikeVerdict(0.7).tone).toBe("danger");
    expect(strikeVerdict(0.45).word).toBe("Toss-up");
    expect(strikeVerdict(0.1).tone).toBe("success");
  });

  it("puts the administration's own deadline first", () => {
    expect(dueWords({ responseDue: "May 1, 2029", due: "x", weeksLeft: 3 })).toBe("Your answer due May 1, 2029");
    expect(dueWords({ due: "June 2, 2029", weeksLeft: 2, stage: "lower-merits" })).toBe("District court ruling June 2, 2029, in 2 weeks");
  });

  it("words each case status", () => {
    expect(caseStatusWords({ status: "pending" }).label).toBe("Still in the courts");
    expect(caseStatusWords({ status: "upheld", dismissedAtThreshold: true }).label).toBe("Case thrown out, order still in effect");
    expect(caseStatusWords({ status: "struck-down", endReason: "sunset" }).status).toBe("danger");
  });

  it("names the forum and what governs", () => {
    expect(forumOf({ forum: "supreme" })).toBe("Supreme Court of the United States");
    expect(forumOf({ forum: "lower" })).toBe("Federal district court");
    expect(governingWords({ kind: "stay-granted" }, "the order").title).toContain("stay");
  });
});
