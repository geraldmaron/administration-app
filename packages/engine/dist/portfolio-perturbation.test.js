import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { selectChairRunner } from "./appointments.js";
import { foundedForBalance } from "./balance-harness.js";
import { accountDepartments, instrumentDepartment } from "./department-ownership.js";
import { domainChair, executionQuality, legislableDomains } from "./policy.js";
import { stewardSway } from "./stewardship.js";
import { BUDGET_ACCOUNTS, appropriationQuality } from "./budget.js";
import { commandQuality } from "./war-tick.js";
import { INSTITUTION_CATALOG, deriveImplementationQuality, leaderCompetenceOf } from "./institutions.js";
import { SERVICES, cohorts, openingService, servicePhase } from "./services.js";
import { PROJECTS, projectPhase } from "./projects.js";
import { carryOutDirective } from "./execution.js";
// A Secretary is consequential where their portfolio's mechanisms read them,
// and nowhere else. Each mechanism that can read a Secretary is measured here
// with the role it belongs to, alongside every institution's delivery (which no
// Secretary may move) and every service's week. Swapping one Secretary between
// a strong and a weak profile must move at least one of their own entries and
// none that belong to anybody else.
const { campaign: FOUNDED } = foundedForBalance("portfolio-perturbation");
const INSTRUMENTS = ["diplomatic", "economic", "covert", "military", "assistance"];
/** Every service already late, so a read that only bites under backlog pressure is exercised. */
function underPressure(campaign) {
    const services = Object.fromEntries(SERVICES.map((def) => [def.id, { ...openingService(def, 0), pending: cohorts({ 0: 100, 6: 150, 18: 300, 26: 200 }) }]));
    return { ...campaign, services };
}
function fingerprint(campaign) {
    const charter = campaign.founding.charter;
    const nation = campaign.founding.nation;
    const entries = new Map();
    for (const domain of legislableDomains(campaign)) {
        entries.set(`program:${domain}`, { value: executionQuality(campaign, domain), owners: [domainChair(campaign, domain)] });
    }
    for (const instrument of INSTRUMENTS) {
        const request = { actor: nation, target: nation, instrument };
        entries.set(`stewardship:${instrument}`, { value: stewardSway(campaign, request), owners: [instrumentDepartment(charter, instrument)] });
    }
    for (const account of BUDGET_ACCOUNTS) {
        const owners = (accountDepartments(charter, account) ?? []).map((line) => line.role);
        entries.set(`account:${account}`, { value: appropriationQuality(campaign, account), owners });
    }
    entries.set("war-command", { value: commandQuality(campaign, nation), owners: [instrumentDepartment(charter, "military")] });
    for (const def of INSTITUTION_CATALOG) {
        const runtime = campaign.institutions[def.id];
        if (runtime)
            entries.set(`institution:${def.id}`, { value: deriveImplementationQuality(runtime, def, leaderCompetenceOf(campaign, runtime)), owners: [] });
    }
    for (const def of INSTITUTION_CATALOG) {
        if (def.kind !== "department" || !def.cabinetRole)
            continue;
        entries.set(`directive:${def.id}`, { value: carryOutDirective(campaign, def, "perturbation")?.delayShare ?? 0, owners: [def.cabinetRole] });
    }
    const week = [servicePhase, projectPhase].reduce((state, phase) => phase(state).reduce(apply, state), campaign);
    for (const def of SERVICES) {
        const last = week.services?.[def.id]?.last;
        entries.set(`service:${def.id}:decided`, { value: last?.decided ?? 0, owners: [def.portfolio] });
        entries.set(`service:${def.id}:errors`, { value: last?.errors ?? 0, owners: [def.portfolio] });
    }
    for (const def of PROJECTS) {
        const runtime = week.projects?.[def.id];
        entries.set(`project:${def.id}:review`, { value: runtime?.underway.reduce((sum, project) => sum + project.review, 0) ?? 0, owners: [def.portfolio] });
        entries.set(`project:${def.id}:build`, { value: runtime?.underway.reduce((sum, project) => sum + project.build, 0) ?? 0, owners: [def.portfolio] });
    }
    return entries;
}
function withSecretary(campaign, role, level) {
    const person = selectChairRunner(campaign, role);
    if (!person)
        throw new Error(`nobody runs ${role}`);
    const id = person.base.id;
    const base = { ...person.base, competence: level, integrity: level, loyalty: level, charisma: level };
    return { ...campaign, people: { ...campaign.people, [id]: { ...person, base } } };
}
function moved(role) {
    const start = underPressure(FOUNDED);
    const strong = fingerprint(withSecretary(start, role, 0.95));
    const weak = fingerprint(withSecretary(start, role, 0.15));
    const changed = [...strong.keys()].filter((key) => Math.abs(strong.get(key).value - weak.get(key).value) > 1e-9);
    return {
        own: changed.filter((key) => strong.get(key).owners.includes(role)),
        foreign: changed.filter((key) => !strong.get(key).owners.includes(role)),
    };
}
const seat = (id) => id;
describe("a Secretary moves their own portfolio and nothing else", () => {
    it("State: the diplomatic and assistance instruments and their account, not the visa queue", () => {
        const { own, foreign } = moved(seat("role-foreign-minister"));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining(["stewardship:diplomatic", "stewardship:assistance", "account:diplomatic", "directive:INST-STATE"]));
        expect(own.some((key) => key.startsWith("service:"))).toBe(false);
    });
    it("Treasury: the fiscal program, the economic instrument and its account, not the returns the IRS processes", () => {
        const { own, foreign } = moved(seat("role-treasury-minister"));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining(["program:fiscal", "stewardship:economic", "account:economic"]));
        expect(own.some((key) => key.startsWith("service:"))).toBe(false);
    });
    it("Defense: the defense program, the military instrument, its account and the war, not transfer cases", () => {
        const { own, foreign } = moved(seat("role-defense-minister"));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining(["program:defense", "stewardship:military", "account:military", "war-command"]));
        expect(own.some((key) => key.startsWith("service:"))).toBe(false);
    });
    it("Veterans Affairs: its share of the domestic line and how its late claims are cleared", () => {
        const { own, foreign } = moved(seat("role-veterans-secretary"));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining(["account:domestic", "service:disability-claims:decided", "service:disability-claims:errors"]));
    });
    // The remaining portfolios. Where a portfolio's service is run by a body
    // with its own head, or reads no Secretary, the Secretary's levers are the
    // mechanisms named here and the service must not move.
    it("Justice: the civil program, how fast its directives move, and whether a late caseload is cleared by forced pleas", () => {
        const { own, foreign } = moved(seat("role-attorney-general"));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining(["program:civil", "directive:INST-DOJ", "service:federal-cases:decided", "service:federal-cases:errors"]));
    });
    it("Agriculture: how fast its directives move and whether late applications are cleared by refusals", () => {
        const { own, foreign } = moved(seat("role-agriculture-secretary"));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining(["directive:INST-USDA", "service:farm-payments:decided", "service:farm-payments:errors"]));
    });
    it("Commerce: the industry and trade programs, not the export licenses its bureau processes", () => {
        const { own, foreign } = moved(seat("role-commerce-secretary"));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining(["program:industry", "program:trade", "directive:INST-COMMERCE"]));
        expect(own.some((key) => key.startsWith("service:"))).toBe(false);
    });
    it.each([
        ["Labor", "role-labor-secretary", "INST-LABOR"],
        ["Health and Human Services", "role-health-secretary", "INST-HHS"],
        ["Housing and Urban Development", "role-housing-secretary", "INST-HUD"],
        ["Education", "role-education-secretary", "INST-ED"],
    ])("%s: its share of the domestic line and its directives, not the cases its department decides", (_name, role, department) => {
        const { own, foreign } = moved(seat(role));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining(["account:domestic", `directive:${department}`]));
        expect(own.some((key) => key.startsWith("service:"))).toBe(false);
    });
    it.each([
        ["Homeland Security", "role-homeland-secretary", "INST-DHS"],
        ["Interior", "role-interior-minister", "INST-INTERIOR"],
    ])("%s: how fast its directives move, not the claims or permits its offices decide", (_name, role, department) => {
        const { own, foreign } = moved(seat(role));
        expect(foreign).toEqual([]);
        expect(own).toEqual([`directive:${department}`]);
    });
    it.each([
        ["Transportation", "role-transportation-secretary", "INST-DOT", "highway-grants"],
        ["Energy", "role-energy-secretary", "INST-DOE", "reactor-demonstrations"],
    ])("%s: which projects it awards, so how far through review they arrive, and its directives", (_name, role, department, program) => {
        const { own, foreign } = moved(seat(role));
        expect(foreign).toEqual([]);
        expect(own).toEqual(expect.arrayContaining([`directive:${department}`, `project:${program}:review`]));
        expect(own).not.toContain(`project:${program}:build`);
    });
});
