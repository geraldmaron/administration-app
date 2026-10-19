import { z } from "zod";
import { CareerArchetype } from "./background.js";
/**
 * What one person is to another, and where that came from.
 *
 * These were one enum, and it mixed two questions that answer differently.
 * `mentor` and `rival` say what the relationship IS; `military`, `academic` and
 * `business` say where it CAME FROM. A single list holding both could not
 * express "a rival from the same party" or "a former colleague from the
 * diplomatic corps" — it had to pick one of the two facts and drop the other —
 * and it grew a synonym every time a new source of acquaintance appeared.
 */
/**
 * The meaning half, kept deliberately small.
 *
 * `mentor` is DIRECTIONAL and is the only kind that is: the edge runs from the
 * senior figure to the junior one, so one edge carries both readings and the
 * dossier decides which word to print from which end it is read at. The retired
 * enum declared a separate `protege` member for the other end and no rule ever
 * emitted one, which left every junior half of a mentorship reading "Mentor" on
 * their own file.
 */
export declare const PersonTieKind: z.ZodEnum<{
    mentor: "mentor";
    peer: "peer";
    ally: "ally";
    rival: "rival";
    "former-colleague": "former-colleague";
    "prior-counterpart": "prior-counterpart";
}>;
export type PersonTieKind = z.infer<typeof PersonTieKind>;
/**
 * Where a tie came from — a working life the two people actually shared, or a
 * school, or a party.
 *
 * Every member is a fact a person record already carries. `education` is a
 * shared `Education.school`; `party` is a shared `Person.party` or a shared
 * run in party organizing, which is one world and not two; the rest are the
 * career archetypes two people can share a decade of, folded only where two
 * archetypes describe the same trade (`state-media` and `independent-press`
 * are both `press`). Nothing here is a category the dataset does not hold, and
 * every archetype reaches one, so no tie can be seated with no honest word for
 * where it came from.
 */
export declare const TieProvenance: z.ZodEnum<{
    law: "law";
    medicine: "medicine";
    "civil-service": "civil-service";
    business: "business";
    academia: "academia";
    "local-government": "local-government";
    activism: "activism";
    military: "military";
    education: "education";
    party: "party";
    intelligence: "intelligence";
    diplomatic: "diplomatic";
    press: "press";
    labor: "labor";
}>;
export type TieProvenance = z.infer<typeof TieProvenance>;
/**
 * The career archetype behind each career-shaped provenance.
 *
 * Total in both directions on purpose. A new `CareerArchetype` fails to compile
 * here until somebody says what a tie built on it is called, rather than
 * falling silently into a catch-all that names the wrong working life.
 */
export declare const PROVENANCE_OF_ARCHETYPE: Readonly<Record<CareerArchetype, TieProvenance>>;
export declare const PersonConnection: z.ZodObject<{
    from: z.core.$ZodBranded<z.ZodString, "PersonId", "out">;
    to: z.core.$ZodBranded<z.ZodString, "PersonId", "out">;
    kind: z.ZodEnum<{
        mentor: "mentor";
        peer: "peer";
        ally: "ally";
        rival: "rival";
        "former-colleague": "former-colleague";
        "prior-counterpart": "prior-counterpart";
    }>;
    provenance: z.ZodEnum<{
        law: "law";
        medicine: "medicine";
        "civil-service": "civil-service";
        business: "business";
        academia: "academia";
        "local-government": "local-government";
        activism: "activism";
        military: "military";
        education: "education";
        party: "party";
        intelligence: "intelligence";
        diplomatic: "diplomatic";
        press: "press";
        labor: "labor";
    }>;
    reason: z.ZodString;
    strength: z.ZodNumber;
}, z.core.$strip>;
export type PersonConnection = z.infer<typeof PersonConnection>;
