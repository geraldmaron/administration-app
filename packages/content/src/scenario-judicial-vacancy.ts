import { JUDICIARY_SEAT_INSTITUTIONS, campaignDay, institutionDef, openNomination, selectNominableFor, type Campaign, type InstitutionId, type OfficeId, type PersonRuntime } from "@admin/engine";
import type { PersonId } from "@admin/world";
import type { ScenarioDef } from "./scenario.js";

export function judicialVacancyGate(conditions: readonly ScenarioDef["conditions"][number][]):
  Extract<ScenarioDef["conditions"][number], { kind: "judicialVacancy" }> | undefined {
  return conditions.find((condition): condition is Extract<ScenarioDef["conditions"][number], { kind: "judicialVacancy" }> =>
    condition.kind === "judicialVacancy");
}

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

function publicRecord(person: PersonRuntime): string {
  const career = person.base.career.at(-1);
  const work = career ? `${career.years} years in ${career.archetype.replaceAll("-", " ")}; ` : "";
  return `${work}studied ${person.base.education.field.replaceAll("-", " ")}`;
}

export function selectScenarioJudicialVacancy(campaign: Campaign, scenarioId: string,
  seatType?: "chief" | "associate"): FrozenJudicialVacancy | undefined {
  for (const [index, institution] of JUDICIARY_SEAT_INSTITUTIONS.entries()) {
    if (seatType === "chief" && index !== 0 || seatType === "associate" && index === 0) continue;
    const seat = campaign.institutions[institution];
    if (!seat?.vacancy) continue;
    const vacancyOpenedDay = campaignDay(campaign) - seat.vacantDays;
    const office = institutionDef(institution)?.offices[0];
    if (!office) continue;
    if (campaign.cases?.[`scenario:${scenarioId}@judicial:${institution}:${vacancyOpenedDay}`] !== undefined) continue;
    const candidates = selectNominableFor(campaign, office.id)
      .filter((person) => openNomination(campaign, office.id, person.base.id).ok).slice(0, 2);
    const candidate = candidates[0];
    const alternate = candidates[1];
    if (!candidate || !alternate) continue;
    return { institution, office: office.id, seat: index + 1, vacancyOpenedDay, title: office.title,
      nominee: candidate.base.id, nomineeName: candidate.base.name, nomineeRecord: publicRecord(candidate),
      alternate: alternate.base.id, alternateName: alternate.base.name, alternateRecord: publicRecord(alternate) };
  }
  return undefined;
}

export function judicialVacancyStillLive(campaign: Campaign, frozen: FrozenJudicialVacancy): boolean {
  const institution = JUDICIARY_SEAT_INSTITUTIONS[frozen.seat - 1];
  const office = institution ? institutionDef(institution)?.offices[0] : undefined;
  const nominee = campaign.people[frozen.nominee];
  const alternate = campaign.people[frozen.alternate];
  return institution === frozen.institution && office?.id === frozen.office && office.title === frozen.title &&
    campaign.institutions[institution]?.vacancy === true &&
    campaignDay(campaign) - campaign.institutions[institution]!.vacantDays === frozen.vacancyOpenedDay &&
    nominee?.base.name === frozen.nomineeName && nominee && publicRecord(nominee) === frozen.nomineeRecord &&
    alternate?.base.name === frozen.alternateName && alternate && publicRecord(alternate) === frozen.alternateRecord &&
    frozen.nominee !== frozen.alternate && openNomination(campaign, frozen.office, frozen.nominee).ok &&
    openNomination(campaign, frozen.office, frozen.alternate).ok;
}
