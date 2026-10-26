import { describe, expect, it } from "vitest";
import { Nation } from "@admin/world";
import { FORCE_PACKAGE_SPECS, composeForcePackages, forceScale, specAgainst } from "./force-packages.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
const ALP = "ALP";
function withStrength(campaign, nation, strength) {
    const runtime = campaign.nations[nation];
    const base = Nation.parse({
        ...runtime.base,
        stats: {
            ...runtime.base.stats,
            military: { ...runtime.base.stats.military, branchStrength: { ...runtime.base.stats.military.branchStrength, air: strength, naval: strength, land: strength } },
        },
    });
    return { ...campaign, nations: { ...campaign.nations, [nation]: { ...runtime, base, stats: base.stats } } };
}
const strike = FORCE_PACKAGE_SPECS.find((spec) => spec.id === "limited-strike");
const carrier = FORCE_PACKAGE_SPECS.find((spec) => spec.id === "carrier-presence");
describe("force packages sized against the target", () => {
    it("proposes a small strike against a weak air arm and the full package against a peer", () => {
        const weak = specAgainst(withStrength(buildCampaign(), ALP, 0.25), ALP, strike);
        const peer = specAgainst(withStrength(buildCampaign(), ALP, 1), ALP, strike);
        expect(weak.preferred).toBeGreaterThanOrEqual(35);
        expect(weak.preferred).toBeLessThanOrEqual(45);
        expect(peer.preferred).toBe(strike.preferred);
    });
    it("never proposes more than the package's own size, nor a floor above the proposal", () => {
        for (const strength of [0, 0.1, 0.5, 0.9, 1]) {
            for (const spec of FORCE_PACKAGE_SPECS) {
                const sized = specAgainst(withStrength(buildCampaign(), ALP, strength), ALP, spec);
                expect(sized.preferred).toBeLessThanOrEqual(spec.preferred);
                expect(sized.min).toBeLessThanOrEqual(sized.preferred);
                expect(sized.min).toBeGreaterThanOrEqual(1);
            }
        }
    });
    it("leaves a package nothing sizes, and an order with no target, as they were", () => {
        expect(specAgainst(buildCampaign(), ALP, carrier)).toEqual(carrier);
        expect(specAgainst(buildCampaign(), undefined, strike)).toEqual(strike);
    });
    it("bills and resolves the staff's proposal at full scale, whatever the target", () => {
        const campaign = withStrength(buildCampaign(), ALP, 0.25);
        const sized = specAgainst(campaign, ALP, strike);
        expect(forceScale(4, { branch: strike.branch, unitType: strike.unitType, count: sized.preferred, preferred: sized.preferred })).toBe(1);
        expect(forceScale(4, { branch: strike.branch, unitType: strike.unitType, count: strike.preferred })).toBe(1);
    });
    it("composes packages against the named target", () => {
        const campaign = withStrength(buildCampaign(), ALP, 0.25);
        const composed = composeForcePackages(campaign, campaign.founding.nation, ALP).find((entry) => entry.spec.id === "limited-strike");
        expect(composed.spec.preferred).toBeLessThan(strike.preferred);
    });
});
