import { type Campaign, type Commitment } from "@admin/engine";
import { type NationId } from "@admin/world";
import { type ForeignCoverageView } from "../press/foreign-coverage";
import { type RecentMove } from "../reasons/recent-moves";
import type { Stance } from "../reading";
import { type EnvoyReading } from "./engagement";
import { type WorldLeaderRow } from "./leaders";
import { type NationForcesReading } from "./nation-forces";
import { type NationPosture } from "./nation-posture";
import { type NationPower } from "./nation-power";
import { type NationProgram } from "./nation-program";
import { type NationVital } from "./nation-vitals";
import { type Standing } from "./standing";
import { type BilateralTrade } from "./trade-partners";
export type CommitmentRow = {
    readonly id: string;
    readonly kind: Commitment["kind"];
    readonly rationale: string;
    readonly status: Commitment["status"];
};
export type PresenceRow = {
    readonly id: string;
    readonly label: string;
    readonly where: string;
    readonly precision: "installation" | "zone";
    readonly band?: string;
    readonly lon: number;
    readonly lat: number;
    readonly weight: number;
};
export type OrganizationRow = {
    readonly id: string;
    readonly name: string;
    readonly href: string;
};
export type TieRow = {
    readonly nation: NationId;
    readonly name: string;
    readonly href: string;
    readonly word: string;
    readonly kind: "ally" | "rival";
};
/** A line the map draws from the country to one of its ties. */
export type NationArc = {
    readonly to: NationId;
    readonly kind: "trade" | "ally" | "rival";
    readonly weight: number;
};
export type NationFile = {
    readonly nation: NationId;
    readonly name: string;
    readonly leader: WorldLeaderRow;
    readonly inOfficeSince?: string;
    readonly nextSelection?: string;
    readonly posture: NationPosture;
    readonly standing: Standing;
    readonly boardStance: Stance | "unread" | undefined;
    readonly rapport?: string;
    readonly envoy: EnvoyReading;
    readonly atWarWith: readonly string[];
    readonly vitals: readonly NationVital[];
    /** Population, GDP and military spending, in the dataset's own units. */
    readonly power: NationPower;
    readonly trade: BilateralTrade;
    readonly forces: NationForcesReading;
    readonly presence: readonly PresenceRow[];
    readonly commitments: readonly CommitmentRow[];
    readonly program: NationProgram;
    readonly recent: readonly RecentMove[];
    readonly organizations: readonly OrganizationRow[];
    readonly coverage?: ForeignCoverageView;
    readonly ties: readonly TieRow[];
    readonly arcs: readonly NationArc[];
    readonly provenance?: string;
};
/** A foreign government's whole file, or undefined for the President's own country and an id the board does not carry. */
export declare function nationFile(campaign: Campaign, nation: NationId): NationFile | undefined;
