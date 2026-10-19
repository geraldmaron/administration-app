import type { Campaign } from "@admin/engine";
import { LENS_IDS, PAGE_LENS_IDS, SHARE_LENS_IDS, bodyLensId, homesLensId, partiesLensId, sidesLensId, weekLensId, whipLensId } from "@admin/player-core";

/**
 * Every lens the registry can draw for a campaign: the listed lenses, the
 * page lenses, one share lens per policy domain, and each subject lens on the
 * first subject the campaign holds (a bill, a war, a body, an instrument, the
 * ticket's homes and the last closed week). The development map walks it.
 */
export function lensCatalog(campaign: Campaign): readonly string[] {
  const bill = Object.keys(campaign.bills)[0];
  const war = Object.keys(campaign.conflicts)[0];
  const treaty = Object.keys(campaign.treaties)[0];
  const home = campaign.states ? Object.keys(campaign.states)[0] : undefined;
  const subjects = [
    bill ? whipLensId("house", bill) : undefined,
    bill ? whipLensId("senate", bill) : undefined,
    war ? sidesLensId(war) : undefined,
    bodyLensId("ORG-NATO"),
    treaty ? partiesLensId(treaty) : undefined,
    homesLensId(home, undefined, []),
    weekLensId(Math.max(0, campaign.turn - 1)),
  ];
  return [...LENS_IDS.filter((id) => id !== "neutral"), ...PAGE_LENS_IDS, ...SHARE_LENS_IDS, ...subjects.filter((id): id is string => id !== undefined)];
}
