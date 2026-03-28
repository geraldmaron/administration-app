"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPABILITIES_BY_BRANCH = exports.ALL_CAPABILITY_IDS = exports.CAPABILITY_IDS = void 0;
exports.CAPABILITY_IDS = {
    // Army
    MAIN_BATTLE_TANKS: 'main_battle_tanks',
    MECHANIZED_INFANTRY: 'mechanized_infantry',
    SELF_PROPELLED_ARTILLERY: 'self_propelled_artillery',
    AIR_DEFENSE_SYSTEMS: 'air_defense_systems',
    HELICOPTER_ASSAULT: 'helicopter_assault',
    STRATEGIC_MISSILES: 'strategic_missiles',
    // Navy
    AIRCRAFT_CARRIER: 'aircraft_carrier',
    NUCLEAR_SUBMARINE: 'nuclear_submarine',
    BALLISTIC_MISSILE_SUBMARINE: 'ballistic_missile_submarine',
    DESTROYER_FLEET: 'destroyer_fleet',
    AMPHIBIOUS_ASSAULT: 'amphibious_assault',
    MINE_WARFARE: 'mine_warfare',
    LITTORAL_COMBAT: 'littoral_combat',
    // Air Force
    GEN5_FIGHTERS: 'gen5_fighters',
    GEN4_FIGHTERS: 'gen4_fighters',
    STRATEGIC_BOMBERS: 'strategic_bombers',
    STEALTH_AIRCRAFT: 'stealth_aircraft',
    AWACS: 'awacs',
    REFUELING_TANKERS: 'refueling_tankers',
    DRONE_SWARMS: 'drone_swarms',
    HYPERSONIC_MISSILES: 'hypersonic_missiles',
    // Marines
    BEACH_ASSAULT: 'beach_assault',
    VERTICAL_ENVELOPMENT: 'vertical_envelopment',
    EXPEDITIONARY_STRIKE: 'expeditionary_strike',
    // Special Forces
    DIRECT_ACTION: 'direct_action',
    COVERT_INFILTRATION: 'covert_infiltration',
    HOSTAGE_RESCUE: 'hostage_rescue',
    FOREIGN_INTERNAL_DEFENSE: 'foreign_internal_defense',
    PSYCHOLOGICAL_OPS: 'psychological_ops',
    // Cyber Command
    INFRASTRUCTURE_ATTACK: 'infrastructure_attack',
    FINANCIAL_SYSTEM_ATTACK: 'financial_system_attack',
    ELECTION_INTERFERENCE: 'election_interference',
    ESPIONAGE_APT: 'espionage_apt',
    DEFENSIVE_HARDENING: 'defensive_hardening',
    // Space Command
    RECONNAISSANCE_SATELLITES: 'reconnaissance_satellites',
    GPS_DENIAL: 'gps_denial',
    ANTI_SATELLITE: 'anti_satellite',
    // Strategic Nuclear
    ICBM: 'icbm',
    SLBM: 'slbm',
    AIR_LAUNCHED_NUCLEAR: 'air_launched_nuclear',
    TACTICAL_NUKES: 'tactical_nukes',
    SECOND_STRIKE_HARDENED: 'second_strike_hardened',
    // Coast Guard
    MARITIME_PATROL: 'maritime_patrol',
    SEARCH_RESCUE: 'search_rescue',
    INTERDICTION: 'interdiction',
    // National Guard / Reserve
    DOMESTIC_DEPLOYMENT: 'domestic_deployment',
    DISASTER_RESPONSE: 'disaster_response',
    BORDER_ENFORCEMENT: 'border_enforcement',
    // Paramilitary
    RIOT_CONTROL: 'riot_control',
    DOMESTIC_STABILITY: 'domestic_stability',
    // Intelligence
    HUMINT: 'humint',
    SIGINT: 'sigint',
    COVERT_OPS: 'covert_ops',
    COUNTERINTELLIGENCE: 'counterintelligence',
};
exports.ALL_CAPABILITY_IDS = Object.values(exports.CAPABILITY_IDS);
exports.CAPABILITIES_BY_BRANCH = {
    ground_forces: [
        exports.CAPABILITY_IDS.MAIN_BATTLE_TANKS,
        exports.CAPABILITY_IDS.MECHANIZED_INFANTRY,
        exports.CAPABILITY_IDS.SELF_PROPELLED_ARTILLERY,
        exports.CAPABILITY_IDS.AIR_DEFENSE_SYSTEMS,
        exports.CAPABILITY_IDS.HELICOPTER_ASSAULT,
        exports.CAPABILITY_IDS.STRATEGIC_MISSILES,
    ],
    maritime: [
        exports.CAPABILITY_IDS.AIRCRAFT_CARRIER,
        exports.CAPABILITY_IDS.NUCLEAR_SUBMARINE,
        exports.CAPABILITY_IDS.BALLISTIC_MISSILE_SUBMARINE,
        exports.CAPABILITY_IDS.DESTROYER_FLEET,
        exports.CAPABILITY_IDS.AMPHIBIOUS_ASSAULT,
        exports.CAPABILITY_IDS.MINE_WARFARE,
        exports.CAPABILITY_IDS.LITTORAL_COMBAT,
    ],
    air: [
        exports.CAPABILITY_IDS.GEN5_FIGHTERS,
        exports.CAPABILITY_IDS.GEN4_FIGHTERS,
        exports.CAPABILITY_IDS.STRATEGIC_BOMBERS,
        exports.CAPABILITY_IDS.STEALTH_AIRCRAFT,
        exports.CAPABILITY_IDS.AWACS,
        exports.CAPABILITY_IDS.REFUELING_TANKERS,
        exports.CAPABILITY_IDS.DRONE_SWARMS,
        exports.CAPABILITY_IDS.HYPERSONIC_MISSILES,
    ],
    marines: [
        exports.CAPABILITY_IDS.BEACH_ASSAULT,
        exports.CAPABILITY_IDS.VERTICAL_ENVELOPMENT,
        exports.CAPABILITY_IDS.EXPEDITIONARY_STRIKE,
    ],
    special_operations: [
        exports.CAPABILITY_IDS.DIRECT_ACTION,
        exports.CAPABILITY_IDS.COVERT_INFILTRATION,
        exports.CAPABILITY_IDS.HOSTAGE_RESCUE,
        exports.CAPABILITY_IDS.FOREIGN_INTERNAL_DEFENSE,
        exports.CAPABILITY_IDS.PSYCHOLOGICAL_OPS,
    ],
    cyber: [
        exports.CAPABILITY_IDS.INFRASTRUCTURE_ATTACK,
        exports.CAPABILITY_IDS.FINANCIAL_SYSTEM_ATTACK,
        exports.CAPABILITY_IDS.ELECTION_INTERFERENCE,
        exports.CAPABILITY_IDS.ESPIONAGE_APT,
        exports.CAPABILITY_IDS.DEFENSIVE_HARDENING,
    ],
    space: [
        exports.CAPABILITY_IDS.RECONNAISSANCE_SATELLITES,
        exports.CAPABILITY_IDS.GPS_DENIAL,
        exports.CAPABILITY_IDS.ANTI_SATELLITE,
    ],
    strategic_nuclear: [
        exports.CAPABILITY_IDS.ICBM,
        exports.CAPABILITY_IDS.SLBM,
        exports.CAPABILITY_IDS.AIR_LAUNCHED_NUCLEAR,
        exports.CAPABILITY_IDS.TACTICAL_NUKES,
        exports.CAPABILITY_IDS.SECOND_STRIKE_HARDENED,
    ],
    coast_guard: [
        exports.CAPABILITY_IDS.MARITIME_PATROL,
        exports.CAPABILITY_IDS.SEARCH_RESCUE,
        exports.CAPABILITY_IDS.INTERDICTION,
    ],
    reserve: [
        exports.CAPABILITY_IDS.DOMESTIC_DEPLOYMENT,
        exports.CAPABILITY_IDS.DISASTER_RESPONSE,
        exports.CAPABILITY_IDS.BORDER_ENFORCEMENT,
    ],
    paramilitary: [
        exports.CAPABILITY_IDS.RIOT_CONTROL,
        exports.CAPABILITY_IDS.BORDER_ENFORCEMENT,
        exports.CAPABILITY_IDS.DOMESTIC_DEPLOYMENT,
        exports.CAPABILITY_IDS.DOMESTIC_STABILITY,
    ],
    intelligence_military: [
        exports.CAPABILITY_IDS.HUMINT,
        exports.CAPABILITY_IDS.SIGINT,
        exports.CAPABILITY_IDS.COVERT_OPS,
        exports.CAPABILITY_IDS.COUNTERINTELLIGENCE,
    ],
};
//# sourceMappingURL=capabilityIds.js.map