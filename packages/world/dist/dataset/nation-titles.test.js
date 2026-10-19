import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LEADER_TABLE_AS_OF, NATION_LEADER_CONSTRAINTS, REAL_NAME_HASHES } from "./nation-leaders.generated.js";
import { leaderConstraintFor, nationCabinetRoles, nationLeadRole, nationRoleTitle } from "./nation-titles.js";
import { worldNations } from "./nations.js";
import { applyPartySystems } from "./party-systems.js";
const SEED = fileURLToPath(new URL("./seed/nation-leaders.tsv", import.meta.url));
function seedRows() {
    const lines = readFileSync(SEED, "utf8")
        .split("\n")
        .filter((line) => line.length > 0 && !line.startsWith("#"));
    const [header, ...rows] = lines;
    const columns = header.split("\t");
    return rows.map((row) => Object.fromEntries(row.split("\t").map((cell, i) => [columns[i], cell])));
}
const ROWS = Object.values(NATION_LEADER_CONSTRAINTS);
describe("the leader constraint table, as the dataset carries it", () => {
    it("has one row for every government but the player's, and none for anything else", () => {
        const foreign = worldNations.filter((nation) => !nation.playable).map((nation) => nation.id).sort();
        expect(Object.keys(NATION_LEADER_CONSTRAINTS).sort()).toEqual(foreign);
        expect(ROWS).toHaveLength(195);
    });
    it("dates every row to the day the table was closed", () => {
        expect(LEADER_TABLE_AS_OF).toBe("2026-09-23");
        for (const row of ROWS)
            expect(row.asOf, row.nation).toBe(LEADER_TABLE_AS_OF);
    });
    it("keeps the researched counts: fifteen women leaders, thirty-two governments without a party", () => {
        expect(ROWS.filter((row) => row.sex === "F").map((row) => row.nation).sort()).toEqual(["BRB", "CRI", "DNK", "ISL", "ITA", "JPN", "MDA", "MEX", "MHL", "NAM", "PER", "SUR", "TTO", "TZA", "VEN"]);
        // 31 "none (...)" governments, and Guatemala's President, who governs as an independent.
        expect(ROWS.filter((row) => row.partyless)).toHaveLength(32);
    });
    it("seats every governing party on its own country's slate, the leader's first", () => {
        const slates = new Map(applyPartySystems(worldNations).map((nation) => [nation.id, nation.partySystem.parties.map((party) => party.id)]));
        for (const row of ROWS) {
            for (const party of row.governing)
                expect(slates.get(row.nation), `${row.nation} ${party}`).toContain(party);
        }
        expect(NATION_LEADER_CONSTRAINTS.HUN.governing[0]).toBe("party-hun-tisza");
        expect(NATION_LEADER_CONSTRAINTS.DEU.governing).toEqual(["party-deu-union", "party-deu-spd"]);
    });
    it("is the same table the vendored seed file holds", () => {
        const seed = seedRows();
        expect(seed).toHaveLength(ROWS.length);
        for (const line of seed) {
            const row = NATION_LEADER_CONSTRAINTS[line.nation_id];
            expect(line.leader_title, line.nation_id).toBe(row.title);
            expect(line.leader_sex, line.nation_id).toBe(row.sex);
            expect(line.leader_age_band, line.nation_id).toBe(row.ageBand);
            expect(line.governing_party_ids, line.nation_id).toBe(row.governing.join(";"));
            expect(Number(line.women_cabinet_share), line.nation_id).toBe(row.womenCabinetShare);
        }
    });
    it("holds the real-name blocklist as numbers only", () => {
        expect(REAL_NAME_HASHES.length).toBeGreaterThan(500);
        for (const hash of REAL_NAME_HASHES)
            expect(Number.isInteger(hash) && hash >= 0).toBe(true);
        expect(new Set(REAL_NAME_HASHES).size).toBe(REAL_NAME_HASHES.length);
    });
});
describe("what a country calls its lead chair", () => {
    it("titles the chair the charter seats first, and no other", () => {
        expect(nationRoleTitle("DEU", "role-prime-minister")).toBe("Federal Chancellor");
        expect(nationRoleTitle("DEU", "role-foreign-minister")).toBeUndefined();
        expect(nationRoleTitle("DEU", "role-president")).toBeUndefined();
        expect(nationRoleTitle("USA", "role-president")).toBeUndefined();
    });
    it("titles Saudi Arabia's leader as the Crown Prince who governs, under a charter that stays a monarchy", () => {
        expect(nationLeadRole("SAU")).toBe("role-monarch");
        expect(nationRoleTitle("SAU", "role-monarch")).toBe("Crown Prince and Prime Minister");
        expect(leaderConstraintFor("SAU", "role-monarch")?.seat).toBe("head_of_government");
    });
    it("gives every foreign government a lead chair to title", () => {
        for (const row of ROWS) {
            const lead = nationLeadRole(row.nation);
            expect(lead, row.nation).toBeDefined();
            expect(nationCabinetRoles(row.nation)[0]).toBe(lead);
            expect(nationRoleTitle(row.nation, lead)).toBe(row.title);
        }
    });
});
