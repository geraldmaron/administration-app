import type { NationId } from "@admin/world";
import type { CausalId } from "./causality.js";
import type { GameDate } from "./state.js";
import type { TradeSectorId } from "./trade-sectors.js";
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
export declare const TARIFF_STATUTES: Readonly<Record<TariffStatute, TariffStatuteDef>>;
export declare const TARIFF_STATUTE_ORDER: readonly TariffStatute[];
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
export declare function isTariffStatute(value: string | undefined): value is TariffStatute;
