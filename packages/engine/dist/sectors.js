import { worldDataset } from "@admin/world";
function seedEntry(nation, entry) {
    return {
        nation,
        sector: entry.sector,
        mix: entry.mix,
        employment: entry.employment,
        laborPressure: entry.laborPressure,
    };
}
function sliceFrom(nation, entries) {
    const slice = {};
    for (const entry of entries) {
        slice[entry.sector] = seedEntry(nation, entry);
    }
    return slice;
}
function datasetEntries(nation) {
    return worldDataset.nations.find((row) => row.id === nation)?.sectors ?? [];
}
/**
 * Opening overlay. No-arg form reads `worldDataset.nations` the way
 * `openingStates` reads the state table — a v23 save has no `base.sectors`.
 * A fixture may pass live runtimes; missing `sectors` still falls back to
 * the dataset rather than throwing.
 */
export function openingSectors(nations) {
    if (!nations) {
        const table = {};
        for (const nation of worldDataset.nations) {
            table[nation.id] = sliceFrom(nation.id, nation.sectors);
        }
        return table;
    }
    const table = {};
    for (const runtime of Object.values(nations)) {
        table[runtime.base.id] = sliceFrom(runtime.base.id, runtime.base.sectors ?? datasetEntries(runtime.base.id));
    }
    return table;
}
export function selectSector(campaign, nation, sector) {
    return campaign.sectors[nation]?.[sector];
}
