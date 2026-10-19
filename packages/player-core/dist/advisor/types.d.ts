import { type SubjectRef } from "../shell/subject";
export type AdvisorHref = string;
export declare function subjectDoor(ref: SubjectRef, query?: Readonly<Record<string, string>>): {
    readonly href: AdvisorHref;
    readonly subject: SubjectRef;
};
