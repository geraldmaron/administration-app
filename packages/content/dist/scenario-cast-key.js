import { counterpartGeography } from "./scenario-cast-bodies.js";
/** One bound answer per cast, except a running family's pinned counterpart. */
export function castKey(selector) {
    if (selector.family && selector.family.role !== "opener")
        return `family:${selector.family.id}`;
    const { cast } = selector;
    const geo = counterpartGeography(selector.conditions).map((gate) => `${gate.field}${gate.is}`).sort().join(",");
    switch (cast.pick) {
        case "band":
            return `band:${cast.archetype ?? ""}:${cast.powerTier ?? ""}:${cast.militaryTier ?? ""}:${cast.stabilityBand ?? ""}:${geo}`;
        case "tensest":
        case "closest":
            return `${cast.pick}:${geo}`;
        case "nation":
            return `nation:${cast.nation}`;
        case "belligerent":
            return `belligerent:${cast.side ?? ""}`;
        case "outlet":
            return `outlet:${cast.outlet ?? ""}`;
        case "collectionReport":
        case "tradeMeasure":
        case "liveBill":
        case "judicialVacancy":
        case "pendingOrderCase":
            return `${cast.pick}:${selector.id}`;
        default:
            return cast.pick;
    }
}
