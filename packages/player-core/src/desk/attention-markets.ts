/**
 * The two world matters that stop the clock on arrival: a market crash at
 * home, and a coup in a government the President's services read.
 *
 * Each is soft only in the week it happened and absent after, so a crash a
 * month old never stops Continue again. A coup in a government the services
 * cannot read is logged as the world changing and never pauses: the President
 * learns of it the way the wire does.
 */
import { CRASH_DROP, coupMatters, selectMarketShock, selectNation, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { anchored, place } from "../navigation/places";
import { subjectHref } from "../shell/subject";
import type { AttentionItem } from "./attention-row";

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** The crash row, the week the index fell past the line; nothing in any other week. */
export function marketShockItems(campaign: Campaign): readonly AttentionItem[] {
  const shock = selectMarketShock(campaign);
  if (!shock) return [];
  return [
    {
      id: `market-shock:${campaign.turn}`,
      source: "market-shock",
      urgency: "soft",
      subject: "markets",
      title: `Stocks fall ${percent(shock.drop)} in a week`,
      reason: `The stock index fell more than ${percent(CRASH_DROP)} in a week, which counts as a crash.`,
      href: anchored(place.economyView("markets"), "economy-markets"),
      stance: "adverse",
      figure: `-${percent(shock.drop)}`,
      icon: "caution",
    },
  ];
}

/** A coup this week, from the engine's one reading of it: it pauses where the services read that government, and is logged where they do not. */
export function coupItems(campaign: Campaign): readonly AttentionItem[] {
  return coupMatters(campaign, campaign.calendar).flatMap((matter) => {
    const nation = matter.actor as NationId;
    const name = selectNation(campaign, nation)?.base.identity.name;
    if (!name) return [];
    const read = matter.urgency === "soft";
    return [
      {
        id: matter.id,
        source: "coup" as const,
        urgency: read ? ("soft" as const) : ("ambient" as const),
        subject: `nation:${nation as string}`,
        title: `The government of ${name} is overthrown`,
        reason: read
          ? "Your intelligence services were watching this government. The people in charge now aren't the ones you've been dealing with."
          : "Your intelligence services couldn't see into this government. The news reports what little is known.",
        href: anchored(subjectHref({ kind: "nation", id: nation as string }), "country-leader"),
        stance: "adverse" as const,
        icon: "caution",
      },
    ];
  });
}
