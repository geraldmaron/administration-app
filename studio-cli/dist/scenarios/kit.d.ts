import { ScenarioDef } from "@admin/content";
import { type CorpusDeed } from "../corpus/shard-store.js";
export declare const KIT_KIND = "administration-scenario-batch";
export type KitInputs = {
    readonly doctrine: string;
    readonly exemplars: readonly ScenarioDef[];
};
export type Kit = {
    readonly version: string;
    readonly files: Readonly<Record<string, string>>;
};
export declare function writerDoctrine(doctrine: string): string;
export declare function assembleKit(inputs: KitInputs): Kit;
export declare function repoKitInputs(root?: string): KitInputs;
export declare function currentKitVersion(root?: string): string;
/**
 * What the shipped corpus already holds, for de-duplication. Not part of the
 * version: the corpus grows with every publish, and a batch written a week ago
 * is not stale because someone else's landed since.
 */
export declare function corpusListing(bodies: readonly ScenarioDef[]): string;
/** The deeds the corpus remembers, grouped by the setter's class so an author searches one section. */
export declare function deedListing(deeds: readonly CorpusDeed[]): string;
/**
 * The whole kit as it should be committed: the rules, plus what the corpus
 * baked into the app holds and needs. Built from tracked files only, so a
 * fresh checkout renders the same bytes and the kit-current gate can hold it.
 */
export declare function renderKit(root?: string): Kit;
export declare function writeKit(outDir: string, root?: string): Promise<Kit>;
