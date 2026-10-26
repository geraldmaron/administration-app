import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { openPursuit } from "./pursuits.js";
import { APPROVAL_CEILING, OBJECTION_FLOOR, observerStance, projectRipples, rippleContribution } from "./resolution-ripples.js";
import { relationshipAnchor } from "./relationships.js";
import { relationshipKey, selectNation } from "./state.js";
const { campaign: founded } = foundedForBalance("resolution-ripples");
const USA = founded.founding.nation;
const N = (id) => id;
const sanction = (target) => ({ actor: USA, target: N(target), instrument: "economic", rung: 3 });
const withTrust = (campaign, from, to, trust) => {
    const key = relationshipKey(N(from), N(to));
    return { ...campaign, relationships: { ...campaign.relationships, [key]: { ...campaign.relationships[key], trust } } };
};
const iran = selectNation(founded, N("IRN")).base;
const observers = Object.keys(founded.nations).filter((id) => founded.relationships[relationshipKey(N(id), USA)] && founded.relationships[relationshipKey(N(id), N("IRN"))]);
const observer = observers.find((id) => id !== "IRN" && id !== USA);
function pressing(campaign, actor, target) {
    const p = openPursuit(N(actor), N(target), "security", campaign.turn, "economic", 3, "Pressure applied.");
    return { ...campaign, pursuits: { ...campaign.pursuits, [p.id]: p } };
}
function sanctionOnce(campaign) {
    const ripples = projectRipples(campaign, sanction("IRN"), iran, 0.42, "the United States");
    const { effects } = rippleContribution(campaign, sanction("IRN"), ripples);
    return apply(campaign, { source: "action", actor: "player", turn: campaign.turn, narration: { summary: "A sanction." }, effects });
}
describe("a third party reads a move by its own ties", () => {
    it("objects in proportion to its trust in the target, with no cliff", () => {
        const at = (trust) => observerStance(withTrust(founded, observer, "IRN", trust), N(observer), USA, iran, "economic");
        // The bond's slope only: two hundredths of trust move the reading by about one hundredth.
        expect(Math.abs(at(0.39) - at(0.41))).toBeLessThan(0.015);
        expect(at(0.75)).toBeLessThan(at(0.4));
        expect(at(0.4)).toBeLessThan(at(0.05));
    });
    it("stays neutral when it distrusts the target: rivalry earns no approval and no objection", () => {
        expect(observerStance(withTrust(founded, observer, "IRN", -0.3), N(observer), USA, iran, "economic")).toBe(0);
        expect(observerStance(withTrust(founded, observer, "IRN", -0.3), N(observer), USA, iran, "military")).toBe(0);
    });
    it("approves only when it already runs the same policy against the target", () => {
        const rival = withTrust(founded, observer, "IRN", -0.3);
        expect(observerStance(pressing(rival, observer, "IRN"), N(observer), USA, iran, "economic")).toBeGreaterThan(0);
    });
    it("objects more for a military act than a diplomatic one, and gives a trusted actor some benefit of the doubt", () => {
        const friend = withTrust(founded, observer, "IRN", 0.5);
        expect(observerStance(friend, N(observer), USA, iran, "military")).toBeLessThan(observerStance(friend, N(observer), USA, iran, "diplomatic"));
        const trusting = withTrust(friend, observer, USA, 0.8);
        const wary = withTrust(friend, observer, USA, -0.2);
        expect(observerStance(trusting, N(observer), USA, iran, "economic")).toBeGreaterThan(observerStance(wary, N(observer), USA, iran, "economic"));
    });
    it("cannot be farmed: repeating pressure a rival of the target is already applying buys at most a bounded lift", () => {
        const key = relationshipKey(N(observer), USA);
        const anchor = relationshipAnchor(founded, founded.relationships[key]);
        let campaign = pressing(withTrust(withTrust(founded, observer, "IRN", -0.3), observer, USA, anchor.trust), observer, "IRN");
        for (let i = 0; i < 30; i++)
            campaign = sanctionOnce(campaign);
        const end = campaign.relationships[key].trust;
        expect(end).toBeGreaterThan(anchor.trust);
        expect(end).toBeLessThanOrEqual(anchor.trust + APPROVAL_CEILING + 1e-9);
    });
    it("keeps repeated coercion's harm cumulative for the governments that object", () => {
        const friend = withTrust(founded, observer, "IRN", 0.6);
        const key = relationshipKey(N(observer), USA);
        const once = sanctionOnce(friend).relationships[key].trust;
        const thrice = sanctionOnce(sanctionOnce(sanctionOnce(friend))).relationships[key].trust;
        const start = friend.relationships[key].trust;
        expect(start - thrice).toBeGreaterThan(2.5 * (start - once));
    });
    describe("a frequent coercer's standing with one objecting government", () => {
        const key = relationshipKey(N(observer), USA);
        const anchor = relationshipAnchor(founded, founded.relationships[key]);
        const friend = withTrust(withTrust(founded, observer, "IRN", 0.6), observer, USA, anchor.trust);
        const trail = [friend.relationships[key].trust];
        let campaign = friend;
        for (let i = 0; i < 200; i++) {
            campaign = sanctionOnce(campaign);
            trail.push(campaign.relationships[key].trust);
        }
        const costs = trail.slice(1).map((trust, i) => trail[i] - trust);
        it("plateaus above a floor below where the pair stands", () => {
            expect(trail.at(-1)).toBeGreaterThan(anchor.trust - OBJECTION_FLOOR);
            expect(costs.at(-1)).toBeLessThan(costs[0] / 4);
        });
        it("still charges every new act something, less as the floor nears", () => {
            expect(costs.every((cost) => cost > 0)).toBe(true);
            expect(costs.every((cost, i) => i === 0 || cost <= costs[i - 1] + 1e-12)).toBe(true);
        });
        it("leaves another government's reading of the same coercer to its own record", () => {
            const other = observers.find((id) => id !== observer && id !== "IRN" && id !== USA
                && projectRipples(friend, sanction("IRN"), iran, 0.42, "the United States").some((ripple) => ripple.nation === N(id) && !ripple.approves));
            const otherKey = relationshipKey(N(other), USA);
            const atStanding = withTrust(campaign, other, USA, relationshipAnchor(campaign, campaign.relationships[otherKey]).trust);
            const ripple = projectRipples(atStanding, sanction("IRN"), iran, 0.42, "the United States").find((entry) => entry.nation === N(other));
            const effect = rippleContribution(atStanding, sanction("IRN"), [ripple]).effects[0];
            expect(effect?.kind === "relationship" ? effect.deltas?.trust : undefined).toBeCloseTo(-ripple.magnitude, 12);
        });
        it("leaves the cap on approval where it was", () => {
            let rival = pressing(withTrust(withTrust(founded, observer, "IRN", -0.3), observer, USA, anchor.trust), observer, "IRN");
            for (let i = 0; i < 60; i++)
                rival = sanctionOnce(rival);
            expect(rival.relationships[key].trust).toBeLessThanOrEqual(anchor.trust + APPROVAL_CEILING + 1e-9);
        });
    });
    it("reads exposure from the size of the lane, not from the target's short list", () => {
        const friend = withTrust(founded, observer, "IRN", 0.3);
        const runtime = friend.nations[N("IRN")];
        const relisted = (partners) => ({
            ...friend,
            nations: { ...friend.nations, [N("IRN")]: { ...runtime, base: { ...runtime.base, stats: { ...runtime.base.stats, trade: { ...runtime.base.stats.trade, topPartners: [...partners] } } } } },
        });
        const target = (c) => selectNation(c, N("IRN")).base;
        const listed = relisted([N(observer)]);
        const unlisted = relisted([]);
        expect(observerStance(listed, N(observer), USA, target(listed), "economic")).toBe(observerStance(unlisted, N(observer), USA, target(unlisted), "economic"));
    });
    it("names the same governments in the same order whatever order the nations were written in", () => {
        const reversed = { ...founded, nations: Object.fromEntries(Object.entries(founded.nations).reverse()) };
        const a = projectRipples(founded, sanction("IRN"), iran, 0.42, "the United States");
        const b = projectRipples(reversed, sanction("IRN"), iran, 0.42, "the United States");
        expect(b).toEqual(a);
    });
});
