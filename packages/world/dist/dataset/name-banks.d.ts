import { NameBank } from "../schemas/people-pool.js";
export declare const NAME_CULTURES: readonly ["anglo", "hispanic", "lusophone", "germanic", "dutch", "nordic", "french", "italian", "slavic-east", "polish", "hungarian", "turkish", "arabic", "persian", "hebrew", "south-asian", "afghan", "han", "japanese", "korean", "vietnamese", "thai", "southern-african", "central-african", "indonesian"];
export type NameCulture = (typeof NAME_CULTURES)[number];
export declare const NAME_BANKS: Record<NameCulture, NameBank>;
