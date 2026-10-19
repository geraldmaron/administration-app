import { z } from "zod";
// The type the persona modules are written against, kept apart from the
// registry so a persona module can import it without importing its siblings.
export const PersonaId = z.enum(["the-embed", "the-architect-of-dread", "the-room", "the-beat"]);
