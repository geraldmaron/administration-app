import { type Campaign, type Conflict, type ConflictSide, type ReportObligation, type WillingnessForecast } from "@admin/engine";
import { type LonLat, type NationId, type OrgId } from "@admin/world";
import { type ReportStanding, type WarPowersClock } from "./war-powers-reading";
export declare const SIDE_LABEL: Readonly<Record<ConflictSide, string>>;
export type WarMember = {
    readonly nation: NationId;
    readonly name: string;
    readonly role: "principal" | "joined";
    readonly us: boolean;
    /** Why the government came in, where the services can read the decision. Empty means the surface prints "Joined" alone. */
    readonly reasons: readonly string[];
    /** What the government has put into the fighting, line by line; only the United States' own commitments are on record. */
    readonly committed: readonly string[];
};
/** A reading drawn on a meter, with the word beside it. Absent where the services cannot read the side. */
export type WarMeter = {
    readonly value: number;
    readonly word: string;
};
export type WarSide = {
    readonly side: ConflictSide;
    readonly label: string;
    readonly members: readonly WarMember[];
    readonly support?: WarMeter;
    readonly exhaustion?: WarMeter;
    /** Cumulative losses as a band with its confidence, never a count. */
    readonly casualties?: string;
    /** Governments the services expect to join this side. */
    readonly likely: readonly {
        readonly nation: NationId;
        readonly name: string;
        readonly forecast: WillingnessForecast;
    }[];
};
export type WarForce = {
    readonly id: string;
    readonly label: string;
    readonly zoneName: string;
    readonly precision: "installation" | "zone";
    readonly point: LonLat;
    readonly personnel: number;
    readonly service?: string;
    readonly band?: string;
};
export type WarPaper = {
    readonly id: string;
    readonly description: string;
    readonly against: NationId;
    readonly report: ReportStanding;
    /** Days to the forty-eight hour report while it is still owed. */
    readonly reportClock?: WarPowersClock;
    /** The sixty day clock, while forces are committed and no authorization covers them. */
    readonly withdrawal?: WarPowersClock;
    /** Whether Congress has authorized force against this government, is voting on it, or has not been asked. */
    readonly authorization: WarAuthorization;
};
export type WarPeace = {
    readonly counterpart: string;
    readonly offered: boolean;
    readonly forecast: WillingnessForecast;
    readonly reasoning: string;
    /** The United States came in beside a principal, so the settlement is not its to sign. */
    readonly joined: boolean;
};
export type WarCompact = {
    readonly org: OrgId;
    readonly name: string;
    readonly called: boolean;
    readonly answers: readonly {
        readonly nation: NationId;
        readonly name: string;
        readonly forecast: WillingnessForecast;
    }[];
};
export type WarScreenReading = {
    readonly id: string;
    readonly conflict: Conflict;
    readonly title: string;
    readonly cause: string;
    readonly age: string;
    readonly over: boolean;
    readonly statusWord: string;
    /** Where the United States stands in it. */
    readonly usRole: "principal" | "joined" | "outside";
    readonly usSide?: ConflictSide;
    readonly intensity: WarMeter;
    readonly sides: Readonly<Record<ConflictSide, WarSide>>;
    readonly forces: readonly WarForce[];
    readonly papers: readonly WarPaper[];
    readonly peace?: WarPeace;
    /** The standing cost of walking out, where the United States joined and can leave. */
    readonly canLeave: boolean;
    readonly compacts: readonly WarCompact[];
    /** Where Congress stands on force against each principal, for a President deciding whether to go in. */
    readonly authorizations: readonly WarAuthorization[];
    /** Every belligerent in the map's set form: `nation:A|nation:B`. */
    readonly set: string;
    readonly beats: readonly {
        readonly date: string;
        readonly description: string;
    }[];
};
export declare function nationNameIn(campaign: Campaign, nation: NationId): string;
/** One introduction of force as its War Powers paper: the report, the sixty days, and Congress's answer on the government it targets. */
export declare function paperOf(campaign: Campaign, obligation: ReportObligation): WarPaper;
export type WarAuthorization = {
    readonly nation: NationId;
    readonly name: string;
    readonly state: "covered" | "pending" | "open";
    readonly title?: string;
};
/** One war's screen reading. Undefined for a war not on the board. */
export declare function warScreenReading(campaign: Campaign, id: string): WarScreenReading | undefined;
