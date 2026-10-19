import { z } from "zod";
export declare const STATE_IDS: readonly ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];
export declare const StateId: z.ZodEnum<{
    AL: "AL";
    AK: "AK";
    AZ: "AZ";
    AR: "AR";
    CA: "CA";
    CO: "CO";
    CT: "CT";
    DE: "DE";
    DC: "DC";
    FL: "FL";
    GA: "GA";
    HI: "HI";
    ID: "ID";
    IL: "IL";
    IN: "IN";
    IA: "IA";
    KS: "KS";
    KY: "KY";
    LA: "LA";
    ME: "ME";
    MD: "MD";
    MA: "MA";
    MI: "MI";
    MN: "MN";
    MS: "MS";
    MO: "MO";
    MT: "MT";
    NE: "NE";
    NV: "NV";
    NH: "NH";
    NJ: "NJ";
    NM: "NM";
    NY: "NY";
    NC: "NC";
    ND: "ND";
    OH: "OH";
    OK: "OK";
    OR: "OR";
    PA: "PA";
    RI: "RI";
    SC: "SC";
    SD: "SD";
    TN: "TN";
    TX: "TX";
    UT: "UT";
    VT: "VT";
    VA: "VA";
    WA: "WA";
    WV: "WV";
    WI: "WI";
    WY: "WY";
}>;
export type StateId = z.infer<typeof StateId>;
export declare const StateRegion: z.ZodEnum<{
    northeast: "northeast";
    midwest: "midwest";
    south: "south";
    west: "west";
}>;
export type StateRegion = z.infer<typeof StateRegion>;
export declare const STATE_ECONOMY_AXES: readonly ["industrial", "agricultural", "energy", "tech", "services", "defense"];
export declare const StateEconomyAxis: z.ZodEnum<{
    defense: "defense";
    energy: "energy";
    industrial: "industrial";
    agricultural: "agricultural";
    tech: "tech";
    services: "services";
}>;
export type StateEconomyAxis = z.infer<typeof StateEconomyAxis>;
export declare const StateEconomy: z.ZodObject<{
    industrial: z.ZodNumber;
    agricultural: z.ZodNumber;
    energy: z.ZodNumber;
    tech: z.ZodNumber;
    services: z.ZodNumber;
    defense: z.ZodNumber;
}, z.core.$strict>;
export type StateEconomy = z.infer<typeof StateEconomy>;
export declare const StateCohortMix: z.ZodObject<{
    age: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    class: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    schooling: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    place: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    work: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    race: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    sex: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    nativity: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    disability: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
    veteran: z.ZodObject<{
        [x: string]: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>;
export type StateCohortMix = z.infer<typeof StateCohortMix>;
export declare const StateVitalAnchor: z.ZodObject<{
    unemployment: z.ZodNumber;
    crimeIndex: z.ZodNumber;
    costOfLiving: z.ZodNumber;
}, z.core.$strict>;
export type StateVitalAnchor = z.infer<typeof StateVitalAnchor>;
export declare const StateCharacter: z.ZodObject<{
    economy: z.ZodObject<{
        industrial: z.ZodNumber;
        agricultural: z.ZodNumber;
        energy: z.ZodNumber;
        tech: z.ZodNumber;
        services: z.ZodNumber;
        defense: z.ZodNumber;
    }, z.core.$strict>;
    urbanization: z.ZodNumber;
    federalDependence: z.ZodNumber;
    cohorts: z.ZodObject<{
        age: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        class: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        schooling: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        place: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        work: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        race: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        sex: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        nativity: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        disability: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
        veteran: z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>;
    }, z.core.$strict>;
    vitalAnchor: z.ZodObject<{
        unemployment: z.ZodNumber;
        crimeIndex: z.ZodNumber;
        costOfLiving: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>;
export type StateCharacter = z.infer<typeof StateCharacter>;
export declare const State: z.ZodObject<{
    id: z.ZodEnum<{
        AL: "AL";
        AK: "AK";
        AZ: "AZ";
        AR: "AR";
        CA: "CA";
        CO: "CO";
        CT: "CT";
        DE: "DE";
        DC: "DC";
        FL: "FL";
        GA: "GA";
        HI: "HI";
        ID: "ID";
        IL: "IL";
        IN: "IN";
        IA: "IA";
        KS: "KS";
        KY: "KY";
        LA: "LA";
        ME: "ME";
        MD: "MD";
        MA: "MA";
        MI: "MI";
        MN: "MN";
        MS: "MS";
        MO: "MO";
        MT: "MT";
        NE: "NE";
        NV: "NV";
        NH: "NH";
        NJ: "NJ";
        NM: "NM";
        NY: "NY";
        NC: "NC";
        ND: "ND";
        OH: "OH";
        OK: "OK";
        OR: "OR";
        PA: "PA";
        RI: "RI";
        SC: "SC";
        SD: "SD";
        TN: "TN";
        TX: "TX";
        UT: "UT";
        VT: "VT";
        VA: "VA";
        WA: "WA";
        WV: "WV";
        WI: "WI";
        WY: "WY";
    }>;
    name: z.ZodString;
    fips: z.ZodString;
    electoralVotes: z.ZodNumber;
    houseSeats: z.ZodNumber;
    population: z.ZodNumber;
    grp: z.ZodNumber;
    lean: z.ZodNumber;
    region: z.ZodEnum<{
        northeast: "northeast";
        midwest: "midwest";
        south: "south";
        west: "west";
    }>;
    character: z.ZodObject<{
        economy: z.ZodObject<{
            industrial: z.ZodNumber;
            agricultural: z.ZodNumber;
            energy: z.ZodNumber;
            tech: z.ZodNumber;
            services: z.ZodNumber;
            defense: z.ZodNumber;
        }, z.core.$strict>;
        urbanization: z.ZodNumber;
        federalDependence: z.ZodNumber;
        cohorts: z.ZodObject<{
            age: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            class: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            schooling: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            place: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            work: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            race: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            sex: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            nativity: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            disability: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            veteran: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
        }, z.core.$strict>;
        vitalAnchor: z.ZodObject<{
            unemployment: z.ZodNumber;
            crimeIndex: z.ZodNumber;
            costOfLiving: z.ZodNumber;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strip>;
export type State = z.infer<typeof State>;
export declare const StateObjectSchema: z.ZodObject<{
    id: z.ZodEnum<{
        AL: "AL";
        AK: "AK";
        AZ: "AZ";
        AR: "AR";
        CA: "CA";
        CO: "CO";
        CT: "CT";
        DE: "DE";
        DC: "DC";
        FL: "FL";
        GA: "GA";
        HI: "HI";
        ID: "ID";
        IL: "IL";
        IN: "IN";
        IA: "IA";
        KS: "KS";
        KY: "KY";
        LA: "LA";
        ME: "ME";
        MD: "MD";
        MA: "MA";
        MI: "MI";
        MN: "MN";
        MS: "MS";
        MO: "MO";
        MT: "MT";
        NE: "NE";
        NV: "NV";
        NH: "NH";
        NJ: "NJ";
        NM: "NM";
        NY: "NY";
        NC: "NC";
        ND: "ND";
        OH: "OH";
        OK: "OK";
        OR: "OR";
        PA: "PA";
        RI: "RI";
        SC: "SC";
        SD: "SD";
        TN: "TN";
        TX: "TX";
        UT: "UT";
        VT: "VT";
        VA: "VA";
        WA: "WA";
        WV: "WV";
        WI: "WI";
        WY: "WY";
    }>;
    name: z.ZodString;
    fips: z.ZodString;
    electoralVotes: z.ZodNumber;
    houseSeats: z.ZodNumber;
    population: z.ZodNumber;
    grp: z.ZodNumber;
    lean: z.ZodNumber;
    region: z.ZodEnum<{
        northeast: "northeast";
        midwest: "midwest";
        south: "south";
        west: "west";
    }>;
    character: z.ZodObject<{
        economy: z.ZodObject<{
            industrial: z.ZodNumber;
            agricultural: z.ZodNumber;
            energy: z.ZodNumber;
            tech: z.ZodNumber;
            services: z.ZodNumber;
            defense: z.ZodNumber;
        }, z.core.$strict>;
        urbanization: z.ZodNumber;
        federalDependence: z.ZodNumber;
        cohorts: z.ZodObject<{
            age: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            class: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            schooling: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            place: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            work: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            race: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            sex: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            nativity: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            disability: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
            veteran: z.ZodObject<{
                [x: string]: z.ZodNumber;
            }, z.core.$strict>;
        }, z.core.$strict>;
        vitalAnchor: z.ZodObject<{
            unemployment: z.ZodNumber;
            crimeIndex: z.ZodNumber;
            costOfLiving: z.ZodNumber;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strip>;
