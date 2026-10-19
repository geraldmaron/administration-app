import { type ConsequenceCorpusContext, type ConsequenceFinding } from "@admin/content";
export type ConsequenceValidation = {
    readonly file: string;
    readonly consequences: number;
    readonly shapeErrors: readonly string[];
    readonly findings: readonly ConsequenceFinding[];
    readonly ok: boolean;
};
/**
 * `knownFlags` is the governance memory something else already writes — the
 * bundled scenario vocabulary plus whatever the scenario corpus's replies
 * stamp. Chain closure runs across both content types, so a card gating on a
 * flag a scenario reply sets is legitimate and must not be refused.
 */
export declare function validateConsequenceDocument(file: string, raw: unknown, knownFlags?: readonly string[], corpus?: ConsequenceCorpusContext): ConsequenceValidation;
/** Validate every .json under a directory — the CI shape of the gate. */
export declare function validateConsequenceDir(dir: string): Promise<readonly ConsequenceValidation[]>;
