import type { PortraitHeritage } from "../schemas/portrait.js";
type Mix = ReadonlyArray<{
    heritage: PortraitHeritage;
    weight: number;
}>;
export declare const REGION_HERITAGE_MIX: Readonly<Record<string, Mix>>;
export declare const COUNTRY_HERITAGE_MIX: Readonly<Record<string, Mix>>;
export {};
