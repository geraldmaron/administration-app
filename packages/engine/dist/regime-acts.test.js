import { describe, expect, it } from "vitest";
import { worldDataset } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { coupTerms } from "./foreign-politics.js";
import { declaresDeliverableArsenal } from "./instrument-gates.js";
import { exposureChance, exposureEffects, exposureScandalFlag, nuclearArmed, operationsWeek, politicalActionPressure, sponsoredCoupTerm, } from "./regime-acts.js";
import { REGIME_DIALS } from "./regime-dials.js";
import { coercionClaims, NPC_REGIME_OPERATIONS } from "./coercion-tempo.js";
import { firstTempoRefusal } from "./npc-tempo.js";
import { captureRefusal, indictRefusal, lethalGround, lethalRefusal, regimeActGate, regimeActResolve } from "./regime-rung.js";
import { openIndictment, selectIndictments } from "./regime-acts.js";
import { apply } from "./effects.js";
import { signFinding } from "./findings.js";
import { openPursuit } from "./pursuits.js";
import { treatyAllyOf } from "./article-ties.js";
import { createRngStreams } from "./rng.js";
const US = "USA";
function firstTarget(campaign, predicate) {
    const id = Object.keys(campaign.nations).find((nation) => nation !== US && predicate(nation));
    if (!id)
        throw new Error("no target on the fixture board");
    return id;
}
function withOperation(campaign, op) {
    const full = { id: `regime:${op.act}:test`, sponsor: US, startedTurn: campaign.turn, status: "running", ...op };
    return { ...campaign, regimeOperations: { operations: [...(campaign.regimeOperations?.operations ?? []), full] } };
}
function withStability(campaign, nation, regimeStability) {
    const runtime = campaign.nations[nation];
    return { ...campaign, nations: { ...campaign.nations, [nation]: { ...runtime, stats: { ...runtime.stats, politics: { ...runtime.stats.politics, regimeStability } } } } };
}
function ctxFor(campaign, actor, target, regimeAct) {
    return { campaign, actor, target, streams: createRngStreams(campaign.seed), ...(regimeAct ? { regimeAct } : {}) };
}
function withFinding(campaign, nation) {
    const signed = signFinding(campaign, "Support the opposition inside the country.", nation, "written", "full-committees");
    if (!signed.ok)
        throw new Error(signed.reason);
    const sign = signed.packet.effects.flatMap((entry) => (entry.kind === "finding" && "sign" in entry && entry.sign ? [entry.sign] : []))[0];
    if (!sign)
        throw new Error("no finding signed");
    const covert = campaign.security.covert;
    return { ...campaign, security: { ...campaign.security, covert: { ...covert, findings: [...covert.findings, sign] } } };
}
function withThreat(campaign, nation) {
    const pursuit = { ...openPursuit(nation, US, "security", campaign.turn, "military", 4, "test"), commitment: 0.8 };
    return { ...campaign, pursuits: { ...campaign.pursuits, [pursuit.id]: pursuit } };
}
const base = foundedForBalance("regime-acts").campaign;
const target = firstTarget(base, (id) => !nuclearArmed(base, id) && !treatyAllyOf(base, US, id));
describe("a sponsored coup", () => {
    it("adds nothing where no operation runs, and a decaying term where one does", () => {
        const shaky = withStability(base, target, 0.3);
        expect(sponsoredCoupTerm(shaky, target, 1, 0.85)).toBe(0);
        const backed = withOperation(shaky, { act: "coup-support", target });
        const fresh = sponsoredCoupTerm(backed, target, 1, 0.85);
        expect(fresh).toBeGreaterThan(0);
        const later = { ...backed, turn: backed.turn + REGIME_DIALS.coupSupportHalfLifeWeeks };
        expect(sponsoredCoupTerm(later, target, 1, 0.85)).toBeCloseTo(fresh / 2, 9);
    });
    it("reaches past the stability ceiling, where an unaided coup is off the table", () => {
        const steady = withOperation(withStability(base, target, 0.6), { act: "coup-support", target });
        const terms = coupTerms(steady, target, steady.nations[target], undefined);
        expect(terms.find((term) => term.key === "regime-survival").value).toBe(0);
        expect(sponsoredCoupTerm(steady, target, 1, 0.85)).toBeGreaterThan(0);
    });
    it("gives a sponsor nothing to work with in a country at full order", () => {
        const solid = withOperation(withStability(base, target, 1), { act: "coup-support", target });
        expect(sponsoredCoupTerm(solid, target, 1, 0.85)).toBe(0);
    });
});
describe("political action", () => {
    it("lowers the sitting government's hold on its next selection and raises its parliament's impatience", () => {
        expect(politicalActionPressure(base, target)).toEqual({ standingPull: 0, confidenceLift: 1 });
        const pressed = politicalActionPressure(withOperation(base, { act: "political-action", target }), target);
        expect(pressed.standingPull).toBeCloseTo(REGIME_DIALS.politicalActionStandingPull, 9);
        expect(pressed.confidenceLift).toBeCloseTo(REGIME_DIALS.politicalActionConfidenceLift, 9);
    });
});
describe("exposure", () => {
    it("opens a story when the President's own operation comes out, and only then", () => {
        const op = { id: "regime:coup-support:x", act: "coup-support", sponsor: US, target, startedTurn: base.turn, status: "running" };
        const flags = exposureEffects(base, op).filter((effect) => effect.kind === "flag");
        expect(JSON.stringify(flags)).toContain(exposureScandalFlag(op));
        const foreign = { ...op, sponsor: target, target: US };
        expect(exposureEffects(base, foreign).some((effect) => effect.kind === "flag")).toBe(false);
    });
    it("is likelier for a coup than for political action, which leaves half the footprint", () => {
        const coup = { id: "a", act: "coup-support", sponsor: US, target, startedTurn: 1, status: "running" };
        expect(exposureChance(base, coup)).toBeCloseTo(2 * exposureChance(base, { ...coup, act: "political-action" }), 12);
    });
    it("lets an unexposed operation lapse after its term", () => {
        const old = withOperation(base, { act: "political-action", target, startedTurn: base.turn - REGIME_DIALS.operationWeeks });
        const packets = operationsWeek(old);
        const statuses = packets.flatMap((packet) => packet.effects).filter((effect) => effect.kind === "regime").map((effect) => effect.upsert.status);
        expect(statuses.length).toBe(1);
        expect(["lapsed", "exposed"]).toContain(statuses[0]);
    });
});
describe("who may be targeted, and how", () => {
    it("refuses a government that declares an arsenal it can deliver", () => {
        const armed = firstTarget(base, (id) => nuclearArmed(base, id));
        expect(regimeActGate(ctxFor(withFinding(base, armed), US, armed)).ok).toBe(false);
        expect(regimeActGate(ctxFor(withFinding(base, target), US, target)).ok).toBe(true);
    });
    it("offers the lethal variant only in an armed conflict or against an imminent threat", () => {
        const found = withFinding(base, target);
        expect(lethalRefusal(found, US, target)).toMatch(/armed conflict/);
        expect(regimeActGate(ctxFor(found, US, target, "kill")).ok).toBe(false);
        const threatened = withThreat(found, target);
        expect(lethalRefusal(threatened, US, target)).toBeUndefined();
        expect(regimeActGate(ctxFor(threatened, US, target, "kill")).ok).toBe(true);
        expect(regimeActGate(ctxFor(withThreat(base, target), US, target, "kill")).ok).toBe(false);
    });
    it("never offers the lethal variant against a treaty ally", () => {
        const threatened = withThreat(withFinding(base, target), target);
        const key = `${US}:${target}`;
        const defensePact = worldDataset.organizations.find((org) => org.kind === "defense").id;
        const allied = { ...threatened, relationships: { ...threatened.relationships, [key]: { ...threatened.relationships[key], treaties: [defensePact] } } };
        expect(lethalRefusal(allied, US, target)).toBeDefined();
    });
    it("holds other governments to the term's cap and the pair's cooldown on the shared tempo ledger", () => {
        const sponsor = firstTarget(base, (id) => id !== target && !nuclearArmed(base, id));
        const request = { actor: sponsor, target, instrument: "covert", rung: 5 };
        expect(firstTempoRefusal(base, coercionClaims(base, request))).toBeUndefined();
        const entry = (key) => ({ family: NPC_REGIME_OPERATIONS.id, key, actor: sponsor, turn: base.turn, keepUntil: base.turn + 208 });
        const recent = { ...base, npcTempo: [entry(`${sponsor}>${target}`)] };
        expect(firstTempoRefusal(recent, coercionClaims(recent, request))).toBeDefined();
        const capped = { ...base, npcTempo: Array.from({ length: NPC_REGIME_OPERATIONS.perTerm }, (_, i) => entry(`X${i}>Y${i}`)) };
        expect(firstTempoRefusal(capped, coercionClaims(capped, request))).toBeDefined();
    });
});
function indicted(campaign, nation) {
    const filed = regimeActResolve(ctxFor(campaign, US, nation, "indict")).flatMap((effect) => (effect.kind === "indictment" ? [effect.upsert] : []));
    return { ...campaign, regimeOperations: { operations: campaign.regimeOperations?.operations ?? [], indictments: filed } };
}
describe("an indictment and a capture", () => {
    it("files an indictment without a finding, tradecraft or a covert record, once per leader", () => {
        expect(regimeActGate(ctxFor(base, US, target, "indict")).ok).toBe(true);
        const filed = indicted(base, target);
        expect(openIndictment(filed, target)).toBeDefined();
        expect(indictRefusal(filed, US, target)).toMatch(/not already under an open indictment/);
        expect(regimeActGate(ctxFor(filed, US, target, "indict")).ok).toBe(false);
        expect(indictRefusal(base, target, US)).toMatch(/President's government/);
    });
    it("refuses capture with no indictment, and for any government but the President's", () => {
        expect(captureRefusal(base, US, target)).toMatch(/open federal indictment/);
        expect(regimeActGate(ctxFor(base, US, target, "capture")).ok).toBe(false);
        expect(captureRefusal(indicted(base, target), target, US)).toMatch(/President's government/);
        expect(captureRefusal(indicted(base, target), US, target)).toBeUndefined();
    });
    it("is reachable: some indicted leader clears the whole force gate", () => {
        const reachable = Object.keys(base.nations).filter((id) => id !== US && regimeActGate(ctxFor(indicted(base, id), US, id, "capture")).ok);
        expect(reachable.length).toBeGreaterThan(0);
    });
    it("serves the indictment, opens the war powers record and leaves no covert record", () => {
        const filed = indicted(base, target);
        const effects = regimeActResolve(ctxFor(filed, US, target, "capture"));
        expect(effects.some((effect) => effect.kind === "indictment" && effect.upsert.servedTurn === filed.turn)).toBe(true);
        expect(effects.some((effect) => effect.kind === "regime")).toBe(true);
        expect(effects.some((effect) => effect.kind === "leadership" || effect.kind === "person")).toBe(true);
        expect(JSON.stringify(effects)).toMatch(/forces introduced into hostilities/);
        expect(JSON.stringify(effects)).not.toMatch(/Covert action|unfounded/);
        const after = apply(filed, { source: "action", actor: "player", turn: filed.turn, narration: { summary: "test" }, effects });
        expect(openIndictment(after, target)).toBeUndefined();
        expect(selectIndictments(after)).toHaveLength(1);
    });
    it("names counsel's ground for a lethal operation", () => {
        expect(lethalGround(base, US, target)).toBeUndefined();
        expect(lethalGround(withThreat(base, target), US, target)).toBe("imminent-threat");
    });
});
describe("removing a leader", () => {
    it("seats the charter's successor through the existing succession", () => {
        const effects = regimeActResolve(ctxFor(withFinding(withThreat(base, target), target), US, target, "kill"));
        expect(effects.some((effect) => effect.kind === "regime")).toBe(true);
        expect(effects.some((effect) => effect.kind === "leadership" || effect.kind === "person")).toBe(true);
    });
});
describe("an undeclared arsenal", () => {
    const { campaign } = foundedForBalance("regime-undeclared");
    const israel = "ISR";
    const withArsenal = (declared) => {
        const runtime = campaign.nations[israel];
        const arsenal = { ...runtime.stats.military.arsenal, warheads: 90, deliveryTriad: true, declared };
        const stats = { ...runtime.stats, military: { ...runtime.stats.military, arsenal } };
        return { ...campaign, nations: { ...campaign.nations, [israel]: { ...runtime, stats } } };
    };
    it("leaves a government that has never declared its warheads open to operations against its hold on power", () => {
        expect(nuclearArmed(withArsenal(false), israel)).toBe(false);
        // The dataset's own Israel: warheads and a means to deliver them, never declared.
        expect(campaign.nations[israel].stats.military.arsenal.warheads).toBeGreaterThan(0);
        expect(nuclearArmed(campaign, israel)).toBe(false);
    });
    it("refuses the same government once it declares them, the test force applies", () => {
        expect(nuclearArmed(withArsenal(true), israel)).toBe(true);
        expect(declaresDeliverableArsenal(withArsenal(true).nations[israel].stats.military.arsenal)).toBe(true);
        expect(declaresDeliverableArsenal(withArsenal(false).nations[israel].stats.military.arsenal)).toBe(false);
    });
});
