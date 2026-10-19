import { type Campaign, type UsParty } from "@admin/engine";
import { type StateEconomyAxis, type StateId } from "@admin/world";
import { type ConditionReading } from "./board-state";
import { type DistrictDossier } from "./district-dossier";
import { type StateApprovalReading } from "./state-approval";
import { type StateVital } from "./state-vitals";
export declare const PARTY_WORDS: Readonly<Record<UsParty, string>>;
export declare const ECONOMY_AXIS_LABELS: Readonly<Record<StateEconomyAxis, string>>;
export type GovernorReading = {
    readonly name: string;
    readonly party: UsParty;
    readonly partyWord: string;
    /** 0..1 toward the administration. */
    readonly disposition: number;
    readonly dispositionWord: string;
    /** Whether they will go along with an act that needs a governor's assent. */
    readonly assents: boolean;
    /** The disposition at which a governor agrees, drawn as the line on the meter. */
    readonly assentFloor: number;
    readonly termEnds?: string;
};
export type SenateSeatReading = {
    readonly party: UsParty;
    readonly partyWord: string;
    readonly up: string;
    /** The senator holding the seat, when the chamber's members are seated: their name and the door to their dossier. */
    readonly senator?: {
        readonly name: string;
        readonly href: string;
    };
};
export type HouseReading = {
    readonly seats: number;
    readonly democrat: number;
    readonly republican: number;
    readonly unheld: number;
};
export type MetroReading = {
    readonly id: string;
    readonly name: string;
    readonly population: number;
    readonly populationText: string;
    readonly lon: number;
    readonly lat: number;
};
export type ClaimReading = {
    readonly signature: string;
    readonly reason: string;
    readonly weeksLeft: number;
    readonly weight: number;
};
export type MarkReading = {
    readonly signature: string;
    readonly reason: string;
    readonly forYou: boolean;
    readonly weight: number;
};
export type StateEmergencyReading = {
    readonly id: string;
    readonly title: string;
    readonly statewide: boolean;
    readonly weeksLeft: number;
};
export type StateDossier = {
    readonly id: StateId;
    readonly name: string;
    readonly href: string;
    readonly electoralVotes: number;
    readonly population: number;
    readonly populationText: string;
    readonly grpText: string;
    readonly lean: number;
    readonly leanText: string;
    readonly approval?: StateApprovalReading;
    readonly capitol?: {
        readonly name: string;
        readonly city: string;
    };
    readonly governor?: GovernorReading;
    readonly senate: readonly SenateSeatReading[];
    readonly house: HouseReading;
    readonly districts: readonly DistrictDossier[];
    readonly vitals: readonly StateVital[];
    readonly industry: readonly {
        readonly axis: StateEconomyAxis;
        readonly label: string;
        readonly share: number;
        readonly text: string;
    }[];
    readonly federalDependence: number;
    readonly urbanization: number;
    readonly metros: readonly MetroReading[];
    readonly conditions: readonly ConditionReading[];
    readonly claims: readonly ClaimReading[];
    readonly marks: readonly MarkReading[];
    readonly emergencies: readonly StateEmergencyReading[];
};
/** How a governor's disposition reads, with the assent line as the edge between the middle two words. */
export declare function governorDispositionWord(disposition: number): string;
export declare function stateMetros(id: StateId, limit?: number): readonly MetroReading[];
/** One state's dossier, or undefined for a state the campaign does not carry. */
export declare function stateDossier(campaign: Campaign, id: StateId): StateDossier | undefined;
