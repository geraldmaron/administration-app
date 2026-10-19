import type { MilitaryBranch } from "@admin/world";

// The eleven unified combatant commands, their maps, and who has them at
// inauguration.
//
// A data table rather than a system: the systems that read it are in
// combatant-commands.ts. Two things in here are authored rather than sourced
// and are marked as such — the peacetime assignment shares, which are a
// plausible laydown rather than a published one, and the officers, who are
// invented because a game that named the serving four-stars would be a game
// that went stale the week one of them retired.
//
// The counts, the split into seven geographic and four functional commands,
// the headquarters and the missions are the structure as recorded by
// Congress's own research service.

export type CombatantCommandId =
  | "CCMD-AFRICOM"
  | "CCMD-CENTCOM"
  | "CCMD-EUCOM"
  | "CCMD-INDOPACOM"
  | "CCMD-NORTHCOM"
  | "CCMD-SOUTHCOM"
  | "CCMD-SPACECOM"
  | "CCMD-CYBERCOM"
  | "CCMD-SOCOM"
  | "CCMD-STRATCOM"
  | "CCMD-TRANSCOM";

export type CommandOfficerSeed = {
  readonly name: string;
  readonly service: MilitaryBranch;
  readonly permanentGrade: string;
  /** Days already served in the chair at inauguration. A commander does not arrive with the president. */
  readonly tenureDays: number;
};

export type CombatantCommandDef = {
  readonly id: CombatantCommandId;
  readonly name: string;
  readonly abbr: string;
  readonly type: "geographic" | "functional";
  readonly headquarters: string;
  readonly mission: string;
  readonly commanderTitle: string;
  /** Shares of each service assigned here in peacetime. Every branch sums to 1 across the eleven. */
  readonly foundingAssignment: Readonly<Record<MilitaryBranch, number>>;
  readonly standingMissions: readonly string[];
  readonly incumbent: CommandOfficerSeed;
  /** Who takes acting command the afternoon the commander is relieved. */
  readonly deputy: CommandOfficerSeed;
};

const none: Readonly<Record<MilitaryBranch, number>> = { army: 0, navy: 0, air: 0, marines: 0, space: 0, cyber: 0 };

export const COMBATANT_COMMANDS: readonly CombatantCommandDef[] = [
  {
    id: "CCMD-NORTHCOM",
    name: "U.S. Northern Command",
    abbr: "NORTHCOM",
    type: "geographic",
    headquarters: "Peterson Space Force Base, Colorado",
    mission: "Defense of the continental United States, and the military relationship with Canada and Mexico.",
    commanderTitle: "Commander, U.S. Northern Command",
    foundingAssignment: { ...none, army: 0.32, navy: 0.1, air: 0.2, marines: 0.05, cyber: 0.05 },
    standingMissions: ["homeland defense", "defense support of civil authorities", "North American aerospace warning"],
    incumbent: { name: "General Marcus Halloran", service: "air", permanentGrade: "Lieutenant General", tenureDays: 690 },
    deputy: { name: "Lieutenant General Dana Roybal", service: "army", permanentGrade: "Major General", tenureDays: 0 },
  },
  {
    id: "CCMD-EUCOM",
    name: "U.S. European Command",
    abbr: "EUCOM",
    type: "geographic",
    headquarters: "Patch Barracks, Stuttgart, Germany",
    mission: "Europe, the Caucasus, Russia and Iceland, and the Atlantic and Arctic approaches.",
    commanderTitle: "Commander, U.S. European Command",
    foundingAssignment: { ...none, army: 0.18, navy: 0.15, air: 0.18, marines: 0.08, cyber: 0.05 },
    standingMissions: ["alliance deterrence", "assurance of treaty allies", "Black Sea and Baltic presence"],
    incumbent: { name: "General Eloise Verrick", service: "army", permanentGrade: "Lieutenant General", tenureDays: 430 },
    deputy: { name: "Lieutenant General Peter Ashcombe", service: "air", permanentGrade: "Major General", tenureDays: 0 },
  },
  {
    id: "CCMD-CENTCOM",
    name: "U.S. Central Command",
    abbr: "CENTCOM",
    type: "geographic",
    headquarters: "MacDill Air Force Base, Florida",
    mission: "Most of the Middle East, Egypt, Central Asia and part of the Indian Ocean.",
    commanderTitle: "Commander, U.S. Central Command",
    foundingAssignment: { ...none, army: 0.14, navy: 0.12, air: 0.14, marines: 0.12, cyber: 0.05 },
    standingMissions: ["freedom of navigation in the Gulf", "counterterrorism", "deterrence of Iran"],
    incumbent: { name: "General Thomas Ndiaye", service: "marines", permanentGrade: "Lieutenant General", tenureDays: 310 },
    deputy: { name: "Vice Admiral Karen Lindqvist", service: "navy", permanentGrade: "Rear Admiral", tenureDays: 0 },
  },
  {
    id: "CCMD-INDOPACOM",
    name: "U.S. Indo-Pacific Command",
    abbr: "INDOPACOM",
    type: "geographic",
    headquarters: "Camp H.M. Smith, Hawaii",
    mission: "The Pacific and much of the Indian Ocean, from the west coast of the Americas to the Indian subcontinent.",
    commanderTitle: "Commander, U.S. Indo-Pacific Command",
    foundingAssignment: { ...none, army: 0.2, navy: 0.4, air: 0.25, marines: 0.65, cyber: 0.05 },
    standingMissions: ["deterrence in the western Pacific", "alliance presence", "freedom of navigation"],
    incumbent: { name: "Admiral Grace Okonjo", service: "navy", permanentGrade: "Vice Admiral", tenureDays: 520 },
    deputy: { name: "Lieutenant General Alan Ferris", service: "marines", permanentGrade: "Major General", tenureDays: 0 },
  },
  {
    id: "CCMD-SOUTHCOM",
    name: "U.S. Southern Command",
    abbr: "SOUTHCOM",
    type: "geographic",
    headquarters: "Miami, Florida",
    mission: "Central America, South America and the Caribbean.",
    commanderTitle: "Commander, U.S. Southern Command",
    foundingAssignment: { ...none, army: 0.03, navy: 0.04, air: 0.02, marines: 0.02, cyber: 0.02 },
    standingMissions: ["counter-narcotics support", "hemispheric partnership", "disaster response"],
    incumbent: { name: "General Rosa Delacroix", service: "army", permanentGrade: "Lieutenant General", tenureDays: 240 },
    deputy: { name: "Rear Admiral Silas Whitmore", service: "navy", permanentGrade: "Rear Admiral", tenureDays: 0 },
  },
  {
    id: "CCMD-AFRICOM",
    name: "U.S. Africa Command",
    abbr: "AFRICOM",
    type: "geographic",
    headquarters: "Kelley Barracks, Stuttgart, Germany",
    mission: "Sub-Saharan Africa and the African littoral, less Egypt.",
    commanderTitle: "Commander, U.S. Africa Command",
    foundingAssignment: { ...none, army: 0.03, navy: 0.02, air: 0.02, marines: 0.03, cyber: 0.02 },
    standingMissions: ["counterterrorism partnership", "maritime security in the Gulf of Guinea", "crisis response"],
    incumbent: { name: "General Wendell Arceneaux", service: "marines", permanentGrade: "Lieutenant General", tenureDays: 180 },
    deputy: { name: "Major General Iris Kovalenko", service: "army", permanentGrade: "Brigadier General", tenureDays: 0 },
  },
  {
    id: "CCMD-SPACECOM",
    name: "U.S. Space Command",
    abbr: "SPACECOM",
    type: "geographic",
    headquarters: "Peterson Space Force Base, Colorado",
    mission: "Space combat power for the joint force, and the space domain above sixty miles.",
    commanderTitle: "Commander, U.S. Space Command",
    foundingAssignment: { ...none, space: 0.7, cyber: 0.05 },
    standingMissions: ["missile warning", "space domain awareness", "satellite protection"],
    incumbent: { name: "General Priya Ramanathan", service: "space", permanentGrade: "Lieutenant General", tenureDays: 400 },
    deputy: { name: "Lieutenant General Owen Brackett", service: "space", permanentGrade: "Major General", tenureDays: 0 },
  },
  {
    id: "CCMD-STRATCOM",
    name: "U.S. Strategic Command",
    abbr: "STRATCOM",
    type: "functional",
    headquarters: "Offutt Air Force Base, Nebraska",
    mission: "Deterring attack on the United States and its allies, and directing the employment of strategic forces.",
    commanderTitle: "Commander, U.S. Strategic Command",
    foundingAssignment: { ...none, navy: 0.1, air: 0.1, space: 0.2, cyber: 0.05 },
    standingMissions: ["strategic deterrence", "nuclear command and control", "global strike planning"],
    incumbent: { name: "Admiral Curtis Vandenberg", service: "navy", permanentGrade: "Vice Admiral", tenureDays: 620 },
    deputy: { name: "Lieutenant General Marguerite Osei", service: "air", permanentGrade: "Major General", tenureDays: 0 },
  },
  {
    id: "CCMD-SOCOM",
    name: "U.S. Special Operations Command",
    abbr: "SOCOM",
    type: "functional",
    headquarters: "MacDill Air Force Base, Florida",
    mission: "Special operations forces, their readiness, and the missions only they are asked to carry.",
    commanderTitle: "Commander, U.S. Special Operations Command",
    foundingAssignment: { ...none, army: 0.1, navy: 0.05, air: 0.05, marines: 0.05, cyber: 0.05 },
    standingMissions: ["counterterrorism", "foreign internal defense", "crisis response"],
    incumbent: { name: "General Nathan Boisvert", service: "army", permanentGrade: "Lieutenant General", tenureDays: 350 },
    deputy: { name: "Rear Admiral Teresa Vogel", service: "navy", permanentGrade: "Rear Admiral", tenureDays: 0 },
  },
  {
    id: "CCMD-TRANSCOM",
    name: "U.S. Transportation Command",
    abbr: "TRANSCOM",
    type: "functional",
    headquarters: "Scott Air Force Base, Illinois",
    mission: "Air, land and sea movement for the whole department, which is what makes any of the rest reach anywhere.",
    commanderTitle: "Commander, U.S. Transportation Command",
    foundingAssignment: { ...none, navy: 0.02, air: 0.04, cyber: 0.01 },
    standingMissions: ["strategic airlift", "sealift readiness", "global distribution"],
    incumbent: { name: "General Alice Thorne", service: "air", permanentGrade: "Lieutenant General", tenureDays: 470 },
    deputy: { name: "Vice Admiral Reuben Calloway", service: "navy", permanentGrade: "Rear Admiral", tenureDays: 0 },
  },
  {
    id: "CCMD-CYBERCOM",
    name: "U.S. Cyber Command",
    abbr: "CYBERCOM",
    type: "functional",
    headquarters: "Fort George G. Meade, Maryland",
    mission: "Cyberspace planning and operations, defensive and offensive, for the joint force.",
    commanderTitle: "Commander, U.S. Cyber Command",
    foundingAssignment: { ...none, space: 0.1, cyber: 0.6 },
    standingMissions: ["defense of the department's networks", "national mission force operations", "election infrastructure support"],
    incumbent: { name: "General Sofia Márquez", service: "cyber", permanentGrade: "Lieutenant General", tenureDays: 280 },
    deputy: { name: "Lieutenant General Bram Feldstein", service: "cyber", permanentGrade: "Major General", tenureDays: 0 },
  },
];

/**
 * Which command a country falls to by its region.
 *
 * A default and not a map: the exceptions below are the part a player can
 * change, and the part that has actually changed in the record.
 */
export const DEFAULT_AOR_BY_REGION: Readonly<Record<string, CombatantCommandId>> = {
  "region-north-america": "CCMD-NORTHCOM",
  "region-caribbean": "CCMD-SOUTHCOM",
  "region-central-america": "CCMD-SOUTHCOM",
  "region-south-america": "CCMD-SOUTHCOM",
  "region-western-europe": "CCMD-EUCOM",
  "region-central-europe": "CCMD-EUCOM",
  "region-eastern-europe": "CCMD-EUCOM",
  "region-northern-europe": "CCMD-EUCOM",
  "region-southern-europe": "CCMD-EUCOM",
  "region-caucasus": "CCMD-EUCOM",
  "region-middle-east": "CCMD-CENTCOM",
  "region-central-asia": "CCMD-CENTCOM",
  "region-south-asia": "CCMD-INDOPACOM",
  "region-east-asia": "CCMD-INDOPACOM",
  "region-southeast-asia": "CCMD-INDOPACOM",
  "region-oceania": "CCMD-INDOPACOM",
  "region-north-africa": "CCMD-AFRICOM",
  "region-west-africa": "CCMD-AFRICOM",
  // Nigeria's region before West Africa had fifteen members; a save founded
  // then still carries it on the nation's base record.
  "region-sub-saharan-africa": "CCMD-AFRICOM",
  "region-east-africa": "CCMD-AFRICOM",
  "region-central-africa": "CCMD-AFRICOM",
  "region-southern-africa": "CCMD-AFRICOM",
};

/**
 * The countries whose command is not the one their neighborhood implies.
 *
 * Every entry is a decision somebody took: Egypt is a Middle Eastern theater's
 * problem rather than Africa's, Turkey is NATO's rather than the Levant's, and
 * Pakistan sits with the Gulf rather than with India — which is exactly why
 * both India and Pakistan being one command's would be the wrong reading.
 */
export const AOR_EXCEPTIONS: Readonly<Record<string, CombatantCommandId>> = {
  EGY: "CCMD-CENTCOM",
  TUR: "CCMD-EUCOM",
  ISR: "CCMD-CENTCOM",
  PAK: "CCMD-CENTCOM",
  AFG: "CCMD-CENTCOM",
  ISL: "CCMD-EUCOM",
  RUS: "CCMD-EUCOM",
};
