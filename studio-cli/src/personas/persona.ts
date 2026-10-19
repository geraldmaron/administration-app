import { z } from "zod";

// The type the persona modules are written against, kept apart from the
// registry so a persona module can import it without importing its siblings.

export const PersonaId = z.enum(["the-embed", "the-architect-of-dread", "the-room", "the-beat"]);
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
