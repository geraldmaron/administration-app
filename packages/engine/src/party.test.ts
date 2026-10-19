import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMINISTRATION_PARTY,
  otherMajorParty,
  partyForCaucus,
  partyForShare,
  resolveAdministrationParty,
  usPartyWord,
} from "./party.js";

describe("resolveAdministrationParty", () => {
  it("suggests left as democrat and right as republican", () => {
    expect(resolveAdministrationParty({ economicLeftRight: -0.2 })).toBe("democrat");
    expect(resolveAdministrationParty({ economicLeftRight: 0.4 })).toBe("republican");
  });

  it("suggests the default Democrat administration for a centrist", () => {
    expect(resolveAdministrationParty({ economicLeftRight: 0 })).toBe(DEFAULT_ADMINISTRATION_PARTY);
    expect(DEFAULT_ADMINISTRATION_PARTY).toBe("democrat");
  });
});

describe("otherMajorParty", () => {
  it("returns the other major party and never Independent", () => {
    expect(otherMajorParty("democrat")).toBe("republican");
    expect(otherMajorParty("republican")).toBe("democrat");
  });
});

describe("partyForCaucus", () => {
  it("maps administration and opposition onto the sealed ticket", () => {
    expect(partyForCaucus("administration", "democrat")).toBe("democrat");
    expect(partyForCaucus("opposition", "democrat")).toBe("republican");
    expect(partyForCaucus("administration", "republican")).toBe("republican");
    expect(partyForCaucus("opposition", "republican")).toBe("democrat");
  });
});

describe("partyForShare", () => {
  it("names chamber shares, including Independent", () => {
    expect(partyForShare("administration", "democrat")).toBe("democrat");
    expect(partyForShare("opposition", "democrat")).toBe("republican");
    expect(partyForShare("independent", "democrat")).toBe("independent");
    expect(partyForShare("opposition", "republican")).toBe("democrat");
  });
});

describe("usPartyWord", () => {
  it("prints the honest US party words", () => {
    expect(usPartyWord("democrat")).toBe("Democrat");
    expect(usPartyWord("republican")).toBe("Republican");
    expect(usPartyWord("independent")).toBe("Independent");
  });
});
