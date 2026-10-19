import type { AnyNameCulture } from "./name-cultures.js";
/** Whether a culture writes a woman's surname differently from a man's. */
export declare function hasGenderedSurnames(nation: string, culture: AnyNameCulture): boolean;
/**
 * The surname a person carries, from the form the bank holds: a feminine
 * inflection for a woman where the language has one, and in Iceland the
 * patronymic built on the father's name.
 */
export declare function surnameFor(nation: string, culture: AnyNameCulture, drawn: string, gender: "masculine" | "feminine" | "androgynous"): string;
