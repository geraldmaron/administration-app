import { CountryReference, type CountryReference as CountryReferenceT } from "../schemas/country-reference.js";
import { CHINA_ID, RUSSIA_ID, UK_ID, US_ID } from "./nations.js";

// Authored reference stubs for major powers and close allies. Prose is
// institutional context for dossiers and Ops copy — live stats and relationships
// always come from the campaign, not from this table.

const REFERENCE_INPUTS: readonly CountryReferenceT[] = [
  CountryReference.parse({
    nationId: US_ID,
    executiveSummary:
      "The United States is the playable seat: a federal presidential republic with the world's largest integrated military, dollar-based financial reach, and treaty alliances on every inhabited continent.\n\n" +
      "Power is split between an elected president, a bicameral Congress, and courts that can block or delay executive action. Foreign policy runs through the National Security Council, the State Department, and combatant commands that already maintain global posture.\n\n" +
      "Domestic politics constrain what any president can sustain abroad — war powers reporting, appropriations, and public attention all cap how long a crisis can run before Congress or the electorate re-enters the decision.",
    background:
      "Continental power with two ocean moats, abundant energy and food, and a services-heavy economy that still anchors advanced manufacturing and defense production. Immigration and internal migration continually reshape its electorate.",
    governmentSystem:
      "Constitutional separation of powers: a four-year presidency, Senate and House with distinct calendars, and an independent judiciary. Cabinet secretaries execute law; they do not sit in Congress.",
    economyNarrative:
      "Dollar-reserve status, deep capital markets, and a large consumer base make sanctions and aid both powerful and costly. Trade deficits and sector concentration mean economic statecraft hits some states and industries harder than others.",
    societyNarrative:
      "Highly urbanized, regionally polarized, and media-saturated — every foreign crisis arrives alongside domestic culture fights and midterm arithmetic.",
    securityNarrative:
      "Global power projection with nuclear triad, carrier strike groups, and bases abroad; homeland defense relies on NORAD, cyber commands, and National Guard mobilization law.",
    whyItMatters:
      "Every instrument on the board is sized to this government's reach; allies expect leadership and adversaries plan around it.",
  }),
  CountryReference.parse({
    nationId: UK_ID,
    executiveSummary:
      "The United Kingdom is a parliamentary monarchy with a permanent UN Security Council seat, nuclear deterrent, and intelligence relationships that punch above its GDP.\n\n" +
      "The prime minister commands executive power through a single-chamber legislature; the monarch reigns but does not govern. Defense and foreign policy concentrate in Downing Street, the Foreign Office, and integrated defense staff.\n\n" +
      "Brexit repositioned trade and regulatory alignment; London remains a finance and legal hub while industrial capacity is narrower than during the Cold War.",
    background:
      "Island nation off northwestern Europe with historic ties across the Commonwealth, NATO, and the Five Eyes intelligence network.",
    governmentSystem:
      "Parliamentary system: Commons majority forms the government, Lords revises without blocking money bills, prime minister asks the monarch to dissolve for elections.",
    economyNarrative:
      "Services-heavy, especially finance and professional exports; energy transition and North Sea decline shape industrial policy and household cost politics.",
    securityNarrative:
      "Continuous-at-sea deterrent, two-carrier navy rebuilding, and expeditionary habits from decades of US-led coalitions — but mass and stockpiles are thinner than during major land wars.",
    whyItMatters:
      "Often the first ally Washington consults on Euro-Atlantic crises; its vote and bases still shape NATO credibility.",
  }),
  CountryReference.parse({
    nationId: CHINA_ID,
    executiveSummary:
      "China is the largest manufacturing economy and the primary peer competitor in the western Pacific, with party-led governance that merges industrial policy, military modernization, and territorial claims.\n\n" +
      "The Communist Party selects leaders, controls media and courts, and directs state-owned enterprises that dominate heavy industry and finance. Military strategy emphasizes anti-access, cyber, and space denial alongside a growing blue-water navy.\n\n" +
      "Demographic aging and property-sector stress test the growth model that underwrote a generation of military spending.",
    background:
      "Civilization-scale history compressed into a single-party state rebuilt after isolation; coastal prosperity contrasts with interior development gaps.",
    governmentSystem:
      "Party-state: general secretary and state president overlap, National People's Congress ratifies rather than originates, provincial party secretaries outrank governors.",
    economyNarrative:
      "Export engine pivoting toward domestic consumption and high-tech self-sufficiency; supply-chain leverage and rare-earth processing are strategic cards.",
    societyNarrative:
      "Urban middle class expanded rapidly; censorship and nationalist education shape public tolerance for external confrontation.",
    securityNarrative:
      "Regional missile arsenal, growing carrier and submarine force, and gray-zone pressure around maritime claims — conflict risk concentrates in the first island chain.",
    whyItMatters:
      "Trade, Taiwan, and South China Sea decisions here set the ceiling for US strategy in Asia.",
  }),
  CountryReference.parse({
    nationId: RUSSIA_ID,
    executiveSummary:
      "Russia is a resource-exporting nuclear power with centralized authority, a legacy military-industrial base, and a foreign policy that treats the near abroad as a sphere of influence.\n\n" +
      "The presidency dominates parliament and regional governors; security services permeate politics and business. Energy revenue funds state capacity but exposes the budget to price swings and sanctions.\n\n" +
      "Protracted war in Ukraine drained manpower and modern equipment, yet nuclear signaling and hybrid tactics remain tools of escalation management.",
    background:
      "Largest country by area, spanning Europe and Asia with ethnic diversity held by vertical patronage rather than federal consent.",
    governmentSystem:
      "Super-presidential republic with managed elections, weak party pluralism, and constitutional changes that extended executive tenure.",
    economyNarrative:
      "Hydrocarbons, metals, and grain exports finance imports of technology the domestic base no longer produces at scale under sanctions.",
    securityNarrative:
      "Mass artillery and missile stocks, strategic nuclear force, and private military networks — conventional quality varies sharply by unit and sector.",
    whyItMatters:
      "European security, energy markets, and nuclear risk all run through Moscow's choices.",
  }),
];

export const countryReferences: readonly CountryReferenceT[] = REFERENCE_INPUTS;

const byNation = new Map(REFERENCE_INPUTS.map((entry) => [entry.nationId as string, entry]));

export function countryReferenceFor(nationId: string): CountryReferenceT | undefined {
  return byNation.get(nationId);
}
