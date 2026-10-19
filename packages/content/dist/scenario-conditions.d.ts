import { z } from "zod";
export declare const ScenarioCast: z.ZodDiscriminatedUnion<[z.ZodObject<{
    pick: z.ZodLiteral<"tensest">;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"closest">;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"band">;
    archetype: z.ZodOptional<z.ZodString>;
    powerTier: z.ZodOptional<z.ZodNumber>;
    militaryTier: z.ZodOptional<z.ZodNumber>;
    stabilityBand: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"nation">;
    nation: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"warCounterpart">;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"belligerent">;
    side: z.ZodOptional<z.ZodEnum<{
        aggressor: "aggressor";
        defender: "defender";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"none">;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"stricken">;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"outlet">;
    outlet: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"collectionReport">;
    bind: z.ZodEnum<{
        target: "target";
        recipient: "recipient";
        home: "home";
    }>;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"tradeMeasure">;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"liveBill">;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"judicialVacancy">;
}, z.core.$strip>, z.ZodObject<{
    pick: z.ZodLiteral<"pendingOrderCase">;
}, z.core.$strip>], "pick">;
export type ScenarioCast = z.infer<typeof ScenarioCast>;
export declare const ConditionKind: z.ZodEnum<{
    unrest: "unrest";
    earthquake: "earthquake";
    flood: "flood";
    drought: "drought";
    cyclone: "cyclone";
    wildfire: "wildfire";
    pandemic: "pandemic";
    tornado: "tornado";
    "winter-storm": "winter-storm";
    "heat-wave": "heat-wave";
    recession: "recession";
    "inflation-shock": "inflation-shock";
    "unemployment-shock": "unemployment-shock";
    "fiscal-crisis": "fiscal-crisis";
    "energy-shortage": "energy-shortage";
    "housing-crunch": "housing-crunch";
}>;
export type ConditionKind = z.infer<typeof ConditionKind>;
export declare const ScenarioCondition: z.ZodDiscriminatedUnion<[z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"metric">;
    metric: z.ZodEnum<{
        approval: "approval";
        treasury: "treasury";
        stability: "stability";
        militaryReadiness: "militaryReadiness";
        standing: "standing";
    }>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"alignment">;
    axis: z.ZodEnum<{
        economicLeftRight: "economicLeftRight";
        authLibertarian: "authLibertarian";
        nationalistGlobalist: "nationalistGlobalist";
    }>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"relationship">;
    field: z.ZodEnum<{
        alignment: "alignment";
        trust: "trust";
        tension: "tension";
        tradeDependence: "tradeDependence";
        militaryThreat: "militaryThreat";
    }>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"counterpartTrait">;
    trait: z.ZodEnum<{
        aggression: "aggression";
        opportunism: "opportunism";
        legalism: "legalism";
        isolationism: "isolationism";
        riskTolerance: "riskTolerance";
        vengefulness: "vengefulness";
        reliability: "reliability";
        transparency: "transparency";
    }>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"cabinetAttribute">;
    roleHint: z.ZodEnum<{
        justice: "justice";
        defense: "defense";
        interior: "interior";
        foreign: "foreign";
        finance: "finance";
        agriculture: "agriculture";
        commerce: "commerce";
        labor: "labor";
        health: "health";
        housing: "housing";
        transportation: "transportation";
        energy: "energy";
        education: "education";
        veterans: "veterans";
        homeland: "homeland";
        intelligence: "intelligence";
        lead: "lead";
    }>;
    attribute: z.ZodEnum<{
        competence: "competence";
        loyalty: "loyalty";
        ambition: "ambition";
        integrity: "integrity";
        charisma: "charisma";
    }>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"flag">;
    flag: z.ZodString;
    is: z.ZodBoolean;
    agedAtLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"turn">;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"removalPressure">;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"charterInstitution">;
    institution: z.ZodEnum<{
        judiciary: "judiciary";
        assembly: "assembly";
        executive: "executive";
    }>;
    present: z.ZodBoolean;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"warState">;
    role: z.ZodEnum<{
        any: "any";
        aggressor: "aggressor";
        defender: "defender";
        none: "none";
    }>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"conditionActive">;
    condition: z.ZodOptional<z.ZodEnum<{
        unrest: "unrest";
        earthquake: "earthquake";
        flood: "flood";
        drought: "drought";
        cyclone: "cyclone";
        wildfire: "wildfire";
        pandemic: "pandemic";
        tornado: "tornado";
        "winter-storm": "winter-storm";
        "heat-wave": "heat-wave";
        recession: "recession";
        "inflation-shock": "inflation-shock";
        "unemployment-shock": "unemployment-shock";
        "fiscal-crisis": "fiscal-crisis";
        "energy-shortage": "energy-shortage";
        "housing-crunch": "housing-crunch";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"coalition">;
    against: z.ZodEnum<{
        player: "player";
        counterpart: "counterpart";
    }>;
    present: z.ZodBoolean;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"tradeMeasure">;
    origin: z.ZodLiteral<"retaliation">;
    responseSector: z.ZodString;
    responseRate: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"liveBill">;
    stage: z.ZodEnum<{
        markup: "markup";
        conference: "conference";
    }>;
    act: z.ZodOptional<z.ZodString>;
    responseText: z.ZodOptional<z.ZodEnum<{
        base: "base";
        targeted: "targeted";
        both: "both";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"judicialVacancy">;
    seat: z.ZodOptional<z.ZodEnum<{
        chief: "chief";
        associate: "associate";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"pendingOrderCase">;
    posture: z.ZodOptional<z.ZodLiteral<"adverse-lower">>;
    ruleState: z.ZodOptional<z.ZodEnum<{
        unimplemented: "unimplemented";
        operative: "operative";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"sharedMembership">;
    present: z.ZodBoolean;
    orgKind: z.ZodOptional<z.ZodEnum<{
        economic: "economic";
        defense: "defense";
        political: "political";
    }>>;
    tradeCompetence: z.ZodOptional<z.ZodEnum<{
        "customs-union": "customs-union";
        fta: "fta";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"sharesBorder">;
    present: z.ZodBoolean;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"tariffInForce">;
    present: z.ZodBoolean;
    of: z.ZodOptional<z.ZodEnum<{
        answered: "answered";
        response: "response";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"policyStance">;
    domain: z.ZodEnum<{
        fiscal: "fiscal";
        industry: "industry";
        trade: "trade";
        civil: "civil";
        security: "security";
        defense: "defense";
    }>;
    stance: z.ZodString;
    active: z.ZodBoolean;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"press">;
    measure: z.ZodEnum<{
        outlet: "outlet";
        standing: "standing";
        silenceWeeks: "silenceWeeks";
        hostileShare: "hostileShare";
    }>;
    outlet: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"operatorPressure">;
    field: z.ZodEnum<{
        insurgency: "insurgency";
        protest: "protest";
    }>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"geography">;
    field: z.ZodEnum<{
        chokepoint: "chokepoint";
        coastal: "coastal";
        landlocked: "landlocked";
        bordered: "bordered";
    }>;
    is: z.ZodBoolean;
    of: z.ZodOptional<z.ZodEnum<{
        player: "player";
        counterpart: "counterpart";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"revealedPreference">;
    trait: z.ZodEnum<{
        concedesUnderPressure: "concedesUnderPressure";
        escalatesWhenTested: "escalatesWhenTested";
        honorsFriends: "honorsFriends";
    }>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"stateGrievance">;
    signature: z.ZodOptional<z.ZodString>;
    scope: z.ZodEnum<{
        any: "any";
        locus: "locus";
    }>;
}, z.core.$strip>, z.ZodObject<{
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"cohortStrain">;
    cohort: z.ZodEnum<{
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
    }>;
    cause: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"calendar">;
    months: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    season: z.ZodOptional<z.ZodEnum<{
        winter: "winter";
        spring: "spring";
        summer: "summer";
        fall: "fall";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"ticket">;
    party: z.ZodOptional<z.ZodString>;
    background: z.ZodOptional<z.ZodString>;
    route: z.ZodOptional<z.ZodString>;
    plank: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"legislationAvailable">;
    act: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"collectionReport">;
    targetKind: z.ZodEnum<{
        "foreign-nation": "foreign-nation";
        "domestic-state": "domestic-state";
    }>;
    status: z.ZodOptional<z.ZodEnum<{
        findings: "findings";
        "no-result": "no-result";
    }>>;
    topic: z.ZodOptional<z.ZodEnum<{
        stability: "stability";
        "military-readiness": "military-readiness";
        "external-intent": "external-intent";
        "domestic-security": "domestic-security";
        "financial-pressure": "financial-pressure";
    }>>;
    basis: z.ZodOptional<z.ZodEnum<{
        pursuit: "pursuit";
        "state-condition": "state-condition";
        "governor-request": "governor-request";
    }>>;
    condition: z.ZodOptional<z.ZodEnum<{
        unrest: "unrest";
        earthquake: "earthquake";
        flood: "flood";
        drought: "drought";
        cyclone: "cyclone";
        wildfire: "wildfire";
        pandemic: "pandemic";
        tornado: "tornado";
        "winter-storm": "winter-storm";
        "heat-wave": "heat-wave";
        recession: "recession";
        "inflation-shock": "inflation-shock";
        "unemployment-shock": "unemployment-shock";
        "fiscal-crisis": "fiscal-crisis";
        "energy-shortage": "energy-shortage";
        "housing-crunch": "housing-crunch";
    }>>;
    confidence: z.ZodOptional<z.ZodEnum<{
        low: "low";
        moderate: "moderate";
        high: "high";
    }>>;
    exposed: z.ZodOptional<z.ZodBoolean>;
    shared: z.ZodOptional<z.ZodBoolean>;
    recipientAffected: z.ZodOptional<z.ZodBoolean>;
    activeTasking: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"inflationBand">;
    in: z.ZodArray<z.ZodEnum<{
        high: "high";
        "below-target": "below-target";
        "near-target": "near-target";
        elevated: "elevated";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"unemploymentBand">;
    in: z.ZodArray<z.ZodEnum<{
        tight: "tight";
        normal: "normal";
        slack: "slack";
        severe: "severe";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"costOfLivingBand">;
    in: z.ZodArray<z.ZodEnum<{
        easing: "easing";
        steady: "steady";
        rising: "rising";
        straining: "straining";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"crimeTrend">;
    in: z.ZodArray<z.ZodEnum<{
        steady: "steady";
        rising: "rising";
        falling: "falling";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"cyclePhase">;
    in: z.ZodArray<z.ZodEnum<{
        expansion: "expansion";
        peak: "peak";
        contraction: "contraction";
        trough: "trough";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"commodityBand">;
    commodity: z.ZodEnum<{
        crude: "crude";
        "natural-gas": "natural-gas";
        lng: "lng";
        wheat: "wheat";
        corn: "corn";
        soybeans: "soybeans";
        potash: "potash";
        nitrogen: "nitrogen";
        copper: "copper";
        lithium: "lithium";
        "rare-earths": "rare-earths";
    }>;
    in: z.ZodArray<z.ZodEnum<{
        elevated: "elevated";
        normal: "normal";
        slumped: "slumped";
        spiking: "spiking";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"institutionState">;
    institution: z.ZodString;
    field: z.ZodEnum<{
        delivery: "delivery";
        politicization: "politicization";
        backlog: "backlog";
        vacantDays: "vacantDays";
        openMatters: "openMatters";
    }>;
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"oversightMatter">;
    origin: z.ZodOptional<z.ZodEnum<{
        "inspector-general": "inspector-general";
        committee: "committee";
        "special-counsel": "special-counsel";
    }>>;
    institution: z.ZodOptional<z.ZodString>;
    stage: z.ZodOptional<z.ZodEnum<{
        opened: "opened";
        gathering: "gathering";
        reported: "reported";
    }>>;
    public: z.ZodOptional<z.ZodBoolean>;
    obstructed: z.ZodOptional<z.ZodBoolean>;
    atLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"shutdown">;
    is: z.ZodOptional<z.ZodBoolean>;
    weeksAtLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"appropriation">;
    onPriorYear: z.ZodOptional<z.ZodBoolean>;
    weeksLeftAtMost: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"pendingRule">;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        stayed: "stayed";
        "in-effect": "in-effect";
        canceled: "canceled";
        "struck-down": "struck-down";
        disapproved: "disapproved";
    }>>;
    atLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>], "kind">;
export type ScenarioCondition = z.infer<typeof ScenarioCondition>;
