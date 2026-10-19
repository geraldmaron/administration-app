import { THE_ARCHITECT_OF_DREAD } from "./the-architect-of-dread.js";
import { THE_BEAT } from "./the-beat.js";
import { THE_EMBED } from "./the-embed.js";
import { THE_ROOM } from "./the-room.js";
export { PersonaId } from "./persona.js";
export { THE_ARCHITECT_OF_DREAD } from "./the-architect-of-dread.js";
export { THE_BEAT } from "./the-beat.js";
export { THE_EMBED } from "./the-embed.js";
export { THE_ROOM } from "./the-room.js";
// Four directors, not one voice and not eighteen. A generated corpus with one
// creative register reads as one writer working through a checklist however
// good the gates are; a persona per class would import signature tics the gates
// would refuse anyway. Three composites keyed to craft principles cover the
// classes with registers a reviewer can tell apart — and the fourth, THE BEAT,
// is keyed to severity rather than class, because any class can have an
// ordinary week and no class-mapped voice was writing them.
export const PERSONAS = {
    "the-embed": THE_EMBED,
    "the-architect-of-dread": THE_ARCHITECT_OF_DREAD,
    "the-room": THE_ROOM,
    "the-beat": THE_BEAT,
};
/**
 * Every class routed, no fallback — a class added to the enum without a
 * director here is a type error rather than a batch that silently generates
 * flat. "scandal" is the one genuinely shared class: it belongs to THE ROOM at
 * home and to THE ARCHITECT OF DREAD abroad, and the class alone cannot say
 * which, so this map takes the domestic reading and `personaFor` corrects it
 * once the cast is known.
 */
const BY_CLASS = {
    war: "the-embed",
    terror: "the-embed",
    hostage: "the-embed",
    disaster: "the-embed",
    "foreign-crisis": "the-embed",
    migration: "the-embed",
    "public-health": "the-embed",
    espionage: "the-architect-of-dread",
    technology: "the-architect-of-dread",
    justice: "the-architect-of-dread",
    institution: "the-architect-of-dread",
    death: "the-architect-of-dread",
    unrest: "the-room",
    economy: "the-room",
    culture: "the-room",
    tragedy: "the-room",
    triumph: "the-room",
    scandal: "the-room",
};
export function personaForClass(cls) {
    return BY_CLASS[cls];
}
/**
 * The routed director for a cell. Severity outranks class: a routine week goes
 * to THE BEAT whatever its class, because the everyday register is the point
 * of a routine week and every class has ordinary ones. Below that, cast is
 * what separates a scandal the room has to survive from one a service is
 * running: a scandal with a foreign counterpart is an espionage story wearing
 * a scandal's clothes, so it goes to the persona that writes withheld
 * information and delayed fuses.
 */
export function personaFor(cell) {
    if (cell.severity === "routine")
        return "the-beat";
    if (cell.class === "scandal" && cell.cast !== "none")
        return "the-architect-of-dread";
    return personaForClass(cell.class);
}
/** Per-cell override first, then the job-level flag, then the severity/class map. */
export function resolvePersona(cell, jobPersona) {
    return cell.persona ?? jobPersona ?? personaFor(cell);
}
export function personaSection(id) {
    return PERSONAS[id].prompt;
}
