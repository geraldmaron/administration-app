import { hillSeats, seatLeadership } from "./hill.js";
import { committeeSeatRoles, withCommittees } from "./committees.js";
import { personPoolSpecs, US_ID, type Person, type PersonId, type RoleId, type StateId } from "@admin/world";
import { usPartyOfPerson } from "./cast-fit.js";
import { districtsOf } from "./house-seats.js";
import { generateRolePerson } from "./people.js";
import { newNameLedger } from "./naming.js";
import { createRngStreams, type CampaignSeed } from "./rng.js";
import { usTicket } from "./party.js";
import type { Campaign, Congress, Chamber, UsParty } from "./state.js";

export type CongressMember = {
  readonly seat: string;
  readonly chamber: Chamber;
  readonly state: StateId;
  readonly person: PersonId;
  readonly party: UsParty;
  readonly seatClass?: 1 | 2 | 3;
};

/** The existing cast generator supplies electoral replacements, never a parallel person table. */
export function congressionalBench(pool: readonly Person[], seed: CampaignSeed): readonly Person[] {
  const spec = personPoolSpecs.find((entry) => entry.nation === US_ID);
  if (!spec) throw new Error("No US person pool for congressional elections.");
  const ledger = newNameLedger();
  for (const person of pool.filter((entry) => entry.nationality === US_ID)) ledger.full.add(person.name);
  const streams = createRngStreams(seed);
  return (["democrat", "republican", "independent"] as const).flatMap((party, partyIndex) => {
    const count = party === "independent" ? 100 : 535;
    return Array.from({ length: count }, (_, index) => generateRolePerson(
      spec, "United States", "role-congressional-leader", 2000 + partyIndex * 1000 + index,
      streams, ledger, [usTicket(party)], usTicket(party),
    ));
  });
}

type EmptySeat = Omit<CongressMember, "person">;

function votingSeats(congress: Congress, states: Campaign["states"]): readonly EmptySeat[] {
  return Object.values(states).flatMap((runtime) => {
    const delegation = runtime.delegation;
    if (!delegation || runtime.base.id === "DC") return [];
    const state = runtime.base.id;
    const house = districtsOf(state).map((district, rank): EmptySeat => {
      const democrats = congress.caucusAnchor === "democrat" ? delegation.house.administration : delegation.house.opposition;
      const republicans = congress.caucusAnchor === "republican" ? delegation.house.administration : delegation.house.opposition;
      const party = rank < democrats ? "democrat" : rank >= delegation.house.seats - republicans ? "republican" : "independent";
      return { seat: district.id, chamber: "house", state, party };
    });
    const senate = delegation.senate.map((seat): EmptySeat => ({
      seat: `${state}-senate-${seat.seatClass}`, chamber: "senate", state, party: seat.party, seatClass: seat.seatClass,
    }));
    return [...house, ...senate];
  });
}

type Officer = { readonly person: PersonId; readonly chamber: Chamber };

function reserveOfficers(figures: readonly Officer[], seats: readonly EmptySeat[], held: ReadonlyMap<string, CongressMember>, people: Campaign["people"], used: Set<string>): { assigned: Map<string, PersonId>; vacant: Set<PersonId> } {
  const assigned = new Map<string, PersonId>();
  const vacant = new Set<PersonId>();
  for (const figure of figures) {
    const party = people[figure.person]?.base ? usPartyOfPerson(people[figure.person]!.base) : undefined;
    const previous = [...held.values()].find((member) => member.person === figure.person);
    const seat = seats.find((entry) => !assigned.has(entry.seat) && entry.chamber === figure.chamber && entry.party === party && (previous ? entry.seat === previous.seat : held.size === 0 || held.get(entry.seat)?.party !== entry.party || !people[held.get(entry.seat)!.person]?.alive));
    if (!seat) { vacant.add(figure.person); continue; }
    assigned.set(seat.seat, figure.person);
    used.add(figure.person);
  }
  return { assigned, vacant };
}

/** One seat writer, after apportionment; same-party incumbents retain their identities and ties. */
export function seatCongressMembers(congress: Congress, states: Campaign["states"], people: Campaign["people"], turn = 0): Congress {
  const seats = votingSeats(congress, states);
  const held = new Map((congress.members ?? []).map((member) => [member.seat, member]));
  const used = new Set<string>();
  const figures = [
    ...congress.leadership.map((figure) => ({ person: figure.person, chamber: figure.chamber })),
    ...Object.values(congress.committees).flatMap((panel) => [panel.chair, panel.ranking].flatMap((person) => person ? [{ person, chamber: "senate" as const }] : [])),
  ].filter((figure, index, all) => all.findIndex((entry) => entry.person === figure.person) === index);
  const available = Object.values(people).filter((runtime) => runtime.alive && runtime.base.nationality === US_ID &&
    (!runtime.currentRole || ["role-representative", "role-senator"].includes(runtime.currentRole) || figures.some((figure) => figure.person === runtime.base.id)) &&
    runtime.base.eligibleRoles.some((role) => ["role-congressional-leader", "role-committee-chair"].includes(role)));
  const { assigned, vacant } = reserveOfficers(figures, seats, held, people, used);
  for (const seat of seats) {
    const incumbent = held.get(seat.seat);
    if (!assigned.has(seat.seat) && incumbent?.party === seat.party && people[incumbent.person]?.alive && !used.has(incumbent.person)) {
      assigned.set(seat.seat, incumbent.person);
      used.add(incumbent.person);
    }
  }
  const members = seats.map((seat): CongressMember => {
    let person = assigned.get(seat.seat);
    const incumbent = held.get(seat.seat);
    if (!person && incumbent?.party === seat.party && people[incumbent.person]?.alive && !used.has(incumbent.person)) person = incumbent.person;
    person ??= available.find((runtime) => !used.has(runtime.base.id) && usPartyOfPerson(runtime.base) === seat.party)?.base.id;
    if (!person) throw new Error(`No eligible member for ${seat.seat}.`);
    used.add(person);
    return { ...seat, person };
  });
  for (const chamber of ["house", "senate"] as const) {
    const room = members.filter((member) => member.chamber === chamber);
    const composition = congress.chambers[chamber];
    if (room.length !== composition.seats || room.filter((member) => member.party === congress.caucusAnchor).length !== composition.administration || room.filter((member) => member.party === "independent").length !== composition.independent) {
      throw new Error(`Congressional members disagree with ${chamber} apportionment.`);
    }
  }
  const committees = Object.fromEntries(Object.entries(congress.committees).map(([id, panel]) => {
    const { chair, ranking, ...rest } = panel;
    return [id, { ...rest, ...(chair && !vacant.has(chair) ? { chair } : {}), ...(ranking && !vacant.has(ranking) ? { ranking } : {}) }];
  }));
  const seated = { ...congress, members, committees, leadership: congress.leadership.filter((figure) => !vacant.has(figure.person)) };
  const electedPeople = withCongressMemberOffices(people, seated);
  const leadership = seatLeadership(seated, electedPeople, US_ID, turn).leadership;
  return withCommittees({ ...seated, leadership }, electedPeople, US_ID, turn);
}

/** Runtime offices agree with the post writer; an unmatched committee holder is a vacancy. */
export function withCongressMemberOffices(people: Campaign["people"], congress: Congress): Campaign["people"] {
  const officeRoles = { ...committeeSeatRoles(congress.committees), ...hillSeats(congress.leadership) };
  const members = new Map((congress.members ?? []).map((member) => [member.person, member]));
  return Object.fromEntries(Object.entries(people).map(([id, runtime]) => {
    const office = officeRoles[id];
    if (office) return [id, { ...runtime, currentRole: office }];
    const member = members.get(runtime.base.id);
    if (member) return [id, { ...runtime, currentRole: (member.chamber === "house" ? "role-representative" : "role-senator") as RoleId }];
    if (!["role-congressional-leader", "role-committee-chair", "role-representative", "role-senator"].includes(runtime.currentRole ?? "")) return [id, runtime];
    const { currentRole: _vacant, ...rest } = runtime;
    return [id, rest];
  }));
}

/** Prospective migration adds today's members, preserving every stored historical vote. */
export function withCongressMembers(campaign: Campaign): Campaign {
  if (campaign.congress.members || campaign.founding.nation !== US_ID || Object.keys(campaign.states).length < 50 || Object.values(campaign.states).reduce((sum, state) => sum + (state.delegation?.house.seats ?? 0), 0) !== campaign.congress.chambers.house.seats) return campaign;
  const generated = congressionalBench(Object.values(campaign.people).map((runtime) => runtime.base), campaign.seed);
  const people = { ...campaign.people, ...Object.fromEntries(generated.filter((person) => !campaign.people[person.id]).map((base) => [base.id, { base, alive: true }])) };
  const congress = seatCongressMembers(campaign.congress, campaign.states, people, campaign.turn);
  return { ...campaign, congress, people: withCongressMemberOffices(people, congress) };
}
