import { describe, expect, it } from "vitest";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { auditScenario } from "./scenario-audit.js";
import { castBound, scenarioLive } from "./scenario-cast.js";
const campaign = sealedCampaign();
const probe = (over) => ({ ...FIXTURE_SCENARIOS[0], id: "geo-probe", once: false, cast: { pick: "closest" }, ...over });
const harbor = probe({ conditions: [], locus: { site: "coast", ground: "counterpart", descriptor: "the quay where the freed crew came ashore" } });
const gate = (field) => ({ kind: "geography", field, is: true, of: "counterpart" });
const kinds = (def) => auditScenario(def).filter((f) => f.kind === "coastal-counterpart-ungated").map((f) => f.severity);
describe("geography of the cast government", () => {
    it("reads the counterpart's coast, land neighbors and chokepoints, not the player's", () => {
        const live = (field, id) => scenarioLive(campaign, probe({ conditions: [gate(field)] }), id);
        expect(live("coastal", "CHE")).toBe(false);
        expect(live("coastal", "JPN")).toBe(true);
        expect(live("bordered", "NZL")).toBe(false);
        expect(live("bordered", "CHE")).toBe(true);
    });
    it("refuses a harbor on the counterpart's ground that a landlocked country could be dealt", () => {
        expect(kinds(harbor)).toEqual(["error"]);
        expect(kinds({ ...harbor, conditions: [gate("coastal")] })).toEqual([]);
    });
    it("holds a border and a chokepoint to the same rule", () => {
        expect(kinds(probe({ conditions: [], locus: { site: "border", ground: "counterpart", descriptor: "the crossing where trucks wait on their side" } }))).toEqual(["error"]);
        expect(kinds(probe({ conditions: [], locus: { site: "chokepoint", ground: "counterpart", descriptor: "the narrows where the tanker was shadowed" } }))).toEqual(["error"]);
    });
    it("never names a harbor in a landlocked country's dateline once the gate is on", () => {
        const def = { ...harbor, conditions: [gate("coastal")] };
        const landlocked = Object.keys(campaign.nations).filter((id) => campaign.nations[id].base.geo.coastline === false);
        expect(landlocked.length).toBeGreaterThan(0);
        for (const id of landlocked)
            expect(scenarioLive(campaign, def, id)).toBe(false);
        expect(castBound(campaign, def, "JPN").locus?.placeName).toBeDefined();
    });
});
