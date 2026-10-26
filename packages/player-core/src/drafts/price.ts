import { BUDGET_ACCOUNT_SPECS, TARIFF_STATUTES, requestAppropriation, type AppropriationProjection, type Campaign, type EffectPacket, type TariffStatute } from "@admin/engine";
import { fnv1a, type NationId } from "@admin/world";
import { buildTariffPackage, readTariffPackage, type TariffGood } from "../act/tariff-package";
import { tariffDraft } from "../act/preview";
import { authorityById } from "../authority/registry";
import { appropriationStatus, budgetDraftReading } from "../budget/appropriation-draft";
import { formatMoney } from "../format/money";
import { nationNameIn } from "../world/war-screen";
import type { CampaignStamp, DraftAuthority, DraftCitation, DraftPreview, DraftSpec } from "./types";

// Every figure here is the engine's or an existing player-core reading's; this
// file only says them as a draft. A draft is priced again on review, so what
// the President signs is always priced on the campaign the commit applies to.

/** The registry record each tariff statute rests on. */
export const TARIFF_STATUTE_AUTHORITY: Readonly<Record<TariffStatute, string>> = {
  s232: "trade-expansion-232",
  s301: "trade-act-301",
  s201: "trade-act-201",
  s122: "trade-act-122",
  s338: "tariff-act-338",
};

/** Congress's power of the purse: no money is drawn from the Treasury but by appropriation. */
const APPROPRIATIONS_CLAUSE = "const-art1-s9-cl7";

export type PricedDraft =
  | { readonly ok: true; readonly authority: DraftAuthority; readonly preview: DraftPreview; readonly build: () => EffectPacket | readonly EffectPacket[] }
  | { readonly ok: false; readonly reason: string };

const pad = (n: number): string => String(n).padStart(2, "0");

/** The campaign's fingerprint: its seed, turn, date and how many acts its ledger holds. */
export function campaignStamp(campaign: Campaign): CampaignStamp {
  const { year, month, day } = campaign.calendar;
  const newest = campaign.ledger.at(-1);
  return { seed: String(campaign.seed), turn: campaign.turn, date: `${year}-${pad(month)}-${pad(day)}`, ledger: campaign.ledger.length, last: newest ? fnv1a(JSON.stringify(newest)) : 0 };
}

export function sameStamp(a: CampaignStamp, b: CampaignStamp): boolean {
  return a.seed === b.seed && a.turn === b.turn && a.date === b.date && a.ledger === b.ledger && a.last === b.last;
}

/** The draft's key: one budget per administration, one tariff order per government. */
export function draftSubject(spec: DraftSpec): string {
  return spec.kind === "budget" ? "budget" : `tariff:${spec.nation}`;
}

function citation(id: string): DraftCitation | undefined {
  const record = authorityById(id);
  return record ? { id: record.id, cite: record.cite, title: record.shortTitle ?? record.title, sourceUrl: record.sourceUrl } : undefined;
}

const share = (value: number): string => `${(value * 100).toFixed(2)}%`;

/** What the floor would do with a drafted book, in one line. */
export function budgetFloorWords(floor: AppropriationProjection): string {
  if (floor.accounts.length === 0) return "Nothing to vote on. Your draft matches the current budget";
  if (!floor.wouldEnact) return "Fails, and the government stays on last year's budget";
  if (floor.refused.length > 0) return `Passes, with ${floor.refused.length === 1 ? "1 line" : `${floor.refused.length} lines`} cut and kept at last year's amount`;
  return "Passes the House and the Senate";
}

function priceBudget(campaign: Campaign, spec: Extract<DraftSpec, { kind: "budget" }>): PricedDraft {
  const reading = budgetDraftReading(campaign, spec.lines);
  if (!reading.ok) return reading;
  if (reading.candidate.changed.length === 0) return { ok: false, reason: "Your budget matches the current one, so there's nothing to send." };
  const changed = reading.accounts.filter((row) => reading.candidate.changed.includes(row.account));
  const floor = budgetFloorWords(reading.floor);
  const status = appropriationStatus(campaign);
  const steps = [
    ...changed.map((row) => ({ label: BUDGET_ACCOUNT_SPECS[row.account].name, value: `${share(row.inForce)} to ${share(row.draft)} of national income` })),
    { label: "Congress's vote", value: floor },
    { label: "Funded through", value: reading.floor.wouldEnact ? `${status.next.fundedThrough}, fiscal year ${status.next.fiscalYear}` : status.fundedThrough },
  ];
  const cite = citation(APPROPRIATIONS_CLAUSE);
  return {
    ok: true,
    authority: "congress",
    preview: {
      subject: "Your budget",
      was: `${share(reading.totals.inForce)} of national income`,
      now: `${share(reading.totals.draft)} of national income`,
      effect: floor,
      effectTone: !reading.floor.wouldEnact ? "adverse" : reading.floor.refused.length > 0 ? "caution" : "favorable",
      title: "Send your budget to Congress",
      steps,
      verb: "Send to Congress",
      route: `Goes to the House and the Senate, which vote on ${changed.length === 1 ? "the line" : `each of the ${changed.length} lines`} you changed`,
      ...(cite ? { citation: cite } : {}),
    },
    build: () => {
      const result = requestAppropriation(campaign, reading.candidate);
      if (!result.ok) throw new Error(result.reason);
      return result.packet;
    },
  };
}

function goodsWords(goods: readonly { readonly name: string; readonly rate: number }[]): string {
  return goods.map((good) => `${good.rate}% on ${good.name.toLowerCase()}`).join(", ");
}

function statuteOf(campaign: Campaign, nation: NationId, goods: readonly TariffGood[], statute: TariffStatute | undefined): TariffStatute | undefined {
  if (statute) return statute;
  const first = goods[0];
  return first ? tariffDraft(campaign, nation, first.sector, first.rate)?.law.statute : undefined;
}

function priceTariff(campaign: Campaign, spec: Extract<DraftSpec, { kind: "tariff" }>): PricedDraft {
  const built = buildTariffPackage(campaign, spec.nation, spec.goods, spec.statute);
  if (!built.ok) return built;
  const reading = readTariffPackage(campaign, spec.nation, spec.goods, spec.statute);
  const name = nationNameIn(campaign, spec.nation);
  const ordered = reading.goods.filter((good) => good.status !== "refused");
  const taxed = ordered.filter((good) => good.status === "tariff");
  const studied = ordered.filter((good) => good.status === "investigation");
  const standing = ordered.filter((good) => good.standing > 0);
  // A law that needs a finding first orders an investigation, not a tariff, so the draft says which each good gets.
  const now = [...(taxed.length > 0 ? [goodsWords(taxed.map((good) => ({ name: good.name, rate: good.standing + good.rate })))] : []), ...(studied.length > 0 ? [`an investigation of ${studied.map((good) => good.name.toLowerCase()).join(", ")}`] : [])].join("; ");
  const statute = statuteOf(campaign, spec.nation, spec.goods, spec.statute);
  const cite = statute ? citation(TARIFF_STATUTE_AUTHORITY[statute]) : undefined;
  return {
    ok: true,
    authority: "on-signing",
    preview: {
      subject: `Tariff order on ${name}`,
      was: standing.length === 0 ? "No tariff on these goods" : standing.map((good) => `${good.standing}% on ${good.name.toLowerCase()}`).join(", "),
      now: now.charAt(0).toUpperCase() + now.slice(1),
      effect: reading.revenue > 0 ? `About ${formatMoney(reading.revenue)} a year coming in, and prices here go up` : studied.length > 0 ? "No tariff until the investigation finds a reason for one" : `${ordered.length === 1 ? "1 kind" : `${ordered.length} kinds`} of goods covered`,
      effectTone: "caution",
      title: `Tariff order on ${name}`,
      steps: [{ label: "Country", value: name }, ...built.lines],
      verb: "Sign the order",
      route: `${taxed.length > 0 ? "Takes effect" : "The investigation opens"} when you sign${statute ? ` under ${TARIFF_STATUTES[statute].name}` : ""}; no vote is needed`,
      ...(cite ? { citation: cite } : {}),
    },
    build: () => {
      const again = buildTariffPackage(campaign, spec.nation, spec.goods, spec.statute);
      if (!again.ok) throw new Error(again.reason);
      return again.packet;
    },
  };
}

/** Prices a draft on one campaign: what it would do there, and the packets that do it. */
export function priceDraft(campaign: Campaign, spec: DraftSpec): PricedDraft {
  return spec.kind === "budget" ? priceBudget(campaign, spec) : priceTariff(campaign, spec);
}
