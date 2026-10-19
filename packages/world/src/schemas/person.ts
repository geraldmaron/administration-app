import { z } from "zod";
import { PersonId, NationId, RoleId, FactionId, PartyId } from "./ids.js";
import { CareerPost, Education } from "./background.js";

// One pool for every human role: cabinet candidates, NPC
// heads of state and ministers, opposition figures, journalists.
/**
 * The three axes in the fixed order every consumer that iterates them shares —
 * `cohortAffinity` and `stateAffinity` in engine/domestic-signature.ts fold a
 * declared `values` pull against exactly this list, so a fourth axis added
 * here reaches both without either needing to know it exists.
 */
export const IDEOLOGY_AXES = ["economicLeftRight", "authLibertarian", "nationalistGlobalist"] as const;

export type IdeologyAxis = (typeof IDEOLOGY_AXES)[number];

/**
 * What each end of an axis is called: the one table every screen and every
 * dossier reads, because the names are not the polarity their keys suggest.
 * `authLibertarian` is positive toward authority and `nationalistGlobalist` is
 * positive toward the nation, the direction every party platform, counsel
 * reading and alignment term in the engine already uses. The last founding
 * screen labeled both backwards from their keys, and three copies of this
 * table disagreed about which way the world view ran.
 */
export const IDEOLOGY_AXIS_POLES: Readonly<
  Record<IdeologyAxis, { readonly caption: string; readonly negative: string; readonly positive: string }>
> = {
  economicLeftRight: { caption: "Economic policy", negative: "Left", positive: "Right" },
  authLibertarian: { caption: "State authority", negative: "Libertarian", positive: "Authoritarian" },
  nationalistGlobalist: { caption: "World view", negative: "Globalist", positive: "Nationalist" },
};

/** Signed, -1..1 per axis; which way is positive is `IDEOLOGY_AXIS_POLES`. */
export const IdeologyVector = z.object({
  economicLeftRight: z.number().min(-1).max(1),
  authLibertarian: z.number().min(-1).max(1),
  nationalistGlobalist: z.number().min(-1).max(1),
});
export type IdeologyVector = z.infer<typeof IdeologyVector>;

export const PersonTrait = z.enum([
  "ambitious",
  "cautious",
  "loyal",
  "corrupt",
  "principled",
  "charismatic",
  "reclusive",
  "hawkish",
  "dovish",
  "pragmatic",
]);
export type PersonTrait = z.infer<typeof PersonTrait>;

export const Person = z.object({
  id: PersonId,
  name: z.string().min(1),
  nationality: NationId,
  portraitRef: z.string().min(1),
  age: z.number().int().min(18).max(100),
  // A bio is the one piece of prose the player reads about a person, and
  // `min(1)` let a generated stub — a name, a seat, the word "candidate" —
  // satisfy the schema. The floor sits under the shortest hand-authored bio in
  // the dataset, so what it refuses is filler rather than brevity.
  bio: z.string().trim().min(60),
  /**
   * Where they studied and what they have done since. Authored before the
   * attributes below and the reason those attributes are what they are — see
   * `schemas/background.ts`. Required: a person with no education and no career
   * has no explanation for the readings underneath, and every generator writes
   * both.
   */
  education: Education,
  career: z.array(CareerPost),
  ideology: IdeologyVector,
  competence: z.number().min(0).max(1),
  loyalty: z.number().min(0).max(1),
  ambition: z.number().min(0).max(1),
  integrity: z.number().min(0).max(1),
  charisma: z.number().min(0).max(1),
  traits: z.array(PersonTrait),
  eligibleRoles: z.array(RoleId).min(1),
  affiliation: FactionId.optional(),
  // Named ticket on this person's national charter. Optional because a junta
  // person carries none: that charter authors no tickets, and a required field
  // would put one on a politician who never ran under it.
  party: PartyId.optional(),
  /**
   * The town they are from, drawn from their own country's cities.
   *
   * Optional because a country the dataset maps too thinly to tell two people
   * apart says nothing rather than seating its whole cast in one place — never
   * because a person is allowed to have come from nowhere.
   */
  birthplace: z.string().trim().min(1).optional(),
});
export type Person = z.infer<typeof Person>;
