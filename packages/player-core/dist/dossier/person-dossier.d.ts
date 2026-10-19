import { type ActionRecord, type CabinetDeparture, type CabinetFaction, type Campaign, type CounselStance, type InstitutionDef, type LoyaltyTrend, type Nomination, type RemovalConstraint, type UsParty } from "@admin/engine";
import { type CityId, type NationId, type RoleId, type StateId } from "@admin/world";
import { type PersonEducation, type PersonEligibility } from "./person-background";
export * from "./person-background";
/**
 * Where a person stands in this campaign's government, read from the engine's
 * own records: the chair they hold, the post on the Hill, the bench seat, the
 * state they govern, the agency they run — or, when none of those, what became
 * of them. One answer, in priority order, so a file never calls a sitting
 * justice "available" because the check for the bench came second.
 */
export type PersonStanding = {
    readonly kind: "deceased";
} | {
    readonly kind: "president";
} | {
    readonly kind: "cabinet";
    readonly role: RoleId;
    readonly title: string;
    readonly institution?: InstitutionDef;
} | {
    readonly kind: "justice";
    readonly seat: number;
    readonly chief: boolean;
} | {
    readonly kind: "hill";
    readonly post: string;
    readonly title: string;
    readonly chamber: string;
    readonly caucus: string;
    readonly disposition?: number;
    readonly influence?: number;
} | {
    readonly kind: "mayor";
    readonly city: CityId;
    readonly cityName: string;
    readonly state?: StateId;
} | {
    readonly kind: "governor";
    readonly state: StateId;
    readonly stateName: string;
    readonly party?: UsParty;
    readonly disposition?: number;
} | {
    readonly kind: "agency";
    readonly institution: InstitutionDef;
    readonly title: string;
    readonly removal: RemovalConstraint;
    /** Set when the seat is a federal appeals judgeship, which the engine keeps as an institution. */
    readonly circuit?: string;
} | {
    readonly kind: "foreign-leader";
    readonly nation: NationId;
    readonly nationName: string;
    readonly title?: string;
} | {
    readonly kind: "foreign";
    readonly nation: NationId;
    readonly nationName: string;
} | {
    readonly kind: "former";
    readonly role: RoleId;
    readonly title: string;
    readonly departure: CabinetDeparture;
} | {
    readonly kind: "available";
};
export type CounselGiven = {
    readonly entry: ActionRecord;
    readonly stance: CounselStance;
    /** True when theirs was the chair the decision routed to, not one voice in the room. */
    readonly primary: boolean;
};
export type PersonDossier = {
    readonly standing: PersonStanding;
    readonly nomination?: {
        readonly nomination: Nomination;
        readonly officeTitle: string;
        readonly standing: string;
    };
    readonly loyaltyTrend?: LoyaltyTrend;
    readonly faction?: CabinetFaction;
    /** Every time the ledger records their advice, newest first. */
    readonly counsel: readonly CounselGiven[];
    /** Entries that name them, newest first, other than the ones they advised on. */
    readonly namedIn: readonly ActionRecord[];
    readonly education?: PersonEducation;
    /** The chairs their record makes them eligible for, as this charter titles them. */
    readonly eligible: readonly PersonEligibility[];
};
export declare function personStanding(campaign: Campaign, personId: string): PersonStanding;
export declare function personDossier(campaign: Campaign, personId: string): PersonDossier | undefined;
