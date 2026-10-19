import { CHARTER_USA_CONSTITUTION, type RoleId } from "@admin/world";
import type { InstrumentId } from "./instruments.js";
import type { PolicyDomain } from "./policy.js";
import type { Campaign } from "./state.js";

// What a department answers for: the instruments it wields, the program
// domains it delivers, the kinds of matter its secretary is asked about, and
// the accounts it spends. One record per chair, so every reader that has to
// ask "whose is this" asks the same question and gets the same answer.
//
// Written out for the United States rather than matched by hint. Role ids are
// shared across charters, and a hint that is right for one constitution is
// wrong for another: "interior" is a home ministry in a parliamentary republic
// and a lands department in Washington, so matching on it put the Secretary of
// the Interior in the room for riots, prosecutions and state funerals. Matching
// also re-routed a department's business to whichever seat matched next the
// week its chair fell vacant, so a Treasury resignation handed sanctions to
// Commerce. A table names the department, filled or not. Charters nobody has
// written a table for keep their hints, which is all a generic constitution
// can honestly say.

export type BudgetAccountId = InstrumentId | "domestic";

export type DepartmentOwnership = {
  readonly role: RoleId;
  readonly instruments: readonly InstrumentId[];
  readonly policyDomains: readonly PolicyDomain[];
  readonly scenarioClasses: readonly string[];
  readonly budgetAccounts: readonly BudgetAccountId[];
};

/** One department's part of an account several departments spend. */
export type DepartmentShare = { readonly role: RoleId; readonly share: number };

const seat = (id: string): RoleId => id as RoleId;
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

type OwnershipTable = {
  readonly instruments: Readonly<Record<InstrumentId, RoleId>>;
  readonly policyDomains: Readonly<Record<PolicyDomain, RoleId>>;
  /** Each class's departments in the order their standing runs; the first owns the matter. */
  readonly scenarioClasses: Readonly<Record<string, readonly RoleId[]>>;
  /** Who a spoken answer on a matter of no known class goes to, at home and abroad. */
  readonly unclassed: { readonly home: RoleId; readonly abroad: RoleId };
  /** The domestic line, by the discretionary appropriations each department spends out of it. */
  readonly domestic: readonly { readonly role: RoleId; readonly billions: number }[];
  /** The department that carries out each executive order, by order id. */
  readonly orders: Readonly<Record<string, RoleId>>;
  /** The chair every proposed order goes to for form and legality before it is signed. */
  readonly orderReview: RoleId;
};

const US_TABLE: OwnershipTable = {
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

const TABLES: Readonly<Record<string, OwnershipTable>> = { [CHARTER_USA_CONSTITUTION.id]: US_TABLE };

function tableFor(charter: string): OwnershipTable | undefined {
  return TABLES[charter];
}

/** The department that wields an instrument, or undefined where the charter has no table. */
export function instrumentDepartment(charter: string, instrument: InstrumentId): RoleId | undefined {
  return tableFor(charter)?.instruments[instrument];
}

/** The department that delivers a program domain, or undefined where the charter has no table. */
export function policyDomainDepartment(charter: string, domain: PolicyDomain): RoleId | undefined {
  return tableFor(charter)?.policyDomains[domain];
}

/**
 * The departments with standing in a class of matter, owner first, or undefined
 * where the charter has no table. A tabled charter answers an unknown class with
 * nobody rather than a guess.
 */
export function scenarioClassDepartments(charter: string, scenarioClass: string | undefined): readonly RoleId[] | undefined {
  const table = tableFor(charter);
  if (!table) return undefined;
  return scenarioClass === undefined ? [] : (table.scenarioClasses[scenarioClass] ?? []);
}

/** Who a spoken answer on a matter of no known class goes to, or undefined where the charter has no table. */
export function unclassedDepartment(charter: string, atHome: boolean): RoleId | undefined {
  const fallback = tableFor(charter)?.unclassed;
  return fallback ? (atHome ? fallback.home : fallback.abroad) : undefined;
}

/** The department that carries out an executive order, or undefined where the charter has no table or no row for it. */
export function orderDepartment(charter: string, orderId: string): RoleId | undefined {
  return tableFor(charter)?.orders[orderId];
}

/** The chair that reviews a proposed order for form and legality, or undefined where the charter has no table. */
export function orderReviewer(charter: string): RoleId | undefined {
  return tableFor(charter)?.orderReview;
}

/**
 * The departments that spend an account, each with the share it spends, or
 * undefined where the charter has no table. An instrument's account is its
 * department's alone; the domestic line is split by appropriation.
 */
export function accountDepartments(charter: string, account: BudgetAccountId): readonly DepartmentShare[] | undefined {
  const table = tableFor(charter);
  if (!table) return undefined;
  if (account !== "domestic") return [{ role: table.instruments[account], share: 1 }];
  const total = table.domestic.reduce((sum, line) => sum + line.billions, 0);
  return table.domestic.map((line) => ({ role: line.role, share: line.billions / total }));
}

const INSTRUMENT_ACCOUNTS: readonly InstrumentId[] = ["diplomatic", "economic", "covert", "military"];

function keysOwnedBy<K extends string>(record: Readonly<Record<K, RoleId>>, role: RoleId): K[] {
  return (Object.keys(record) as K[]).filter((key) => record[key] === role);
}

/** The department a chair runs, or nothing where the chair owns no instrument, program or account. */
export function ownershipOf(campaign: Campaign, role: RoleId): DepartmentOwnership | undefined {
  const table = tableFor(campaign.founding.charter);
  if (!table || role === campaign.founding.leadRole) return undefined;
  const instruments = keysOwnedBy(table.instruments, role);
  const budgetAccounts: BudgetAccountId[] = [
    ...INSTRUMENT_ACCOUNTS.filter((account) => table.instruments[account] === role),
    ...(table.domestic.some((line) => line.role === role) ? (["domestic"] as const) : []),
  ];
  const ownership: DepartmentOwnership = {
    role,
    instruments,
    policyDomains: keysOwnedBy(table.policyDomains, role),
    scenarioClasses: Object.keys(table.scenarioClasses).filter((cls) => table.scenarioClasses[cls]!.includes(role)),
    budgetAccounts,
  };
  const empty =
    ownership.instruments.length + ownership.policyDomains.length + ownership.scenarioClasses.length + budgetAccounts.length === 0;
  return empty ? undefined : ownership;
}
