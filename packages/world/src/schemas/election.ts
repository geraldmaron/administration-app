import { z } from "zod";
import { StateId } from "./state.js";

// What the United States' own election calendar is made of: which third of the
// Senate a state votes on, how long its governor serves and when that term runs
// out, and the rule a contest inside the state is decided under.
//
// None of it was on the board. The federal calendar gave every state the same
// election in the same November, so a Senate map had all hundred seats up at
// once and every governor stood on the presidential year — which is not a
// simplification of American elections, it is a different country's.
//
// Dated rather than timeless. A senate class's party and a governor's term end
// are facts as of a day, and a table that stated them without one would read as
// permanent and quietly go stale, which is the defect `LEADER_TABLE_AS_OF`
// exists to prevent for the leader table.

/**
 * A party as the United States tables name one.
 *
 * Spelled here rather than imported, because the engine holds the union the
 * simulation reads (`UsParty`) and the world package cannot depend on the
 * engine. The three strings are the same three the engine's union and
 * `women-in-cabinet.ts` already use, so a row parses into the engine's type
 * without translation.
 */
export const UsPartyId = z.enum(["democrat", "republican", "independent"]);
export type UsPartyId = z.infer<typeof UsPartyId>;

/** An ISO calendar day, as every dated dataset row states one. */
const AsOfDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * One Senate seat's class and who holds it.
 *
 * The class assignment itself — which two of the three classes each state votes
 * in — is structural and already held in the engine's own table. This row is the
 * sourced half: which party holds the seat of that class, on the day the table
 * was taken.
 */
export const SenateClassRow = z.object({
  state: StateId,
  senateClass: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  party: UsPartyId,
  asOf: AsOfDate,
});
export type SenateClassRow = z.infer<typeof SenateClassRow>;

/**
 * How a state's House seats were held on the day the roster was taken.
 *
 * The opening map of the House, by party, with the empty seats counted as
 * empty. The engine seats the chamber from it and moves seats from it only
 * through elections. `source` is the roster the counts were taken from.
 */
export const HouseDelegationRow = z.object({
  state: StateId,
  democrat: z.number().int().nonnegative(),
  republican: z.number().int().nonnegative(),
  independent: z.number().int().nonnegative(),
  vacant: z.number().int().nonnegative(),
  source: z.string().url(),
  asOf: AsOfDate,
});
export type HouseDelegationRow = z.infer<typeof HouseDelegationRow>;

/** How long a state's governor serves, and when the current term runs out. */
export const GovernorTermRow = z.object({
  state: StateId,
  termYears: z.union([z.literal(2), z.literal(4)]),
  nextElection: AsOfDate,
  asOf: AsOfDate,
});
export type GovernorTermRow = z.infer<typeof GovernorTermRow>;

/**
 * The rule a contest inside one state is decided under.
 *
 * A runoff threshold below 0.5 means a plurality carries. `allocation` is how
 * the state hands out its electoral votes: `winner-take-all` for most,
 * `by-district` for the two that split them. `twoYearTerm` marks a state whose
 * governor stands every other year, which is the one case a four-year federal
 * cycle cannot express.
 *
 * `consecutiveTermLimit` is how many terms in a row a governor may serve before
 * the state's own constitution takes them off the ballot; `null` is a state that
 * does not limit them at all, which is a fact about the state and not a missing
 * row. A governor who cannot stand again answers a federal request from a
 * different place than one who has to face the voters over it, which is the one
 * thing this number is read for.
 */
export const ElectionRule = z.object({
  state: StateId,
  runoffThreshold: z.number().min(0).max(1),
  allocation: z.enum(["winner-take-all", "by-district"]),
  twoYearTerm: z.boolean(),
  consecutiveTermLimit: z.number().int().positive().nullable(),
  asOf: AsOfDate,
});
export type ElectionRule = z.infer<typeof ElectionRule>;
