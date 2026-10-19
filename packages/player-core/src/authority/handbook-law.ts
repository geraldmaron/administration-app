import type { HandbookChapter } from "../glossary/handbook.js";
import { AUTHORITIES, authorityById } from "./registry.js";
import type { Authority } from "./types.js";

// The Handbook's chapter on the law: every authority in the registry, grouped
// by the power a President reaches for, so a player can read what a power
// rests on before using it. The words are the records' own; this file only
// orders them.

export type LawSection = {
  readonly id: string;
  readonly title: string;
  /** What the section is about, in a sentence or two. */
  readonly summary: string;
  /** Registry ids, in reading order. Every record belongs to exactly one section. */
  readonly authorities: readonly string[];
};

export type LawChapter = HandbookChapter & { readonly sections: readonly LawSection[] };

export const LAW_SECTIONS: readonly LawSection[] = [
  {
    id: "war-and-force",
    title: "War and force",
    summary: "Congress declares war and pays for the forces. The President commands them. The War Powers Resolution sets the clock between the two.",
    authorities: [
      "const-art1-s8-cl11",
      "const-art2-s2-cl1",
      "war-powers-resolution",
      "aumf-2001",
      "combatant-commands",
      "emergency-construction",
      "arms-export-notification",
      "north-atlantic-treaty-art5",
      "un-charter-art51",
    ],
  },
  {
    id: "emergencies-and-sanctions",
    title: "Emergencies and sanctions",
    summary: "A declared national emergency opens powers other statutes hold in reserve. Each power must be named, and Congress can end the emergency.",
    authorities: ["national-emergencies-act", "ieepa", "defense-production-act", "economic-stabilization-act", "youngstown"],
  },
  {
    id: "borders-and-immigration",
    title: "Borders and immigration",
    summary: "Congress writes the grounds for entry. The President enforces them and may suspend the entry of a class of people on a finding.",
    authorities: ["ina-border-control", "ina-212f", "trump-v-hawaii", "state-v-munoz"],
  },
  {
    id: "disasters",
    title: "Disasters",
    summary: "A governor asks and the President declares. Federal help supplements what the state is already doing.",
    authorities: ["stafford-act", "stafford-major-disaster", "stafford-emergency"],
  },
  {
    id: "trade",
    title: "Trade",
    summary: "Tariffs are Congress's to set. Each tariff a President imposes rests on a statute that delegates the power, with its own finding and its own limits.",
    authorities: ["trade-expansion-232", "trade-act-301", "trade-act-122", "trade-act-201", "tariff-act-338"],
  },
  {
    id: "budget-and-spending",
    title: "Budget and spending",
    summary: "No money leaves the Treasury without an appropriation. A President who wants to spend less than Congress voted has to ask.",
    authorities: [
      "const-art1-s9-cl7",
      "antideficiency-act",
      "impoundment-control-act",
      "budget-reconciliation",
      "debt-limit",
      "uniform-guidance-award-terms",
      "fpasa-121",
    ],
  },
  {
    id: "appointments-and-removal",
    title: "Appointments and removal",
    summary: "The President nominates and the Senate confirms. Some offices the President can empty at will, and some only for cause.",
    authorities: [
      "const-art2-s2-cl2",
      "const-art2-s2-cl3",
      "vacancies-reform-act",
      "inspector-general-act",
      "federal-reserve-board",
      "const-art2-s4",
    ],
  },
  {
    id: "law-enforcement",
    title: "Law enforcement",
    summary: "Federal law is enforced through departments the President directs but cannot always instruct. The armed forces police at home only where a statute says so.",
    authorities: [
      "const-art1-s8-cl15",
      "guard-federal-service",
      "insurrection-act",
      "posse-comitatus",
      "const-art1-s9-cl2",
      "non-detention-act",
      "attorney-general-functions",
      "irs-audit-prohibition",
      "federal-property-protection",
      "fair-housing-act",
      "fair-labor-standards-act",
      "help-america-vote-act",
      "const-art1-s4",
    ],
  },
  {
    id: "intelligence-and-secrecy",
    title: "Intelligence and secrecy",
    summary: "Covert action needs a written finding and a report to Congress. Classification and surveillance follow rules the President sets and statutes the President cannot waive.",
    authorities: ["covert-action-findings", "eo-12333", "eo-13526", "fisa"],
  },
  {
    id: "succession-and-disability",
    title: "Succession and disability",
    summary: "If the President cannot govern, the Vice President steps in first. After that comes the order Congress set by statute.",
    authorities: ["const-art2-s1", "amend-25", "presidential-succession-act"],
  },
  {
    id: "laws-rules-and-agreements",
    title: "Laws, rules and agreements",
    summary: "How a bill becomes law at the President's desk, how an executive order and an agency rule are made, how Congress can undo them, and how agreements short of a treaty are reported.",
    authorities: ["const-art1-s7", "const-art2-s3", "eo-11030", "eo-12866", "congressional-review-act", "ocsla", "case-zablocki"],
  },
];

export const LAW_CHAPTER: LawChapter = {
  id: "law",
  title: "The law",
  opens: "After this chapter you can name the law each of your powers rests on, read its limits, and open its text at the source.",
  places: ["policy", "security", "courts", "congress", "emergency", "budget"],
  explainers: [],
  terms: ["executive-order", "war-powers-resolution", "national-emergency", "stafford-act", "sanctions", "covert-action", "confirmation", "inability"],
  sections: LAW_SECTIONS,
};

/** A section's records, in reading order. */
export function lawSectionAuthorities(section: LawSection): readonly Authority[] {
  return section.authorities.flatMap((id) => {
    const authority = authorityById(id);
    return authority ? [authority] : [];
  });
}

/** The section that teaches an authority, so a citation's card can offer "Read the chapter". */
export function lawSectionFor(authorityId: string): LawSection | undefined {
  return LAW_SECTIONS.find((section) => section.authorities.includes(authorityId));
}

/** Records no section places; the tests hold this empty. */
export function unplacedAuthorities(): readonly Authority[] {
  return AUTHORITIES.filter((authority) => lawSectionFor(authority.id) === undefined);
}
