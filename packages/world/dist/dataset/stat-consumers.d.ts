import type { QuantityKind } from "../metrics/definitions.js";
import { type SchemaNode } from "./schema-walk.js";
import { BAND_CONSUMERS, PARTY_CONSUMERS, PERSON_CONSUMERS, TRAIT_CONSUMERS } from "./stat-consumers-people.js";
import { CITY_CONSUMERS, DISTRICT_CONSUMERS, FEDERAL_SITE_CONSUMERS, GEO_CONSUMERS, INSTALLATION_ANCHOR_CONSUMERS, MARITIME_ZONE_CONSUMERS, SECTOR_CONSUMERS, STATE_CAPITOL_CONSUMERS, STATE_CONSUMERS } from "./stat-consumers-places.js";
export { BAND_CONSUMERS, CITY_CONSUMERS, DISTRICT_CONSUMERS, FEDERAL_SITE_CONSUMERS, GEO_CONSUMERS, INSTALLATION_ANCHOR_CONSUMERS, MARITIME_ZONE_CONSUMERS, PARTY_CONSUMERS, PERSON_CONSUMERS, SECTOR_CONSUMERS, STATE_CAPITOL_CONSUMERS, STATE_CONSUMERS, TRAIT_CONSUMERS, };
/**
 * A reader: `repo-relative-path#top-level-declaration`, the key
 * `scripts/rule-seam-census.json` uses, so moving code inside a file never
 * invalidates it. The declaration must be a value (a function, a constant, a
 * class); a type reads nothing.
 */
export type ReaderSite = `${string}#${string}`;
/**
 * Who may change a figure once a campaign is running. `founding-only`: set by
 * the dataset or at founding, and nothing in a campaign writes it.
 * `derived-only`: recomputed from other state by its own derivation, and
 * written by nothing else. `phase-written`:
 * moved only by the turn phase that owns it. `effect-written`: moved by effect
 * packets, from acts, events and phases alike.
 */
export type WritePolicy = "founding-only" | "derived-only" | "phase-written" | "effect-written";
type ConsumerFacts = {
    readonly path: string;
    readonly kind?: QuantityKind;
    readonly writePolicy?: WritePolicy;
};
export type StatConsumer = (ConsumerFacts & {
    readonly readBy: readonly ReaderSite[];
    readonly purpose: string;
}) | (ConsumerFacts & {
    readonly owedBy: string;
});
export declare const STAT_CONSUMERS: readonly StatConsumer[];
/**
 * Every authored surface a rule can read, with the schema its paths are walked
 * from. The paired test iterates this, so covering a new surface is one entry
 * here rather than a new test.
 */
export declare const CONSUMER_REGISTRIES: readonly {
    readonly name: string;
    readonly schema: SchemaNode;
    readonly entries: readonly StatConsumer[];
}[];
export declare const consumerByPath: ReadonlyMap<string, StatConsumer>;
export declare function statLeafPaths(schema?: SchemaNode, prefix?: string): string[];
