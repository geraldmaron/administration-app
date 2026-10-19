import type { City, CityKind } from "../schemas/city.js";
export declare const CHARTER_USA_CONSTITUTION: {
    id: string & import("zod").$brand<"CharterId">;
    name: string;
    removalMechanism: "impeachment" | "no-confidence" | "coup" | "clerical-council" | "electoral-defeat";
    cabinetRoles: (string & import("zod").$brand<"RoleId">)[];
    institutions: {
        name: string;
        role: string;
        kind?: "judiciary" | "assembly" | "executive" | undefined;
    }[];
    decisionConstraint: string;
    successionRule: string;
    roleTitles?: Record<string & import("zod").$brand<"RoleId">, string> | undefined;
    parties?: {
        id: string & import("zod").$brand<"PartyId">;
        name: string;
        shortName: string;
        kind: "major" | "independent";
        beliefs: {
            economicLeftRight: number;
            authLibertarian: number;
            nationalistGlobalist: number;
        };
        cohesion: number;
    }[] | undefined;
};
export declare const usaCharter: {
    id: string & import("zod").$brand<"CharterId">;
    name: string;
    removalMechanism: "impeachment" | "no-confidence" | "coup" | "clerical-council" | "electoral-defeat";
    cabinetRoles: (string & import("zod").$brand<"RoleId">)[];
    institutions: {
        name: string;
        role: string;
        kind?: "judiciary" | "assembly" | "executive" | undefined;
    }[];
    decisionConstraint: string;
    successionRule: string;
    roleTitles?: Record<string & import("zod").$brand<"RoleId">, string> | undefined;
    parties?: {
        id: string & import("zod").$brand<"PartyId">;
        name: string;
        shortName: string;
        kind: "major" | "independent";
        beliefs: {
            economicLeftRight: number;
            authLibertarian: number;
            nationalistGlobalist: number;
        };
        cohesion: number;
    }[] | undefined;
};
export type UsPartyWeights = Readonly<Record<"democrat" | "republican" | "independent", number>>;
export declare function usPartyWeightsFor(role: string): UsPartyWeights | undefined;
export declare function usPartyQuotaFor(role: string): number;
export type UsaPlaceKind = CityKind;
export type UsaPlace = {
    readonly name: string;
    readonly kind: UsaPlaceKind;
    readonly dLat: number;
    readonly dLon: number;
};
export declare function usaPlacesFrom(cities: readonly City[]): readonly UsaPlace[];
export declare const usaPlaces: readonly UsaPlace[];
