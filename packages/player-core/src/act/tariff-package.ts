import { apply, likelihoodFromUnitInterval, tradeSector, type Campaign, type EffectPacket, type TariffStatute } from "@admin/engine";
import type { NationId } from "@admin/world";
import { formatMoney } from "../format/money";
import { buildAct, type BuiltLine } from "./build";
import { actOption } from "./catalogue";
import { RETALIATION_STANCE, tariffDraft, type OddsStance } from "./preview";

// A tariff order over several goods from one country, read and built as a
// fold: each good is priced and built on the world the goods before it leave
// behind, so two goods take distinct measure and retaliation ids and the
// standing rate a later good sees includes the earlier ones. Every figure is
// the engine's own (`tariffDraft`, `buildAct`, `apply`); this file only walks
// the list. One review then signs the whole run.

export type TariffGood = { readonly sector: string; readonly rate: number };

export type TariffGoodReading = {
  readonly sector: string;
  readonly name: string;
  readonly rate: number;
  /** The tariff on these goods now, in whole percent, before this order. */
  readonly standing: number;
  /** How much more the law lets this order add, in whole percent. */
  readonly room: number;
  readonly law: string;
  /** Ordered as a tariff, as the law's investigation, or left out with the engine's reason. */
  readonly status: "tariff" | "investigation" | "refused";
  readonly reason?: string;
  /** Customs revenue a year, USD millions, as the preview prices it. */
  readonly revenue?: number;
  /** Fractional rise in the US shelf price within a year. */
  readonly shelfPriceRise?: number;
  /** Fractional fall in what we import of it from them. */
  readonly importFall?: number;
  readonly retaliation?: { readonly word: string; readonly stance: OddsStance };
};

export type TariffPackageReading = {
  readonly goods: readonly TariffGoodReading[];
  /** Revenue a year across every good that is ordered as a tariff. */
  readonly revenue: number;
  /** How many goods the order would actually cover. */
  readonly ordered: number;
};

type Step = { readonly reading: TariffGoodReading; readonly packet?: EffectPacket; readonly lines?: readonly BuiltLine[] };

const TARIFF = actOption("tariff")!;

function step(campaign: Campaign, nation: NationId, good: TariffGood, statute: TariffStatute | undefined): Step {
  const name = tradeSector(good.sector)?.name ?? good.sector;
  const draft = tariffDraft(campaign, nation, good.sector, good.rate, statute);
  const built = buildAct(campaign, nation, TARIFF, { sector: good.sector, rate: good.rate, ...(statute ? { statute } : {}) });
  const base = { sector: good.sector, name, rate: good.rate, standing: draft?.standing ?? 0, room: draft?.room ?? 0, law: draft?.law.name ?? "" };
  if (!built.ok) return { reading: { ...base, status: "refused", reason: built.reason } };
  const investigation = draft?.law.orders === "investigation";
  const incidence = investigation ? undefined : draft?.incidence;
  const word = incidence ? likelihoodFromUnitInterval(incidence.retaliationChance) : undefined;
  return {
    reading: {
      ...base,
      status: investigation ? "investigation" : "tariff",
      ...(incidence ? { revenue: incidence.revenue, shelfPriceRise: incidence.shelfPriceRise, importFall: incidence.importFall } : {}),
      ...(word ? { retaliation: { word, stance: RETALIATION_STANCE[word] } } : {}),
    },
    packet: built.packet,
    lines: built.lines,
  };
}

function fold(campaign: Campaign, nation: NationId, goods: readonly TariffGood[], statute: TariffStatute | undefined): readonly Step[] {
  return goods.reduce<{ readonly running: Campaign; readonly steps: readonly Step[] }>(
    (acc, good) => {
      const next = step(acc.running, nation, good, statute);
      return { running: next.packet ? apply(acc.running, next.packet) : acc.running, steps: [...acc.steps, next] };
    },
    { running: campaign, steps: [] },
  ).steps;
}

/** Each good as the order would take it, priced on the world the goods before it leave. */
export function readTariffPackage(campaign: Campaign, nation: NationId, goods: readonly TariffGood[], statute?: TariffStatute): TariffPackageReading {
  const read = fold(campaign, nation, goods, statute).map((entry) => entry.reading);
  return { goods: read, revenue: read.reduce((sum, good) => sum + (good.revenue ?? 0), 0), ordered: read.filter((good) => good.status !== "refused").length };
}

export type TariffPackageBuild =
  | { readonly ok: true; readonly packet: readonly EffectPacket[]; readonly title: string; readonly lines: readonly BuiltLine[]; readonly charged: 0 }
  | { readonly ok: false; readonly reason: string };

/**
 * The packets for every good the order covers, in order, for one review and
 * one commit. A good the engine refuses is left out and named on the receipt;
 * an order that covers nothing is refused.
 */
export function buildTariffPackage(campaign: Campaign, nation: NationId, goods: readonly TariffGood[], statute?: TariffStatute): TariffPackageBuild {
  const steps = fold(campaign, nation, goods, statute);
  const packets = steps.flatMap((entry) => (entry.packet ? [entry.packet] : []));
  if (packets.length === 0) return { ok: false, reason: steps[0]?.reading.reason ?? "Pick at least one kind of goods." };
  const revenue = steps.reduce((sum, entry) => sum + (entry.reading.revenue ?? 0), 0);
  const lines: BuiltLine[] = steps.map((entry, index) => ({
    label: `${index + 1}. ${entry.reading.name}`,
    value:
      entry.reading.status === "refused"
        ? `Left out. ${entry.reading.reason}`
        : entry.reading.status === "investigation"
          ? `An investigation under ${entry.reading.law}`
          : `${entry.reading.rate}% added under ${entry.reading.law}, ${entry.reading.standing + entry.reading.rate}% in all`,
  }));
  return {
    ok: true,
    packet: packets,
    title: packets.length === 1 ? "Tariff order signed" : `Tariff order on ${packets.length} kinds of goods signed`,
    lines: [...lines, ...(revenue > 0 ? [{ label: "Revenue", value: `About ${formatMoney(revenue)} a year coming in` }] : [])],
    charged: 0,
  };
}
