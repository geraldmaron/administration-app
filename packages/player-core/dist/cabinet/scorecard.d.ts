import { type Campaign } from "@admin/engine";
import type { RoleId } from "@admin/world";
export type ScorecardRow = {
    readonly key: string;
    readonly label: string;
    readonly reading: string;
    /** The engine function that consumes the ownership this row shows. */
    readonly readBy: string;
};
/**
 * What a department answers for, drawn from the United States ownership table
 * (`department-ownership.ts`) rather than guessed at: the programs it
 * delivers, its backlog, its counsel record, the sway its chair's competence
 * carries on the instruments it owns, the budget account it spends, and the
 * classes of matter it has standing in. Absent for a charter with no written
 * table and for the head of state's own chair, which owns a government
 * rather than a department.
 */
export declare function departmentScorecard(campaign: Campaign, role: RoleId): readonly ScorecardRow[];
