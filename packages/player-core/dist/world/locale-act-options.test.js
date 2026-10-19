import { describe, expect, it } from "vitest";
import { GOVERNOR_ASSENT_FLOOR, LOCALE_ACTS, apply, localeActCost, takeLocaleAct } from "@admin/engine";
import { buildModelingAct } from "../modeling/acts";
import { openingCampaign } from "../__fixtures__/opening";
import { homeActOptions, localeActOptions, localeMatters, localeWaiting } from "./locale-act-options";
const base = openingCampaign();
const claim = { signature: "relief:wildfire", openedTurn: base.turn, expiresTurn: base.turn + 5, weight: 0.5, reason: "Colorado asked Washington for help with the fire." };
function colorado(patch = {}) {
    return { ...base, states: { ...base.states, CO: { ...base.states.CO, claims: [claim], ...patch } } };
}
describe("localeMatters", () => {
    it("lists a governor's open request as a matter, with its clock", () => {
        const matters = localeMatters(colorado(), "CO");
        expect(matters).toHaveLength(1);
        expect(matters[0]).toMatchObject({ cause: "wildfire", request: { weeksLeft: 5, weight: 0.5 } });
    });
    it("has nothing to answer in a state that is quiet", () => {
        expect(localeMatters(base, "CO")).toEqual([]);
    });
});
describe("localeActOptions", () => {
    const campaign = colorado();
    const options = localeActOptions(campaign, "CO", "wildfire");
    it("offers every act a disaster can be answered with, in the engine's order", () => {
        expect(options.map((option) => option.id)).toEqual(LOCALE_ACTS.filter((act) => !act.coercion).map((act) => act.id));
    });
    it("offers force and collection against unrest only, each with its odds and never its outcome", () => {
        const unrest = localeActOptions(campaign, "CO", "unrest");
        expect(unrest.map((option) => option.id)).toEqual(LOCALE_ACTS.map((act) => act.id));
        const agents = unrest.find((option) => option.id === "agents");
        expect(agents.risk?.odds).toBeGreaterThan(0);
        for (const id of ["agents", "federalize", "troops"]) {
            expect(unrest.find((option) => option.id === id)?.locked).toContain("doesn't include");
            expect(unrest.find((option) => option.id === id)?.packet).toBeUndefined();
            expect(buildModelingAct(campaign, { act: "locale", state: "CO", cause: "unrest", option: id }).ok).toBe(false);
        }
        expect(options.some((option) => option.risk)).toBe(false);
    });
    it("prices each open act off the packet it commits, which is the engine's own packet", () => {
        for (const option of options.filter((entry) => !entry.locked)) {
            const result = takeLocaleAct(campaign, "CO", option.id, "wildfire");
            expect(result.ok).toBe(true);
            expect(option.packet).toEqual(result.ok ? result.packet : undefined);
            expect(option.cost).toBe(localeActCost(campaign, LOCALE_ACTS.find((act) => act.id === option.id)));
        }
    });
    it("charges exactly the cost it showed once the packet is applied", () => {
        const relief = options.find((option) => option.id === "relief");
        const after = apply(campaign, relief.packet);
        expect(campaign.player.metrics.treasury - after.player.metrics.treasury).toBeCloseTo(relief.cost, 6);
        expect(after.states.CO.claims.some((entry) => entry.signature === "relief:wildfire")).toBe(false);
    });
    it("says relief answers the request, and a review defers it", () => {
        expect(options.find((option) => option.id === "relief")).toMatchObject({ answers: true, unrequested: false });
        expect(options.find((option) => option.id === "review")).toMatchObject({ answers: false, defers: true });
        expect(options.find((option) => option.id === "waiver")).toMatchObject({ answers: false, defers: false });
    });
    it("locks federal service while its factual and legal pathway is unmodeled", () => {
        const federalize = options.find((option) => option.id === "federalize");
        expect(federalize.locked).toMatch(/doesn't include/);
        expect(federalize.packet).toBeUndefined();
    });
    it("locks asking the governor to deploy when the governor withholds assent", () => {
        const governor = base.states.CO.governor;
        const cold = colorado({ governor: { ...governor, disposition: GOVERNOR_ASSENT_FLOOR - 0.1 } });
        const ask = localeActOptions(cold, "CO", "wildfire").find((option) => option.id === "request-deployment");
        expect(ask.assent).toBe("The governor won't agree to it.");
        expect(ask.locked).toMatch(/assent/);
        const warm = colorado({ governor: { ...governor, disposition: 0.9 } });
        expect(localeActOptions(warm, "CO", "wildfire").find((option) => option.id === "request-deployment")).toMatchObject({ assent: "The governor agrees to it." });
    });
    it("charges standing for relief nobody asked for", () => {
        const unasked = localeActOptions(colorado({ claims: [] }), "CO", "wildfire").find((option) => option.id === "relief");
        expect(unasked.unrequested).toBe(true);
        expect(unasked.standing).toBeGreaterThan(0);
    });
});
describe("localeWaiting", () => {
    it("says when the request runs out", () => {
        expect(localeWaiting(colorado(), "CO", "wildfire")).toEqual({
            line: "Colorado's request runs out in 5 weeks. If you don't answer it, the state will hold it against you.",
            weeksLeft: 5,
        });
    });
    it("says nothing when nothing was asked, since no clock runs", () => {
        expect(localeWaiting(base, "CO", "wildfire")).toBeUndefined();
    });
    it("retains unsupported proposals for comparison without executable packets", () => {
        const campaign = colorado();
        const home = homeActOptions(campaign, "CO");
        expect(home.map((option) => option.id)).toEqual(LOCALE_ACTS.filter((act) => act.coercion).map((act) => act.id));
        const agents = home.find((option) => option.id === "agents");
        const answered = localeActOptions(campaign, "CO", "unrest").find((option) => option.id === "agents");
        expect(agents.unprovoked).toBe(true);
        for (const proposal of home) {
            expect(proposal.locked).toBeTruthy();
            expect(proposal.packet).toBeUndefined();
        }
        expect(agents.risk.odds).toBeGreaterThan(answered.risk.odds);
        expect(agents.standing).toBeGreaterThan(answered.standing);
    });
});
