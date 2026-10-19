import type { InstitutionId } from "./institutions.js";

// The eighteen elements of the intelligence community, with the boundary each
// one is actually bounded by.
//
// A data table. What makes it worth having as its own list rather than as a
// filter over the institution catalog is the boundary column: the catalog
// knows that the CIA is a semi-autonomous body with a director, and it does
// not know that the CIA has no police powers, that only the NSA may collect
// signals intelligence, or that most of this list may collect nothing that is
// not already public. Those are the facts that decide whether a request the
// president makes has anyone at all who could lawfully carry it out.
//
// Two of the eighteen are independent and sixteen are components of six
// departments. Where the institution catalog already carries the body, the
// element points at it and reads its capacity from there rather than keeping a
// second opinion about how well it is running.

export type IcElementId =
  | "IC-ODNI"
  | "IC-CIA"
  | "IC-NSA"
  | "IC-DIA"
  | "IC-NGA"
  | "IC-NRO"
  | "IC-AF"
  | "IC-SPACE"
  | "IC-ARMY"
  | "IC-USMC"
  | "IC-NAVY"
  | "IC-FBI"
  | "IC-DEA"
  | "IC-DHS"
  | "IC-USCG"
  | "IC-INR"
  | "IC-TREASURY"
  | "IC-DOE";

export type Discipline = "humint" | "sigint" | "geoint" | "masint" | "osint" | "finint" | "all-source";

/**
 * What the element may collect, which is the first question any tasking runs
 * into. `overt-only` is not a weakness, it is the statutory position of most of
 * this list: they analyze what is collected elsewhere and what is already
 * public, and pointing one of them at a clandestine question does not produce
 * a clandestine answer.
 */
export type CollectionAuthority = "clandestine" | "technical" | "overt-only";

/** What the element may lawfully do inside the United States. */
export type DomesticAuthority = "none" | "counterintelligence-under-ag" | "law-enforcement" | "homeland-analysis";

export type IcElementDef = {
  readonly id: IcElementId;
  readonly name: string;
  readonly abbr: string;
  /** "Independent" for the two that answer to nobody's secretary. */
  readonly parent: string;
  /** The catalog body this element is, where the catalog carries one. */
  readonly institution?: InstitutionId;
  readonly disciplines: readonly Discipline[];
  readonly collection: CollectionAuthority;
  readonly domestic: DomesticAuthority;
  /** Only one element may run covert action absent a presidential determination that another is better placed. */
  readonly covertAction: boolean;
  /** Relative weight in an all-source judgment. Not headcount: how much the finished product leans on it. */
  readonly analyticWeight: number;
  /** Stated plainly, because the player reads these when a request is refused. */
  readonly boundary: string;
};

export const IC_ELEMENTS: readonly IcElementDef[] = [
  {
    id: "IC-ODNI",
    name: "Office of the Director of National Intelligence",
    abbr: "ODNI",
    parent: "Independent",
    institution: "INST-ODNI",
    disciplines: ["all-source", "osint"],
    collection: "overt-only",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.14,
    boundary:
      "Integrates and sets standards. It collects nothing that is not overt or already public, and it cannot task a judgment into existence.",
  },
  {
    id: "IC-CIA",
    name: "Central Intelligence Agency",
    abbr: "CIA",
    parent: "Independent",
    institution: "INST-CIA",
    disciplines: ["humint", "all-source"],
    collection: "clandestine",
    domestic: "none",
    covertAction: true,
    analyticWeight: 0.2,
    boundary: "No police, subpoena or law enforcement powers, and no internal security function inside the United States.",
  },
  {
    id: "IC-NSA",
    name: "National Security Agency",
    abbr: "NSA",
    parent: "Defense",
    institution: "INST-NSA",
    disciplines: ["sigint"],
    collection: "technical",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.16,
    boundary:
      "Signals intelligence for foreign intelligence and counterintelligence purposes, and no other agency may run signals intelligence without a delegation.",
  },
  {
    id: "IC-DIA",
    name: "Defense Intelligence Agency",
    abbr: "DIA",
    parent: "Defense",
    institution: "INST-DIA",
    disciplines: ["humint", "all-source", "masint"],
    collection: "clandestine",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.13,
    boundary: "Defense and defense-related intelligence for military decisions. It answers a military question, not a political one.",
  },
  {
    id: "IC-NGA",
    name: "National Geospatial-Intelligence Agency",
    abbr: "NGA",
    parent: "Defense",
    institution: "INST-NGA",
    disciplines: ["geoint"],
    collection: "technical",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.09,
    boundary: "Geospatial intelligence. It maps and images; it does not run sources.",
  },
  {
    id: "IC-NRO",
    name: "National Reconnaissance Office",
    abbr: "NRO",
    parent: "Defense",
    institution: "INST-NRO",
    disciplines: ["geoint", "sigint"],
    collection: "technical",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.05,
    boundary: "Builds, launches and operates overhead systems. It produces no finished analysis at all.",
  },
  {
    id: "IC-AF",
    name: "Air Force Intelligence, Surveillance and Reconnaissance",
    abbr: "AF/A2",
    parent: "Defense",
    disciplines: ["geoint", "sigint", "all-source"],
    collection: "technical",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.03,
    boundary: "Service intelligence for air and ISR operations, under departmental control.",
  },
  {
    id: "IC-SPACE",
    name: "Space Force Intelligence",
    abbr: "S-2",
    parent: "Defense",
    disciplines: ["geoint", "masint"],
    collection: "technical",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.02,
    boundary: "Service intelligence for the space domain, under departmental control.",
  },
  {
    id: "IC-ARMY",
    name: "Army Intelligence",
    abbr: "G-2",
    parent: "Defense",
    disciplines: ["humint", "all-source"],
    collection: "technical",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.03,
    boundary: "Service intelligence for land operations, under departmental control.",
  },
  {
    id: "IC-USMC",
    name: "Marine Corps Intelligence, Surveillance and Reconnaissance Enterprise",
    abbr: "MCISR-E",
    parent: "Defense",
    disciplines: ["all-source"],
    collection: "technical",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.02,
    boundary: "Service intelligence for expeditionary operations, under departmental control.",
  },
  {
    id: "IC-NAVY",
    name: "Office of Naval Intelligence",
    abbr: "N2",
    parent: "Defense",
    disciplines: ["all-source", "masint"],
    collection: "technical",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.03,
    boundary: "Service intelligence for maritime operations, under departmental control.",
  },
  {
    id: "IC-FBI",
    name: "Federal Bureau of Investigation, Intelligence Branch",
    abbr: "FBI",
    parent: "Justice",
    institution: "INST-FBI",
    disciplines: ["humint", "all-source"],
    collection: "clandestine",
    domestic: "counterintelligence-under-ag",
    covertAction: false,
    analyticWeight: 0.06,
    boundary:
      "Operates under the supervision of the Attorney General and guidelines the Attorney General approved. Investigative authority is the Attorney General's, delegated — not the President's to exercise directly.",
  },
  {
    id: "IC-DEA",
    name: "Drug Enforcement Administration, Office of National Security Intelligence",
    abbr: "DEA/ONSI",
    parent: "Justice",
    institution: "INST-DEA",
    disciplines: ["osint", "all-source"],
    collection: "overt-only",
    domestic: "law-enforcement",
    covertAction: false,
    analyticWeight: 0.01,
    boundary: "Narcotics-related national security intelligence, collected overtly or from publicly available sources.",
  },
  {
    id: "IC-DHS",
    name: "Office of Intelligence and Analysis, Homeland Security",
    abbr: "DHS I&A",
    parent: "Homeland Security",
    institution: "INST-DHS-IA",
    disciplines: ["osint", "all-source"],
    collection: "overt-only",
    domestic: "homeland-analysis",
    covertAction: false,
    analyticWeight: 0.02,
    boundary: "Homeland threat analysis from overt or publicly available collection.",
  },
  {
    id: "IC-USCG",
    name: "Coast Guard Intelligence",
    abbr: "CG-2",
    parent: "Homeland Security",
    disciplines: ["all-source"],
    collection: "technical",
    domestic: "law-enforcement",
    covertAction: false,
    analyticWeight: 0.02,
    boundary: "Maritime intelligence and counterintelligence, with defense provisions applying when it operates as part of the Department of Defense.",
  },
  {
    id: "IC-INR",
    name: "Bureau of Intelligence and Research",
    abbr: "INR",
    parent: "State",
    institution: "INST-INR",
    disciplines: ["all-source", "osint"],
    collection: "overt-only",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.05,
    boundary:
      "All-source analysis for diplomacy from overt collection. It runs no collection of its own, and its dissent is written into the product rather than filed beside it.",
  },
  {
    id: "IC-TREASURY",
    name: "Office of Intelligence and Analysis, Treasury",
    abbr: "Treasury OIA",
    parent: "Treasury",
    institution: "INST-OIA",
    disciplines: ["finint", "osint"],
    collection: "overt-only",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.02,
    boundary: "Financial intelligence from overt or publicly available sources.",
  },
  {
    id: "IC-DOE",
    name: "Office of Intelligence and Counterintelligence, Energy",
    abbr: "DOE I&CI",
    parent: "Energy",
    institution: "INST-DOE",
    disciplines: ["masint", "all-source"],
    collection: "overt-only",
    domestic: "none",
    covertAction: false,
    analyticWeight: 0.02,
    boundary: "Nuclear and energy intelligence from overt or publicly available sources.",
  },
];

const BY_ID: ReadonlyMap<IcElementId, IcElementDef> = new Map(IC_ELEMENTS.map((def) => [def.id, def]));

export function icElement(id: IcElementId): IcElementDef | undefined {
  return BY_ID.get(id);
}
