import { type Person, type RoleId } from "@admin/world";
export type PersonEducation = {
    readonly school: string;
    readonly field: string;
    readonly postgraduate: boolean;
};
export type PersonEligibility = {
    readonly role: RoleId;
    readonly title: string;
};
export type PersonBackgroundReading = {
    readonly education: PersonEducation;
    /** The chairs their record makes them eligible for, as the charter titles them. */
    readonly eligible: readonly PersonEligibility[];
};
export declare function personEducation(person: Person): PersonEducation;
/** The education and eligible chairs on a person's file, read off the person and the charter's own titles. */
export declare function personBackground(person: Person, titles?: Readonly<Record<string, string>>): PersonBackgroundReading;
