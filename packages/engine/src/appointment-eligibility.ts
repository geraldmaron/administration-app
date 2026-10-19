import type { Person } from "@admin/world";
import { isCircuitSeat } from "./lower-bench.js";
import { officeDef, officeInstitution, type OfficeId } from "./institutions.js";

// Who the law, or the administration's own standard, lets into a seat at all.
//
// The rules a pool applies before it ranks anybody, and the rules the one
// commit path refuses on, kept together so the list a President is offered and
// the act that sends a name up can never disagree about who may go. The
// statutory rules are read from the U.S. Code as quoted beside each one; the
// legal-career floor for the federal bench is the administration's standard,
// not law, and says so where the player reads it.

/** What kind of seat an office is, which decides the rules and the weights a pool reads it by. */
export type SeatKind =
  | "cabinet"
  | "deputy"
  | "agency"
  | "regulator"
  | "service-secretary"
  | "joint-chiefs"
  | "justice"
  | "circuit";

const SERVICE_SECRETARY_BODIES: ReadonlySet<string> = new Set(["INST-ARMY", "INST-NAVY", "INST-AIRFORCE"]);
const JOINT_CHIEFS_BODY = "INST-JCS";
const DEFENSE_ROLE = "role-defense-minister";

/**
 * The kind of seat an office is, or nothing for an office the Senate does not
 * confirm: a seat the President fills alone has no nomination to send.
 */
export function seatKindOf(office: OfficeId): SeatKind | undefined {
  const def = officeDef(office);
  const institution = officeInstitution(office);
  if (!def || !institution || def.confirmingChamber !== "senate") return undefined;
  if (institution.kind === "judiciary") return isCircuitSeat(institution.id) ? "circuit" : "justice";
  if (institution.offices[0]?.id !== office) return "deputy";
  if (institution.cabinetRole) return "cabinet";
  if (institution.id === JOINT_CHIEFS_BODY) return "joint-chiefs";
  if (SERVICE_SECRETARY_BODIES.has(institution.id)) return "service-secretary";
  return def.appointmentClass === "fixed-term" ? "regulator" : "agency";
}

/** Whether this seat is held for life, which is what makes a nominee's age a reading. */
export function isLifeSeat(kind: SeatKind): boolean {
  return kind === "justice" || kind === "circuit";
}

const UNIFORMED = "military-command";
const LEGAL_LIVES: ReadonlySet<string> = new Set(["private-law", "judiciary"]);

/**
 * A legal career: read law, or practiced it or sat as a judge. The generator
 * draws a field of study and a career separately, so a lawyer of twenty years
 * may carry a degree in public administration; the practice is the career.
 */
export function hasLegalCareer(person: Pick<Person, "career" | "education">): boolean {
  return person.education.field === "law" || person.career.some((post) => LEGAL_LIVES.has(post.archetype));
}

/**
 * Serving: the generator runs a person's last post to their present age, so a
 * last post in command is a career still in uniform.
 */
export function isServingOfficer(person: Pick<Person, "career">): boolean {
  return person.career.at(-1)?.archetype === UNIFORMED;
}

/** Years in command across a career. */
export function commandYears(person: Pick<Person, "career">): number {
  return person.career.reduce((sum, post) => sum + (post.archetype === UNIFORMED ? post.years : 0), 0);
}

/** Years since the last post in uniform ended, or nothing for somebody who never served. */
export function yearsOutOfUniform(person: Pick<Person, "career" | "age">): number | undefined {
  const ends = person.career.filter((post) => post.archetype === UNIFORMED).map((post) => post.startAge + post.years);
  if (ends.length === 0) return undefined;
  return Math.max(0, person.age - Math.max(...ends));
}

// 10 U.S.C. §113(a)(2): seven years after relief from active duty below O-7,
// ten at O-7 or above. Grade is not modeled, so twenty years in command stands
// in for flag rank; that threshold is a modeling assumption, not statute.
const DEFENSE_WAIT_YEARS = 7;
const DEFENSE_FLAG_WAIT_YEARS = 10;
const FLAG_SERVICE_YEARS = 20;
// 10 U.S.C. §§7013(a), 8013(a), 9013(a): seven years for each service secretary.
const SERVICE_SECRETARY_WAIT_YEARS = 7;

function civilianWait(kind: SeatKind, person: Pick<Person, "career">): number {
  if (kind === "service-secretary") return SERVICE_SECRETARY_WAIT_YEARS;
  return commandYears(person) >= FLAG_SERVICE_YEARS ? DEFENSE_FLAG_WAIT_YEARS : DEFENSE_WAIT_YEARS;
}

/** The civilian-life rule for the offices the law reserves for civilians, or nothing where it holds. */
function civilianRefusal(kind: SeatKind, person: Person, title: string): string | undefined {
  const out = yearsOutOfUniform(person);
  if (out === undefined) return undefined;
  const wait = civilianWait(kind, person);
  if (out >= wait) return undefined;
  return out === 0
    ? `${person.name} is a serving officer. The law appoints the ${title} from civilian life.`
    : `${person.name} left active duty ${out} ${out === 1 ? "year" : "years"} ago. The law requires ${wait} before serving as ${title}.`;
}

/**
 * Why this person may not be sent up for this seat at all, or nothing.
 *
 * Nationality and the cabinet's eligible-role bench are not here: the first is
 * the nomination's own structural check, and the second is the pool's gate,
 * because a cabinet chair the agenda or a report proposes a name for has
 * always taken that name on the President's word.
 */
export function seatRuleRefusal(office: OfficeId, person: Person): string | undefined {
  const kind = seatKindOf(office);
  const title = officeDef(office)?.title ?? "office";
  if (!kind) return `${title} is not confirmed by the Senate. There is no nomination to send.`;
  if ((kind === "justice" || kind === "circuit") && !hasLegalCareer(person)) {
    return `${person.name} has no legal career. This administration sends only lawyers to the federal bench.`;
  }
  if (kind === "joint-chiefs" && !isServingOfficer(person)) {
    return `${person.name} is not a serving officer. The Chairman is appointed from the officers of the armed forces.`;
  }
  const defense = kind === "cabinet" && (officeInstitution(office)?.cabinetRole as string | undefined) === DEFENSE_ROLE;
  if (defense || kind === "service-secretary") return civilianRefusal(kind, person, title);
  return undefined;
}
