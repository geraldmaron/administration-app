import { confirmationVote, officeDef, selectActiveNominations, selectPerson, type Campaign, type ChamberVote, type NominationStage } from "@admin/engine";
import { nominationStanding, place } from "@admin/player-core";

/** The stages before the name is sent up: the President's own preparation, not yet the Senate's business. */
const PREPARING: readonly NominationStage[] = ["shortlist", "vetting", "prepared"];

export type SenateNomination = {
  readonly id: string;
  readonly name: string;
  readonly personHref: string;
  readonly office: string;
  readonly stage: string;
  readonly days: number;
  readonly committee?: string;
  readonly controversies: readonly string[];
  /** The Senate's count on the name today; absent while the name has not been sent up. */
  readonly vote?: ChamberVote;
};

export type SenateNominations = {
  readonly before: readonly SenateNomination[];
  readonly preparing: readonly SenateNomination[];
};

/** Every open nomination, split into those the Senate holds and those still with the President. */
export function senateNominations(campaign: Campaign, today: number): SenateNominations {
  const rows = [...selectActiveNominations(campaign)]
    .sort((a, b) => a.openedDay - b.openedDay || a.id.localeCompare(b.id))
    .map((nomination) => {
      const sent = !PREPARING.includes(nomination.stage);
      const row: SenateNomination = {
        id: nomination.id,
        name: selectPerson(campaign, nomination.nominee)?.base.name ?? "The nominee",
        personHref: place.person(nomination.nominee as string),
        office: officeDef(nomination.office)?.title ?? "An office",
        stage: nominationStanding(nomination),
        days: Math.max(0, today - nomination.openedDay),
        ...(nomination.committee ? { committee: nomination.committee } : {}),
        controversies: nomination.controversies,
        ...(sent ? { vote: confirmationVote(campaign, nomination.nominee) } : {}),
      };
      return { row, sent };
    });
  return { before: rows.filter((entry) => entry.sent).map((entry) => entry.row), preparing: rows.filter((entry) => !entry.sent).map((entry) => entry.row) };
}
