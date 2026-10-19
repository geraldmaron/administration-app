import type { BudgetAccount } from "./budget.js";
import type { Campaign, Congress, Favor, HillFigure, HillPostId, PersonRuntime } from "./state.js";
import { lobbyFavorWhat } from "./lobbying-favors.js";
import { EMPTY_TIE } from "./ties.js";

// Bringing a save from before v63 onto the relationship ledger.
//
// Before v63 a Hill member's warmth was stored on the post they held, and a
// landed budget negotiation was a promise kept on the Congress keyed by post.
// Both now live on the person. The figure's number is moved to its holder's
// rapport unchanged, and each promise becomes a favor the President owes the
// member who holds that post, with the same id, bill, reserve and settlement.

type LegacyFigure = HillFigure & { readonly disposition?: number };

type LegacyPromise = {
  readonly id: string;
  readonly post: HillPostId;
  readonly billId: string;
  readonly title: string;
  readonly actId: string;
  readonly openedTurn: number;
  readonly lobbyId: string;
  readonly status: "open" | "kept" | "broken";
  readonly reservedTreasury: number;
  readonly account?: BudgetAccount;
  readonly settledTurn?: number;
};

type LegacyCongress = Omit<Congress, "leadership"> & {
  readonly leadership: readonly LegacyFigure[];
  readonly promises?: readonly LegacyPromise[];
};

type People = Record<string, PersonRuntime>;

function favorOf(promise: LegacyPromise): Favor {
  const status = promise.status === "open" ? "open" : promise.status === "kept" ? "repaid" : "defaulted";
  return {
    id: promise.id,
    direction: "owed-by-president",
    what: lobbyFavorWhat(promise.title),
    openedTurn: promise.openedTurn,
    status,
    ...(promise.settledTurn !== undefined ? { settledTurn: promise.settledTurn } : {}),
    billId: promise.billId,
    actId: promise.actId,
    post: promise.post,
    lobbyId: promise.lobbyId,
    reservedTreasury: promise.reservedTreasury,
    ...(promise.account ? { account: promise.account } : {}),
  };
}

function withRapport(people: People, figure: LegacyFigure): People {
  const runtime = people[figure.person as string];
  if (!runtime || figure.disposition === undefined) return people;
  const tie = runtime.tie ?? EMPTY_TIE;
  return { ...people, [figure.person as string]: { ...runtime, tie: { ...tie, rapport: figure.disposition } } };
}

function withFavor(people: People, holder: string | undefined, promise: LegacyPromise): People {
  const runtime = holder === undefined ? undefined : people[holder];
  if (!runtime) return people;
  const tie = runtime.tie ?? EMPTY_TIE;
  return { ...people, [holder as string]: { ...runtime, tie: { ...tie, favors: [...tie.favors, favorOf(promise)] } } };
}

/**
 * Move every figure's disposition and every promise onto the people they
 * belong to. A promise whose post nobody holds any longer has no member to
 * owe, and is the one thing a pre-v63 save can lose on the way in; a promise
 * did not record who it was made with, only where they sat.
 */
export function withTieLedger(campaign: Campaign): Campaign {
  const congress = campaign.congress as unknown as LegacyCongress;
  const holderOf = new Map(congress.leadership.map((figure) => [figure.post, figure.person as string]));
  const rapport = congress.leadership.reduce<People>(withRapport, { ...campaign.people });
  const people = (congress.promises ?? []).reduce<People>(
    (current, promise) => withFavor(current, holderOf.get(promise.post), promise),
    rapport,
  );
  const { promises: _promises, ...rest } = congress;
  const leadership = congress.leadership.map(({ disposition: _disposition, ...figure }) => figure);
  return { ...campaign, people, congress: { ...rest, leadership } as Congress };
}
