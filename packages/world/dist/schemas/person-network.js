import { z } from "zod";
import { PersonId } from "./ids.js";
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
export const PersonTieKind = z.enum([
    "mentor",
    "peer",
    "ally",
    "rival",
    "former-colleague",
    "prior-counterpart",
]);
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
export const TieProvenance = z.enum([
    "education",
    "party",
    "civil-service",
    "military",
    "intelligence",
    "diplomatic",
    "law",
    "business",
    "academia",
    "local-government",
    "press",
    "activism",
    "medicine",
    "labor",
]);
/**
 * The career archetype behind each career-shaped provenance.
 *
 * Total in both directions on purpose. A new `CareerArchetype` fails to compile
 * here until somebody says what a tie built on it is called, rather than
 * falling silently into a catch-all that names the wrong working life.
 */
export const PROVENANCE_OF_ARCHETYPE = {
    "civil-service": "civil-service",
    "military-command": "military",
    "intelligence-service": "intelligence",
    "diplomatic-corps": "diplomatic",
    "private-law": "law",
    business: "business",
    academia: "academia",
    "party-organizing": "party",
    "local-government": "local-government",
    "state-media": "press",
    "independent-press": "press",
    activism: "activism",
    medicine: "medicine",
    "labor-union": "labor",
    judiciary: "law",
};
export const PersonConnection = z.object({
    /** For a `mentor` tie this is the senior figure. For every other kind the pair is unordered and sorted by id. */
    from: PersonId,
    to: PersonId,
    kind: PersonTieKind,
    /** The shared history the tie rests on — never inferred from the kind. */
    provenance: TieProvenance,
    /**
     * Plain-English why, citing the deterministic fact the rule actually read:
     * the years two careers overlapped, the seniority at the moment one arrived,
     * the school both attended. Never a claim the person record cannot support.
     */
    reason: z.string().min(12).max(240),
    strength: z.number().min(0).max(1),
});
