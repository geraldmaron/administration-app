import {
  COMBATANT_COMMANDS,
  INSTITUTION_IDS,
  executiveOrder,
  institutionDef,
  selectActiveConflicts,
  selectPerson,
  selectTreaties,
  type Campaign,
} from "@admin/engine";
import { STATE_IDS, stateById, worldDataset, type PersonId } from "@admin/world";
import type { EntityRef } from "../calendar/types";
import { congressSystem } from "../congress/congress-system";
import { roleTitle } from "../format/figures";
import { benchReading, courtDocket } from "../judiciary/courts";
import { place } from "../navigation/places";
import { officeOfInstitution } from "../shell/office-of";
import { worldLeaderRows } from "../world/leaders";
import { nationNameIn } from "../world/war-screen";
import type { EntityKind, SearchEntry, SearchVisual } from "./search-index";

// The campaign's own nouns as search entries: the people it seats, the bodies
// it runs, the places and instruments it keeps. Built from the same selectors
// the screens read, so a result can never open something the game does not
// show, and built on demand, because the campaign changes every week.

const ICON: Readonly<Record<EntityKind, string>> = {
  person: "subjectPerson",
  office: "westWing",
  member: "subjectChamber",
  judge: "court",
  state: "mapPin",
  country: "flag",
  bill: "subjectCapitol",
  case: "court",
  war: "conflict",
  treaty: "sign",
  org: "world",
  command: "shield",
  order: "domesticLedger",
};

const PARTY_WORDS = { democrat: "Democrat", republican: "Republican", independent: "Independent" } as const;

type Link = Extract<SearchEntry, { readonly keywords: readonly string[] }>;

function entity(kind: EntityKind, id: string, title: string, detail: string, href: string, keywords: readonly string[] = [], visual?: SearchVisual): Link {
  return { kind, id: `${kind}:${id}`, title, detail, icon: ICON[kind], href, keywords, ...(visual ? { visual } : {}) };
}

const personVisual = (name: string): SearchVisual => ({ kind: "person", name });

function people(campaign: Campaign): readonly Link[] {
  const cabinet = Object.entries(campaign.player.cabinet).flatMap(([role, id]) => {
    const person = selectPerson(campaign, id);
    return person ? [entity("person", id, person.base.name, roleTitle(role), place.person(id), [roleTitle(role)], personVisual(person.base.name))] : [];
  });
  const foreign = worldLeaderRows(campaign).flatMap((row) => (row.person ? [entity("person", row.person.id, row.person.name, `${row.title ?? "Leader"} of ${row.nationName}`, place.person(row.person.id), [row.nationName, row.title ?? "leader"], personVisual(row.person.name))] : []));
  const seated = new Set(cabinet.map((entry) => entry.id));
  const vice = campaign.vicePresident ? selectPerson(campaign, campaign.vicePresident) : undefined;
  const viceEntry = vice && campaign.vicePresident && !seated.has(`person:${campaign.vicePresident}`) ? [entity("person", campaign.vicePresident, vice.base.name, "Vice President", place.person(campaign.vicePresident), ["vice president"], personVisual(vice.base.name))] : [];
  return [...cabinet, ...viceEntry, ...foreign];
}

function members(campaign: Campaign): readonly Link[] {
  return (campaign.congress.members ?? []).flatMap((member) => {
    const person = selectPerson(campaign, member.person);
    if (!person?.alive) return [];
    const chamber = member.chamber === "senate" ? "Senator" : "Representative";
    const state = stateById.get(member.state)?.name ?? member.state;
    return [entity("member", member.person, person.base.name, `${chamber} · ${state} · ${PARTY_WORDS[member.party]}`, place.person(member.person), [state, member.state, chamber.toLowerCase(), PARTY_WORDS[member.party].toLowerCase()], personVisual(person.base.name))];
  });
}

function judges(campaign: Campaign): readonly Link[] {
  return benchReading(campaign).seats.flatMap((seat) => (seat.personId && !seat.vacant ? [entity("judge", seat.personId, seat.name, seat.chief ? "Chief Justice of the Supreme Court" : "Justice of the Supreme Court", place.person(seat.personId), ["justice", "supreme court"], personVisual(seat.name))] : []));
}

function countries(campaign: Campaign): readonly Link[] {
  return Object.values(campaign.nations)
    .filter((nation) => nation.base.id !== campaign.founding.nation)
    .flatMap((nation) => {
      const name = nation.base.identity.name;
      return [entity("country", nation.base.id, name, "Country", place.country(nation.base.id), [nation.base.identity.capital, nation.base.identity.adjective], { kind: "flag", nation: nation.base.id })];
    });
}

function states(): readonly Link[] {
  return STATE_IDS.flatMap((id) => {
    const state = stateById.get(id);
    return state ? [entity("state", id, state.name, "State", place.state(id), [id])] : [];
  });
}

function offices(): readonly Link[] {
  return INSTITUTION_IDS.flatMap((id) => {
    const def = institutionDef(id);
    const office = officeOfInstitution(id);
    return def && office ? [entity("office", id, def.name, def.mandate, place.office(office), [def.abbr])] : [];
  });
}

function bills(campaign: Campaign): readonly Link[] {
  return congressSystem(campaign).bills.map((bill) => entity("bill", bill.id, bill.title, bill.line, bill.href, [bill.sponsor]));
}

function cases(campaign: Campaign): readonly Link[] {
  const docket = courtDocket(campaign);
  return [...docket.pending, ...docket.ruled].map((row) => entity("case", row.id, row.orderName, row.question, row.href));
}

function wars(campaign: Campaign): readonly Link[] {
  return selectActiveConflicts(campaign).map((war) => entity("war", war.id, `${nationNameIn(campaign, war.aggressor)} against ${nationNameIn(campaign, war.defender)}`, war.cause, place.war(war.id)));
}

function treaties(campaign: Campaign): readonly Link[] {
  return selectTreaties(campaign).map((record) => entity("treaty", record.id, record.title, `Treaty with ${nationNameIn(campaign, record.counterpart)}`, place.treaty(record.id)));
}

function orgs(): readonly Link[] {
  return worldDataset.organizations.map((org) => entity("org", org.id, org.name, "International organization", place.organization(org.id)));
}

function commands(): readonly Link[] {
  return COMBATANT_COMMANDS.map((command) => entity("command", command.id, command.name, command.mission, place.command(command.id), [command.abbr]));
}

function orders(campaign: Campaign): readonly Link[] {
  return campaign.orders.flatMap((record) => {
    const order = executiveOrder(record.order);
    return order ? [entity("order", record.id, order.name, order.summary, place.order(record.id))] : [];
  });
}

/** Everything in the campaign a President might look up by name, people first. */
export function entityEntries(campaign: Campaign): readonly SearchEntry[] {
  return [...people(campaign), ...members(campaign), ...judges(campaign), ...offices(), ...countries(campaign), ...states(), ...bills(campaign), ...cases(campaign), ...wars(campaign), ...treaties(campaign), ...orgs(), ...commands(), ...orders(campaign)];
}

/** A thing a calendar row or a notification is about, as a name and the door to it. */
export type NamedRef = { readonly kind: EntityRef["kind"]; readonly id: string; readonly name: string; readonly role: string; readonly href: string };

/** The name and door for an entity a feed names; nothing when the campaign holds no such thing, so a stale reference draws no dead link. */
export function resolveRef(campaign: Campaign, ref: EntityRef): NamedRef | undefined {
  switch (ref.kind) {
    case "person": {
      const person = selectPerson(campaign, ref.id as PersonId);
      return person ? { ...ref, name: person.base.name, role: person.currentRole ? roleTitle(person.currentRole) : "Person", href: place.person(ref.id) } : undefined;
    }
    case "nation": {
      const nation = campaign.nations[ref.id as keyof Campaign["nations"]];
      return nation ? { ...ref, name: nation.base.identity.name, role: "Country", href: place.country(ref.id) } : undefined;
    }
    case "state": {
      const state = stateById.get(ref.id as never);
      return state ? { ...ref, name: state.name, role: "State", href: place.state(ref.id) } : undefined;
    }
    case "bill": {
      const bill = congressSystem(campaign).bills.find((row) => row.id === ref.id);
      return bill ? { ...ref, name: bill.title, role: "Bill", href: bill.href } : undefined;
    }
    case "case": {
      const row = [...courtDocket(campaign).pending, ...courtDocket(campaign).ruled].find((entry) => entry.id === ref.id);
      return row ? { ...ref, name: row.orderName, role: "Court case", href: row.href } : undefined;
    }
    case "institution": {
      const def = institutionDef(ref.id as never);
      const office = def ? officeOfInstitution(def.id) : undefined;
      return def && office ? { ...ref, name: def.name, role: "Office", href: place.office(office) } : undefined;
    }
    case "war": {
      const war = campaign.conflicts[ref.id];
      return war ? { ...ref, name: `${nationNameIn(campaign, war.aggressor)} against ${nationNameIn(campaign, war.defender)}`, role: "War", href: place.war(ref.id) } : undefined;
    }
    case "order": {
      const record = campaign.orders.find((entry) => entry.id === ref.id);
      const order = record ? executiveOrder(record.order) : undefined;
      return order ? { ...ref, name: order.name, role: "Executive order", href: place.order(ref.id) } : undefined;
    }
  }
}
