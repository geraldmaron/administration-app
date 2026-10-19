import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION } from "./usa.js";
import {
  opposingMajor,
  partiesOf,
  partyById,
  presidentPartyFromIdeology,
} from "./parties.js";

const tickets = partiesOf(CHARTER_USA_CONSTITUTION);

describe("charter tickets", () => {
  it("authors Democrat, Republican, and Independent on the US constitution", () => {
    expect(tickets.map((party) => party.shortName)).toEqual(["Democrat", "Republican", "Independent"]);
    expect(tickets.filter((party) => party.kind === "major")).toHaveLength(2);
  });

  it("reads ticket assignment off beliefs.economicLeftRight", () => {
    expect(tickets[0]?.beliefs.economicLeftRight).toBe(-0.4);
    expect(tickets[1]?.beliefs.economicLeftRight).toBe(0.4);
    expect(tickets[2]?.beliefs.economicLeftRight).toBe(0);
  });

  it("never seats a president as Independent; center is the first major", () => {
    expect(presidentPartyFromIdeology(tickets, -0.6)?.id).toBe("party-usa-democrat");
    expect(presidentPartyFromIdeology(tickets, 0.6)?.id).toBe("party-usa-republican");
    expect(presidentPartyFromIdeology(tickets, 0)?.id).toBe("party-usa-democrat");
  });

  it("returns nothing when a charter authors no tickets", () => {
    expect(presidentPartyFromIdeology([], 0)).toBeUndefined();
  });

  it("finds a ticket by id and the other major", () => {
    const democrat = partyById(tickets, "party-usa-democrat");
    expect(democrat?.shortName).toBe("Democrat");
    expect(opposingMajor(tickets, democrat)?.id).toBe("party-usa-republican");
  });
});
