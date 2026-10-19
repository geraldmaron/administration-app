import { RoleProfile } from "../schemas/people-pool.js";
import type { PortraitAttire } from "../schemas/portrait.js";

// The seats a vacancy draws a bench for when the campaign's own cast cannot
// staff one: a federal court and the Chairman of the Joint Chiefs. The pooled
// cast has no sitting judges and almost no serving officers, because no
// charter seat is drawn from either life, so a vacancy on the bench was offered
// politicians who had read law, and the Joint Chiefs a civilian.
//
// Deliberately not in ALL_ROLES. The pool walks ALL_ROLES to seed every cast,
// and a role there would add people to every nation on every seed. These are
// drawn only by the engine, once, when a seat opens, and stored with the
// campaign (packages/engine/src/appointment-bench.ts).

export const FEDERAL_JUDGE_ROLE = "role-federal-judge";
export const MAYOR_ROLE = "role-mayor";
export const GENERAL_OFFICER_ROLE = "role-general-officer";

const range = (min: number, max: number) => ({ min, max });

export const VACANCY_BENCH_ROLE_PROFILES: readonly RoleProfile[] = [
  // A named municipal officer, materialized when a case introduces them. These
  // fictional ranges reuse the elected-governor baseline, not an empirical rating.
  { role: MAYOR_ROLE, cabinet: false, attributes: { competence: range(0.4, 0.9), loyalty: range(0.3, 0.8),
    ambition: range(0.45, 0.95), integrity: range(0.25, 0.85), charisma: range(0.4, 0.9) },
    likelyTraits: ["ambitious", "pragmatic", "charismatic"], ageRange: { min: 38, max: 74 }, ideologySpread: 0.85 },
  // Selected for a record a Judiciary Committee can read: competence and
  // integrity run high. Loyalty is low because the seat is held for life and
  // answers to no one who appointed it.
  {
    role: FEDERAL_JUDGE_ROLE,
    cabinet: false,
    attributes: {
      competence: range(0.55, 0.92),
      loyalty: range(0.15, 0.5),
      ambition: range(0.2, 0.65),
      integrity: range(0.5, 0.92),
      charisma: range(0.2, 0.6),
    },
    likelyTraits: ["principled", "cautious", "pragmatic"],
    ageRange: { min: 44, max: 66 },
    ideologySpread: 0.7,
  },
  // A four-star officer: competence and loyalty to the chain of command,
  // little appetite for a podium, and politics kept narrow.
  {
    role: GENERAL_OFFICER_ROLE,
    cabinet: false,
    attributes: {
      competence: range(0.55, 0.92),
      loyalty: range(0.5, 0.9),
      ambition: range(0.3, 0.7),
      integrity: range(0.5, 0.9),
      charisma: range(0.25, 0.65),
    },
    likelyTraits: ["cautious", "hawkish", "loyal"],
    ageRange: { min: 52, max: 63 },
    ideologySpread: 0.3,
  },
].map((input) => RoleProfile.parse(input));

/**
 * How a bench's portraits dress: a judge sits for a portrait in the robe, an
 * officer in uniform. Kept beside the profiles rather than in the pooled
 * seats' attire table, which is ALL_ROLES one for one.
 */
export const VACANCY_BENCH_ATTIRE: Readonly<Record<string, ReadonlyArray<{ readonly value: PortraitAttire; readonly weight: number }>>> = {
  [MAYOR_ROLE]: [{ value: "business", weight: 1 }],
  [FEDERAL_JUDGE_ROLE]: [
    { value: "ceremonial", weight: 0.7 },
    { value: "business", weight: 0.3 },
  ],
  [GENERAL_OFFICER_ROLE]: [
    { value: "military", weight: 0.9 },
    { value: "business", weight: 0.1 },
  ],
};
