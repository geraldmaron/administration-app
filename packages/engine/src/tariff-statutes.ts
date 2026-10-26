import type { NationId } from "@admin/world";
import type { CausalId } from "./causality.js";
import type { GameDate } from "./state.js";
import type { TradeSectorId } from "./trade-sectors.js";

// There is no general tariff power. Congress sets duties, and a President
// raises one only under a statute that delegates the power for a stated
// reason, after the finding that statute requires and within its cap and
// clock. The emergency-powers act is not one of them: the Supreme Court held in
// February 2026 that IEEPA authorizes no tariffs. So every tariff the
// administration imposes names one of these five.

export type TariffStatute = "s232" | "s301" | "s201" | "s122" | "s338";

/** Which statutes need an investigation, and what the investigation is about. */
export type InvestigatedStatute = Extract<TariffStatute, "s232" | "s301" | "s201">;

export type TariffStatuteDef = {
  readonly id: TariffStatute;
  readonly name: string;
  readonly cite: string;
  /** What the statute is for, in a few plain words. */
  readonly purpose: string;
  /** Who makes the finding, and what it is about. Null where the President's own finding suffices. */
  readonly investigation: {
    readonly by: string;
    readonly subject: "goods" | "partner";
    /**
     * How long the game's investigation runs. Each is inside its statutory
     * limit and near what recent investigations took, not the full limit.
     */
    readonly weeks: number;
  } | null;
  /** The most it may add, as a fraction. Null where only the total-ban ceiling applies. */
  readonly cap: number | null;
  /** How long an order lasts before it lapses on its own. Null where it runs until lifted. */
  readonly clockDays: number | null;
  /** Whether it reaches every country that sells the goods or may single out one. */
  readonly reach: "one-country" | "every-supplier";
  readonly courts: "settled" | "untested";
  readonly courtNote: string;
};

export const TARIFF_STATUTES: Readonly<Record<TariffStatute, TariffStatuteDef>> = {
  s232: {
    id: "s232", name: "Section 232", cite: "19 U.S.C. §1862", purpose: "National security",
    // The statute gives Commerce 270 days and the President 90 more; the 2025
    // copper and lumber investigations each took about five months.
    investigation: { by: "Commerce", subject: "goods", weeks: 20 },
    cap: null, clockDays: null, reach: "one-country", courts: "settled",
    courtNote: "Courts have upheld these tariffs since 1976, as long as Commerce found a security threat first.",
  },
  s301: {
    id: "s301", name: "Section 301", cite: "19 U.S.C. §2411", purpose: "Unfair trade practices",
    // Twelve months by statute; the 2017 China investigation took seven.
    investigation: { by: "the Trade Representative", subject: "partner", weeks: 26 },
    cap: null, clockDays: null, reach: "one-country", courts: "settled",
    courtNote: "Courts upheld the China tariffs under this law. They can still be challenged at the Court of International Trade.",
  },
  s201: {
    id: "s201", name: "Section 201", cite: "19 U.S.C. §2251", purpose: "A surge of imports hurting an industry",
    // The Commission has 120 days after a petition.
    investigation: { by: "the International Trade Commission", subject: "goods", weeks: 17 },
    // 19 U.S.C. §2253(e)(3): no more than 50 points above the rate in force.
    cap: 0.5, clockDays: 4 * 365, reach: "every-supplier", courts: "settled",
    courtNote: "A safeguard applies to every country that sells the goods, and it starts to phase down after its first year.",
  },
  s122: {
    id: "s122", name: "Section 122", cite: "19 U.S.C. §2132", purpose: "A balance-of-payments deficit",
    investigation: null, cap: 0.15, clockDays: 150, reach: "one-country", courts: "untested",
    courtNote: "Only Congress can extend the 150-day period for a payments episode. Reissuing a measure does not restart the clock; a later episode needs a new predicate.",
  },
  s338: {
    id: "s338", name: "Section 338", cite: "19 U.S.C. §1338", purpose: "A country discriminating against American goods",
    investigation: null, cap: 0.5, clockDays: null, reach: "one-country", courts: "untested",
    courtNote: "This 1930 law was first used in 2026, and courts haven't ruled on it. Expect a lawsuit.",
  },
};

export const TARIFF_STATUTE_ORDER: readonly TariffStatute[] = ["s232", "s301", "s201", "s122", "s338"];

export type TariffFinding = {
  readonly id: string;
  readonly statute: InvestigatedStatute;
  /** The goods a §232 or §201 finding is about. */
  readonly sector?: TradeSectorId;
  /** The country a §301 finding is about. */
  readonly partner?: NationId;
  readonly openedTurn: number;
  readonly openedDate: GameDate;
  readonly dueDate: GameDate;
  /** Absent while the investigation is still under way. */
  readonly outcome?: "affirmative" | "negative";
  readonly decidedDate?: GameDate;
  readonly causedBy?: CausalId;
};

export function isTariffStatute(value: string | undefined): value is TariffStatute {
  return value !== undefined && value in TARIFF_STATUTES;
}
