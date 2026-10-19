import { type NationId, type SectorId, type SectorMixEntry } from "@admin/world";
import type { Campaign, SectorRuntime } from "./state.js";
export type NationSectors = Readonly<Partial<Record<SectorId, SectorRuntime>>>;
/**
 * Opening overlay. No-arg form reads `worldDataset.nations` the way
 * `openingStates` reads the state table — a v23 save has no `base.sectors`.
 * A fixture may pass live runtimes; missing `sectors` still falls back to
 * the dataset rather than throwing.
 */
export declare function openingSectors(nations?: Readonly<Record<NationId, {
    readonly base: {
        readonly id: NationId;
        readonly sectors?: readonly SectorMixEntry[];
    };
}>>): Readonly<Record<NationId, NationSectors>>;
export declare function selectSector(campaign: Campaign, nation: NationId, sector: SectorId): SectorRuntime | undefined;
