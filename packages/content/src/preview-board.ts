import {
  apply,
  campaignDay,
  coalitionFlag,
  draftCabinetCandidates,
  enactPolicy,
  generateFoundingPool,
  defaultLeaderDraft,
  deriveImplementationQuality,
  institutionDef,
  makeCampaignSeed,
  openConflict,
  openPursuit,
  relationshipKey,
  sealFounding,
  type Campaign,
} from "@admin/engine";
import { defaultFlagDesign, worldDataset, type Person, type RoleId } from "@admin/world";
import type { InstrumentId, RungLevel } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";

// Real seals of the real dataset. Content is judged against the world as
// shipped, not against a hand-written stand-in — a scenario that casts
// cleanly on an invented board and never binds on a real one is exactly the
// defect this module exists to make visible.
//
// This lives in src rather than __fixtures__ because "does this scenario ever
// reach a player" is a production question the publish gate asks, not a thing
// only tests care about.

export function sealedCampaign(
  seedLabel = "content-tests",
  charterId?: string,
  cradleId?: string,
  // Which country the campaign is founded on. The first playable nation is the
  // default and is what almost every board wants; a board exists to make some
  // board state reachable, and a few of those states are facts about the
  // player's own country — being landlocked, holding a compact — which no
  // amount of patching the default founding can produce.
  nationId?: string,
): Campaign {
  const seed = makeCampaignSeed(seedLabel);
  const nation = nationId
    ? worldDataset.nations.find((candidate) => candidate.id === nationId)
    : worldDataset.nations.find((candidate) => candidate.playable);
  const charter = charterId
    ? worldDataset.charters.find((candidate) => candidate.id === charterId)
    : worldDataset.charters[0];
  const cradle = cradleId ? worldDataset.cradles.find((candidate) => candidate.id === cradleId) : worldDataset.cradles[0];
  if (!nation || !charter || !cradle) throw new Error("the shipped dataset lacks a playable founding");
  const pool = generateFoundingPool(seed, worldDataset);
  const slate = draftCabinetCandidates(charter, nation.id, pool);
  const cabinet = Object.fromEntries(
    Object.entries(slate).flatMap(([role, people]) => (people[0] ? [[role, people[0].id] as const] : [])),
  ) as Record<RoleId, Person["id"]>;
  return sealFounding(seed, worldDataset, {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Test Leader",
    title: "Chancellor",
    charterId: charter.id,
    cradleId: cradle.id,
    compactIds: [],
    cabinet,
    flag: defaultFlagDesign,
    leader: { ...defaultLeaderDraft(), name: "Test Leader" },
  });
}

/**
 * The same campaign with every player relationship flattened and one edge
 * retuned — how tests stage "this nation is a friend" or "this nation is the
 * adversary" without inventing a board.
 */
export function withLoneEdge(campaign: Campaign, to: string, patch: { trust: number; tension: number }): Campaign {
  const relationships = Object.fromEntries(
    Object.entries(campaign.relationships).map(([key, edge]) => {
      if (edge.from !== campaign.founding.nation) return [key, edge];
      if (edge.to === to) return [key, { ...edge, ...patch }];
      return [key, { ...edge, trust: 0, tension: 0 }];
    }),
  );
  return { ...campaign, relationships };
}

/**
 * The deeds a set of scenarios waits on, as a board would carry them, and the
 * key that keeps two batches waiting on different deeds from sharing a board.
 * A supplement board carries the state a gate needs; a reader gated on that
 * state and on an earlier deed was unreachable on it for want of the deed,
 * which the canonical boards are already told about and these were not.
 */
export function deedsWaitedOn(defs: readonly ScenarioDef[]): { readonly flags: Record<string, boolean>; readonly key: string } {
  const names = [
    ...new Set(defs.flatMap((def) => def.conditions).flatMap((condition) => (condition.kind === "flag" && condition.is ? [condition.flag] : []))),
  ].sort();
  return { flags: Object.fromEntries(names.map((name) => [name, true])), key: names.join(",") };
}

export function withFlags(campaign: Campaign, flags: Record<string, boolean>): Campaign {
  return { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, ...flags } } };
}

/**
 * A campaign that has been going badly. Every sealed founding is a healthy
 * one — full treasury, stability well over half, no removal pressure — so
 * without this board, content written for a government in trouble has nowhere
 * to be true and reads as unreachable for a reason that has nothing to do
 * with its own correctness.
 *
 * The removal arc is stored on the campaign and recomputed only by the turn
 * loop, so a board that never takes a turn has to carry the pressure rather
 * than imply it from a low approval.
 */
export function underStrain(campaign: Campaign): Campaign {
  const strained = {
    ...campaign,
    player: {
      ...campaign.player,
      metrics: {
        ...campaign.player.metrics,
        approval: 0.24,
        treasury: campaign.player.metrics.treasury * 0.6,
        stability: 0.42,
        militaryReadiness: 0.38,
        standing: 0.31,
      },
    },
    removal: { ...campaign.removal, pressure: 0.45 },
  };
  // The country under the government, not only the government's own readings.
  // A sealed founding carries whatever the dataset says, and on the shipped
  // playable nations that is close to nothing, so an `operatorPressure`
  // condition — an insurgency in the provinces, a street that will not go
  // home — had nowhere to be true. A board this far into trouble is exactly
  // where that content belongs.
  return withHollowedBranch(withPlayerStats(strained, { insurgencyPressure: 0.52, protestPressure: 0.61 }));
}

/**
 * The executive branch of a government in this much trouble: work piling up,
 * bodies bent toward the administration's politics, and the offices nobody
 * filled empty for as long as the campaign has run.
 *
 * The same argument the player-stats block above makes, one layer down. A
 * sealed founding hands every institution its day-one reading and the preview
 * boards never simulate a week, so `delivery`, `backlog` and `politicization`
 * sat at their founding values on all eleven boards and no `institutionState`
 * gate about a degraded agency could ever be true on any of them. Content
 * about a hollowing government belongs on the board where the government is
 * hollow.
 *
 * `vacantDays` is set to what the weeks would actually have produced — the
 * tick adds seven days per turn to an office that is still empty — rather than
 * to a dramatic number, so a gate that clears here clears on a real campaign
 * too. `openMatters` is deliberately left alone: an inquiry into one arbitrary
 * agency would be a board that pretends, and content gated on open matters
 * should hand `auditReachability` its own boards instead.
 */
function withHollowedBranch(campaign: Campaign): Campaign {
  const institutions = Object.fromEntries(
    Object.entries(campaign.institutions).map(([id, runtime]) => {
      const def = institutionDef(id);
      const hollowed = {
        ...runtime,
        staffing: runtime.staffing * 0.7,
        morale: runtime.morale * 0.6,
        budgetAdequacy: runtime.budgetAdequacy * 0.75,
        politicization: Math.min(1, runtime.politicization + 0.25),
        backlog: runtime.backlog + 30,
        vacantDays: runtime.vacancy ? campaignDay(campaign) : runtime.vacantDays,
      };
      return [id, def ? { ...hollowed, implementationQuality: deriveImplementationQuality(hollowed, def) } : hollowed];
    }),
  );
  return { ...campaign, institutions };
}

/** The two pressures an `operatorPressure` condition reads, set on the player's own nation. */
function withPlayerStats(campaign: Campaign, pressures: { insurgencyPressure: number; protestPressure: number }): Campaign {
  const id = campaign.founding.nation;
  const runtime = campaign.nations[id];
  if (!runtime) return campaign;
  return {
    ...campaign,
    nations: {
      ...campaign.nations,
      [id]: {
        ...runtime,
        stats: {
          ...runtime.stats,
          security: { ...runtime.stats.security, insurgencyPressure: pressures.insurgencyPressure },
          politics: { ...runtime.stats.politics, protestPressure: pressures.protestPressure },
        },
      },
    },
  };
}

/**
 * A campaign carrying a live war against its own tensest relationship — the
 * `war` class's own counterpart to `underStrain`. Without this board, no
 * `warState: "aggressor" | "defender" | "any"` condition can ever be true on
 * any preview board (none of the sealed foundings starts a war), so the
 * entire prolonged-war half of the `war` class — the front weeks after it
 * opens, the peace terms once it has run — was unreachable for a reason that
 * had nothing to do with its own correctness. The conflict is opened against
 * whichever nation this board's own relationships already read as tensest —
 * which makes this fixture agree with a `tensest` cast by coincidence, and a
 * real board need not. War content binds its counterpart with the
 * `warCounterpart` cast rather than leaning on that coincidence.
 */
function atWar(campaign: Campaign): Campaign {
  const player = campaign.founding.nation;
  const [rival] = [...Object.values(campaign.relationships)]
    .filter((edge) => edge.from === player)
    .sort((a, b) => b.tension - a.tension);
  if (!rival) return campaign;
  const conflict = openConflict(rival.to, player, campaign.turn, "the front this board's fixture opened");
  return { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
}

/**
 * A campaign watching somebody else's war. Content about a war the player is
 * not in — the ally who is actually fighting, the neutrality that costs
 * something — can bind no belligerent on any other board: every fixture that
 * carries a conflict at all puts the player in it, so a `belligerent` cast has
 * nowhere to be true and reads as unreachable for a reason that has nothing to
 * do with its own correctness.
 *
 * The two combatants are the board's own two most charged foreign
 * relationships, so the fixture is a function of the seeded board rather than
 * of a hand-picked pair that a dataset edit could quietly delete.
 */
function thirdPartyWar(campaign: Campaign): Campaign {
  const player = campaign.founding.nation;
  const [first, second] = [...Object.values(campaign.relationships)]
    .filter((edge) => edge.from === player && edge.to !== player)
    .sort((a, b) => b.tension - a.tension || String(a.to).localeCompare(String(b.to)));
  if (!first || !second) return campaign;
  const conflict = openConflict(first.to, second.to, campaign.turn, "the war this board's fixture opened elsewhere");
  return { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
}

/**
 * The war board with the capitals gathered on both sides of it. Coalitions are
 * derived by the turn loop from who is alarmed by whom and stand as a flag
 * while they last, so a board that never takes a turn has to carry them the
 * same way it carries removal pressure. Both subjects are stamped because a
 * war large enough to be worth writing about is one that other governments
 * take sides in — and content may ask about either side of that, the coalition
 * standing against the player or the one standing against the state they are
 * fighting.
 */
function encircled(campaign: Campaign): Campaign {
  const player = campaign.founding.nation;
  const [rival] = [...Object.values(campaign.relationships)]
    .filter((edge) => edge.from === player)
    .sort((a, b) => b.tension - a.tension);
  if (!rival) return campaign;
  return withFlags(campaign, { [coalitionFlag(player)]: true, [coalitionFlag(rival.to)]: true });
}

/**
 * A record long enough for the world to have read it.
 *
 * A `revealedPreference` condition reads a profile derived from the ledger and
 * refuses to answer until the record has actually tested the trait, so on every
 * other board — all of which are campaigns that have committed to nothing at
 * all — the whole condition kind is unreachable, and content written against
 * the player's own pattern would ship dead for a reason that has nothing to do
 * with its own correctness.
 *
 * Two facts are staged, because the profile reads two separate counters. A
 * rival opens a campaign against this government, and it answers three times
 * while that campaign is running: that is the record under pressure. It also
 * turns an instrument on a state it is close to, three times: that is the
 * record with its friends. Which instrument and which rung decides which way
 * every scalar reads, which is why the two poles are one function called twice
 * rather than two fixtures that could drift apart.
 *
 * Written through apply() rather than onto the ledger directly, because the
 * commitment a fixture claims should be the one a real answer would leave.
 */
function withRecord(campaign: Campaign, pressed: RecordedAnswer, towardFriend: RecordedAnswer): Campaign {
  const player = campaign.founding.nation;
  const edges = [...Object.values(campaign.relationships)].filter((edge) => edge.from === player);
  const [rival] = [...edges].sort((a, b) => b.tension - a.tension || String(a.to).localeCompare(String(b.to)));
  const friend = [...edges].sort((a, b) => b.trust - a.trust || String(a.to).localeCompare(String(b.to)))
    .find((edge) => edge.to !== rival?.to);
  if (!rival || !friend) return campaign;

  const pursuit = openPursuit(rival.to, player, "prestige", 1, "diplomatic", 2, "the campaign this board's fixture opened");
  // Trust past the friendly band is what the profile reads as a friendship, and
  // a sealed founding rarely holds one — so the board states it rather than
  // hoping the dataset happens to.
  const staged: Campaign = {
    ...campaign,
    pursuits: { ...campaign.pursuits, [pursuit.id]: pursuit },
    relationships: { ...campaign.relationships, [relationshipKey(player, friend.to)]: { ...friend, trust: FRIENDLY_TRUST } },
  };

  const answers = [
    ...PRESSED_TURNS.map((turn) => ({ turn, target: rival.to, answer: pressed, summary: "This government answered the pressure again." })),
    ...FRIEND_TURNS.map((turn) => ({ turn, target: friend.to, answer: towardFriend, summary: "This government turned an instrument on a state it had been close to." })),
  ];
  return answers.reduce(
    (state, { turn, target, answer, summary }) =>
      apply(state, {
        source: "action",
        actor: "player",
        turn,
        narration: { summary },
        effects: [],
        commitment: { instrument: answer.instrument, rung: answer.rung, target, landed: true },
      }),
    staged,
  );
}

type RecordedAnswer = { readonly instrument: InstrumentId; readonly rung: RungLevel };

/** Well past the profile's friendly band, so the edge reads as a friendship rather than a warm acquaintance. */
const FRIENDLY_TRUST = 0.8;

// Inside the pursuit's open window and interleaved, so the record reads as a
// habit rather than as one afternoon. Three of each is the evidence floor a
// `revealedPreference` condition is held to — a board one commitment lighter
// would make every scenario using the kind unreachable.
const PRESSED_TURNS = [2, 4, 6] as const;
const FRIEND_TURNS = [3, 5, 7] as const;

/** The government that pays: it steps back when pressed and stands by the states it is close to. */
function theGovernmentThatPays(campaign: Campaign): Campaign {
  return withRecord(campaign, { instrument: "diplomatic", rung: 1 }, { instrument: "assistance", rung: 1 });
}

/**
 * The government that climbs: it reaches for the heavy instruments when it is
 * tested, and turns them on its friends too.
 *
 * The opposite pole exists because every scalar has two bounds. With only the
 * soft board, a scenario asking for a government that escalates — or one that
 * has left a friend to it — is refused as unreachable, which would teach a
 * writer that half of this condition kind does not work.
 */
function theGovernmentThatClimbs(campaign: Campaign): Campaign {
  return withRecord(campaign, { instrument: "military", rung: 5 }, { instrument: "economic", rung: 5 });
}

/**
 * A campaign founded on a landlocked compact member, its firmest friendship
 * pointed at a fellow signatory.
 *
 * Two facts about the player's own country had no other board: being
 * landlocked, and sharing a compact with the nation a scenario casts. With
 * the United States the only playable nation, no landlocked founding exists
 * and the board is omitted — a landlocked-player gate is dead content the
 * reachability audit should flag, not a fixture gap. The compact-sharing
 * fact now holds on every board, because the US founds with its real
 * memberships.
 *
 * The host and the partner are read off the dataset rather than named, so the
 * board follows the world instead of a hand-picked pair a dataset edit could
 * quietly delete.
 */
function blocPartner(label: string, turn: number): Campaign | undefined {
  const host = worldDataset.nations.find(
    (candidate) => candidate.playable && !candidate.geo.coastline && candidate.memberships.length > 0,
  );
  const partner = host
    ? worldDataset.nations.find((candidate) => candidate.id !== host.id && candidate.memberships.some((org) => host.memberships.includes(org)))
    : undefined;
  if (!host || !partner) return undefined;
  const campaign = { ...sealedCampaign(label, undefined, undefined, host.id), turn };
  return withLoneEdge(campaign, partner.id, { trust: 0.8, tension: 0.05 });
}

/**
 * A government that has actually legislated. Every sealed founding opens on
 * continuity in all six domains, so a `policyStance` condition naming any real
 * program had nowhere to be true — a rearmament government and a consolidation
 * one drew the identical pool. Enacted through the engine's own path rather
 * than by writing the stance onto the state, so the board carries what a real
 * enactment costs as well as what it declares.
 */
function legislating(campaign: Campaign, stanceId: string): Campaign {
  const result = enactPolicy(campaign, stanceId);
  if (!result.ok) throw new Error(`the preview board cannot enact ${stanceId}: ${result.reason}`);
  return apply(campaign, result.packet);
}

/**
 * The canonical spread a batch is checked for reachability against: a turn
 * range for turn-gated conditions, a charter that actually seats every
 * institution kind (the default charter has no judiciary, so a
 * `charterInstitution` condition on it can never be met), one board in
 * trouble, one board mid-war, and one board watching a war it is not in.
 * `flags` is folded onto the late boards, because a follow-up waits on deeds a
 * fresh campaign has not done. Onto the two late war boards as well as the
 * healthy one: a callback whose earlier deed was itself wartime has nowhere
 * else to be true, and stamping it only on a board with no war makes the flag
 * and the war two filters that can never close together — the scenario is then
 * unwritable for a reason that is about the fixtures, not about the content.
 *
 * The last five carry board state no amount of patching a healthy founding
 * produces: a war the capitals have taken sides in, a government that has
 * actually legislated, a landlocked compact member whose firmest friend is a
 * fellow signatory, and the two poles of a record long enough for the world to
 * have read it — the government that pays and the government that climbs.
 */
export function previewBoards(flags: Record<string, boolean> = {}): readonly Campaign[] {
  const at = (label: string, turn: number, charterId?: string) => ({ ...sealedCampaign(label, charterId), turn });
  const partner = blocPartner("preview-9", 6);
  return [
    at("preview-1", 1),
    at("preview-2", 4),
    withFlags(at("preview-3", 8), flags),
    at("preview-4", 5, "charter-presidential-republic"),
    underStrain(at("preview-5", 9)),
    withFlags(encircled(atWar(at("preview-6", 10))), flags),
    withFlags(thirdPartyWar(at("preview-7", 10)), flags),
    legislating(at("preview-8", 6), "defense-rearmament"),
    theGovernmentThatPays(at("preview-10", 8)),
    theGovernmentThatClimbs(at("preview-11", 8)),
    // Omitted rather than faked when the dataset has no landlocked member to
    // found on: a board that pretends is worse than a board that is missing.
    ...(partner ? [partner] : []),
  ];
}
