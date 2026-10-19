import { congressionalBench, seatCongressMembers, withCongressMemberOffices } from "./congress-members.js";
import {
  LEADER_TABLE_AS_OF,
  defaultFlagDesign,
  deriveBands,
  nationTraitProfiles,
  personPoolSpecs,
  type Charter,
  type CharterId,
  type Cradle,
  type CradleId,
  type FlagDesign,
  type Nation,
  type NationId,
  type OrgId,
  type Person,
  type PersonId,
  type PlankId,
  type RoleId,
  type WhiteHouseStaff,
  type WorldDataset,
} from "@admin/world";
import { candidatesForRole, generateWorldPool } from "./people.js";
import { foundingInstitutions } from "./institutions.js";
import { seatFoundingJustices } from "./judiciary.js";
import { foundingCircuitSeats } from "./lower-bench.js";
import { foundingActings, withCareerIncumbents, withPoliticalActings } from "./career-incumbents.js";
import { foundingTrade } from "./trade.js";
import { foundingSecurity } from "./security.js";
import { foundingOversight } from "./oversight.js";
import { foundingScenarioFamilies } from "./scenario-families.js";
import { hillSeats, withLeadership } from "./hill.js";
import { committeeSeatRoles, withCommittees } from "./committees.js";
import { composeLeader, type LeaderDraft } from "./leader.js";
import { buildInitialRelationships } from "./relationship-graph.js";
import { rollWorldTraits } from "./traits.js";
import { inheritedMetricHistory } from "./inheritance.js";
import { createRngStreams, type CampaignSeed } from "./rng.js";
import { openingCongress } from "./congress.js";
import { sealCaucusAnchor, type AdministrationParty } from "./party.js";
import { openingTermClock } from "./elections.js";
import { openingMood, recomputeApproval } from "./opinion.js";
import { foundingConfirmations } from "./founding-confirmations.js";
import { openingPressCorps, placementFor } from "./press.js";
import { openingPosition } from "./opening-position.js";
import { sustainingBudget } from "./budget.js";
import { inheritedPolicies } from "./policy.js";
import { openingGovernments } from "./governance.js";
import { openingWorld, type OpeningPreset, type OpeningWorld } from "./opening-world.js";
import { interregnum } from "./foreign-politics.js";
import { withNamedOpponent } from "./opponent.js";
import { openingCities } from "./cities.js";
import { withApportionedDelegations } from "./delegations.js";
import { seatGovernorsByLean, withSeatedGovernors } from "./governors.js";
import { openingStates } from "./states.js";
import { openingCohortSensitivity } from "./state-cohort-opinion.js";
import { openingCohortBaseline } from "./cohort-baseline.js";
import { openingPartyShares } from "./electorate.js";
import type { OpeningElectorate } from "./opinion.js";
import { openingSectors } from "./sectors.js";
import type { Campaign, Congress, NationRuntime, PersonRuntime } from "./state.js";
import { openingCycles } from "./business-cycle.js";
import { withOathEconomyRecords } from "./economy-records.js";
import { openingCohorts } from "./demos.js";
import { nationName, roleTitle } from "./naming.js";
import { openingAppropriation } from "./appropriation.js";
import { CAMPAIGN_OPENING_DATE } from "./clock.js";
import { platformRejections, sealPlatform } from "./pledges.js";
import type { FoundingMandate } from "./state-founding.js";
import { rankByFit, type FitPresident } from "./cast-fit.js";
import {
  castRejections,
  resolveFoundingCast,
  seatFoundingCast,
  ticketPresident,
  withFoundingCastOffices,
} from "./founding-cast.js";
import { openingMandate, openingSeats, type OpeningSeats } from "./founding-congress.js";
import { leaderHookContributions, withHillHooks, withHomeHooks, withMoodHook, withRoomHook } from "./founding-leader-hooks.js";

// The founding flow: the one place a campaign's President, ticket, staff,
// cabinet and inherited Congress are fixed. Everything here is pure and keyed
// off the campaign seed, so a founding is reproducible rather than a one-off
// wizard result: seal the same choices under the same seed twice and the
// resulting Campaign is structurally identical.

/**
 * The fields a founding carried when the player built the nation they
 * governed: which country, under which constitution, from which cradle, in
 * which compacts, under which banner. The United States founding answers every
 * one of them, so a choice may leave any of them out and the seal reads the
 * country's own answer instead (`resolveFoundingFields`). They are still
 * accepted, and honored when given, so a caller that names them founds exactly
 * what it always did.
 */
export type LegacyFoundingFields = {
  readonly nationId: NationId;
  readonly nationName: string;
  readonly name: string;
  readonly title: string;
  readonly charterId: CharterId;
  readonly cradleId: CradleId;
  readonly compactIds: readonly OrgId[];
  readonly flag: FlagDesign;
};

export type FoundingChoices = Partial<LegacyFoundingFields> & {
  /**
   * The ministries the player appoints. The lead chair is *not* in here while
   * the founding is in progress — it is the player themselves, authored in
   * `leader` rather than drafted from the pool — and is filled in at seal time
   * from the composed leader so that the sealed campaign has one complete
   * cabinet map.
   */
  readonly cabinet: Readonly<Record<RoleId, PersonId>>;
  /**
   * Who the player is: a biography they author, not a candidate they pick.
   * The readings that biography is worth are derived from it (leader.ts), so
   * the same choices always produce the same person.
   */
  readonly leader: LeaderDraft;
  /**
   * The running mate, from the Senate committee chairs and congressional
   * leaders of the President's own ticket. Absent, the best-balanced candidate
   * is seated (vice-president.ts). The Vice President is never a cabinet chair.
   */
  readonly runningMate?: PersonId;
  /** The planks the President runs on, in the order the player chose them. */
  readonly platform?: readonly PlankId[];
  /**
   * The planks promoted to first-hundred-days pledges: due a hundred days after
   * the oath rather than at the midterm, for larger stakes either way.
   */
  readonly firstHundredDays?: readonly PlankId[];
  /** The White House staff; a post left out is filled with the best fit (white-house.ts). */
  readonly staff?: WhiteHouseStaff;
  /** Absent, the founding takes the seeded default. */
  readonly mandate?: FoundingMandate;
  /** Which world the oath opens on. Absent, the board is drawn from the seed. */
  readonly openingPreset?: OpeningPreset;
  /**
   * Harness only: false seals the founding with no carried board, so a battery
   * can compare staged wars on the same world with and without it. No player
   * path passes it; absent reads as true.
   */
  readonly carriedWorld?: boolean;
};

/** Every mandate a founding can declare, strongest first. */
export const FOUNDING_MANDATES: readonly FoundingMandate[] = ["landslide", "comfortable", "narrow", "popular-vote-loss"];

/** The legacy fields as the seal will read them: given, or the country's own answer. */
export type ResolvedFoundingFields = {
  readonly nationId: NationId | undefined;
  readonly charterId: CharterId | undefined;
  readonly cradleId: CradleId | undefined;
  readonly compactIds: readonly OrgId[];
  readonly flag: FlagDesign;
  readonly title: string | undefined;
};

/**
 * Fills each legacy field the choice left out from the dataset: the first
 * playable nation, the charter that nation names, the first cradle, no
 * compacts, the default banner, and the lead chair's own title. These are the
 * same answers `openingChoices` has always written in, so leaving a field out
 * founds the same campaign as naming it.
 */
export function resolveFoundingFields(dataset: WorldDataset, choices: FoundingChoices): ResolvedFoundingFields {
  const nationId = choices.nationId ?? dataset.nations.find((n) => n.playable)?.id;
  const nation = dataset.nations.find((n) => n.id === nationId);
  const charterId = choices.charterId ?? (nation?.identity.government as CharterId | undefined);
  const charter = dataset.charters.find((c) => c.id === charterId);
  const leadRole = charter?.cabinetRoles[0];
  return {
    nationId,
    charterId,
    cradleId: choices.cradleId ?? dataset.cradles[0]?.id,
    compactIds: choices.compactIds ?? [],
    flag: choices.flag ?? defaultFlagDesign,
    title: choices.title ?? (leadRole ? roleTitle(leadRole as string, charter?.roleTitles) : undefined),
  };
}

export type FoundingRejection = {
  // The org id, role id, or founding field this rejection concerns — not
  // typed to a single branded id, since a rejection can name any of them.
  readonly subject: string;
  // Always in-fiction: what the player reads, not what failed to validate.
  readonly explanation: string;
};

export type FoundingValidation = {
  readonly ok: boolean;
  readonly rejections: readonly FoundingRejection[];
};

// --- Cabinet: the draft offered from the seeded person pool. ---------------

// Deterministic per seed — same seed, same starting cast — because the
// pool is generated once from campaign-keyed RNG streams rather than drawn
// live at founding time.
//
// The last pool is kept. Drawing a world's cast is most of what a founding
// costs, and the founding screen asks for the same seed's pool on every
// preview; since the pool is a pure function of the seed and the dataset,
// handing back the one already drawn is indistinguishable from drawing it
// again, and a different seed or dataset simply draws afresh.
let lastPool: { readonly seed: CampaignSeed; readonly dataset: WorldDataset; readonly pool: readonly Person[] } | undefined;

export function generateFoundingPool(seed: CampaignSeed, dataset: WorldDataset): readonly Person[] {
  if (lastPool && lastPool.seed === seed && lastPool.dataset === dataset) return lastPool.pool;
  const pool = generateWorldPool(dataset.nations, personPoolSpecs, createRngStreams(seed), dataset.charters);
  lastPool = { seed, dataset, pool };
  return pool;
}

/**
 * How many candidates a chair offers at founding.
 *
 * The nation's bench is deeper than this (`personPoolSpecs`) because a campaign
 * hires out of it for forty turns. Founding needs enough faces to feel like a
 * live political cast without turning the screen into a spreadsheet; five gives
 * every chair a real bench while keeping each list skimmable.
 */
export const SHORTLIST_DEPTH = 5;

/**
 * The ministries a charter seats that the player actually appoints to.
 *
 * The charter's first chair is the player's own and is never on a shortlist:
 * offering it would let a founding seat somebody else as head of government
 * while the player is composed into the same office.
 */
export function appointableRoles(charter: Charter): readonly RoleId[] {
  return charter.cabinetRoles.slice(1);
}

// The shortlist per appointable seat, for the player to choose from. Ranked by
// fit to the President when one is given (cast-fit.ts: their own party first,
// then the closest politics, then competence); by competence alone for a
// caller that has no President to fit, which is every NPC government. Not an
// appointment; sealFounding only accepts a completed pick.
export function draftCabinetCandidates(
  charter: Charter,
  nationId: NationId,
  pool: readonly Person[],
  president?: FitPresident,
): Readonly<Record<RoleId, readonly Person[]>> {
  const entries = appointableRoles(charter).map((role) => {
    const bench = candidatesForRole(pool, nationId as string, role as string);
    const ranked = president ? rankByFit(bench, president).map((candidate) => candidate.person) : bench;
    return [role, ranked.slice(0, SHORTLIST_DEPTH)] as const;
  });
  return Object.fromEntries(entries) as Record<RoleId, readonly Person[]>;
}

// --- Founding-wide validation: nation, charter, cradle, cabinet, compacts. -

function cabinetRejections(charter: Charter, choices: FoundingChoices, pool: readonly Person[]): FoundingRejection[] {
  const byId = new Map(pool.map((p) => [p.id as string, p]));
  return appointableRoles(charter).flatMap((role): FoundingRejection[] => {
    const appointeeId = choices.cabinet[role];
    if (!appointeeId) {
      return [{ subject: role as string, explanation: `The ${charter.name} has no one seated for ${role} — that office cannot stand empty at founding.` }];
    }
    const appointee = byId.get(appointeeId as string);
    const eligible = appointee?.eligibleRoles.some((r) => r === role) ?? false;
    if (!appointee || !eligible) {
      return [{ subject: role as string, explanation: `Nobody with a claim on ${role} answers to that name — the appointment does not hold.` }];
    }
    return [];
  });
}

// The player's own biography is refused on the same terms as everything else
// here: composeLeader is the single authority on whether a draft describes a
// person, and its refusal is already a sentence written for the player.
function leaderRejections(
  charter: Charter,
  nationId: NationId,
  nationName: string,
  draft: LeaderDraft,
): FoundingRejection[] {
  const leadRole = charter.cabinetRoles[0];
  if (!leadRole) {
    return [{ subject: "leader", explanation: `${charter.name} seats no head of government — there is no chair for you to hold.` }];
  }
  const composed = composeLeader(draft, nationId, nationName, leadRole, charter.parties ?? []);
  return composed.ok ? [] : [{ subject: "leader", explanation: composed.reason }];
}

/** Every mandate a founding can declare, checked at runtime because a save or a URL can carry any string. */
function mandateRejections(mandate: FoundingMandate | undefined): FoundingRejection[] {
  if (mandate === undefined || FOUNDING_MANDATES.includes(mandate)) return [];
  return [{ subject: "mandate", explanation: "That is not a result an election can return. Choose how the country voted." }];
}

// Validates the whole slate before a seal is attempted; every rejection
// carries the in-fiction reason a player reads, never a bare error string.
//
// The compacts, the cradle and the flag are no longer judged here. They were
// choices when the player founded a nation of their own; the United States
// answers each of them itself (`resolveFoundingFields`), and a validation of
// an answer the player cannot change is a refusal nobody can act on.
export function validateFounding(dataset: WorldDataset, choices: FoundingChoices, pool: readonly Person[]): FoundingValidation {
  const fields = resolveFoundingFields(dataset, choices);
  const nation = dataset.nations.find((n) => n.id === fields.nationId);
  const charter = dataset.charters.find((c) => c.id === fields.charterId);

  if (!nation || !nation.playable) {
    return { ok: false, rejections: [{ subject: (fields.nationId as string | undefined) ?? "nation", explanation: "No founding myth has been written for that nation — it cannot be played." }] };
  }
  if (!charter) {
    return { ok: false, rejections: [{ subject: (fields.charterId as string | undefined) ?? "charter", explanation: "That charter names no institutions — there is nothing to found under." }] };
  }

  const president: FitPresident = { party: choices.leader.party, ideology: choices.leader.ideology };
  const rejections: FoundingRejection[] = [
    ...leaderRejections(charter, nation.id, nation.identity.name, choices.leader),
    ...cabinetRejections(charter, choices, pool),
    ...castRejections(pool, nation.id, president, choices),
    ...mandateRejections(choices.mandate),
    ...platformRejections(choices.platform ?? [], choices.firstHundredDays ?? []),
  ];
  return { ok: rejections.length === 0, rejections };
}

// --- The seal: fixes the seed and produces the playable Campaign. ----------

function applyCradleToNation(nation: Nation, cradle: Cradle): Nation {
  return {
    ...nation,
    geo: {
      ...nation.geo,
      region: cradle.region,
      neighbors: cradle.startingNeighbors,
      lat: cradle.geo.lat,
      lon: cradle.geo.lon,
    },
  };
}

// Chosen compacts are real memberships, not a line in the founding record:
// they land on the player nation before relationships derive, so fellow
// members read as allies through the same shared-membership and bloc-gap
// arithmetic every other nation pair uses, and the player's alignment band
// is recomputed under the same ALIGNED/OPPOSED scoring that places everyone
// else on the spectrum.
function applyCompactsToNation(nation: Nation, compacts: readonly OrgId[]): Nation {
  const memberships = [...new Set([...nation.memberships, ...compacts])];
  const joined = { ...nation, memberships };
  return { ...joined, bands: deriveBands(joined) };
}

function buildNationRuntimes(nations: readonly Nation[]): Readonly<Record<string, NationRuntime>> {
  return Object.fromEntries(nations.map((n) => [n.id, { base: n, stats: n.stats, traits: n.traits }]));
}

function buildPersonRuntimes(pool: readonly Person[], cabinet: Readonly<Record<RoleId, PersonId>>): Readonly<Record<string, PersonRuntime>> {
  const cabinetByPerson = new Map(Object.entries(cabinet).map(([role, personId]) => [personId as string, role as RoleId]));
  // An unseated person carries no currentRole key at all: an explicit
  // `undefined` would not survive a JSON save round-trip, and a save that
  // reloads to a different shape than it was written from is not a save.
  return Object.fromEntries(
    pool.map((p) => {
      const role = cabinetByPerson.get(p.id as string);
      // A founding minister took the chair at founding, so the baseline a
      // dossier reads their drift against is the roll they arrived with.
      const runtime: PersonRuntime = role
        ? { base: p, alive: true, currentRole: role, loyaltyAtAppointment: p.loyalty }
        : { base: p, alive: true };
      return [p.id, runtime];
    }),
  );
}

/**
 * The same runtimes, with the Hill's seats written onto the people holding
 * them.
 *
 * Two passes rather than one because the leadership is seated *out of* the
 * runtimes: who holds the speakership cannot be known before the cast exists,
 * and the cast cannot record the seat before it is assigned.
 */
function withHillSeats(
  people: Readonly<Record<string, PersonRuntime>>,
  seats: Readonly<Record<string, RoleId>>,
): Readonly<Record<string, PersonRuntime>> {
  return Object.fromEntries(
    Object.entries(people).map(([id, runtime]) => {
      const seat = seats[id];
      return [id, seat ? { ...runtime, currentRole: seat } : runtime];
    }),
  );
}

/** The chosen slate as people rather than ids, for anything that has to read them. */
export function seatedPeople(
  cabinet: Readonly<Record<RoleId, PersonId>>,
  pool: readonly Person[],
): Readonly<Partial<Record<RoleId, Person>>> {
  const byId = new Map(pool.map((person) => [person.id as string, person]));
  const entries = Object.entries(cabinet).flatMap(([role, personId]) => {
    const person = byId.get(personId as string);
    return person ? [[role, person] as const] : [];
  });
  return Object.fromEntries(entries) as Partial<Record<RoleId, Person>>;
}

/**
 * The world as the founding hands it over: the President's nation placed in
 * its cradle and its compacts where a legacy choice still names them, every
 * nation's traits then rolled from the seed.
 */
function foundedNations(dataset: WorldDataset, nation: Nation, fields: ResolvedFoundingFields, seed: CampaignSeed): readonly Nation[] {
  const cradle = dataset.cradles.find((c) => c.id === fields.cradleId);
  const known = new Set(dataset.organizations.map((org) => org.id as string));
  const compacts = fields.compactIds.filter((id) => known.has(id as string));
  const placed = dataset.nations.map((n) =>
    n.id === nation.id ? applyCompactsToNation(cradle ? applyCradleToNation(n, cradle) : n, compacts) : n,
  );
  return rollWorldTraits(placed, nationTraitProfiles, createRngStreams(seed));
}

/**
 * The Congress the President is sworn in beside, seated.
 *
 * The seats are counted from the map, the mandate and the year (founding-
 * congress.ts). A route that buys the room moves it before anyone is seated, so
 * the leaders read it; the leaders are then seated from their own parties, a
 * background or route that buys them moves them, and the panels are seated
 * last, because a member already holding a gavel on the floor is not also
 * seated at the head of a committee.
 */
function foundingCongress(
  nation: Nation,
  people: Readonly<Record<string, PersonRuntime>>,
  seats: OpeningSeats,
  draft: LeaderDraft,
  caucusAnchor: Congress["caucusAnchor"],
): { readonly congress: Congress; readonly people: Readonly<Record<string, PersonRuntime>> } {
  const room = withRoomHook(openingCongress(nation, 1, draft.party, caucusAnchor, seats), draft);
  const led = withLeadership(room, people, nation.id, 1);
  const congress = { ...withCommittees(led.congress, led.people, nation.id, 1), appropriation: openingAppropriation(CAMPAIGN_OPENING_DATE, 1) };
  return { congress, people: withHillHooks(led.congress, led.people, draft) };
}

/**
 * Everybody below the President in their seat on the first morning.
 *
 * The Hill's posts and the statehouses first, out of the cast the ticket and
 * the staff have already left. Then the branch below the cabinet, which is
 * already staffed on inauguration day: those offices are not the outgoing
 * administration's to empty, and opening them vacant charged a president for a
 * transition no transition performs. The Court is seated first, from the whole
 * nation by rank; the four political offices next, under a career acting while
 * the President's picks wait on the Senate; and the generic incumbent sweep
 * last, which then skips every chair already led or acted for.
 */
function seatTheBranch(
  people: Readonly<Record<string, PersonRuntime>>,
  congress: Congress,
  cabinet: Readonly<Record<RoleId, PersonId>>,
  cast: ReturnType<typeof resolveFoundingCast>,
  nation: NationId,
  seed: CampaignSeed,
  foundingYear: number,
): ReturnType<typeof withCareerIncumbents> {
  const hill = withHillSeats(people, { ...committeeSeatRoles(congress.committees), ...hillSeats(congress.leadership) });
  const statehouses = seatGovernorsByLean(hill, nation);
  const court = seatFoundingJustices(statehouses, withFoundingCastOffices(foundingInstitutions(cabinet), cast), nation, seed, foundingYear);
  const political = withPoliticalActings(court.people, court.institutions);
  const career = withCareerIncumbents(political.people, political.institutions);
  return { ...career, institutions: { ...career.institutions, ...foundingCircuitSeats(seed, foundingYear) } };
}

/** The line the Record opens on: who took office, and who stands beside them. */
function foundingLedgerLine(leader: string, nation: Nation, title: string, runningMate: string | undefined): string {
  const beside = runningMate ? `, with ${runningMate} as Vice President` : "";
  return `${leader} takes office as ${title} of ${nationName(nation.identity)}${beside}.`;
}

// Same seed, same choices, same seal -> a structurally identical Campaign:
// every draw here (traits, the person pool, the year's swing) is a pure
// function of the seed via named RNG streams, and nothing else in this
// function reads ambient state. This is the property the founding acceptance
// criterion — "the sealed seed reproduces an identical campaign on replay" —
// depends on.
/** The party shares this seed draws, read from the side of the aisle the President's ticket sits on. */
export function openingElectorate(seed: CampaignSeed, leader: { readonly party: AdministrationParty; readonly ideology: { readonly economicLeftRight: number } }): OpeningElectorate {
  return {
    shares: openingPartyShares(createRngStreams(seed)),
    anchor: sealCaucusAnchor(leader.party, leader.ideology),
    independent: leader.party === "independent",
  };
}

export function sealFounding(seed: CampaignSeed, dataset: WorldDataset, choices: FoundingChoices): Campaign {
  const draftedPool = generateFoundingPool(seed, dataset);
  const validation = validateFounding(dataset, choices, draftedPool);
  if (!validation.ok) {
    throw new Error(`founding cannot be sealed: ${validation.rejections.map((r) => r.explanation).join(" ")}`);
  }

  const fields = resolveFoundingFields(dataset, choices);
  const nation = dataset.nations.find((n) => n.id === fields.nationId)!;
  const charter = dataset.charters.find((c) => c.id === fields.charterId)!;
  const openingDate = CAMPAIGN_OPENING_DATE;
  const platform = choices.platform ?? [];
  const platformSeal = sealPlatform(platform, openingDate, choices.firstHundredDays ?? []);
  const rolledNations = foundedNations(dataset, nation, fields, seed);

  const leadRole = charter.cabinetRoles[0]!;
  const title = fields.title ?? roleTitle(leadRole as string, charter.roleTitles);
  // Validation already proved the draft composes, so this cannot refuse here.
  const composed = composeLeader(choices.leader, nation.id, nation.identity.name, leadRole, charter.parties ?? []);
  if (!composed.ok) throw new Error(`founding cannot be sealed: ${composed.reason}`);

  // The player joins their own cast. From this point they are an ordinary
  // member of it — seated, saved, read and scored by the same rules as the
  // ministers around them — which is what keeps the head of government from
  // needing a parallel code path in every consumer.
  const pool = [...draftedPool, composed.person];
  const cabinet = { ...choices.cabinet, [leadRole]: composed.person.id } as Record<RoleId, PersonId>;
  const president = ticketPresident(choices.leader, composed.person);
  const cast = resolveFoundingCast(draftedPool, nation.id, president, choices);

  // The campaign opens on the nation as governed, not on the nation: the
  // player's own readings, their career and every minister they seated are
  // already worth something before the first turn is taken.
  const { metrics } = openingPosition(nation, seatedPeople(cabinet, pool), leadRole, (treasury) =>
    leaderHookContributions(choices.leader, composed.person, leadRole, treasury),
    openingElectorate(seed, choices.leader),
  );
  const nationRuntimes = buildNationRuntimes(rolledNations);

  // Party is what the player chose, sealed here and never recomputed later. The
  // anchor beside it is the caucus that party is counted against: itself for a
  // Democrat or a Republican, and the nearest major party for an independent,
  // who has no caucus of their own but still governs from somewhere.
  const caucusAnchor = sealCaucusAnchor(choices.leader.party, choices.leader.ideology);
  const drafted = seatFoundingCast(buildPersonRuntimes([...pool, ...congressionalBench(pool, seed)], cabinet), cast);
  const mandate = openingMandate(seed, choices.mandate);
  const hill = foundingCongress(nation, drafted, openingSeats(seed, mandate, choices.leader.party, caucusAnchor), choices.leader, caucusAnchor);
  const congress = hill.congress;
  const branch = seatTheBranch(hill.people, congress, cabinet, cast, nation.id, seed, openingDate.year);
  const people = branch.people;
  // Delegations first, governors open at each delegation's disposition, and
  // then the one statehouse or city the President's own career reaches.
  const home = withHomeHooks(
    withSeatedGovernors(withApportionedDelegations(congress, openingStates(createRngStreams(seed))), people),
    openingCities({ congress }, caucusAnchor),
    choices.leader,
    president.homeState,
    composed.person.birthplace,
  );
  const memberCongress = seatCongressMembers(congress, home.states, people);
  const memberPeople = withCongressMemberOffices(people, memberCongress);
  const runningMate = cast.runningMate ? people[cast.runningMate as string]?.base.name : undefined;

  // Sealed through `recomputeApproval` so the opening headline already includes
  // the public it opens with, rather than jumping the first time anything moves.
  // The economy's kept records open last, because each reads the whole
  // campaign, and on the inherited program, because the platform's is a change.
  // The opponent is named on the finished cast, and frozen there.
  const board = choices.carriedWorld === false ? undefined : openingWorld(nationRuntimes, openingDate, seed, choices.openingPreset);
  return withNamedOpponent(withOathEconomyRecords(recomputeApproval(withOpeningWorld(interregnum(foundingConfirmations({
    seed,
    founding: {
      nation: nation.id,
      // The field remains in the save contract, but identity is authored by the
      // nation record. A stale or hand-edited draft cannot rename United States.
      nationName: nation.identity.name,
      name: composed.person.name,
      title,
      charter: charter.id,
      cradle: (fields.cradleId ?? "") as string,
      compacts: fields.compactIds,
      cabinet,
      flag: fields.flag,
      leader: choices.leader,
      leadRole,
      platform,
      // Who the founding seated, chosen or filled with the best fit.
      staff: cast.staff,
      ...(choices.mandate ? { mandate: choices.mandate } : {}),
      leaderTable: LEADER_TABLE_AS_OF,
    },
    ...(cast.runningMate ? { vicePresident: cast.runningMate } : {}),
    pledges: platformSeal.pledges,
    turn: 1,
    calendar: openingDate,
    foundingDate: openingDate,
    issuedActs: {},
    nations: nationRuntimes,
    cities: home.cities,
    states: home.states,
    sectors: openingSectors(),
    relationships: buildInitialRelationships(rolledNations, nation.id),
    people: memberPeople,
    player: {
      metrics,
      // The quarter you inherited. Not the player's campaign — a presidency is
      // a going concern that somebody was already running, and a first week
      // with no past is what made every sparkline a dot and every delta blank.
      // Generated backwards from these same metrics, so the trace lands on the
      // number the room is about to draw.
      metricHistory: inheritedMetricHistory(createRngStreams(seed), metrics),
      cabinet,
      // Continuity in every domain. An administration that has not yet decided
      // anything is still governing — on its predecessor's program.
      policies: { ...inheritedPolicies(), ...platformSeal.policies },
      // Nothing appropriated above the establishment the country already
      // keeps. An administration that has voted no budget of its own is
      // still funding the state it inherited, at exactly its sustainment.
      budget: sustainingBudget(nationRuntimes[nation.id]!),
      flags: { "founding-complete": true, ...platformSeal.flags },
      alignments: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
      // The public an administration inherits, read off the nation itself, and
      // moved where the President's own career buys one of its judgments.
      opinion: withMoodHook(openingMood(nation), choices.leader),
    },
    // The world is already governed on turn 1: every other capital opens on the
    // program its own condition and character argue for, not on continuity.
    governments: openingGovernments(nationRuntimes, nation.id),
    operators: [],
    conflicts: {},
    conditions: {},
    emergencies: {},
    pursuits: {},
    commitments: {},
    orders: [],
    judiciary: { cases: [] },
    pendingRules: [],
    capRaises: [],
    lapses: [],
    oversight: foundingOversight(1),
    congress: memberCongress,
    // Seeded with the cabinet, the ticket and the staff this founding just
    // seated, so the executive branch opens agreeing with the roster about who
    // is in each chair, and with an incumbent already in every office below it.
    institutions: branch.institutions,
    actings: foundingActings(branch.institutions),
    nominations: {},
    trade: foundingTrade(),
    security: foundingSecurity(),
    scenarioFamilies: foundingScenarioFamilies(),
    bills: {},
    termClock: openingTermClock(1),
    press: openingPressCorps(1, placementFor(choices.leader.party, platform)),
    treaties: {},
    feed: [],
    ledger: [{ turn: 1, actor: "player", description: foundingLedgerLine(composed.person.name, nation, title, runningMate) }],
    removal: { mechanism: charter.removalMechanism, pressure: 0, pressureHistory: [], beats: [], resolved: false },
    cycles: openingCycles(Object.keys(nationRuntimes) as NationId[], 1),
    cohorts: openingCohorts(),
    cohortSensitivity: openingCohortSensitivity(createRngStreams(seed)),
    cohortBaseline: openingCohortBaseline(createRngStreams(seed)),
    electorateShares: openingPartyShares(createRngStreams(seed)),
    // A presidency starts having put nothing off.
    deferrals: {},
    // Both series open empty rather than absent: a reader of either is asking
    // for a series, and an empty one is the honest answer on the first morning.
    economyHistory: [],
    feedDigest: [],
    stateApprovalHistory: [],
  })), board))));
}

/**
 * The world the oath opens on, laid onto the sealed campaign. Undefined is the
 * harness's empty board, which leaves the seal's empty collections in place.
 */
function withOpeningWorld(campaign: Campaign, board: OpeningWorld | undefined): Campaign {
  if (!board) return campaign;
  const keyed = <T extends { readonly id: string }>(entries: readonly T[]) => Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  return {
    ...campaign,
    conflicts: { ...campaign.conflicts, ...keyed(board.conflicts) },
    operators: [...campaign.operators, ...board.operators],
    commitments: { ...campaign.commitments, ...keyed(board.commitments) },
    trade: { ...campaign.trade, measures: { ...campaign.trade.measures, ...keyed(board.measures) } },
  };
}
