import { type Campaign, type InstitutionId, type OfficeId } from "@admin/engine";
import type { PersonId } from "@admin/world";
import type { ScenarioDef } from "./scenario.js";
export declare function judicialVacancyGate(conditions: readonly ScenarioDef["conditions"][number][]): Extract<ScenarioDef["conditions"][number], {
    kind: "judicialVacancy";
}> | undefined;
/** A real empty Court seat and a name the nomination action accepts today. */
export type FrozenJudicialVacancy = {
    readonly institution: InstitutionId;
    readonly office: OfficeId;
    readonly seat: number;
    readonly vacancyOpenedDay: number;
    readonly title: string;
    readonly nominee: PersonId;
    readonly nomineeName: string;
    readonly nomineeRecord: string;
    readonly alternate: PersonId;
    readonly alternateName: string;
    readonly alternateRecord: string;
};
export declare function selectScenarioJudicialVacancy(campaign: Campaign, scenarioId: string, seatType?: "chief" | "associate"): FrozenJudicialVacancy | undefined;
export declare function judicialVacancyStillLive(campaign: Campaign, frozen: FrozenJudicialVacancy): boolean;
