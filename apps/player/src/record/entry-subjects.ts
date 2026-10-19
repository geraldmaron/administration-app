import { executiveOrder, type Campaign } from "@admin/engine";
import { place } from "@admin/player-core";
import type { IconName } from "@admin/ui";
import { organizationById } from "@admin/world";

/** One thing a Record entry was about, with the screen that holds it. */
export type EntrySubject = { readonly id: string; readonly label: string; readonly href: string; readonly icon: IconName };

function nationName(campaign: Campaign, id: string): string {
  return campaign.nations[id as keyof Campaign["nations"]]?.base.identity.name ?? id;
}

function subjectOf(campaign: Campaign, id: string): EntrySubject | undefined {
  const person = campaign.people[id as keyof Campaign["people"]];
  if (person) return { id, label: person.base.name, href: place.person(id), icon: "subjectPerson" };
  const bill = campaign.bills[id];
  if (bill) return { id, label: bill.title, href: place.bill(id), icon: "law" };
  const conflict = campaign.conflicts[id];
  if (conflict) return { id, label: `The war between ${nationName(campaign, conflict.aggressor)} and ${nationName(campaign, conflict.defender)}`, href: place.war(id), icon: "conflict" };
  const treaty = campaign.treaties[id];
  if (treaty) return { id, label: treaty.title, href: place.treaty(id), icon: "sign" };
  const file = campaign.cases?.[id];
  if (file) return { id, label: file.title, href: place.case(id), icon: "court" };
  const signed = campaign.orders.find((record) => record.id === id);
  const order = executiveOrder(signed?.order ?? id);
  if (order) return { id, label: order.name, href: place.order(order.id), icon: "order" };
  const org = organizationById.get(id);
  if (org) return { id, label: org.name, href: place.organization(id), icon: "building" };
  return undefined;
}

/**
 * The people, bills, wars, treaties, cases, orders and organizations an entry
 * names, each once. Governments, states and agencies already have their own
 * lines on the entry, so they are not repeated here.
 */
export function entrySubjects(campaign: Campaign, eventId: string): readonly EntrySubject[] {
  const ids = campaign.ledger.find((row) => row.causal?.eventId === eventId)?.causal?.entities ?? [];
  const found = [...new Set(ids)].flatMap((id) => {
    const subject = subjectOf(campaign, id);
    return subject ? [subject] : [];
  });
  return found.filter((subject, i) => found.findIndex((other) => other.href === subject.href) === i);
}
