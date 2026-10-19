export type SubjectRef = {
    readonly kind: "person";
    readonly id: string;
} | {
    readonly kind: "office";
    readonly id: string;
} | {
    readonly kind: "nation";
    readonly id: string;
} | {
    readonly kind: "nationAct";
    readonly id: string;
} | {
    readonly kind: "state";
    readonly id: string;
} | {
    readonly kind: "district";
    readonly id: string;
} | {
    readonly kind: "bill";
    readonly id: string;
} | {
    readonly kind: "order";
    readonly id: string;
} | {
    readonly kind: "brief";
    readonly id: string;
} | {
    readonly kind: "treaty";
    readonly id: string;
} | {
    readonly kind: "war";
    readonly id: string;
} | {
    readonly kind: "case";
    readonly id: string;
} | {
    readonly kind: "summons";
    readonly id: string;
} | {
    readonly kind: "metric";
    readonly id: string;
} | {
    readonly kind: "service";
    readonly id: string;
} | {
    readonly kind: "hillPost";
    readonly id: string;
} | {
    readonly kind: "scandal";
    readonly id: string;
} | {
    readonly kind: "dispatch";
    readonly index: number;
};
export type SubjectKind = SubjectRef["kind"];
type SubjectSpec = {
    /** The name of the key that carries the subject's id, path segment or query, so extra query cannot overwrite it. */
    readonly key: string;
    readonly href: (id: string) => string;
    /** What a screen reader calls the place the subject opens on. */
    readonly noun: string;
};
export declare const SUBJECTS: Readonly<Record<SubjectKind, SubjectSpec>>;
/** Where this subject is inspected. The one place a subject url is built. */
export declare function subjectHref(ref: SubjectRef): string;
export declare function subjectHrefWith(ref: SubjectRef, query: Readonly<Record<string, string>>): string;
export declare function subjectNoun(ref: SubjectRef): string;
export declare function subjectHint(ref: SubjectRef, name?: string): string;
export {};
