import { describe, expect, it } from "vitest";
import { worldDataset, type RoleId } from "@admin/world";
import { POLICY_DOMAINS, POLICY_DOMAIN_SPECS, resolveDomainChair } from "./policy.js";

// Who answers for a policy domain, per constitution.
//
// It used to be one hardcoded role id per domain, which is a claim that one
// constitution's answer is every constitution's. It is not: civil liberties are
// the Attorney General's brief in a presidential republic and the interior
// ministry's in a parliamentary one, and trade runs out of Commerce in
// Washington and out of the foreign ministry nearly everywhere else. The way
// the old table was wrong was silent — `legislableDomains` simply dropped a
// domain whose named chair a charter did not seat.

const CHARTERS = worldDataset.charters;
const USA = CHARTERS.find((charter) => charter.id === "charter-usa-constitution")!;

function chairFor(charter: (typeof CHARTERS)[number], domain: (typeof POLICY_DOMAINS)[number]) {
  return resolveDomainChair(charter.cabinetRoles as readonly RoleId[], domain);
}

describe("which chair answers for a policy domain", () => {
  it("gives the United States the departments that actually run these briefs", () => {
    expect(chairFor(USA, "fiscal")).toBe("role-treasury-minister");
    // Trade policy is Commerce's, not the Secretary of State's.
    expect(chairFor(USA, "trade")).toBe("role-commerce-secretary");
    expect(chairFor(USA, "industry")).toBe("role-commerce-secretary");
    // Civil liberties are the Attorney General's, not the Interior Secretary's
    // — Interior runs public lands.
    expect(chairFor(USA, "civil")).toBe("role-attorney-general");
    expect(chairFor(USA, "security")).toBe("role-intelligence-director");
    expect(chairFor(USA, "defense")).toBe("role-defense-minister");
  });

  it("gives a parliamentary charter its own answer for the same domains", () => {
    const westminster = CHARTERS.find((charter) => charter.id === "charter-electoral-democracy")!;
    // No commerce department and no attorney general: the foreign ministry
    // carries trade and the interior ministry carries civil liberties, which is
    // how those governments are actually arranged.
    expect(chairFor(westminster, "trade")).toBe("role-foreign-minister");
    expect(chairFor(westminster, "civil")).toBe("role-interior-minister");
    expect(chairFor(westminster, "industry")).toBe("role-treasury-minister");
  });

  it("resolves a chair for every domain a charter can honestly seat, and none it cannot", () => {
    for (const charter of CHARTERS) {
      const seats = new Set(charter.cabinetRoles as readonly string[]);
      for (const domain of POLICY_DOMAINS) {
        const chair = chairFor(charter, domain);
        if (chair === undefined) {
          // Nothing it seats matches any hint — the honest reading of a
          // government with nobody to sign that program.
          const hints = POLICY_DOMAIN_SPECS[domain].chairHints;
          for (const seat of seats) {
            expect(hints.some((hint) => seat.includes(hint)), `${charter.id} seats ${seat} for ${domain}`).toBe(false);
          }
          continue;
        }
        expect(seats.has(chair as string), `${charter.id} resolved ${domain} to an unseated chair`).toBe(true);
      }
    }
  });

  it("prefers the more specific chair where a charter seats both", () => {
    // The ordering in a hint list is precedence, not decoration: the US seats
    // both a commerce secretary and a foreign minister, and trade must land on
    // the first rather than on whichever the charter happens to list earliest.
    const seats = USA.cabinetRoles as readonly string[];
    expect(seats).toContain("role-commerce-secretary");
    expect(seats).toContain("role-foreign-minister");
    expect(chairFor(USA, "trade")).toBe("role-commerce-secretary");
    expect(seats).toContain("role-attorney-general");
    expect(seats).toContain("role-interior-minister");
    expect(chairFor(USA, "civil")).toBe("role-attorney-general");
  });
});
