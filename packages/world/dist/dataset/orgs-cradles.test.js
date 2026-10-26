import { describe, expect, it } from "vitest";
import { Organization } from "../schemas/org-cradle-charter.js";
import { ORG_ANZUS, ORG_EU, ORG_GCC, ORG_MERCOSUR, ORG_NATO, ORG_SCO, ORG_UNSC, ORG_US_JAPAN, ORG_US_KOREA, ORG_US_PHILIPPINES, ORGANIZATION_SOURCES, organizationById, applyMemberships, organizations, } from "./orgs-cradles.js";
describe("organizations", () => {
    it("ships seventeen bodies so an eighteenth without history cannot sneak in", () => {
        expect(organizations).toHaveLength(17);
    });
    it("gives every org a single-paragraph history inside schema bounds", () => {
        expect(organizations).toHaveLength(17);
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
        const pacific = [ORG_US_JAPAN, ORG_US_KOREA, ORG_US_PHILIPPINES, ORG_ANZUS].map((id) => organizationById.get(id));
        for (const body of pacific) {
            expect(body.kind, body.id).toBe("defense");
            expect(body.members, body.id).toContain("USA");
            expect(body.members, body.id).toHaveLength(2);
            expect(body.defenseScope?.source, body.id).toBe(ORGANIZATION_SOURCES[body.id].source);
        }
        expect(organizationById.get(ORG_US_JAPAN).defenseScope?.kind).toBe("parties-territory");
        expect(organizationById.get(ORG_US_KOREA).defenseScope?.area).toEqual(["region-east-asia", "region-southeast-asia", "region-oceania"]);
        expect(organizationById.get(ORG_ANZUS).members).not.toContain("NZL");
        expect(organizationById.get(ORG_NATO).defenseScope?.kind).toBe("parties-territory");
    });
    it("corrects Mercosur to its five seated members and marks the customs unions", () => {
        expect([...organizationById.get(ORG_MERCOSUR).members].sort()).toEqual(["ARG", "BOL", "BRA", "PRY", "URY"]);
        expect(organizationById.get(ORG_MERCOSUR).tradeCompetence).toBe("customs-union");
        expect(organizationById.get(ORG_EU).tradeCompetence).toBe("customs-union");
        expect(organizationById.get(ORG_GCC).tradeCompetence).toBe("customs-union");
    });
    it("seats the Security Council with five vetoes and ten elected members, read from the UN's page", () => {
        const council = organizationById.get(ORG_UNSC);
        expect(council.members).toHaveLength(15);
        expect([...council.council.permanent].sort()).toEqual(["CHN", "FRA", "GBR", "RUS", "USA"]);
        expect(council.council.threshold).toBe(9);
        expect(council.members.filter((m) => !council.council.permanent.includes(m)).sort()).toEqual(["BHR", "COD", "COL", "DNK", "GRC", "LBR", "LVA", "PAK", "PAN", "SOM"]);
        expect(ORGANIZATION_SOURCES[ORG_UNSC].asOf).toBe("2026-10-25");
    });
    it("does not turn a Council seat into a bond between members", () => {
        const [russia, panama] = applyMemberships([{ id: "RUS" }, { id: "PAN" }]);
        expect(russia.memberships).not.toContain(ORG_UNSC);
        expect(panama.memberships).not.toContain(ORG_UNSC);
    });
    it("holds the Shanghai Cooperation Organisation as a political body with no defense clause", () => {
        const sco = organizationById.get(ORG_SCO);
        expect(sco.kind).toBe("political");
        expect(sco.defenseScope).toBeUndefined();
        expect([...sco.members].sort()).toEqual(["BLR", "CHN", "IND", "IRN", "KAZ", "KGZ", "PAK", "RUS", "TJK", "UZB"]);
        expect(sco.history).toMatch(/no mutual-defense clause/);
    });
});
