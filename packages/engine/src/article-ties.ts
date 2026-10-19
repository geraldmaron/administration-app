import { worldDataset, type NationId } from "@admin/world";
import { selectRelationship, type Campaign, type FeedItem } from "./state.js";

// What the reader's country actually has with the foreign parties to a story,
// read off the live relationship. The composer never sees the campaign, so the
// caller hands this over, and "why it matters" says one of these or nothing:
// without it the line was "No American party is named in this." on three
// stories in five.

export type ArticleTie = {
  /** The party's display name, as `ArticleNames` carries it. */
  readonly name: string;
  /** Bound to the reader's country by a mutual-defense treaty. */
  readonly treatyAlly: boolean;
  /** Counted a military threat on the live relationship. */
  readonly threat: boolean;
};

/** At or above this a relationship's military threat reads as a threat the country is planning against. */
export const THREAT_TIE = 0.5;

function treatyAlly(treaties: readonly string[]): boolean {
  return treaties.some((id) => worldDataset.organizations.find((org) => org.id === id.replace(/^compact:/, ""))?.kind === "defense");
}

/** Whether the two governments are bound by a defense compact. */
export function treatyAllyOf(campaign: Campaign, from: NationId, to: NationId): boolean {
  const relationship = selectRelationship(campaign, from, to);
  return relationship !== undefined && treatyAlly(relationship.treaties);
}

/** The reader's ties to each foreign party named in the item, for those it has any with. */
export function articleTies(campaign: Campaign, item: FeedItem): readonly ArticleTie[] {
  const home = campaign.founding.nation;
  const parties = [...new Set([item.actor, item.target])].filter((id): id is NonNullable<typeof id> => id !== undefined && id !== home);
  return parties.flatMap((id) => {
    const relationship = selectRelationship(campaign, home, id);
    const name = campaign.nations[id]?.base.identity.name;
    if (!relationship || !name) return [];
    const tie = { name, treatyAlly: treatyAlly(relationship.treaties), threat: relationship.militaryThreat >= THREAT_TIE };
    return tie.treatyAlly || tie.threat ? [tie] : [];
  });
}
