import type { Nation } from "../schemas/nation.js";
import { NationTraitProfile } from "../schemas/traits.js";
export declare function traitProfileFor(nation: Nation): NationTraitProfile;
export declare const nationTraitProfiles: NationTraitProfile[];
export declare const traitProfileByNation: ReadonlyMap<string, NationTraitProfile>;
