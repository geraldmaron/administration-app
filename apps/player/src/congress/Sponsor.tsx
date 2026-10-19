import { otherMajorParty, usPartyWord, type Campaign, type UsMajorParty } from "@admin/engine";
import { sponsorWords } from "@admin/player-core";
import { Peek, Text } from "@admin/ui";
import { go } from "./parts";

/** The caucus a sponsor label stands for; a bill written by both parties belongs to neither. */
function caucusOf(campaign: Campaign, words: string): UsMajorParty | undefined {
  const anchor = campaign.congress.caucusAnchor;
  if (words === sponsorWords(campaign, "administration")) return anchor;
  if (words === sponsorWords(campaign, "opposition")) return otherMajorParty(anchor);
  return undefined;
}

/**
 * Whose bill it is. A sponsor here is a caucus, not one member, so the label
 * opens a quick look that leads to that caucus's members; a bill both parties
 * wrote just says so.
 */
export function Sponsor({ campaign, words }: { readonly campaign: Campaign; readonly words: string }) {
  const caucus = caucusOf(campaign, words);
  if (!caucus) return <Text variant="caption" tone="secondary">{words}</Text>;
  const party = usPartyWord(caucus);
  return <Peek name={words} role={`A caucus, not one member: the ${party}s in Congress`} onOpen={() => go(`/washington/congress?view=members&caucus=${caucus}`)} openLabel={`See the ${party} members`} />;
}
