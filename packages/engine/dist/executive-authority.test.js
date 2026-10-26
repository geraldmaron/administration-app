import { describe, expect, it } from "vitest";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { declareExternalEmergency, eligibleExternalThreats } from "./external-emergency.js";
import { declareArmedForcesEmergency, emergencyCauseLabel } from "./emergency.js";
import { openConflict } from "./conflicts.js";
import { EXECUTIVE_ORDERS, entryClassOrderSubjects, executiveOrder, grantOrderSubjects, orderAvailability, reliefOrderSubjects, signOrder } from "./orders.js";
import { createRngStreams } from "./rng.js";
import { obligationPhase } from "./obligations.js";
import { militaryConstructionPhase } from "./military-construction.js";
import { legislativeAct } from "./legislative-acts.js";
import { lawOffsetForBill, lawShift, lawShiftOverTenYears } from "./law-offsets.js";
import { signBill } from "./legislation.js";
import { declareStaffordDisaster } from "./stafford.js";
import { reliefAllocation } from "./order-subjects.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { createSave, loadSave } from "./save.js";
import { CHARTER_PRESIDENTIAL_REPUBLIC, CHARTER_USA_CONSTITUTION, FEDERAL_SITES } from "@admin/world";
import { federalSiteOrderSubjects, orderSubjectRefusal } from "./order-subjects.js";
import { foundedForBalance } from "./balance-harness.js";
function threat(campaign) {
    return { id: `pursuit:${nationB.id}:${campaign.founding.nation}:${campaign.turn}`, actor: nationB.id,
        target: campaign.founding.nation, aim: "security", openedTurn: campaign.turn, commitment: 0.7,
        progress: 0.2, rungReached: 2, overt: true, lastActedTurn: campaign.turn, status: "active", beats: [] };
}
const UNRELATED = { kind: "foreign", nation: nationB.id };
const AUTHORITY_MATRIX = [
    { id: "order-border-controls", subject: UNRELATED, missing: /federal ports-of-entry scope/ },
    { id: "order-entry-suspension", missing: /recent observed security threat/ },
    { id: "order-force-protection", missing: /identified federal building/ },
    { id: "order-regulatory-review", missing: /identified, operative agency rule/ },
    { id: "order-grant-conditions", missing: /enacted policing-grant program/ },
    { id: "order-energy-leasing", missing: /current, identified federal offshore program/ },
    { id: "order-clean-energy", subject: UNRELATED, missing: /no separate target/ },
    { id: "order-defense-production", missing: /outstanding federal precision-fires replenishment order/ },
    { id: "order-emergency-construction", missing: /armed-forces national declaration/ },
    { id: "order-price-controls", missing: /act of Congress granting the power/ },
    { id: "order-asset-seizure", missing: /current national emergency declared over this named foreign threat/ },
    { id: "order-relief-program", missing: /live disaster, documented governor request/ },
];
// The fixture's nation is smaller than Michigan alone, and a governor's damage
// estimate reads the nation's own scale (obligations.ts), so the relief chain
// estimates on a country the size of the states it is made of; the packets it
// files are then applied to the campaign under test unchanged.
function atStateScale(campaign) {
    const states = Object.values(campaign.states);
    const population = states.reduce((sum, state) => sum + state.population, 0);
    const gdp = states.reduce((sum, state) => sum + state.base.grp, 0);
    const home = campaign.nations[campaign.founding.nation];
    const stats = { ...home.stats, demography: { ...home.stats.demography, population }, economy: { ...home.stats.economy, gdp, gdpPerCapita: gdp * 1_000_000 / population } };
    return { ...campaign, nations: { ...campaign.nations, [campaign.founding.nation]: { ...home, stats } } };
}
describe("catalog authority matrix", () => {
    it("covers every order and refuses each family's missing or wrong predicate at the resolver", () => {
        const base = buildCampaign();
        expect(AUTHORITY_MATRIX.map((entry) => entry.id).sort()).toEqual(EXECUTIVE_ORDERS.map((order) => order.id).sort());
        for (const entry of AUTHORITY_MATRIX) {
            const order = executiveOrder(entry.id);
            const refusal = orderAvailability(base, order, entry.subject);
            expect(refusal.ok, entry.id).toBe(false);
            if (refusal.ok)
                continue;
            expect(refusal.missing, entry.id).toMatch(entry.missing);
            const signed = signOrder(base, CHARTER_PRESIDENTIAL_REPUBLIC, entry.id, createRngStreams(base.seed), entry.subject);
            expect(signed.ok, entry.id).toBe(false);
        }
    });
});
describe("foreign emergency authority", () => {
    it("requires a recent overt campaign, then binds blocking to the named government and declaration", () => {
        const base = buildCampaign();
        const pursuit = threat(base);
        const campaign = { ...base, pursuits: { ...base.pursuits, [pursuit.id]: pursuit } };
        expect(eligibleExternalThreats({ ...campaign, pursuits: { [pursuit.id]: { ...pursuit, overt: false } } })).toHaveLength(0);
        expect(declareExternalEmergency(base, pursuit.id, "national-security").ok).toBe(false);
        expect(declareExternalEmergency(campaign, pursuit.id, "economy").ok).toBe(false);
        const declaration = declareExternalEmergency(campaign, pursuit.id, "national-security");
        if (!declaration.ok)
            throw new Error(declaration.reason);
        const declared = apply(campaign, declaration.packet);
        const order = executiveOrder("order-asset-seizure");
        expect(orderAvailability(declared, order, { kind: "foreign", nation: campaign.founding.nation })).toMatchObject({ ok: false, missing: expect.stringContaining("named foreign threat") });
        expect(orderAvailability(declared, order, { kind: "foreign", nation: nationB.id })).toMatchObject({ ok: false, missing: expect.stringContaining("Secretary") });
        const expired = { ...declared, turn: declaration.record.expiresTurn };
        expect(orderAvailability(expired, order, { kind: "foreign", nation: nationB.id })).toMatchObject({ ok: false, missing: expect.stringContaining("named foreign threat") });
    });
});
describe("entry proclamation authority", () => {
    it("signs only for the observed security campaign and refuses a second live class", () => {
        const opened = foundedForBalance("order-lifecycle").campaign;
        const observed = threat(opened);
        const active = { ...opened, pursuits: { ...opened.pursuits, [observed.id]: observed } };
        const order = executiveOrder("order-entry-suspension");
        const subject = entryClassOrderSubjects(active)[0];
        expect(subject).toEqual({ kind: "entry-class", nation: observed.actor, pursuitId: observed.id });
        expect(orderAvailability(active, order, subject).ok).toBe(true);
        expect(orderAvailability(active, order, { ...subject, pursuitId: "pursuit:unrelated" }).ok).toBe(false);
        expect(entryClassOrderSubjects({ ...active, pursuits: { [observed.id]: { ...observed, overt: false } } })).toEqual([]);
        const result = signOrder(active, CHARTER_PRESIDENTIAL_REPUBLIC, order.id, createRngStreams(active.seed), subject);
        if (!result.ok)
            throw new Error(result.reason);
        const signed = apply(active, result.packet);
        expect(signed.orders.at(-1)?.subject).toEqual(subject);
        expect(entryClassOrderSubjects(signed)).toEqual([]);
        expect(signOrder(signed, CHARTER_PRESIDENTIAL_REPUBLIC, order.id, createRngStreams(signed.seed), subject).ok).toBe(false);
        expect(loadSave(createSave(signed)).orders.at(-1)?.subject).toEqual(subject);
    });
});
describe("disaster relief authority", () => {
    it("fixes appropriated dollars at enactment and closes allocation at the statutory sunset", () => {
        const base = buildCampaign();
        const bill = { id: "bill:fixed-recovery", act: "act-disaster-recovery", title: "Recovery",
            sponsor: "administration", introducedTurn: base.turn, status: "on-the-desk", passage: [] };
        const pending = { ...base, bills: { ...base.bills, [bill.id]: bill } };
        const enacted = signBill(pending, bill.id);
        if (!enacted.ok)
            throw new Error(enacted.reason);
        const law = apply(pending, enacted.packet);
        const appropriation = law.bills[bill.id].recoveryAuthority;
        const gdp = law.nations[law.founding.nation].stats.economy.gdp;
        expect(appropriation).toEqual({ appropriated: Math.round(0.004 * gdp), throughTurn: base.turn + 2 * TURNS_PER_YEAR });
        const saved = loadSave(JSON.parse(JSON.stringify(createSave(law))));
        expect(saved.bills[bill.id].recoveryAuthority).toEqual(appropriation);
        const grown = { ...saved, nations: { ...saved.nations, [saved.founding.nation]: {
                    ...saved.nations[saved.founding.nation], stats: { ...saved.nations[saved.founding.nation].stats,
                        economy: { ...saved.nations[saved.founding.nation].stats.economy, gdp: gdp * 2 } }
                } } };
        const allocated = { ...grown, orders: [...grown.orders, { id: "earlier-relief", order: "order-relief-program",
                    turn: grown.turn - 1, contested: false, challengeChance: 0,
                    subject: { kind: "state", state: "MI", cause: "flood",
                        declarationId: "stafford:test", billId: bill.id, amount: appropriation.appropriated - 10 } }] };
        expect(reliefAllocation(allocated, bill.id)).toBe(10);
        expect(reliefAllocation({ ...allocated, turn: appropriation.throughTurn }, bill.id)).toBe(0);
        const legacy = { ...law, bills: { ...law.bills, [bill.id]: { ...law.bills[bill.id], recoveryAuthority: undefined } } };
        expect(reliefAllocation(legacy, bill.id)).toBe(0);
    });
    it("needs a live disaster and governor claim, spends only against the requested state, and discharges that claim", () => {
        const base = buildCampaign();
        const state = "MI";
        const condition = { id: "condition:flood:MI", nation: base.founding.nation, kind: "flood",
            scope: "region", severity: 0.7, startedTurn: base.turn, status: "active",
            beats: [], state };
        const running = { ...base, conditions: { [condition.id]: condition } };
        expect(reliefOrderSubjects(running)).toHaveLength(0);
        const requested = obligationPhase(atStateScale(running)).reduce(apply, running);
        expect(reliefOrderSubjects(requested)).toHaveLength(0);
        const declaration = declareStaffordDisaster(requested, state);
        if (!declaration.ok)
            throw new Error(declaration.reason);
        const declared = apply(requested, declaration.packet);
        expect(reliefOrderSubjects(declared)).toHaveLength(0);
        const bill = { id: "bill:recovery", act: "act-disaster-recovery", title: "Recovery",
            sponsor: "administration", introducedTurn: base.turn, status: "on-the-desk", passage: [] };
        const pending = { ...declared, bills: { ...declared.bills, [bill.id]: bill } };
        const enactment = signBill(pending, bill.id);
        if (!enactment.ok)
            throw new Error(enactment.reason);
        const funded = apply(pending, enactment.packet);
        const subject = reliefOrderSubjects(funded)[0];
        expect(subject).toMatchObject({ kind: "state", state, cause: "flood", declarationId: declaration.declarationId, billId: bill.id });
        const order = executiveOrder("order-relief-program");
        expect(orderAvailability(funded, order, { ...subject, state: "CA" }).ok).toBe(false);
        expect(orderAvailability(funded, order, { ...subject, billId: "bill:unrelated" }).ok).toBe(false);
        const wrongDeclaration = { ...funded, states: { ...funded.states,
                [state]: { ...funded.states[state], staffordDeclaration: { id: "wrong", requestId: "wrong-request", declaredTurn: base.turn } } } };
        expect(reliefOrderSubjects(wrongDeclaration)).toHaveLength(0);
        const allocation = Math.round((funded.nations[funded.founding.nation]?.stats.economy.gdp ?? 0) * 0.004);
        const exhausted = { ...funded, orders: [...funded.orders, { id: "prior-relief", order: order.id,
                    turn: base.turn - 1, contested: false, challengeChance: 0,
                    subject: { ...subject, amount: allocation } }] };
        expect(reliefOrderSubjects(exhausted)).toHaveLength(0);
        expect(orderAvailability(exhausted, order, subject).ok).toBe(false);
        const signed = signOrder(funded, CHARTER_PRESIDENTIAL_REPUBLIC, order.id, createRngStreams(funded.seed), subject);
        if (!signed.ok)
            throw new Error(signed.reason);
        expect(signed.packet.effects.filter((effect) => effect.kind === "state").every((effect) => effect.state === state)).toBe(true);
        expect(reliefOrderSubjects(apply(funded, signed.packet))).toHaveLength(0);
    });
});
describe("grant-condition authority", () => {
    it("requires the enacted policing-grant terms and binds the signature to that bill", () => {
        const base = buildCampaign();
        const order = executiveOrder("order-grant-conditions");
        const unrelated = { id: "bill:unrelated", act: "act-health-coverage", title: "Health coverage",
            sponsor: "administration", introducedTurn: base.turn, status: "law", passage: [] };
        const offered = { ...base, bills: { ...base.bills, [unrelated.id]: unrelated } };
        expect(grantOrderSubjects(offered)).toEqual([]);
        expect(orderAvailability(offered, order, { kind: "grant", billId: unrelated.id }).ok).toBe(false);
        const act = legislativeAct("act-police-accountability");
        const bill = { id: "bill:policing-grants", act: act.id, title: act.title, sponsor: act.sponsor,
            introducedTurn: base.turn, status: "on-the-desk", passage: [] };
        const pending = { ...offered, bills: { ...offered.bills, [bill.id]: bill } };
        expect(orderAvailability(pending, order, { kind: "grant", billId: bill.id }).ok).toBe(false);
        const enacted = signBill(pending, bill.id);
        if (!enacted.ok)
            throw new Error(enacted.reason);
        const law = apply(pending, enacted.packet);
        const subject = { kind: "grant", billId: bill.id };
        expect(grantOrderSubjects(law)).toContainEqual(subject);
        expect(orderAvailability(law, order, subject).ok).toBe(true);
        const signed = signOrder(law, CHARTER_PRESIDENTIAL_REPUBLIC, order.id, createRngStreams(law.seed), subject);
        if (!signed.ok)
            throw new Error(signed.reason);
        expect(signed.record.subject).toEqual(subject);
        const nextWeek = { ...apply(law, signed.packet), turn: law.turn + 1 };
        expect(grantOrderSubjects(nextWeek)).not.toContainEqual(subject);
        expect(orderAvailability(nextWeek, order, subject).ok).toBe(false);
        const ended = { ...nextWeek, orders: nextWeek.orders.map((record) => record.id === signed.record.id
                ? { ...record, rescindedTurn: nextWeek.turn } : record) };
        expect(grantOrderSubjects(ended)).toContainEqual(subject);
        const removed = { ...law, bills: { ...law.bills, [bill.id]: { ...law.bills[bill.id], status: "dead" } } };
        expect(orderAvailability(removed, order, subject).ok).toBe(false);
        const repeal = { id: "bill:policing-repeal", act: "act-housing-repeal", title: "Repeal",
            sponsor: "administration", introducedTurn: law.turn + 1, resolvedTurn: law.turn + 1,
            status: "law", passage: [], revises: { billId: bill.id, kind: "repeal" } };
        const historical = { ...law, bills: { ...law.bills, [repeal.id]: repeal } };
        expect(grantOrderSubjects(historical)).not.toContainEqual(subject);
        expect(orderAvailability(historical, order, subject).ok).toBe(false);
    });
});
describe("orders without a separate target", () => {
    it.each(["order-price-controls", "order-clean-energy", "order-defense-production"])("refuses an unrelated target on %s", (orderId) => {
        const base = buildCampaign();
        const unrelated = { kind: "foreign", nation: nationB.id };
        expect(orderAvailability(base, executiveOrder(orderId), unrelated))
            .toMatchObject({ ok: false, missing: "an order that takes no separate target" });
    });
});
describe("federal-property protection", () => {
    it("requires an identified federal site and refuses a state capitol or unsourced point", () => {
        const opened = buildCampaign();
        const secretaryRole = Object.entries(CHARTER_USA_CONSTITUTION.roleTitles ?? {})
            .find(([, title]) => title === "Secretary of Homeland Security")?.[0];
        if (!secretaryRole)
            throw new Error("The charter has no Homeland Security Secretary");
        const holder = Object.values(opened.people)[0].base.id;
        const base = { ...opened, player: { ...opened.player,
                cabinet: { ...opened.player.cabinet, [secretaryRole]: holder } } };
        const subject = federalSiteOrderSubjects(base).find((entry) => entry.institutionId === "INST-DHS");
        expect(FEDERAL_SITES.find((site) => site.institution === "INST-DHS")?.location).toBe("sourced");
        expect(subject).toBeDefined();
        expect(orderSubjectRefusal(base, "order-force-protection", subject)).toBeUndefined();
        expect(orderSubjectRefusal(base, "order-force-protection", { kind: "federal-site", institutionId: "CA" }))
            .toContain("federal building");
        expect(federalSiteOrderSubjects(base).some((entry) => entry.institutionId === "INST-JUDICIARY")).toBe(false);
        const result = signOrder(base, CHARTER_PRESIDENTIAL_REPUBLIC, "order-force-protection", createRngStreams(base.seed), subject);
        if (!result.ok)
            throw new Error(result.reason);
        const protectedSite = apply(base, result.packet);
        expect(result.record.subject).toEqual(subject);
        expect(federalSiteOrderSubjects(protectedSite)).not.toContainEqual(subject);
    });
});
describe("federal port scope", () => {
    it("records all federal ports as the fixed target and refuses interior enforcement", () => {
        const base = buildCampaign();
        expect(orderSubjectRefusal(base, "order-border-controls", { kind: "ports-of-entry", scope: "all-federal-ports" })).toBeUndefined();
        expect(orderSubjectRefusal(base, "order-border-controls", { kind: "federal-site", institutionId: "INST-DHS" }))
            .toContain("excluding interior");
        const role = Object.entries(CHARTER_USA_CONSTITUTION.roleTitles ?? {})
            .find(([, title]) => title === "Secretary of Homeland Security")?.[0];
        if (!role)
            throw new Error("The charter has no Homeland Security Secretary");
        const holder = Object.values(base.people)[0].base.id;
        const seated = { ...base, player: { ...base.player, cabinet: { ...base.player.cabinet, [role]: holder } } };
        const signed = signOrder(seated, CHARTER_USA_CONSTITUTION, "order-border-controls", createRngStreams(seated.seed));
        if (!signed.ok)
            throw new Error(signed.reason);
        expect(signed.record.subject).toEqual({ kind: "ports-of-entry", scope: "all-federal-ports" });
    });
});
describe("military construction funds", () => {
    it("permits an armed-forces declaration only for a live conflict involving the United States", () => {
        const base = buildCampaign();
        expect(declareArmedForcesEmergency(base, "war:imagined").ok).toBe(false);
        const war = openConflict(nationB.id, base.founding.nation, base.turn, "Attack on the United States.");
        const running = { ...base, conflicts: { ...base.conflicts, [war.id]: war } };
        const result = declareArmedForcesEmergency(running, war.id);
        if (!result.ok)
            throw new Error(result.reason);
        const declared = apply(running, result.packet);
        expect(Object.values(declared.emergencies)[0]).toMatchObject({ cause: "armed-conflict", armedForcesConflictId: war.id });
        expect(emergencyCauseLabel("armed-conflict")).toBe("Armed conflict");
    });
    it("arise from an enacted named appropriation and track commitments without erasing them", () => {
        const base = buildCampaign();
        const act = legislativeAct("act-military-facilities-appropriation");
        const bill = { id: "bill:military-facilities:test", act: act.id, title: act.title, sponsor: act.sponsor,
            introducedTurn: base.turn, status: "on-the-desk", passage: [] };
        const offered = { ...base, bills: { ...base.bills, [bill.id]: bill } };
        expect(offered.militaryConstructionProjects).toBeUndefined();
        const law = signBill(offered, bill.id);
        if (!law.ok)
            throw new Error(law.reason);
        const enacted = apply(offered, law.packet);
        expect(lawOffsetForBill(enacted.bills[bill.id])?.outlays).toBe(0.00015);
        expect(law.packet.effects.filter((effect) => effect.kind === "metric").every((effect) => effect.deltas.treasury === undefined)).toBe(true);
        const project = enacted.militaryConstructionProjects?.find((entry) => entry.name === "Coastal logistics depot");
        if (!project)
            throw new Error("enacted law produced no named construction project");
        expect(project.appropriationBill).toBe(bill.id);
        expect(project.appropriated).toBeGreaterThan(0);
        const us = enacted.founding.nation;
        const nation = enacted.nations[us];
        const largerGdp = nation.stats.economy.gdp * 1.2;
        const grown = { ...enacted, nations: { ...enacted.nations, [us]: { ...nation, stats: { ...nation.stats,
                        economy: { ...nation.stats.economy, gdp: largerGdp } } } } };
        const total = enacted.militaryConstructionProjects.reduce((sum, entry) => sum + entry.appropriated, 0);
        expect(lawShift(grown).outlays).toBe(0);
        expect(lawShiftOverTenYears(grown).outlays * largerGdp * 10).toBeCloseTo(total, 5);
        const redirected = apply(grown, { source: "action", actor: "player", turn: grown.turn,
            narration: { summary: "Funds redirected." }, effects: [{ kind: "militaryConstructionProject",
                    set: { ...project, status: "canceled", redirected: project.appropriated - project.obligated } }] });
        expect(lawShift(redirected).outlays).toBe(0);
        expect(lawShiftOverTenYears(redirected).outlays * largerGdp * 10).toBeCloseTo(total - project.appropriated, 5);
        const worked = militaryConstructionPhase(enacted).reduce(apply, enacted);
        const obligated = worked.militaryConstructionProjects?.find((entry) => entry.id === project.id).obligated ?? 0;
        expect(obligated).toBeGreaterThan(0);
        expect(worked.militaryConstructionProjects?.find((entry) => entry.id === project.id)?.appropriationBill).toBe(bill.id);
        expect(worked.militaryConstructionProjects?.find((entry) => entry.id === project.id)?.appropriated).toBe(project.appropriated);
        expect(militaryConstructionPhase(worked)).toEqual([]);
        const paying = { ...worked, turn: worked.turn + 1 };
        const paid = militaryConstructionPhase(paying).reduce(apply, paying);
        const cash = paid.militaryConstructionProjects.reduce((sum, entry) => sum + (entry.lastCashOutlay ?? 0), 0);
        expect(cash).toBeGreaterThan(0);
        expect(lawShift(paid).outlays * paid.nations[us].stats.economy.gdp / 52).toBeCloseTo(cash, 5);
    });
});
