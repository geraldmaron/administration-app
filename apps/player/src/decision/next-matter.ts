import type { Campaign } from "@admin/engine";
import { briefMatters, type BriefMatter } from "@admin/player-core";

/**
 * The matter the President would take up after this one: the first that
 * stops the clock, else the first on the desk, in the order the Brief ranks
 * them, among those with a place to be answered. A standing matter that this
 * answer left listed is skipped by its address.
 */
export function nextMatter(campaign: Campaign, attention: Parameters<typeof briefMatters>[1], exceptHref: string): BriefMatter | undefined {
  const open = briefMatters(campaign, attention).filter((matter) => matter.href !== undefined && matter.href !== exceptHref);
  return open.find((matter) => matter.holds) ?? open[0];
}
