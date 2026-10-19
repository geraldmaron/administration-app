// Recurring fictional corporate/institutional actor identity, split out of
// scenario.ts for the same reason scenario-topics.ts is: keep that file under
// its size ceiling, and keep one closed vocabulary in its own module.
import { z } from "zod";
export const ENTITY_REGISTRY = [
    {
        id: "voss-shipyard",
        name: "Voss Shipyard",
        sector: "shipbuilding",
        homeNation: "USA",
        // The same yard across an arc: it takes the loan in
        // "the-yard-that-builds-the-boats" and "the-surplus-that-came-back-to-argue"
        // (both `economy-000`, sharing the `guaranteed-the-shipyard-loan` flag)
        // and the government collects on having backed it in
        // "the-return-on-the-yard-we-stood-behind" (`triumph-000`) — the
        // shipyard-twice-on-purpose case this registry exists for.
        firstAppearance: "the-yard-that-builds-the-boats",
    },
    {
        id: "restwell-cemetery",
        name: "Restwell Cemetery",
        sector: "civic-memorial",
        homeNation: "USA",
        // Already named in the prose, not just generic: "Restwell Cemetery fills
        // this autumn" (`the-ground-families-know`, `broad-pool-01`).
        firstAppearance: "the-ground-families-know",
    },
    {
        id: "national-orchestra",
        name: "The National Orchestra",
        sector: "cultural-institution",
        homeNation: "USA",
        // The funding fight recurs across `culture-000`'s arc; this is the
        // scenario where the orchestra's identity as a standing institution
        // (distinct from "the orchestra" as a generic noun) is first at stake.
        firstAppearance: "the-orchestra-choice",
    },
    {
        id: "capital-theater",
        name: "The Capital Theater",
        sector: "cultural-institution",
        homeNation: "USA",
        // "Capital theater" and "the capital's theater" recur across
        // `culture-000` (`regional-theater-divide` and its siblings) as the one
        // venue every touring-versus-capital allocation returns to.
        firstAppearance: "regional-theater-divide",
    },
    {
        id: "library-quarter-trust",
        name: "The Library Quarter Trust",
        sector: "civic-institution",
        homeNation: "USA",
        // The heritage district whose foundations are sinking in
        // "the-library-quarter" (`culture-000`) — named in the scenario as a
        // specific quarter, not a generic library.
        firstAppearance: "the-library-quarter",
    },
    {
        id: "provincial-touring-company",
        name: "The Provincial Touring Company",
        sector: "cultural-institution",
        homeNation: "USA",
        // The "touring companies" / "traveling company" that recurs opposite the
        // Capital Theater in the same `culture-000` arc.
        firstAppearance: "regional-theater-divide",
    },
];
const KNOWN_ENTITY_IDS = new Set(ENTITY_REGISTRY.map((entry) => entry.id));
export const EntityRegistryId = z.enum(ENTITY_REGISTRY.map((entry) => entry.id));
export function auditEntities(def, sink) {
    for (const entity of def.entities ?? []) {
        if (KNOWN_ENTITY_IDS.has(entity))
            continue;
        sink.push({
            kind: "unknown-entity",
            severity: "error",
            scenario: def.id,
            message: `entities includes "${entity}", which is not in the closed entity registry (${ENTITY_REGISTRY.map((entry) => entry.id).join(", ")})`,
        });
    }
}
