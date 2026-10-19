import { NationTraits, type Nation, type NationTraitProfile } from "@admin/world";
import type { RngStreams } from "./rng.js";
export declare function rollNationTraits(profile: NationTraitProfile, streams: RngStreams): NationTraits;
export declare function rollWorldTraits(nations: readonly Nation[], profiles: readonly NationTraitProfile[], streams: RngStreams): Nation[];
