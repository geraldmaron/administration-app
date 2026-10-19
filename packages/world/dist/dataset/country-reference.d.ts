import { type CountryReference as CountryReferenceT } from "../schemas/country-reference.js";
export declare const countryReferences: readonly CountryReferenceT[];
export declare function countryReferenceFor(nationId: string): CountryReferenceT | undefined;
