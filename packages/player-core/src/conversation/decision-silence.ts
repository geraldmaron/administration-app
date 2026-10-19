import type { Campaign, MetricSet, OpinionDriver } from "@admin/engine";
import type { CastScenario } from "@admin/content";
import { METRIC_LABELS, OPINION_DRIVER_LABELS, formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";
import { silencePrice, type SilencePrice } from "./scenario-dispositions";

// What a decision left on the desk costs on its own clock, said as one line
// beside the answers (DECISIONS §8.13). Not answering is not an answer, so it
// is never a column; its price is read off the packet that would charge it,
// against the campaign the answers were projected on.

function moveWords(price: SilencePrice): readonly string[] {
  const metrics = (Object.entries(price.metrics) as [keyof MetricSet, number][])
    .filter(([, delta]) => delta !== 0)
    .map(([key, delta]) => (key === "treasury" ? `${METRIC_LABELS[key]} ${delta < 0 ? "−" : "+"}${formatMoney(Math.abs(delta))}` : `${METRIC_LABELS[key]} ${formatSignedPoints(delta)} pts`));
  const judgments = (Object.entries(price.judgments) as [OpinionDriver, number][]).map(([driver, delta]) => `public view of ${OPINION_DRIVER_LABELS[driver].toLowerCase()} ${formatSignedPoints(delta)} pts`);
  return [...metrics, ...judgments];
}

/** The line beside a decision's answers: what leaving it costs, and when. */
export function silenceLine(campaign: Campaign, cast: CastScenario): string {
  const price = silencePrice(campaign, cast);
  if (cast.orderCase?.posture === "adverse-lower") return price.narration;
  if (price.alreadyCharged) return `Leaving it has already cost you this week. ${price.narration}`;
  const moves = moveWords(price);
  return `If it runs out unanswered: ${price.narration}${moves.length > 0 ? ` ${moves.join(", ")}.` : ""}`;
}
