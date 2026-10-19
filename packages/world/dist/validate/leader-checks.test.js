import { afterEach, describe, expect, it, vi } from "vitest";
import { worldDataset } from "../dataset/index.js";
import { checkLeaderConstraints } from "./leader-checks.js";
afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../dataset/nation-leaders.generated.js");
});
/** The shipped dataset with one nation's record replaced. */
function withNation(id, edit) {
    return { ...worldDataset, nations: worldDataset.nations.map((nation) => (nation.id === id ? edit(nation) : nation)) };
}
describe("checkLeaderConstraints", () => {
    it("passes the shipped dataset", () => {
        expect(checkLeaderConstraints(worldDataset)).toEqual([]);
    });
    it("refuses a governing party the country's slate does not carry", () => {
        const broken = withNation("DEU", (nation) => ({
            ...nation,
            partySystem: { ...nation.partySystem, parties: nation.partySystem.parties.filter((party) => party.id !== "party-deu-spd") },
        }));
        const errors = checkLeaderConstraints(broken);
        expect(errors).toHaveLength(1);
        expect(errors[0].kind).toBe("dangling-reference");
        expect(errors[0].message).toContain("party-deu-spd");
    });
    it("refuses a title for a government whose charter seats no chair", () => {
        const broken = {
            ...worldDataset,
            charters: worldDataset.charters.map((charter) => charter.id === "charter-military-junta" ? { ...charter, cabinetRoles: [] } : charter),
        };
        const junta = worldDataset.nations.filter((nation) => nation.identity.government === "charter-military-junta");
        expect(junta.length).toBeGreaterThan(0);
        expect(checkLeaderConstraints(broken).filter((error) => error.message.includes("seats no chair"))).toHaveLength(junta.length);
    });
    it("refuses a row whose name culture is not the one its people are drawn from", async () => {
        vi.doMock("../dataset/nation-leaders.generated.js", async (importOriginal) => {
            const original = await importOriginal();
            return {
                ...original,
                NATION_LEADER_CONSTRAINTS: { ...original.NATION_LEADER_CONSTRAINTS, ISL: { ...original.NATION_LEADER_CONSTRAINTS.ISL, nameCulture: "anglo" } },
            };
        });
        const { checkLeaderConstraints: check } = await import("./leader-checks.js");
        const errors = check(worldDataset);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain("anglo");
    });
    it("reads rows only for the nations a dataset carries, so a small fixture is not refused for the rest", () => {
        const fixture = { ...worldDataset, nations: worldDataset.nations.filter((nation) => nation.id === "USA") };
        expect(checkLeaderConstraints(fixture)).toEqual([]);
    });
});
