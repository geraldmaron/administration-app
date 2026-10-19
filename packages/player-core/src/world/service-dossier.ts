import { institutionDef, type Campaign, type InstitutionId } from "@admin/engine";
import { isInheritedRow } from "../record/inheritance";

// Service drill-ins are live executive-institution readings: catalogue identity
// beside the runtime capacity and workload the engine already advances.

export type ServiceDossier = {
  readonly id: string;
  readonly name: string;
  readonly abbreviation: string;
  readonly kind: string;
  readonly tier: 0 | 1 | 2 | 3;
  readonly mandate: string;
  readonly capacity?: number;
  readonly vacancy?: boolean;
  readonly backlog?: number;
  readonly readiness?: number;
};

export function assembleServiceDossier(campaign: Campaign, id: string): ServiceDossier | undefined {
  const def = institutionDef(id as InstitutionId);
  if (def === undefined) return undefined;
  const runtime = campaign.institutions[def.id];
  return {
    id: def.id,
    name: def.name,
    abbreviation: def.abbr,
    kind: def.kind,
    tier: def.tier,
    mandate: def.mandate,
    ...(runtime === undefined
      ? {}
      : {
          capacity: runtime.capacity,
          vacancy: runtime.vacancy,
          backlog: runtime.backlog,
          readiness: runtime.implementationQuality,
        }),
  };
}

/**
 * Military readiness across the stored weeks, oldest first, with how many of
 * them are the predecessor's. Which rows those are is the shared inheritance
 * predicate's answer, dated against the oath; counting the oldest rows by
 * position would go wrong the week they scroll out.
 */
export type ReadinessCourse = { readonly values: readonly number[]; readonly inherited: number };

export function militaryReadinessCourse(campaign: Campaign): ReadinessCourse {
  const history = campaign.player.metricHistory;
  return {
    values: [...history.map((row) => row.militaryReadiness), campaign.player.metrics.militaryReadiness],
    inherited: history.filter((_, index) => isInheritedRow(campaign, index)).length,
  };
}
