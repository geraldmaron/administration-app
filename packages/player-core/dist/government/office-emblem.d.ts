import { type InstitutionId } from "@admin/engine";
/** The glyph for an office: its own, its body's, or its kind's, and a building where none says more. */
export declare function officeEmblem(institution: InstitutionId, office?: string): string;
/**
 * The glyph for whoever an act consults: a cabinet chair by its department, a
 * body by what it is. The bodies are sentences, so they are read by their
 * opening words; anything unrecognized wears a building rather than a guess.
 */
export declare function consulteeEmblem(consultee: {
    readonly roleId: string;
} | {
    readonly body: string;
}): string;
