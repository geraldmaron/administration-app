import { hasIntelOnNation, type Campaign } from "@admin/engine";
import type { Nation, NationId } from "@admin/world";
import type { MetricStance } from "../format/figures";
import { temperamentReadings, type TemperamentReading } from "../reasons/temperament-words";
import { figureProvenance } from "./figure-provenance";

// How a foreign government is disposed: the posture its doctrine states, the
// aims it pursues, and its temperament against the world's.
//
// The posture is published doctrine — a government says whether it means to
// hold what it has or take more — so every file shows it. Its aims and its
// temperament are what the services have learned about how it decides, so they
// are read only where the services read that government. A temperament fitted
// from a thin or standard record is still shown, with the sentence saying where
// it came from, because a band with its provenance is honest and a blank is
// not.

export type PostureBand = {
  readonly word: string;
  readonly stance: MetricStance;
  /** 1 (holds what it has) to 4 (reaches for more). */
  readonly level: number;
};

export type NationPosture = {
  readonly posture: PostureBand;
  readonly unread: boolean;
  /** What it is after, in the dataset's own words, heaviest first; empty where unread. */
  readonly aims: readonly string[];
  readonly temperament: readonly TemperamentReading[];
  /** Where the temperament comes from, for a government the dataset has not researched in full. */
  readonly temperamentSource?: string;
};

const POSTURE: Readonly<Record<Nation["doctrine"]["posture"], PostureBand>> = {
  defensive: { word: "Defends what it has", stance: "favorable", level: 1 },
  balanced: { word: "Balanced", stance: "neutral", level: 2 },
  assertive: { word: "Assertive", stance: "caution", level: 3 },
  expansionist: { word: "Wants to expand", stance: "adverse", level: 4 },
};

/** The one sentence of the file's provenance that says where the temperament comes from. */
function temperamentSource(nation: NationId, fidelity: Nation["fidelity"]): string | undefined {
  if ((fidelity ?? "full") === "full") return undefined;
  const text = figureProvenance(nation as string, fidelity);
  return text?.match(/[^.]+\./g)?.map((sentence) => sentence.trim()).find((sentence) => /temperament/.test(sentence));
}

/** A foreign government's posture, aims and temperament; undefined for the player's own or an unknown id. */
export function nationPosture(campaign: Campaign, nation: NationId): NationPosture | undefined {
  const runtime = campaign.nations[nation];
  if (!runtime || nation === campaign.founding.nation) return undefined;
  const unread = !hasIntelOnNation(campaign, nation);
  const aims = unread
    ? []
    : [...runtime.traits.agendas]
        .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
        .map((agenda) => agenda.description);
  const source = unread ? undefined : temperamentSource(nation, runtime.base.fidelity);
  return {
    posture: POSTURE[runtime.base.doctrine.posture],
    unread,
    aims,
    temperament: temperamentReadings(nation, campaign),
    ...(source ? { temperamentSource: source } : {}),
  };
}
