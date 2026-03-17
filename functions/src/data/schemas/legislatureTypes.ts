export type LegislativeRoleType = 'senator' | 'representative' | 'member_of_parliament' | 'deputy' | 'councillor' | 'appointed_lord';

export type ProminentLegislativeRole =
  | 'speaker'
  | 'majority_leader'
  | 'minority_leader'
  | 'majority_whip'
  | 'minority_whip'
  | 'committee_chair_finance'
  | 'committee_chair_defense'
  | 'committee_chair_foreign_affairs'
  | 'committee_chair_intelligence'
  | 'president_of_senate'
  | 'opposition_leader';

export type PersonGender = 'male' | 'female' | 'nonbinary';

export interface ChamberProfile {
  name: string;
  token: string;
  seat_count: number;
  term_length_fraction: number;
  elected_per_cycle_fraction: number;
  role_type: LegislativeRoleType;
  partisan: boolean;
}

export interface LegislatureProfile {
  type: 'bicameral' | 'unicameral' | 'no_legislature' | 'rubber_stamp';
  upper_house?: ChamberProfile;
  lower_house?: ChamberProfile;
  single_chamber?: ChamberProfile;
  election_system: 'first_past_post' | 'proportional' | 'mixed' | 'appointed';
}

export interface LegislativeBloc {
  party_id: string;
  party_name: string;
  ideological_position: number; // 1-10
  seat_share: number; // 0-1
  approval_of_player: number; // 0-100
  chamber: 'upper' | 'lower' | 'single';
  is_ruling_coalition: boolean;
}

export interface LegislativeMemberStats {
  influence: number; // 1-10
  loyalty_to_player: number; // 0-100
  ideology: number; // 1-10
  corruption_risk: number; // 1-10
}

export interface LegislativeMember {
  id: string;
  name: string;
  gender: PersonGender;
  role_type: LegislativeRoleType;
  chamber: 'upper' | 'lower' | 'single';
  party_id: string;
  party: string;                        // actual party name
  role?: ProminentLegislativeRole;      // leadership role if any
  tenure_start_turn: number;
  tenure_end_turn: number;
  stats: LegislativeMemberStats;
  title: string;
  subdivision?: string;
}

export interface LegislatureState {
  composition: LegislativeBloc[];
  approval_of_player: number; // 0-100 aggregate
  last_election_turn: number;
  next_election_turn: number;
  gridlock_level: number; // 0-100
  coalition_fragility: number;              // 0–100, how close majority is to collapse
  prominent_election_upcoming: boolean;     // true if election within 4 turns
  minority_government: boolean;             // true if no majority coalition
  notable_members: LegislativeMember[];
}
