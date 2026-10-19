import { describe, expect, it } from "vitest";
import { Organization } from "../schemas/org-cradle-charter.js";
import {
  ORG_ANZUS,
  ORG_EU,
  ORG_GCC,
  ORG_MERCOSUR,
  ORG_NATO,
  ORG_US_JAPAN,
  ORG_US_KOREA,
  ORG_US_PHILIPPINES,
  ORGANIZATION_SOURCES,
  organizationById,
  organizations,
} from "./orgs-cradles.js";

describe("organizations", () => {
  it("ships fifteen bodies so a sixteenth without history cannot sneak in", () => {
    expect(organizations).toHaveLength(15);
  });

  it("gives every org a single-paragraph history inside schema bounds", () => {
    expect(organizations).toHaveLength(15);
    for (const org of organizations) {
      const parsed = Organization.parse(org);
      expect(parsed.history, org.id).toBe(org.history);
      expect(org.history, org.id).toBe(org.history.trim());
      expect(org.history.length, org.id).toBeGreaterThanOrEqual(160);
      expect(org.history.length, org.id).toBeLessThanOrEqual(720);
      expect(/\n\s*\n/.test(org.history), org.id).toBe(false);
    }
  });

  it("dates every roster and names the page it was read from", () => {
    for (const org of organizations) {
      const source = ORGANIZATION_SOURCES[org.id];
      expect(source?.source, org.id).toMatch(/^https:\/\/\S+$/);
      expect(source?.asOf, org.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("holds the four Pacific treaties as defense bodies with the reach their texts give", () => {
    const pacific = [ORG_US_JAPAN, ORG_US_KOREA, ORG_US_PHILIPPINES, ORG_ANZUS].map((id) => organizationById.get(id)!);
    for (const body of pacific) {
      expect(body.kind, body.id).toBe("defense");
      expect(body.members, body.id).toContain("USA");
      expect(body.members, body.id).toHaveLength(2);
      expect(body.defenseScope?.source, body.id).toBe(ORGANIZATION_SOURCES[body.id]!.source);
    }
    expect(organizationById.get(ORG_US_JAPAN)!.defenseScope?.kind).toBe("parties-territory");
    expect(organizationById.get(ORG_US_KOREA)!.defenseScope?.area).toEqual(["region-east-asia", "region-southeast-asia", "region-oceania"]);
    expect(organizationById.get(ORG_ANZUS)!.members).not.toContain("NZL");
    expect(organizationById.get(ORG_NATO)!.defenseScope?.kind).toBe("parties-territory");
  });

  it("corrects Mercosur to its five seated members and marks the customs unions", () => {
    expect([...organizationById.get(ORG_MERCOSUR)!.members].sort()).toEqual(["ARG", "BOL", "BRA", "PRY", "URY"]);
    expect(organizationById.get(ORG_MERCOSUR)!.tradeCompetence).toBe("customs-union");
    expect(organizationById.get(ORG_EU)!.tradeCompetence).toBe("customs-union");
    expect(organizationById.get(ORG_GCC)!.tradeCompetence).toBe("customs-union");
  });
});
