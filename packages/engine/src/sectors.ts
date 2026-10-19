import { worldDataset, type NationId, type SectorId, type SectorMixEntry } from "@admin/world";
import type { Campaign, SectorRuntime } from "./state.js";

// Per-nation closed-enum mix. Dataset rows open the overlay; apply() is the
// only writer of live employment, laborPressure and mix.

export type NationSectors = Readonly<Partial<Record<SectorId, SectorRuntime>>>;

function seedEntry(nation: NationId, entry: SectorMixEntry): SectorRuntime {
  return {
    nation,
    sector: entry.sector,
    mix: entry.mix,
    employment: entry.employment,
    laborPressure: entry.laborPressure,
  };
}

function sliceFrom(nation: NationId, entries: readonly SectorMixEntry[]): NationSectors {
  const slice: Record<string, SectorRuntime> = {};
  for (const entry of entries) {
    slice[entry.sector] = seedEntry(nation, entry);
  }
  return slice;
}

function datasetEntries(nation: NationId): readonly SectorMixEntry[] {
  return worldDataset.nations.find((row) => row.id === nation)?.sectors ?? [];
}

/**
 * Opening overlay. No-arg form reads `worldDataset.nations` the way
 * `openingStates` reads the state table — a v23 save has no `base.sectors`.
 * A fixture may pass live runtimes; missing `sectors` still falls back to
 * the dataset rather than throwing.
 */
export function openingSectors(
  nations?: Readonly<
    Record<NationId, { readonly base: { readonly id: NationId; readonly sectors?: readonly SectorMixEntry[] } }>
  >,
): Readonly<Record<NationId, NationSectors>> {
  if (!nations) {
    const table: Record<string, NationSectors> = {};
    for (const nation of worldDataset.nations) {
      table[nation.id] = sliceFrom(nation.id, nation.sectors);
    }
    return table as Readonly<Record<NationId, NationSectors>>;
  }
  const table: Record<string, NationSectors> = {};
  for (const runtime of Object.values(nations)) {
    table[runtime.base.id] = sliceFrom(runtime.base.id, runtime.base.sectors ?? datasetEntries(runtime.base.id));
  }
  return table as Readonly<Record<NationId, NationSectors>>;
}

export function selectSector(
  campaign: Campaign,
  nation: NationId,
  sector: SectorId,
): SectorRuntime | undefined {
  return campaign.sectors[nation]?.[sector];
}
