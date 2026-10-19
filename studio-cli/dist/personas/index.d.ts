import type { ScenarioClass, ScenarioSeverity } from "@admin/content";
import { PersonaId, type DirectorPersona } from "./persona.js";
export { PersonaId, type DirectorPersona } from "./persona.js";
export { THE_ARCHITECT_OF_DREAD } from "./the-architect-of-dread.js";
export { THE_BEAT } from "./the-beat.js";
export { THE_EMBED } from "./the-embed.js";
export { THE_ROOM } from "./the-room.js";
export declare const PERSONAS: Readonly<Record<PersonaId, DirectorPersona>>;
export declare function personaForClass(cls: ScenarioClass): PersonaId;
/**
 * The routed director for a cell. Severity outranks class: a routine week goes
 * to THE BEAT whatever its class, because the everyday register is the point
 * of a routine week and every class has ordinary ones. Below that, cast is
 * what separates a scandal the room has to survive from one a service is
 * running: a scandal with a foreign counterpart is an espionage story wearing
 * a scandal's clothes, so it goes to the persona that writes withheld
 * information and delayed fuses.
 */
export declare function personaFor(cell: {
    readonly class: ScenarioClass;
    readonly cast: string;
    readonly severity: ScenarioSeverity;
}): PersonaId;
/** Per-cell override first, then the job-level flag, then the severity/class map. */
export declare function resolvePersona(cell: {
    readonly class: ScenarioClass;
    readonly cast: string;
    readonly severity: ScenarioSeverity;
    readonly persona?: PersonaId;
}, jobPersona?: PersonaId): PersonaId;
export declare function personaSection(id: PersonaId): string;
