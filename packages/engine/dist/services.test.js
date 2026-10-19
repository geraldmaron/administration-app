import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { foundedForBalance } from "./balance-harness.js";
import { createSave, loadSave } from "./save.js";
import { seatCabinetOffice } from "./institutions.js";
import { vacates } from "./appointments.js";
import { rescindOrder } from "./order-lifecycle.js";
import { selectWorkDelivery, workIsLawful } from "./executive-work.js";
import { SERVICES, OLDEST_COHORT, WEEKLY_INTAKE, ageBands, cohorts, lateShare, openingService, pendingTotal, serviceDefinition, serviceDepartment, servicePhase, serviceTick, } from "./services.js";
const { campaign: FOUNDED } = foundedForBalance("services");
function def(id) {
    const found = serviceDefinition(id);
    if (!found)
        throw new Error(`no service ${id}`);
    return found;
}
function delivering(capacity, ownerQuality = capacity) {
    return { work: "test", owner: "INST-VA", ownerQuality, capacity, status: "delivering" };
}
function withQuality(campaign, id, implementationQuality) {
    const runtime = campaign.institutions[id];
    return { ...campaign, institutions: { ...campaign.institutions, [id]: { ...runtime, implementationQuality } } };
}
const LATE_BACKLOG = cohorts({ 0: 100, 6: 150, 18: 300, 26: 200 });
/** A claims service most of whose backlog is already past its standard. */
function lateClaims() {
    return { ...openingService(def("disability-claims"), 0), pending: LATE_BACKLOG };
}
function run(runtime, service, weeks, delivery, integrity) {
    let current = runtime;
    for (let week = 0; week < weeks; week += 1)
        current = serviceTick(current, service, delivery, integrity === undefined ? undefined : { integrity });
    return current;
}
describe("the services are lawful work", () => {
    it("names owners and approvers the catalog gives the authority to, and rolls each up to one department", () => {
        for (const service of SERVICES)
            expect(workIsLawful(service.work), service.id).toBe(true);
        expect(SERVICES.map(serviceDepartment)).toEqual([
            "INST-STATE",
            "INST-TREASURY",
            "INST-DOD",
            "INST-VA",
            "INST-DOJ",
            "INST-USDA",
            "INST-COMMERCE",
            "INST-LABOR",
            "INST-HHS",
            "INST-HUD",
            "INST-ED",
            "INST-DHS",
            "INST-INTERIOR",
        ]);
    });
    it("gives every department one service, so no department's work is counted twice", () => {
        const departments = SERVICES.map(serviceDepartment);
        expect(new Set(departments).size).toBe(departments.length);
    });
});
describe("federal cases close no faster than the courts hear them", () => {
    const service = def("federal-cases");
    it("caps the department at the courts' pace however well it runs, and stops when the courts are not sitting", () => {
        const strong = withQuality(FOUNDED, "INST-DOJ", 1);
        expect(selectWorkDelivery(withQuality(strong, "INST-JUDICIARY", 0.4), service.work)).toMatchObject({ status: "delayed", binding: "INST-JUDICIARY", capacity: 0.4 });
        expect(selectWorkDelivery(withQuality(strong, "INST-JUDICIARY", 0.1), service.work).status).toBe("blocked");
    });
    it("closes more cases under a pliant Attorney General only by forcing pleas, which are wrong more often and come back", () => {
        const late = { ...openingService(service, 0), pending: LATE_BACKLOG };
        const principled = serviceTick(late, service, delivering(0.6), { integrity: 0.95 });
        const pliant = serviceTick(late, service, delivering(0.6), { integrity: 0.1 });
        expect(pliant.last.decided).toBeGreaterThan(principled.last.decided);
        expect(pliant.last.errors / pliant.last.decided).toBeGreaterThan(principled.last.errors / principled.last.decided);
        // A plea is not a refusal: nothing is turned away, the case is closed on the defendant.
        expect(pliant.last.refused).toBe(0);
    });
});
describe("farm program applications", () => {
    it("are cleared by refusals under a pliant Secretary of Agriculture, as disability claims are", () => {
        const service = def("farm-payments");
        const late = { ...openingService(service, 0), pending: LATE_BACKLOG };
        const pliant = serviceTick(late, service, delivering(0.6), { integrity: 0.1 });
        const principled = serviceTick(late, service, delivering(0.6), { integrity: 0.95 });
        expect(pliant.last.refused - principled.last.refused).toBeCloseTo(pliant.last.pressured - principled.last.pressured, 9);
        expect(pliant.last.pressured).toBeGreaterThan(0);
    });
});
describe("a service week counts every case once", () => {
    it("reconciles what waits with what arrived, came back, was decided and was withdrawn, week after week", () => {
        const service = def("disability-claims");
        let runtime = lateClaims();
        for (let week = 0; week < 40; week += 1) {
            const delivery = delivering(week % 3 === 0 ? 0.4 : 0.8);
            const next = serviceTick(runtime, service, delivery, { integrity: 0.3 });
            const flows = next.last;
            expect(pendingTotal(next)).toBeCloseTo(pendingTotal(runtime) + flows.arrivals + flows.rework - flows.decided - flows.withdrawn, 9);
            expect(next.pending.every((count) => count >= 0)).toBe(true);
            runtime = next;
        }
    });
    it("sends a share of this week's errors back after the lag, and no sooner", () => {
        const service = def("tax-returns");
        const first = serviceTick(openingService(service, 0), service, delivering(0.5), undefined);
        expect(first.last.errors).toBeGreaterThan(0);
        const lag = first.returning.length;
        const waiting = run(first, service, lag - 1, delivering(0.5));
        expect(waiting.last.rework).toBe(0);
        expect(serviceTick(waiting, service, delivering(0.5), undefined).last.rework).toBeCloseTo(first.last.errors * 0.5, 9);
    });
    it("ages each case by the week it actually waited, so a queue decided oldest first stays young", () => {
        const service = def("consular-visas");
        const kept = run(openingService(service, 0), service, 30, delivering(0.85));
        expect(lateShare(kept, service)).toBe(0);
        expect(ageBands(kept)[1]).toBe(0);
        const starved = run(openingService(service, 0), service, 30, delivering(0));
        // Nothing decided: thirty weeks of intake, the oldest twenty-six-plus in the last cohort less what gave up.
        expect(starved.pending.slice(0, OLDEST_COHORT).every((count) => count === WEEKLY_INTAKE)).toBe(true);
    });
    it("falls behind below the branch's break-even and keeps up above it", () => {
        const service = def("consular-visas");
        const opened = openingService(service, 0);
        expect(pendingTotal(run(opened, service, 26, delivering(0.55)))).toBeGreaterThan(pendingTotal(opened));
        expect(lateShare(run(opened, service, 26, delivering(0.9)), service)).toBe(0);
    });
});
describe("throughput bought by refusing cannot pass for service", () => {
    const service = def("disability-claims");
    const delivery = delivering(0.6);
    const principled = serviceTick(lateClaims(), service, delivery, { integrity: 0.95 });
    const pliant = serviceTick(lateClaims(), service, delivery, { integrity: 0.1 });
    it("decides more under a pliant Secretary, all of it refusals, and gets more of it wrong", () => {
        expect(pliant.last.decided).toBeGreaterThan(principled.last.decided);
        expect(pliant.last.pressured).toBeGreaterThan(0);
        expect(pliant.last.refused - principled.last.refused).toBeCloseTo(pliant.last.pressured - principled.last.pressured, 9);
        expect(pliant.last.errors / pliant.last.decided).toBeGreaterThan(principled.last.errors / principled.last.decided);
    });
    it("brings the wrong refusals back as rework, so the cleared backlog returns", () => {
        const weeks = principled.returning.length + 1;
        const later = (start, integrity) => run(start, service, weeks, delivery, integrity).last.rework;
        expect(later(pliant, 0.1)).toBeGreaterThan(later(principled, 0.95));
    });
    it("presses nobody when the chair is empty or the service refuses nothing", () => {
        expect(serviceTick(lateClaims(), service, delivery, undefined).last.pressured).toBe(0);
        const visas = def("consular-visas");
        const late = { ...openingService(visas, 0), pending: lateClaims().pending };
        expect(serviceTick(late, visas, delivery, { integrity: 0 }).last.pressured).toBe(0);
    });
});
describe("an arms transfer waits on the State Department", () => {
    const service = def("arms-transfers");
    it("closes no faster than State approves, however well the Pentagon runs", () => {
        const campaign = withQuality(withQuality(FOUNDED, "INST-DOD", 1), "INST-STATE", 0.4);
        const delivery = selectWorkDelivery(campaign, service.work);
        expect(delivery.status).toBe("delayed");
        const capped = serviceTick(openingService(service, 0), service, delivery, undefined);
        const unhindered = serviceTick(openingService(service, 0), service, selectWorkDelivery(withQuality(campaign, "INST-STATE", 1), service.work), undefined);
        expect(capped.last.decided).toBeLessThan(unhindered.last.decided);
    });
    it("closes nothing while State is not clearing approvals at all", () => {
        const campaign = withQuality(withQuality(FOUNDED, "INST-DOD", 1), "INST-STATE", 0.1);
        const week = serviceTick(openingService(service, 0), service, selectWorkDelivery(campaign, service.work), undefined);
        expect(week.last.decided).toBe(0);
    });
});
describe("the service phase", () => {
    it("stops new visa refusals after the entry proclamation is rescinded", () => {
        const order = { id: "order-entry-suspension:1", order: "order-entry-suspension",
            turn: FOUNDED.turn, contested: false, challengeChance: 0,
            subject: { kind: "entry-class", nation: FOUNDED.founding.nation, pursuitId: "pursuit:fixture" } };
        const issued = { ...FOUNDED, orders: [...FOUNDED.orders, order] };
        const operating = servicePhase(issued).reduce(apply, issued);
        expect(operating.services?.["consular-visas"]?.last?.refused).toBeGreaterThan(0);
        const withdrawal = rescindOrder(issued, order.id);
        if (!withdrawal.ok)
            throw new Error(withdrawal.reason);
        const ended = apply(issued, withdrawal.packet);
        const next = servicePhase(ended).reduce(apply, ended);
        expect(next.services?.["consular-visas"]?.last?.refused).toBe(0);
        expect(next.services?.["consular-visas"]?.entryRefusals).toBeUndefined();
    });
    it("opens every service on a campaign that has none, from this week, on the same opening", () => {
        const at = { ...FOUNDED, turn: 12 };
        const next = servicePhase(at).reduce(apply, at);
        for (const service of SERVICES) {
            const runtime = next.services?.[service.id];
            expect(runtime?.openedTurn).toBe(12);
            expect(runtime?.last?.arrivals).toBe(WEEKLY_INTAKE);
        }
    });
    it("carries the record forward rather than reopening it", () => {
        const once = servicePhase(FOUNDED).reduce(apply, FOUNDED);
        const twice = servicePhase({ ...once, turn: once.turn + 1 }).reduce(apply, once);
        expect(twice.services?.["tax-returns"]?.openedTurn).toBe(FOUNDED.turn);
    });
    it("survives a save, and reads an earlier save as having no services rather than inventing them", () => {
        const tracked = servicePhase(FOUNDED).reduce(apply, FOUNDED);
        expect(loadSave(JSON.parse(JSON.stringify(createSave(tracked)))).services).toEqual(tracked.services);
        const { services: _none, ...untracked } = tracked;
        expect(loadSave({ schemaVersion: 56, campaign: untracked }).services).toBeUndefined();
    });
});
describe("a change in the chair leaves the department's work where it was", () => {
    const VETERANS = "role-veterans-secretary";
    const tracked = servicePhase(FOUNDED).reduce(apply, FOUNDED);
    const before = tracked.institutions["INST-VA"];
    const keep = (campaign) => {
        const after = campaign.institutions["INST-VA"];
        expect(campaign.services).toEqual(tracked.services);
        expect([after.backlog, after.staffing, after.budgetAdequacy, after.capacity, after.directives]).toEqual([
            before.backlog,
            before.staffing,
            before.budgetAdequacy,
            before.capacity,
            before.directives,
        ]);
    };
    it("on a vacancy and a confirmed replacement", () => {
        const emptied = seatCabinetOffice(tracked, VETERANS, undefined);
        keep(emptied);
        const someone = Object.values(tracked.people).find((person) => person.alive && person.currentRole === undefined).base.id;
        keep(seatCabinetOffice(emptied, VETERANS, someone));
    });
    it("on a resignation that leaves the deputy acting", () => {
        const holder = tracked.player.cabinet[VETERANS];
        expect(holder).toBeDefined();
        const resigned = apply(tracked, {
            source: "action",
            actor: "player",
            turn: tracked.turn,
            narration: { summary: "The Secretary resigns." },
            effects: vacates(tracked, VETERANS, "resigned", holder),
        });
        expect(resigned.player.cabinet[VETERANS]).toBeUndefined();
        expect(resigned.institutions["INST-VA"].actingLeader).toBeDefined();
        keep(resigned);
    });
});
