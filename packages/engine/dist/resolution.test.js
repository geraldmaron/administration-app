import { withStandingFinding } from "./finding-testing.js";
import { withTariffFinding } from "./__fixtures__/tariff.js";
import { describe, it, expect } from "vitest";
import { Nation, Relationship } from "@admin/world";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { relationshipKey, selectRelationship } from "./state.js";
import { apply } from "./effects.js";
import { foreignSurveillanceExposed, INSTRUMENT_IDS, RUNG_LEVELS } from "./instruments.js";
import { projectAction, resolveAction } from "./resolution.js";
import { projectRipples, rippleContribution } from "./resolution-ripples.js";
import { relationshipAnchor } from "./relationships.js";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { landRung } from "./__fixtures__/ladder.js";
import { counterpartWillingness } from "./treaty-counterpart.js";
import { disposition } from "./relationships.js";
const ACTOR = nationA.id;
const TARGET = nationB.id;
const nid = (id) => id;
function rel(from, to, overrides = {}) {
    return Relationship.parse({
        from,
        to,
        trust: 0.2,
        alignment: 0.1,
        tension: 0.1,
        tradeDependence: 0.3,
        militaryThreat: 0.1,
        treaties: [],
        grudges: [],
        history: [],
        ...overrides,
    });
}
// A four-nation board: the target has one treaty ally, one bloc peer, and one
// top trade partner, each of which also holds a reading of the actor. That is
// the minimum shape needed to prove a ripple reaches all three channels.
function boardWithThirdParties() {
    const base = buildCampaign();
    const ally = Nation.parse({ ...nationB, id: "ALY", identity: { ...nationB.identity, name: "Allyland" } });
    const blocPeer = Nation.parse({
        ...nationB,
        id: "BLC",
        identity: { ...nationB.identity, name: "Blocia" },
        memberships: ["ORG-EU"],
    });
    const partner = Nation.parse({ ...nationB, id: "PTR", identity: { ...nationB.identity, name: "Partnerland" } });
    const target = Nation.parse({
        ...nationB,
        memberships: ["ORG-EU"],
        stats: { ...nationB.stats, trade: { ...nationB.stats.trade, topPartners: ["PTR"] } },
    });
    // The actor has to clear every rung's capability gate, otherwise a test
    // about cost/odds/ripples would silently be testing a refusal instead.
    const actor = Nation.parse({
        ...nationA,
        stats: {
            ...nationA.stats,
            economy: { ...nationA.stats.economy, reserves: 50_000, gdp: 500_000, gdpPerCapita: 100_000 },
            trade: { ...nationA.stats.trade, exports: 100_000 },
            military: {
                ...nationA.stats.military,
                branchStrength: { land: 0.8, air: 0.8, naval: 0.8, cyber: 0.7, space: 0.5 },
                airliftCapacity: 0.8,
                sealiftCapacity: 0.8,
                basesAbroad: 3,
            },
            security: { ...nationA.stats.security, intelCapability: 0.8, counterIntel: 0.8 },
            politics: { ...nationA.stats.politics, legitimacy: 0.8 },
            softPower: { ...nationA.stats.softPower, diplomaticReach: 0.8 },
        },
    });
    const nations = {
        ...base.nations,
        [actor.id]: { base: actor, stats: actor.stats, traits: actor.traits },
        [target.id]: { base: target, stats: target.stats, traits: target.traits },
        [nid("ALY")]: { base: ally, stats: ally.stats, traits: ally.traits },
        [nid("BLC")]: { base: blocPeer, stats: blocPeer.stats, traits: blocPeer.traits },
        [nid("PTR")]: { base: partner, stats: partner.stats, traits: partner.traits },
    };
    const relationships = {
        ...base.relationships,
        [relationshipKey(TARGET, ACTOR)]: rel(TARGET, ACTOR),
        // The ally reads the target warmly and holds a treaty with it.
        [relationshipKey(nid("ALY"), TARGET)]: rel("ALY", TARGET, { trust: 0.7, treaties: ["treaty-pact"] }),
        [relationshipKey(nid("ALY"), ACTOR)]: rel("ALY", ACTOR),
        // The bloc peer is cool toward the target — only the shared membership ties them.
        [relationshipKey(nid("BLC"), TARGET)]: rel("BLC", TARGET, { trust: 0 }),
        [relationshipKey(nid("BLC"), ACTOR)]: rel("BLC", ACTOR),
        [relationshipKey(nid("PTR"), TARGET)]: rel("PTR", TARGET, { trust: 0 }),
        [relationshipKey(nid("PTR"), ACTOR)]: rel("PTR", ACTOR),
    };
    return withStandingFinding({ ...base, nations, relationships }, TARGET);
}
const streamsFor = (seed) => createRngStreams(makeCampaignSeed(seed));
const request = (instrument, rung) => ({ actor: ACTOR, target: TARGET, instrument, rung });
describe("the projection contract", () => {
    it("derives the resolved outcome from the very projection it showed the player", () => {
        const campaign = boardWithThirdParties();
        const streams = streamsFor("projection-parity");
        for (const instrument of INSTRUMENT_IDS) {
            for (const rung of RUNG_LEVELS) {
                const req = request(instrument, rung);
                const projected = projectAction(campaign, req, streams);
                const resolved = resolveAction(campaign, req, streams);
                expect(resolved.ok).toBe(projected.ok);
                if (projected.ok && resolved.ok) {
                    expect(resolved.projection).toEqual(projected.projection);
                }
            }
        }
    });
    it("is seed-independent, so the figures shown cannot depend on the coming draw", () => {
        const campaign = boardWithThirdParties();
        const req = request("economic", 3);
        const a = projectAction(campaign, req, streamsFor("seed-a"));
        const b = projectAction(campaign, req, streamsFor("seed-b"));
        expect(a).toEqual(b);
    });
    it("names an exhaustive set of outcomes: success plus every risk sums to one", () => {
        const campaign = boardWithThirdParties();
        for (const instrument of INSTRUMENT_IDS) {
            for (const rung of RUNG_LEVELS) {
                const projected = projectAction(campaign, request(instrument, rung), streamsFor("exhaustive"));
                if (!projected.ok)
                    continue;
                const { successChance, risks } = projected.projection;
                const total = successChance + risks.reduce((sum, r) => sum + r.chance, 0);
                expect(total).toBeCloseTo(1, 10);
            }
        }
    });
    it("refuses an ungated rung with the missing capability rather than a projection", () => {
        const campaign = boardWithThirdParties();
        // the United States' naval strength (0.3) clears rung 3, but it holds no lift and no
        // land strength for an expeditionary invasion against a non-neighbor.
        const far = Nation.parse({ ...nationB, id: "FAR", geo: { ...nationB.geo, lat: -70, lon: -170, neighbors: [] } });
        const withFar = {
            ...campaign,
            nations: { ...campaign.nations, [nid("FAR")]: { base: far, stats: far.stats, traits: far.traits } },
            relationships: { ...campaign.relationships, [relationshipKey(ACTOR, nid("FAR"))]: rel(ACTOR, "FAR") },
        };
        const projected = projectAction(withFar, { actor: ACTOR, target: nid("FAR"), instrument: "military", rung: 5 }, streamsFor("gate"));
        expect(projected.ok).toBe(false);
        if (!projected.ok)
            expect(projected.missingCapability).toBeTruthy();
    });
    // Everything the ladder's commit surface has to read before an act is
    // ordered. Each of these was derived by the engine and thrown away at the
    // screen: the price came back as a bag of movements that the surface reduced
    // to its first mark, and the two facts a president actually asks about
    // — who has to be told, and how long the force is short afterward — were
    // authored in the app and rendered by nothing.
    describe("what a rung tells the player before it is ordered", () => {
        it("marks itself available, so one shared reader can render it beside a scenario reply", () => {
            const projected = projectAction(boardWithThirdParties(), request("military", 4), streamsFor("available"));
            expect(projected.ok).toBe(true);
            if (!projected.ok)
                return;
            expect(projected.projection.available).toBe(true);
        });
        it("carries every cost mark the act moves, not only the first", () => {
            const projected = projectAction(boardWithThirdParties(), request("military", 4), streamsFor("marks"));
            expect(projected.ok).toBe(true);
            if (!projected.ok)
                return;
            const { cost, capacity } = projected.projection;
            // A military rung spends money, standing, calm at home and readiness. A
            // surface that renders one of the four is misreporting the other three.
            for (const key of ["treasury", "standing", "stability"]) {
                expect(cost[key], key).toBeDefined();
                expect(cost[key], key).not.toBe(0);
            }
            // Readiness is quoted once, as the capacity the act takes out of the
            // establishment. Quoting it twice, a smaller figure on the cost line and
            // the real force bill here, is two answers to one question on one screen.
            expect(cost.militaryReadiness).toBeUndefined();
            expect(capacity?.amount).toBeGreaterThan(0);
        });
        it("does not charge a covert rung to the force it never used", () => {
            // Covert action spends the clandestine service, which has its own
            // capacity line. Billing it to `militaryReadiness` as well closed the
            // gates on the military ladder through a channel nothing showed.
            for (const rung of RUNG_LEVELS) {
                const projected = projectAction(boardWithThirdParties(), request("covert", rung), streamsFor("covert-force"));
                if (!projected.ok)
                    continue;
                expect(projected.projection.cost.militaryReadiness, `covert ${rung}`).toBeUndefined();
            }
        });
        it("names who has to be told, on every rung of every instrument", () => {
            const campaign = boardWithThirdParties();
            for (const instrument of INSTRUMENT_IDS) {
                for (const rung of RUNG_LEVELS) {
                    const projected = projectAction(campaign, request(instrument, rung), streamsFor("consultation"));
                    if (!projected.ok)
                        continue;
                    expect(projected.projection.consultation.length, `${instrument} ${rung}`).toBeGreaterThan(0);
                }
            }
        });
        it("states the rebuild clock on the rungs that spend the establishment, and nowhere else", () => {
            const campaign = boardWithThirdParties();
            const heavy = projectAction(campaign, request("military", 4), streamsFor("capacity"));
            expect(heavy.ok).toBe(true);
            if (!heavy.ok)
                return;
            expect(heavy.projection.capacity?.label).toBe("Military Readiness");
            expect(heavy.projection.capacity.weeks).toBeGreaterThan(0);
            expect(heavy.projection.capacity.amount).toBeGreaterThan(0);
            const gesture = projectAction(campaign, request("diplomatic", 1), streamsFor("capacity"));
            expect(gesture.ok).toBe(true);
            if (!gesture.ok)
                return;
            expect(gesture.projection.capacity).toBeUndefined();
        });
    });
    it("refuses when there is no relationship to act through", () => {
        const campaign = boardWithThirdParties();
        const projected = projectAction(campaign, { actor: ACTOR, target: nid("ALY"), instrument: "diplomatic", rung: 1 }, streamsFor("no-rel"));
        expect(projected.ok).toBe(false);
    });
});
describe("cost", () => {
    it("charges the projected cost whether the action lands or fails", () => {
        const campaign = boardWithThirdParties();
        const req = request("military", 4);
        const resolved = resolveAction(campaign, req, streamsFor("cost-charged"));
        expect(resolved.ok).toBe(true);
        if (!resolved.ok)
            return;
        const before = campaign.player.metrics;
        const after = apply(campaign, resolved.packet).player.metrics;
        // Treasury movement is the cost line plus nothing else at this rung, so it
        // is the cleanest assertion that commitment is never free.
        expect(after.treasury).toBeLessThan(before.treasury);
        expect(after.treasury - before.treasury).toBeCloseTo(resolved.projection.cost.treasury, 6);
    });
    // Customs collect on the weekly trade phase once a United States tariff is
    // on the register. This packet charges the act and does not also retire a
    // flat share of GDP.
    it("charges the act to the authority and does not retire debt in the same packet", () => {
        // A tariff needs a law behind it; this test is about what the packet charges.
        const campaign = withTariffFinding(boardWithThirdParties(), TARGET);
        const landed = Array.from({ length: 40 }, (_, i) => resolveAction(campaign, request("economic", 2), streamsFor(`tariff-${i}`)))
            .find((r) => r.ok && r.success);
        expect(landed?.ok).toBe(true);
        if (!landed?.ok)
            return;
        const before = campaign.player.metrics.treasury;
        const next = apply(campaign, landed.packet);
        expect(next.player.metrics.treasury - before).toBeCloseTo(landed.projection.cost.treasury, 6);
        const player = campaign.founding.nation;
        const debtBefore = campaign.nations[player].stats.economy.debt;
        expect(next.nations[player].stats.economy.debt).toBe(debtBefore);
        expect(landed.packet.effects.some((effect) => effect.kind === "nationStat" && effect.setStats?.economy?.debt !== undefined)).toBe(false);
    });
    it("climbs with the rung, so escalation is a real decision", () => {
        const campaign = boardWithThirdParties();
        const costs = RUNG_LEVELS.map((rung) => {
            const projected = projectAction(campaign, request("diplomatic", rung), streamsFor("cost-curve"));
            return projected.ok ? projected.projection.cost.treasury : 0;
        });
        for (let i = 1; i < costs.length; i++) {
            expect(costs[i]).toBeLessThan(costs[i - 1]);
        }
    });
    it("charges more to reach a distant target than an adjacent one", () => {
        const campaign = boardWithThirdParties();
        const far = Nation.parse({ ...nationB, id: "FAR", geo: { ...nationB.geo, lat: -70, lon: -170, neighbors: [] } });
        const withFar = {
            ...campaign,
            nations: { ...campaign.nations, [nid("FAR")]: { base: far, stats: far.stats, traits: far.traits } },
            relationships: { ...campaign.relationships, [relationshipKey(ACTOR, nid("FAR"))]: rel(ACTOR, "FAR") },
        };
        const near = projectAction(withFar, request("military", 1), streamsFor("reach"));
        const distant = projectAction(withFar, { actor: ACTOR, target: nid("FAR"), instrument: "military", rung: 1 }, streamsFor("reach"));
        expect(near.ok && distant.ok).toBe(true);
        if (!near.ok || !distant.ok)
            return;
        expect(distant.projection.cost.treasury).toBeLessThan(near.projection.cost.treasury);
    });
});
describe("odds", () => {
    // The honesty criterion: the projected chance is not decoration. Over many
    // seeds the observed success rate has to match what the player was told.
    it("produces outcomes whose distribution matches the projected odds", () => {
        const campaign = boardWithThirdParties();
        const runs = 2000;
        for (const instrument of INSTRUMENT_IDS) {
            const req = request(instrument, 2);
            const projected = projectAction(campaign, req, streamsFor("dist"));
            if (!projected.ok)
                continue;
            // Guard against a vacuous pass: odds pinned at the ceiling or floor
            // would match almost any distribution. A rebalance that flattens them
            // should fail here rather than quietly weaken this assertion.
            expect(projected.projection.successChance).toBeGreaterThan(0.1);
            expect(projected.projection.successChance).toBeLessThan(0.9);
            let successes = 0;
            for (let i = 0; i < runs; i++) {
                const resolved = resolveAction(campaign, req, streamsFor(`dist-${instrument}-${i}`));
                if (resolved.ok && resolved.success)
                    successes++;
            }
            expect(successes / runs).toBeCloseTo(projected.projection.successChance, 1);
        }
    });
    it("makes a higher rung less reliable than a lower one with the same leverage", () => {
        const campaign = boardWithThirdParties();
        const low = projectAction(campaign, request("diplomatic", 1), streamsFor("reliability"));
        const high = projectAction(campaign, request("diplomatic", 5), streamsFor("reliability"));
        expect(low.ok && high.ok).toBe(true);
        if (!low.ok || !high.ok)
            return;
        expect(high.projection.successChance).toBeLessThan(low.projection.successChance);
    });
    it("resolves identically for the same seed and diverges across seeds", () => {
        const campaign = boardWithThirdParties();
        const req = request("covert", 2);
        const first = resolveAction(campaign, req, streamsFor("same"));
        const second = resolveAction(campaign, req, streamsFor("same"));
        expect(first).toEqual(second);
        const outcomes = new Set(Array.from({ length: 40 }, (_, i) => {
            const r = resolveAction(campaign, req, streamsFor(`vary-${i}`));
            return r.ok ? r.success : false;
        }));
        expect(outcomes.size).toBe(2);
    });
});
describe("risk", () => {
    it("names the failure branch it took, and that branch is one it projected", () => {
        const campaign = boardWithThirdParties();
        const req = request("military", 5);
        const failures = Array.from({ length: 60 }, (_, i) => resolveAction(campaign, req, streamsFor(`risk-${i}`)))
            .filter((r) => r.ok && !r.success)
            .map((r) => (r.ok ? r.risk : undefined));
        expect(failures.length).toBeGreaterThan(0);
        const projected = projectAction(campaign, req, streamsFor("risk-projection"));
        if (!projected.ok)
            throw new Error("expected a projection");
        const projectedIds = projected.projection.risks.map((r) => r.id);
        for (const failure of failures) {
            expect(projectedIds).toContain(failure.id);
        }
    });
    it("leaves a mark on failure: a grudge the target holds and a narrated history entry", () => {
        const campaign = boardWithThirdParties();
        const req = request("military", 5);
        const failed = Array.from({ length: 60 }, (_, i) => resolveAction(campaign, req, streamsFor(`mark-${i}`))).find((r) => r.ok && !r.success && r.risk.id !== "asset-lost");
        expect(failed?.ok).toBe(true);
        if (!failed?.ok)
            return;
        const after = apply(campaign, failed.packet);
        expect(selectRelationship(after, ACTOR, TARGET).history.length).toBeGreaterThan(selectRelationship(campaign, ACTOR, TARGET).history.length);
        expect(selectRelationship(after, TARGET, ACTOR).grudges.length).toBe(1);
    });
});
/** The pair stood at its standing reading, where one act's objection is charged at its full magnitude. */
function atStanding(campaign, from, to) {
    const key = relationshipKey(from, to);
    const edge = campaign.relationships[key];
    return { ...campaign, relationships: { ...campaign.relationships, [key]: { ...edge, trust: relationshipAnchor(campaign, edge).trust } } };
}
describe("ripples", () => {
    it("moves the recipient and its neighbors in opposite directions for a strike and relief", () => {
        const base = boardWithThirdParties();
        // Relief answers a need, so the recipient is living through a flood.
        const flood = { id: `condition:flood:${TARGET}:0`, nation: nid(TARGET), kind: "flood", scope: "region", severity: 0.5, startedTurn: 0, status: "active", beats: [] };
        // Each neighbor starts where it stands with the actor: approval only closes
        // the distance to a ceiling above that, so a neighbor already well above it
        // has no further warmth to give for somebody else's shipment.
        const settled = Object.fromEntries([nid("ALY"), nid("BLC"), nid("PTR")].map((third) => {
            const edge = base.relationships[relationshipKey(third, ACTOR)];
            return [relationshipKey(third, ACTOR), { ...edge, trust: relationshipAnchor(base, edge).trust }];
        }));
        const campaign = { ...base, conditions: { ...base.conditions, [flood.id]: flood }, relationships: { ...base.relationships, ...settled,
                [relationshipKey(TARGET, ACTOR)]: rel(TARGET, ACTOR, { trust: 0.5 }),
            } };
        const strike = landRung(campaign, nid(ACTOR), nid(TARGET), "military", 4, streamsFor("trust-strike"));
        const relief = landRung(campaign, nid(ACTOR), nid(TARGET), "assistance", 1, streamsFor("trust-relief"));
        if (!strike.ok || !relief.ok)
            throw new Error("expected both actions to resolve");
        const struck = apply(campaign, strike.packet);
        const helped = apply(campaign, relief.packet);
        expect(selectRelationship(struck, TARGET, ACTOR).trust).toBeLessThan(selectRelationship(campaign, TARGET, ACTOR).trust);
        expect(selectRelationship(helped, TARGET, ACTOR).trust).toBeGreaterThan(selectRelationship(campaign, TARGET, ACTOR).trust);
        for (const third of [nid("ALY"), nid("BLC"), nid("PTR")]) {
            const before = selectRelationship(campaign, third, ACTOR).trust;
            expect(selectRelationship(struck, third, ACTOR).trust).toBeLessThan(before);
            expect(selectRelationship(helped, third, ACTOR).trust).toBeGreaterThan(before);
        }
    });
    it("does not mistake a trade treaty for a defense alliance", () => {
        const base = boardWithThirdParties();
        const treaty = "treaty:kind:ALP:1";
        const towardTarget = rel(ACTOR, TARGET, { trust: 0, treaties: [treaty] });
        const towardActor = rel(ACTOR, "ALY");
        const forKind = (kind) => ({ ...base,
            relationships: { ...base.relationships,
                [relationshipKey(ACTOR, TARGET)]: towardTarget,
                [relationshipKey(ACTOR, nid("ALY"))]: towardActor,
            },
            treaties: { ...base.treaties, "treaty:kind:ALP:1": { id: "treaty:kind:ALP:1", treaty,
                    title: "Treaty", kind, counterpart: TARGET, signedTurn: base.turn, status: "ratified" } },
        });
        const action = { actor: nid("ALY"), target: TARGET, instrument: "military", rung: 4 };
        const target = base.nations[TARGET].base;
        // Under a trade treaty the actor still minds a strike on a partner it
        // trades with, but as a trading partner, never as an ally.
        expect(projectRipples(forKind("trade"), action, target, 1, "Allyland").find((ripple) => ripple.nation === ACTOR)?.relation).not.toBe("ally");
        expect(projectRipples(forKind("alliance"), action, target, 1, "Allyland").find((ripple) => ripple.nation === ACTOR)?.relation).toBe("ally");
    });
    it("reaches the target's ally, bloc peer, and trade partner", () => {
        const campaign = boardWithThirdParties();
        const projected = projectAction(campaign, request("military", 5), streamsFor("ripples"));
        if (!projected.ok)
            throw new Error("expected a projection");
        const byNation = new Map(projected.projection.ripples.map((r) => [r.nation, r]));
        expect(byNation.get(nid("ALY"))?.relation).toBe("ally");
        expect(byNation.get(nid("BLC"))?.relation).toBe("bloc-peer");
        expect(byNation.get(nid("PTR"))?.relation).toBe("trade-partner");
    });
    it("charges most to the signatory of the actor's own compact", () => {
        // Turning on a state you have signed the same paper with is the most
        // expensive thing you can do to an alliance, and reading a co-signatory as
        // merely "the target's ally" priced it as one of the cheapest.
        const base = boardWithThirdParties();
        const actor = base.nations[ACTOR];
        const inPact = Nation.parse({ ...actor.base, memberships: ["ORG-NATO"] });
        const target = base.nations[TARGET];
        const bloc = base.nations[nid("BLC")];
        const campaign = { ...base, nations: {
                ...base.nations,
                [ACTOR]: { ...actor, base: inPact },
                [TARGET]: { ...target, base: Nation.parse({ ...target.base, memberships: ["ORG-NATO"] }) },
                [nid("BLC")]: { ...bloc, base: Nation.parse({ ...bloc.base, memberships: ["ORG-NATO"] }) },
            } };
        const projected = projectAction(campaign, request("military", 5), streamsFor("bloc-partner"));
        if (!projected.ok)
            throw new Error("expected a projection");
        const byNation = new Map(projected.projection.ripples.map((r) => [r.nation, r]));
        const partner = byNation.get(nid("BLC"));
        expect(partner?.relation).toBe("bloc-partner");
        expect(partner.magnitude).toBeGreaterThan(byNation.get(nid("ALY")).magnitude);
        const effect = rippleContribution(atStanding(campaign, nid("BLC"), ACTOR), request("military", 5), projected.projection.ripples).effects
            .find((entry) => entry.kind === "relationship" && entry.from === nid("BLC") && entry.to === ACTOR);
        expect(effect?.kind === "relationship" ? effect.deltas?.trust : undefined).toBeCloseTo(-partner.magnitude, 12);
    });
    it("does not call separate or economic memberships one defense compact", () => {
        const base = boardWithThirdParties();
        const actor = base.nations[ACTOR];
        const bloc = base.nations[nid("BLC")];
        const campaign = { ...base, nations: {
                ...base.nations,
                [ACTOR]: { ...actor, base: Nation.parse({ ...actor.base, memberships: ["ORG-NATO"] }) },
                [nid("BLC")]: { ...bloc, base: Nation.parse({ ...bloc.base, memberships: ["ORG-NATO", "ORG-EU"] }) },
            } };
        const projected = projectAction(campaign, request("military", 5), streamsFor("separate-compacts"));
        if (!projected.ok)
            throw new Error("expected a projection");
        const third = projected.projection.ripples.find((r) => r.nation === nid("BLC"));
        expect(third?.relation).toBe("bloc-peer");
        expect(third?.reason).toContain("European Union");
        const effect = rippleContribution(atStanding(campaign, nid("BLC"), ACTOR), request("military", 5), projected.projection.ripples).effects
            .find((entry) => entry.kind === "relationship" && entry.from === nid("BLC") && entry.to === ACTOR);
        expect(effect?.kind === "relationship" ? effect.deltas?.trust : undefined).toBeCloseTo(-third.magnitude, 12);
    });
    it("reaches the actor's own institutions once the move is coercive enough", () => {
        const campaign = boardWithThirdParties();
        const heavy = projectAction(campaign, request("military", 5), streamsFor("domestic"));
        const light = projectAction(campaign, request("diplomatic", 1), streamsFor("domestic"));
        if (!heavy.ok || !light.ok)
            throw new Error("expected projections");
        expect(heavy.projection.ripples.some((r) => r.relation === "domestic")).toBe(true);
        expect(light.projection.ripples.some((r) => r.relation === "domestic")).toBe(false);
    });
    it("actually moves third-party relationships when the packet is applied", () => {
        const campaign = boardWithThirdParties();
        const resolved = resolveAction(campaign, request("military", 5), streamsFor("ripple-apply"));
        expect(resolved.ok).toBe(true);
        if (!resolved.ok)
            return;
        const after = apply(campaign, resolved.packet);
        for (const third of [nid("ALY"), nid("BLC"), nid("PTR")]) {
            expect(selectRelationship(after, third, ACTOR).trust).toBeLessThan(selectRelationship(campaign, third, ACTOR).trust);
        }
    });
    it("scales with severity: a higher rung of a more coercive instrument ripples harder", () => {
        const campaign = boardWithThirdParties();
        const quiet = projectAction(campaign, request("diplomatic", 2), streamsFor("severity"));
        const loud = projectAction(campaign, request("military", 5), streamsFor("severity"));
        if (!quiet.ok || !loud.ok)
            throw new Error("expected projections");
        const magnitude = (r) => (r.ok ? r.projection.ripples.find((x) => x.nation === "ALY").magnitude : 0);
        expect(magnitude(loud)).toBeGreaterThan(magnitude(quiet));
    });
    // The trail is only as honest as what it is told. A covert operation that
    // stamped itself public would have put the president's own deniable act on
    // the public record, which is the one distinction the visibility axis exists
    // to draw.
    it("stamps every act observed, and a covert one as intelligence rather than public", () => {
        const campaign = boardWithThirdParties();
        const open = resolveAction(campaign, request("diplomatic", 2), streamsFor("provenance-open"));
        const quiet = resolveAction(campaign, request("covert", 2), streamsFor("provenance-quiet"));
        if (!open.ok || !quiet.ok)
            throw new Error("expected two resolutions");
        expect(open.packet.provenance?.confidence).toBe("observed");
        expect(quiet.packet.provenance?.confidence).toBe("observed");
        expect(open.packet.provenance?.visibility).toBe("public");
        expect(quiet.packet.provenance?.visibility).toBe("intelligence");
    });
    it("holds covert ripples back until the operation is exposed", () => {
        const campaign = boardWithThirdParties();
        const req = request("covert", 5);
        const projected = projectAction(campaign, req, streamsFor("covert-visibility"));
        if (!projected.ok)
            throw new Error("expected a projection");
        expect(projected.projection.rippleVisibility).toBe("if-exposed");
        expect(projected.projection.successExposureChance).toBeCloseTo(campaign.nations[TARGET].stats.security.counterIntel * 0.25);
        const quietFailure = Array.from({ length: 80 }, (_, i) => resolveAction(campaign, req, streamsFor(`covert-${i}`))).find((r) => r.ok && !r.success && (r.risk.id === "asset-lost" || r.risk.id === "blowback"));
        expect(quietFailure?.ok).toBe(true);
        if (!quietFailure?.ok)
            return;
        const after = apply(campaign, quietFailure.packet);
        // Nobody else knows, so nobody else moves.
        expect(selectRelationship(after, nid("ALY"), ACTOR).trust).toBe(selectRelationship(campaign, nid("ALY"), ACTOR).trust);
        expect(selectRelationship(after, TARGET, ACTOR).grudges).toEqual([]);
        const exposedFailure = Array.from({ length: 80 }, (_, i) => resolveAction(campaign, req, streamsFor(`covert-${i}`))).find((r) => r.ok && !r.success && r.risk.id === "exposure");
        expect(exposedFailure?.ok).toBe(true);
        if (!exposedFailure?.ok)
            return;
        const caught = apply(campaign, exposedFailure.packet);
        expect(selectRelationship(caught, TARGET, ACTOR).grudges).toHaveLength(1);
        expect(selectRelationship(caught, nid("ALY"), ACTOR).trust).toBeLessThan(selectRelationship(campaign, nid("ALY"), ACTOR).trust);
        const successes = [];
        for (let index = 0; index < 300 && new Set(successes.map((sample) => sample.public)).size < 2; index += 1) {
            const before = { ...campaign, seed: makeCampaignSeed(`covert-success-exposure-${index}`) };
            const result = landRung(before, nid(ACTOR), nid(TARGET), "covert", 5, createRngStreams(before.seed));
            if (!result.ok)
                throw new Error("expected covert success");
            successes.push({ before, after: apply(before, result.packet), public: result.packet.provenance?.visibility === "public" });
        }
        const hiddenSuccess = successes.find((sample) => !sample.public);
        const exposedSuccess = successes.find((sample) => sample.public);
        expect(hiddenSuccess).toBeDefined();
        expect(exposedSuccess).toBeDefined();
        expect(selectRelationship(hiddenSuccess.after, nid("ALY"), ACTOR).trust).toBe(selectRelationship(hiddenSuccess.before, nid("ALY"), ACTOR).trust);
        expect(selectRelationship(exposedSuccess.after, nid("ALY"), ACTOR).trust).toBeLessThan(selectRelationship(exposedSuccess.before, nid("ALY"), ACTOR).trust);
    });
    it("charges only attributed covert successes to the target's trust in the actor", () => {
        const base = boardWithThirdParties();
        for (const rung of [2, 3, 4, 5]) {
            const samples = [];
            for (let index = 0; index < 300 && new Set(samples.map((sample) => sample.exposed)).size < 2; index += 1) {
                const before = { ...base, seed: makeCampaignSeed(`covert-target-${rung}-${index}`) };
                const resolved = landRung(before, ACTOR, TARGET, "covert", rung, createRngStreams(before.seed));
                if (!resolved.ok)
                    throw new Error(`expected covert rung ${rung} to resolve`);
                samples.push({ before, after: apply(before, resolved.packet),
                    exposed: resolved.packet.provenance?.visibility === "public", packet: resolved.packet });
            }
            const hidden = samples.find((sample) => !sample.exposed);
            const exposed = samples.find((sample) => sample.exposed);
            expect(hidden).toBeDefined();
            expect(exposed).toBeDefined();
            const beforeEdge = selectRelationship(base, TARGET, ACTOR);
            const hiddenEdge = selectRelationship(hidden.after, TARGET, ACTOR);
            const exposedEdge = selectRelationship(exposed.after, TARGET, ACTOR);
            expect(hiddenEdge.trust).toBe(beforeEdge.trust);
            expect(hiddenEdge.tension).toBe(beforeEdge.tension);
            expect(disposition(hiddenEdge, hidden.after)).toBe(disposition(beforeEdge, hidden.before));
            expect(exposedEdge.trust).toBeCloseTo(beforeEdge.trust - 0.03);
            expect(exposedEdge.tension).toBeCloseTo(beforeEdge.tension + 0.02);
            expect(disposition(exposedEdge, exposed.after)).toBeCloseTo(disposition(beforeEdge, exposed.before) - 0.05);
            expect(exposed.packet.effects.filter((effect) => effect.kind === "relationship" && effect.from === TARGET && effect.to === ACTOR)).toHaveLength(1);
            expect(counterpartWillingness(exposed.after, TARGET, "alliance").score)
                .toBeLessThan(counterpartWillingness(exposed.before, TARGET, "alliance").score);
            expect(counterpartWillingness(hidden.after, TARGET, "alliance").score)
                .toBe(counterpartWillingness(hidden.before, TARGET, "alliance").score);
        }
    });
    it("bounds repeated attributed covert charges on the directed edge", () => {
        const base = boardWithThirdParties();
        const starting = { ...base, relationships: { ...base.relationships,
                [relationshipKey(TARGET, ACTOR)]: rel(TARGET, ACTOR, { trust: -0.96, tension: 0.97 }),
            } };
        let campaign = starting;
        for (const expected of [{ trust: -0.99, tension: 0.99 }, { trust: -1, tension: 1 }]) {
            let exposed;
            for (let index = 0; index < 300; index += 1) {
                const seeded = { ...campaign, seed: makeCampaignSeed(`covert-repeat-${campaign.ledger.length}-${index}`) };
                const resolved = landRung(seeded, ACTOR, TARGET, "covert", 2, createRngStreams(seeded.seed));
                if (resolved.ok && resolved.packet.provenance?.visibility === "public") {
                    campaign = seeded;
                    exposed = resolved;
                    break;
                }
            }
            expect(exposed?.ok).toBe(true);
            if (!exposed?.ok)
                return;
            campaign = apply(campaign, exposed.packet);
            expect(selectRelationship(campaign, TARGET, ACTOR).trust).toBeCloseTo(expected.trust);
            expect(selectRelationship(campaign, TARGET, ACTOR).tension).toBeCloseTo(expected.tension);
        }
    });
    it("uses a surveillance report's actual exposure finding rather than treating success as public", () => {
        const base = boardWithThirdParties();
        const req = request("covert", 1);
        const samples = [];
        for (let index = 0; index < 300 && new Set(samples.map((sample) => sample.exposed)).size < 2; index += 1) {
            const before = { ...base, seed: makeCampaignSeed(`watch-attribution-${index}`) };
            const result = resolveAction(before, req, createRngStreams(before.seed));
            if (!result.ok || !result.success)
                continue;
            const report = result.packet.effects.find((effect) => effect.kind === "intelligence" && effect.product?.exposed !== undefined);
            if (report?.kind !== "intelligence")
                continue;
            samples.push({ exposed: report.product.exposed === true, before, after: apply(before, result.packet) });
        }
        const hidden = samples.find((sample) => !sample.exposed);
        const exposed = samples.find((sample) => sample.exposed);
        expect(hidden).toBeDefined();
        expect(exposed).toBeDefined();
        expect(selectRelationship(hidden.after, nid("ALY"), ACTOR).trust).toBe(selectRelationship(hidden.before, nid("ALY"), ACTOR).trust);
        expect(selectRelationship(exposed.after, nid("ALY"), ACTOR).trust).toBeLessThan(selectRelationship(exposed.before, nid("ALY"), ACTOR).trust);
        expect(selectRelationship(hidden.after, TARGET, ACTOR).trust).toBe(selectRelationship(hidden.before, TARGET, ACTOR).trust);
        expect(disposition(selectRelationship(hidden.after, TARGET, ACTOR), hidden.after))
            .toBe(disposition(selectRelationship(hidden.before, TARGET, ACTOR), hidden.before));
        expect(selectRelationship(exposed.after, TARGET, ACTOR).trust).toBeCloseTo(selectRelationship(exposed.before, TARGET, ACTOR).trust - 0.03);
    });
    it("does not treat public institutional openness as proof of operational exposure", () => {
        const base = boardWithThirdParties();
        const actor = base.nations[ACTOR];
        const campaign = { ...base, nations: { ...base.nations,
                [ACTOR]: { ...actor, traits: { ...actor.traits, transparency: 0.95 } },
            } };
        for (const rung of [1, 5]) {
            const projected = projectAction(campaign, request("covert", rung), streamsFor("open-actor"));
            if (!projected.ok)
                throw new Error("expected a projection");
            expect(projected.projection.successExposureChance).toBeCloseTo(campaign.nations[TARGET].stats.security.counterIntel * 0.25);
            const open = landRung(campaign, nid(ACTOR), nid(TARGET), "covert", rung, streamsFor("open-actor"));
            const ordinary = landRung(base, nid(ACTOR), nid(TARGET), "covert", rung, streamsFor("open-actor"));
            if (!open.ok || !ordinary.ok)
                throw new Error("expected resolutions");
            expect(open.packet.provenance?.visibility).toBe(ordinary.packet.provenance?.visibility);
        }
    });
    it("uses the same seeded exposure finding for a foreign surveillance act with no player report", () => {
        const base = boardWithThirdParties();
        const req = { actor: TARGET, target: ACTOR, instrument: "covert", rung: 1 };
        const samples = [];
        for (let index = 0; index < 300 && new Set(samples.map((sample) => sample.exposed)).size < 2; index += 1) {
            const before = { ...base, seed: makeCampaignSeed(`npc-watch-attribution-${index}`) };
            const exposed = foreignSurveillanceExposed({ campaign: before, actor: TARGET, target: ACTOR,
                streams: createRngStreams(before.seed) });
            const result = resolveAction(before, req, createRngStreams(before.seed), "simulate");
            if (!result.ok || !result.success)
                continue;
            expect(result.packet.effects.some((effect) => effect.kind === "intelligence")).toBe(false);
            samples.push({ exposed, before, after: apply(before, result.packet) });
        }
        const hidden = samples.find((sample) => !sample.exposed);
        const exposed = samples.find((sample) => sample.exposed);
        expect(hidden).toBeDefined();
        expect(exposed).toBeDefined();
        expect(selectRelationship(hidden.after, ACTOR, TARGET).trust).toBe(selectRelationship(hidden.before, ACTOR, TARGET).trust);
        expect(Object.keys(hidden.after.player.flags).filter((flag) => flag.startsWith("deed-received:") || flag.startsWith("deed-from:")))
            .toEqual(Object.keys(hidden.before.player.flags).filter((flag) => flag.startsWith("deed-received:") || flag.startsWith("deed-from:")));
        expect(exposed.after.player.flags[`deed-from:${TARGET}:covert:low:landed`]).toBe(true);
        expect(selectRelationship(exposed.after, ACTOR, TARGET).trust).toBeCloseTo(selectRelationship(exposed.before, ACTOR, TARGET).trust - 0.03);
    });
});
describe("every action goes through the resolver", () => {
    it("carries an NPC's first-strike betrayal through the shared action packet", () => {
        const base = boardWithThirdParties();
        const campaign = { ...base, relationships: { ...base.relationships,
                [relationshipKey(ACTOR, TARGET)]: rel(ACTOR, TARGET, { trust: 0.8 }),
            } };
        const resolved = landRung(campaign, TARGET, ACTOR, "military", 4, streamsFor("npc-strike-packet"), "simulate");
        if (!resolved.ok)
            throw new Error(resolved.missingCapability);
        const after = apply(campaign, resolved.packet);
        expect(selectRelationship(after, ACTOR, TARGET).trust).toBeLessThan(0.8);
        expect(selectRelationship(after, ACTOR, TARGET).history.filter((entry) => entry.kind === "betrayal")).toHaveLength(1);
    });
    it("produces an appliable EffectPacket for every gated rung of every instrument", () => {
        const campaign = boardWithThirdParties();
        let resolvedCount = 0;
        for (const instrument of INSTRUMENT_IDS) {
            for (const rung of RUNG_LEVELS) {
                const resolved = resolveAction(campaign, request(instrument, rung), streamsFor(`all-${instrument}-${rung}`));
                if (!resolved.ok)
                    continue;
                resolvedCount++;
                expect(resolved.packet.narration.summary.trim()).not.toBe("");
                expect(() => apply(campaign, resolved.packet)).not.toThrow();
            }
        }
        expect(resolvedCount).toBeGreaterThan(0);
    });
    it("records the action on the ledger with the metric movement it caused", () => {
        const campaign = boardWithThirdParties();
        const resolved = resolveAction(campaign, request("economic", 3), streamsFor("ledger"));
        if (!resolved.ok)
            throw new Error("expected a resolution");
        const after = apply(campaign, resolved.packet);
        const entry = after.ledger[after.ledger.length - 1];
        expect(entry.turn).toBe(campaign.turn);
        expect(entry.cost?.treasury).toBeLessThan(0);
    });
});
// Money and standing belong to the administration, and a metric effect is not
// addressed to a nation, so an unguarded packet built for a foreign capital
// spends the player's treasury on that capital's decision.
describe("whose panel an action is charged to", () => {
    it("charges the player for the player's own move", () => {
        const campaign = boardWithThirdParties();
        const resolved = resolveAction(campaign, request("diplomatic", 3), streamsFor("charge-player"));
        if (!resolved.ok)
            throw new Error("expected a resolution");
        const after = apply(campaign, resolved.packet);
        expect(after.player.metrics.treasury).toBeLessThan(campaign.player.metrics.treasury);
    });
    it("charges the player nothing for a move some other capital made", () => {
        const base = boardWithThirdParties();
        const campaign = {
            ...base,
            relationships: { ...base.relationships, [relationshipKey(nid(TARGET), nid(ACTOR))]: rel(TARGET, ACTOR) },
        };
        const resolved = resolveAction(campaign, { actor: nid(TARGET), target: nid(ACTOR), instrument: "diplomatic", rung: 3 }, streamsFor("charge-npc"), "simulate");
        if (!resolved.ok)
            throw new Error("expected a resolution");
        const after = apply(campaign, resolved.packet);
        expect(after.player.metrics.treasury).toBe(campaign.player.metrics.treasury);
        expect(after.player.metrics.standing).toBe(campaign.player.metrics.standing);
        // The world still moved: the act reached the graph, it just did not reach
        // the player's accounts.
        expect(after.relationships).not.toEqual(campaign.relationships);
    });
});
// The act itself has to leave a record content can read. A packet that states
// the instrument, the rung, the target and the outcome and nothing else can
// only be gated on by an authored consequence card that happens to be drawn,
// which leaves a military rung 4 that landed answerable by nothing and makes
// the game's largest moves the ones the corpus is blindest to.
describe("the record an act leaves for content to answer", () => {
    const marker = (flag, turn) => `flagset:${flag}:${turn}`;
    // The failure half of the coin `landRung` pins: a draw above every reachable
    // success chance, so the branch under test is the one named rather than the
    // one the seed happened to draw.
    const alwaysFails = (streams) => ({
        stream(...keyParts) {
            const real = streams.stream(...keyParts);
            return keyParts[0] === "resolution" ? { ...real, next: () => 0.999 } : real;
        },
    });
    const flagsSet = (packet) => packet.effects.flatMap((effect) => (effect.kind === "flag" ? (effect.set ?? []) : []));
    it("stamps a landed act unbound for content and bound for the engine, each with its marker", () => {
        const campaign = boardWithThirdParties();
        const resolved = landRung(campaign, nid(ACTOR), nid(TARGET), "military", 4, streamsFor("deed-landed"));
        if (!resolved.ok)
            throw new Error("expected a resolution");
        expect(resolved.packet.commitment).toEqual({ instrument: "military", rung: 4, target: TARGET, landed: true });
        expect(flagsSet(resolved.packet)).toEqual(expect.arrayContaining([
            "deed:military:high:landed",
            `deed-toward:${TARGET}:military:high:landed`,
            marker("deed:military:high:landed", campaign.turn),
            marker(`deed-toward:${TARGET}:military:high:landed`, campaign.turn),
        ]));
    });
    it("says an act failed rather than saying nothing, because a failure is a thing that happened too", () => {
        const campaign = boardWithThirdParties();
        const resolved = resolveAction(campaign, request("military", 4), alwaysFails(streamsFor("deed-failed")));
        if (!resolved.ok)
            throw new Error("expected a resolution");
        expect(resolved.success).toBe(false);
        expect(flagsSet(resolved.packet)).toContain("deed:military:high:failed");
        expect(flagsSet(resolved.packet)).not.toContain("deed:military:high:landed");
    });
    it("bands the rung the way consequence cards are already banded, so a démarche is not a strike", () => {
        const campaign = boardWithThirdParties();
        const bands = [
            [1, "low"],
            [3, "mid"],
            [5, "high"],
        ];
        for (const [rung, band] of bands) {
            const resolved = landRung(campaign, nid(ACTOR), nid(TARGET), "diplomatic", rung, streamsFor(`deed-band-${rung}`));
            if (!resolved.ok)
                throw new Error("expected a resolution");
            expect(flagsSet(resolved.packet)).toContain(`deed:diplomatic:${band}:landed`);
        }
    });
    // Being acted on is a different fact from acting, and the record used to
    // state both with one string: `deed:covert:mid:landed` said an operation of
    // that weight happened without saying at whose hand, and the bound flag
    // named the player — its own file recording that something was done to it by
    // somebody unnamed.
    const npcActsOnPlayer = (seed, instrument, rung) => {
        const base = boardWithThirdParties();
        const campaign = {
            ...base,
            relationships: { ...base.relationships, [relationshipKey(nid(TARGET), nid(ACTOR))]: rel(TARGET, ACTOR) },
        };
        const resolved = resolveAction(campaign, { actor: nid(TARGET), target: nid(ACTOR), instrument, rung }, streamsFor(seed), "simulate");
        if (!resolved.ok)
            throw new Error("expected a resolution");
        return resolved;
    };
    it("records what some other capital did to the player, so content can answer having been acted on", () => {
        const resolved = npcActsOnPlayer("deed-npc-toward-player", "diplomatic", 3);
        const outcome = resolved.success ? "landed" : "failed";
        const set = flagsSet(resolved.packet);
        expect(set).toContain(`deed-received:diplomatic:mid:${outcome}`);
        expect(set).toContain(`deed-from:${TARGET}:diplomatic:mid:${outcome}`);
    });
    it("names the capital that acted, not the player, so an act can be answered to whoever took it", () => {
        const resolved = npcActsOnPlayer("deed-npc-names-actor", "diplomatic", 3);
        const bound = flagsSet(resolved.packet).filter((flag) => flag.startsWith("deed-from:"));
        expect(bound).not.toEqual([]);
        for (const flag of bound)
            expect(flag.split(":")[1]).toBe(TARGET);
        // The player's own id never appears in the nation slot of its own record.
        expect(flagsSet(resolved.packet).filter((flag) => flag.includes("deed") && flag.includes(`:${ACTOR}:`))).toEqual([]);
    });
    it("tells an act the player took from the same act taken on the player", () => {
        const campaign = boardWithThirdParties();
        const mine = landRung(campaign, nid(ACTOR), nid(TARGET), "covert", 3, streamsFor("deed-agency-mine"));
        if (!mine.ok)
            throw new Error("expected a resolution");
        const theirs = npcActsOnPlayer("deed-agency-theirs", "covert", 3);
        const deedsOf = (packet) => flagsSet(packet).filter((flag) => !flag.startsWith("flagset:"));
        expect(deedsOf(mine.packet)).toContain("deed:covert:mid:landed");
        expect(deedsOf(theirs.packet)).not.toContain(`deed:covert:mid:${theirs.success ? "landed" : "failed"}`);
        // Same instrument, same band, opposite agency: no string is shared.
        expect(deedsOf(mine.packet).filter((flag) => deedsOf(theirs.packet).includes(flag))).toEqual([]);
    });
    it("records nothing about two foreign capitals, whose business the player was never shown", () => {
        const base = boardWithThirdParties();
        const campaign = {
            ...base,
            relationships: {
                ...base.relationships,
                [relationshipKey(nid("ALY"), nid("BLC"))]: rel("ALY", "BLC"),
                [relationshipKey(nid("BLC"), nid("ALY"))]: rel("BLC", "ALY"),
            },
        };
        const resolved = resolveAction(campaign, { actor: nid("ALY"), target: nid("BLC"), instrument: "diplomatic", rung: 3 }, streamsFor("deed-npc-on-npc"), "simulate");
        if (!resolved.ok)
            throw new Error("expected a resolution");
        expect(flagsSet(resolved.packet).filter((flag) => flag.startsWith("deed"))).toEqual([]);
        expect(flagsSet(resolved.packet).filter((flag) => flag.includes("deed"))).toEqual([]);
    });
    it("is a fact, not a tally: the same act applied twice leaves the same record", () => {
        const campaign = boardWithThirdParties();
        const resolved = landRung(campaign, nid(ACTOR), nid(TARGET), "economic", 3, streamsFor("deed-idempotent"));
        if (!resolved.ok)
            throw new Error("expected a resolution");
        const once = apply(campaign, resolved.packet);
        const twice = apply(once, resolved.packet);
        expect(twice.player.flags).toEqual(once.player.flags);
        expect(once.player.flags["deed:economic:mid:landed"]).toBe(true);
        expect(once.player.flags[marker("deed:economic:mid:landed", campaign.turn)]).toBe(true);
    });
});
describe("repeatDrag reaches the resolution path", () => {
    const request = { actor: ACTOR, target: TARGET, instrument: "diplomatic", rung: 1 };
    // Same board, same request, differing only in whether a prior "Private
    // Warning" is already on relationship.history within repeatDrag's lookback
    // window. If this test is proving anything real, the only thing that may
    // differ between the two projections is the number repeatDrag contributes
    // to resistance() — everything else about the board is identical.
    function campaignAtTurn(turn, priorDemarcheTurn) {
        const base = buildCampaign();
        const key = relationshipKey(ACTOR, TARGET);
        const history = priorDemarcheTurn === undefined
            ? []
            : [{ turn: priorDemarcheTurn, kind: "demarche", description: "a quiet warning" }];
        return {
            ...base,
            turn,
            relationships: { ...base.relationships, [key]: { ...base.relationships[key], history } },
        };
    }
    it("makes a second démarche against the same target measurably harder to land than the first, through projectAction", () => {
        const firstAttempt = campaignAtTurn(1);
        const secondAttempt = campaignAtTurn(2, 1);
        const first = projectAction(firstAttempt, request, streamsFor("repeat-drag-live"));
        const second = projectAction(secondAttempt, request, streamsFor("repeat-drag-live"));
        if (!first.ok || !second.ok)
            throw new Error("expected both projections to be available");
        expect(second.projection.successChance).toBeLessThan(first.projection.successChance);
    });
    it("makes a second démarche measurably harder to resolve, through resolveAction itself, not only through projectAction", () => {
        // resolveAction runs its own projection internally before drawing against
        // it; this proves the drag reaches that internal projection too, not just
        // the one a caller might request separately.
        const firstAttempt = campaignAtTurn(1);
        const secondAttempt = campaignAtTurn(2, 1);
        const resolvedFirst = resolveAction(firstAttempt, request, streamsFor("repeat-drag-resolve"), "simulate");
        const resolvedSecond = resolveAction(secondAttempt, request, streamsFor("repeat-drag-resolve"), "simulate");
        if (!resolvedFirst.ok || !resolvedSecond.ok)
            throw new Error("expected both resolutions");
        expect(resolvedSecond.projection.successChance).toBeLessThan(resolvedFirst.projection.successChance);
    });
    it("does not move the projection for an instrument the ladder does not yet stamp a repeat kind for", () => {
        const noHistory = campaignAtTurn(1);
        const withPriorAct = {
            ...noHistory,
            turn: 2,
            relationships: {
                ...noHistory.relationships,
                [relationshipKey(ACTOR, TARGET)]: {
                    ...noHistory.relationships[relationshipKey(ACTOR, TARGET)],
                    history: [{ turn: 1, kind: "failed-market-blowback", description: "a levy went wrong" }],
                },
            },
        };
        const economicRequest = { actor: ACTOR, target: TARGET, instrument: "economic", rung: 1 };
        const first = projectAction(noHistory, economicRequest, streamsFor("repeat-drag-inert"));
        const second = projectAction(withPriorAct, economicRequest, streamsFor("repeat-drag-inert"));
        if (!first.ok || !second.ok)
            throw new Error("expected both projections to be available");
        expect(second.projection.successChance).toBe(first.projection.successChance);
    });
});
