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
export declare const ENTITY_REGISTRY: readonly EntityRegistryEntry[];
export declare const EntityRegistryId: z.ZodEnum<{
    [x: string]: string;
}>;
export type EntityRegistryId = z.infer<typeof EntityRegistryId>;
type FindingSink = {
    push(finding: {
        readonly kind: string;
        readonly severity: "error" | "warning";
        readonly scenario: string;
        readonly message: string;
    }): void;
};
export declare function auditEntities(def: Pick<ScenarioDef, "id" | "entities">, sink: FindingSink): void;
export {};
