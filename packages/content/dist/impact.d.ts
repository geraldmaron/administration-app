import { z } from "zod";
/**
 * Lives, as a share of the affected population rather than as a count.
 *
 * A count would have to be authored against a country the scenario does not
 * know it will be cast onto — the same reason a scenario names a kind of place
 * and not a city. Four hundred dead is a different week in a country of four
 * million than in one of four hundred million, and these bands are what lets
 * one piece of writing be correct in both.
 */
export declare const HumanToll: z.ZodEnum<{
    none: "none";
    isolated: "isolated";
    dozens: "dozens";
    hundreds: "hundreds";
    thousands: "thousands";
    mass: "mass";
}>;
export type HumanToll = z.infer<typeof HumanToll>;
export declare const DisplacementScale: z.ZodEnum<{
    none: "none";
    local: "local";
    regional: "regional";
    national: "national";
}>;
export type DisplacementScale = z.infer<typeof DisplacementScale>;
/**
 * Who bore it.
 *
 * The field that makes a body count political rather than arithmetic. The same
 * toll lands differently on the whole country, on one region, on a group the
 * government is already accused of neglecting, on the services who were sent,
 * or on foreigners — and only the last of those is mostly a question of
 * standing rather than of approval at home.
 */
export declare const TollBorneBy: z.ZodEnum<{
    diffuse: "diffuse";
    "one-region": "one-region";
    "one-group": "one-group";
    "the-services": "the-services";
    abroad: "abroad";
}>;
export type TollBorneBy = z.infer<typeof TollBorneBy>;
/**
 * Money, as what it takes to authorize rather than as a sum.
 *
 * "Discretionary" is inside what an executive can move alone; "supplemental"
 * has to be asked for; "emergency" is asked for under a clock and granted
 * against the government's own future room; "structural" is a permanent claim
 * on the budget. The distinction the player feels is which of those four
 * conversations they have just started, not the figure.
 */
export declare const FinancialScale: z.ZodEnum<{
    none: "none";
    discretionary: "discretionary";
    supplemental: "supplemental";
    emergency: "emergency";
    structural: "structural";
}>;
export type FinancialScale = z.infer<typeof FinancialScale>;
export declare const FinancialHorizon: z.ZodEnum<{
    "one-off": "one-off";
    "multi-year": "multi-year";
    permanent: "permanent";
}>;
export type FinancialHorizon = z.infer<typeof FinancialHorizon>;
/**
 * What the decision spent that is not money and not lives.
 *
 * Capacity to act, in kind. These are the costs a government feels most and
 * accounts for least: a source burned is an intelligence service that knows
 * less next year, alliance credit spent is a favor that cannot be asked twice,
 * legislative capital spent is the bill that now will not pass.
 */
export declare const InstitutionalCost: z.ZodEnum<{
    "forces-committed": "forces-committed";
    "intelligence-source-burned": "intelligence-source-burned";
    "legal-authority-spent": "legal-authority-spent";
    "alliance-credit-spent": "alliance-credit-spent";
    "alliance-credit-earned": "alliance-credit-earned";
    "legislative-capital-spent": "legislative-capital-spent";
    "civil-service-strained": "civil-service-strained";
    "emergency-powers-invoked": "emergency-powers-invoked";
    "conduct-in-question": "conduct-in-question";
}>;
export type InstitutionalCost = z.infer<typeof InstitutionalCost>;
/**
 * How visibly this was the government's own doing.
 *
 * The multiplier on every reputational consequence below, and the reason
 * collateral damage is a different event from a flood with the same toll. A
 * public forgives a government for what happened to it and does not forgive it
 * for what it did — and "inherited" is the third case that every administration
 * spends its first year arguing about.
 */
export declare const ImpactAgency: z.ZodEnum<{
    "our-doing": "our-doing";
    "on-our-watch": "on-our-watch";
    inherited: "inherited";
    "acted-upon": "acted-upon";
}>;
export type ImpactAgency = z.infer<typeof ImpactAgency>;
export declare const ScenarioImpact: z.ZodObject<{
    human: z.ZodOptional<z.ZodObject<{
        lives: z.ZodOptional<z.ZodEnum<{
            none: "none";
            isolated: "isolated";
            dozens: "dozens";
            hundreds: "hundreds";
            thousands: "thousands";
            mass: "mass";
        }>>;
        accounting: z.ZodOptional<z.ZodEnum<{
            new: "new";
            "already-reported": "already-reported";
        }>>;
        displaced: z.ZodOptional<z.ZodEnum<{
            none: "none";
            local: "local";
            regional: "regional";
            national: "national";
        }>>;
        borneBy: z.ZodOptional<z.ZodEnum<{
            diffuse: "diffuse";
            "one-region": "one-region";
            "one-group": "one-group";
            "the-services": "the-services";
            abroad: "abroad";
        }>>;
        cohorts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            veteran: "veteran";
            "age-under-35": "age-under-35";
            "age-35-64": "age-35-64";
            "age-65-plus": "age-65-plus";
            "income-struggling": "income-struggling";
            "income-comfortable": "income-comfortable";
            "income-affluent": "income-affluent";
            "no-degree": "no-degree";
            degree: "degree";
            urban: "urban";
            suburban: "suburban";
            rural: "rural";
            "goods-producing": "goods-producing";
            "frontline-services": "frontline-services";
            "professional-technical": "professional-technical";
            "public-and-uniformed": "public-and-uniformed";
            "not-in-the-workforce": "not-in-the-workforce";
            "race-hispanic": "race-hispanic";
            "race-black": "race-black";
            "race-asian": "race-asian";
            "race-white": "race-white";
            "race-other": "race-other";
            "sex-female": "sex-female";
            "sex-male": "sex-male";
            "foreign-born": "foreign-born";
            "us-born": "us-born";
            "with-disability": "with-disability";
            "no-disability": "no-disability";
            "non-veteran": "non-veteran";
        }>>>;
    }, z.core.$strict>>;
    financial: z.ZodOptional<z.ZodObject<{
        scale: z.ZodOptional<z.ZodEnum<{
            none: "none";
            discretionary: "discretionary";
            supplemental: "supplemental";
            emergency: "emergency";
            structural: "structural";
        }>>;
        scope: z.ZodOptional<z.ZodEnum<{
            city: "city";
            national: "national";
        }>>;
        horizon: z.ZodOptional<z.ZodEnum<{
            "one-off": "one-off";
            "multi-year": "multi-year";
            permanent: "permanent";
        }>>;
        basis: z.ZodOptional<z.ZodObject<{
            quantity: z.ZodNumber;
            unit: z.ZodString;
            unitCostUSD: z.ZodNumber;
            weeks: z.ZodOptional<z.ZodNumber>;
            source: z.ZodString;
            coverage: z.ZodOptional<z.ZodString>;
            components: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                quantity: z.ZodNumber;
                unit: z.ZodString;
                unitCostUSD: z.ZodNumber;
                weeks: z.ZodOptional<z.ZodNumber>;
                source: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    institutional: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "forces-committed": "forces-committed";
        "intelligence-source-burned": "intelligence-source-burned";
        "legal-authority-spent": "legal-authority-spent";
        "alliance-credit-spent": "alliance-credit-spent";
        "alliance-credit-earned": "alliance-credit-earned";
        "legislative-capital-spent": "legislative-capital-spent";
        "civil-service-strained": "civil-service-strained";
        "emergency-powers-invoked": "emergency-powers-invoked";
        "conduct-in-question": "conduct-in-question";
    }>>>;
    agency: z.ZodOptional<z.ZodEnum<{
        "our-doing": "our-doing";
        "on-our-watch": "on-our-watch";
        inherited: "inherited";
        "acted-upon": "acted-upon";
    }>>;
    divisive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type ScenarioImpact = z.infer<typeof ScenarioImpact>;
