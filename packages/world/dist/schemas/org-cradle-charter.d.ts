import { z } from "zod";
export declare const OrganizationKind: z.ZodEnum<{
    defense: "defense";
    economic: "economic";
    political: "political";
}>;
export type OrganizationKind = z.infer<typeof OrganizationKind>;
export declare const TradeCompetence: z.ZodEnum<{
    none: "none";
    "customs-union": "customs-union";
    fta: "fta";
}>;
export type TradeCompetence = z.infer<typeof TradeCompetence>;
export declare const DefenseScope: z.ZodObject<{
    kind: z.ZodEnum<{
        "parties-territory": "parties-territory";
        area: "area";
    }>;
    area: z.ZodOptional<z.ZodArray<z.core.$ZodBranded<z.ZodString, "RegionId", "out">>>;
    source: z.ZodString;
}, z.core.$strip>;
export type DefenseScope = z.infer<typeof DefenseScope>;
export declare const Organization: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "OrgId", "out">;
    name: z.ZodString;
    kind: z.ZodEnum<{
        defense: "defense";
        economic: "economic";
        political: "political";
    }>;
    members: z.ZodArray<z.core.$ZodBranded<z.ZodString, "NationId", "out">>;
    conflictsWith: z.ZodArray<z.core.$ZodBranded<z.ZodString, "OrgId", "out">>;
    history: z.ZodString;
    requiresCradle: z.ZodOptional<z.ZodArray<z.core.$ZodBranded<z.ZodString, "CradleId", "out">>>;
    tradeCompetence: z.ZodOptional<z.ZodEnum<{
        none: "none";
        "customs-union": "customs-union";
        fta: "fta";
    }>>;
    defenseScope: z.ZodOptional<z.ZodObject<{
        kind: z.ZodEnum<{
            "parties-territory": "parties-territory";
            area: "area";
        }>;
        area: z.ZodOptional<z.ZodArray<z.core.$ZodBranded<z.ZodString, "RegionId", "out">>>;
        source: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Organization = z.infer<typeof Organization>;
export declare const Cradle: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "CradleId", "out">;
    name: z.ZodString;
    region: z.core.$ZodBranded<z.ZodString, "RegionId", "out">;
    startingNeighbors: z.ZodArray<z.core.$ZodBranded<z.ZodString, "NationId", "out">>;
    geo: z.ZodObject<{
        lat: z.ZodNumber;
        lon: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type Cradle = z.infer<typeof Cradle>;
export declare const RemovalMechanism: z.ZodEnum<{
    impeachment: "impeachment";
    "no-confidence": "no-confidence";
    coup: "coup";
    "clerical-council": "clerical-council";
    "electoral-defeat": "electoral-defeat";
}>;
export type RemovalMechanism = z.infer<typeof RemovalMechanism>;
export declare const InstitutionKind: z.ZodEnum<{
    judiciary: "judiciary";
    assembly: "assembly";
    executive: "executive";
}>;
export type InstitutionKind = z.infer<typeof InstitutionKind>;
export declare const Institution: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodString;
    kind: z.ZodOptional<z.ZodEnum<{
        judiciary: "judiciary";
        assembly: "assembly";
        executive: "executive";
    }>>;
}, z.core.$strip>;
export type Institution = z.infer<typeof Institution>;
export declare const PartyKind: z.ZodEnum<{
    major: "major";
    independent: "independent";
}>;
export type PartyKind = z.infer<typeof PartyKind>;
export declare const PartyBeliefs: z.ZodObject<{
    economicLeftRight: z.ZodNumber;
    authLibertarian: z.ZodNumber;
    nationalistGlobalist: z.ZodNumber;
}, z.core.$strict>;
export type PartyBeliefs = z.infer<typeof PartyBeliefs>;
export declare const Party: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "PartyId", "out">;
    name: z.ZodString;
    shortName: z.ZodString;
    kind: z.ZodEnum<{
        major: "major";
        independent: "independent";
    }>;
    beliefs: z.ZodObject<{
        economicLeftRight: z.ZodNumber;
        authLibertarian: z.ZodNumber;
        nationalistGlobalist: z.ZodNumber;
    }, z.core.$strict>;
    cohesion: z.ZodNumber;
}, z.core.$strip>;
export type Party = z.infer<typeof Party>;
export declare const Charter: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "CharterId", "out">;
    name: z.ZodString;
    removalMechanism: z.ZodEnum<{
        impeachment: "impeachment";
        "no-confidence": "no-confidence";
        coup: "coup";
        "clerical-council": "clerical-council";
        "electoral-defeat": "electoral-defeat";
    }>;
    cabinetRoles: z.ZodArray<z.core.$ZodBranded<z.ZodString, "RoleId", "out">>;
    institutions: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            judiciary: "judiciary";
            assembly: "assembly";
            executive: "executive";
        }>>;
    }, z.core.$strip>>;
    decisionConstraint: z.ZodString;
    successionRule: z.ZodString;
    roleTitles: z.ZodOptional<z.ZodRecord<z.core.$ZodBranded<z.ZodString, "RoleId", "out">, z.ZodString>>;
    parties: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.core.$ZodBranded<z.ZodString, "PartyId", "out">;
        name: z.ZodString;
        shortName: z.ZodString;
        kind: z.ZodEnum<{
            major: "major";
            independent: "independent";
        }>;
        beliefs: z.ZodObject<{
            economicLeftRight: z.ZodNumber;
            authLibertarian: z.ZodNumber;
            nationalistGlobalist: z.ZodNumber;
        }, z.core.$strict>;
        cohesion: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type Charter = z.infer<typeof Charter>;
