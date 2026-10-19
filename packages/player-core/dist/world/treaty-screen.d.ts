import { type Campaign, type EffectPacket, type LobbyForecast, type TreatyKind, type TreatyStatus, type WillingnessForecast } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ActComparison } from "../congress/act-comparison";
export declare const DRAFT_PREFIX = "draft:";
/** The four instruments a President can sign, in the order a chooser lists them. */
export declare const TREATY_KIND_LABELS: Readonly<Record<TreatyKind, string>>;
export declare function draftTreatyId(kind: TreatyKind, nation: NationId): string;
export type TreatyParty = {
    readonly nation: NationId;
    readonly name: string;
    readonly us: boolean;
};
export type SenateReading = {
    readonly likelihood: LobbyForecast["likelihood"];
    readonly confidence: LobbyForecast["confidence"];
    readonly basis: string;
    readonly reasoning: string;
    readonly uncertainty: string;
};
export type TreatyScreenReading = {
    readonly id: string;
    readonly form: "record" | "draft" | "compact";
    readonly title: string;
    readonly name: string;
    readonly summary: string;
    readonly bindsOn: "ratification" | "signature";
    readonly status: string;
    readonly statusKey: TreatyStatus | "draft" | "compact";
    readonly parties: readonly TreatyParty[];
    readonly set: string;
    readonly counterpart?: NationId;
    readonly kind?: TreatyKind;
    /** What being in force does to the relationship, said in the size of the step. */
    readonly effect?: string;
    /** Whether the other government would sign, for a draft. */
    readonly signing?: {
        readonly forecast: WillingnessForecast;
        readonly reasons: readonly string[];
    };
    readonly senate?: SenateReading;
    readonly before?: {
        readonly date: string;
        readonly dueIn: string;
    };
    readonly vote?: string;
    /** The date it was signed, for an instrument that has been. */
    readonly signedOn?: string;
    /** What has happened to the instrument, oldest first; empty for a draft and a compact. */
    readonly history: readonly {
        readonly date: string;
        readonly text: string;
    }[];
};
/** One instrument's screen reading. Undefined for an id that is none of a record, a draft or a compact. */
export declare function treatyScreenReading(campaign: Campaign, id: string): TreatyScreenReading | undefined;
/** What the President could sign with a government, each kind with whether it would and why, for the chooser on a treaty's screen. */
export declare function treatyChoices(campaign: Campaign, nation: NationId): readonly {
    readonly kind: TreatyKind;
    readonly label: string;
    readonly id: string;
    readonly forecast: WillingnessForecast;
    readonly reasons: readonly string[];
}[];
/** The packet signing commits; a refusal reads in the engine's words. */
export declare function signPacket(campaign: Campaign, kind: TreatyKind, nation: NationId): EffectPacket;
/** The packet that sends a signed treaty to the Senate. */
export declare function ratifyPacket(campaign: Campaign, id: string): EffectPacket;
/** The packet that takes an instrument back. */
export declare function withdrawPacket(campaign: Campaign, id: string): EffectPacket;
/** Signing a draft. */
export declare function signComparison(campaign: Campaign, reading: TreatyScreenReading): ActComparison;
/** Sending a signed treaty to the Senate. */
export declare function ratifyComparison(campaign: Campaign, record: TreatyScreenReading): ActComparison;
/** Taking an instrument back. */
export declare function withdrawComparison(campaign: Campaign, record: TreatyScreenReading): ActComparison;
