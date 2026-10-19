// Recurring fictional corporate/institutional actor identity, split out of
// scenario.ts for the same reason scenario-topics.ts is: keep that file under
// its size ceiling, and keep one closed vocabulary in its own module.
import { z } from "zod";
import type { ScenarioDef } from "./scenario.js";

/**
 * A fictional actor a scenario can name so it is recognizably the same actor
 * the next time the room writes it — a shipyard that took a government loan
 * in one scenario can be the shipyard that pays it back in another, on
 * purpose, instead of two coincidentally identical yards.
 *
 * This does not belong beside the real 50-nation dataset in `@admin/world`:
 * a nation there has a validator, a stat-consumers registry and an engine
 * that reads its fields, none of which a shipyard or a cemetery trust needs.
 * It belongs beside `TOPIC_TAGS` in `@admin/content` instead, because a
 * scenario is a CDN content artifact and this is authored content vocabulary
 * exactly like a topic tag — a closed table the writers' room adds to
 * deliberately, not a live simulation entity.
 *
 * Closed for the same reason `TOPIC_TAGS` is: an actor referenced by id is
 * only useful while every scenario that wants that actor's identity spells
 * the id the same way, so a writer's one-off id is worse than none. Seeded
 * from actors the shipped corpus already returns to rather than invented
 * wholesale — see each entry's comment for its source scenario(s).
 */
export type EntityRegistryEntry = {
  readonly id: string;
  readonly name: string;
  readonly sector: string;
  readonly homeNation: string;
  /** The scenario id where this actor's identity was first established. */
  readonly firstAppearance: string;
};

export const ENTITY_REGISTRY: readonly EntityRegistryEntry[] = [
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
] as const;

const KNOWN_ENTITY_IDS = new Set<string>(ENTITY_REGISTRY.map((entry) => entry.id));

export const EntityRegistryId = z.enum(
  ENTITY_REGISTRY.map((entry) => entry.id) as [string, ...string[]],
);
export type EntityRegistryId = z.infer<typeof EntityRegistryId>;

// Same finding-sink shape scenario-topics.ts's auditTopicTags uses: enough
// for auditEntities to push a finding without importing scenario-audit.ts's
// concrete ScenarioFinding type, which would create a cycle back to the
// module this rule is run from.
type FindingSink = {
  push(finding: { readonly kind: string; readonly severity: "error" | "warning"; readonly scenario: string; readonly message: string }): void;
};

export function auditEntities(def: Pick<ScenarioDef, "id" | "entities">, sink: FindingSink): void {
  for (const entity of def.entities ?? []) {
    if (KNOWN_ENTITY_IDS.has(entity)) continue;
    sink.push({
      kind: "unknown-entity",
      severity: "error",
      scenario: def.id,
      message: `entities includes "${entity}", which is not in the closed entity registry (${ENTITY_REGISTRY.map((entry) => entry.id).join(", ")})`,
    });
  }
}
