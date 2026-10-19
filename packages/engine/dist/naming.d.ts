import { type AnyNameCulture, type NameGroup, type PortraitGenderPresentation, type RoyalHouse } from "@admin/world";
import type { RngStream } from "./rng.js";
/**
 * A name in the possessive, by the rule American style actually uses: a name
 * already ending in s takes the apostrophe alone.
 */
export declare function possessive(name: string): string;
/**
 * What a charter calls the chair it seats.
 *
 * Role ids are the cross-charter contract every rule keys on; the title is
 * presentation, and a charter that authors its own wins over the derived form.
 * The engine needs this as much as a screen does, because narration it writes
 * is player-facing text: a sentence that hardcoded "the President" would be a
 * sentence that lies under every charter but one, and the whole reason role ids
 * and role titles are separate is so that never has to happen.
 */
export declare function roleTitle(roleId: string, titles?: Readonly<Record<string, string>>): string;
/**
 * What the charter calls the person the player is playing, with the article a
 * sentence needs in front of it — "the President", "the Chancellor".
 */
export declare function headOfGovernmentTitle(leadRole: string, titles?: Readonly<Record<string, string>>): string;
/** Whether a display name needs "the" in front of it in running prose. */
export declare function takesDefiniteArticle(name: string): boolean;
/**
 * A country as a sentence carries it: "the United States", "Germany".
 *
 * `identity` is passed rather than a bare string so the dataset can settle the
 * question itself the moment it carries the field; nothing here overrides an
 * authored answer.
 */
export declare function nationName(identity: {
    readonly name: string;
    readonly definiteArticle?: boolean;
} | string): string;
/** The same name at the head of a sentence, where the article is capitalized. */
export declare function sentenceCase(text: string): string;
/**
 * The names a pool has already used.
 *
 * Drawing every person in complete ignorance of everyone else is fine for
 * attributes and wrong for names: in a nation's own cast it puts 8.7% of people
 * on a first name they share with a colleague, gives seven pairs the same full
 * name outright, and can seat two ministers both called Yeva in one cabinet.
 */
export type NameLedger = {
    readonly given: Set<string>;
    readonly full: Set<string>;
};
export declare function newNameLedger(): NameLedger;
/** Who is being named: where they are from, and what their face presents as. */
export type NameSubject = {
    readonly nation: string;
    readonly culture: AnyNameCulture;
    readonly gender: PortraitGenderPresentation;
    /**
     * The one group to name this person from: a bank split by heritage names the
     * person from the group their face was drawn from, and a nation of several
     * traditions names its lead chair from the one that holds it.
     */
    readonly heritageGroup?: NameGroup;
    /** The reigning house, for a monarch or heir in the chair their house holds. */
    readonly royalHouse?: RoyalHouse;
};
/**
 * A name nobody in this pool is already using, and nobody in office is.
 *
 * The constraints are relaxed in the order they matter least: a repeated first
 * name is a blemish, two people with the identical full name is a defect, and
 * both are better than looping forever against a shallow bank. A refused name
 * is never relaxed into: the leaders are fictional, and a head of government
 * drawn under a sitting officeholder's name, or the family name of the man who
 * ran the country, is not. Every attempt draws from the same stream, so the
 * result stays deterministic in the seed.
 */
export declare function drawName(stream: RngStream, subject: NameSubject, taken: NameLedger): string;
