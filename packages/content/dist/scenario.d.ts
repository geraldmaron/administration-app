import { POSITION_RELATIONSHIP_LIMIT } from "@admin/engine";
import { z } from "zod";
export { ScenarioRejoinderSpeaker, ScenarioRoleHint, ScenarioSpeaker, ScenarioSpeakerRoleHint, } from "./scenario-speaker.js";
export { scenarioEra, ScenarioEraAssumption, TOPIC_TAGS, ScenarioTopicTag } from "./scenario-topics.js";
export { ENTITY_REGISTRY, EntityRegistryId } from "./entity-registry.js";
export type { EntityRegistryEntry } from "./entity-registry.js";
export { DilemmaShape, Motif, ScenarioClass, ScenarioInstrument, PressureSource, ScenarioConflictMove, ScenarioIntelConfidence, ScenarioLocusSite, ScenarioPolicyDomain, ScenarioSeverity, ScenarioTone, } from "./scenario-labels.js";
import { ScenarioClass, ScenarioSeverity } from "./scenario-labels.js";
export { DomesticMagnitudeSchema, DomesticSignatureShape, MAGNITUDE_STEP, STATE_ROUTE_CAP, STATE_ROUTE_TURN_CAP, } from "./domestic-signature.js";
export type { DomesticMagnitudeSchema as DomesticMagnitude, DomesticSignatureShape as DomesticSignature } from "./domestic-signature.js";
export { ConditionKind, ScenarioCast, ScenarioCondition } from "./scenario-conditions.js";
/**
 * How many times the record has to have tested a trait before content may
 * assert the world has read it.
 *
 * The profile answers every question about a fresh campaign with the midpoint,
 * because "the record does not say" and "they do both about equally" are the
 * same number — so a bare bound would fire a scenario about the player's
 * established pattern on a government that has not yet done anything. Three is
 * the smallest count a person would call a pattern rather than a coincidence,
 * and it is the number the design argues from: a state that has conceded three
 * times is one whose next probe gets priced cheaper.
 */
export declare const REVEALED_PREFERENCE_EVIDENCE_FLOOR = 3;
export declare const WeightBoost: z.ZodObject<{
    source: z.ZodEnum<{
        tension: "tension";
        removalPressure: "removalPressure";
        distrust: "distrust";
        instability: "instability";
        conditionSeverity: "conditionSeverity";
        warIntensity: "warIntensity";
        flagAge: "flagAge";
        institutionStrain: "institutionStrain";
    }>;
    factor: z.ZodNumber;
    kind: z.ZodOptional<z.ZodEnum<{
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
        cyberattack: "cyberattack";
        "work-stoppage": "work-stoppage";
        "bank-failure": "bank-failure";
        "mass-casualty-attack": "mass-casualty-attack";
        "wrongful-detention": "wrongful-detention";
    }>>;
}, z.core.$strip>;
export type WeightBoost = z.infer<typeof WeightBoost>;
/**
 * The shortest a prose field may be and still be prose. `min(1)` accepted a
 * single character, which meant a generator that emitted `"text": "."` produced
 * a document the schema called valid and the audit then measured for register,
 * neutrality and overlap — every one of which passes trivially on nothing.
 *
 * These are refusal floors, not authoring targets: each sits under the shortest
 * line in the shipped packs, so what they catch is a stub rather than a writer's
 * deliberate brevity. The target a writer aims for is a warning
 * (`LENGTH_TARGETS`), and the point a field stops fitting its surface is the
 * ceiling (`LENGTH_CEILINGS`) — both in scenario-audit.ts. Exported so the
 * generation brief quotes the numbers the schema actually enforces.
 */
export declare const LENGTH_FLOORS: {
    readonly subject: 12;
    readonly beat: 60;
    readonly reply: 40;
    readonly remembered: 50;
    readonly press: 40;
    readonly locus: 20;
    readonly transmission: 60;
};
/** Shared with every other content document type, so one register has one floor helper. */
export declare const prose: (floor: number) => z.ZodString;
/**
 * What the room already knows, that a briefing would not stop to say.
 *
 * The opening beats are what is *spoken*; this is what is on the table. It
 * exists because the corpus measured thin for a reason that was structural
 * rather than literary: a scenario was obliged to state a dilemma and never
 * obliged to brief it, so a player had no way to answer the questions the
 * person in that chair would ask first — has this happened before, who is
 * pushing it, what does it cost me to do nothing, and what do we not know.
 *
 * Optional, on the same path `dilemmaShape` and `impact` took. It arrives
 * optional because 303 shipped scenarios do not carry one, and it becomes
 * required once they do — leaving it optional past that point is how a surface
 * becomes one nothing has to fill in and so nothing does.
 */
export declare const ScenarioContext: z.ZodObject<{
    standing: z.ZodString;
    precedent: z.ZodString;
    pressures: z.ZodArray<z.ZodObject<{
        source: z.ZodEnum<{
            military: "military";
            cabinet: "cabinet";
            legislature: "legislature";
            street: "street";
            press: "press";
            business: "business";
            ally: "ally";
            adversary: "adversary";
            court: "court";
        }>;
        want: z.ZodString;
    }, z.core.$strip>>;
    inaction: z.ZodString;
    unknown: z.ZodString;
}, z.core.$strict>;
export type ScenarioContext = z.infer<typeof ScenarioContext>;
/**
 * What a scenario that reads no board state says about itself.
 *
 * A scenario filed in a state-dependent class (economy, war, disaster, public
 * health, unrest) normally gates on that state. One that cannot has to say
 * why, in the open: either it is the kind of week that deals on any board, or
 * it is the incident that creates the state it describes. Silence is not a
 * declaration, and the audit refuses it.
 */
export declare const ScenarioPremise: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"universal">;
    reason: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"introduces">;
    what: z.ZodString;
}, z.core.$strict>], "kind">;
export type ScenarioPremise = z.infer<typeof ScenarioPremise>;
export declare const ScenarioBeat: z.ZodObject<{
    speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"cabinet">;
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
        }>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"player">;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"narrator">;
    }, z.core.$strip>], "kind">>;
    text: z.ZodString;
}, z.core.$strip>;
export type ScenarioBeat = z.infer<typeof ScenarioBeat>;
export declare const ScenarioLocus: z.ZodObject<{
    site: z.ZodEnum<{
        capital: "capital";
        city: "city";
        coast: "coast";
        border: "border";
        interior: "interior";
        chokepoint: "chokepoint";
    }>;
    ground: z.ZodEnum<{
        counterpart: "counterpart";
        home: "home";
    }>;
    descriptor: z.ZodString;
    city: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "CityId", "out">>;
    settlement: z.ZodOptional<z.ZodEnum<{
        small: "small";
        "commercial-port": "commercial-port";
        "road-border": "road-border";
    }>>;
    settlementId: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "SettlementId", "out">>;
    state: z.ZodOptional<z.ZodEnum<{
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
    }>>;
    sector: z.ZodOptional<z.ZodEnum<{
        auto: "auto";
        aerospace: "aerospace";
        semiconductors: "semiconductors";
        "steel-heavy": "steel-heavy";
        "defense-industrial": "defense-industrial";
        "ports-shipping": "ports-shipping";
        "telecom-cyber": "telecom-cyber";
        finance: "finance";
        "housing-construction": "housing-construction";
        "public-infrastructure": "public-infrastructure";
        "energy-oil": "energy-oil";
        "energy-gas": "energy-gas";
        "energy-nuclear": "energy-nuclear";
        "energy-renewables": "energy-renewables";
        agriculture: "agriculture";
        textiles: "textiles";
        mining: "mining";
        chemicals: "chemicals";
        "food-processing": "food-processing";
        "tourism-hospitality": "tourism-hospitality";
        healthcare: "healthcare";
        pharma: "pharma";
        utilities: "utilities";
    }>>;
    bind: z.ZodOptional<z.ZodLiteral<"condition">>;
    frontier: z.ZodOptional<z.ZodLiteral<"home">>;
}, z.core.$strip>;
export type ScenarioLocus = z.infer<typeof ScenarioLocus>;
export declare const ScenarioParticular: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>;
export type ScenarioParticular = z.infer<typeof ScenarioParticular>;
export declare const ScenarioTransmission: z.ZodObject<{
    domesticSubject: z.ZodOptional<z.ZodString>;
    relay: z.ZodEnum<{
        [x: string]: string;
    }>;
    attribution: z.ZodString;
    text: z.ZodString;
    voice: z.ZodOptional<z.ZodEnum<{
        state: "state";
        nonstate: "nonstate";
    }>>;
}, z.core.$strip>;
export type ScenarioTransmission = z.infer<typeof ScenarioTransmission>;
export { POSITION_RELATIONSHIP_LIMIT };
/**
 * What comes back after the player commits, before the week closes.
 *
 * The one beat a position reply has never had. An instrument reply goes through
 * the resolver and earns an aftermath: a branch, odds that held or did not, a
 * drawn consequence card. A position resolves into arithmetic and a narrator
 * restating the sentence the player picked — measured across the shipped corpus
 * that is 749 of 827 replies, so nine answers in ten produce no event at all.
 * The player chooses, a number moves, and the week ends.
 *
 * A generic aftermath pool cannot fill this. `eligibleConsequences` keys on
 * instrument, rung band and valence, and a position has no instrument, no rung
 * and no uncertain outcome to narrate — a card general enough to fit every
 * position would be vague by construction, which is worse than silence. So this
 * is authored, per reply, and specific to the answer it follows.
 *
 * The rule that makes it worth writing: a rejoinder is NOT a summary. The
 * `remembered` line already says what was decided. This is the first cost
 * arriving, or the thing the room did not know when it advised — the chair who
 * agreed naming what it will take, the fact that only surfaces once the
 * decision is made. A rejoinder that restates the choice is a beat the player
 * learns to skip, and the audit measures it.
 *
 * Prose only, and no effects. What the answer costs is priced on the commitment
 * and measured by the stakes rules; letting a rejoinder move the board on top of
 * that would put a second, unaudited price on every position. This narrates the
 * commitment; it does not add to it.
 */
export declare const ScenarioRejoinder: z.ZodObject<{
    speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"cabinet">;
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
        }>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"narrator">;
    }, z.core.$strip>], "kind">>;
    text: z.ZodString;
}, z.core.$strip>;
export type ScenarioRejoinder = z.infer<typeof ScenarioRejoinder>;
export declare const ScenarioReply: z.ZodObject<{
    id: z.ZodString;
    tone: z.ZodEnum<{
        conciliatory: "conciliatory";
        firm: "firm";
        principled: "principled";
        evasive: "evasive";
        coercive: "coercive";
    }>;
    text: z.ZodString;
    sets: z.ZodOptional<z.ZodArray<z.ZodString>>;
    press: z.ZodOptional<z.ZodString>;
    resolves: z.ZodOptional<z.ZodEnum<{
        held: "held";
        lost: "lost";
    }>>;
    commitment: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"position">;
        importSuspensionDays: z.ZodOptional<z.ZodNumber>;
        cost: z.ZodPreprocess<z.ZodObject<{
            treasury: z.ZodOptional<z.ZodNumber>;
            stability: z.ZodOptional<z.ZodNumber>;
            militaryReadiness: z.ZodOptional<z.ZodNumber>;
            standing: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        pull: z.ZodOptional<z.ZodObject<{
            economicLeftRight: z.ZodOptional<z.ZodNumber>;
            authLibertarian: z.ZodOptional<z.ZodNumber>;
            nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        remembered: z.ZodString;
        rejoinder: z.ZodObject<{
            speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"cabinet">;
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
                }>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"narrator">;
            }, z.core.$strip>], "kind">>;
            text: z.ZodString;
        }, z.core.$strip>;
        impact: z.ZodOptional<z.ZodObject<{
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
        }, z.core.$strict>>;
        relationship: z.ZodOptional<z.ZodObject<{
            trust: z.ZodOptional<z.ZodNumber>;
            tension: z.ZodOptional<z.ZodNumber>;
            militaryThreat: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        conflictMove: z.ZodOptional<z.ZodEnum<{
            offerTerms: "offerTerms";
            acceptTerms: "acceptTerms";
            deescalate: "deescalate";
        }>>;
        collection: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"close">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"task">;
            element: z.ZodEnum<{
                "IC-ODNI": "IC-ODNI";
                "IC-CIA": "IC-CIA";
                "IC-NSA": "IC-NSA";
                "IC-DIA": "IC-DIA";
                "IC-NGA": "IC-NGA";
                "IC-NRO": "IC-NRO";
                "IC-AF": "IC-AF";
                "IC-SPACE": "IC-SPACE";
                "IC-ARMY": "IC-ARMY";
                "IC-USMC": "IC-USMC";
                "IC-NAVY": "IC-NAVY";
                "IC-FBI": "IC-FBI";
                "IC-DEA": "IC-DEA";
                "IC-DHS": "IC-DHS";
                "IC-USCG": "IC-USCG";
                "IC-INR": "IC-INR";
                "IC-TREASURY": "IC-TREASURY";
                "IC-DOE": "IC-DOE";
            }>;
            discipline: z.ZodEnum<{
                humint: "humint";
                sigint: "sigint";
                geoint: "geoint";
                masint: "masint";
                osint: "osint";
                finint: "finint";
                "all-source": "all-source";
            }>;
            question: z.ZodString;
        }, z.core.$strip>], "action">>;
        relief: z.ZodOptional<z.ZodLiteral<true>>;
        localeAct: z.ZodOptional<z.ZodEnum<{
            relief: "relief";
            review: "review";
            "property-surge": "property-surge";
            "task-force": "task-force";
            priority: "priority";
        }>>;
        tariff: z.ZodOptional<z.ZodObject<{
            sector: z.ZodString;
            rate: z.ZodNumber;
        }, z.core.$strip>>;
        tariffLift: z.ZodOptional<z.ZodObject<{
            theirs: z.ZodBoolean;
            which: z.ZodOptional<z.ZodEnum<{
                answered: "answered";
                response: "response";
            }>>;
        }, z.core.$strip>>;
        directive: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"investigation">;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"enforcement-posture">;
            subject: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"inspector-removal-notice">;
            reason: z.ZodString;
        }, z.core.$strip>], "kind">>;
        transmit: z.ZodOptional<z.ZodString>;
        billText: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"propose">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"recommend">;
            text: z.ZodEnum<{
                house: "house";
                senate: "senate";
                base: "base";
                targeted: "targeted";
            }>;
        }, z.core.$strip>], "action">>;
        judicialNomination: z.ZodOptional<z.ZodObject<{
            action: z.ZodLiteral<"submit">;
            candidate: z.ZodEnum<{
                first: "first";
                alternate: "alternate";
            }>;
        }, z.core.$strip>>;
        orderRescission: z.ZodOptional<z.ZodObject<{
            action: z.ZodLiteral<"rescind">;
        }, z.core.$strip>>;
        orderReview: z.ZodOptional<z.ZodObject<{
            choice: z.ZodEnum<{
                accept: "accept";
                seek: "seek";
                "seek-with-stay": "seek-with-stay";
            }>;
        }, z.core.$strip>>;
        gazetteer: z.ZodOptional<z.ZodObject<{
            cityEmployment: z.ZodOptional<z.ZodNumber>;
            taxBase: z.ZodOptional<z.ZodNumber>;
            adminLean: z.ZodOptional<z.ZodNumber>;
            taxHolidayYears: z.ZodOptional<z.ZodNumber>;
            stateLean: z.ZodOptional<z.ZodNumber>;
            sectorEmployment: z.ZodOptional<z.ZodNumber>;
            sectorLaborPressure: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        domestic: z.ZodOptional<z.ZodObject<{
            axes: z.ZodOptional<z.ZodObject<{
                industrial: z.ZodOptional<z.ZodNumber>;
                agricultural: z.ZodOptional<z.ZodNumber>;
                energy: z.ZodOptional<z.ZodNumber>;
                tech: z.ZodOptional<z.ZodNumber>;
                services: z.ZodOptional<z.ZodNumber>;
                defense: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            sectors: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                auto: "auto";
                aerospace: "aerospace";
                semiconductors: "semiconductors";
                "steel-heavy": "steel-heavy";
                "defense-industrial": "defense-industrial";
                "ports-shipping": "ports-shipping";
                "telecom-cyber": "telecom-cyber";
                finance: "finance";
                "housing-construction": "housing-construction";
                "public-infrastructure": "public-infrastructure";
                "energy-oil": "energy-oil";
                "energy-gas": "energy-gas";
                "energy-nuclear": "energy-nuclear";
                "energy-renewables": "energy-renewables";
                agriculture: "agriculture";
                textiles: "textiles";
                mining: "mining";
                chemicals: "chemicals";
                "food-processing": "food-processing";
                "tourism-hospitality": "tourism-hospitality";
                healthcare: "healthcare";
                pharma: "pharma";
                utilities: "utilities";
            }>>>;
            urban: z.ZodOptional<z.ZodNumber>;
            federal: z.ZodOptional<z.ZodNumber>;
            values: z.ZodOptional<z.ZodObject<{
                economicLeftRight: z.ZodOptional<z.ZodNumber>;
                authLibertarian: z.ZodOptional<z.ZodNumber>;
                nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            channels: z.ZodOptional<z.ZodObject<{
                civilRights: z.ZodOptional<z.ZodNumber>;
                immigration: z.ZodOptional<z.ZodNumber>;
                healthAccess: z.ZodOptional<z.ZodNumber>;
                disabilityPrograms: z.ZodOptional<z.ZodNumber>;
                veterans: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            magnitude: z.ZodEnum<{
                moderate: "moderate";
                light: "light";
                heavy: "heavy";
            }>;
            signature: z.ZodString;
            reason: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"instrument">;
        instrument: z.ZodEnum<{
            diplomatic: "diplomatic";
            economic: "economic";
            covert: "covert";
            military: "military";
            assistance: "assistance";
        }>;
        rung: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>;
        domestic: z.ZodOptional<z.ZodObject<{
            axes: z.ZodOptional<z.ZodObject<{
                industrial: z.ZodOptional<z.ZodNumber>;
                agricultural: z.ZodOptional<z.ZodNumber>;
                energy: z.ZodOptional<z.ZodNumber>;
                tech: z.ZodOptional<z.ZodNumber>;
                services: z.ZodOptional<z.ZodNumber>;
                defense: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            sectors: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                auto: "auto";
                aerospace: "aerospace";
                semiconductors: "semiconductors";
                "steel-heavy": "steel-heavy";
                "defense-industrial": "defense-industrial";
                "ports-shipping": "ports-shipping";
                "telecom-cyber": "telecom-cyber";
                finance: "finance";
                "housing-construction": "housing-construction";
                "public-infrastructure": "public-infrastructure";
                "energy-oil": "energy-oil";
                "energy-gas": "energy-gas";
                "energy-nuclear": "energy-nuclear";
                "energy-renewables": "energy-renewables";
                agriculture: "agriculture";
                textiles: "textiles";
                mining: "mining";
                chemicals: "chemicals";
                "food-processing": "food-processing";
                "tourism-hospitality": "tourism-hospitality";
                healthcare: "healthcare";
                pharma: "pharma";
                utilities: "utilities";
            }>>>;
            urban: z.ZodOptional<z.ZodNumber>;
            federal: z.ZodOptional<z.ZodNumber>;
            values: z.ZodOptional<z.ZodObject<{
                economicLeftRight: z.ZodOptional<z.ZodNumber>;
                authLibertarian: z.ZodOptional<z.ZodNumber>;
                nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            channels: z.ZodOptional<z.ZodObject<{
                civilRights: z.ZodOptional<z.ZodNumber>;
                immigration: z.ZodOptional<z.ZodNumber>;
                healthAccess: z.ZodOptional<z.ZodNumber>;
                disabilityPrograms: z.ZodOptional<z.ZodNumber>;
                veterans: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            magnitude: z.ZodEnum<{
                moderate: "moderate";
                light: "light";
                heavy: "heavy";
            }>;
            signature: z.ZodString;
            reason: z.ZodString;
        }, z.core.$strict>>;
        rejoinder: z.ZodOptional<z.ZodObject<{
            speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"cabinet">;
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
                }>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"narrator">;
            }, z.core.$strip>], "kind">>;
            text: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"join">;
        side: z.ZodEnum<{
            against: "against";
            beside: "beside";
        }>;
        rejoinder: z.ZodOptional<z.ZodObject<{
            speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"cabinet">;
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
                }>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"narrator">;
            }, z.core.$strip>], "kind">>;
            text: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>], "kind">;
}, z.core.$strip>;
export type ScenarioReply = z.infer<typeof ScenarioReply>;
export declare const ScenarioDef: z.ZodObject<{
    id: z.ZodString;
    class: z.ZodEnum<{
        tragedy: "tragedy";
        terror: "terror";
        unrest: "unrest";
        disaster: "disaster";
        "public-health": "public-health";
        migration: "migration";
        "foreign-crisis": "foreign-crisis";
        war: "war";
        espionage: "espionage";
        hostage: "hostage";
        technology: "technology";
        economy: "economy";
        scandal: "scandal";
        justice: "justice";
        institution: "institution";
        culture: "culture";
        death: "death";
        triumph: "triumph";
    }>;
    severity: z.ZodEnum<{
        routine: "routine";
        serious: "serious";
        critical: "critical";
    }>;
    dilemmaShape: z.ZodEnum<{
        "credulity-bet": "credulity-bet";
        containment: "containment";
        retaliation: "retaliation";
        allocation: "allocation";
        disclosure: "disclosure";
        "loyalty-test": "loyalty-test";
        exposure: "exposure";
        "foot-in-the-door": "foot-in-the-door";
    }>;
    topics: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        disaster: "disaster";
        war: "war";
        scandal: "scandal";
        culture: "culture";
        fiscal: "fiscal";
        trade: "trade";
        security: "security";
        labor: "labor";
        health: "health";
        energy: "energy";
        intelligence: "intelligence";
        judiciary: "judiciary";
        immigration: "immigration";
        tech: "tech";
        diplomacy: "diplomacy";
        environment: "environment";
        "civil-rights": "civil-rights";
        "public-safety": "public-safety";
    }>>>;
    entities: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        [x: string]: string;
    }>>>;
    subjects: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        key: z.ZodString;
        source: z.ZodLiteral<"entity">;
        entity: z.ZodEnum<{
            [x: string]: string;
        }>;
    }, z.core.$strict>, z.ZodObject<{
        key: z.ZodString;
        source: z.ZodLiteral<"governor">;
    }, z.core.$strict>, z.ZodObject<{
        key: z.ZodString;
        source: z.ZodLiteral<"mayor">;
    }, z.core.$strict>, z.ZodObject<{
        key: z.ZodString;
        source: z.ZodLiteral<"member">;
        chamber: z.ZodEnum<{
            house: "house";
            senate: "senate";
        }>;
        scope: z.ZodEnum<{
            state: "state";
            nation: "nation";
        }>;
    }, z.core.$strict>, z.ZodObject<{
        key: z.ZodString;
        source: z.ZodLiteral<"institution">;
        institution: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        key: z.ZodString;
        source: z.ZodLiteral<"inherit">;
        scenario: z.ZodString;
        slot: z.ZodString;
    }, z.core.$strict>], "source">>>;
    eraAssumption: z.ZodOptional<z.ZodEnum<{
        evergreen: "evergreen";
        dated: "dated";
    }>>;
    staleAfter: z.ZodOptional<z.ZodString>;
    motifs: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "uncorroborated-source": "uncorroborated-source";
        "agency-non-confirmation": "agency-non-confirmation";
        "broken-chain-of-custody": "broken-chain-of-custody";
        "border-crossing": "border-crossing";
        "quiet-transfer": "quiet-transfer";
        "divided-public-perception": "divided-public-perception";
        "closing-claim-of-ownership": "closing-claim-of-ownership";
    }>>>;
    intelConfidence: z.ZodOptional<z.ZodEnum<{
        "single-sourced": "single-sourced";
        disputed: "disputed";
        confirmed: "confirmed";
    }>>;
    subject: z.ZodString;
    cast: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            cyberattack: "cyberattack";
            "work-stoppage": "work-stoppage";
            "bank-failure": "bank-failure";
            "mass-casualty-attack": "mass-casualty-attack";
            "wrongful-detention": "wrongful-detention";
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
            cyberattack: "cyberattack";
            "work-stoppage": "work-stoppage";
            "bank-failure": "bank-failure";
            "mass-casualty-attack": "mass-casualty-attack";
            "wrongful-detention": "wrongful-detention";
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
    }, z.core.$strip>], "kind">>;
    weight: z.ZodNumber;
    boosts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        source: z.ZodEnum<{
            tension: "tension";
            removalPressure: "removalPressure";
            distrust: "distrust";
            instability: "instability";
            conditionSeverity: "conditionSeverity";
            warIntensity: "warIntensity";
            flagAge: "flagAge";
            institutionStrain: "institutionStrain";
        }>;
        factor: z.ZodNumber;
        kind: z.ZodOptional<z.ZodEnum<{
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
            cyberattack: "cyberattack";
            "work-stoppage": "work-stoppage";
            "bank-failure": "bank-failure";
            "mass-casualty-attack": "mass-casualty-attack";
            "wrongful-detention": "wrongful-detention";
        }>>;
    }, z.core.$strip>>>;
    once: z.ZodOptional<z.ZodBoolean>;
    retired: z.ZodOptional<z.ZodBoolean>;
    family: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        role: z.ZodEnum<{
            opener: "opener";
            beat: "beat";
            close: "close";
        }>;
    }, z.core.$strip>>;
    setPiece: z.ZodOptional<z.ZodObject<{
        reason: z.ZodString;
        owner: z.ZodString;
    }, z.core.$strip>>;
    locus: z.ZodObject<{
        site: z.ZodEnum<{
            capital: "capital";
            city: "city";
            coast: "coast";
            border: "border";
            interior: "interior";
            chokepoint: "chokepoint";
        }>;
        ground: z.ZodEnum<{
            counterpart: "counterpart";
            home: "home";
        }>;
        descriptor: z.ZodString;
        city: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "CityId", "out">>;
        settlement: z.ZodOptional<z.ZodEnum<{
            small: "small";
            "commercial-port": "commercial-port";
            "road-border": "road-border";
        }>>;
        settlementId: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "SettlementId", "out">>;
        state: z.ZodOptional<z.ZodEnum<{
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
        }>>;
        sector: z.ZodOptional<z.ZodEnum<{
            auto: "auto";
            aerospace: "aerospace";
            semiconductors: "semiconductors";
            "steel-heavy": "steel-heavy";
            "defense-industrial": "defense-industrial";
            "ports-shipping": "ports-shipping";
            "telecom-cyber": "telecom-cyber";
            finance: "finance";
            "housing-construction": "housing-construction";
            "public-infrastructure": "public-infrastructure";
            "energy-oil": "energy-oil";
            "energy-gas": "energy-gas";
            "energy-nuclear": "energy-nuclear";
            "energy-renewables": "energy-renewables";
            agriculture: "agriculture";
            textiles: "textiles";
            mining: "mining";
            chemicals: "chemicals";
            "food-processing": "food-processing";
            "tourism-hospitality": "tourism-hospitality";
            healthcare: "healthcare";
            pharma: "pharma";
            utilities: "utilities";
        }>>;
        bind: z.ZodOptional<z.ZodLiteral<"condition">>;
        frontier: z.ZodOptional<z.ZodLiteral<"home">>;
    }, z.core.$strip>;
    context: z.ZodOptional<z.ZodObject<{
        standing: z.ZodString;
        precedent: z.ZodString;
        pressures: z.ZodArray<z.ZodObject<{
            source: z.ZodEnum<{
                military: "military";
                cabinet: "cabinet";
                legislature: "legislature";
                street: "street";
                press: "press";
                business: "business";
                ally: "ally";
                adversary: "adversary";
                court: "court";
            }>;
            want: z.ZodString;
        }, z.core.$strip>>;
        inaction: z.ZodString;
        unknown: z.ZodString;
    }, z.core.$strict>>;
    premise: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"universal">;
        reason: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"introduces">;
        what: z.ZodString;
    }, z.core.$strict>], "kind">>;
    responsibleOffice: z.ZodOptional<z.ZodEnum<{
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
    }>>;
    particulars: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>>;
    scene: z.ZodOptional<z.ZodObject<{
        register: z.ZodEnum<{
            intact: "intact";
            strained: "strained";
            damaged: "damaged";
            ceremonial: "ceremonial";
        }>;
    }, z.core.$strip>>;
    opening: z.ZodArray<z.ZodObject<{
        speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"cabinet">;
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
            }>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"player">;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"narrator">;
        }, z.core.$strip>], "kind">>;
        text: z.ZodString;
    }, z.core.$strip>>;
    transmission: z.ZodOptional<z.ZodObject<{
        domesticSubject: z.ZodOptional<z.ZodString>;
        relay: z.ZodEnum<{
            [x: string]: string;
        }>;
        attribution: z.ZodString;
        text: z.ZodString;
        voice: z.ZodOptional<z.ZodEnum<{
            state: "state";
            nonstate: "nonstate";
        }>>;
    }, z.core.$strip>>;
    replies: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tone: z.ZodEnum<{
            conciliatory: "conciliatory";
            firm: "firm";
            principled: "principled";
            evasive: "evasive";
            coercive: "coercive";
        }>;
        text: z.ZodString;
        sets: z.ZodOptional<z.ZodArray<z.ZodString>>;
        press: z.ZodOptional<z.ZodString>;
        resolves: z.ZodOptional<z.ZodEnum<{
            held: "held";
            lost: "lost";
        }>>;
        commitment: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"position">;
            importSuspensionDays: z.ZodOptional<z.ZodNumber>;
            cost: z.ZodPreprocess<z.ZodObject<{
                treasury: z.ZodOptional<z.ZodNumber>;
                stability: z.ZodOptional<z.ZodNumber>;
                militaryReadiness: z.ZodOptional<z.ZodNumber>;
                standing: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            pull: z.ZodOptional<z.ZodObject<{
                economicLeftRight: z.ZodOptional<z.ZodNumber>;
                authLibertarian: z.ZodOptional<z.ZodNumber>;
                nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            remembered: z.ZodString;
            rejoinder: z.ZodObject<{
                speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"cabinet">;
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
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"narrator">;
                }, z.core.$strip>], "kind">>;
                text: z.ZodString;
            }, z.core.$strip>;
            impact: z.ZodOptional<z.ZodObject<{
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
            }, z.core.$strict>>;
            relationship: z.ZodOptional<z.ZodObject<{
                trust: z.ZodOptional<z.ZodNumber>;
                tension: z.ZodOptional<z.ZodNumber>;
                militaryThreat: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            conflictMove: z.ZodOptional<z.ZodEnum<{
                offerTerms: "offerTerms";
                acceptTerms: "acceptTerms";
                deescalate: "deescalate";
            }>>;
            collection: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                action: z.ZodLiteral<"close">;
            }, z.core.$strip>, z.ZodObject<{
                action: z.ZodLiteral<"task">;
                element: z.ZodEnum<{
                    "IC-ODNI": "IC-ODNI";
                    "IC-CIA": "IC-CIA";
                    "IC-NSA": "IC-NSA";
                    "IC-DIA": "IC-DIA";
                    "IC-NGA": "IC-NGA";
                    "IC-NRO": "IC-NRO";
                    "IC-AF": "IC-AF";
                    "IC-SPACE": "IC-SPACE";
                    "IC-ARMY": "IC-ARMY";
                    "IC-USMC": "IC-USMC";
                    "IC-NAVY": "IC-NAVY";
                    "IC-FBI": "IC-FBI";
                    "IC-DEA": "IC-DEA";
                    "IC-DHS": "IC-DHS";
                    "IC-USCG": "IC-USCG";
                    "IC-INR": "IC-INR";
                    "IC-TREASURY": "IC-TREASURY";
                    "IC-DOE": "IC-DOE";
                }>;
                discipline: z.ZodEnum<{
                    humint: "humint";
                    sigint: "sigint";
                    geoint: "geoint";
                    masint: "masint";
                    osint: "osint";
                    finint: "finint";
                    "all-source": "all-source";
                }>;
                question: z.ZodString;
            }, z.core.$strip>], "action">>;
            relief: z.ZodOptional<z.ZodLiteral<true>>;
            localeAct: z.ZodOptional<z.ZodEnum<{
                relief: "relief";
                review: "review";
                "property-surge": "property-surge";
                "task-force": "task-force";
                priority: "priority";
            }>>;
            tariff: z.ZodOptional<z.ZodObject<{
                sector: z.ZodString;
                rate: z.ZodNumber;
            }, z.core.$strip>>;
            tariffLift: z.ZodOptional<z.ZodObject<{
                theirs: z.ZodBoolean;
                which: z.ZodOptional<z.ZodEnum<{
                    answered: "answered";
                    response: "response";
                }>>;
            }, z.core.$strip>>;
            directive: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"investigation">;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"enforcement-posture">;
                subject: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"inspector-removal-notice">;
                reason: z.ZodString;
            }, z.core.$strip>], "kind">>;
            transmit: z.ZodOptional<z.ZodString>;
            billText: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                action: z.ZodLiteral<"propose">;
            }, z.core.$strip>, z.ZodObject<{
                action: z.ZodLiteral<"recommend">;
                text: z.ZodEnum<{
                    house: "house";
                    senate: "senate";
                    base: "base";
                    targeted: "targeted";
                }>;
            }, z.core.$strip>], "action">>;
            judicialNomination: z.ZodOptional<z.ZodObject<{
                action: z.ZodLiteral<"submit">;
                candidate: z.ZodEnum<{
                    first: "first";
                    alternate: "alternate";
                }>;
            }, z.core.$strip>>;
            orderRescission: z.ZodOptional<z.ZodObject<{
                action: z.ZodLiteral<"rescind">;
            }, z.core.$strip>>;
            orderReview: z.ZodOptional<z.ZodObject<{
                choice: z.ZodEnum<{
                    accept: "accept";
                    seek: "seek";
                    "seek-with-stay": "seek-with-stay";
                }>;
            }, z.core.$strip>>;
            gazetteer: z.ZodOptional<z.ZodObject<{
                cityEmployment: z.ZodOptional<z.ZodNumber>;
                taxBase: z.ZodOptional<z.ZodNumber>;
                adminLean: z.ZodOptional<z.ZodNumber>;
                taxHolidayYears: z.ZodOptional<z.ZodNumber>;
                stateLean: z.ZodOptional<z.ZodNumber>;
                sectorEmployment: z.ZodOptional<z.ZodNumber>;
                sectorLaborPressure: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            domestic: z.ZodOptional<z.ZodObject<{
                axes: z.ZodOptional<z.ZodObject<{
                    industrial: z.ZodOptional<z.ZodNumber>;
                    agricultural: z.ZodOptional<z.ZodNumber>;
                    energy: z.ZodOptional<z.ZodNumber>;
                    tech: z.ZodOptional<z.ZodNumber>;
                    services: z.ZodOptional<z.ZodNumber>;
                    defense: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                sectors: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    auto: "auto";
                    aerospace: "aerospace";
                    semiconductors: "semiconductors";
                    "steel-heavy": "steel-heavy";
                    "defense-industrial": "defense-industrial";
                    "ports-shipping": "ports-shipping";
                    "telecom-cyber": "telecom-cyber";
                    finance: "finance";
                    "housing-construction": "housing-construction";
                    "public-infrastructure": "public-infrastructure";
                    "energy-oil": "energy-oil";
                    "energy-gas": "energy-gas";
                    "energy-nuclear": "energy-nuclear";
                    "energy-renewables": "energy-renewables";
                    agriculture: "agriculture";
                    textiles: "textiles";
                    mining: "mining";
                    chemicals: "chemicals";
                    "food-processing": "food-processing";
                    "tourism-hospitality": "tourism-hospitality";
                    healthcare: "healthcare";
                    pharma: "pharma";
                    utilities: "utilities";
                }>>>;
                urban: z.ZodOptional<z.ZodNumber>;
                federal: z.ZodOptional<z.ZodNumber>;
                values: z.ZodOptional<z.ZodObject<{
                    economicLeftRight: z.ZodOptional<z.ZodNumber>;
                    authLibertarian: z.ZodOptional<z.ZodNumber>;
                    nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                channels: z.ZodOptional<z.ZodObject<{
                    civilRights: z.ZodOptional<z.ZodNumber>;
                    immigration: z.ZodOptional<z.ZodNumber>;
                    healthAccess: z.ZodOptional<z.ZodNumber>;
                    disabilityPrograms: z.ZodOptional<z.ZodNumber>;
                    veterans: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                magnitude: z.ZodEnum<{
                    moderate: "moderate";
                    light: "light";
                    heavy: "heavy";
                }>;
                signature: z.ZodString;
                reason: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"instrument">;
            instrument: z.ZodEnum<{
                diplomatic: "diplomatic";
                economic: "economic";
                covert: "covert";
                military: "military";
                assistance: "assistance";
            }>;
            rung: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>;
            domestic: z.ZodOptional<z.ZodObject<{
                axes: z.ZodOptional<z.ZodObject<{
                    industrial: z.ZodOptional<z.ZodNumber>;
                    agricultural: z.ZodOptional<z.ZodNumber>;
                    energy: z.ZodOptional<z.ZodNumber>;
                    tech: z.ZodOptional<z.ZodNumber>;
                    services: z.ZodOptional<z.ZodNumber>;
                    defense: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                sectors: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    auto: "auto";
                    aerospace: "aerospace";
                    semiconductors: "semiconductors";
                    "steel-heavy": "steel-heavy";
                    "defense-industrial": "defense-industrial";
                    "ports-shipping": "ports-shipping";
                    "telecom-cyber": "telecom-cyber";
                    finance: "finance";
                    "housing-construction": "housing-construction";
                    "public-infrastructure": "public-infrastructure";
                    "energy-oil": "energy-oil";
                    "energy-gas": "energy-gas";
                    "energy-nuclear": "energy-nuclear";
                    "energy-renewables": "energy-renewables";
                    agriculture: "agriculture";
                    textiles: "textiles";
                    mining: "mining";
                    chemicals: "chemicals";
                    "food-processing": "food-processing";
                    "tourism-hospitality": "tourism-hospitality";
                    healthcare: "healthcare";
                    pharma: "pharma";
                    utilities: "utilities";
                }>>>;
                urban: z.ZodOptional<z.ZodNumber>;
                federal: z.ZodOptional<z.ZodNumber>;
                values: z.ZodOptional<z.ZodObject<{
                    economicLeftRight: z.ZodOptional<z.ZodNumber>;
                    authLibertarian: z.ZodOptional<z.ZodNumber>;
                    nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                channels: z.ZodOptional<z.ZodObject<{
                    civilRights: z.ZodOptional<z.ZodNumber>;
                    immigration: z.ZodOptional<z.ZodNumber>;
                    healthAccess: z.ZodOptional<z.ZodNumber>;
                    disabilityPrograms: z.ZodOptional<z.ZodNumber>;
                    veterans: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                magnitude: z.ZodEnum<{
                    moderate: "moderate";
                    light: "light";
                    heavy: "heavy";
                }>;
                signature: z.ZodString;
                reason: z.ZodString;
            }, z.core.$strict>>;
            rejoinder: z.ZodOptional<z.ZodObject<{
                speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"cabinet">;
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
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"narrator">;
                }, z.core.$strip>], "kind">>;
                text: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"join">;
            side: z.ZodEnum<{
                against: "against";
                beside: "beside";
            }>;
            rejoinder: z.ZodOptional<z.ZodObject<{
                speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"cabinet">;
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
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"narrator">;
                }, z.core.$strip>], "kind">>;
                text: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>], "kind">;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ScenarioDef = z.infer<typeof ScenarioDef>;
export declare const ScenarioPack: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
    scenarios: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        class: z.ZodEnum<{
            tragedy: "tragedy";
            terror: "terror";
            unrest: "unrest";
            disaster: "disaster";
            "public-health": "public-health";
            migration: "migration";
            "foreign-crisis": "foreign-crisis";
            war: "war";
            espionage: "espionage";
            hostage: "hostage";
            technology: "technology";
            economy: "economy";
            scandal: "scandal";
            justice: "justice";
            institution: "institution";
            culture: "culture";
            death: "death";
            triumph: "triumph";
        }>;
        severity: z.ZodEnum<{
            routine: "routine";
            serious: "serious";
            critical: "critical";
        }>;
        dilemmaShape: z.ZodEnum<{
            "credulity-bet": "credulity-bet";
            containment: "containment";
            retaliation: "retaliation";
            allocation: "allocation";
            disclosure: "disclosure";
            "loyalty-test": "loyalty-test";
            exposure: "exposure";
            "foot-in-the-door": "foot-in-the-door";
        }>;
        topics: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            disaster: "disaster";
            war: "war";
            scandal: "scandal";
            culture: "culture";
            fiscal: "fiscal";
            trade: "trade";
            security: "security";
            labor: "labor";
            health: "health";
            energy: "energy";
            intelligence: "intelligence";
            judiciary: "judiciary";
            immigration: "immigration";
            tech: "tech";
            diplomacy: "diplomacy";
            environment: "environment";
            "civil-rights": "civil-rights";
            "public-safety": "public-safety";
        }>>>;
        entities: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            [x: string]: string;
        }>>>;
        subjects: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            key: z.ZodString;
            source: z.ZodLiteral<"entity">;
            entity: z.ZodEnum<{
                [x: string]: string;
            }>;
        }, z.core.$strict>, z.ZodObject<{
            key: z.ZodString;
            source: z.ZodLiteral<"governor">;
        }, z.core.$strict>, z.ZodObject<{
            key: z.ZodString;
            source: z.ZodLiteral<"mayor">;
        }, z.core.$strict>, z.ZodObject<{
            key: z.ZodString;
            source: z.ZodLiteral<"member">;
            chamber: z.ZodEnum<{
                house: "house";
                senate: "senate";
            }>;
            scope: z.ZodEnum<{
                state: "state";
                nation: "nation";
            }>;
        }, z.core.$strict>, z.ZodObject<{
            key: z.ZodString;
            source: z.ZodLiteral<"institution">;
            institution: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            key: z.ZodString;
            source: z.ZodLiteral<"inherit">;
            scenario: z.ZodString;
            slot: z.ZodString;
        }, z.core.$strict>], "source">>>;
        eraAssumption: z.ZodOptional<z.ZodEnum<{
            evergreen: "evergreen";
            dated: "dated";
        }>>;
        staleAfter: z.ZodOptional<z.ZodString>;
        motifs: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "uncorroborated-source": "uncorroborated-source";
            "agency-non-confirmation": "agency-non-confirmation";
            "broken-chain-of-custody": "broken-chain-of-custody";
            "border-crossing": "border-crossing";
            "quiet-transfer": "quiet-transfer";
            "divided-public-perception": "divided-public-perception";
            "closing-claim-of-ownership": "closing-claim-of-ownership";
        }>>>;
        intelConfidence: z.ZodOptional<z.ZodEnum<{
            "single-sourced": "single-sourced";
            disputed: "disputed";
            confirmed: "confirmed";
        }>>;
        subject: z.ZodString;
        cast: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
                cyberattack: "cyberattack";
                "work-stoppage": "work-stoppage";
                "bank-failure": "bank-failure";
                "mass-casualty-attack": "mass-casualty-attack";
                "wrongful-detention": "wrongful-detention";
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
                cyberattack: "cyberattack";
                "work-stoppage": "work-stoppage";
                "bank-failure": "bank-failure";
                "mass-casualty-attack": "mass-casualty-attack";
                "wrongful-detention": "wrongful-detention";
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
        }, z.core.$strip>], "kind">>;
        weight: z.ZodNumber;
        boosts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            source: z.ZodEnum<{
                tension: "tension";
                removalPressure: "removalPressure";
                distrust: "distrust";
                instability: "instability";
                conditionSeverity: "conditionSeverity";
                warIntensity: "warIntensity";
                flagAge: "flagAge";
                institutionStrain: "institutionStrain";
            }>;
            factor: z.ZodNumber;
            kind: z.ZodOptional<z.ZodEnum<{
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
                cyberattack: "cyberattack";
                "work-stoppage": "work-stoppage";
                "bank-failure": "bank-failure";
                "mass-casualty-attack": "mass-casualty-attack";
                "wrongful-detention": "wrongful-detention";
            }>>;
        }, z.core.$strip>>>;
        once: z.ZodOptional<z.ZodBoolean>;
        retired: z.ZodOptional<z.ZodBoolean>;
        family: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            role: z.ZodEnum<{
                opener: "opener";
                beat: "beat";
                close: "close";
            }>;
        }, z.core.$strip>>;
        setPiece: z.ZodOptional<z.ZodObject<{
            reason: z.ZodString;
            owner: z.ZodString;
        }, z.core.$strip>>;
        locus: z.ZodObject<{
            site: z.ZodEnum<{
                capital: "capital";
                city: "city";
                coast: "coast";
                border: "border";
                interior: "interior";
                chokepoint: "chokepoint";
            }>;
            ground: z.ZodEnum<{
                counterpart: "counterpart";
                home: "home";
            }>;
            descriptor: z.ZodString;
            city: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "CityId", "out">>;
            settlement: z.ZodOptional<z.ZodEnum<{
                small: "small";
                "commercial-port": "commercial-port";
                "road-border": "road-border";
            }>>;
            settlementId: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "SettlementId", "out">>;
            state: z.ZodOptional<z.ZodEnum<{
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
            }>>;
            sector: z.ZodOptional<z.ZodEnum<{
                auto: "auto";
                aerospace: "aerospace";
                semiconductors: "semiconductors";
                "steel-heavy": "steel-heavy";
                "defense-industrial": "defense-industrial";
                "ports-shipping": "ports-shipping";
                "telecom-cyber": "telecom-cyber";
                finance: "finance";
                "housing-construction": "housing-construction";
                "public-infrastructure": "public-infrastructure";
                "energy-oil": "energy-oil";
                "energy-gas": "energy-gas";
                "energy-nuclear": "energy-nuclear";
                "energy-renewables": "energy-renewables";
                agriculture: "agriculture";
                textiles: "textiles";
                mining: "mining";
                chemicals: "chemicals";
                "food-processing": "food-processing";
                "tourism-hospitality": "tourism-hospitality";
                healthcare: "healthcare";
                pharma: "pharma";
                utilities: "utilities";
            }>>;
            bind: z.ZodOptional<z.ZodLiteral<"condition">>;
            frontier: z.ZodOptional<z.ZodLiteral<"home">>;
        }, z.core.$strip>;
        context: z.ZodOptional<z.ZodObject<{
            standing: z.ZodString;
            precedent: z.ZodString;
            pressures: z.ZodArray<z.ZodObject<{
                source: z.ZodEnum<{
                    military: "military";
                    cabinet: "cabinet";
                    legislature: "legislature";
                    street: "street";
                    press: "press";
                    business: "business";
                    ally: "ally";
                    adversary: "adversary";
                    court: "court";
                }>;
                want: z.ZodString;
            }, z.core.$strip>>;
            inaction: z.ZodString;
            unknown: z.ZodString;
        }, z.core.$strict>>;
        premise: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"universal">;
            reason: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"introduces">;
            what: z.ZodString;
        }, z.core.$strict>], "kind">>;
        responsibleOffice: z.ZodOptional<z.ZodEnum<{
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
        }>>;
        particulars: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, z.core.$strip>>>;
        scene: z.ZodOptional<z.ZodObject<{
            register: z.ZodEnum<{
                intact: "intact";
                strained: "strained";
                damaged: "damaged";
                ceremonial: "ceremonial";
            }>;
        }, z.core.$strip>>;
        opening: z.ZodArray<z.ZodObject<{
            speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"cabinet">;
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
                }>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"player">;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"narrator">;
            }, z.core.$strip>], "kind">>;
            text: z.ZodString;
        }, z.core.$strip>>;
        transmission: z.ZodOptional<z.ZodObject<{
            domesticSubject: z.ZodOptional<z.ZodString>;
            relay: z.ZodEnum<{
                [x: string]: string;
            }>;
            attribution: z.ZodString;
            text: z.ZodString;
            voice: z.ZodOptional<z.ZodEnum<{
                state: "state";
                nonstate: "nonstate";
            }>>;
        }, z.core.$strip>>;
        replies: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            tone: z.ZodEnum<{
                conciliatory: "conciliatory";
                firm: "firm";
                principled: "principled";
                evasive: "evasive";
                coercive: "coercive";
            }>;
            text: z.ZodString;
            sets: z.ZodOptional<z.ZodArray<z.ZodString>>;
            press: z.ZodOptional<z.ZodString>;
            resolves: z.ZodOptional<z.ZodEnum<{
                held: "held";
                lost: "lost";
            }>>;
            commitment: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"position">;
                importSuspensionDays: z.ZodOptional<z.ZodNumber>;
                cost: z.ZodPreprocess<z.ZodObject<{
                    treasury: z.ZodOptional<z.ZodNumber>;
                    stability: z.ZodOptional<z.ZodNumber>;
                    militaryReadiness: z.ZodOptional<z.ZodNumber>;
                    standing: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                pull: z.ZodOptional<z.ZodObject<{
                    economicLeftRight: z.ZodOptional<z.ZodNumber>;
                    authLibertarian: z.ZodOptional<z.ZodNumber>;
                    nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                remembered: z.ZodString;
                rejoinder: z.ZodObject<{
                    speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                        kind: z.ZodLiteral<"cabinet">;
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
                        }>;
                    }, z.core.$strip>, z.ZodObject<{
                        kind: z.ZodLiteral<"narrator">;
                    }, z.core.$strip>], "kind">>;
                    text: z.ZodString;
                }, z.core.$strip>;
                impact: z.ZodOptional<z.ZodObject<{
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
                }, z.core.$strict>>;
                relationship: z.ZodOptional<z.ZodObject<{
                    trust: z.ZodOptional<z.ZodNumber>;
                    tension: z.ZodOptional<z.ZodNumber>;
                    militaryThreat: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                conflictMove: z.ZodOptional<z.ZodEnum<{
                    offerTerms: "offerTerms";
                    acceptTerms: "acceptTerms";
                    deescalate: "deescalate";
                }>>;
                collection: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    action: z.ZodLiteral<"close">;
                }, z.core.$strip>, z.ZodObject<{
                    action: z.ZodLiteral<"task">;
                    element: z.ZodEnum<{
                        "IC-ODNI": "IC-ODNI";
                        "IC-CIA": "IC-CIA";
                        "IC-NSA": "IC-NSA";
                        "IC-DIA": "IC-DIA";
                        "IC-NGA": "IC-NGA";
                        "IC-NRO": "IC-NRO";
                        "IC-AF": "IC-AF";
                        "IC-SPACE": "IC-SPACE";
                        "IC-ARMY": "IC-ARMY";
                        "IC-USMC": "IC-USMC";
                        "IC-NAVY": "IC-NAVY";
                        "IC-FBI": "IC-FBI";
                        "IC-DEA": "IC-DEA";
                        "IC-DHS": "IC-DHS";
                        "IC-USCG": "IC-USCG";
                        "IC-INR": "IC-INR";
                        "IC-TREASURY": "IC-TREASURY";
                        "IC-DOE": "IC-DOE";
                    }>;
                    discipline: z.ZodEnum<{
                        humint: "humint";
                        sigint: "sigint";
                        geoint: "geoint";
                        masint: "masint";
                        osint: "osint";
                        finint: "finint";
                        "all-source": "all-source";
                    }>;
                    question: z.ZodString;
                }, z.core.$strip>], "action">>;
                relief: z.ZodOptional<z.ZodLiteral<true>>;
                localeAct: z.ZodOptional<z.ZodEnum<{
                    relief: "relief";
                    review: "review";
                    "property-surge": "property-surge";
                    "task-force": "task-force";
                    priority: "priority";
                }>>;
                tariff: z.ZodOptional<z.ZodObject<{
                    sector: z.ZodString;
                    rate: z.ZodNumber;
                }, z.core.$strip>>;
                tariffLift: z.ZodOptional<z.ZodObject<{
                    theirs: z.ZodBoolean;
                    which: z.ZodOptional<z.ZodEnum<{
                        answered: "answered";
                        response: "response";
                    }>>;
                }, z.core.$strip>>;
                directive: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"investigation">;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"enforcement-posture">;
                    subject: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"inspector-removal-notice">;
                    reason: z.ZodString;
                }, z.core.$strip>], "kind">>;
                transmit: z.ZodOptional<z.ZodString>;
                billText: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    action: z.ZodLiteral<"propose">;
                }, z.core.$strip>, z.ZodObject<{
                    action: z.ZodLiteral<"recommend">;
                    text: z.ZodEnum<{
                        house: "house";
                        senate: "senate";
                        base: "base";
                        targeted: "targeted";
                    }>;
                }, z.core.$strip>], "action">>;
                judicialNomination: z.ZodOptional<z.ZodObject<{
                    action: z.ZodLiteral<"submit">;
                    candidate: z.ZodEnum<{
                        first: "first";
                        alternate: "alternate";
                    }>;
                }, z.core.$strip>>;
                orderRescission: z.ZodOptional<z.ZodObject<{
                    action: z.ZodLiteral<"rescind">;
                }, z.core.$strip>>;
                orderReview: z.ZodOptional<z.ZodObject<{
                    choice: z.ZodEnum<{
                        accept: "accept";
                        seek: "seek";
                        "seek-with-stay": "seek-with-stay";
                    }>;
                }, z.core.$strip>>;
                gazetteer: z.ZodOptional<z.ZodObject<{
                    cityEmployment: z.ZodOptional<z.ZodNumber>;
                    taxBase: z.ZodOptional<z.ZodNumber>;
                    adminLean: z.ZodOptional<z.ZodNumber>;
                    taxHolidayYears: z.ZodOptional<z.ZodNumber>;
                    stateLean: z.ZodOptional<z.ZodNumber>;
                    sectorEmployment: z.ZodOptional<z.ZodNumber>;
                    sectorLaborPressure: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>>;
                domestic: z.ZodOptional<z.ZodObject<{
                    axes: z.ZodOptional<z.ZodObject<{
                        industrial: z.ZodOptional<z.ZodNumber>;
                        agricultural: z.ZodOptional<z.ZodNumber>;
                        energy: z.ZodOptional<z.ZodNumber>;
                        tech: z.ZodOptional<z.ZodNumber>;
                        services: z.ZodOptional<z.ZodNumber>;
                        defense: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>>;
                    sectors: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                        auto: "auto";
                        aerospace: "aerospace";
                        semiconductors: "semiconductors";
                        "steel-heavy": "steel-heavy";
                        "defense-industrial": "defense-industrial";
                        "ports-shipping": "ports-shipping";
                        "telecom-cyber": "telecom-cyber";
                        finance: "finance";
                        "housing-construction": "housing-construction";
                        "public-infrastructure": "public-infrastructure";
                        "energy-oil": "energy-oil";
                        "energy-gas": "energy-gas";
                        "energy-nuclear": "energy-nuclear";
                        "energy-renewables": "energy-renewables";
                        agriculture: "agriculture";
                        textiles: "textiles";
                        mining: "mining";
                        chemicals: "chemicals";
                        "food-processing": "food-processing";
                        "tourism-hospitality": "tourism-hospitality";
                        healthcare: "healthcare";
                        pharma: "pharma";
                        utilities: "utilities";
                    }>>>;
                    urban: z.ZodOptional<z.ZodNumber>;
                    federal: z.ZodOptional<z.ZodNumber>;
                    values: z.ZodOptional<z.ZodObject<{
                        economicLeftRight: z.ZodOptional<z.ZodNumber>;
                        authLibertarian: z.ZodOptional<z.ZodNumber>;
                        nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>>;
                    channels: z.ZodOptional<z.ZodObject<{
                        civilRights: z.ZodOptional<z.ZodNumber>;
                        immigration: z.ZodOptional<z.ZodNumber>;
                        healthAccess: z.ZodOptional<z.ZodNumber>;
                        disabilityPrograms: z.ZodOptional<z.ZodNumber>;
                        veterans: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>>;
                    magnitude: z.ZodEnum<{
                        moderate: "moderate";
                        light: "light";
                        heavy: "heavy";
                    }>;
                    signature: z.ZodString;
                    reason: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"instrument">;
                instrument: z.ZodEnum<{
                    diplomatic: "diplomatic";
                    economic: "economic";
                    covert: "covert";
                    military: "military";
                    assistance: "assistance";
                }>;
                rung: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>;
                domestic: z.ZodOptional<z.ZodObject<{
                    axes: z.ZodOptional<z.ZodObject<{
                        industrial: z.ZodOptional<z.ZodNumber>;
                        agricultural: z.ZodOptional<z.ZodNumber>;
                        energy: z.ZodOptional<z.ZodNumber>;
                        tech: z.ZodOptional<z.ZodNumber>;
                        services: z.ZodOptional<z.ZodNumber>;
                        defense: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>>;
                    sectors: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                        auto: "auto";
                        aerospace: "aerospace";
                        semiconductors: "semiconductors";
                        "steel-heavy": "steel-heavy";
                        "defense-industrial": "defense-industrial";
                        "ports-shipping": "ports-shipping";
                        "telecom-cyber": "telecom-cyber";
                        finance: "finance";
                        "housing-construction": "housing-construction";
                        "public-infrastructure": "public-infrastructure";
                        "energy-oil": "energy-oil";
                        "energy-gas": "energy-gas";
                        "energy-nuclear": "energy-nuclear";
                        "energy-renewables": "energy-renewables";
                        agriculture: "agriculture";
                        textiles: "textiles";
                        mining: "mining";
                        chemicals: "chemicals";
                        "food-processing": "food-processing";
                        "tourism-hospitality": "tourism-hospitality";
                        healthcare: "healthcare";
                        pharma: "pharma";
                        utilities: "utilities";
                    }>>>;
                    urban: z.ZodOptional<z.ZodNumber>;
                    federal: z.ZodOptional<z.ZodNumber>;
                    values: z.ZodOptional<z.ZodObject<{
                        economicLeftRight: z.ZodOptional<z.ZodNumber>;
                        authLibertarian: z.ZodOptional<z.ZodNumber>;
                        nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>>;
                    channels: z.ZodOptional<z.ZodObject<{
                        civilRights: z.ZodOptional<z.ZodNumber>;
                        immigration: z.ZodOptional<z.ZodNumber>;
                        healthAccess: z.ZodOptional<z.ZodNumber>;
                        disabilityPrograms: z.ZodOptional<z.ZodNumber>;
                        veterans: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>>;
                    magnitude: z.ZodEnum<{
                        moderate: "moderate";
                        light: "light";
                        heavy: "heavy";
                    }>;
                    signature: z.ZodString;
                    reason: z.ZodString;
                }, z.core.$strict>>;
                rejoinder: z.ZodOptional<z.ZodObject<{
                    speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                        kind: z.ZodLiteral<"cabinet">;
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
                        }>;
                    }, z.core.$strip>, z.ZodObject<{
                        kind: z.ZodLiteral<"narrator">;
                    }, z.core.$strip>], "kind">>;
                    text: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"join">;
                side: z.ZodEnum<{
                    against: "against";
                    beside: "beside";
                }>;
                rejoinder: z.ZodOptional<z.ZodObject<{
                    speaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
                        kind: z.ZodLiteral<"cabinet">;
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
                        }>;
                    }, z.core.$strip>, z.ZodObject<{
                        kind: z.ZodLiteral<"narrator">;
                    }, z.core.$strip>], "kind">>;
                    text: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>], "kind">;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ScenarioPack = z.infer<typeof ScenarioPack>;
/** The flag a committed scenario stamps, which `once` scenarios gate on. */
export declare function scenarioFiredFlag(id: string): string;
/**
 * Which door the president took, the last time this document was on the desk.
 *
 * `scenarioFiredFlag` says the decision was taken and its marker says when;
 * this says *what was decided*, which is the half a returning scenario needs
 * to open by acknowledging the earlier answer rather than as if the week had
 * never happened. Keyed by reply rather than carrying the text, because the
 * course a player reads is authored prose that a republished corpus may have
 * rewritten — the flag record is an id, and the sentence is resolved from
 * whichever version of the scenario is installed now.
 */
export declare function scenarioAnsweredFlag(id: string, replyId: string): string;
/**
 * The flag stamped when a scenario of this class reaches the desk, which is
 * what the pacing director reads back to know what the player has recently been
 * shown. Kept here beside `scenarioFiredFlag` rather than in the director,
 * because the writer of it is `rememberReply` and the reader is the director —
 * a helper each of them imports is not a helper either of them should own.
 */
export declare function classStagedFlag(scenarioClass: ScenarioClass, turn: number): string;
/**
 * The severity counterpart of `classStagedFlag`: stamped when a scenario of
 * this severity is answered, read back by the director to keep two
 * building-shaking weeks from arriving back to back. Same home, same reason —
 * `rememberReply` writes it and the director reads it.
 */
export declare function severityStagedFlag(severity: ScenarioSeverity, turn: number): string;
