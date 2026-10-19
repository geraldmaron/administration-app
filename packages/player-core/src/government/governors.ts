import { STATE_IDS, type FacedPerson, type StateId } from "@admin/world";
import { selectGovernor, selectPerson, type Campaign, type UsParty } from "@admin/engine";

/**
 * The fifty governors as one roster: a jurisdiction of its own, read from the
 * standing the engine keeps on each state rather than re-derived here.
 *
 * The District has no governor and is left out rather than drawn as a vacancy —
 * an empty chair that was never a chair would read as something to fill.
 */
export type GovernorRow = {
  readonly state: StateId;
  readonly stateName: string;
  readonly region: string;
  readonly electoralVotes: number;
  /** The governor as their face is drawn: the whole record the portrait reads, so it matches every other screen. */
  readonly person?: FacedPerson;
  readonly party?: UsParty;
  /** 0..1, how the governor sits toward the administration. */
  readonly disposition?: number;
};

export function governorRows(campaign: Campaign): readonly GovernorRow[] {
  return STATE_IDS.filter((id) => id !== "DC")
    .flatMap((id): GovernorRow[] => {
      const runtime = campaign.states[id];
      if (!runtime) return [];
      const standing = selectGovernor(campaign, id);
      const person = standing ? selectPerson(campaign, standing.person) : undefined;
      return [
        {
          state: id,
          stateName: runtime.base.name,
          region: runtime.base.region,
          electoralVotes: runtime.base.electoralVotes,
          ...(person ? { person: person.base } : {}),
          ...(standing ? { party: standing.party, disposition: standing.disposition } : {}),
        },
      ];
    })
    .sort((a, b) => a.stateName.localeCompare(b.stateName));
}
