import type { Campaign, FeedItem } from "@admin/engine";
import type { NationId } from "@admin/world";

// Which of the week's items lead the front page. The order a reader meets the
// world in is a claim about what mattered, so it is decided in one place, by
// facts the campaign already keeps: how large the parties are, what rung the
// move used, whether a US ally or rival is on either side, and how severe the
// kind of story is. The sort is a pure function of those facts and the item's
// own position in the feed, so replaying the same week always ranks it the
// same way.

// Coarser than a rung number (the catalogue's own scale lives with the
// instrument, not the feed), but ordered the same way: a war outranks a
// governance note the same way a rung-5 act outranks a rung-1 one. Read from
// the item's own `kind`, which every item carries, rather than from an
// instrument catalogue lookup a press item may not have filled in.
const KIND_WEIGHT: Readonly<Record<FeedItem["kind"], number>> = {
  conflict: 6,
  pursuit: 5,
  condition: 5,
  operator: 4,
  governance: 3,
  bloc: 3,
  "player-action": 3,
  "npc-action": 3,
  press: 2,
  drift: 1,
};

function powerTierOf(campaign: Campaign, nation: NationId | undefined): number {
  if (!nation) return 0;
  return campaign.nations[nation]?.base.bands.powerTier ?? 0;
}

/** 2 for a US ally or rival on either side, 1 for any other foreign party, 0 for a purely domestic item. */
function allianceWeight(campaign: Campaign, item: FeedItem): number {
  const parties = [item.actor, item.target].filter((id): id is NationId => id !== undefined && id !== campaign.founding.nation);
  if (parties.length === 0) return 0;
  const sharp = parties.some((id) => {
    const band = campaign.nations[id]?.base.bands.alignmentBand;
    return band === "aligned" || band === "opposed";
  });
  return sharp ? 2 : 1;
}

/** The composite the front page sorts on: highest first, each term a tiebreak for the one before it. */
function rank(campaign: Campaign, item: FeedItem): number {
  const power = Math.max(powerTierOf(campaign, item.actor), powerTierOf(campaign, item.target));
  const severity = KIND_WEIGHT[item.kind];
  const alliance = allianceWeight(campaign, item);
  // Weighted so severity (the coarsest, most legible fact) dominates, power
  // tier breaks ties within it, and the alliance flag breaks ties within that.
  return severity * 100 + power * 10 + alliance;
}

/**
 * The feed in the order the front page shows it: by the parties' power tier,
 * the story's rung-like severity, whether a US ally or rival is named, and a
 * stable tie-break on the feed's own order so two items ranked equal keep the
 * order they were filed in.
 */
export function rankedFeed(campaign: Campaign, items: readonly FeedItem[]): readonly FeedItem[] {
  return items
    .map((item, index) => ({ item, index, score: rank(campaign, item) }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
    .map((entry) => entry.item);
}
