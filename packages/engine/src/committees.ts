import { usPartyOfPerson } from "./cast-fit.js";
import type { NationId, PersonId, RoleId } from "@admin/world";
import { INSTITUTION_CATALOG } from "./institution-catalog.js";
import type { InstitutionId } from "./institutions.js";
import { benchFor, caucusTarget, holdsSeat, majorityCaucus, takeForCaucus } from "./hill.js";
import { partyForCaucus, usTicket } from "./party.js";
import type { Campaign, CommitteeSeat, Congress, HillCaucus, PersonRuntime } from "./state.js";

// The panels a nomination actually goes through.
//
// The institution catalog has referred every confirmable office to a Senate
// committee since it was written, and nothing read the field back: the
// committee stage of a nomination was a timed gate against the whole room's
// mood, so a president facing a friendly Judiciary and a hostile Armed Services
// faced neither. Thirteen ids sat in the data and named nobody.
//
// What is added here is not a second Congress and not a second disposition.
// The panels are seated out of the same person pool the Hill's own posts are,
// they are read through the same caucus-and-character rule a leadership figure
// is read through, and what they move is the two places the committee stage
// was already decided: how long the stage takes, and whether the committee
// reports at all. The room's disposition remains the one account of how an
// administration is regarded, and a panel is a position on it.

/** The role a chair and a ranking member are both drawn as. */
export const COMMITTEE_MEMBER_ROLE = "role-committee-chair";

/**
 * The Senate's own names for the ids the catalog's offices carry.
 *
 * An id with no entry here is a defect in this table rather than a fact about
 * the Senate, and the engine's own test fails on any catalog id this table has
 * not caught up to — so a fourteenth committee cannot appear on a screen as a
 * raw id.
 */
export const COMMITTEE_NAMES: Readonly<Record<string, string>> = {
  "CMTE-AGRICULTURE": "Committee on Agriculture, Nutrition, and Forestry",
  "CMTE-ARMED": "Committee on Armed Services",
  "CMTE-BANKING": "Committee on Banking, Housing, and Urban Affairs",
  "CMTE-COMMERCE": "Committee on Commerce, Science, and Transportation",
  "CMTE-ENERGY": "Committee on Energy and Natural Resources",
  "CMTE-ENVIRONMENT": "Committee on Environment and Public Works",
  "CMTE-FINANCE": "Committee on Finance",
  "CMTE-FOREIGN": "Committee on Foreign Relations",
  "CMTE-HELP": "Committee on Health, Education, Labor, and Pensions",
  "CMTE-HOMELAND": "Committee on Homeland Security and Governmental Affairs",
  "CMTE-INTEL": "Select Committee on Intelligence",
  "CMTE-JUDICIARY": "Committee on the Judiciary",
  "CMTE-VETERANS": "Committee on Veterans' Affairs",
};

/**
 * The committee ids as the catalog itself names them, never a fixed list, so a
 * committee the catalog stops referring an office to drops out of the lattice
 * on its own and one it starts referring to appears without this file changing.
 */
export const COMMITTEE_IDS: readonly string[] = [
  ...new Set(
    INSTITUTION_CATALOG.flatMap((institution) =>
      institution.offices.flatMap((office) => (office.committee ? [office.committee] : [])),
    ),
  ),
].sort();

export function committeeName(committee: string): string {
  return COMMITTEE_NAMES[committee] ?? committee;
}

/**
 * The committee that would take a matter about this body.
 *
 * Read off the catalog's own routing — the committee each office is confirmed
 * by — rather than from a table here, because the Senate that confirms an
 * agency's leadership is the Senate that investigates it, and a second mapping
 * would be a second Congress. A body whose offices name more than one panel is
 * routed to whichever holds most of them, ties broken by id so the answer is
 * the same every week.
 *
 * It lives here rather than beside the inquiry phase that first needed it
 * because it is a fact about the panels, and the module that opens inquiries
 * also reads the executive-order catalog: anything importing this routing from
 * there pulled the whole instrument ladder in behind it, which is a load-order
 * cycle rather than a dependency.
 */
export function committeeForInstitution(institution: InstitutionId): string | undefined {
  const def = INSTITUTION_CATALOG.find((candidate) => candidate.id === institution);
  if (!def) return undefined;
  const counts = new Map<string, number>();
  for (const office of def.offices) {
    if (office.committee) counts.set(office.committee, (counts.get(office.committee) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // A component with no confirmable office of its own answers to its parent's
  // panel, which is the real chain: nobody has a hearing about the Bureau
  // without the Department in the room.
  return ranked[0]?.[0] ?? (def.parent ? committeeForInstitution(def.parent) : undefined);
}

// --- Seating them -----------------------------------------------------------

/**
 * The share of a panel that sits with the administration's caucus.
 *
 * Committees are apportioned to the chamber, which is the fact this carries:
 * the majority runs every panel and its margin on each one is the margin it
 * holds in the room. An independent senator holds a panel seat by agreement
 * with the Democrats they caucus with, so they are counted on that side.
 */
export function panelBalance(congress: Congress): number {
  const senate = congress.chambers.senate;
  const withAdministration = senate.administration + (congress.caucusAnchor === "democrat" ? senate.independent : 0);
  const caucused = senate.administration + senate.opposition + senate.independent;
  return caucused === 0 ? 0.5 : Math.round((withAdministration / caucused) * 1000) / 1000 + 0;
}

/** Which caucus a chair, and separately a ranking member, is drawn from. */
function chairCaucus(congress: Congress): HillCaucus {
  return majorityCaucus(congress.chambers.senate, congress.caucusAnchor);
}

function otherCaucus(caucus: HillCaucus): HillCaucus {
  return caucus === "administration" ? "opposition" : "administration";
}

/**
 * Seat every committee, keeping whoever is already seated where they are.
 *
 * Deterministic and idempotent, on the same rule the Hill's own posts are
 * seated by: the bench is the campaign's own cast sorted by id rather than
 * drawn, the committees are taken in catalog-sorted order, and a member seated
 * by an earlier pass is left alone as long as they are alive. So a founding, a
 * midterm that changes which caucus chairs, and a save brought forward all
 * share one rule rather than three that agree today.
 *
 * A bench with nobody left seats nobody, and that is a supported outcome: an
 * unseated panel reads at the room's own disposition, which is exactly what the
 * committee stage did before any of them had names.
 */
export function seatCommittees(
  congress: Congress,
  people: Readonly<Record<string, PersonRuntime>>,
  nation: NationId,
  turn: number,
): Readonly<Record<string, CommitteeSeat>> {
  const balance = panelBalance(congress);
  const bench = benchFor(people, nation, COMMITTEE_MEMBER_ROLE).filter((runtime) => !congress.members || congress.members.some((member) => member.person === runtime.base.id && member.chamber === "senate"));
  const held = new Set<string>(
    Object.values(congress.committees ?? {}).flatMap((seat) =>
      [seat.chair, seat.ranking].flatMap((person) => (person ? [person as string] : [])),
    ),
  );
  // Everyone the Hill's leadership already holds: a Speaker is not also a
  // committee chair, and the same person in two seats would be counted twice by
  // every reading that walks the room.
  const onLeadership = new Set(congress.leadership.map((figure) => figure.person as string));
  const free = bench.filter(
    (runtime) => !held.has(runtime.base.id as string) && !onLeadership.has(runtime.base.id as string),
  );
  const taken = new Set<string>();
  // A gavel goes to the majority's own party and the ranking seat to the
  // minority's, never to whoever sorts first.
  const take = (caucus: HillCaucus): PersonId | undefined => {
    const party = partyForCaucus(caucus, congress.caucusAnchor);
    const runtime = takeForCaucus(free, (candidate) => !taken.has(candidate.base.id as string) && (!congress.members || usPartyOfPerson(candidate.base) === party || party === "democrat" && usPartyOfPerson(candidate.base) === "independent"), party, usTicket(party).beliefs);
    if (!runtime) return undefined;
    taken.add(runtime.base.id as string);
    return runtime.base.id;
  };

  const gavel = chairCaucus(congress);
  const seated: Record<string, CommitteeSeat> = {};
  for (const committee of COMMITTEE_IDS) {
    const sitting = congress.committees?.[committee];
    // A chamber that has changed hands changes who holds the gavel before it
    // changes who is on the panel: the two members swap seats.
    const flipped = sitting !== undefined && sitting.chairCaucus !== gavel;
    const sittingChair = flipped ? sitting?.ranking : sitting?.chair;
    const sittingRanking = flipped ? sitting?.chair : sitting?.ranking;
    const chair = stillSitting(congress, people, sittingChair) ?? take(gavel);
    const ranking = stillSitting(congress, people, sittingRanking) ?? take(otherCaucus(gavel));
    seated[committee] = {
      committee,
      ...(chair ? { chair } : {}),
      ...(ranking ? { ranking } : {}),
      chairCaucus: gavel,
      balance,
      seatedTurn: sitting?.seatedTurn ?? turn,
    };
  }
  // Which caucus chairs is not stored: it follows the chamber, so a midterm
  // that flips the Senate moves it for every panel at once without reseating.
  return seated;
}

/** A panel's sitting member, kept only while alive and still a senator. */
function stillSitting(
  congress: Congress,
  people: Readonly<Record<string, PersonRuntime>>,
  person: PersonId | undefined,
): PersonId | undefined {
  if (!person) return undefined;
  return people[person as string]?.alive === true && holdsSeat(congress, person, "senate") ? person : undefined;
}

/** The same, as the Congress it produces, for callers that hold one. */
export function withCommittees(
  congress: Congress,
  people: Readonly<Record<string, PersonRuntime>>,
  nation: NationId,
  turn: number,
): Congress {
  return { ...congress, committees: seatCommittees(congress, people, nation, turn) };
}

/** The role a seated committee member holds, for the person record that shows it. */
export function committeeSeatRoles(
  committees: Readonly<Record<string, CommitteeSeat>>,
): Readonly<Record<string, RoleId>> {
  return Object.fromEntries(
    Object.values(committees).flatMap((seat) =>
      [seat.chair, seat.ranking].flatMap((person) =>
        person ? [[person as string, COMMITTEE_MEMBER_ROLE as RoleId] as const] : [],
      ),
    ),
  );
}

// --- Reading them -----------------------------------------------------------

/**
 * How far a panel can carry its own room.
 *
 * Half, which is more than a leadership post is worth and less than the room.
 * A committee is where a nomination is slowed, held or quietly buried, so the
 * panel really is deciding the committee stage; what it is not is a second
 * opinion about the administration, because a chair who despises a president
 * still reports out the uncontroversial half of a cabinet. At a half, a hostile
 * panel under a neutral room costs a nomination weeks rather than the office.
 */
export const PANEL_GRAVITY = 0.5;

/**
 * How much of a panel the gavel is worth, before its seats are counted.
 *
 * A chair sets the hearing date, writes the markup and decides whether the
 * committee votes at all; the ranking member has the minority's seats and the
 * argument. So the chair carries half the panel outright and splits the rest by
 * the caucus's own margin, which leaves a one-seat majority running a panel
 * that is three quarters its chair and a wide one running a panel that is
 * nearly all of them.
 */
const GAVEL_SHARE = 0.5;

export type CommitteePanel = {
  readonly committee: string;
  readonly name: string;
  readonly chair: PersonId | undefined;
  readonly ranking: PersonId | undefined;
  readonly balance: number;
  /** The chair's own reading of this administration, where one is seated. */
  readonly chairDisposition: number | undefined;
  readonly rankingDisposition: number | undefined;
  /** What the panel as a whole is disposed to, which is what its stages run on. */
  readonly disposition: number;
};

/**
 * A committee's own reading of this administration.
 *
 * The two members' readings, weighted by the balance of the panel they sit on,
 * pulled a third of the way from the room's. Both halves matter: a chair with a
 * one-seat margin runs a panel that is nearly the room, and one with a wide
 * majority runs a panel that is nearly theirs. With nobody seated this is the
 * room's disposition exactly, which is what keeps a save from before the panels
 * existed confirming at the speed it always did.
 */
export function committeePanel(campaign: Campaign, committee: string): CommitteePanel {
  const congress = campaign.congress;
  const seat = congress.committees?.[committee];
  const majority = seat?.chairCaucus ?? chairCaucus(congress);
  const chairPerson = seat?.chair ? campaign.people[seat.chair]?.base : undefined;
  const rankingPerson = seat?.ranking ? campaign.people[seat.ranking]?.base : undefined;
  const chairDisposition = seat?.chair
    ? caucusTarget(congress.disposition, majority, chairPerson, congress)
    : undefined;
  const rankingDisposition = seat?.ranking
    ? caucusTarget(congress.disposition, otherCaucus(majority), rankingPerson, congress)
    : undefined;
  return {
    committee,
    name: committeeName(committee),
    chair: seat?.chair,
    ranking: seat?.ranking,
    balance: seat?.balance ?? panelBalance(congress),
    chairDisposition,
    rankingDisposition,
    disposition: blend(congress.disposition, seat?.balance ?? 0.5, chairDisposition, rankingDisposition),
  };
}

function blend(
  room: number,
  balance: number,
  chair: number | undefined,
  ranking: number | undefined,
): number {
  // The gavel first, the seats after: `balance` is counted from the
  // administration's side, so the majority's share of a panel the opposition
  // runs is the other side of it.
  const gavel = Math.max(balance, 1 - balance);
  const share = GAVEL_SHARE + (1 - GAVEL_SHARE) * gavel;
  const chairWeight = chair === undefined ? 0 : share;
  const rankingWeight = ranking === undefined ? 0 : 1 - share;
  const mass = chairWeight + rankingWeight;
  if (mass === 0) return room;
  const panel = ((chair ?? 0) * chairWeight + (ranking ?? 0) * rankingWeight) / mass;
  return round3(clamp01(room + PANEL_GRAVITY * (panel - room)));
}

/**
 * The disposition a committee's own business is decided against.
 *
 * The one entry point for every caller that used to read `congress.disposition`
 * at a committee stage. An unrouted measure — one whose committee this build
 * does not name — reads the room, which is the honest answer rather than a
 * panel picked for it.
 */
export function committeeDisposition(campaign: Campaign, committee: string | undefined): number {
  if (committee === undefined) return campaign.congress.disposition;
  return committeePanel(campaign, committee).disposition;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;
