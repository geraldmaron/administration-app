import { describe, expect, it } from "vitest";
import { districtHolder } from "@admin/engine";
import { districtById } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { assembleDistrictDossier } from "./district-dossier";
const base = openingCampaign();
const firstDistrict = [...districtById.values()][0];
describe("assembleDistrictDossier", () => {
    it("reads nothing for a district id the world does not carry", () => {
        expect(assembleDistrictDossier(base, "DIST-NOT-REAL")).toBeUndefined();
    });
    it("carries the authored sign-of-lean and the delegation's own holder as two separate facts", () => {
        const dossier = assembleDistrictDossier(base, firstDistrict.id);
        expect(dossier).toBeDefined();
        expect(dossier.incumbentParty).toBe(firstDistrict.incumbentParty);
        // The live holder agrees with the delegation the engine itself counts — the
        // one fact POL-9 asks a district page to state, rather than the authored
        // sign fixed at dataset-authoring time.
        expect(dossier.holder).toBe(districtHolder(base, firstDistrict.id));
    });
});
