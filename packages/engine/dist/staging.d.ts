import { type NationId } from "@admin/world";
import { type StagingPoint } from "./geography.js";
import { type Campaign } from "./state.js";
/**
 * The governments that sit in a mutual-defense body with this one. A treaty
 * ally's ports and airfields are open to its partner in the way a neutral's are
 * not, which is what made the Gulf War and both Iraq wars possible at all.
 */
export declare function defenseAllies(campaign: Campaign, nation: NationId): readonly NationId[];
/**
 * Every place this government can mount force against the target from, beyond
 * its own capital. The target's own territory is never an ally's staging
 * ground against itself; an installation inside it still stands, because the
 * forces are already there.
 */
export declare function stagingPoints(campaign: Campaign, nation: NationId, target?: NationId): readonly StagingPoint[];
