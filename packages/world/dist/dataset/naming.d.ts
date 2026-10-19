import type { Nation } from "../schemas/nation.js";
export type DisplayNameOptions = {
    /** Prefix the article ("the") when the nation's name takes one. */
    readonly article?: boolean;
};
/**
 * A nation's name as prose carries it: `displayName(usa, { article: true })`
 * is "the United States"; `displayName(japan, { article: true })` is "Japan".
 * Omitting the option (or passing `{ article: false }`) always returns the
 * bare `identity.name`, for the many places — dossier headers, select lists,
 * a possessive already built elsewhere — that want the name on its own.
 */
export declare function displayName(nation: Pick<Nation, "identity">, options?: DisplayNameOptions): string;
