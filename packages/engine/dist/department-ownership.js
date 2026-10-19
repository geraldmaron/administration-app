import { CHARTER_USA_CONSTITUTION } from "@admin/world";
const seat = (id) => id;
const STATE = seat("role-foreign-minister");
const TREASURY = seat("role-treasury-minister");
const DEFENSE = seat("role-defense-minister");
const JUSTICE = seat("role-attorney-general");
const INTERIOR = seat("role-interior-minister");
const AGRICULTURE = seat("role-agriculture-secretary");
const COMMERCE = seat("role-commerce-secretary");
const LABOR = seat("role-labor-secretary");
const HEALTH = seat("role-health-secretary");
const HOUSING = seat("role-housing-secretary");
const TRANSPORTATION = seat("role-transportation-secretary");
const ENERGY = seat("role-energy-secretary");
const EDUCATION = seat("role-education-secretary");
const VETERANS = seat("role-veterans-secretary");
const HOMELAND = seat("role-homeland-secretary");
const INTELLIGENCE = seat("role-intelligence-director");
const US_TABLE = {
    // Aid runs through State, which absorbed the development agency; sanctions
    // and the exchange fund are Treasury's; covert action is the intelligence
    // community's under the Director.
    instruments: { diplomatic: STATE, economic: TREASURY, covert: INTELLIGENCE, military: DEFENSE, assistance: STATE },
    policyDomains: {
        fiscal: TREASURY,
        industry: COMMERCE,
        trade: COMMERCE,
        civil: JUSTICE,
        security: INTELLIGENCE,
        defense: DEFENSE,
    },
    // Interior keeps the classes its lands, parks and heritage sites give it
    // standing in (a disaster on federal land, a fight over a monument) and
    // nothing a police ministry would answer for.
    scenarioClasses: {
        tragedy: [HOMELAND, HEALTH, TRANSPORTATION],
        terror: [DEFENSE, HOMELAND, INTELLIGENCE, JUSTICE],
        unrest: [HOMELAND, JUSTICE, LABOR, HOUSING],
        disaster: [HOMELAND, INTERIOR, HEALTH, ENERGY, HOUSING],
        "public-health": [HEALTH, HOMELAND, AGRICULTURE],
        migration: [HOMELAND, STATE, JUSTICE, LABOR],
        "foreign-crisis": [STATE, DEFENSE, INTELLIGENCE],
        war: [DEFENSE, STATE, INTELLIGENCE, VETERANS],
        espionage: [INTELLIGENCE, JUSTICE, DEFENSE],
        hostage: [STATE, DEFENSE, INTELLIGENCE],
        technology: [HOMELAND, COMMERCE, INTELLIGENCE, ENERGY],
        economy: [TREASURY, COMMERCE, LABOR],
        scandal: [JUSTICE, TREASURY],
        justice: [JUSTICE, HOMELAND],
        institution: [JUSTICE, DEFENSE],
        culture: [EDUCATION, INTERIOR, JUSTICE],
        death: [STATE, VETERANS],
        triumph: [TREASURY, STATE, COMMERCE],
    },
    unclassed: { home: HOMELAND, abroad: STATE },
    // Each department's discretionary appropriation, in billions of dollars and
    // rounded to five, which is the scale the split needs: it decides whose
    // competence prices how much of the line, not a figure the player reads.
    domestic: [
        { role: VETERANS, billions: 135 },
        { role: HEALTH, billions: 130 },
        { role: EDUCATION, billions: 80 },
        { role: HOUSING, billions: 70 },
        { role: LABOR, billions: 15 },
    ],
    // By the statute each order runs on, not by its domain: an emergency power
    // under IEEPA is Treasury's to administer and one under §2808 is Defense's,
    // and leasing federal acreage is the Interior's whatever the order is about.
    orders: {
        "order-border-controls": HOMELAND,
        "order-entry-suspension": HOMELAND,
        "order-force-protection": HOMELAND,
        "order-relief-program": HOMELAND,
        "order-price-controls": TREASURY,
        "order-regulatory-review": TREASURY,
        "order-asset-seizure": TREASURY,
        "order-grant-conditions": JUSTICE,
        "order-energy-leasing": INTERIOR,
        "order-clean-energy": ENERGY,
        "order-defense-production": DEFENSE,
        "order-emergency-construction": DEFENSE,
    },
    // Proposed orders go to the Attorney General for form and legality before
    // the President signs them (Executive Order 11030, as amended).
    orderReview: JUSTICE,
};
const TABLES = { [CHARTER_USA_CONSTITUTION.id]: US_TABLE };
function tableFor(charter) {
    return TABLES[charter];
}
/** The department that wields an instrument, or undefined where the charter has no table. */
export function instrumentDepartment(charter, instrument) {
    return tableFor(charter)?.instruments[instrument];
}
/** The department that delivers a program domain, or undefined where the charter has no table. */
export function policyDomainDepartment(charter, domain) {
    return tableFor(charter)?.policyDomains[domain];
}
/**
 * The departments with standing in a class of matter, owner first, or undefined
 * where the charter has no table. A tabled charter answers an unknown class with
 * nobody rather than a guess.
 */
export function scenarioClassDepartments(charter, scenarioClass) {
    const table = tableFor(charter);
    if (!table)
        return undefined;
    return scenarioClass === undefined ? [] : (table.scenarioClasses[scenarioClass] ?? []);
}
/** Who a spoken answer on a matter of no known class goes to, or undefined where the charter has no table. */
export function unclassedDepartment(charter, atHome) {
    const fallback = tableFor(charter)?.unclassed;
    return fallback ? (atHome ? fallback.home : fallback.abroad) : undefined;
}
/** The department that carries out an executive order, or undefined where the charter has no table or no row for it. */
export function orderDepartment(charter, orderId) {
    return tableFor(charter)?.orders[orderId];
}
/** The chair that reviews a proposed order for form and legality, or undefined where the charter has no table. */
export function orderReviewer(charter) {
    return tableFor(charter)?.orderReview;
}
/**
 * The departments that spend an account, each with the share it spends, or
 * undefined where the charter has no table. An instrument's account is its
 * department's alone; the domestic line is split by appropriation.
 */
export function accountDepartments(charter, account) {
    const table = tableFor(charter);
    if (!table)
        return undefined;
    if (account !== "domestic")
        return [{ role: table.instruments[account], share: 1 }];
    const total = table.domestic.reduce((sum, line) => sum + line.billions, 0);
    return table.domestic.map((line) => ({ role: line.role, share: line.billions / total }));
}
const INSTRUMENT_ACCOUNTS = ["diplomatic", "economic", "covert", "military"];
function keysOwnedBy(record, role) {
    return Object.keys(record).filter((key) => record[key] === role);
}
/** The department a chair runs, or nothing where the chair owns no instrument, program or account. */
export function ownershipOf(campaign, role) {
    const table = tableFor(campaign.founding.charter);
    if (!table || role === campaign.founding.leadRole)
        return undefined;
    const instruments = keysOwnedBy(table.instruments, role);
    const budgetAccounts = [
        ...INSTRUMENT_ACCOUNTS.filter((account) => table.instruments[account] === role),
        ...(table.domestic.some((line) => line.role === role) ? ["domestic"] : []),
    ];
    const ownership = {
        role,
        instruments,
        policyDomains: keysOwnedBy(table.policyDomains, role),
        scenarioClasses: Object.keys(table.scenarioClasses).filter((cls) => table.scenarioClasses[cls].includes(role)),
        budgetAccounts,
    };
    const empty = ownership.instruments.length + ownership.policyDomains.length + ownership.scenarioClasses.length + budgetAccounts.length === 0;
    return empty ? undefined : ownership;
}
