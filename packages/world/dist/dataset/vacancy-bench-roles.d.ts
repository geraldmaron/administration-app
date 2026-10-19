import { RoleProfile } from "../schemas/people-pool.js";
import type { PortraitAttire } from "../schemas/portrait.js";
export declare const FEDERAL_JUDGE_ROLE = "role-federal-judge";
export declare const MAYOR_ROLE = "role-mayor";
export declare const GENERAL_OFFICER_ROLE = "role-general-officer";
export declare const VACANCY_BENCH_ROLE_PROFILES: readonly RoleProfile[];
/**
 * How a bench's portraits dress: a judge sits for a portrait in the robe, an
 * officer in uniform. Kept beside the profiles rather than in the pooled
 * seats' attire table, which is ALL_ROLES one for one.
 */
export declare const VACANCY_BENCH_ATTIRE: Readonly<Record<string, ReadonlyArray<{
    readonly value: PortraitAttire;
    readonly weight: number;
}>>>;
