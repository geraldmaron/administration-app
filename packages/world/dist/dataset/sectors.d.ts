import { type SectorId, type SectorMixEntry } from "../schemas/sector.js";
export declare const SECTOR_LABELS: Readonly<Record<SectorId, string>>;
/**
 * Build a mix that sums to 1 from what a nation actually exports and burns.
 * Featured sectors (topExports + extra) take the weight; energy.mix adds a
 * fuel slice; the remainder is thin tails so every nation can be hit on
 * utilities or healthcare without inventing a plant.
 */
export declare function fillSectorMix(featured: readonly SectorId[], energyMix: Readonly<Record<string, number>>, population: number, unemployment: number, extra?: Partial<Record<SectorId, number>>): SectorMixEntry[];
export declare const US_SECTOR_EXTRA: Partial<Record<SectorId, number>>;
