import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { auditReachability } from "./scenario-reachability.js";
import { auditScenario } from "./scenario-audit.js";
import { castBound, castStillBound, scenarioLive } from "./scenario-cast.js";
import { tradeBoards } from "./preview-board-trade.js";
import { tradeSector } from "@admin/engine";
import { readsClassState } from "./scenario-audit-premise.js";
import { PREMISE_DEBT, PREMISE_DEBT_SHIPPED } from "./scenario-premise-debt.js";
import { ScenarioDef } from "./scenario.js";
const campaign = sealedCampaign();
const player = campaign.founding.nation;
const probe = (over) => ({ ...FIXTURE_SCENARIOS[0], id: "premise-probe", once: false, ...over });
const nations = Object.keys(campaign.nations);
const live = (def) => nations.filter((id) => scenarioLive(campaign, def, id));
describe("shared organization binding", () => {
    it("gives the United States no customs or free-trade partner, so a customs week gated on one is undealable", () => {
        expect(live(probe({ conditions: [{ kind: "sharedMembership", present: true, orgKind: "economic", tradeCompetence: "customs-union" }] }))).toEqual([]);
        expect(live(probe({ conditions: [{ kind: "sharedMembership", present: true, tradeCompetence: "fta" }] }))).toEqual([]);
    });
    it("still finds defense partners and renders the matched body by name", () => {
        const def = probe({
            conditions: [{ kind: "sharedMembership", present: true, orgKind: "defense" }],
            subject: "The {{sharedOrganization}} review",
        });
        const partners = live(def);
        expect(partners.length).toBeGreaterThan(0);
        expect(castBound(campaign, def, partners[0]).script.subject).toMatch(/^The .+ review$/);
        expect(castBound(campaign, def, partners[0]).script.subject).not.toContain("{{");
    });
    it("refuses the token when no membership gate backs it", () => {
        const findings = auditScenario(probe({ subject: "The {{sharedOrganization}} review" }));
        expect(findings.some((f) => f.kind === "ungated-organization-token" && f.severity === "error")).toBe(true);
    });
});
describe("home frontier binding", () => {
    const neighbors = campaign.nations[player].base.geo.neighbors;
    it("reads a land border with the player's own country", () => {
        const def = probe({ conditions: [{ kind: "sharesBorder", present: true }] });
        expect(live(def).sort()).toEqual([...neighbors].filter((id) => campaign.nations[id]).sort());
        expect(scenarioLive(campaign, def, player)).toBe(false);
    });
    it("datelines the frontier on the player's own border, not a rolled neighbor", () => {
        const neighbor = neighbors.find((id) => campaign.nations[id]);
        const def = probe({
            conditions: [{ kind: "sharesBorder", present: true }],
            locus: { site: "border", ground: "counterpart", frontier: "home", descriptor: "the checkpoint where freight backs up on the player's side" },
        });
        const cast = castBound(campaign, def, neighbor);
        expect(cast.locus?.placeName).toContain(campaign.nations[player].base.identity.name);
    });
    it("refuses a home frontier that is not paired with a border condition", () => {
        const def = { ...probe({}), conditions: [{ kind: "turn", atLeast: 1 }], locus: { site: "border", ground: "counterpart", frontier: "home", descriptor: "a crossing on the line between us" } };
        expect(ScenarioDef.safeParse(def).success).toBe(false);
    });
});
describe("premise declaration", () => {
    const economy = (over = {}) => probe({ class: "economy", conditions: [{ kind: "turn", atLeast: 3 }], ...over });
    const errors = (def) => auditScenario(def).filter((f) => f.kind === "premise-class-ungated");
    it("refuses a new economy week that reads no economic state and declares nothing", () => {
        expect(errors(economy())).toHaveLength(1);
    });
    it("accepts a gate, or a declared premise", () => {
        expect(errors(economy({ conditions: [{ kind: "cyclePhase", in: ["contraction"] }] }))).toHaveLength(0);
        expect(errors(economy({ premise: { kind: "universal", reason: "A routine budget squabble that deals on any board." } }))).toHaveLength(0);
        expect(errors(economy({ premise: { kind: "introduces", what: "The run itself is the incident that opens the stress." } }))).toHaveLength(0);
    });
    it("holds the shipped debt to ids that still need it", () => {
        const dir = "../../content/corpus/shards";
        const shipped = new Map();
        for (const file of readdirSync(dir).filter((f) => f.endsWith(".jsonl"))) {
            for (const line of readFileSync(`${dir}/${file}`, "utf8").split("\n").filter(Boolean)) {
                const def = JSON.parse(line);
                shipped.set(def.id, def);
            }
        }
        for (const id of PREMISE_DEBT_SHIPPED) {
            const def = shipped.get(id);
            expect(def, `${id} left the corpus; remove it from the debt list`).toBeDefined();
            expect(readsClassState(def) || def.premise !== undefined, `${id} now reads its state or declares a premise; remove it from the debt list`).toBe(false);
        }
        const undeclared = [...shipped.values()].filter((def) => !readsClassState(def) && !def.premise && !PREMISE_DEBT.has(def.id));
        expect(undeclared.map((def) => def.id)).toEqual([]);
    });
});
describe("review fixes", () => {
    it("does not call a border week unreachable when a neighbor can be the firmest friend", () => {
        const def = probe({ conditions: [{ kind: "sharesBorder", present: true }], cast: { pick: "closest" } });
        expect(auditReachability([def]).map((finding) => finding.scenario)).not.toContain(def.id);
    });
    it("refuses two positive membership gates, so the named body is the accepted one", () => {
        const def = {
            ...probe({}),
            conditions: [
                { kind: "sharedMembership", present: true },
                { kind: "sharedMembership", present: true, orgKind: "political" },
            ],
        };
        expect(ScenarioDef.safeParse(def).success).toBe(false);
    });
    it("does not let an unrelated reading satisfy a class's premise", () => {
        const withGate = (class_, condition) => probe({ class: class_, conditions: [condition] });
        const refused = (def) => auditScenario(def).some((f) => f.kind === "premise-class-ungated");
        expect(refused(withGate("economy", { kind: "metric", metric: "militaryReadiness", atLeast: 0.1 }))).toBe(true);
        expect(refused(withGate("disaster", { kind: "conditionActive", condition: "recession" }))).toBe(true);
        expect(refused(withGate("public-health", { kind: "conditionActive", condition: "wildfire" }))).toBe(true);
        expect(refused(withGate("economy", { kind: "metric", metric: "treasury", atMost: 0.3 }))).toBe(false);
        expect(refused(withGate("disaster", { kind: "conditionActive", condition: "flood" }))).toBe(false);
        expect(refused(withGate("public-health", { kind: "conditionActive", condition: "pandemic" }))).toBe(false);
    });
    it("finds the organization token in particulars and the locus descriptor", () => {
        const inParticular = probe({ particulars: [{ label: "Body", value: "{{sharedOrganization}}" }] });
        const inLocus = probe({ locus: { ...FIXTURE_SCENARIOS[0].locus, descriptor: "the {{sharedOrganization}} secretariat" } });
        for (const def of [inParticular, inLocus]) {
            expect(auditScenario(def).some((f) => f.kind === "ungated-organization-token")).toBe(true);
        }
    });
});
describe("original tariff token", () => {
    const gated = probe({
        class: "foreign-crisis",
        cast: { pick: "tradeMeasure" },
        conditions: [{ kind: "tradeMeasure", origin: "retaliation", responseSector: "food-processing", responseRate: 0.1 }, { kind: "sharesBorder", present: true }],
        subject: "A pause on our tariff on {{ourTariffSector}}",
    });
    it("names the sector of the U.S. tariff the retaliation answers", () => {
        const board = tradeBoards([gated])[0];
        const record = board.trade.retaliation.find((r) => r.landed);
        const expected = tradeSector(board.trade.measures[record.answering].sector).name.toLowerCase();
        expect(castBound(board, gated, record.by).script.subject).toBe(`A pause on our tariff on ${expected}`);
    });
    it("follows the opener's pinned retaliation, not the newest one", () => {
        const board = tradeBoards([gated])[0];
        const first = board.trade.retaliation.find((r) => r.landed);
        const usMeasure = board.trade.measures[first.answering];
        const otherSector = usMeasure.sector === "steel" ? "aluminum" : "steel";
        const secondUs = { ...usMeasure, sector: otherSector };
        const second = { ...first, id: `${first.id}-later`, answering: "us-second", dueTurn: first.dueTurn + 10 };
        const campaignWithTwo = {
            ...board,
            trade: { ...board.trade, measures: { ...board.trade.measures, "us-second": secondUs }, retaliation: [...board.trade.retaliation, second] },
            scenarioFamilies: { "arc-probe": { family: "arc-probe", counterpart: first.by, openedTurn: 1, lastTurn: 1, beats: ["opener-probe"] } },
            cases: { [`scenario:opener-probe@trade:retaliation-measure:${first.id}`]: {} },
        };
        const close = { ...gated, subject: "A pause on our tariff on {{ourTariffSector}}", family: { id: "arc-probe", role: "close" } };
        const expected = tradeSector(usMeasure.sector).name.toLowerCase();
        expect(castBound(campaignWithTwo, close, first.by).script.subject).toBe(`A pause on our tariff on ${expected}`);
    });
    it("is not dealt once the answered tariff has been lifted", () => {
        const board = tradeBoards([gated])[0];
        const record = board.trade.retaliation.find((r) => r.landed);
        const pinned = (liftedTurn) => ({
            ...board,
            trade: { ...board.trade, measures: { ...board.trade.measures, [record.answering]: { ...board.trade.measures[record.answering], ...(liftedTurn === undefined ? {} : { liftedTurn }) } } },
            scenarioFamilies: { "arc-probe": { family: "arc-probe", counterpart: record.by, openedTurn: 1, lastTurn: 1, beats: ["opener-probe"] } },
            cases: { [`scenario:opener-probe@trade:retaliation-measure:${record.id}`]: {} },
        });
        const close = { ...gated, family: { id: "arc-probe", role: "close" }, conditions: [{ kind: "tariffInForce", present: true }] };
        expect(scenarioLive(pinned(), close, record.by)).toBe(true);
        expect(scenarioLive(pinned(board.turn), close, record.by)).toBe(false);
    });
    it("falls back to plain words rather than a raw brace when the ledger holds no retaliation", () => {
        const rendered = castBound(campaign, { ...gated, cast: { pick: "none" }, conditions: [] }, player).script.subject;
        expect(rendered).toBe("A pause on our tariff on the original goods");
    });
    it("refuses the token with no trade-measure cast or family behind it", () => {
        const loose = probe({ subject: "A pause on our tariff on {{ourTariffSector}}" });
        expect(auditScenario(loose).some((f) => f.kind === "ungated-tariff-token" && f.severity === "error")).toBe(true);
    });
});
describe("premise recheck after the deal", () => {
    const withPhase = (phase) => ({ ...campaign, cycles: { ...campaign.cycles, [player]: { ...campaign.cycles[player], phase } } });
    const contraction = probe({ class: "economy", conditions: [{ kind: "cyclePhase", in: ["contraction"] }] });
    it("withdraws a memo dealt on a contraction once the economy recovers", () => {
        const dealt = withPhase("contraction");
        const cast = castBound(dealt, contraction, player);
        expect(castStillBound(dealt, cast)).toBe(true);
        expect(castStillBound(withPhase("expansion"), cast)).toBe(false);
    });
    it("withdraws a draft to pause a tariff once the President has lifted it", () => {
        const seed = probe({
            class: "foreign-crisis",
            cast: { pick: "tradeMeasure" },
            conditions: [{ kind: "tradeMeasure", origin: "retaliation", responseSector: "food-processing", responseRate: 0.1 }, { kind: "sharesBorder", present: true }],
        });
        const board = tradeBoards([seed])[0];
        const record = board.trade.retaliation.find((r) => r.landed);
        const pinned = (liftedTurn) => ({
            ...board,
            trade: { ...board.trade, measures: { ...board.trade.measures, [record.answering]: { ...board.trade.measures[record.answering], ...(liftedTurn === undefined ? {} : { liftedTurn }) } } },
            scenarioFamilies: { "arc-probe": { family: "arc-probe", counterpart: record.by, openedTurn: 1, lastTurn: 1, beats: ["opener-probe"] } },
            cases: { [`scenario:opener-probe@trade:retaliation-measure:${record.id}`]: {} },
        });
        const close = probe({ family: { id: "arc-probe", role: "close" }, conditions: [{ kind: "tariffInForce", present: true }] });
        const cast = castBound(pinned(), close, record.by);
        expect(castStillBound(pinned(), cast)).toBe(true);
        expect(castStillBound(pinned(board.turn), cast)).toBe(false);
    });
});
