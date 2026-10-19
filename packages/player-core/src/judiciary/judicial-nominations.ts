import {
  campaignDay,
  confirmationVote,
  institutionDef,
  nominationCommitteeName,
  selectActiveNominations,
  selectPerson,
  type Campaign,
  type ChamberVote,
  type NominationId,
  type OfficeId,
} from "@admin/engine";
import { withdrawalLever, type LeverTerms } from "../dossier/person-lever";
import { nominationStanding } from "../government/machine";

// Every name before the Senate for a seat on a federal court, with what it
// would cost to pull it back. Choosing who to send is the appointments desk
// (appointments/desk.ts), the same seat row every other appointment uses.

export type JudicialNomination = {
  readonly id: NominationId;
  readonly office: OfficeId;
  readonly title: string;
  readonly nomineeId: string;
  readonly name: string;
  readonly standing: string;
  readonly days: number;
  readonly committee?: string;
  readonly controversies: readonly string[];
  /** The Senate's count today; it moves as the chamber does. */
  readonly vote: ChamberVote;
  /** What pulling the name back charges, off the packet `withdrawNomination` commits. */
  readonly withdrawal?: LeverTerms;
};

/** Every name before the Senate for a seat on the Court, oldest first. */
export function judicialNominations(campaign: Campaign): readonly JudicialNomination[] {
  const today = campaignDay(campaign);
  return selectActiveNominations(campaign)
    .filter((nomination) => institutionDef(nomination.institution)?.kind === "judiciary")
    .sort((a, b) => a.openedDay - b.openedDay || a.id.localeCompare(b.id))
    .map((nomination) => {
      const withdrawal = withdrawalLever(campaign, nomination.id);
      const committee = nominationCommitteeName(nomination);
      return {
        id: nomination.id,
        office: nomination.office,
        title: institutionDef(nomination.institution)?.offices[0]?.title ?? "A seat on the Court",
        nomineeId: nomination.nominee as string,
        name: selectPerson(campaign, nomination.nominee)?.base.name ?? "The nominee",
        standing: nominationStanding(nomination),
        days: today - nomination.openedDay,
        ...(committee ? { committee } : {}),
        controversies: nomination.controversies,
        vote: confirmationVote(campaign, nomination.nominee),
        ...(withdrawal ? { withdrawal } : {}),
      };
    });
}
