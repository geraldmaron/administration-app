import { describe, expect, it, vi } from "vitest";
import { Relationship } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { createRngStreams } from "./rng.js";
import { relationshipKey, selectRelationship } from "./state.js";
import { addDays } from "./clock.js";
import { campaignDay } from "./nomination.js";
import { apply } from "./effects.js";
import { ENGAGEMENT_BOUND, ENGAGEMENT_KINDS, ENGAGEMENT_TERMS, ENVOY_WEIGHT, engagementAvailable, engagementCandidates, engagementHold, engagementPacket, projectEngagement, projectReceive, receiveDecision, receivePreview, warmthScale, } from "./engagement.js";
import { envoyBenchLean, envoyLean, presidentRapport, secretaryOfState, STATE_BENCH_HALF_SPREAD, VACANT_BENCH_LEAN, } from "./treaty-counterpart.js";
import { foundedForBalance } from "./balance-harness.js";
import { foreignLeaderFor } from "./foreign-leader.js";
import { QUESTION_TERMS, willDraw } from "./willingness.js";
// A pass-through spy, so a test can prove a projection never reaches the one draw.
vi.mock("./willingness.js", async (original) => {
    const actual = await original();
    return { ...actual, willDraw: vi.fn(actual.willDraw) };
});
import { decideNpcAction } from "./npc-agent.js";
import { engagementTurn } from "./npc-turn.js";
// One priced path for the President and every other government: what the
// projection promises is what a received engagement writes, the receiving
// government decides through the willingness model, and no step is larger than
// the family's bound.
const USA = nationA.id;
const ALP = nationB.id;
function paired(overrides = {}) {
    const base = buildCampaign();
    const edge = (from, to) => Relationship.parse({
        from,
        to,
        trust: 0.4,
        alignment: 0.2,
        tension: 0.35,
        tradeDependence: 0.3,
        militaryThreat: 0.1,
        treaties: [],
        grudges: [],
        history: [],
        ...overrides,
    });
    return {
        ...base,
        relationships: { [relationshipKey(USA, ALP)]: edge(USA, ALP), [relationshipKey(ALP, USA)]: edge(ALP, USA) },
    };
}
const streams = (campaign) => createRngStreams(campaign.seed);
describe("the engagement family", () => {
    it("weighs only a fresh disclosed warning aimed at the recipient when receiving an envoy", () => {
        const base = paired();
        const request = { actor: USA, target: ALP, kind: "envoy" };
        const day = campaignDay(base);
        const finding = { topic: "external-intent", observation: "Pressure against the recipient is assessed.",
            source: "dated government activity", asOfDay: day,
            basis: { kind: "pursuit", id: "pursuit:warning", target: ALP, overt: false, lastActedTurn: base.turn } };
        const report = { id: "report:warning", tasking: "task:warning", element: "IC-CIA", discipline: "all-source",
            targetKind: "foreign-nation", target: "BEE", question: "What pressure is under way?", day, date: base.calendar,
            weight: 0.7, summary: "A warning was filed.", status: "findings", confidence: "high",
            findings: [finding], gaps: ["The next move is unknown."] };
        const share = { id: "share:warning", reportId: report.id, recipient: ALP, day, date: base.calendar,
            report, disclosedFindingIndexes: [0] };
        const withShare = (receipt, campaign = base) => ({ ...campaign, security: { ...campaign.security,
                intelligence: { ...campaign.security.intelligence, shares: [receipt] } } });
        const plain = projectReceive(base, request).score;
        expect(projectReceive(withShare(share), request).score).toBeCloseTo(plain + 0.05, 4);
        expect(selectRelationship(withShare(share), ALP, USA)?.trust).toBe(selectRelationship(base, ALP, USA)?.trust);
        expect(projectReceive(withShare({ ...share, report: { ...report, findings: [] } }), request).score).toBe(plain);
        expect(projectReceive(withShare({ ...share, report: { ...report, findings: [{ ...finding, basis: { ...finding.basis, target: USA } }] } }), request).score).toBe(plain);
        expect(projectReceive(withShare({ ...share, report: { ...report, confidence: "low" } }), request).score).toBe(plain);
        expect(projectReceive(withShare(share, { ...base, calendar: addDays(base.calendar, 29) }), request).score).toBe(plain);
        expect(projectReceive(withShare(share), { ...request, kind: "call" }).score).toBe(projectReceive(base, { ...request, kind: "call" }).score);
    });
    it("writes exactly what the projection promised when the other side receives it", () => {
        const campaign = paired();
        const request = { actor: USA, target: ALP, kind: "call" };
        const projection = projectEngagement(campaign, request);
        const made = engagementPacket(campaign, request, streams(campaign));
        expect(made.ok && made.received).toBe(true);
        if (!made.ok)
            return;
        expect(made.packet.effects.filter((effect) => effect.kind === "relationship")).toEqual(projection.effects);
    });
    it("moves trust up and tension down on both edges, never by more than the bound", () => {
        for (const kind of ENGAGEMENT_KINDS) {
            const { warmth } = ENGAGEMENT_TERMS[kind];
            expect(warmth.trust, kind).toBeGreaterThanOrEqual(0);
            expect(warmth.alignment, kind).toBeGreaterThanOrEqual(0);
            expect(warmth.tension, kind).toBeLessThanOrEqual(0);
            for (const value of Object.values(warmth))
                expect(Math.abs(value), kind).toBeLessThanOrEqual(ENGAGEMENT_BOUND);
        }
        const campaign = paired();
        const made = engagementPacket(campaign, { actor: USA, target: ALP, kind: "summit" }, streams(campaign));
        if (!made.ok || !made.received)
            throw new Error("a summit between tense friends should be received");
        const after = apply(campaign, made.packet);
        for (const [from, to] of [[USA, ALP], [ALP, USA]]) {
            const before = selectRelationship(campaign, from, to);
            const moved = selectRelationship(after, from, to);
            expect(moved.trust - before.trust).toBeGreaterThan(0);
            expect(moved.tension - before.tension).toBeLessThan(0);
            expect(Math.abs(moved.tension - before.tension)).toBeLessThanOrEqual(ENGAGEMENT_BOUND);
        }
    });
    it("stamps the receiving government's decision on the packet", () => {
        const campaign = paired();
        const made = engagementPacket(campaign, { actor: USA, target: ALP, kind: "envoy" }, streams(campaign));
        if (!made.ok)
            throw new Error(made.reason);
        const decision = made.packet.provenance?.decision;
        expect(decision?.question).toBe("receive-engagement");
        expect(decision?.actor).toBe(ALP);
        expect(decision?.subject).toBe(USA);
        expect(decision?.acts).toBe(made.received);
    });
    it("answers the same offer the same way every time it is asked, and moves only with its terms", () => {
        const campaign = paired();
        const request = { actor: USA, target: ALP, kind: "visit" };
        expect(receiveDecision(campaign, request, streams(campaign))).toEqual(receiveDecision(campaign, request, streams(campaign)));
        const cold = paired({ trust: 0, tension: 0.9 });
        expect(receiveDecision(cold, request, streams(cold)).score).toBeLessThan(receiveDecision(campaign, request, streams(campaign)).score);
    });
    it("files only the refusal when the other side declines", () => {
        const campaign = paired({ trust: -0.6, tension: 0.9 });
        const made = engagementPacket(campaign, { actor: USA, target: ALP, kind: "summit" }, streams(campaign));
        if (!made.ok)
            throw new Error(made.reason);
        expect(made.received).toBe(false);
        const relational = made.packet.effects.filter((effect) => effect.kind === "relationship");
        expect(relational).toHaveLength(1);
        expect(relational[0]).toMatchObject({ addHistory: { kind: "engagement-summit-declined" } });
    });
    it("keeps a kind off the table until its cooldown has run", () => {
        const campaign = paired();
        const request = { actor: USA, target: ALP, kind: "call" };
        const made = engagementPacket(campaign, request, streams(campaign));
        if (!made.ok)
            throw new Error(made.reason);
        const after = apply(campaign, made.packet);
        expect(engagementAvailable(after, request)).toBe(false);
        expect(engagementHold(after, request)).toEqual({ kind: "cooldown", weeksLeft: ENGAGEMENT_TERMS.call.cooldownWeeks });
        expect(engagementHold({ ...after, turn: after.turn + 1 }, request)).toEqual({ kind: "cooldown", weeksLeft: ENGAGEMENT_TERMS.call.cooldownWeeks - 1 });
        expect(engagementAvailable({ ...after, turn: after.turn + ENGAGEMENT_TERMS.call.cooldownWeeks }, request)).toBe(true);
    });
    it("names the gate that keeps a visit or a declaration off the table", () => {
        const campaign = paired({ trust: -0.2 });
        expect(engagementHold(campaign, { actor: USA, target: ALP, kind: "visit" })).toMatchObject({ kind: "host-distrusts", need: 0 });
        expect(engagementHold(campaign, { actor: USA, target: ALP, kind: "declaration" })).toMatchObject({ kind: "too-little-trust", need: 0.3 });
        expect(engagementHold(campaign, { actor: USA, target: ALP, kind: "call" })).toBeUndefined();
        expect(engagementHold(campaign, { actor: USA, target: USA, kind: "call" })).toEqual({ kind: "no-relationship" });
    });
    it("puts no state visit on the table to a capital that distrusts the visitor, and no joint declaration without trust both ways", () => {
        const campaign = paired({ trust: -0.2 });
        const kinds = engagementCandidates(campaign, USA).map((request) => request.kind);
        expect(kinds).not.toContain("visit");
        expect(kinds).not.toContain("declaration");
        expect(kinds).toContain("call");
    });
    it("lets a government choose an engagement in the same argmax as a coercive move, without walking its ripples", () => {
        // No grievance, no sourced rivalry, no named interest: the agent has nothing
        // to coerce over, so the only moves it weighs against the President are
        // assistance and the engagements.
        const campaign = paired({ trust: 0.6, tension: 0.35 });
        const decision = decideNpcAction(campaign, ALP, streams(campaign));
        expect(decision.ranked.every((candidate) => candidate.request.instrument === "assistance")).toBe(true);
        if (decision.engaged) {
            expect(decision.chosen).toBeUndefined();
            const packet = engagementTurn(campaign, decision, streams(campaign));
            expect(packet.provenance?.decision?.question).toBe("npc-act");
            expect(packet.provenance?.decision?.actor).toBe(ALP);
        }
    });
});
// --- The people at the table: the Secretary of State's hand and the leaders' rapport ---
const STATE = "role-foreign-minister";
const GBR = "GBR";
const world = foundedForBalance("ws-b-engagement").campaign;
function withSecretary(campaign, base) {
    const id = campaign.player.cabinet[STATE];
    const runtime = campaign.people[id];
    return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ...base } } } };
}
/** The State Department with nobody confirmed and nobody acting. */
function withoutSecretary(campaign) {
    const cabinet = Object.fromEntries(Object.entries(campaign.player.cabinet).filter(([role]) => role !== STATE));
    const actings = Object.fromEntries(Object.entries(campaign.actings ?? {}).filter(([seat]) => seat !== STATE));
    return { ...campaign, player: { ...campaign.player, cabinet: cabinet }, actings };
}
const skilled = (campaign) => withSecretary(campaign, { charisma: 0.95, competence: 0.95, integrity: 0.9, traits: ["charismatic"] });
const clumsy = (campaign) => withSecretary(campaign, { charisma: 0.15, competence: 0.3, integrity: 0.3, traits: ["reclusive"] });
/** A summit, a visit and a declaration all on the table with Britain: tense enough to meet, warm enough to declare. */
function opened(campaign) {
    const edge = (from, to) => ({ ...selectRelationship(campaign, from, to), trust: 0.5, tension: 0.35, history: [] });
    return {
        ...campaign,
        relationships: {
            ...campaign.relationships,
            [relationshipKey(USA_REAL, GBR)]: edge(USA_REAL, GBR),
            [relationshipKey(GBR, USA_REAL)]: edge(GBR, USA_REAL),
        },
    };
}
const USA_REAL = world.founding.nation;
const table = opened(world);
const ask = (kind) => ({ actor: USA_REAL, target: GBR, kind });
const termOf = (campaign, request, key) => receivePreview(campaign, request).terms.find((term) => term.key === key);
const firstDeltas = (effects) => effects[0].deltas;
describe("the Secretary of State at the table", () => {
    it("reads the seated Secretary against the bench of people who could hold the job, and an empty chair below all of them", () => {
        expect(secretaryOfState(table)?.base.id).toBe(table.player.cabinet[STATE]);
        expect(envoyBenchLean(skilled(table))).toBe(1);
        expect(envoyBenchLean(clumsy(table))).toBe(-1);
        expect(envoyBenchLean(withoutSecretary(table))).toBe(VACANT_BENCH_LEAN);
        expect(envoyLean(withoutSecretary(table))).toBeCloseTo(VACANT_BENCH_LEAN * STATE_BENCH_HALF_SPREAD, 4);
        expect(envoyLean(skilled(table))).toBeCloseTo(STATE_BENCH_HALF_SPREAD, 4);
    });
    it("weighs the envoy on the President's envoy, visit, summit and declaration, never on a call or another government's request", () => {
        for (const kind of ENGAGEMENT_KINDS) {
            const term = termOf(table, ask(kind), "envoy");
            if (ENVOY_WEIGHT[kind] === 0)
                expect(term, kind).toBeUndefined();
            else
                expect(term?.value, kind).toBeCloseTo(ENVOY_WEIGHT[kind] * envoyLean(table), 3);
        }
        const theirs = receivePreview(table, { actor: GBR, target: USA_REAL, kind: "envoy" });
        expect(theirs.terms.map((term) => term.key)).not.toContain("envoy");
        expect(theirs.terms.map((term) => term.key)).not.toContain("rapport");
    });
    it("makes a capital readier to receive a skilled Secretary's envoy and less ready for a clumsy one", () => {
        const request = ask("envoy");
        const base = projectReceive(table, request).score;
        expect(projectReceive(skilled(table), request).score).toBeGreaterThan(base);
        expect(projectReceive(clumsy(table), request).score).toBeLessThan(base);
        expect(projectReceive(withoutSecretary(table), request).score).toBeLessThan(base);
    });
    it("sizes what a received meeting does by the Secretary's craft, inside the family's bound, and writes what it showed", () => {
        for (const kind of ["envoy", "visit", "summit", "declaration"]) {
            const request = ask(kind);
            const up = projectEngagement(skilled(table), request);
            const down = projectEngagement(clumsy(table), request);
            expect(warmthScale(skilled(table), request), kind).toBeGreaterThan(1);
            expect(warmthScale(clumsy(table), request), kind).toBeLessThan(1);
            expect(firstDeltas(up.effects).trust, kind).toBeGreaterThan(firstDeltas(down.effects).trust);
            for (const effect of [...up.effects, ...down.effects]) {
                if (effect.kind !== "relationship" || !effect.deltas)
                    continue;
                for (const value of Object.values(effect.deltas))
                    expect(Math.abs(value), kind).toBeLessThanOrEqual(ENGAGEMENT_BOUND);
            }
        }
        const made = engagementPacket(skilled(table), ask("visit"), streams(table));
        if (!made.ok || !made.received)
            throw new Error("a visit to a close ally should be received");
        expect(made.packet.effects.filter((effect) => effect.kind === "relationship")).toEqual(projectEngagement(skilled(table), ask("visit")).effects);
    });
    it("makes a meeting 12% warmer or cooler across the bench and 15% cooler with nobody in the chair, and leaves a call and another government's meeting as they were", () => {
        expect(warmthScale(withoutSecretary(table), ask("visit"))).toBe(0.85);
        expect(warmthScale(clumsy(table), ask("visit"))).toBe(0.88);
        expect(warmthScale(skilled(table), ask("visit"))).toBe(1.12);
        expect(warmthScale(skilled(table), ask("call"))).toBe(1);
        const theirs = projectEngagement(skilled(table), { actor: GBR, target: USA_REAL, kind: "visit" });
        if (theirs)
            expect(firstDeltas(theirs.effects)).toEqual(ENGAGEMENT_TERMS.visit.warmth);
    });
    it("moves the envoy term and the warmth one way as the Secretary's craft rises", () => {
        const steps = [0.1, 0.3, 0.5, 0.7, 0.9].map((charisma) => withSecretary(table, { charisma, competence: charisma, traits: [] }));
        const envoy = steps.map((campaign) => termOf(campaign, ask("envoy"), "envoy").value);
        const warmth = steps.map((campaign) => firstDeltas(projectEngagement(campaign, ask("visit")).effects).trust);
        for (let i = 1; i < steps.length; i += 1) {
            expect(envoy[i]).toBeGreaterThanOrEqual(envoy[i - 1]);
            expect(warmth[i]).toBeGreaterThanOrEqual(warmth[i - 1]);
        }
        expect(envoy.at(-1)).toBeGreaterThan(envoy[0]);
        expect(warmth.at(-1)).toBeGreaterThan(warmth[0]);
    });
});
describe("rapport between the President and the leader receiving them", () => {
    const leaderId = foreignLeaderFor(table, GBR).person;
    const president = table.people[foreignLeaderFor(table, USA_REAL).person].base;
    const withLeader = (base) => {
        const runtime = table.people[leaderId];
        return { ...table, people: { ...table.people, [leaderId]: { ...runtime, base: { ...runtime.base, ...base } } } };
    };
    const kindred = withLeader({ ideology: president.ideology, traits: [...president.traits] });
    const opposed = withLeader({
        ideology: {
            economicLeftRight: -Math.sign(president.ideology.economicLeftRight || 1),
            authLibertarian: -Math.sign(president.ideology.authLibertarian || 1),
            nationalistGlobalist: -Math.sign(president.ideology.nationalistGlobalist || 1),
        },
        traits: president.traits.includes("hawkish") ? ["dovish"] : ["hawkish"],
    });
    it("is weighed as a trait, so a thin record's reason can leave it out, and pulls both ways", () => {
        const warm = termOf(kindred, ask("call"), "rapport");
        const cold = termOf(opposed, ask("call"), "rapport");
        expect(warm.source).toBe("trait");
        expect(warm.value).toBeCloseTo(0.15 * presidentRapport(kindred, GBR), 3);
        expect(warm.value).toBeGreaterThan(0);
        expect(cold.value).toBeLessThan(0);
        expect(projectReceive(kindred, ask("visit")).score).toBeGreaterThan(projectReceive(opposed, ask("visit")).score);
    });
});
describe("the receiving government's decision, with the President's people in it", () => {
    it("is the same twice and on a clone, and the projections draw nothing", () => {
        const campaign = skilled(table);
        const request = ask("envoy");
        expect(receiveDecision(campaign, request, streams(campaign))).toEqual(receiveDecision(structuredClone(campaign), request, streams(campaign)));
        vi.mocked(willDraw).mockClear();
        projectEngagement(campaign, request);
        projectReceive(campaign, request);
        receivePreview(campaign, request);
        warmthScale(campaign, request);
        expect(vi.mocked(willDraw)).not.toHaveBeenCalled();
        receiveDecision(campaign, request, streams(campaign));
        expect(vi.mocked(willDraw)).toHaveBeenCalledTimes(1);
    });
    it("stamps the envoy and the rapport on the packet, every key one the question may weigh", () => {
        const made = engagementPacket(skilled(table), ask("summit"), streams(table));
        if (!made.ok)
            throw new Error(made.reason);
        const decision = made.packet.provenance?.decision;
        if (!decision)
            throw new Error("the packet carries no decision");
        const keys = decision.terms.map((term) => term.key);
        expect(keys).toContain("envoy");
        expect(keys).toContain("rapport");
        for (const key of keys)
            expect(QUESTION_TERMS["receive-engagement"]).toContain(key);
        expect(decision.visibility).toBe("intelligence");
    });
});
