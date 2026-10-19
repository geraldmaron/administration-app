import { type NationFidelity } from "@admin/world";
/**
 * Where a thin country's file says its numbers come from.
 *
 * A thin record states no figure of its own: every number on its file is one
 * a named source published, or a regional estimate where the source is silent,
 * and its temperament and aims are its region's and archetype's until somebody
 * researches it. A player reading a Tuvalu file is owed that sentence, the same
 * way the authored countries' files are owed the reference brief they have and
 * this one does not. Undefined for a country the dataset states in full.
 */
export declare function figureProvenance(nationId: string, fidelity?: NationFidelity): string | undefined;
