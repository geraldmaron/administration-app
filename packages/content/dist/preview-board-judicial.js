import { JUDICIARY_SEAT_INSTITUTIONS } from "@admin/engine";
import { sealedCampaign } from "./preview-board.js";
import { judicialVacancyGate, selectScenarioJudicialVacancy } from "./scenario-judicial-vacancy.js";
/** A real founding bench with one seat emptied for reachability, not a fabricated candidate. */
export function judicialBoards(defs) {
    if (!defs.some((def) => def.cast.pick === "judicialVacancy"))
        return [];
    const base = sealedCampaign("preview-judicial-vacancy");
    return [0, 1].flatMap((index) => {
        const institution = JUDICIARY_SEAT_INSTITUTIONS[index];
        const seat = institution ? base.institutions[institution] : undefined;
        if (!institution || !seat)
            return [];
        const board = { ...base, institutions: { ...base.institutions,
                [institution]: { ...seat, leader: undefined, vacancy: true, vacantDays: 0 } } };
        return defs.some((def) => def.cast.pick === "judicialVacancy" &&
            selectScenarioJudicialVacancy(board, def.id, judicialVacancyGate(def.conditions)?.seat)) ? [board] : [];
    });
}
