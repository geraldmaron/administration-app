import { countryReferenceFor } from "@admin/world";
/**
 * Authored reference prose for a nation. Returns undefined when no stub exists.
 *
 * Simulation state — live stats, relationships, conflicts, and conditions —
 * always comes from the campaign separately. This selector is dossier context
 * only; it must never be treated as a second source of numbers or posture.
 */
export function selectCountryReference(nationId) {
    return countryReferenceFor(nationId);
}
