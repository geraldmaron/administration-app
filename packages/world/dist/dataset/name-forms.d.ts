import type { NameForm, NameGroup } from "../schemas/people-pool.js";
export type NamePresentation = "masculine" | "feminine" | "androgynous";
/**
 * A name in its tradition's order, with the words that join it. The leader
 * table's surname rule for each nation is what these follow: family name
 * first in China, Korea, Vietnam and Cambodia; "bin" or "binti" and the
 * father's name in Malaysia and Brunei; "Ould" or "Mint" in Mauritania.
 */
export declare function composeName(form: NameForm | undefined, given: string, second: string, presentation: NamePresentation): string;
/** Whether a tradition's second name is a father's given name rather than a family name. */
export declare function namesByFather(form: NameForm | undefined): boolean;
/**
 * The reigning house of each monarchy whose lead chair the monarch or the heir
 * holds, and whether its members are named by their fathers before the house.
 * A King of Jordan with a commoner's Levantine surname, or an Emir of Kuwait
 * with no dynasty at all, is not a monarch a reader recognizes. The houses are
 * the states' own constitutional facts, not anyone's personal name, and the
 * people drawn into them are fictional: the real-name guard refuses any
 * pairing that would name a sitting royal.
 */
export type RoyalHouse = {
    readonly house: string;
    readonly nasab: boolean;
};
export declare const ROYAL_HOUSES: Readonly<Record<string, RoyalHouse>>;
/** A royal's name: given name, father's name and house in the Gulf and Jordan; given name and house elsewhere. */
export declare function royalName(house: RoyalHouse, given: string, father: string): string;
/** What a name was drawn from, read back: the tradition, the given name, and the second name as the list holds it. */
export type NameReading = {
    readonly group: NameGroup;
    readonly given: string;
    readonly second: string;
};
/**
 * Reads a drawn name back into one tradition of the groups it may come from:
 * a given name of the group for this presentation, and a second name the group
 * holds, in the form `secondAs` gives it for this person. Undefined when no one
 * tradition can produce the name. For a gate or a test, not a hot path.
 */
export declare function readName(name: string, groups: readonly NameGroup[], presentation: NamePresentation, secondAs: (group: NameGroup, drawn: string) => string, house?: RoyalHouse): NameReading | undefined;
