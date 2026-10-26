import type { Organization, WorldDataset } from "../schemas/index.js";
import { FOUNDING_DYADS, type DyadRow } from "../dataset/dyads.js";
import { ORGANIZATION_SOURCES, organizations as shippedOrganizations } from "../dataset/orgs-cradles.js";
import type { ValidationError } from "./validation-error.js";

// What the organization registry must hold beyond its shape: a defense scope
// only where the body is a defense body and one read from a treaty text, no
// government inside two customs unions, and a dated source for every shipped
// roster. Members on the roster are the reference checks' job. The sourced
// dyads ride here too, because they are the other half of the founding
// board's authored ties and the rule is the same one: no row without the page
// it was read from and the day.

const LINK = /^https:\/\/\S+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const error = (path: string, message: string): ValidationError => ({ kind: "plausibility", path, message });

function scopeErrors(org: Organization): ValidationError[] {
  const scope = org.defenseScope;
  if (!scope) return [];
  const path = `organizations.${org.id}.defenseScope`;
  const errors: ValidationError[] = [];
  if (org.kind !== "defense") errors.push(error(path, `${org.name} is not a defense body, so a scope binds nothing`));
  if (scope.kind === "area" && (scope.area ?? []).length === 0) errors.push(error(path, "an area scope names no area"));
  if (scope.kind === "parties-territory" && scope.area !== undefined) {
    errors.push(error(path, "a territorial scope names an area it does not use"));
  }
  if (!LINK.test(scope.source)) errors.push(error(path, "a scope is read from a treaty text, and names none"));
  return errors;
}

function councilErrors(org: Organization): ValidationError[] {
  const rule = org.council;
  if (!rule) return [];
  const path = `organizations.${org.id}.council`;
  const members = new Set(org.members.map((m) => m as string));
  const errors: ValidationError[] = [];
  if (org.kind === "defense") errors.push(error(path, `${org.name} is a defense body, and a voting council binds no one to fight`));
  for (const seat of rule.permanent) {
    if (!members.has(seat as string)) errors.push(error(path, `${seat as string} holds a veto on ${org.name} without a seat`));
  }
  if (rule.threshold > org.members.length) errors.push(error(path, `${org.name} needs ${rule.threshold} votes and has ${org.members.length} seats`));
  if (!LINK.test(rule.source)) errors.push(error(path, "a voting rule is read from a founding text, and names none"));
  return errors;
}

/** A government bound to two common external tariffs would owe two schedules at once. */
function customsUnionErrors(orgs: readonly Organization[]): ValidationError[] {
  const seen = new Map<string, string>();
  const errors: ValidationError[] = [];
  for (const org of orgs.filter((body) => body.tradeCompetence === "customs-union")) {
    for (const member of org.members) {
      const earlier = seen.get(member as string);
      if (earlier) {
        errors.push(error(`organizations.${org.id}.members`, `${member as string} is in two customs unions (${earlier} and ${org.id})`));
      } else {
        seen.set(member as string, org.id);
      }
    }
  }
  return errors;
}

/** The shipped registry's rosters, each with the page it was read from. Checked on the registry itself, whatever dataset is being validated. */
function sourceErrors(): ValidationError[] {
  return shippedOrganizations.flatMap((org) => {
    const source = ORGANIZATION_SOURCES[org.id];
    const path = `organizations.${org.id}`;
    if (!source) return [error(path, `${org.name} names no source for its roster`)];
    return [
      ...(LINK.test(source.source) ? [] : [error(path, `${org.name}'s roster source is not a link`)]),
      ...(DAY.test(source.asOf) ? [] : [error(path, `${org.name}'s roster has no date it was read`)]),
    ];
  });
}

const inRange = (value: number, low: number, high: number) => Number.isFinite(value) && value >= low && value <= high;

/** One sourced pair: refused without a link and an opened date, and read only inside its schema ranges. */
export function dyadErrors(row: DyadRow, index: number): ValidationError[] {
  const path = `dyads.${index}.${row.pair.join("-")}`;
  const errors: ValidationError[] = [];
  if (!LINK.test(row.source)) errors.push(error(path, "a sourced pair names no page it was read from"));
  if (!DAY.test(row.opened)) errors.push(error(path, "a sourced pair has no day its source was opened"));
  if (!(row.pair[0] < row.pair[1])) errors.push(error(path, "a pair is written lower id first, once"));
  if (!inRange(row.intensity, 0, 1) || row.intensity === 0) errors.push(error(path, "intensity is outside (0, 1]"));
  const levels = row.levels;
  if (levels) {
    const ok =
      levels.trust.every((v) => inRange(v, -1, 1)) && inRange(levels.tension, 0, 1) && levels.threat.every((v) => inRange(v, 0, 1));
    if (!ok) errors.push(error(path, "a level is outside its schema range"));
  }
  return errors;
}

/** The registry's cross-record rules, and the sourced dyads'. */
export function checkOrganizations(dataset: WorldDataset): ValidationError[] {
  return [
    ...dataset.organizations.flatMap(scopeErrors),
    ...dataset.organizations.flatMap(councilErrors),
    ...customsUnionErrors(dataset.organizations),
    ...sourceErrors(),
    ...FOUNDING_DYADS.flatMap(dyadErrors),
  ];
}
