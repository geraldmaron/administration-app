import { NameBank, NameGroup } from "../schemas/people-pool.js";
export declare const REGIONAL_NAME_CULTURES: readonly ["russian", "ukrainian", "kazakh", "uzbek", "tajik", "kyrgyz", "turkmen", "gulf-arabic", "maghrebi", "mauritanian", "tigrinya", "chadian", "comorian", "maldivian", "malay", "burmese", "south-african", "malaysian", "nigerian"];
export type RegionalNameCulture = (typeof REGIONAL_NAME_CULTURES)[number];
/**
 * The traditions a nation's people are named from, by rounded share of its
 * population: South Africa's Nguni, Sotho-Tswana, Afrikaans and English
 * speakers; Malaysia's Malays and Chinese; Nigeria's Hausa-Fulani north,
 * Yoruba southwest and Igbo southeast.
 */
export declare function composites(parts: {
    readonly sothoTswana: NameGroup;
    readonly anglo: NameGroup;
    readonly han: NameGroup;
}): Readonly<Record<"south-african" | "malaysian" | "nigerian", NameBank>>;
export declare const REGIONAL_NAME_BANKS: Readonly<Record<Exclude<RegionalNameCulture, "south-african" | "malaysian" | "nigerian">, NameBank>>;
/**
 * Which tradition a multi-tradition nation's lead chair is named from: the
 * one its holder came from on the leader table's date, since a fictional
 * leader stands in for that government and not for the country's average.
 */
export declare const LEAD_TRADITION: Readonly<Record<string, NameGroup>>;
