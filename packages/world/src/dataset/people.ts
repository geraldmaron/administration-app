import type { NationFidelity } from "../schemas/nation.js";
import type { RoleId } from "../schemas/ids.js";
import { RoleProfile, PersonPoolSpec, type NameBank } from "../schemas/people-pool.js";
import { ALL_NAME_BANKS, ROSTER_NAME_CULTURE, type AnyNameCulture } from "./name-cultures.js";
import { US_ID, worldNations } from "./nations.js";
import { VICE_PRESIDENT_ROLE_ID, WHITE_HOUSE_STAFF_ROLE_IDS } from "./white-house.js";
import { VACANCY_BENCH_ROLE_PROFILES } from "./vacancy-bench-roles.js";

// Every seat any charter can create, plus the roles that exist outside a
// cabinet entirely. A nation's pool must cover all of them: the player can
// found under any charter, and NPC nations need an opposition and a press
// whether or not their government has a seat for one.
export const CABINET_ROLES = [
  "role-prime-minister",
  "role-president",
  "role-monarch",
  "role-junta-chairman",
  "role-first-councillor",
  "role-council-chair",
  "role-court-chancellor",
  "role-foreign-minister",
  "role-treasury-minister",
  "role-defense-minister",
  "role-interior-minister",
  "role-intelligence-director",
  "role-electoral-affairs-minister",
  "role-attorney-general",
] as const;

// The legislature is people too. A congressional leader and a committee chair
// are drawn from the same pool as everyone else so that the Hill is staffed by
// the same machinery the cabinet is, rather than by a second person model that
// would have to be kept honest separately. They are appended last on purpose:
// the pool's name ledger walks the roles in order, so adding a seat at the end
// leaves every existing cast for a given seed exactly where it was.
/**
 * The ten department secretaries the cabinet table was missing.
 *
 * The government modeled fifteen departments and seated five of their
 * secretaries, so Agriculture, Commerce, Labor, Health and Human Services,
 * Housing, Transportation, Energy, Education, Veterans Affairs and Homeland
 * Security were institutions with a capacity reading and no minister — which
 * meant the roster and the executive branch were two accounts of one
 * government, and on screen they contradicted each other about who was in the
 * chair.
 *
 * A seat here is a full cabinet seat: a person with a bench, an attribute
 * window, a career, loyalty that moves, and a place in the roster. What it is
 * not is a policy chair — only six domains are legislable and five roles chair
 * them, which is true of a real cabinet too. A Secretary of Education is a
 * cabinet member who runs a department rather than a legislative program, and
 * the roster now says exactly that rather than filing them somewhere else.
 *
 * **Appended after every existing role**, like `role-governor` before them, for
 * the reason the note on `NON_CABINET_ROLES` gives: the pool's name ledger
 * walks the roles in order, so adding seats at the end leaves every existing
 * cast for a given seed exactly where it was. Inserting them beside the
 * ministers they sit beside would have reshuffled every campaign ever seeded.
 */
export const DEPARTMENT_SECRETARY_ROLES = [
  "role-agriculture-secretary",
  "role-commerce-secretary",
  "role-labor-secretary",
  "role-health-secretary",
  "role-housing-secretary",
  "role-transportation-secretary",
  "role-energy-secretary",
  "role-education-secretary",
  "role-veterans-secretary",
  "role-homeland-secretary",
] as const;

export const NON_CABINET_ROLES = [
  "role-opposition-leader",
  "role-journalist",
  "role-congressional-leader",
  "role-committee-chair",
  "role-governor",
] as const;

/**
 * The bureau chiefs, agency administrators and commission chairs who run the
 * executive branch below the cabinet.
 *
 * One role for forty-odd different buildings, and deliberately: what they have
 * in common is the thing the seat selects for. A president appoints a
 * Commissioner of Internal Revenue and a Director of the Secret Service out of
 * the same kind of career — long service, subject-matter standing, and a
 * loyalty that runs to the statute rather than to whoever won the last
 * election. A role per agency would be forty-five windows that all read alike.
 */
export const AGENCY_HEAD_ROLE = "role-agency-head";

export const ALL_ROLES: readonly RoleId[] = [
  ...CABINET_ROLES.filter((role) => role !== "role-attorney-general"),
  ...NON_CABINET_ROLES.filter((role) => role !== "role-governor"),
  "role-attorney-general",
  "role-governor",
  // Last, so every cast seeded before they existed is unchanged. See the note
  // on DEPARTMENT_SECRETARY_ROLES.
  ...DEPARTMENT_SECRETARY_ROLES,
  AGENCY_HEAD_ROLE,
] as unknown as readonly RoleId[];

const range = (min: number, max: number) => ({ min, max });

// Attribute windows per seat. These are the levers cabinet and NPC decision
// rules read, so each one has to mean something: a head of government is
// selected for ambition and presence, an intelligence director for competence
// and discretion, a journalist for integrity and for owing the player nothing.
const ROLE_PROFILE_INPUTS: ReadonlyArray<{
  role: string;
  cabinet: boolean;
  attributes: {
    competence: { min: number; max: number };
    loyalty: { min: number; max: number };
    ambition: { min: number; max: number };
    integrity: { min: number; max: number };
    charisma: { min: number; max: number };
  };
  likelyTraits: readonly string[];
  ageRange: { min: number; max: number };
  ideologySpread: number;
}> = [
  {
    role: "role-prime-minister",
    cabinet: true,
    attributes: {
      competence: range(0.5, 0.9),
      loyalty: range(0.3, 0.7),
      ambition: range(0.55, 0.95),
      integrity: range(0.3, 0.8),
      charisma: range(0.5, 0.9),
    },
    likelyTraits: ["ambitious", "pragmatic", "charismatic"],
    ageRange: { min: 42, max: 72 },
    ideologySpread: 0.8,
  },
  {
    role: "role-president",
    cabinet: true,
    attributes: {
      competence: range(0.5, 0.9),
      loyalty: range(0.25, 0.65),
      ambition: range(0.6, 1),
      integrity: range(0.25, 0.8),
      charisma: range(0.55, 0.95),
    },
    likelyTraits: ["ambitious", "charismatic", "pragmatic"],
    ageRange: { min: 45, max: 76 },
    ideologySpread: 0.85,
  },
  {
    role: "role-monarch",
    cabinet: true,
    attributes: {
      competence: range(0.35, 0.85),
      loyalty: range(0.5, 0.9),
      ambition: range(0.4, 0.85),
      integrity: range(0.3, 0.75),
      charisma: range(0.4, 0.9),
    },
    likelyTraits: ["cautious", "loyal", "principled"],
    ageRange: { min: 30, max: 84 },
    ideologySpread: 0.5,
  },
  {
    role: "role-junta-chairman",
    cabinet: true,
    attributes: {
      competence: range(0.45, 0.85),
      loyalty: range(0.3, 0.7),
      ambition: range(0.65, 1),
      integrity: range(0.15, 0.6),
      charisma: range(0.35, 0.8),
    },
    likelyTraits: ["hawkish", "ambitious", "cautious"],
    ageRange: { min: 48, max: 74 },
    ideologySpread: 0.45,
  },
  {
    role: "role-first-councillor",
    cabinet: true,
    attributes: {
      competence: range(0.4, 0.85),
      loyalty: range(0.45, 0.9),
      ambition: range(0.35, 0.8),
      integrity: range(0.4, 0.9),
      charisma: range(0.4, 0.85),
    },
    likelyTraits: ["principled", "cautious", "reclusive"],
    ageRange: { min: 52, max: 82 },
    ideologySpread: 0.4,
  },
  {
    role: "role-council-chair",
    cabinet: true,
    attributes: {
      competence: range(0.45, 0.85),
      loyalty: range(0.35, 0.75),
      ambition: range(0.4, 0.85),
      integrity: range(0.4, 0.85),
      charisma: range(0.4, 0.8),
    },
    likelyTraits: ["pragmatic", "cautious", "principled"],
    ageRange: { min: 44, max: 74 },
    ideologySpread: 0.6,
  },
  {
    role: "role-court-chancellor",
    cabinet: true,
    attributes: {
      competence: range(0.5, 0.9),
      loyalty: range(0.5, 0.95),
      ambition: range(0.4, 0.85),
      integrity: range(0.2, 0.7),
      charisma: range(0.3, 0.75),
    },
    likelyTraits: ["loyal", "pragmatic", "corrupt"],
    ageRange: { min: 45, max: 76 },
    ideologySpread: 0.4,
  },
  {
    role: "role-foreign-minister",
    cabinet: true,
    attributes: {
      competence: range(0.5, 0.9),
      loyalty: range(0.35, 0.8),
      ambition: range(0.35, 0.8),
      integrity: range(0.35, 0.85),
      charisma: range(0.5, 0.9),
    },
    likelyTraits: ["pragmatic", "dovish", "charismatic"],
    ageRange: { min: 40, max: 72 },
    ideologySpread: 0.6,
  },
  {
    role: "role-treasury-minister",
    cabinet: true,
    attributes: {
      competence: range(0.55, 0.95),
      loyalty: range(0.3, 0.75),
      ambition: range(0.3, 0.75),
      integrity: range(0.3, 0.85),
      charisma: range(0.2, 0.65),
    },
    likelyTraits: ["cautious", "pragmatic", "principled"],
    ageRange: { min: 40, max: 70 },
    ideologySpread: 0.7,
  },
  {
    role: "role-defense-minister",
    cabinet: true,
    attributes: {
      competence: range(0.45, 0.9),
      loyalty: range(0.4, 0.85),
      ambition: range(0.35, 0.8),
      integrity: range(0.3, 0.8),
      charisma: range(0.25, 0.7),
    },
    likelyTraits: ["hawkish", "loyal", "cautious"],
    ageRange: { min: 44, max: 74 },
    ideologySpread: 0.5,
  },
  {
    role: "role-interior-minister",
    cabinet: true,
    attributes: {
      competence: range(0.4, 0.85),
      loyalty: range(0.45, 0.9),
      ambition: range(0.35, 0.8),
      integrity: range(0.2, 0.75),
      charisma: range(0.25, 0.7),
    },
    likelyTraits: ["loyal", "cautious", "corrupt"],
    ageRange: { min: 40, max: 70 },
    ideologySpread: 0.55,
  },
  {
    role: "role-intelligence-director",
    cabinet: true,
    attributes: {
      competence: range(0.6, 0.95),
      loyalty: range(0.4, 0.85),
      ambition: range(0.35, 0.85),
      integrity: range(0.15, 0.7),
      charisma: range(0.1, 0.5),
    },
    likelyTraits: ["reclusive", "cautious", "pragmatic"],
    ageRange: { min: 42, max: 70 },
    ideologySpread: 0.35,
  },
  {
    role: "role-electoral-affairs-minister",
    cabinet: true,
    attributes: {
      competence: range(0.4, 0.85),
      loyalty: range(0.4, 0.9),
      ambition: range(0.3, 0.75),
      integrity: range(0.25, 0.9),
      charisma: range(0.25, 0.7),
    },
    likelyTraits: ["principled", "loyal", "corrupt"],
    ageRange: { min: 38, max: 68 },
    ideologySpread: 0.6,
  },
  {
    role: "role-attorney-general",
    cabinet: true,
    attributes: {
      competence: range(0.6, 0.95),
      loyalty: range(0.4, 0.85),
      ambition: range(0.3, 0.75),
      integrity: range(0.55, 0.95),
      charisma: range(0.25, 0.7),
    },
    likelyTraits: ["principled", "cautious", "pragmatic"],
    ageRange: { min: 42, max: 72 },
    ideologySpread: 0.45,
  },
  {
    role: "role-opposition-leader",
    cabinet: false,
    attributes: {
      // Deliberately low loyalty: the opposition leader is the one seat whose
      // occupant is never on the player's side, whatever else they are.
      competence: range(0.4, 0.85),
      loyalty: range(0.05, 0.35),
      ambition: range(0.6, 1),
      integrity: range(0.25, 0.85),
      charisma: range(0.5, 0.95),
    },
    likelyTraits: ["ambitious", "charismatic", "principled"],
    ageRange: { min: 32, max: 68 },
    ideologySpread: 0.95,
  },
  {
    role: "role-journalist",
    cabinet: false,
    attributes: {
      competence: range(0.45, 0.9),
      loyalty: range(0.05, 0.3),
      ambition: range(0.3, 0.8),
      integrity: range(0.4, 0.95),
      charisma: range(0.3, 0.75),
    },
    likelyTraits: ["principled", "ambitious", "reclusive"],
    ageRange: { min: 26, max: 64 },
    ideologySpread: 0.8,
  },
  {
    role: "role-congressional-leader",
    cabinet: false,
    attributes: {
      // Loyalty here means loyalty to a caucus rather than to the president,
      // and a leader who had none of it would not be leading anything. What
      // makes them hard to move is ambition: a Speaker counting their own
      // votes is counting them for a reason of their own.
      competence: range(0.45, 0.9),
      loyalty: range(0.35, 0.85),
      ambition: range(0.55, 0.95),
      integrity: range(0.25, 0.8),
      charisma: range(0.45, 0.9),
    },
    likelyTraits: ["ambitious", "pragmatic", "charismatic"],
    ageRange: { min: 42, max: 76 },
    ideologySpread: 0.75,
  },
  {
    role: "role-committee-chair",
    cabinet: false,
    attributes: {
      // A chair is made by seniority and subject matter rather than by a room,
      // so competence runs high and charisma does not have to.
      competence: range(0.5, 0.95),
      loyalty: range(0.25, 0.75),
      ambition: range(0.3, 0.8),
      integrity: range(0.3, 0.9),
      charisma: range(0.25, 0.7),
    },
    likelyTraits: ["cautious", "pragmatic", "principled"],
    ageRange: { min: 48, max: 80 },
    ideologySpread: 0.7,
  },
  {
    role: "role-governor",
    cabinet: false,
    attributes: {
      competence: range(0.4, 0.9),
      loyalty: range(0.3, 0.8),
      ambition: range(0.45, 0.95),
      integrity: range(0.25, 0.85),
      charisma: range(0.4, 0.9),
    },
    likelyTraits: ["ambitious", "pragmatic", "charismatic"],
    ageRange: { min: 38, max: 74 },
    ideologySpread: 0.85,
  },

  // --- The ten department secretaries -------------------------------------
  //
  // Each window is chosen from what the seat is actually selected for, the
  // same way the older ministers' are, rather than being ten copies of one
  // generic "secretary". An Agriculture Secretary is a constituency
  // appointment and reads high on loyalty and low on ambition; a Health
  // Secretary is a technical one and reads high on competence; a Homeland
  // Secretary is a security seat and reads like one. They differ because the
  // benches they produce have to differ — a cabinet where every chair offers
  // the same six names is a cabinet with one chair in it.
  {
    role: "role-agriculture-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.4, 0.8),
      loyalty: range(0.45, 0.9),
      ambition: range(0.2, 0.6),
      integrity: range(0.4, 0.85),
      charisma: range(0.3, 0.75),
    },
    likelyTraits: ["pragmatic", "loyal", "cautious"],
    ageRange: { min: 42, max: 74 },
    ideologySpread: 0.5,
  },
  {
    role: "role-commerce-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.5, 0.9),
      loyalty: range(0.3, 0.75),
      ambition: range(0.4, 0.85),
      integrity: range(0.25, 0.8),
      charisma: range(0.4, 0.85),
    },
    likelyTraits: ["pragmatic", "ambitious", "corrupt"],
    ageRange: { min: 42, max: 72 },
    ideologySpread: 0.6,
  },
  {
    role: "role-labor-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.4, 0.85),
      loyalty: range(0.3, 0.8),
      ambition: range(0.3, 0.75),
      integrity: range(0.4, 0.9),
      charisma: range(0.45, 0.9),
    },
    likelyTraits: ["principled", "charismatic", "pragmatic"],
    ageRange: { min: 40, max: 70 },
    ideologySpread: 0.75,
  },
  {
    role: "role-health-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.55, 0.95),
      loyalty: range(0.3, 0.75),
      ambition: range(0.25, 0.7),
      integrity: range(0.45, 0.9),
      charisma: range(0.3, 0.75),
    },
    likelyTraits: ["cautious", "principled", "pragmatic"],
    ageRange: { min: 44, max: 74 },
    ideologySpread: 0.55,
  },
  {
    role: "role-housing-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.35, 0.8),
      loyalty: range(0.4, 0.85),
      ambition: range(0.3, 0.75),
      integrity: range(0.3, 0.85),
      charisma: range(0.35, 0.8),
    },
    likelyTraits: ["pragmatic", "loyal", "principled"],
    ageRange: { min: 40, max: 70 },
    ideologySpread: 0.7,
  },
  {
    role: "role-transportation-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.45, 0.85),
      loyalty: range(0.35, 0.8),
      ambition: range(0.3, 0.8),
      integrity: range(0.35, 0.85),
      charisma: range(0.35, 0.8),
    },
    likelyTraits: ["pragmatic", "cautious", "ambitious"],
    ageRange: { min: 40, max: 70 },
    ideologySpread: 0.5,
  },
  {
    role: "role-energy-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.55, 0.95),
      loyalty: range(0.3, 0.75),
      ambition: range(0.25, 0.7),
      integrity: range(0.4, 0.85),
      charisma: range(0.2, 0.65),
    },
    likelyTraits: ["cautious", "principled", "pragmatic"],
    ageRange: { min: 44, max: 76 },
    ideologySpread: 0.6,
  },
  {
    role: "role-education-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.4, 0.85),
      loyalty: range(0.35, 0.85),
      ambition: range(0.25, 0.7),
      integrity: range(0.45, 0.9),
      charisma: range(0.4, 0.85),
    },
    likelyTraits: ["principled", "pragmatic", "cautious"],
    ageRange: { min: 40, max: 72 },
    ideologySpread: 0.8,
  },
  {
    role: "role-veterans-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.45, 0.85),
      loyalty: range(0.45, 0.9),
      ambition: range(0.2, 0.6),
      integrity: range(0.45, 0.9),
      charisma: range(0.3, 0.75),
    },
    likelyTraits: ["loyal", "principled", "cautious"],
    ageRange: { min: 45, max: 76 },
    ideologySpread: 0.4,
  },
  {
    role: "role-homeland-secretary",
    cabinet: true,
    attributes: {
      competence: range(0.5, 0.9),
      loyalty: range(0.45, 0.9),
      ambition: range(0.35, 0.8),
      integrity: range(0.3, 0.8),
      charisma: range(0.3, 0.75),
    },
    likelyTraits: ["hawkish", "loyal", "pragmatic"],
    ageRange: { min: 44, max: 74 },
    ideologySpread: 0.5,
  },

  // --- The branch below the cabinet ----------------------------------------
  //
  // Competence runs high and charisma low because that is what the seat is
  // actually selected for: an agency head is confirmed on a record, not on a
  // podium. Loyalty is the reading that matters and it is deliberately the
  // narrowest window in the table — a career administrator who is loyal to the
  // president the way a Secretary is would be a different kind of appointment,
  // and one the statute they administer would not survive.
  {
    role: AGENCY_HEAD_ROLE,
    cabinet: false,
    attributes: {
      competence: range(0.5, 0.9),
      loyalty: range(0.2, 0.6),
      ambition: range(0.15, 0.55),
      integrity: range(0.45, 0.9),
      charisma: range(0.2, 0.65),
    },
    likelyTraits: ["cautious", "principled", "pragmatic"],
    ageRange: { min: 46, max: 70 },
    ideologySpread: 0.35,
  },
];

export const roleProfiles: RoleProfile[] = ROLE_PROFILE_INPUTS.map((input) => RoleProfile.parse(input));

/**
 * How often a person drawn for a seat carries a second trait from its
 * `likelyTraits`, beside the one they always take from it. Here beside the
 * lists because it is half of what a list means: the engine draws with it, and
 * reads a seat's expected trait mix off it, so the two cannot disagree.
 */
export const SECOND_TRAIT_CHANCE = 0.6;

// The vacancy benches are looked up like any seat but are not pooled seats.
export const roleProfileByRole: ReadonlyMap<string, RoleProfile> = new Map([...roleProfiles, ...VACANCY_BENCH_ROLE_PROFILES].map((p) => [p.role, p]));

// Which name bank each nation draws from. Cultures are grouped by naming
// convention, not by politics or geography: what matters is only whether a
// generated name reads as belonging to that country.
const NATION_NAME_CULTURE: Record<string, AnyNameCulture> = {
  // Six heritage groups counted from the Census and SSA records rather than the
  // Anglo bank the United States shares with Britain (name-cultures.ts).
  USA: "american",
  GBR: "anglo",
  CAN: "anglo",
  AUS: "anglo",
  MEX: "hispanic",
  COL: "hispanic",
  VEN: "hispanic",
  CUB: "hispanic",
  ESP: "hispanic",
  BRA: "lusophone",
  DEU: "germanic",
  CHE: "germanic",
  SWE: "nordic",
  ISL: "nordic",
  FRA: "french",
  ITA: "italian",
  RUS: "russian",
  UKR: "ukrainian",
  // Belarus's public life is conducted in Russian and its officials carry
  // Russian forms of their names.
  BLR: "russian",
  POL: "polish",
  HUN: "hungarian",
  TUR: "turkish",
  SAU: "gulf-arabic",
  ARE: "gulf-arabic",
  EGY: "arabic",
  IRQ: "arabic",
  SYR: "arabic",
  YEM: "gulf-arabic",
  MAR: "maghrebi",
  DZA: "maghrebi",
  IRN: "persian",
  ISR: "hebrew",
  IND: "south-asian",
  PAK: "south-asian",
  BGD: "south-asian",
  AFG: "afghan",
  KAZ: "kazakh",
  CHN: "han",
  TWN: "han",
  SGP: "han",
  JPN: "japanese",
  KOR: "korean",
  PRK: "korean",
  VNM: "vietnamese",
  NGA: "nigerian",
  ETH: "ethiopian",
  // Kinyarwanda names, shared with Burundi's Kirundi ones; the east-african
  // bank is Ethiopia's, which no Rwandan official is called.
  RWA: "great-lakes",
  ZAF: "south-african",
  COD: "central-african",
  IDN: "indonesian",
  NLD: "dutch",
  // Flemish and Walloon names both occur in Belgian public life; the Dutch
  // bank carries the majority convention and the surnames that read Belgian.
  BEL: "dutch",
  IRL: "anglo",
  NOR: "nordic",
  DNK: "nordic",
  ARG: "hispanic",
  CHL: "hispanic",
  QAT: "gulf-arabic",
  // Malays name by the father, with bin or binti, and carry Malay given names
  // rather than Javanese ones; a quarter of the country is Chinese.
  MYS: "malaysian",
  // Spanish given names and Spanish surnames are what a Filipino official is
  // actually called, three centuries after the surname decree that set them.
  PHL: "hispanic",
  THA: "thai",
};

/** The naming tradition a nation's people are drawn from; a nation with none mapped is a defect, not an Anglo country. */
export function nameCultureFor(nation: string): AnyNameCulture {
  const culture = NATION_NAME_CULTURE[nation] ?? ROSTER_NAME_CULTURE[nation];
  if (!culture) throw new Error(`no name culture mapped for nation ${nation}`);
  return culture;
}

export function nameBankFor(nation: string): NameBank {
  return ALL_NAME_BANKS[nameCultureFor(nation)];
}

// An NPC nation only ever shows the player whoever currently holds its seats,
// so three is depth enough to keep two campaigns from being staffed alike.
const DEPTH_PER_ROLE = 3;

/**
 * A thin state shows the player one person per seat and is rarely looked at
 * twice; a bench of three there is people nobody meets, carried in every save.
 */
const DEPTH_BY_FIDELITY: Readonly<Record<NationFidelity, number>> = {
  full: DEPTH_PER_ROLE,
  standard: DEPTH_PER_ROLE,
  thin: 1,
};

// The player's own nation is the only pool a campaign ever hires out of, and it
// is hired out of for the whole campaign — every dismissal, every resignation,
// every minister who dies in office draws from this one bench. Eight per seat
// is what keeps a long game from running out of country. The founding shortlist
// is capped separately (`SHORTLIST_DEPTH`): a deep bench and a long menu at
// character creation are different things, and only the first is wanted.
const PLAYER_DEPTH_PER_ROLE = 8;
const US_GOVERNOR_DEPTH = 50;

/**
 * Extra governor-eligible members per major party, appended past the fifty.
 *
 * The fifty are exactly the fifty statehouses, so the bench is empty the moment
 * founding seats them — and a gubernatorial election with nobody to seat cannot
 * change a seat's party, which is the whole of what a gubernatorial election
 * does. Two terms put about fifty races on the calendar and a handful of them
 * change hands, so eight of each party is depth enough for a full presidency
 * with room left over.
 *
 * Per party rather than as a flat depth, because the shortfall is always
 * partisan: a seat flips to the party that does not hold it, and a pool that
 * came up eight Democrats and none of anyone else would leave half the map
 * unflippable. The engine appends them on keys past the fifty so no name, no
 * face and no career line the fifty already hold moves.
 */
export const US_GOVERNOR_BENCH_PER_PARTY = 8;

const GOVERNOR_ROLE = "role-governor";

/**
 * Deep enough to seat every leadership office in the institution catalog that
 * no cabinet secretary already runs, with room for the catalog to grow.
 *
 * The engine seats these at founding rather than opening the whole branch
 * headless, so a bench shorter than the catalog would leave real agencies
 * unled for no reason a player could read. The engine's own founding test is
 * what holds the two numbers together.
 */
const US_AGENCY_HEAD_DEPTH = 60;

/**
 * Deep enough to seat a chair and a ranking member on every Senate committee
 * the institution catalog refers a confirmation to, plus the two committee
 * gavels the Hill's own leadership posts hold.
 *
 * Eight was the whole bench before the panels were seated, which is why twelve
 * of the thirteen committees had nobody in the chair and the committee stage of
 * a nomination could only ever read the room. The engine's own committee test
 * is what holds the two numbers together.
 */
const US_COMMITTEE_CHAIR_DEPTH = 34;
const COMMITTEE_CHAIR_ROLE = "role-committee-chair";

/**
 * The seats that exist in one country only.
 *
 * Every charter but the American one seats a head of government, a foreign,
 * treasury, defense and interior minister, an intelligence director, a court
 * chancellor or an electoral-affairs minister, and stops. Nothing abroad seats
 * a Secretary of Veterans Affairs, an attorney general, a committee chair or a
 * bureau administrator — those are American offices, and only
 * `CHARTER_USA_CONSTITUTION` fills them.
 *
 * Staffing them everywhere anyway put thirty-nine people in every foreign
 * capital who could never hold the chair they were drawn for, and — because the
 * career prose for an American seat is written in American institutional
 * vocabulary — gave each of them a life that ran through a state department of
 * agriculture, a county health system or a federal consent decree. There is no
 * surface where a player needs a Norwegian homeland secretary, and there is a
 * surface where they can read one: the person route opens any pool person, and
 * the relationship graph ties a foreign head of government to their own
 * country's pool.
 *
 * Governors and bureau chiefs were always on this list. The rest joined it for
 * the same reason.
 */
export const US_ONLY_ROLES: readonly string[] = [
  GOVERNOR_ROLE,
  AGENCY_HEAD_ROLE,
  COMMITTEE_CHAIR_ROLE,
  "role-congressional-leader",
  "role-attorney-general",
  ...DEPARTMENT_SECRETARY_ROLES,
  VICE_PRESIDENT_ROLE_ID,
  ...WHITE_HOUSE_STAFF_ROLE_IDS,
];

export const personPoolSpecs: PersonPoolSpec[] = worldNations.map((nation) =>
  PersonPoolSpec.parse({
    nation: nation.id,
    nameCulture: nameCultureFor(nation.id),
    roles: nation.id === US_ID ? ALL_ROLES : ALL_ROLES.filter((role) => !US_ONLY_ROLES.includes(role as string)),
    depthPerRole: nation.playable ? PLAYER_DEPTH_PER_ROLE : DEPTH_BY_FIDELITY[nation.fidelity],
    ...(nation.id === US_ID
      ? {
          roleDepth: {
            [GOVERNOR_ROLE]: US_GOVERNOR_DEPTH,
            [AGENCY_HEAD_ROLE]: US_AGENCY_HEAD_DEPTH,
            [COMMITTEE_CHAIR_ROLE]: US_COMMITTEE_CHAIR_DEPTH,
          },
        }
      : {}),
  }),
);

export const personPoolSpecByNation: ReadonlyMap<string, PersonPoolSpec> = new Map(
  personPoolSpecs.map((s) => [s.nation as string, s]),
);
