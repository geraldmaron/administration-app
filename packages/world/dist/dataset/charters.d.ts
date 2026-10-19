export declare const CHARTER_PARLIAMENTARY_REPUBLIC: {
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
export declare const CHARTER_PRESIDENTIAL_REPUBLIC: {
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
export declare const CHARTER_MILITARY_JUNTA: {
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
export declare const CHARTER_THEOCRATIC_COUNCIL: {
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
export declare const CHARTER_ABSOLUTE_MONARCHY: {
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
export declare const CHARTER_ELECTORAL_DEMOCRACY: {
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
export declare const CHARTER_CONFEDERAL_COUNCIL: {
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
export declare const genericCharters: {
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
}[];
