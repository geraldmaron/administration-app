import type { RoleId } from "../schemas/ids.js";
import { RoleProfile, PersonPoolSpec, type NameBank } from "../schemas/people-pool.js";
import { type AnyNameCulture } from "./name-cultures.js";
export declare const CABINET_ROLES: readonly ["role-prime-minister", "role-president", "role-monarch", "role-junta-chairman", "role-first-councillor", "role-council-chair", "role-court-chancellor", "role-foreign-minister", "role-treasury-minister", "role-defense-minister", "role-interior-minister", "role-intelligence-director", "role-electoral-affairs-minister", "role-attorney-general"];
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
export declare const DEPARTMENT_SECRETARY_ROLES: readonly ["role-agriculture-secretary", "role-commerce-secretary", "role-labor-secretary", "role-health-secretary", "role-housing-secretary", "role-transportation-secretary", "role-energy-secretary", "role-education-secretary", "role-veterans-secretary", "role-homeland-secretary"];
export declare const NON_CABINET_ROLES: readonly ["role-opposition-leader", "role-journalist", "role-congressional-leader", "role-committee-chair", "role-governor"];
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
export declare const AGENCY_HEAD_ROLE = "role-agency-head";
export declare const ALL_ROLES: readonly RoleId[];
export declare const roleProfiles: RoleProfile[];
/**
 * How often a person drawn for a seat carries a second trait from its
 * `likelyTraits`, beside the one they always take from it. Here beside the
 * lists because it is half of what a list means: the engine draws with it, and
 * reads a seat's expected trait mix off it, so the two cannot disagree.
 */
export declare const SECOND_TRAIT_CHANCE = 0.6;
export declare const roleProfileByRole: ReadonlyMap<string, RoleProfile>;
/** The naming tradition a nation's people are drawn from; a nation with none mapped is a defect, not an Anglo country. */
export declare function nameCultureFor(nation: string): AnyNameCulture;
export declare function nameBankFor(nation: string): NameBank;
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
export declare const US_GOVERNOR_BENCH_PER_PARTY = 8;
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
export declare const US_ONLY_ROLES: readonly string[];
export declare const personPoolSpecs: PersonPoolSpec[];
export declare const personPoolSpecByNation: ReadonlyMap<string, PersonPoolSpec>;
