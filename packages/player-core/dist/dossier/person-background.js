import { schoolById } from "@admin/world";
import { roleTitle } from "../format/figures";
export function personEducation(person) {
    const education = person.education;
    const school = schoolById.get(education.school);
    return {
        school: school?.name ?? String(education.school),
        field: education.field,
        postgraduate: education.postgraduate,
    };
}
/** The education and eligible chairs on a person's file, read off the person and the charter's own titles. */
export function personBackground(person, titles) {
    return {
        education: personEducation(person),
        eligible: person.eligibleRoles.map((role) => ({ role, title: roleTitle(role, titles) })),
    };
}
