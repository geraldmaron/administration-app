import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import { apply } from "./effects.js";
import { selectChairRunner, vacates } from "./appointments.js";
import { commandQuality } from "./war-tick.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { appropriationQuality } from "./budget.js";
import * as ownership from "./department-ownership.js";
import { accountDepartments, ownershipOf } from "./department-ownership.js";
import { INSTRUMENT_IDS } from "./instruments.js";
import { EXECUTIVE_ORDERS, executiveOrder, orderChair, orderMinister } from "./orders.js";
import { CARETAKER_QUALITY, POLICY_DOMAINS, POLICY_QUALITY_RANGE, domainChair } from "./policy.js";
import { budgetChair, CLASSES_WITH_SEATED_STANDING, classRoles, domainRole, ministerFor } from "./stewardship.js";
import { campaignPhaseSequence } from "./turn-phases.js";
// Which secretary answers for what, read the way a player reads a cabinet:
// by title. The expected answers are written out here from the government's
// own organization, not derived from the table, so a wrong row fails.
const { campaign: US } = foundedForBalance("department-ownership");
const title = (role) => role === undefined ? undefined : CHARTER_USA_CONSTITUTION.roleTitles?.[role];
const INSTRUMENT_OWNERS = {
    diplomatic: "Secretary of State",
    economic: "Secretary of the Treasury",
    covert: "Director of National Intelligence",
    military: "Secretary of Defense",
    assistance: "Secretary of State",
};
const DOMAIN_OWNERS = {
    fiscal: "Secretary of the Treasury",
    industry: "Secretary of Commerce",
    trade: "Secretary of Commerce",
    civil: "Attorney General",
    security: "Director of National Intelligence",
    defense: "Secretary of Defense",
};
const CLASS_OWNERS = {
    tragedy: "Secretary of Homeland Security",
    terror: "Secretary of Defense",
    unrest: "Secretary of Homeland Security",
    disaster: "Secretary of Homeland Security",
    "public-health": "Secretary of Health and Human Services",
    migration: "Secretary of Homeland Security",
    "foreign-crisis": "Secretary of State",
    war: "Secretary of Defense",
    espionage: "Director of National Intelligence",
    hostage: "Secretary of State",
    technology: "Secretary of Homeland Security",
    economy: "Secretary of the Treasury",
    scandal: "Attorney General",
    justice: "Attorney General",
    institution: "Attorney General",
    culture: "Secretary of Education",
    death: "Secretary of State",
    triumph: "Secretary of the Treasury",
};
const ACCOUNT_OWNERS = {
    diplomatic: "Secretary of State",
    economic: "Secretary of the Treasury",
    covert: "Director of National Intelligence",
    military: "Secretary of Defense",
};
const DOMESTIC_SPENDERS = [
    "Secretary of Veterans Affairs",
    "Secretary of Health and Human Services",
    "Secretary of Education",
    "Secretary of Housing and Urban Development",
    "Secretary of Labor",
];
const roleTitled = (name) => Object.entries(CHARTER_USA_CONSTITUTION.roleTitles ?? {}).find(([, t]) => t === name)[0];
function vacate(campaign, role) {
    const cabinet = { ...campaign.player.cabinet };
    delete cabinet[role];
    return { ...campaign, player: { ...campaign.player, cabinet } };
}
/** The same campaign with the acting Secretary confirmed into the chair. */
function withActingAsSecretary(campaign, role, person) {
    return { ...campaign, player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [role]: person } } };
}
function withCompetence(campaign, role, competence) {
    const id = campaign.player.cabinet[role];
    const runtime = campaign.people[id];
    return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, competence } } } };
}
describe("the United States ownership table", () => {
    it("names the secretary who wields every instrument", () => {
        for (const instrument of INSTRUMENT_IDS)
            expect([instrument, title(domainRole(US, instrument))]).toEqual([instrument, INSTRUMENT_OWNERS[instrument]]);
    });
    it("names the secretary who delivers every program domain", () => {
        for (const domain of POLICY_DOMAINS)
            expect([domain, title(domainChair(US, domain))]).toEqual([domain, DOMAIN_OWNERS[domain]]);
    });
    it("names the secretary who owns every class of matter, and gives the Interior no police brief", () => {
        expect(Object.keys(CLASS_OWNERS).sort()).toEqual([...CLASSES_WITH_SEATED_STANDING].sort());
        for (const cls of CLASSES_WITH_SEATED_STANDING)
            expect([cls, title(classRoles(US, cls)[0])]).toEqual([cls, CLASS_OWNERS[cls]]);
        const interior = roleTitled("Secretary of the Interior");
        for (const cls of ["tragedy", "unrest", "justice", "institution", "death"])
            expect(classRoles(US, cls)).not.toContain(interior);
        expect(ownershipOf(US, interior)?.scenarioClasses).toEqual(["disaster", "culture"]);
    });
    it("names the secretary who spends every budget account, and splits the domestic line by what each spends", () => {
        for (const [account, owner] of Object.entries(ACCOUNT_OWNERS)) {
            expect(accountDepartments(US.founding.charter, account).map((line) => title(line.role))).toEqual([owner]);
        }
        const domestic = accountDepartments(US.founding.charter, "domestic");
        expect(domestic.map((line) => title(line.role)).sort()).toEqual([...DOMESTIC_SPENDERS].sort());
        expect(domestic.reduce((sum, line) => sum + line.share, 0)).toBeCloseTo(1, 9);
        expect(budgetChair(US, "domestic")?.base.id).toBe(US.player.cabinet[roleTitled("Secretary of Veterans Affairs")]);
    });
    it("prices each department's share of the domestic line at its own secretary's competence", () => {
        const health = roleTitled("Secretary of Health and Human Services");
        const share = accountDepartments(US.founding.charter, "domestic").find((line) => line.role === health).share;
        const weak = appropriationQuality(withCompetence(US, health, 0), "domestic");
        const strong = appropriationQuality(withCompetence(US, health, 1), "domestic");
        expect(strong - weak).toBeCloseTo(share * POLICY_QUALITY_RANGE, 2);
    });
    it("keeps a department's business with it while its chair is empty", () => {
        const treasury = roleTitled("Secretary of the Treasury");
        const vacant = vacate(US, treasury);
        expect(domainRole(vacant, "economic")).toBe(treasury);
        expect(ministerFor(vacant, "economic")).toBeUndefined();
        expect(appropriationQuality(vacant, "economic")).toBe(CARETAKER_QUALITY);
        expect(classRoles(vacant, "economy")).not.toContain(treasury);
    });
    it("runs a department's instrument, account and war through the deputy acting in an empty chair", () => {
        const defense = roleTitled("Secretary of Defense");
        const resigned = apply(US, {
            source: "action",
            actor: "player",
            turn: US.turn,
            narration: { summary: "The Secretary resigns." },
            effects: vacates(US, defense, "resigned", US.player.cabinet[defense]),
        });
        const acting = selectChairRunner(resigned, defense);
        expect(resigned.player.cabinet[defense]).toBeUndefined();
        expect(ministerFor(resigned, "military")?.base.id).toBe(acting.base.id);
        expect(appropriationQuality(resigned, "military")).toBeCloseTo(CARETAKER_QUALITY + POLICY_QUALITY_RANGE * acting.base.competence, 3);
        expect(commandQuality(resigned, resigned.founding.nation)).toBe(commandQuality(withActingAsSecretary(resigned, defense, acting.base.id), resigned.founding.nation));
    });
    it("agrees with every reader, chair by chair", () => {
        for (const role of Object.keys(US.player.cabinet)) {
            const record = ownershipOf(US, role);
            if (role === US.founding.leadRole) {
                expect(record).toBeUndefined();
                continue;
            }
            expect(record?.instruments ?? []).toEqual(INSTRUMENT_IDS.filter((instrument) => domainRole(US, instrument) === role));
            expect(record?.policyDomains ?? []).toEqual(POLICY_DOMAINS.filter((domain) => domainChair(US, domain) === role));
            expect(record?.scenarioClasses ?? []).toEqual(CLASSES_WITH_SEATED_STANDING.filter((cls) => classRoles(US, cls).includes(role)));
        }
    });
});
const ORDER_OWNERS = {
    "order-border-controls": "Secretary of Homeland Security",
    "order-entry-suspension": "Secretary of Homeland Security",
    "order-force-protection": "Secretary of Homeland Security",
    "order-relief-program": "Secretary of Homeland Security",
    "order-price-controls": "Secretary of the Treasury",
    "order-regulatory-review": "Secretary of the Treasury",
    "order-asset-seizure": "Secretary of the Treasury",
    "order-grant-conditions": "Attorney General",
    "order-energy-leasing": "Secretary of the Interior",
    "order-clean-energy": "Secretary of Energy",
    "order-defense-production": "Secretary of Defense",
    "order-emergency-construction": "Secretary of Defense",
};
describe("who carries out an executive order in the United States", () => {
    const seatOf = (id) => Object.entries(US.player.cabinet).find(([, person]) => person === id)?.[0];
    it("prices a border order through Homeland Security, not the lands department", () => {
        const order = executiveOrder("order-border-controls");
        expect(title(seatOf(orderMinister(US, order)?.base.id))).toBe("Secretary of Homeland Security");
    });
    it("names the department for every order in the catalogue, by the statute it runs on", () => {
        expect(EXECUTIVE_ORDERS.map((order) => order.id).sort()).toEqual(Object.keys(ORDER_OWNERS).sort());
        for (const order of EXECUTIVE_ORDERS)
            expect([order.id, title(orderChair(US, order))]).toEqual([order.id, ORDER_OWNERS[order.id]]);
    });
    it("signs an order through its own department or not at all while that chair is empty", () => {
        const homeland = roleTitled("Secretary of Homeland Security");
        const order = executiveOrder("order-border-controls");
        const vacant = vacate(US, homeland);
        expect(orderChair(vacant, order)).toBe(homeland);
        expect(orderMinister(vacant, order)).toBeUndefined();
    });
    it("sends every proposed order to the Attorney General for form and legality", () => {
        expect(title(ownership.orderReviewer(US.founding.charter))).toBe("Attorney General");
    });
});
describe("a charter with no ownership table", () => {
    it("has no department records and answers by hint", () => {
        const generic = buildCampaign();
        const seat = Object.keys(generic.player.cabinet)[0];
        expect(ownershipOf(generic, seat)).toBeUndefined();
        expect(accountDepartments(generic.founding.charter, "domestic")).toBeUndefined();
        expect(ownership.instrumentDepartment(generic.founding.charter, "military")).toBeUndefined();
        expect(ownership.policyDomainDepartment(generic.founding.charter, "fiscal")).toBeUndefined();
        expect(ownership.scenarioClassDepartments(generic.founding.charter, "war")).toBeUndefined();
        expect(ownership.unclassedDepartment(generic.founding.charter, true)).toBeUndefined();
        expect(ownership.orderDepartment(generic.founding.charter, "order-border-controls")).toBeUndefined();
        expect(ownership.orderReviewer(generic.founding.charter)).toBeUndefined();
    });
});
describe("the table adds no weekly writer", () => {
    it("is read, never run: no turn phase is the table's and the module exports only readers", () => {
        const phases = campaignPhaseSequence(CHARTER_USA_CONSTITUTION).map((phase) => phase.id);
        expect(phases.filter((id) => /owner|department/i.test(id))).toEqual([]);
        expect(Object.keys(ownership).sort()).toEqual([
            "accountDepartments",
            "instrumentDepartment",
            "orderDepartment",
            "orderReviewer",
            "ownershipOf",
            "policyDomainDepartment",
            "scenarioClassDepartments",
            "unclassedDepartment",
        ]);
    });
});
