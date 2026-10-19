import { type Campaign } from "../state.js";
export declare const nationA: {
    id: string & import("zod").$brand<"NationId">;
    playable: boolean;
    fidelity: "full" | "standard" | "thin";
    identity: {
        name: string;
        adjective: string;
        capital: string;
        government: string & import("zod").$brand<"CharterId">;
        languages: string[];
        currency: string;
        currencyPerUsd?: number | undefined;
        definiteArticle?: boolean | undefined;
    };
    geo: {
        region: string & import("zod").$brand<"RegionId">;
        lat: number;
        lon: number;
        neighbors: (string & import("zod").$brand<"NationId">)[];
        coastline: boolean;
        chokepoints: (string & import("zod").$brand<"ChokepointId">)[];
        disasterExposure: {
            earthquake?: number | undefined;
            flood?: number | undefined;
            drought?: number | undefined;
            cyclone?: number | undefined;
            wildfire?: number | undefined;
            pandemic?: number | undefined;
            tornado?: number | undefined;
            "winter-storm"?: number | undefined;
            "heat-wave"?: number | undefined;
        };
        chokepointDependence?: {
            chokepoint: string & import("zod").$brand<"ChokepointId">;
            weight: number;
        }[] | undefined;
    };
    stats: {
        demography: {
            population: number;
            urbanization: number;
            medianAge: number;
            growthRate: number;
            literacy: number;
            birthRate: number;
            deathRate: number;
            netMigration: number;
        };
        economy: {
            gdp: number;
            gdpPerCapita: number;
            growth: number;
            inflation: number;
            unemployment: number;
            costOfLiving: number;
            debt: number;
            reserves: number;
            sovereignRating: "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";
        };
        trade: {
            exports: number;
            imports: number;
            balance: number;
            topExports: ("auto" | "aerospace" | "semiconductors" | "steel-heavy" | "defense-industrial" | "ports-shipping" | "telecom-cyber" | "finance" | "housing-construction" | "public-infrastructure" | "energy-oil" | "energy-gas" | "energy-nuclear" | "energy-renewables" | "agriculture" | "textiles" | "mining" | "chemicals" | "food-processing" | "tourism-hospitality" | "healthcare" | "pharma" | "utilities")[];
            topPartners: (string & import("zod").$brand<"NationId">)[];
            tradeDependence: Record<string & import("zod").$brand<"NationId">, number>;
        };
        energy: {
            production: number;
            consumption: number;
            importDependence: number;
            mix: {
                "energy-oil": number;
                "energy-gas": number;
                "energy-nuclear": number;
                "energy-renewables": number;
            };
        };
        military: {
            budget: number;
            activeHeadcount: number;
            reserveHeadcount: number;
            readiness: number;
            doctrineQuality: number;
            branchStrength: {
                land: number;
                air: number;
                naval: number;
                cyber: number;
                space: number;
            };
            airliftCapacity: number;
            sealiftCapacity: number;
            arsenal: {
                warheads: number;
                deliveryTriad: boolean;
                declared?: boolean | undefined;
            };
            basesAbroad: number;
            orderOfBattle?: {
                army: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                navy: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                air: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                marines: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                space: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                cyber: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
            } | undefined;
        };
        security: {
            crimeIndex: number;
            corruptionIndex: number;
            insurgencyPressure: number;
            borderControl: number;
            intelCapability: number;
            counterIntel: number;
        };
        politics: {
            regimeStability: number;
            legitimacy: number;
            factionalism: number;
            pressFreedom: number;
            protestPressure: number;
        };
        softPower: {
            diplomaticReach: number;
            culturalReach: number;
            aidGiven: number;
            aidReceived: number;
        };
    };
    sectors: {
        sector: "auto" | "aerospace" | "semiconductors" | "steel-heavy" | "defense-industrial" | "ports-shipping" | "telecom-cyber" | "finance" | "housing-construction" | "public-infrastructure" | "energy-oil" | "energy-gas" | "energy-nuclear" | "energy-renewables" | "agriculture" | "textiles" | "mining" | "chemicals" | "food-processing" | "tourism-hospitality" | "healthcare" | "pharma" | "utilities";
        mix: number;
        employment: number;
        laborPressure: number;
    }[];
    traits: {
        aggression: number;
        opportunism: number;
        legalism: number;
        isolationism: number;
        riskTolerance: number;
        vengefulness: number;
        reliability: number;
        transparency: number;
        agendas: {
            id: string;
            description: string;
            weight: number;
        }[];
    };
    doctrine: {
        posture: "defensive" | "balanced" | "assertive" | "expansionist";
        redLines: {
            id: string;
            description: string;
        }[];
        alignmentPull: (string & import("zod").$brand<"NationId">)[];
    };
    memberships: (string & import("zod").$brand<"OrgId">)[];
    partySystem: {
        contest: "none" | "multiparty" | "dominant-party" | "one-party";
        parties: {
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
        }[];
    };
    bands: {
        archetype: "great-power" | "regional-power" | "middle-power" | "resource-exporter" | "trading-hub" | "post-conflict" | "isolationist" | "client-state" | "rising-power" | "microstate";
        powerTier: number;
        wealthTier: number;
        alignmentBand: "aligned" | "leaning-aligned" | "neutral" | "leaning-opposed" | "opposed";
        stabilityBand: "stable" | "fragile" | "volatile" | "collapsing";
        militaryTier: number;
        militaryMetrics?: {
            forceIndex: number;
            mobilizationCap: number;
            sustainability: {
                warDuration: number;
                industrialMobilization: number;
            };
            downtime: number;
        } | undefined;
    };
};
export declare const nationB: {
    id: string & import("zod").$brand<"NationId">;
    playable: boolean;
    fidelity: "full" | "standard" | "thin";
    identity: {
        name: string;
        adjective: string;
        capital: string;
        government: string & import("zod").$brand<"CharterId">;
        languages: string[];
        currency: string;
        currencyPerUsd?: number | undefined;
        definiteArticle?: boolean | undefined;
    };
    geo: {
        region: string & import("zod").$brand<"RegionId">;
        lat: number;
        lon: number;
        neighbors: (string & import("zod").$brand<"NationId">)[];
        coastline: boolean;
        chokepoints: (string & import("zod").$brand<"ChokepointId">)[];
        disasterExposure: {
            earthquake?: number | undefined;
            flood?: number | undefined;
            drought?: number | undefined;
            cyclone?: number | undefined;
            wildfire?: number | undefined;
            pandemic?: number | undefined;
            tornado?: number | undefined;
            "winter-storm"?: number | undefined;
            "heat-wave"?: number | undefined;
        };
        chokepointDependence?: {
            chokepoint: string & import("zod").$brand<"ChokepointId">;
            weight: number;
        }[] | undefined;
    };
    stats: {
        demography: {
            population: number;
            urbanization: number;
            medianAge: number;
            growthRate: number;
            literacy: number;
            birthRate: number;
            deathRate: number;
            netMigration: number;
        };
        economy: {
            gdp: number;
            gdpPerCapita: number;
            growth: number;
            inflation: number;
            unemployment: number;
            costOfLiving: number;
            debt: number;
            reserves: number;
            sovereignRating: "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";
        };
        trade: {
            exports: number;
            imports: number;
            balance: number;
            topExports: ("auto" | "aerospace" | "semiconductors" | "steel-heavy" | "defense-industrial" | "ports-shipping" | "telecom-cyber" | "finance" | "housing-construction" | "public-infrastructure" | "energy-oil" | "energy-gas" | "energy-nuclear" | "energy-renewables" | "agriculture" | "textiles" | "mining" | "chemicals" | "food-processing" | "tourism-hospitality" | "healthcare" | "pharma" | "utilities")[];
            topPartners: (string & import("zod").$brand<"NationId">)[];
            tradeDependence: Record<string & import("zod").$brand<"NationId">, number>;
        };
        energy: {
            production: number;
            consumption: number;
            importDependence: number;
            mix: {
                "energy-oil": number;
                "energy-gas": number;
                "energy-nuclear": number;
                "energy-renewables": number;
            };
        };
        military: {
            budget: number;
            activeHeadcount: number;
            reserveHeadcount: number;
            readiness: number;
            doctrineQuality: number;
            branchStrength: {
                land: number;
                air: number;
                naval: number;
                cyber: number;
                space: number;
            };
            airliftCapacity: number;
            sealiftCapacity: number;
            arsenal: {
                warheads: number;
                deliveryTriad: boolean;
                declared?: boolean | undefined;
            };
            basesAbroad: number;
            orderOfBattle?: {
                army: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                navy: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                air: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                marines: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                space: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
                cyber: {
                    headcount: number;
                    capabilities?: {
                        name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        label?: string | undefined;
                    }[] | undefined;
                    units?: {
                        type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
                        count: number;
                        readiness: number;
                        label?: string | undefined;
                    }[] | undefined;
                };
            } | undefined;
        };
        security: {
            crimeIndex: number;
            corruptionIndex: number;
            insurgencyPressure: number;
            borderControl: number;
            intelCapability: number;
            counterIntel: number;
        };
        politics: {
            regimeStability: number;
            legitimacy: number;
            factionalism: number;
            pressFreedom: number;
            protestPressure: number;
        };
        softPower: {
            diplomaticReach: number;
            culturalReach: number;
            aidGiven: number;
            aidReceived: number;
        };
    };
    sectors: {
        sector: "auto" | "aerospace" | "semiconductors" | "steel-heavy" | "defense-industrial" | "ports-shipping" | "telecom-cyber" | "finance" | "housing-construction" | "public-infrastructure" | "energy-oil" | "energy-gas" | "energy-nuclear" | "energy-renewables" | "agriculture" | "textiles" | "mining" | "chemicals" | "food-processing" | "tourism-hospitality" | "healthcare" | "pharma" | "utilities";
        mix: number;
        employment: number;
        laborPressure: number;
    }[];
    traits: {
        aggression: number;
        opportunism: number;
        legalism: number;
        isolationism: number;
        riskTolerance: number;
        vengefulness: number;
        reliability: number;
        transparency: number;
        agendas: {
            id: string;
            description: string;
            weight: number;
        }[];
    };
    doctrine: {
        posture: "defensive" | "balanced" | "assertive" | "expansionist";
        redLines: {
            id: string;
            description: string;
        }[];
        alignmentPull: (string & import("zod").$brand<"NationId">)[];
    };
    memberships: (string & import("zod").$brand<"OrgId">)[];
    partySystem: {
        contest: "none" | "multiparty" | "dominant-party" | "one-party";
        parties: {
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
        }[];
    };
    bands: {
        archetype: "great-power" | "regional-power" | "middle-power" | "resource-exporter" | "trading-hub" | "post-conflict" | "isolationist" | "client-state" | "rising-power" | "microstate";
        powerTier: number;
        wealthTier: number;
        alignmentBand: "aligned" | "leaning-aligned" | "neutral" | "leaning-opposed" | "opposed";
        stabilityBand: "stable" | "fragile" | "volatile" | "collapsing";
        militaryTier: number;
        militaryMetrics?: {
            forceIndex: number;
            mobilizationCap: number;
            sustainability: {
                warDuration: number;
                industrialMobilization: number;
            };
            downtime: number;
        } | undefined;
    };
};
export declare const person: {
    id: string & import("zod").$brand<"PersonId">;
    name: string;
    nationality: string & import("zod").$brand<"NationId">;
    portraitRef: string;
    age: number;
    bio: string;
    education: {
        school: string & import("zod").$brand<"SchoolId">;
        field: "law" | "economics" | "engineering" | "military-science" | "medicine" | "international-relations" | "public-administration" | "journalism" | "theology" | "natural-sciences";
        postgraduate: boolean;
    };
    career: {
        archetype: "medicine" | "civil-service" | "military-command" | "intelligence-service" | "diplomatic-corps" | "private-law" | "business" | "academia" | "party-organizing" | "local-government" | "state-media" | "independent-press" | "activism" | "labor-union" | "judiciary";
        years: number;
        startAge: number;
    }[];
    ideology: {
        economicLeftRight: number;
        authLibertarian: number;
        nationalistGlobalist: number;
    };
    competence: number;
    loyalty: number;
    ambition: number;
    integrity: number;
    charisma: number;
    traits: ("ambitious" | "cautious" | "loyal" | "corrupt" | "principled" | "charismatic" | "reclusive" | "hawkish" | "dovish" | "pragmatic")[];
    eligibleRoles: (string & import("zod").$brand<"RoleId">)[];
    affiliation?: (string & import("zod").$brand<"FactionId">) | undefined;
    party?: (string & import("zod").$brand<"PartyId">) | undefined;
    birthplace?: string | undefined;
};
export declare const relationship: {
    from: string & import("zod").$brand<"NationId">;
    to: string & import("zod").$brand<"NationId">;
    trust: number;
    alignment: number;
    tension: number;
    tradeDependence: number;
    militaryThreat: number;
    treaties: (string & import("zod").$brand<"TreatyId">)[];
    grudges: {
        cause: string;
        weight: number;
        createdTurn: number;
        decayRate: number;
    }[];
    history: {
        turn: number;
        kind: string;
        description: string;
    }[];
};
export declare function buildCampaign(): Campaign;
/**
 * Advance turn and calendar together so day-clocked systems (`campaignDay`)
 * and turn-clocked systems stay in step. Bumping `turn` alone leaves a
 * stored `foundingDate` campaign stuck on day zero.
 */
export declare function withWeeksElapsed(campaign: Campaign, weeks: number): Campaign;
/** Jump to an absolute turn ordinal, moving the calendar by the matching weeks. */
export declare function atCampaignTurn(campaign: Campaign, turn: number): Campaign;
