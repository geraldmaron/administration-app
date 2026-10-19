import type { ExecutiveOrder, ExecutiveOrderRecord } from "@admin/engine";
import type { ProjectedEffect } from "../reading";
import { formatSignedPoints, statPathLabel } from "../format/figures";

// What a struck order's case page has to say beyond the holding: a ruling
// undoes what the order did to the country going forward, but it does not
// refund what the treasury already spent enacting it — the Antideficiency Act
// has no clause that claws back an obligated dollar because a court later
// disagreed with the order that obligated it.

/** The country-facing effects a strike-down reverses, in the words the sign ceremony already used to preview them. */
export function reversedEffects(contribution: NonNullable<ExecutiveOrderRecord["nationContribution"]>): readonly ProjectedEffect[] {
  return Object.entries(contribution).flatMap(([path, applied]) =>
    applied === undefined || applied === 0
      ? []
      : [{ label: statPathLabel(path), value: `${formatSignedPoints(applied)} points`, stance: "neutral" as const }],
  );
}

/** What a strike-down does not undo: the treasury share the order already spent. */
export function unreversedCost(order: ExecutiveOrder): string | undefined {
  if (!order.treasuryOfGdp || order.treasuryOfGdp === 0) return undefined;
  const share = Math.abs(order.treasuryOfGdp * 100).toFixed(2);
  const verb = order.treasuryOfGdp < 0 ? "spent" : "raised";
  return `The ${share}% of a year's national output that the order already ${verb} stays that way. A court can undo what an order does, but not what it already cost.`;
}
