import type { LegislativeAct } from "./legislative-acts.js";
import { selectActiveConflicts, selectCurrentLaws, type Campaign } from "./state.js";
import { hasLapsed, selectDeclaredEmergencies } from "./emergency.js";
import { playerStats } from "./legislative-acts-fiscal.js";
import { TURNS_PER_YEAR } from "./pace.js";

// Fictional policy packages, not scores of real legislation. Shares of annual
// GDP are simulation assumptions. Their recurring cost is charged ONLY through
// LAW_OFFSETS, never again as an up-front treasury debit. Eligibility reads
// existing conditions; no racial composition or inferred group preferences.
const always = () => true;
const unsettled = (c: Campaign) => (playerStats(c)?.politics.protestPressure ?? 0) >= 0.25;
const strained = (c: Campaign) => (playerStats(c)?.economy.unemployment ?? 0) >= 0.055;
const prices = (c: Campaign) => (playerStats(c)?.economy.inflation ?? 0) >= 0.035;
const emergency = (c: Campaign) => selectDeclaredEmergencies(c).some((e) => !hasLapsed(e, c.turn) && ["earthquake", "flood", "drought", "cyclone", "wildfire", "tornado", "winter-storm", "heat-wave"].includes(e.cause));
const HOUSING_FAMILY = new Set(["act-housing-supply", "act-housing-renewal", "act-housing-replacement"]);
const currentHousingLaw = (c: Campaign) => selectCurrentLaws(c).find((bill) => HOUSING_FAMILY.has(bill.act));

export const DOMESTIC_ACTS: readonly LegislativeAct[] = [
  {
    id: "act-health-coverage", title: "The Affordable Coverage Act", topic: "Healthcare",
    summary: "Funds four years of income-based health insurance assistance and enrollment support through the states.",
    tradeoff: "Households receive help with premiums. Federal outlays rise, and Congress must renew the assistance after four years.",
    sponsor: "administration", committee: "CMTE-FINANCE", appeal: 0.08, track: "reconciliation", cost: {},
    nationEffects: { "politics.protestPressure": -0.015 }, alignment: { economicLeftRight: -0.2 },
    domestic: { sectors: ["healthcare"], federal: 0.3, values: { economicLeftRight: -0.3 }, magnitude: "moderate", channels: { healthAccess: 0.8, disabilityPrograms: 0.3 }, signature: "act:health-coverage", reason: "Premium assistance reaches households through the health system; voters differ over its federal cost." },
    recurs: TURNS_PER_YEAR * 4, arises: always,
  },
  {
    id: "act-rural-care", title: "The Rural Care and Hospital Access Act", topic: "Healthcare",
    summary: "Funds rural clinics, hospital stabilization and clinician training for four years, with grants reserved for underserved communities.",
    tradeoff: "Rural providers gain support. Recruiting staff takes time, and the grants compete with other federal spending.",
    sponsor: "administration", committee: "CMTE-HELP", appeal: 0.18, cost: {},
    nationEffects: {}, alignment: { economicLeftRight: -0.08 },
    domestic: { sectors: ["healthcare"], urban: -0.8, magnitude: "moderate", channels: { healthAccess: 0.5 }, signature: "act:rural-care", reason: "Clinic grants favor rural communities and the providers serving them." },
    recurs: TURNS_PER_YEAR * 4, arises: always,
  },
  {
    id: "act-equal-protection", title: "The Equal Protection Enforcement Act", topic: "Civil rights",
    summary: "Funds federal enforcement against racial discrimination in housing, employment and public services, with reporting and independent review of complaints.",
    tradeoff: "Civil rights enforcement gains staff and reach. Employers and public agencies face compliance costs and federal scrutiny.",
    sponsor: "administration", committee: "CMTE-JUDICIARY", appeal: 0.07, cost: {},
    nationEffects: { "politics.legitimacy": 0.025, "security.corruptionIndex": -0.01 }, alignment: { authLibertarian: -0.2 },
    constrains: { bindsTheExecutive: true },
    domestic: { values: { authLibertarian: -0.5 }, magnitude: "moderate", channels: { civilRights: 0.9 }, signature: "act:equal-protection", reason: "Federal enforcement of equal treatment strengthens legal protections and provokes a dispute over federal reach." },
    arises: always,
  },
  {
    id: "act-voting-access", title: "The Voting Access and Election Administration Act", topic: "Voting rights",
    summary: "Sets access standards for federal elections, funds accessible voting equipment and requires public audits of election administration.",
    tradeoff: "Federal standards strengthen access and accountability. States must change procedures and challenge the reach of the new requirements.",
    sponsor: "administration", committee: "CMTE-JUDICIARY", appeal: 0.03, cost: { stability: -0.01 },
    nationEffects: { "politics.legitimacy": 0.03 }, alignment: { authLibertarian: -0.2 },
    constrains: { bindsTheExecutive: true },
    domestic: { values: { authLibertarian: -0.45 }, magnitude: "moderate", channels: { civilRights: 0.6 }, signature: "act:voting-access", reason: "Federal election standards divide voters over access, administration and state authority." },
    arises: (c) => c.turn >= 8 || unsettled(c),
  },
  {
    id: "act-police-accountability", title: "The Policing Standards and Accountability Act", topic: "Justice",
    summary: "Conditions federal policing grants on use-of-force reporting, independent misconduct investigations and nondiscrimination standards.",
    tradeoff: "Grant conditions strengthen oversight of policing. Departments face training costs and some states resist federal conditions.",
    sponsor: "administration", committee: "CMTE-JUDICIARY", appeal: 0.04, cost: { stability: -0.015 },
    nationEffects: { "politics.legitimacy": 0.025, "security.corruptionIndex": -0.02 }, alignment: { authLibertarian: -0.2 },
    constrains: { bindsTheExecutive: true },
    domestic: { values: { authLibertarian: -0.5 }, magnitude: "moderate", channels: { civilRights: 0.5 }, signature: "act:police-accountability", reason: "Conditions on policing grants make accountability and local control competing political demands." },
    arises: unsettled,
  },
  {
    id: "act-sentencing-reentry", title: "The Sentencing Review and Reentry Act", topic: "Justice",
    summary: "Expands review of federal nonviolent sentences and funds reentry services, while retaining judicial review and public-safety exclusions.",
    tradeoff: "Reentry services cost money before prison savings arrive. Prosecutors and civil liberties groups dispute the scope of sentence review.",
    sponsor: "administration", committee: "CMTE-JUDICIARY", appeal: 0.12, cost: {},
    nationEffects: { "politics.legitimacy": 0.02 }, alignment: { authLibertarian: -0.15 },
    constrains: { bindsTheExecutive: true },
    domestic: { values: { authLibertarian: -0.35 }, magnitude: "light", channels: { civilRights: 0.3 }, signature: "act:sentencing-reentry", reason: "Federal sentence review changes how voters judge punishment and rehabilitation." },
    arises: (c) => c.turn >= 12 || unsettled(c),
  },
  {
    id: "act-housing-supply", title: "The Housing Supply Partnership Act", topic: "Housing",
    summary: "Offers four years of infrastructure grants to communities that permit more homes, with affordability covenants on federally assisted developments.",
    tradeoff: "Construction and affordability requirements compete for local consent. Federal grants add to the deficit before new homes are delivered.",
    sponsor: "administration", committee: "CMTE-BANKING", appeal: 0.12, cost: {},
    nationEffects: {}, alignment: { economicLeftRight: -0.1 },
    domestic: { sectors: ["housing-construction"], urban: 0.5, magnitude: "moderate", signature: "act:housing-supply", reason: "Housing grants favor construction and growing metropolitan communities, with disputes over local land use." },
    recurs: 1, arises: (c) => !currentHousingLaw(c) && (prices(c) || c.turn >= 16),
  },
  {
    id: "act-housing-repeal", title: "The Housing Supply Repeal Act", topic: "Housing",
    summary: "Ends the continuing housing-grant program while preserving completed grants and contracts already owed.",
    tradeoff: "Future grants stop. Existing obligations still have to be paid, and communities lose planned assistance.",
    sponsor: "administration", committee: "CMTE-BANKING", appeal: -0.02, cost: {},
    nationEffects: {}, alignment: { economicLeftRight: 0.1 },
    revises: { family: "housing-supply", kind: "repeal" }, recurs: 1,
    arises: (c) => currentHousingLaw(c) !== undefined,
  },
  {
    id: "act-housing-renewal", title: "The Housing Supply Renewal Act", topic: "Housing",
    summary: "Renews the existing housing-grant program for four more years, beginning when this bill becomes law.",
    tradeoff: "Communities keep the existing terms. The annual federal cost starts again for a new four-year period.",
    sponsor: "administration", committee: "CMTE-BANKING", appeal: 0.1, cost: {},
    nationEffects: {}, alignment: { economicLeftRight: -0.05 },
    revises: { family: "housing-supply", kind: "renewal" }, recurs: 1,
    arises: (c) => currentHousingLaw(c) !== undefined,
  },
  {
    id: "act-housing-replacement", title: "The Targeted Housing Partnership Act", topic: "Housing",
    summary: "Replaces the existing grant program with four years of smaller grants targeted to the communities under greatest housing pressure.",
    tradeoff: "The program reaches fewer places and costs less each year. Communities outside the narrower terms lose future grants.",
    sponsor: "administration", committee: "CMTE-BANKING", appeal: 0.13, cost: {},
    nationEffects: {}, alignment: { economicLeftRight: -0.08 },
    revises: { family: "housing-supply", kind: "replacement" }, recurs: 1,
    arises: (c) => currentHousingLaw(c) !== undefined,
  },
  {
    id: "act-apprenticeships", title: "The Apprenticeship and Technical Education Act", topic: "Education",
    summary: "Funds four years of paid apprenticeships and technical college places tied to employers, with completion and wage reporting.",
    tradeoff: "Training broadens routes into work. Employers must provide placements, and federal spending starts before trainees finish.",
    sponsor: "administration", committee: "CMTE-HELP", appeal: 0.17, cost: {},
    nationEffects: {}, alignment: { economicLeftRight: -0.1 },
    domestic: { axes: { industrial: 1 }, magnitude: "moderate", signature: "act:apprenticeships", reason: "Training funds reach manufacturing communities and employers taking on apprentices." },
    recurs: TURNS_PER_YEAR * 4, arises: always,
  },
  {
    id: "act-paid-leave", title: "The Family Care and Paid Leave Act", topic: "Labor and families",
    summary: "Creates a paid family and medical leave benefit financed partly through payroll contributions, with federal administration and employer reporting.",
    tradeoff: "Families gain income protection during leave. Payroll contributions raise employment costs and do not cover the whole federal expense.",
    sponsor: "administration", committee: "CMTE-FINANCE", appeal: 0.07, cost: {},
    nationEffects: {}, alignment: { economicLeftRight: -0.25 },
    domestic: { values: { economicLeftRight: -0.5 }, magnitude: "moderate", channels: { disabilityPrograms: 0.3 }, signature: "act:paid-leave", reason: "Paid leave benefits and payroll contributions divide households and employers over who should carry family-care costs." },
    arises: (c) => c.turn >= 6,
  },
  {
    id: "act-small-business-credit", title: "The Small Business Credit and Recovery Act", topic: "Business and jobs",
    summary: "Funds two years of credit support and temporary investment relief for small employers, with loss reserves and public reporting.",
    tradeoff: "Small firms gain access to finance. Tax relief reduces receipts and failed loans put public funds at risk.",
    sponsor: "administration", committee: "CMTE-BANKING", appeal: 0.16, track: "ordinary", cost: {},
    nationEffects: {}, alignment: { economicLeftRight: 0.15 },
    domestic: { values: { economicLeftRight: 0.3 }, magnitude: "light", signature: "act:small-business-credit", reason: "Credit support and investment relief favor employers seeking to expand through a weak economy." },
    recurs: TURNS_PER_YEAR * 2, arises: (c) => strained(c) || (playerStats(c)?.economy.growth ?? 1) < 0.015,
  },
  {
    id: "act-clean-grid", title: "The Grid Reliability and Clean Power Act", topic: "Energy",
    summary: "Funds five years of transmission, storage and grid hardening, with environmental review and workforce requirements.",
    tradeoff: "Federal investment supports grid projects. Spending rises before construction finishes, and new routes face land-use opposition.",
    sponsor: "administration", committee: "CMTE-ENERGY", appeal: 0.11, cost: {},
    nationEffects: {}, alignment: { economicLeftRight: -0.15 },
    domestic: { sectors: ["energy-renewables", "utilities"], magnitude: "moderate", signature: "act:clean-grid", reason: "Grid investment reaches utilities and renewable power communities while new routes require local consent." },
    recurs: TURNS_PER_YEAR * 5, arises: (c) => (playerStats(c)?.energy.importDependence ?? 0) >= 0.15 || prices(c),
  },
  {
    id: "act-energy-permitting", title: "The Energy Permitting and Public Review Act", topic: "Energy",
    summary: "Funds coordinated federal permitting offices and sets review deadlines for energy projects while retaining judicial review.",
    tradeoff: "Developers gain more predictable review schedules. Communities have less time to organize objections and agencies need more staff.",
    sponsor: "administration", committee: "CMTE-ENERGY", appeal: 0.13, cost: { stability: -0.005 },
    nationEffects: {}, alignment: { economicLeftRight: 0.15 },
    domestic: { sectors: ["energy-gas", "energy-nuclear"], values: { economicLeftRight: 0.2 }, magnitude: "light", signature: "act:energy-permitting", reason: "Permitting deadlines help developers and raise local concerns about the time allowed for scrutiny." },
    arises: (c) => c.turn >= 8 || prices(c),
  },
  {
    id: "act-data-privacy", title: "The Consumer Data Protection Act", topic: "Privacy",
    summary: "Creates federal limits on commercial data collection, deletion rights and enforcement funding, with narrow public-safety exceptions.",
    tradeoff: "People gain control over commercial data. Compliance costs rise and data-dependent businesses lose some revenue opportunities.",
    sponsor: "administration", committee: "CMTE-COMMERCE", appeal: 0.1, cost: {},
    nationEffects: { "politics.legitimacy": 0.015 }, alignment: { authLibertarian: -0.2 },
    domestic: { values: { authLibertarian: -0.4 }, magnitude: "light", signature: "act:data-privacy", reason: "Data rights make commercial surveillance and the cost of compliance a national political question." },
    arises: (c) => c.turn >= 4,
  },
  {
    id: "act-public-integrity", title: "The Public Integrity and Contracting Act", topic: "Government ethics",
    summary: "Funds procurement audits, conflict-of-interest disclosure and protected channels for reporting federal contracting abuses.",
    tradeoff: "Independent scrutiny reduces opportunities for corruption. Procurement becomes slower and the administration subjects itself to oversight.",
    sponsor: "administration", committee: "CMTE-HOMELAND", appeal: 0.16, cost: {},
    nationEffects: { "security.corruptionIndex": -0.04 }, alignment: { authLibertarian: -0.1 },
    constrains: { bindsTheExecutive: true },
    domestic: { federal: 0.4, magnitude: "light", signature: "act:public-integrity", reason: "Contracting oversight changes the terms on which federal-dependent communities and suppliers do business." },
    arises: (c) => (playerStats(c)?.security.corruptionIndex ?? 0) >= 0.2,
  },
  {
    id: "act-disaster-recovery", title: "The Disaster Recovery and Resilience Act", topic: "Emergency response",
    summary: "Funds two years of rebuilding and resilience grants after a declared emergency, with audits and mitigation conditions on reconstruction.",
    tradeoff: "Recovery grants support rebuilding. Borrowing increases and mitigation requirements can delay access to the money.",
    sponsor: "administration", committee: "CMTE-HOMELAND", appeal: 0.2, cost: {},
    nationEffects: { "politics.protestPressure": -0.015 }, alignment: { economicLeftRight: -0.1 },
    domestic: { sectors: ["public-infrastructure", "housing-construction"], magnitude: "light", signature: "act:disaster-recovery", reason: "Recovery appropriations support rebuilding contractors and federal grant recipients." },
    recurs: TURNS_PER_YEAR * 2, arises: emergency,
  },
  {
    id: "act-unemployment-extension", title: "The Emergency Unemployment Support Act", topic: "Business and jobs",
    summary: "Funds one year of extended unemployment benefits and state claims-processing support during a weak labor market.",
    tradeoff: "Unemployed households receive temporary income support. Borrowing rises and the benefit expires unless Congress renews it.",
    sponsor: "administration", committee: "CMTE-FINANCE", appeal: 0.18, track: "reconciliation", cost: {},
    nationEffects: { "politics.protestPressure": -0.02 }, alignment: { economicLeftRight: -0.2 },
    domestic: { values: { economicLeftRight: -0.35 }, federal: 0.4, magnitude: "moderate", signature: "act:unemployment-extension", reason: "Extended benefits protect household income and reopen the argument over federal support during a downturn." },
    recurs: TURNS_PER_YEAR, arises: strained,
  },
  {
    id: "act-veterans-transition", title: "The Veterans Care and Transition Act", topic: "Veterans",
    summary: "Funds four years of veterans' care, disability claims processing and transition services for returning personnel.",
    tradeoff: "Veterans and military communities gain support. The federal obligation continues after deployments end.",
    sponsor: "administration", committee: "CMTE-VETERANS", appeal: 0.22, cost: {},
    nationEffects: {}, alignment: {},
    domestic: { axes: { defense: 0.8 }, sectors: ["healthcare"], magnitude: "moderate", channels: { veterans: 0.9, disabilityPrograms: 0.4, healthAccess: 0.3 }, signature: "act:veterans-transition", reason: "Veterans' services reach military communities and their care providers." },
    recurs: TURNS_PER_YEAR * 4,
    arises: (c) => c.turn >= TURNS_PER_YEAR || selectActiveConflicts(c).some((w) => [w.aggressor, w.defender, ...w.joined.aggressor, ...w.joined.defender].includes(c.founding.nation)),
  },
  {
    id: "act-border-adjudication", title: "The Border Processing and Immigration Courts Act", topic: "Immigration",
    summary: "Funds four years of border processing capacity, immigration judges and legal access, paired with case reporting and detention oversight.",
    tradeoff: "More cases can be processed under judicial supervision. Enforcement and legal representation compete for funding and political support.",
    sponsor: "administration", committee: "CMTE-JUDICIARY", appeal: 0.11, cost: {},
    nationEffects: { "security.borderControl": 0.035, "politics.legitimacy": 0.01 }, alignment: { nationalistGlobalist: 0.1 },
    constrains: { bindsTheExecutive: true },
    domestic: { values: { nationalistGlobalist: 0.25, authLibertarian: -0.15 }, magnitude: "moderate", channels: { immigration: 0.1 }, signature: "act:border-adjudication", reason: "Processing capacity and legal safeguards make enforcement and due process part of the same bargain." },
    recurs: TURNS_PER_YEAR * 4, arises: (c) => (playerStats(c)?.security.borderControl ?? 1) < 0.7,
  },
];

const baseAct = (id: string) => DOMESTIC_ACTS.find((act) => act.id === id)!;

/** Authored narrower provisions retain each bill's identity while changing its policy and price. */
export const TARGETED_DOMESTIC_ACTS: Readonly<Record<string, LegislativeAct>> = {
  "act-housing-supply": {
  ...baseAct("act-housing-supply"),
  summary: "Offers four years of smaller grants for approved affordable housing projects, without asking communities to change their general permitting rules.",
  tradeoff: "The narrower grants cost less and ask less of local governments. Fewer new homes qualify, and construction reaches fewer communities.",
  appeal: 0.2,
  domestic: {
    sectors: ["housing-construction"], urban: 0.15, magnitude: "light",
    signature: "act:housing-supply:targeted",
    reason: "Targeted housing grants reach approved affordable projects while leaving broader local permitting rules in place.",
  },
  },
  "act-health-coverage": {
    ...baseAct("act-health-coverage"),
    summary: "Funds four years of premium assistance and enrollment support limited to lower-income households, with states administering eligibility checks.",
    tradeoff: "The narrower benefit lowers federal outlays and concentrates help on households with the least room to pay. Families above the eligibility line receive no new assistance.",
    appeal: 0.16,
    domestic: { sectors: ["healthcare"], federal: 0.2, values: { economicLeftRight: -0.2 }, magnitude: "light", channels: { healthAccess: 0.45, disabilityPrograms: 0.1 }, signature: "act:health-coverage:targeted", reason: "Lower-income premium assistance reaches fewer households, with state eligibility checks narrowing access." },
  },
  "act-clean-grid": {
    ...baseAct("act-clean-grid"),
    summary: "Funds five years of hardening existing transmission corridors and local storage, with workforce requirements and environmental review retained.",
    tradeoff: "Existing routes gain reliability with fewer land-use disputes and lower federal spending. Fewer new transmission lines connect remote clean generation.",
    appeal: 0.19,
    domestic: { sectors: ["utilities"], magnitude: "light", signature: "act:clean-grid:targeted", reason: "Reliability grants favor existing utility corridors and local storage over new long-distance grid construction." },
  },
};

