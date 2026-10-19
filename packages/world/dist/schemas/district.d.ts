import { z } from "zod";
export declare const DistrictParty: z.ZodEnum<{
    democrat: "democrat";
    republican: "republican";
}>;
export type DistrictParty = z.infer<typeof DistrictParty>;
export declare const District: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "DistrictId", "out">;
    state: z.ZodEnum<{
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
    number: z.ZodNumber;
    population: z.ZodNumber;
    lean: z.ZodNumber;
    incumbentParty: z.ZodEnum<{
        democrat: "democrat";
        republican: "republican";
    }>;
    cohortSkew: z.ZodOptional<z.ZodObject<{
        age: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        class: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        schooling: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        place: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        work: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        race: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        sex: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        nativity: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        disability: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        veteran: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strip>;
export type District = z.infer<typeof District>;
export declare const DistrictObjectSchema: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "DistrictId", "out">;
    state: z.ZodEnum<{
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
    number: z.ZodNumber;
    population: z.ZodNumber;
    lean: z.ZodNumber;
    incumbentParty: z.ZodEnum<{
        democrat: "democrat";
        republican: "republican";
    }>;
    cohortSkew: z.ZodOptional<z.ZodObject<{
        age: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        class: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        schooling: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        place: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        work: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        race: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        sex: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        nativity: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        disability: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
        veteran: z.ZodOptional<z.ZodObject<{
            [x: string]: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strip>;
