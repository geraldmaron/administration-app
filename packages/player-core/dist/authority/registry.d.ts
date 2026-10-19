import type { OrderAuthority } from "@admin/engine";
import type { Authority } from "./types.js";
export declare const AUTHORITIES: readonly Authority[];
/**
 * The hosts a record may link to: the official publishers of the Code, the
 * Constitution, the Federal Register and the regulations, the National
 * Archives, a free reporter of the Supreme Court's opinions, and the
 * depositaries of the two treaties cited.
 */
export declare const AUTHORITY_SOURCE_HOSTS: readonly string[];
/**
 * Directive authority text that names no single law and so cannot resolve.
 * The independent-body memorandum is generated per commission from the
 * institution catalog, which records that a body is independent but not the
 * statute that made it so; naming one per commission is catalog work.
 */
export declare const DIRECTIVE_AUTHORITY_EXEMPTIONS: readonly {
    readonly pattern: RegExp;
    readonly reason: string;
}[];
/**
 * One spelling for every way a citation is written: case, dashes, "U.S.C."
 * against "USC", "§§" against "Sec.", "Exec. Order No." against "EO", and the
 * "U.S. Const." prefix, which is dropped so "Article II, Section 3" and
 * "U.S. Const. art. II, §3" meet.
 */
export declare function normalizeCite(text: string): string;
export declare function authorityById(id: string): Authority | undefined;
/** Every normalized key the registry answers to, with the records that claim it; the tests hold this to one record per key. */
export declare function authorityKeys(): ReadonlyMap<string, readonly string[]>;
/**
 * The record for a citation or a name, written any of the ways the registry
 * normalizes. A pinpoint cite inside a record's sections finds that record.
 */
export declare function authorityByCite(text: string): Authority | undefined;
/**
 * The first authority a sentence names, by citation or by name: "Authority:
 * 28 U.S.C. § 509 and the Department's standing policy" reaches the Attorney
 * General's functions. Earliest wins, and the longer of two at the same place.
 */
export declare function resolveAuthorityText(freeText: string): Authority | undefined;
export declare function authoritiesForGlossaryTerm(id: string): readonly Authority[];
/** The registry record for the law an executive order's card cites. */
export declare function orderAuthorityRecord(authority: OrderAuthority): Authority | undefined;
