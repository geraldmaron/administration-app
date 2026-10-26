import type { PersonId } from "@admin/world";
import type { Campaign, HillFigure, PersonRuntime } from "./state.js";
import type { Favor, FavorStatus, Tie, TieGrudge } from "./state-ties.js";
import { grievanceHalfLifeDays, retained } from "./relationships.js";
import { elapsedDays } from "./pace.js";

// The one place a tie is read and the one place it is written.
//
// A tie is written only by `apply`, through the `tie` effect, and every write
// names its cause: a member who turned cold has to be explainable from the
// record, or the whip count is a number the player cannot argue with.

/** Neither warm nor cold. What a person nobody has dealt with reads as. */
export const NEUTRAL_RAPPORT = 0.5;
/** Neither proven nor broken. */
export const NEUTRAL_TRUST = 0.5;

/** The tie someone holds before anything the President did has reached them. */
export const EMPTY_TIE: Tie = { rapport: NEUTRAL_RAPPORT, trust: NEUTRAL_TRUST, favors: [], grudges: [] };

export type FavorSettlement = {
  readonly id: string;
  readonly status: Exclude<FavorStatus, "open">;
  readonly turn: number;
};

/**
 * One change to one person's tie. Every part is optional and they apply in the
 * order listed, so a play that moves a member and records what they were
 * promised is one effect with one cause.
 */
export type TieEffect = {
  readonly kind: "tie";
  readonly person: PersonId;
  /** Why it moved, in the words the record would use. Required and never empty. */
  readonly cause: string;
  readonly rapport?: { readonly set: number } | { readonly delta: number };
  readonly trust?: { readonly delta: number };
  readonly openFavor?: Favor;
  readonly settleFavor?: FavorSettlement;
  readonly grudge?: TieGrudge;
};

type People = Readonly<Record<string, PersonRuntime>>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

export function tieOf(people: People, person: PersonId | string): Tie | undefined {
  return people[person as string]?.tie;
}

export function rapportOf(people: People, person: PersonId | string): number {
  return tieOf(people, person)?.rapport ?? NEUTRAL_RAPPORT;
}

/** People have no vengefulness trait; their dated injuries use the shared midpoint half-life. */
export function personalGrudgeWeight(campaign: Pick<Campaign, "people" | "turn">, person: PersonId | string): number {
  return (tieOf(campaign.people, person)?.grudges ?? []).reduce((sum, grudge) =>
    sum + grudge.weight * retained(elapsedDays(campaign.turn - grudge.turn), grievanceHalfLifeDays(0.5)), 0);
}

/** How warm the member holding a Hill post is toward the administration. */
export function figureRapport(people: People, figure: HillFigure): number {
  return rapportOf(people, figure.person);
}

/** The same people, with one person's rapport read as something else: for a projection, never a write. */
export function withRapportRead(people: People, person: PersonId | string, rapport: number): People {
  const runtime = people[person as string];
  if (!runtime) return people;
  return { ...people, [person as string]: { ...runtime, tie: { ...(runtime.tie ?? EMPTY_TIE), rapport } } };
}

export type HeldFavor = Favor & { readonly holder: PersonId };

/**
 * Every favor the President still owes, oldest first.
 *
 * Ordered by when it was given and then by id, which is the order the ledger
 * recorded them in, so a sum over them adds in the same order every time.
 */
export function openFavorsOwedByPresident(campaign: Pick<Campaign, "people">): readonly HeldFavor[] {
  return Object.values(campaign.people)
    .flatMap((runtime) =>
      (runtime.tie?.favors ?? [])
        .filter((favor) => favor.status === "open" && favor.direction === "owed-by-president")
        .map((favor): HeldFavor => ({ ...favor, holder: runtime.base.id })),
    )
    .sort((a, b) => a.openedTurn - b.openedTurn || a.id.localeCompare(b.id));
}

function movedRapport(tie: Tie, change: TieEffect["rapport"]): number {
  if (change === undefined) return tie.rapport;
  if ("set" in change) return change.set;
  return round3(clamp01(tie.rapport + change.delta));
}

function settled(favors: readonly Favor[], settlement: FavorSettlement | undefined): readonly Favor[] {
  if (!settlement) return favors;
  if (!favors.some((favor) => favor.id === settlement.id)) {
    throw new Error(`tie: no favor ${settlement.id} to settle`);
  }
  return favors.map((favor) =>
    favor.id === settlement.id ? { ...favor, status: settlement.status, settledTurn: settlement.turn } : favor,
  );
}

function changedTie(tie: Tie, effect: TieEffect): Tie {
  const opened = effect.openFavor ? [...tie.favors, effect.openFavor] : tie.favors;
  return {
    rapport: movedRapport(tie, effect.rapport),
    trust: effect.trust ? round3(clamp01(tie.trust + effect.trust.delta)) : tie.trust,
    favors: settled(opened, effect.settleFavor),
    grudges: effect.grudge ? [...tie.grudges, effect.grudge] : tie.grudges,
  };
}

/** One tie effect folded into a people table. The handler `apply` runs, and the one founding seats the Hill with. */
export function withTie(people: People, effect: TieEffect): People {
  if (!effect.cause.trim()) throw new Error("tie effect rejected: a cause is required");
  const runtime = people[effect.person as string];
  if (!runtime) throw new Error(`no person ${effect.person} to apply a tie effect to`);
  return { ...people, [effect.person as string]: { ...runtime, tie: changedTie(runtime.tie ?? EMPTY_TIE, effect) } };
}

export function applyTie(state: Campaign, effect: TieEffect): Campaign {
  return { ...state, people: withTie(state.people, effect) as Campaign["people"] };
}

/**
 * Settle every open favor the President owes on a bill: repaid when it became
 * law, defaulted when it died. Part of writing the bill, so no law or death can
 * leave a claim on it open.
 */
export function settleFavorsOnBill(state: Campaign, billId: string, status: "repaid" | "defaulted", turn: number): Campaign {
  const due = openFavorsOwedByPresident(state).filter((favor) => favor.billId === billId);
  if (due.length === 0) return state;
  const cause = status === "repaid" ? "The bill they were promised became law." : "The bill they were promised died.";
  const people = due.reduce<People>(
    (current, favor) => withTie(current, { kind: "tie", person: favor.holder, cause, settleFavor: { id: favor.id, status, turn } }),
    state.people,
  );
  return { ...state, people: people as Campaign["people"] };
}
