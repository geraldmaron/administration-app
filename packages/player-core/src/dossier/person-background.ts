import { schoolById, type Person, type RoleId } from "@admin/world";
import { roleTitle } from "../format/figures";

// What a person's file says about them before any campaign has placed them:
// where they studied and which chairs their record qualifies them for. It
// reads the Person alone, so the founding can show a candidate's full file
// before the oath exists, and the file in play reads the same lines through
// `personDossier` instead of deriving them a second way.

export type PersonEducation = {
  readonly school: string;
  readonly field: string;
  readonly postgraduate: boolean;
};

export type PersonEligibility = { readonly role: RoleId; readonly title: string };

export type PersonBackgroundReading = {
  readonly education: PersonEducation;
  /** The chairs their record makes them eligible for, as the charter titles them. */
  readonly eligible: readonly PersonEligibility[];
};

export function personEducation(person: Person): PersonEducation {
  const education = person.education;
  const school = schoolById.get(education.school as string);
  return {
    school: school?.name ?? String(education.school),
    field: education.field,
    postgraduate: education.postgraduate,
  };
}

/** The education and eligible chairs on a person's file, read off the person and the charter's own titles. */
export function personBackground(person: Person, titles?: Readonly<Record<string, string>>): PersonBackgroundReading {
  return {
    education: personEducation(person),
    eligible: person.eligibleRoles.map((role) => ({ role, title: roleTitle(role, titles) })),
  };
}
