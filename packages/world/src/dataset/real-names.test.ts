import { describe, expect, it } from "vitest";
import { LEADER_SURNAME_HASHES, OFFICEHOLDER_NAME_HASHES, OFFICEHOLDER_ROSTER_AS_OF, OFFICEHOLDER_ROSTER_COUNTS } from "./officeholders.generated.js";
import { REAL_NAME_HASHES, REAL_NAME_SALT } from "./nation-leaders.generated.js";
import { carriesLeaderSurname, carriesRealName, leaderSurnameKey, realNameTokens, unpackHashes } from "./real-names.js";

// The guard's lists are hashes, so no test here can name a real person. What
// can be held is that the words a name is compared on are the same however it
// is spelled, that the packed lists read back whole, and that the roster was
// read complete rather than short.

describe("the words a name is compared on", () => {
  it("takes one spelling for each romanization of a name", () => {
    expect(realNameTokens("Mohamed Qarvel")).toEqual(realNameTokens("Muhammad Qarvel"));
    expect(realNameTokens("Mohammed Qarvel")).toEqual(realNameTokens("Mohammad Qarvel"));
    expect(realNameTokens("Youssef Qarvel")).toEqual(realNameTokens("Yusuf Qarvel"));
    expect(realNameTokens("Hussein Qarvel")).toEqual(realNameTokens("Husayn Qarvel"));
  });

  it("reads Abd and the word after it as one name, joined or apart", () => {
    expect(realNameTokens("Abd al-Aziz Qarvel")).toEqual(realNameTokens("Abdulaziz Qarvel"));
    expect(realNameTokens("Abdelaziz Qarvel")).toEqual(realNameTokens("Abdulaziz Qarvel"));
    expect(realNameTokens("Abd Allah Qarvel")).toEqual(realNameTokens("Abdullah Qarvel"));
    expect(realNameTokens("Abdallah Qarvel")).toEqual(realNameTokens("Abdullah Qarvel"));
    expect(realNameTokens("Abdullah Qarvel")).toHaveLength(2);
  });

  it("drops accents, case and joining words", () => {
    expect(realNameTokens("ŞAHİN Qarvel")).toEqual(realNameTokens("sahin qarvel"));
    expect(realNameTokens("Qarvel bin Zintrup Al-Oskad")).toEqual(["qarvel", "zintrup", "oskad"]);
    expect(realNameTokens("Cường Lương")).toEqual(["cuong", "luong"]);
  });
});

describe("the officeholder roster", () => {
  it("reads its packed lists back as whole, distinct hashes", () => {
    const names = unpackHashes(OFFICEHOLDER_NAME_HASHES);
    const surnames = unpackHashes(LEADER_SURNAME_HASHES);
    for (const list of [names, surnames]) {
      expect(new Set(list).size).toBe(list.length);
      for (const hash of list.slice(0, 500)) expect(Number.isInteger(hash) && hash >= 0 && hash < 2 ** 32).toBe(true);
    }
    expect(names.length).toBeGreaterThan(REAL_NAME_HASHES.length * 20);
    expect(unpackHashes("")).toEqual([]);
    expect(() => unpackHashes("AAA=")).toThrow(/whole number/);
  });

  // A roster that came back short (a directory that answered with one page,
  // a query that timed out) would leave most of the world unguarded and still
  // pass every other check.
  it("was read complete: every cabinet abroad, every member of Congress, every head of government since 1945", () => {
    expect(OFFICEHOLDER_ROSTER_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const floors: Record<string, number> = { cia: 5000, congress: 535, executive: 80, heads: 4000, international: 30, justices: 100, federal: 300, governors: 45 };
    for (const [source, floor] of Object.entries(floors)) expect(OFFICEHOLDER_ROSTER_COUNTS[source], source).toBeGreaterThanOrEqual(floor);
  });

  it("refuses no invented name, and keys a leader's family name to that leader's own country", () => {
    expect(carriesRealName("Qarvel Zintrup")).toBe(false);
    expect(carriesLeaderSurname("POL", "Zintrup")).toBe(false);
    expect(leaderSurnameKey(REAL_NAME_SALT, "POL", "zintrup")).not.toBe(leaderSurnameKey(REAL_NAME_SALT, "HUN", "zintrup"));
  });
});
