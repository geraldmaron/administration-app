import type { CanonicalBranchType } from './canonicalBranchTypes';

export const CAPABILITY_IDS = {
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
} as const;

export type CapabilityId = (typeof CAPABILITY_IDS)[keyof typeof CAPABILITY_IDS];
export const ALL_CAPABILITY_IDS: readonly CapabilityId[] = Object.values(CAPABILITY_IDS);

export const CAPABILITIES_BY_BRANCH: Partial<Record<CanonicalBranchType, readonly CapabilityId[]>> = {
  ground_forces: [
    CAPABILITY_IDS.MAIN_BATTLE_TANKS,
    CAPABILITY_IDS.MECHANIZED_INFANTRY,
    CAPABILITY_IDS.SELF_PROPELLED_ARTILLERY,
    CAPABILITY_IDS.AIR_DEFENSE_SYSTEMS,
    CAPABILITY_IDS.HELICOPTER_ASSAULT,
    CAPABILITY_IDS.STRATEGIC_MISSILES,
  ],
  maritime: [
    CAPABILITY_IDS.AIRCRAFT_CARRIER,
    CAPABILITY_IDS.NUCLEAR_SUBMARINE,
    CAPABILITY_IDS.BALLISTIC_MISSILE_SUBMARINE,
    CAPABILITY_IDS.DESTROYER_FLEET,
    CAPABILITY_IDS.AMPHIBIOUS_ASSAULT,
    CAPABILITY_IDS.MINE_WARFARE,
    CAPABILITY_IDS.LITTORAL_COMBAT,
  ],
  air: [
    CAPABILITY_IDS.GEN5_FIGHTERS,
    CAPABILITY_IDS.GEN4_FIGHTERS,
    CAPABILITY_IDS.STRATEGIC_BOMBERS,
    CAPABILITY_IDS.STEALTH_AIRCRAFT,
    CAPABILITY_IDS.AWACS,
    CAPABILITY_IDS.REFUELING_TANKERS,
    CAPABILITY_IDS.DRONE_SWARMS,
    CAPABILITY_IDS.HYPERSONIC_MISSILES,
  ],
  marines: [
    CAPABILITY_IDS.BEACH_ASSAULT,
    CAPABILITY_IDS.VERTICAL_ENVELOPMENT,
    CAPABILITY_IDS.EXPEDITIONARY_STRIKE,
  ],
  special_operations: [
    CAPABILITY_IDS.DIRECT_ACTION,
    CAPABILITY_IDS.COVERT_INFILTRATION,
    CAPABILITY_IDS.HOSTAGE_RESCUE,
    CAPABILITY_IDS.FOREIGN_INTERNAL_DEFENSE,
    CAPABILITY_IDS.PSYCHOLOGICAL_OPS,
  ],
  cyber: [
    CAPABILITY_IDS.INFRASTRUCTURE_ATTACK,
    CAPABILITY_IDS.FINANCIAL_SYSTEM_ATTACK,
    CAPABILITY_IDS.ELECTION_INTERFERENCE,
    CAPABILITY_IDS.ESPIONAGE_APT,
    CAPABILITY_IDS.DEFENSIVE_HARDENING,
  ],
  space: [
    CAPABILITY_IDS.RECONNAISSANCE_SATELLITES,
    CAPABILITY_IDS.GPS_DENIAL,
    CAPABILITY_IDS.ANTI_SATELLITE,
  ],
  strategic_nuclear: [
    CAPABILITY_IDS.ICBM,
    CAPABILITY_IDS.SLBM,
    CAPABILITY_IDS.AIR_LAUNCHED_NUCLEAR,
    CAPABILITY_IDS.TACTICAL_NUKES,
    CAPABILITY_IDS.SECOND_STRIKE_HARDENED,
  ],
  coast_guard: [
    CAPABILITY_IDS.MARITIME_PATROL,
    CAPABILITY_IDS.SEARCH_RESCUE,
    CAPABILITY_IDS.INTERDICTION,
  ],
  reserve: [
    CAPABILITY_IDS.DOMESTIC_DEPLOYMENT,
    CAPABILITY_IDS.DISASTER_RESPONSE,
    CAPABILITY_IDS.BORDER_ENFORCEMENT,
  ],
  paramilitary: [
    CAPABILITY_IDS.RIOT_CONTROL,
    CAPABILITY_IDS.BORDER_ENFORCEMENT,
    CAPABILITY_IDS.DOMESTIC_DEPLOYMENT,
    CAPABILITY_IDS.DOMESTIC_STABILITY,
  ],
  intelligence_military: [
    CAPABILITY_IDS.HUMINT,
    CAPABILITY_IDS.SIGINT,
    CAPABILITY_IDS.COVERT_OPS,
    CAPABILITY_IDS.COUNTERINTELLIGENCE,
  ],
};
