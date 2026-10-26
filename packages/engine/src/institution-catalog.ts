import type { InstitutionDef, InstitutionId } from "./institutions.js";

// The federal government as a catalog, not as a cabinet table.
//
// The executive branch was seven charter seats. Seven seats cannot answer the
// questions this game asks — which agency executes a policy, what a vacancy
// costs, who holds an authority the President wants used, what a budget cut
// does to a backlog — because none of those are properties of a chair. They
// are properties of an institution with a mandate, an authority, a staff and
// a leader who may or may not be there.
//
// This file is a data table and is deliberately flat. The rules that read it
// live in institutions.ts; the confirmation machinery that reads its offices
// lives in nomination.ts. Nothing here is a function.
//
// Fictional officeholders, real institutions. Names, mandates, authorities and
// appointment models are the actual structure of the United States government.
// No current real-world officeholder appears anywhere in this catalog or in
// anything seeded from it: the people are the campaign's own cast.

// Capacity and staff scale are both 0..1 readings rather than headcounts.
// A headcount would be a number the game cannot honestly source for every
// entry and cannot use for anything a ratio would not do better: what the
// simulation needs is "how much of what is asked of this body can it actually
// do", and that is a fraction by construction.

// --- Table builders --------------------------------------------------------
// These are not logic: each returns a literal list. They exist so the fifteen
// departments and the twenty-odd components do not have to repeat the same
// eight identical fields, which is how a data table gets a transcription error
// nobody spots.

type Dept = {
  readonly id: string;
  readonly name: string;
  readonly abbr: string;
  readonly secretary: string;
  readonly committee: string;
  readonly rank: number;
  readonly jurisdictions: readonly string[];
  readonly authorities: readonly string[];
  readonly capabilities: readonly string[];
  readonly domains: readonly string[];
  readonly capacity: number;
  readonly scale: number;
  /** The cabinet seat that runs it. Every department has one; see InstitutionDef. */
  readonly role: string;
};

const DEPARTMENTS: readonly Dept[] = [
  { id: "INST-STATE", name: "Department of State", abbr: "State", secretary: "Secretary of State", committee: "CMTE-FOREIGN", rank: 1, jurisdictions: ["foreign"], authorities: ["diplomacy", "treaty-negotiation", "visa", "foreign-assistance"], capabilities: ["diplomacy", "consular", "negotiation"], domains: ["foreign", "security"], capacity: 0.78, scale: 0.3, role: "role-foreign-minister" },
  { id: "INST-TREASURY", name: "Department of the Treasury", abbr: "Treasury", secretary: "Secretary of the Treasury", committee: "CMTE-FINANCE", rank: 2, jurisdictions: ["fiscal", "sanctions"], authorities: ["debt-management", "sanctions", "tax-administration", "financial-regulation"], capabilities: ["fiscal-administration", "sanctions", "financial-intelligence"], domains: ["economy", "fiscal", "foreign"], capacity: 0.8, scale: 0.35, role: "role-treasury-minister" },
  { id: "INST-DOD", name: "Department of Defense", abbr: "Defense", secretary: "Secretary of Defense", committee: "CMTE-ARMED", rank: 3, jurisdictions: ["defense"], authorities: ["force-employment", "readiness", "procurement", "basing"], capabilities: ["force-projection", "logistics", "planning"], domains: ["security", "defense"], capacity: 0.79, scale: 1, role: "role-defense-minister" },
  { id: "INST-DOJ", name: "Department of Justice", abbr: "Justice", secretary: "Attorney General", committee: "CMTE-JUDICIARY", rank: 4, jurisdictions: ["law-enforcement", "legal"], authorities: ["prosecution", "civil-litigation", "legal-opinion", "antitrust"], capabilities: ["prosecution", "litigation", "legal-advice"], domains: ["law-enforcement", "domestic", "judicial"], capacity: 0.76, scale: 0.4, role: "role-attorney-general" },
  { id: "INST-INTERIOR", name: "Department of the Interior", abbr: "Interior", secretary: "Secretary of the Interior", committee: "CMTE-ENERGY", rank: 5, jurisdictions: ["public-lands"], authorities: ["land-management", "leasing", "tribal-relations"], capabilities: ["land-management", "resource-leasing"], domains: ["environment", "energy", "domestic"], capacity: 0.7, scale: 0.3, role: "role-interior-minister" },
  { id: "INST-USDA", name: "Department of Agriculture", abbr: "Agriculture", secretary: "Secretary of Agriculture", committee: "CMTE-AGRICULTURE", rank: 6, jurisdictions: ["agriculture", "nutrition"], authorities: ["farm-support", "nutrition-programs", "food-safety", "trade-promotion"], capabilities: ["farm-support", "nutrition-administration", "inspection"], domains: ["agriculture", "domestic", "trade"], capacity: 0.72, scale: 0.4, role: "role-agriculture-secretary" },
  { id: "INST-COMMERCE", name: "Department of Commerce", abbr: "Commerce", secretary: "Secretary of Commerce", committee: "CMTE-COMMERCE", rank: 7, jurisdictions: ["trade", "industry"], authorities: ["section-232", "export-control", "standards", "census"], capabilities: ["export-control", "trade-remedy", "industrial-analysis"], domains: ["trade", "economy", "technology"], capacity: 0.74, scale: 0.25, role: "role-commerce-secretary" },
  { id: "INST-LABOR", name: "Department of Labor", abbr: "Labor", secretary: "Secretary of Labor", committee: "CMTE-HELP", rank: 8, jurisdictions: ["labor"], authorities: ["workplace-enforcement", "unemployment-administration", "wage-rules"], capabilities: ["labor-enforcement", "benefit-administration"], domains: ["labor", "domestic", "economy"], capacity: 0.71, scale: 0.22, role: "role-labor-secretary" },
  { id: "INST-HHS", name: "Department of Health and Human Services", abbr: "HHS", secretary: "Secretary of Health and Human Services", committee: "CMTE-FINANCE", rank: 9, jurisdictions: ["health"], authorities: ["health-programs", "public-health-emergency", "drug-approval", "health-payment"], capabilities: ["public-health", "benefit-administration", "regulatory-approval"], domains: ["health", "domestic"], capacity: 0.73, scale: 0.6, role: "role-health-secretary" },
  { id: "INST-HUD", name: "Department of Housing and Urban Development", abbr: "HUD", secretary: "Secretary of Housing and Urban Development", committee: "CMTE-BANKING", rank: 10, jurisdictions: ["housing"], authorities: ["housing-assistance", "fair-housing", "mortgage-insurance"], capabilities: ["housing-administration"], domains: ["housing", "domestic"], capacity: 0.66, scale: 0.2, role: "role-housing-secretary" },
  { id: "INST-DOT", name: "Department of Transportation", abbr: "Transportation", secretary: "Secretary of Transportation", committee: "CMTE-COMMERCE", rank: 11, jurisdictions: ["transportation"], authorities: ["infrastructure-grants", "safety-regulation", "aviation"], capabilities: ["infrastructure-delivery", "safety-regulation"], domains: ["infrastructure", "domestic"], capacity: 0.7, scale: 0.25, role: "role-transportation-secretary" },
  { id: "INST-DOE", name: "Department of Energy", abbr: "Energy", secretary: "Secretary of Energy", committee: "CMTE-ENERGY", rank: 12, jurisdictions: ["energy", "nuclear"], authorities: ["strategic-reserve", "nuclear-stewardship", "research"], capabilities: ["energy-administration", "nuclear-stewardship", "research"], domains: ["energy", "security", "technology"], capacity: 0.75, scale: 0.28, role: "role-energy-secretary" },
  { id: "INST-ED", name: "Department of Education", abbr: "Education", secretary: "Secretary of Education", committee: "CMTE-HELP", rank: 13, jurisdictions: ["education"], authorities: ["education-grants", "student-loans", "civil-rights-enforcement"], capabilities: ["grant-administration", "loan-administration"], domains: ["education", "domestic"], capacity: 0.64, scale: 0.15, role: "role-education-secretary" },
  { id: "INST-VA", name: "Department of Veterans Affairs", abbr: "Veterans Affairs", secretary: "Secretary of Veterans Affairs", committee: "CMTE-VETERANS", rank: 14, jurisdictions: ["veterans"], authorities: ["veteran-benefits", "veteran-health"], capabilities: ["benefit-administration", "health-delivery"], domains: ["veterans", "health", "domestic"], capacity: 0.67, scale: 0.5, role: "role-veterans-secretary" },
  { id: "INST-DHS", name: "Department of Homeland Security", abbr: "Homeland Security", secretary: "Secretary of Homeland Security", committee: "CMTE-HOMELAND", rank: 15, jurisdictions: ["homeland", "immigration"], authorities: ["border-enforcement", "immigration-enforcement", "disaster-response", "cyber-defense"], capabilities: ["border-control", "emergency-response", "cyber-defense"], domains: ["homeland", "immigration", "domestic", "security"], capacity: 0.72, scale: 0.55, role: "role-homeland-secretary" },
];

function departments(): readonly InstitutionDef[] {
  return DEPARTMENTS.map((dept) => ({
    id: dept.id,
    name: dept.name,
    abbr: dept.abbr,
    kind: "department" as const,
    tier: 1 as const,
    mandate: `Execute federal ${dept.jurisdictions.join(" and ")} policy.`,
    jurisdictions: dept.jurisdictions,
    authorities: dept.authorities,
    independence: "executive" as const,
    offices: [
      {
        id: `OFF-${dept.abbr.toUpperCase().replace(/[^A-Z]/g, "")}-SEC`,
        title: dept.secretary,
        appointmentClass: "PAS" as const,
        confirmingChamber: "senate" as const,
        committee: dept.committee,
        // The Vacancies Act's ordinary limit. Statutory-succession offices
        // below carry their own rule instead, which is the whole reason this
        // is per-office metadata rather than one global constant.
        actingAuthority: "vacancies-act" as const,
        actingLimitDays: 210,
        removal: "at-will" as const,
        cabinetRank: dept.rank,
        successionRank: dept.rank,
      },
      {
        id: `OFF-${dept.abbr.toUpperCase().replace(/[^A-Z]/g, "")}-DEP`,
        title: `Deputy ${dept.secretary}`,
        appointmentClass: "PAS" as const,
        confirmingChamber: "senate" as const,
        committee: dept.committee,
        actingAuthority: "statutory-succession" as const,
        removal: "at-will" as const,
      },
    ],
    capabilities: dept.capabilities,
    domains: dept.domains,
    foundingCapacity: dept.capacity,
    staffScale: dept.scale,
    cabinetRole: dept.role as InstitutionDef["cabinetRole"],
  }));
}

type Reg = {
  readonly id: string;
  readonly name: string;
  readonly abbr: string;
  readonly chair: string;
  readonly committee: string;
  readonly seats: number;
  readonly termYears: number;
  readonly jurisdictions: readonly string[];
  readonly authorities: readonly string[];
  readonly domains: readonly string[];
  /**
   * Where the commission's removal protection stands after Trump v. Slaughter
   * (2026-06-29). `at-will`: a holding reaches it (the FTC in Slaughter; the
   * single-director CFPB in Seila Law, 2020). `contested`: its statute's
   * protection stands and no holding names it, but Slaughter's reasoning
   * (rulemaking with the force of law, enforcement and civil suits are
   * executive power) reaches it, so a removal goes through and the removed
   * member's suit is a legal exposure the administration is favored to win.
   * `protected`: a body Slaughter did not reach, such as an adjudicator; the
   * NLRB's status was left undecided (the Court let removals stand only on its
   * interim docket in Wilcox).
   */
  readonly removalLaw: "at-will" | "contested" | "protected";
};

const REGULATORS: readonly Reg[] = [
  { id: "INST-SEC", name: "Securities and Exchange Commission", abbr: "SEC", chair: "Chair of the Securities and Exchange Commission", committee: "CMTE-BANKING", seats: 5, termYears: 5, jurisdictions: ["securities"], authorities: ["securities-rulemaking", "enforcement", "disclosure"], domains: ["economy", "banking"], removalLaw: "contested" },
  { id: "INST-FTC", name: "Federal Trade Commission", abbr: "FTC", chair: "Chair of the Federal Trade Commission", committee: "CMTE-COMMERCE", seats: 5, termYears: 7, jurisdictions: ["competition", "consumer"], authorities: ["antitrust", "consumer-protection", "rulemaking"], domains: ["economy", "technology"], removalLaw: "at-will" },
  { id: "INST-FCC", name: "Federal Communications Commission", abbr: "FCC", chair: "Chair of the Federal Communications Commission", committee: "CMTE-COMMERCE", seats: 5, termYears: 5, jurisdictions: ["communications"], authorities: ["spectrum", "licensing", "rulemaking"], domains: ["technology", "infrastructure"], removalLaw: "contested" },
  { id: "INST-CFPB", name: "Consumer Financial Protection Bureau", abbr: "CFPB", chair: "Director of the Consumer Financial Protection Bureau", committee: "CMTE-BANKING", seats: 1, termYears: 5, jurisdictions: ["consumer-finance"], authorities: ["consumer-finance-rulemaking", "enforcement", "supervision"], domains: ["economy", "banking"], removalLaw: "at-will" },
  { id: "INST-CFTC", name: "Commodity Futures Trading Commission", abbr: "CFTC", chair: "Chair of the Commodity Futures Trading Commission", committee: "CMTE-AGRICULTURE", seats: 5, termYears: 5, jurisdictions: ["derivatives"], authorities: ["derivatives-rulemaking", "enforcement"], domains: ["economy", "agriculture"], removalLaw: "contested" },
  { id: "INST-FDIC", name: "Federal Deposit Insurance Corporation", abbr: "FDIC", chair: "Chair of the Federal Deposit Insurance Corporation", committee: "CMTE-BANKING", seats: 5, termYears: 6, jurisdictions: ["banking"], authorities: ["deposit-insurance", "bank-supervision", "resolution"], domains: ["banking", "economy"], removalLaw: "contested" },
  { id: "INST-NRC", name: "Nuclear Regulatory Commission", abbr: "NRC", chair: "Chair of the Nuclear Regulatory Commission", committee: "CMTE-ENVIRONMENT", seats: 5, termYears: 5, jurisdictions: ["nuclear"], authorities: ["nuclear-licensing", "safety-enforcement"], domains: ["energy", "environment"], removalLaw: "contested" },
  { id: "INST-NLRB", name: "National Labor Relations Board", abbr: "NLRB", chair: "Chair of the National Labor Relations Board", committee: "CMTE-HELP", seats: 5, termYears: 5, jurisdictions: ["labor"], authorities: ["labor-adjudication", "election-supervision"], domains: ["labor", "domestic"], removalLaw: "protected" },
];

function independentRegulators(): readonly InstitutionDef[] {
  return REGULATORS.map((reg) => ({
    id: reg.id,
    name: reg.name,
    abbr: reg.abbr,
    kind: "regulator" as const,
    tier: 1 as const,
    mandate: reg.removalLaw === "at-will"
      ? `Regulate ${reg.jurisdictions.join(" and ")} under statute; its members serve at the President's pleasure.`
      : `Regulate ${reg.jurisdictions.join(" and ")} under statute, independent of day-to-day direction.`,
    jurisdictions: reg.jurisdictions,
    authorities: reg.authorities,
    // Structural independence (fixed terms, no OMB-style review, insulated
    // delivery) is kept for every commission. What a holding took from the FTC
    // and the CFPB is the protection against removal, so their chair office is
    // at will and the President can supervise policy. Every other commission
    // keeps its protection and its refusal of direction; where Slaughter's
    // reasoning reaches it, the removal is contested rather than refused.
    independence: "independent" as const,
    offices: [
      {
        id: `OFF-${reg.abbr}-CHAIR`,
        title: reg.chair,
        appointmentClass: "fixed-term" as const,
        confirmingChamber: "senate" as const,
        committee: reg.committee,
        termYears: reg.termYears,
        seats: reg.seats,
        actingAuthority: reg.seats > 1 ? ("board-quorum" as const) : ("vacancies-act" as const),
        ...(reg.seats > 1 ? {} : { actingLimitDays: 210 }),
        removal: reg.removalLaw === "at-will" ? ("at-will" as const) : ("for-cause" as const),
        ...(reg.removalLaw === "contested" ? { removalContested: true as const } : {}),
      },
    ],
    capabilities: ["rulemaking", "enforcement"],
    domains: reg.domains,
    foundingCapacity: 0.76,
    staffScale: 0.12,
  }));
}

/**
 * The day-of-cycle each seat's own term is aligned to, so a multi-member
 * board's terms are staggered from the day the body was founded rather than
 * opening in a single bloc. A seat's own term boundary falls whenever
 * `(day - start) mod (termYears * 365)` is zero; the calendar selector in
 * nomination.ts does that arithmetic, this only supplies the stagger.
 *
 * The Federal Reserve is why this exists at all: fourteen years split seven
 * ways staggers a governor's seat by two years each, which is what makes
 * "most of the board is inherited and stays inherited" a fact a president can
 * see coming rather than something the game asserts.
 */
function staggeredSeatStarts(seats: number, termYears: number): readonly number[] {
  const gapDays = Math.round((termYears * 365) / seats);
  return Array.from({ length: seats }, (_, seat) => seat * gapDays);
}

/**
 * Per-office seat staggering for every fixed-term board in the catalog, keyed
 * by the office id `nomination.ts`'s seat calendar reads. Not a field on
 * `OfficeDef` itself: the office shape is shared with every at-will and
 * PAS office in the government, and a stagger table only a fixed-term board
 * ever populates belongs beside the data that needs it, not on every office
 * that never will.
 */
export const SEAT_TERM_START_DAYS: Readonly<Record<string, readonly number[]>> = {
  ...Object.fromEntries(
    REGULATORS.map((reg) => [`OFF-${reg.abbr}-CHAIR`, staggeredSeatStarts(reg.seats, reg.termYears)] as const),
  ),
  // The Fed sits outside the REGULATORS table (it carries a cabinet-adjacent
  // second office, the seven-seat board, that no other independent regulator
  // has), so its two offices are staggered here by hand against the same
  // termYears/seats the catalog literal below states for them.
  "OFF-FED-CHAIR": staggeredSeatStarts(1, 4),
  "OFF-FED-GOVERNOR": staggeredSeatStarts(7, 14),
};

type Comp = {
  readonly id: string;
  readonly name: string;
  readonly abbr: string;
  readonly parent: string;
  readonly kind: "operating-component" | "intelligence" | "military";
  readonly head: string;
  readonly committee: string;
  readonly pas: boolean;
  readonly jurisdictions: readonly string[];
  readonly capabilities: readonly string[];
  readonly domains: readonly string[];
  readonly scale: number;
};

const COMPONENTS: readonly Comp[] = [
  { id: "INST-CBP", name: "U.S. Customs and Border Protection", abbr: "CBP", parent: "INST-DHS", kind: "operating-component", head: "Commissioner of Customs and Border Protection", committee: "CMTE-FINANCE", pas: true, jurisdictions: ["border", "customs"], capabilities: ["border-control", "customs-collection"], domains: ["homeland", "trade", "immigration"], scale: 0.3 },
  { id: "INST-ICE", name: "U.S. Immigration and Customs Enforcement", abbr: "ICE", parent: "INST-DHS", kind: "operating-component", head: "Director of Immigration and Customs Enforcement", committee: "CMTE-HOMELAND", pas: true, jurisdictions: ["immigration"], capabilities: ["immigration-enforcement", "investigation"], domains: ["immigration", "homeland"], scale: 0.18 },
  { id: "INST-TSA", name: "Transportation Security Administration", abbr: "TSA", parent: "INST-DHS", kind: "operating-component", head: "Administrator of the Transportation Security Administration", committee: "CMTE-COMMERCE", pas: true, jurisdictions: ["transportation-security"], capabilities: ["screening"], domains: ["homeland", "infrastructure"], scale: 0.16 },
  { id: "INST-USSS", name: "United States Secret Service", abbr: "Secret Service", parent: "INST-DHS", kind: "operating-component", head: "Director of the Secret Service", committee: "CMTE-HOMELAND", pas: false, jurisdictions: ["protection", "financial-crime"], capabilities: ["protection", "investigation"], domains: ["homeland"], scale: 0.06 },
  { id: "INST-FEMA", name: "Federal Emergency Management Agency", abbr: "FEMA", parent: "INST-DHS", kind: "operating-component", head: "Administrator of the Federal Emergency Management Agency", committee: "CMTE-HOMELAND", pas: true, jurisdictions: ["emergency"], capabilities: ["emergency-response", "disaster-recovery"], domains: ["homeland", "domestic", "climate"], scale: 0.12 },
  { id: "INST-CISA", name: "Cybersecurity and Infrastructure Security Agency", abbr: "CISA", parent: "INST-DHS", kind: "operating-component", head: "Director of the Cybersecurity and Infrastructure Security Agency", committee: "CMTE-HOMELAND", pas: true, jurisdictions: ["cyber", "infrastructure"], capabilities: ["cyber-defense", "infrastructure-protection"], domains: ["cyber", "infrastructure", "homeland"], scale: 0.08 },
  { id: "INST-CDC", name: "Centers for Disease Control and Prevention", abbr: "CDC", parent: "INST-HHS", kind: "operating-component", head: "Director of the Centers for Disease Control and Prevention", committee: "CMTE-HELP", pas: true, jurisdictions: ["public-health"], capabilities: ["surveillance", "outbreak-response"], domains: ["health", "domestic"], scale: 0.1 },
  { id: "INST-FDA", name: "Food and Drug Administration", abbr: "FDA", parent: "INST-HHS", kind: "operating-component", head: "Commissioner of Food and Drugs", committee: "CMTE-HELP", pas: true, jurisdictions: ["drugs", "food-safety"], capabilities: ["regulatory-approval", "inspection"], domains: ["health", "agriculture"], scale: 0.14 },
  { id: "INST-CMS", name: "Centers for Medicare and Medicaid Services", abbr: "CMS", parent: "INST-HHS", kind: "operating-component", head: "Administrator of the Centers for Medicare and Medicaid Services", committee: "CMTE-FINANCE", pas: true, jurisdictions: ["health-payment"], capabilities: ["benefit-administration", "payment-rules"], domains: ["health", "fiscal"], scale: 0.2 },
  { id: "INST-NIH", name: "National Institutes of Health", abbr: "NIH", parent: "INST-HHS", kind: "operating-component", head: "Director of the National Institutes of Health", committee: "CMTE-HELP", pas: true, jurisdictions: ["research"], capabilities: ["research", "grant-administration"], domains: ["health", "technology"], scale: 0.16 },
  { id: "INST-BIS", name: "Bureau of Industry and Security", abbr: "BIS", parent: "INST-COMMERCE", kind: "operating-component", head: "Under Secretary of Commerce for Industry and Security", committee: "CMTE-BANKING", pas: true, jurisdictions: ["export-control"], capabilities: ["export-control", "entity-listing"], domains: ["trade", "technology", "security"], scale: 0.05 },
  { id: "INST-NOAA", name: "National Oceanic and Atmospheric Administration", abbr: "NOAA", parent: "INST-COMMERCE", kind: "operating-component", head: "Administrator of the National Oceanic and Atmospheric Administration", committee: "CMTE-COMMERCE", pas: true, jurisdictions: ["weather", "oceans"], capabilities: ["forecasting", "monitoring"], domains: ["climate", "environment", "agriculture"], scale: 0.09 },
  { id: "INST-OFAC", name: "Office of Foreign Assets Control", abbr: "OFAC", parent: "INST-TREASURY", kind: "operating-component", head: "Director of the Office of Foreign Assets Control", committee: "CMTE-BANKING", pas: false, jurisdictions: ["sanctions"], capabilities: ["sanctions-designation", "asset-freeze"], domains: ["foreign", "economy"], scale: 0.04 },
  { id: "INST-IRS", name: "Internal Revenue Service", abbr: "IRS", parent: "INST-TREASURY", kind: "operating-component", head: "Commissioner of Internal Revenue", committee: "CMTE-FINANCE", pas: true, jurisdictions: ["tax"], capabilities: ["tax-administration", "audit"], domains: ["fiscal", "domestic"], scale: 0.24 },
  { id: "INST-DEA", name: "Drug Enforcement Administration", abbr: "DEA", parent: "INST-DOJ", kind: "operating-component", head: "Administrator of the Drug Enforcement Administration", committee: "CMTE-JUDICIARY", pas: true, jurisdictions: ["narcotics"], capabilities: ["investigation", "interdiction"], domains: ["law-enforcement", "foreign"], scale: 0.08 },
  { id: "INST-ATF", name: "Bureau of Alcohol, Tobacco, Firearms and Explosives", abbr: "ATF", parent: "INST-DOJ", kind: "operating-component", head: "Director of the Bureau of Alcohol, Tobacco, Firearms and Explosives", committee: "CMTE-JUDICIARY", pas: true, jurisdictions: ["firearms"], capabilities: ["investigation", "licensing"], domains: ["law-enforcement", "domestic"], scale: 0.05 },
  { id: "INST-USMS", name: "United States Marshals Service", abbr: "U.S. Marshals", parent: "INST-DOJ", kind: "operating-component", head: "Director of the United States Marshals Service", committee: "CMTE-JUDICIARY", pas: true, jurisdictions: ["judicial-security"], capabilities: ["fugitive-apprehension", "court-security"], domains: ["law-enforcement", "judicial"], scale: 0.05 },
  { id: "INST-NSA", name: "National Security Agency", abbr: "NSA", parent: "INST-DOD", kind: "intelligence", head: "Director of the National Security Agency", committee: "CMTE-INTEL", pas: false, jurisdictions: ["sigint", "cyber"], capabilities: ["signals-intelligence", "cryptography", "cyber-operations"], domains: ["intelligence", "cyber", "security"], scale: 0.13 },
  { id: "INST-DIA", name: "Defense Intelligence Agency", abbr: "DIA", parent: "INST-DOD", kind: "intelligence", head: "Director of the Defense Intelligence Agency", committee: "CMTE-INTEL", pas: false, jurisdictions: ["military-intelligence"], capabilities: ["military-analysis", "attache-collection"], domains: ["intelligence", "defense"], scale: 0.07 },
  { id: "INST-NGA", name: "National Geospatial-Intelligence Agency", abbr: "NGA", parent: "INST-DOD", kind: "intelligence", head: "Director of the National Geospatial-Intelligence Agency", committee: "CMTE-INTEL", pas: false, jurisdictions: ["geoint"], capabilities: ["geospatial-intelligence", "imagery-analysis"], domains: ["intelligence", "defense"], scale: 0.06 },
  { id: "INST-NRO", name: "National Reconnaissance Office", abbr: "NRO", parent: "INST-DOD", kind: "intelligence", head: "Director of the National Reconnaissance Office", committee: "CMTE-INTEL", pas: false, jurisdictions: ["space-collection"], capabilities: ["satellite-collection"], domains: ["intelligence", "space"], scale: 0.05 },
  { id: "INST-INR", name: "Bureau of Intelligence and Research", abbr: "INR", parent: "INST-STATE", kind: "intelligence", head: "Assistant Secretary of State for Intelligence and Research", committee: "CMTE-FOREIGN", pas: true, jurisdictions: ["diplomatic-intelligence"], capabilities: ["analysis", "dissent"], domains: ["intelligence", "foreign"], scale: 0.02 },
  { id: "INST-OIA", name: "Office of Intelligence and Analysis, Treasury", abbr: "Treasury OIA", parent: "INST-TREASURY", kind: "intelligence", head: "Assistant Secretary for Intelligence and Analysis", committee: "CMTE-BANKING", pas: true, jurisdictions: ["financial-intelligence"], capabilities: ["financial-intelligence"], domains: ["intelligence", "economy"], scale: 0.02 },
  { id: "INST-DHS-IA", name: "Office of Intelligence and Analysis, Homeland Security", abbr: "DHS I&A", parent: "INST-DHS", kind: "intelligence", head: "Under Secretary for Intelligence and Analysis", committee: "CMTE-HOMELAND", pas: true, jurisdictions: ["domestic-intelligence"], capabilities: ["threat-analysis"], domains: ["intelligence", "homeland"], scale: 0.02 },
  { id: "INST-NCTC", name: "National Counterterrorism Center", abbr: "NCTC", parent: "INST-ODNI", kind: "intelligence", head: "Director of the National Counterterrorism Center", committee: "CMTE-INTEL", pas: true, jurisdictions: ["counterterrorism"], capabilities: ["threat-integration"], domains: ["intelligence", "security"], scale: 0.03 },
  { id: "INST-NCSC", name: "National Counterintelligence and Security Center", abbr: "NCSC", parent: "INST-ODNI", kind: "intelligence", head: "Director of the National Counterintelligence and Security Center", committee: "CMTE-INTEL", pas: false, jurisdictions: ["counterintelligence"], capabilities: ["counterintelligence"], domains: ["intelligence", "security"], scale: 0.02 },
  { id: "INST-ARMY", name: "Department of the Army", abbr: "Army", parent: "INST-DOD", kind: "military", head: "Secretary of the Army", committee: "CMTE-ARMED", pas: true, jurisdictions: ["land-forces"], capabilities: ["ground-forces", "sustainment"], domains: ["defense"], scale: 0.4 },
  { id: "INST-NAVY", name: "Department of the Navy", abbr: "Navy", parent: "INST-DOD", kind: "military", head: "Secretary of the Navy", committee: "CMTE-ARMED", pas: true, jurisdictions: ["naval-forces"], capabilities: ["sea-control", "power-projection", "sealift"], domains: ["defense"], scale: 0.36 },
  { id: "INST-AIRFORCE", name: "Department of the Air Force", abbr: "Air Force", parent: "INST-DOD", kind: "military", head: "Secretary of the Air Force", committee: "CMTE-ARMED", pas: true, jurisdictions: ["air-forces", "space-forces"], capabilities: ["air-superiority", "airlift", "space-operations"], domains: ["defense", "space"], scale: 0.34 },
  { id: "INST-JCS", name: "Joint Chiefs of Staff", abbr: "Joint Chiefs", parent: "INST-DOD", kind: "military", head: "Chairman of the Joint Chiefs of Staff", committee: "CMTE-ARMED", pas: true, jurisdictions: ["military-advice"], capabilities: ["planning", "readiness-assessment", "advice"], domains: ["defense", "security"], scale: 0.04 },
];

type ScotusSeat = {
  readonly id: string;
  readonly office: string;
  readonly title: string;
  readonly abbr: string;
};

// The nine seats of the Supreme Court, each its own institution with exactly
// one office and one leader — the shape a cabinet department already has, and
// the only shape this catalog's runtime can hold a named individual in.
// `INST-JUDICIARY` above has room for one `leader`; a bench of nine needs
// nine, and nothing else in this engine tracks a multi-member body's seats
// individually (a Fed governor's seven-seat board only ever reads a stagger
// calendar, never nine — here, seven — distinct occupants). Life tenure reads
// as `removal: "term-protected"`, the same constraint the Fed chairmanship
// carries, and `actingAuthority: "none"` because there is no such thing as an
// acting justice.
const SCOTUS_SEATS: readonly ScotusSeat[] = [
  { id: "INST-SCOTUS-SEAT-1", office: "OFF-SCOTUS-SEAT-1", title: "Chief Justice of the United States", abbr: "Chief Justice" },
  { id: "INST-SCOTUS-SEAT-2", office: "OFF-SCOTUS-SEAT-2", title: "Associate Justice of the Supreme Court", abbr: "Associate Justice 2" },
  { id: "INST-SCOTUS-SEAT-3", office: "OFF-SCOTUS-SEAT-3", title: "Associate Justice of the Supreme Court", abbr: "Associate Justice 3" },
  { id: "INST-SCOTUS-SEAT-4", office: "OFF-SCOTUS-SEAT-4", title: "Associate Justice of the Supreme Court", abbr: "Associate Justice 4" },
  { id: "INST-SCOTUS-SEAT-5", office: "OFF-SCOTUS-SEAT-5", title: "Associate Justice of the Supreme Court", abbr: "Associate Justice 5" },
  { id: "INST-SCOTUS-SEAT-6", office: "OFF-SCOTUS-SEAT-6", title: "Associate Justice of the Supreme Court", abbr: "Associate Justice 6" },
  { id: "INST-SCOTUS-SEAT-7", office: "OFF-SCOTUS-SEAT-7", title: "Associate Justice of the Supreme Court", abbr: "Associate Justice 7" },
  { id: "INST-SCOTUS-SEAT-8", office: "OFF-SCOTUS-SEAT-8", title: "Associate Justice of the Supreme Court", abbr: "Associate Justice 8" },
  { id: "INST-SCOTUS-SEAT-9", office: "OFF-SCOTUS-SEAT-9", title: "Associate Justice of the Supreme Court", abbr: "Associate Justice 9" },
];

/** The nine seat institution ids, in seniority order — index 0 is the Chief Justice's. */
export const SCOTUS_SEAT_INSTITUTION_IDS: readonly string[] = SCOTUS_SEATS.map((seat) => seat.id);

function scotusSeats(): readonly InstitutionDef[] {
  return SCOTUS_SEATS.map((seat) => ({
    id: seat.id,
    name: seat.title,
    abbr: seat.abbr,
    kind: "judiciary" as const,
    tier: 1 as const,
    parent: "INST-JUDICIARY",
    mandate: "Decide cases and controversies arising under federal law, holding the seat during good behavior.",
    jurisdictions: ["judicial"],
    authorities: [],
    independence: "independent" as const,
    offices: [
      {
        id: seat.office,
        title: seat.title,
        appointmentClass: "judicial" as const,
        confirmingChamber: "senate" as const,
        committee: "CMTE-JUDICIARY",
        actingAuthority: "none" as const,
        removal: "term-protected" as const,
      },
    ],
    capabilities: ["adjudication"],
    domains: ["judicial"],
    foundingCapacity: 0.85,
    staffScale: 0.01,
  }));
}

function operatingComponents(): readonly InstitutionDef[] {
  return COMPONENTS.map((comp) => ({
    id: comp.id,
    name: comp.name,
    abbr: comp.abbr,
    kind: comp.kind,
    tier: 2 as const,
    parent: comp.parent,
    mandate: `Carry out ${comp.jurisdictions.join(" and ")} functions for its department.`,
    jurisdictions: comp.jurisdictions,
    authorities: comp.capabilities,
    independence: comp.kind === "intelligence" ? ("semi-autonomous" as const) : ("executive" as const),
    offices: [
      {
        id: `OFF-${comp.abbr.toUpperCase().replace(/[^A-Z0-9]/g, "")}-HEAD`,
        title: comp.head,
        appointmentClass: comp.pas ? ("PAS" as const) : ("PA" as const),
        ...(comp.pas ? { confirmingChamber: "senate" as const, committee: comp.committee } : {}),
        actingAuthority: comp.pas ? ("vacancies-act" as const) : ("none" as const),
        ...(comp.pas ? { actingLimitDays: 210 } : {}),
        removal: "at-will" as const,
      },
    ],
    capabilities: comp.capabilities,
    domains: comp.domains,
    foundingCapacity: 0.72,
    staffScale: comp.scale,
  }));
}


/**
 * The Office of the Vice President. It sits under the Presidency with no
 * cabinet role behind it: the Vice President is elected on the ticket, so the
 * office has no department and no seat at the break rolls. A vacancy is filled
 * by a nomination both houses confirm, never from the career bench.
 */
export const VICE_PRESIDENCY_INSTITUTION_ID: InstitutionId = "INST-OVP";

export const INSTITUTION_CATALOG: readonly InstitutionDef[] = [
  // --- Tier 0: the constitutional order -------------------------------------
  {
    id: "INST-PRESIDENCY",
    name: "Executive Office of the President",
    abbr: "EOP",
    kind: "presidency",
    tier: 0,
    mandate: "Direct the executive branch, command the armed forces, and execute the laws.",
    jurisdictions: ["executive"],
    authorities: ["executive-order", "appointment", "pardon", "veto", "commander-in-chief"],
    independence: "executive",
    offices: [
      { id: "OFF-CHIEF-OF-STAFF", title: "White House Chief of Staff", appointmentClass: "PA", actingAuthority: "none", removal: "at-will" },
      { id: "OFF-NSA-ADVISOR", title: "National Security Advisor", appointmentClass: "PA", actingAuthority: "none", removal: "at-will" },
    ],
    capabilities: ["direction", "coordination"],
    domains: ["executive", "security", "economy"],
    foundingCapacity: 0.82,
    staffScale: 0.2,
  },
  {
    id: "INST-CONGRESS",
    name: "United States Congress",
    abbr: "Congress",
    kind: "legislature",
    tier: 0,
    mandate: "Legislate, appropriate, confirm and oversee.",
    jurisdictions: ["legislative"],
    authorities: ["legislation", "appropriation", "confirmation", "oversight", "impeachment"],
    independence: "independent",
    offices: [],
    capabilities: ["legislation", "appropriation", "oversight"],
    domains: ["legislative"],
    foundingCapacity: 0.6,
    staffScale: 0.3,
  },
  {
    id: "INST-JUDICIARY",
    name: "Federal Judiciary",
    abbr: "Judiciary",
    kind: "judiciary",
    tier: 0,
    mandate: "Decide cases and controversies arising under federal law.",
    jurisdictions: ["judicial"],
    authorities: ["judicial-review", "injunction", "stay", "adjudication"],
    independence: "independent",
    offices: [],
    capabilities: ["adjudication"],
    domains: ["judicial"],
    foundingCapacity: 0.75,
    staffScale: 0.25,
  },
  {
    id: "INST-STATES",
    name: "The States",
    abbr: "States",
    kind: "state-government",
    tier: 0,
    mandate: "Govern within reserved powers, and administer much of what the federal government funds.",
    jurisdictions: ["state"],
    authorities: ["police-power", "election-administration", "national-guard"],
    independence: "independent",
    offices: [],
    capabilities: ["implementation", "enforcement"],
    domains: ["state", "domestic"],
    foundingCapacity: 0.65,
    staffScale: 0.55,
  },

  // --- Tier 1: the fifteen executive departments ----------------------------
  ...departments(),

  // --- Tier 1: the executive office components and major independents -------
  {
    id: VICE_PRESIDENCY_INSTITUTION_ID,
    name: "Office of the Vice President",
    abbr: "OVP",
    kind: "executive-office",
    tier: 1,
    parent: "INST-PRESIDENCY",
    mandate: "Support the Vice President, who presides over the Senate and stands first in the line of succession.",
    jurisdictions: ["executive"],
    authorities: ["senate-presidency", "succession"],
    independence: "executive",
    // Elected on the ticket, and seated by the founding as the office's leader.
    // The office exists for the vacancy: under the Twenty-fifth Amendment,
    // section 2, the President nominates a successor, who takes office on
    // confirmation by a majority of both houses. Nobody acts in it, the
    // President cannot remove its holder, and no career official is ever
    // seated in it (career-incumbents.ts leaves it out).
    offices: [
      {
        id: "OFF-VP", title: "Vice President", appointmentClass: "PAS", confirmingChamber: "senate", confirmedByBothHouses: true,
        actingAuthority: "none", removal: "term-protected",
      },
    ],
    capabilities: ["coordination"],
    domains: ["executive"],
    foundingCapacity: 0.8,
    staffScale: 0.02,
  },
  {
    id: "INST-NSC",
    name: "National Security Council",
    abbr: "NSC",
    kind: "executive-office",
    tier: 1,
    parent: "INST-PRESIDENCY",
    mandate: "Coordinate national security and foreign policy across departments and agencies.",
    jurisdictions: ["security", "foreign"],
    authorities: ["coordination", "tasking", "policy-process"],
    independence: "executive",
    offices: [],
    capabilities: ["coordination", "crisis-management"],
    domains: ["security", "foreign"],
    foundingCapacity: 0.78,
    staffScale: 0.1,
  },
  {
    id: "INST-OMB",
    name: "Office of Management and Budget",
    abbr: "OMB",
    kind: "executive-office",
    tier: 1,
    parent: "INST-PRESIDENCY",
    mandate: "Prepare the President's budget, review regulation, and oversee agency management.",
    jurisdictions: ["budget", "regulation"],
    authorities: ["apportionment", "regulatory-review", "budget-preparation"],
    independence: "executive",
    offices: [
      { id: "OFF-OMB-DIRECTOR", title: "Director of the Office of Management and Budget", appointmentClass: "PAS", confirmingChamber: "senate", committee: "CMTE-HOMELAND", actingAuthority: "vacancies-act", actingLimitDays: 210, removal: "at-will" },
    ],
    capabilities: ["budget", "regulatory-review"],
    domains: ["budget", "regulation"],
    foundingCapacity: 0.8,
    staffScale: 0.12,
  },
  {
    id: "INST-USTR",
    name: "Office of the United States Trade Representative",
    abbr: "USTR",
    kind: "executive-office",
    tier: 1,
    parent: "INST-PRESIDENCY",
    mandate: "Develop and coordinate trade policy, and lead trade negotiations and enforcement.",
    jurisdictions: ["trade"],
    authorities: ["section-301", "trade-negotiation", "trade-agreement", "tariff-exclusion"],
    independence: "executive",
    offices: [
      { id: "OFF-USTR", title: "United States Trade Representative", appointmentClass: "PAS", confirmingChamber: "senate", committee: "CMTE-FINANCE", actingAuthority: "vacancies-act", actingLimitDays: 210, removal: "at-will", cabinetRank: 17 },
    ],
    capabilities: ["trade-negotiation", "trade-enforcement"],
    domains: ["trade", "economy"],
    foundingCapacity: 0.76,
    staffScale: 0.08,
  },
  {
    id: "INST-EPA",
    name: "Environmental Protection Agency",
    abbr: "EPA",
    kind: "independent-agency",
    tier: 1,
    mandate: "Set and enforce standards protecting human health and the environment.",
    jurisdictions: ["environment"],
    authorities: ["rulemaking", "enforcement", "permitting"],
    independence: "executive",
    offices: [
      { id: "OFF-EPA-ADMIN", title: "Administrator of the Environmental Protection Agency", appointmentClass: "PAS", confirmingChamber: "senate", committee: "CMTE-ENVIRONMENT", actingAuthority: "vacancies-act", actingLimitDays: 210, removal: "at-will", cabinetRank: 18 },
    ],
    capabilities: ["rulemaking", "enforcement"],
    domains: ["environment", "energy", "health"],
    foundingCapacity: 0.7,
    staffScale: 0.3,
  },
  {
    id: "INST-ODNI",
    name: "Office of the Director of National Intelligence",
    abbr: "ODNI",
    kind: "intelligence",
    tier: 1,
    mandate: "Integrate the intelligence community and set collection and analytic priorities.",
    jurisdictions: ["intelligence"],
    authorities: ["intelligence-integration", "collection-priorities", "budget-authority"],
    independence: "semi-autonomous",
    offices: [
      { id: "OFF-DNI", title: "Director of National Intelligence", appointmentClass: "PAS", confirmingChamber: "senate", committee: "CMTE-INTEL", actingAuthority: "statutory-succession", removal: "at-will" },
    ],
    capabilities: ["intelligence-integration", "analysis"],
    domains: ["intelligence", "security"],
    foundingCapacity: 0.74,
    staffScale: 0.14,
    // The one non-department that holds a cabinet seat, which is how the
    // office actually sits: the DNI is not a Secretary and the ODNI is not a
    // department, and the charter seats them anyway.
    cabinetRole: "role-intelligence-director" as InstitutionDef["cabinetRole"],
  },
  {
    id: "INST-CIA",
    name: "Central Intelligence Agency",
    abbr: "CIA",
    kind: "intelligence",
    tier: 1,
    parent: "INST-ODNI",
    mandate: "Collect and analyze foreign intelligence and conduct covert action as directed.",
    jurisdictions: ["intelligence", "foreign"],
    authorities: ["foreign-collection", "covert-action", "all-source-analysis"],
    independence: "semi-autonomous",
    offices: [
      { id: "OFF-DCIA", title: "Director of the Central Intelligence Agency", appointmentClass: "PAS", confirmingChamber: "senate", committee: "CMTE-INTEL", actingAuthority: "statutory-succession", removal: "at-will" },
    ],
    capabilities: ["foreign-collection", "covert-action", "analysis"],
    domains: ["intelligence", "foreign", "security"],
    foundingCapacity: 0.79,
    staffScale: 0.22,
  },
  {
    id: "INST-FBI",
    name: "Federal Bureau of Investigation",
    abbr: "FBI",
    kind: "intelligence",
    tier: 1,
    parent: "INST-DOJ",
    mandate: "Investigate federal crime and lead domestic counterintelligence and counterterrorism.",
    jurisdictions: ["law-enforcement", "counterintelligence"],
    authorities: ["federal-investigation", "counterintelligence", "arrest"],
    // The Director's ten-year term and the Department's own independence norms
    // are the reason the President cannot use this the way a department is
    // used, and the reason trying has consequences rather than results.
    independence: "semi-autonomous",
    offices: [
      { id: "OFF-FBI-DIRECTOR", title: "Director of the Federal Bureau of Investigation", appointmentClass: "PAS", confirmingChamber: "senate", committee: "CMTE-JUDICIARY", termYears: 10, actingAuthority: "statutory-succession", removal: "at-will" },
    ],
    capabilities: ["federal-investigation", "counterintelligence"],
    domains: ["law-enforcement", "intelligence", "domestic"],
    foundingCapacity: 0.77,
    staffScale: 0.26,
  },
  {
    id: "INST-FED",
    name: "Board of Governors of the Federal Reserve System",
    abbr: "Federal Reserve",
    kind: "regulator",
    tier: 1,
    mandate: "Conduct monetary policy toward maximum employment and stable prices, and supervise the banking system.",
    jurisdictions: ["monetary", "banking"],
    authorities: ["policy-rate", "bank-supervision", "lender-of-last-resort"],
    // The President nominates and cannot direct. Every rung of this game's
    // pressure ladder stops at this line, and it is the line that makes a
    // long-dated appointment worth something.
    independence: "independent",
    // The two offices are removable on different terms, and the difference is
    // the whole of the Fed's insulation. 12 U.S.C. § 242 makes a governor
    // removable "for cause by the President" and says nothing whatever about
    // removing the chairmanship: the chair is elected to a term of four years
    // and the statute writes no way to end it. So the seat a president can
    // reach for cause is the board seat, and the four-year chairmanship is the
    // one office in this government the answer to is no.
    offices: [
      { id: "OFF-FED-CHAIR", title: "Chair of the Board of Governors", appointmentClass: "fixed-term", confirmingChamber: "senate", committee: "CMTE-BANKING", termYears: 4, actingAuthority: "board-quorum", removal: "term-protected" },
      { id: "OFF-FED-GOVERNOR", title: "Member of the Board of Governors", appointmentClass: "fixed-term", confirmingChamber: "senate", committee: "CMTE-BANKING", termYears: 14, seats: 7, actingAuthority: "board-quorum", removal: "for-cause" },
    ],
    capabilities: ["monetary-policy", "bank-supervision"],
    domains: ["monetary", "economy", "banking"],
    foundingCapacity: 0.86,
    staffScale: 0.15,
  },
  ...independentRegulators(),

  // --- Tier 2: major operating components -----------------------------------
  ...operatingComponents(),

  // --- Tier 3: the career service ------------------------------------------
  {
    id: "INST-CAREER-SERVICE",
    name: "Federal Career Service",
    abbr: "Civil Service",
    kind: "field",
    tier: 3,
    mandate: "Administer federal programs in the field, across every department and region.",
    jurisdictions: ["administration"],
    authorities: ["program-administration", "grant-administration", "inspection"],
    independence: "semi-autonomous",
    offices: [],
    capabilities: ["implementation", "field-presence"],
    domains: ["domestic", "administration"],
    foundingCapacity: 0.68,
    staffScale: 1,
  },

  // --- Tier 1: the nine Supreme Court seats, each its own institution -------
  ...scotusSeats(),
];
