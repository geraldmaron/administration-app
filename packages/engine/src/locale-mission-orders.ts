/**
 * The orders a federal mission in one state is signed under.
 *
 * A locale act that sends officers or troops into a state signs one of these
 * behind the scenes, and the record it leaves is the legal instrument: the
 * Attorney General reviews it, a state or a private party sues over it, a
 * court can pause it, and a President can rescind it, on the same machinery
 * every other order runs on. They are not in `EXECUTIVE_ORDERS`, so the policy
 * desk never offers one on its own; each is reached only through its act and
 * that act's statutory predicate.
 *
 * Money is not here. The act charges it, so the order carries no
 * `treasuryOfGdp` and a signature cannot bill the same mission twice.
 *
 * This file imports nothing but types from orders.ts, for the reason
 * order-families.ts gives: orders.ts reads this list at load.
 */
import type { ExecutiveOrder, OrderAuthority } from "./orders.js";

// The statutory text was read on Cornell's Legal Information Institute and the
// links below resolve to the official govinfo edition of the Code.
const OPENED = "2026-10-25";

const govinfo = (title: number, section: string): string => `https://www.govinfo.gov/link/uscode/${title}/${section}`;

const statute = (cite: string, name: string, limit: string, source: string): OrderAuthority =>
  ({ kind: "statute", cite, name, limit, source, opened: OPENED });

export const LOCALE_MISSION_ORDERS: readonly ExecutiveOrder[] = [
  {
    id: "order-property-surge",
    name: "Surge federal officers to federal property",
    domain: "security",
    summary: "Send Homeland Security officers to protect the federal buildings in one state and the people on them.",
    requires: { roleHints: ["interior", "security", "home"] },
    overreach: 0.15,
    cost: {},
    nationEffects: {},
    alignment: { authLibertarian: 0.05 },
    authority: statute("40 U.S.C. §1315", "Federal property protection",
      "Federal buildings, grounds and property and the people on them; the streets around them are the state's to police.",
      govinfo(40, "1315")),
  },
  {
    id: "order-immigration-operation",
    name: "Run an immigration enforcement operation",
    domain: "security",
    summary: "Concentrate immigration officers in one state to question and arrest people they believe are removable.",
    requires: { roleHints: ["interior", "security", "home"] },
    overreach: 0.3,
    cost: {},
    nationEffects: {},
    alignment: { authLibertarian: 0.1, nationalistGlobalist: 0.15 },
    domestic: {
      channels: { immigration: -0.35 },
      magnitude: "moderate",
      signature: "order:immigration-operation",
      reason: "Arrests in the neighborhoods fall on immigrant families and the people who live beside them.",
    },
    authority: statute("8 U.S.C. §1357", "The Immigration and Nationality Act",
      "A warrantless arrest needs reason to believe the person is removable and likely to escape before a warrant; it confers no general police power.",
      govinfo(8, "1357")),
  },
  {
    id: "order-joint-task-force",
    name: "Stand up a federal task force",
    domain: "security",
    summary: "Assign Justice Department agents to work federal crimes in one state alongside its own police, at the governor's invitation.",
    requires: { roleHints: ["attorney", "justice", "law"] },
    overreach: 0.05,
    cost: {},
    nationEffects: {},
    alignment: { authLibertarian: 0.03 },
    authority: statute("28 U.S.C. §533", "Investigative officials of the Department of Justice",
      "Detects and prosecutes crimes against the United States; state crimes stay with the state's own police.",
      govinfo(28, "533")),
  },
  {
    id: "order-guard-federalization",
    name: "Call the state's Guard into federal service",
    domain: "emergency",
    summary: "Put one state's National Guard under federal command, through its governor, on one of the statute's three occasions.",
    requires: { roleHints: ["defense"] },
    overreach: 0.45,
    cost: {},
    nationEffects: {},
    alignment: { authLibertarian: 0.2 },
    authority: statute("10 U.S.C. §12406", "National Guard in federal service",
      "Only to repel an invasion, suppress a rebellion, or execute federal law the regular forces cannot; orders go through the governor.",
      govinfo(10, "12406")),
  },
  {
    id: "order-insurrection-proclamation",
    name: "Proclaim the insurgents to disperse",
    domain: "emergency",
    summary: "Order by proclamation that those obstructing the law in one state disperse within a limited time.",
    requires: {},
    overreach: 0.2,
    cost: {},
    nationEffects: {},
    alignment: { authLibertarian: 0.1 },
    authority: statute("10 U.S.C. §254", "The Insurrection Act",
      "The proclamation must come first; by itself it moves no soldier, and it rests on one of the Act's occasions.",
      govinfo(10, "254")),
  },
  {
    id: "order-insurrection-request",
    name: "Send troops at the governor's request",
    domain: "emergency",
    summary: "Send active-duty troops to help one state's own authorities suppress an insurrection its governor has asked for help with.",
    requires: { roleHints: ["defense"] },
    overreach: 0.1,
    cost: {},
    nationEffects: {},
    alignment: { authLibertarian: 0.1 },
    authority: statute("10 U.S.C. §251", "The Insurrection Act",
      "Only on the request of the state's legislature, or its governor when the legislature cannot be convened.",
      govinfo(10, "251")),
  },
  {
    id: "order-insurrection-enforcement",
    name: "Send troops to enforce federal law",
    domain: "emergency",
    summary: "Send active-duty troops into one state, over its government, to enforce federal law or protect rights the state will not.",
    requires: { roleHints: ["defense"] },
    overreach: 0.55,
    cost: {},
    nationEffects: {},
    alignment: { authLibertarian: 0.25 },
    authority: statute("10 U.S.C. §§252-253", "The Insurrection Act",
      "Only where obstruction makes federal law unenforceable in the courts, or violence denies rights the state will not protect; beyond that mission the Posse Comitatus Act (18 U.S.C. §1385) bars the troops.",
      govinfo(10, "252")),
  },
];
