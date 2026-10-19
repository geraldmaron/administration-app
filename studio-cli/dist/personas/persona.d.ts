import { z } from "zod";
export declare const PersonaId: z.ZodEnum<{
    "the-embed": "the-embed";
    "the-architect-of-dread": "the-architect-of-dread";
    "the-room": "the-room";
    "the-beat": "the-beat";
}>;
export type PersonaId = z.infer<typeof PersonaId>;
/**
 * A director: taste and emphasis for a batch, and nothing else. The prompt is
 * prose the brief quotes verbatim, so it lives in a module of its own — it is
 * versioned, diffable, and pinned by a full-text snapshot, the same discipline
 * the gate list gets by being quoted from the audit's constants.
 */
export type DirectorPersona = {
    readonly id: PersonaId;
    readonly title: string;
    readonly prompt: string;
};
