import type { CareerArchetype, Person, StudyField } from "@admin/world";
import { officeInstitution, type OfficeId } from "./institutions.js";
import type { SeatKind } from "./appointment-eligibility.js";

// What a seat hires, as careers and fields with weights: the relevance half of
// the appointment pool (appointment-pool.ts). One table for every seat, so the
// Treasury, the FDA and a circuit court are read the same way and differ only
// in what their domains name.

/**
 * Careers each domain hires, each with what a year in it is worth when the
 * domain is a body's primary one. A domain further down a body's list credits
 * every career it names at one. The civil service is a modest weight nearly
 * everywhere, because it is the career every department hires from and a
 * heavy weight made one career bureaucrat the first name for the EPA and
 * Justice at once.
 */
const DOMAIN_LIFE: Readonly<Record<string, readonly (readonly [CareerArchetype, number])[]>> = {
  intelligence: [["intelligence-service", 3], ["military-command", 2]],
  security: [["intelligence-service", 2], ["military-command", 2], ["diplomatic-corps", 1]],
  defense: [["military-command", 3], ["civil-service", 1]],
  foreign: [["diplomatic-corps", 3]],
  trade: [["diplomatic-corps", 2], ["business", 2]],
  economy: [["business", 2], ["academia", 3]],
  monetary: [["academia", 3], ["business", 2], ["civil-service", 1]],
  fiscal: [["business", 3], ["civil-service", 1]],
  budget: [["civil-service", 2], ["academia", 2], ["business", 1]],
  regulation: [["private-law", 3], ["civil-service", 1]],
  banking: [["business", 3], ["private-law", 1]],
  environment: [["academia", 3], ["civil-service", 1]],
  energy: [["academia", 3], ["business", 2]],
  climate: [["academia", 3]],
  health: [["medicine", 3], ["academia", 3]],
  agriculture: [["local-government", 2], ["business", 2]],
  labor: [["labor-union", 3], ["activism", 1]],
  education: [["academia", 3], ["local-government", 1]],
  housing: [["local-government", 3]],
  infrastructure: [["local-government", 2], ["civil-service", 1]],
  veterans: [["military-command", 3], ["civil-service", 1]],
  homeland: [["intelligence-service", 2], ["military-command", 2], ["civil-service", 1]],
  immigration: [["private-law", 2], ["civil-service", 1]],
  "law-enforcement": [["private-law", 3], ["civil-service", 1]],
  judicial: [["private-law", 3], ["judiciary", 3]],
  technology: [["academia", 3], ["business", 2]],
  cyber: [["intelligence-service", 3], ["academia", 2]],
  space: [["military-command", 2], ["academia", 2]],
  domestic: [["civil-service", 1], ["local-government", 1]],
  // Read only by the vice presidency, the one Senate-confirmed office whose
  // body leads with this domain. The two section 2 Vice Presidents came from
  // party leadership in Congress and from a statehouse (Ford, 1973; Rockefeller,
  // 1974), so a life in party politics or state and local office is what counts.
  executive: [["party-organizing", 3], ["local-government", 2], ["private-law", 1]],
};

/** Fields each domain hires. */
const DOMAIN_STUDY: Readonly<Record<string, readonly StudyField[]>> = {
  intelligence: ["international-relations", "military-science"],
  security: ["military-science", "international-relations"],
  defense: ["military-science"],
  foreign: ["international-relations"],
  trade: ["economics", "international-relations"],
  economy: ["economics"],
  monetary: ["economics"],
  fiscal: ["economics", "public-administration"],
  budget: ["economics", "public-administration"],
  regulation: ["law", "public-administration"],
  banking: ["economics", "law"],
  environment: ["natural-sciences"],
  energy: ["engineering", "natural-sciences"],
  climate: ["natural-sciences"],
  health: ["medicine", "natural-sciences"],
  agriculture: ["natural-sciences", "economics"],
  "law-enforcement": ["law"],
  judicial: ["law"],
  technology: ["engineering", "natural-sciences"],
  cyber: ["engineering"],
  space: ["engineering", "natural-sciences"],
  education: ["public-administration"],
  immigration: ["law"],
};

/**
 * What a seat hires: a weight per year in each career, the fields it hires and
 * what one of them is worth in years, the careers that only count for someone
 * who studied the seat's own field, and the years at which more stops adding.
 * An academic counts for the FDA only if what they taught was medicine or the
 * sciences; without that, an economist and an engineer topped the FDA and the
 * NIH because those bodies' second domains hire economists and engineers.
 */
export type SeatLens = {
  readonly weights: ReadonlyMap<CareerArchetype, number>;
  readonly primary: ReadonlySet<CareerArchetype>;
  readonly studies: ReadonlySet<StudyField>;
  readonly primaryStudies: ReadonlySet<StudyField>;
  readonly studyYears: number;
  readonly fieldBound: ReadonlySet<CareerArchetype>;
  readonly saturation: number;
};

const STUDY_YEARS = 12;

function domainLens(domains: readonly string[]): SeatLens {
  const own = DOMAIN_LIFE[domains[0] ?? ""] ?? [];
  const weights = new Map<CareerArchetype, number>();
  for (const [archetype] of domains.slice(1).flatMap((domain) => DOMAIN_LIFE[domain] ?? [])) weights.set(archetype, 1);
  for (const [archetype, weight] of own) weights.set(archetype, Math.max(weight, weights.get(archetype) ?? 0));
  return {
    weights,
    primary: new Set(own.filter(([, weight]) => weight >= 2).map(([archetype]) => archetype)),
    studies: new Set(domains.flatMap((domain) => DOMAIN_STUDY[domain] ?? [])),
    primaryStudies: new Set(DOMAIN_STUDY[domains[0] ?? ""] ?? []),
    studyYears: STUDY_YEARS,
    fieldBound: new Set<CareerArchetype>(["academia"]),
    saturation: 75,
  };
}

// The bench: a judge first, then a practitioner or a law teacher, then a
// government lawyer. Everyone offered has a legal career, so the field is
// part of the floor rather than a reason to prefer one name over another.
const JUDICIAL_LENS: SeatLens = {
  weights: new Map<CareerArchetype, number>([["judiciary", 4], ["private-law", 2], ["academia", 1.5], ["civil-service", 0.5]]),
  primary: new Set<CareerArchetype>(["judiciary", "private-law"]),
  studies: new Set<StudyField>(["law"]),
  primaryStudies: new Set<StudyField>(["law"]),
  studyYears: 10,
  fieldBound: new Set<CareerArchetype>(["academia", "civil-service"]),
  saturation: 100,
};

const COMMAND_LENS: SeatLens = {
  weights: new Map<CareerArchetype, number>([["military-command", 3], ["intelligence-service", 1]]),
  primary: new Set<CareerArchetype>(["military-command"]),
  studies: new Set<StudyField>(["military-science"]),
  primaryStudies: new Set<StudyField>(["military-science"]),
  studyYears: 6,
  fieldBound: new Set<CareerArchetype>(),
  saturation: 90,
};

// The Attorney General: no statute requires a lawyer (28 U.S.C. §503), and the
// owner's standard is a strong preference for one, so reading law weighs as
// much as a decade of practice on top of the practice itself.
const ATTORNEY_GENERAL_ROLE = "role-attorney-general";
const ATTORNEY_GENERAL_LAW_YEARS = 30;

/** What this seat hires. */
export function lensFor(office: OfficeId, kind: SeatKind): SeatLens {
  if (kind === "justice" || kind === "circuit") return JUDICIAL_LENS;
  if (kind === "joint-chiefs") return COMMAND_LENS;
  const institution = officeInstitution(office);
  const lens = domainLens(institution?.domains ?? []);
  if ((institution?.cabinetRole as string | undefined) !== ATTORNEY_GENERAL_ROLE || kind !== "cabinet") return lens;
  return { ...lens, primaryStudies: new Set<StudyField>(["law"]), studies: new Set([...lens.studies, "law"]), studyYears: ATTORNEY_GENERAL_LAW_YEARS };
}

/** A person's years in what the seat hires, and the careers they came from, heaviest first. */
export type Relevance = {
  readonly score: number;
  readonly years: number;
  /** Each counted career with its years, longest first. */
  readonly careers: readonly { readonly archetype: CareerArchetype; readonly years: number }[];
  readonly studied: boolean;
  /** Whether anything in the life is in the seat's primary domain, which is the floor below the cabinet. */
  readonly primary: boolean;
};

export function relevanceOf(person: Pick<Person, "career" | "education">, lens: SeatLens): Relevance {
  const studied = lens.studies.has(person.education.field);
  const ownField = lens.primaryStudies.has(person.education.field);
  const counted = person.career.filter((post) => lens.weights.has(post.archetype) && (!lens.fieldBound.has(post.archetype) || ownField));
  const byCareer = new Map<CareerArchetype, number>();
  for (const post of counted) byCareer.set(post.archetype, (byCareer.get(post.archetype) ?? 0) + post.years);
  const careers = [...byCareer.entries()].sort((a, b) => b[1] - a[1]).map(([archetype, years]) => ({ archetype, years }));
  const years = counted.reduce((sum, post) => sum + post.years, 0);
  const study = studied ? lens.studyYears * (ownField ? 1 : 0.5) : 0;
  const score = counted.reduce((sum, post) => sum + post.years * (lens.weights.get(post.archetype) ?? 0), study);
  const primary = counted.some((post) => lens.primary.has(post.archetype)) || ownField;
  return { score, years, careers, studied, primary };
}
