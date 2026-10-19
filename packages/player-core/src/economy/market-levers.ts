import {
  issueFuelWaiver,
  leanOnTheFed,
  projectFedLean,
  projectFuelWaiver,
  projectReserveRelease,
  releaseStrategicReserve,
  type Campaign,
  type EffectPacket,
  type FedLeanDirection,
  type MetricCost,
  type RiskBranch,
} from "@admin/engine";
import { formatDate } from "../format/figures";

// The President's three market levers as the economy room offers them: each
// priced before it is pressed, or refused in the words of the law that
// withholds it. The act itself is the engine's; this is its terms.

export type MarketLeverKey = "fed-ease" | "fed-tighten" | "reserve" | "fuel-waiver";

export type MarketLever =
  | { readonly key: MarketLeverKey; readonly label: string; readonly kind: "refused"; readonly refusal: string }
  | {
      readonly key: MarketLeverKey;
      readonly label: string;
      readonly kind: "available";
      readonly cost: MetricCost;
      readonly risks: readonly RiskBranch[];
      /** What the act does, in one sentence with its date. */
      readonly effect: string;
    };

export type MarketLeverAct = { readonly ok: true; readonly packet: EffectPacket } | { readonly ok: false; readonly reason: string };

const LABELS: Readonly<Record<MarketLeverKey, string>> = {
  "fed-ease": "Press the Fed to cut",
  "fed-tighten": "Press the Fed to hold rates steady",
  reserve: "Release the Strategic Petroleum Reserve",
  "fuel-waiver": "Issue an emergency fuel waiver",
};

function fedLever(campaign: Campaign, key: "fed-ease" | "fed-tighten", direction: FedLeanDirection): MarketLever {
  const projection = projectFedLean(campaign, direction);
  if (!projection.ok) return { key, label: LABELS[key], kind: "refused", refusal: projection.reason };
  return {
    key,
    label: LABELS[key],
    kind: "available",
    cost: projection.cost,
    risks: projection.risks,
    effect: `Nudges the Fed to care a little more about ${direction === "ease" ? "jobs" : "prices"} at its ${formatDate(projection.meeting)} meeting (by at most 0.05). The size of the nudge is the game's estimate, not a real-world figure.`,
  };
}

/** Every market lever the President holds, priced or refused. */
export function marketLevers(campaign: Campaign): readonly MarketLever[] {
  const reserve = projectReserveRelease(campaign);
  const waiver = projectFuelWaiver(campaign);
  return [
    fedLever(campaign, "fed-ease", "ease"),
    fedLever(campaign, "fed-tighten", "tighten"),
    reserve.ok
      ? { key: "reserve", label: LABELS.reserve, kind: "available", cost: reserve.cost, risks: reserve.risks, effect: `Adds oil to the world market until ${formatDate(reserve.until)}.` }
      : { key: "reserve", label: LABELS.reserve, kind: "refused", refusal: reserve.reason },
    waiver.ok
      ? { key: "fuel-waiver", label: LABELS["fuel-waiver"], kind: "available", cost: waiver.cost, risks: waiver.risks, effect: `Takes a few cents off a gallon of gas until ${formatDate(waiver.until)}.` }
      : { key: "fuel-waiver", label: LABELS["fuel-waiver"], kind: "refused", refusal: waiver.reason },
  ];
}

/** The act a lever commits, through the ordinary commit path. */
export function marketLeverAct(campaign: Campaign, key: MarketLeverKey): MarketLeverAct {
  if (key === "fed-ease") return leanOnTheFed(campaign, "ease");
  if (key === "fed-tighten") return leanOnTheFed(campaign, "tighten");
  if (key === "reserve") return releaseStrategicReserve(campaign);
  return issueFuelWaiver(campaign);
}
