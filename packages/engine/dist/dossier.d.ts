import { type Person } from "@admin/world";
export type DossierSection = {
    readonly heading: string;
    readonly body: string;
};
/**
 * A person's full record, in the order a reader wants it: where they came from,
 * how they got here, what they are known for, what they are like, and what they
 * are to this government now.
 *
 * `role` is passed rather than read off the person because it is the seat the
 * dossier is being read *for* — a candidate is being weighed against a chair
 * they do not yet hold, and their eligibility is the honest fallback.
 */
export declare function composeDossier(person: Person, nationName: string, role?: string): readonly DossierSection[];
