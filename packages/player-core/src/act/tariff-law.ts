import {
  TARIFF_STATUTE_ORDER,
  TARIFF_STATUTES,
  tariffStatuteStanding,
  type Campaign,
  type TariffStatute,
  type TradeSectorId,
} from "@admin/engine";
import type { NationId } from "@admin/world";

// The trade laws a tariff can rest on, read for one country's goods. Each row
// says whether the law can carry the tariff now, and when it can't, what the
// President can do about it: order the investigation, wait for it, or pick
// another law.

export type TariffLawRow = {
  readonly statute: TariffStatute;
  readonly name: string;
  readonly cite: string;
  readonly purpose: string;
  readonly available: boolean;
  readonly reason: string;
  /** Pressing the act orders this law's investigation rather than a tariff. */
  readonly orders: "tariff" | "investigation" | "wait" | "nothing";
  /** Whole percent this law still allows on these goods from this country. */
  readonly roomPercent: number;
  /** The cap and the clock, in a few words. */
  readonly limits: string;
  readonly courts: string;
  /** Who investigates and for how long, where the law needs a finding. */
  readonly investigation?: { readonly by: string; readonly weeks: number; readonly subject: "goods" | "partner" };
};

function limitsOf(statute: TariffStatute): string {
  const law = TARIFF_STATUTES[statute];
  const cap = law.cap === null ? "No cap below a total ban" : `Up to ${Math.round(law.cap * 100)}% more`;
  const clock = law.clockDays === null ? "lasts until lifted" : law.clockDays === 150 ? "ends after 150 days unless Congress extends it" : `lasts up to ${Math.round(law.clockDays / 365)} years`;
  const reach = law.reach === "every-supplier" ? ", and it covers every country that sells these goods" : "";
  return `${cap}, ${clock}${reach}.`;
}

export function tariffLaw(campaign: Campaign, nation: NationId, sector: TradeSectorId, statute: TariffStatute): TariffLawRow {
  const law = TARIFF_STATUTES[statute];
  const standing = tariffStatuteStanding(campaign, statute, nation, sector);
  const canInvestigate = standing.investigation === "none" || standing.investigation === "negative";
  return {
    statute,
    name: law.name,
    cite: law.cite,
    purpose: law.purpose,
    available: standing.available,
    reason: standing.reason,
    orders: standing.available ? "tariff" : canInvestigate ? "investigation" : standing.investigation === "under-way" ? "wait" : "nothing",
    roomPercent: Math.floor(standing.room * 100 + 1e-6),
    limits: limitsOf(statute),
    courts: law.courtNote,
    ...(law.investigation ? { investigation: { by: law.investigation.by, weeks: law.investigation.weeks, subject: law.investigation.subject } } : {}),
  };
}

export function tariffLaws(campaign: Campaign, nation: NationId, sector: TradeSectorId): readonly TariffLawRow[] {
  return TARIFF_STATUTE_ORDER.map((statute) => tariffLaw(campaign, nation, sector, statute));
}

/** The law a draft uses: the one asked for, or the first that can carry a tariff now, or the first whose investigation can be ordered. */
export function chosenTariffLaw(campaign: Campaign, nation: NationId, sector: TradeSectorId, requested?: TariffStatute): TariffLawRow {
  const rows = tariffLaws(campaign, nation, sector);
  return rows.find((row) => row.statute === requested)
    ?? rows.find((row) => row.available)
    ?? rows.find((row) => row.orders === "investigation")
    ?? rows[0]!;
}
