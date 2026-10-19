import { type Person, type PersonConnection } from "@admin/world";
import type { CampaignSeed } from "./rng.js";
/**
 * Deterministic social graph over a cast. Derived on demand from
 * `(seed, people)` rather than stored on the campaign save — the same contract
 * the dossier and cabinet tie graph follow, so no migration is required when
 * the rule changes.
 */
export declare function buildPersonNetwork(people: readonly Person[], seed: CampaignSeed, publicOnly?: boolean): PersonConnection[];
export declare function personNetworkFor(people: Readonly<Record<string, {
    readonly base: Person;
    readonly alive?: boolean;
}>>, seed: CampaignSeed, publicOnly?: boolean): readonly PersonConnection[];
