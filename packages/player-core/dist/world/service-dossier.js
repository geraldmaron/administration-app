import { institutionDef } from "@admin/engine";
import { isInheritedRow } from "../record/inheritance";
export function assembleServiceDossier(campaign, id) {
    const def = institutionDef(id);
    if (def === undefined)
        return undefined;
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
export function militaryReadinessCourse(campaign) {
    const history = campaign.player.metricHistory;
    return {
        values: [...history.map((row) => row.militaryReadiness), campaign.player.metrics.militaryReadiness],
        inherited: history.filter((_, index) => isInheritedRow(campaign, index)).length,
    };
}
