import { actOf, availableIssueBrokers, institutionForRole, knownPersonContacts, committeeName, selectNation, institutionDef, type Campaign } from "@admin/engine";
import { worldDataset, partyById, type PersonId } from "@admin/world";

export type RelationshipScope = { readonly id: string; readonly label: string; readonly people: readonly PersonId[]; readonly evidence: string };

/** Public institutional membership is grouping evidence, never private trust or access. */
export function relationshipScopes(campaign: Campaign): readonly RelationshipScope[] {
  const groups = new Map<string, { label: string; people: PersonId[]; evidence: string }>();
  const add = (id: string, label: string, person: PersonId, evidence: string) => {
    const group = groups.get(id) ?? { label, people: [], evidence };
    if (!group.people.includes(person)) group.people.push(person);
    groups.set(id, group);
  };
  const federal = new Set([...Object.values(campaign.player.cabinet), ...Object.values(campaign.institutions).flatMap((entry) => entry.leader ? [entry.leader] : []), ...(campaign.congress.members ?? []).map((entry) => entry.person)]);
  for (const runtime of Object.values(campaign.people)) {
    if (!runtime.alive || !runtime.currentRole) continue;
    const person = runtime.base;
    add(`nation:${person.nationality}`, `${selectNation(campaign, person.nationality)?.base.identity.name ?? person.nationality} officials`, person.id, "These people hold public office in the same country. Being in this group doesn't give you a way in or private contact.");
    if (federal.has(person.id)) add("federal", "Federal government", person.id, "These people hold federal jobs. Their personal ties are shown separately.");
    const institution = institutionForRole(runtime.currentRole);
    if (institution) add(`institution:${institution.id}`, institution.name, person.id, "These people lead the same department. Working in the same place doesn't mean they trust each other.");
    const charter = worldDataset.charters.find((entry) => entry.id === selectNation(campaign, person.nationality)?.base.identity.government);
    const party = partyById(charter?.parties ?? [], person.party);
    if (party) add(`party:${party.id}`, `${party.name} officials`, person.id, "These people belong to the same party. That doesn't mean they work together.");
  }
  for (const runtime of Object.values(campaign.institutions)) {
    if (runtime.leader) add(`institution:${runtime.id}`, institutionDef(runtime.id)?.name ?? runtime.id, runtime.leader, "These people lead this agency. That says nothing about who they trust.");
  }
  for (const committee of Object.values(campaign.congress.committees)) {
    for (const person of [committee.chair, committee.ranking]) if (person) add(`committee:${committee.committee}`, committeeName(committee.committee), person, "The committee's chair and its top member from the other party. Holding these posts doesn't mean they work well together.");
  }
  for (const member of campaign.congress.members ?? []) add(`chamber:${member.chamber}`, member.chamber === "house" ? "House of Representatives" : "Senate", member.person, "Members elected to vote in this chamber.");
  for (const bill of Object.values(campaign.bills)) {
    if (bill.status !== "in-progress") continue;
    const ids = new Set([...availableIssueBrokers(campaign, bill), ...knownPersonContacts(campaign).filter((edge) => edge.actId === actOf(bill)?.id).flatMap((edge) => [edge.from, edge.to])]);
    for (const person of ids) add(`issue:${bill.id}`, `Issue: ${bill.title}`, person, "People whose jobs touch this bill, plus conversations about it that are on record. It doesn't predict who will spread the word or promise any votes.");
  }
  return [...groups].map(([id, group]) => ({ id, ...group, people: group.people.sort((a, b) => (campaign.people[a]?.base.name ?? a).localeCompare(campaign.people[b]?.base.name ?? b)) })).sort((a, b) => a.label.localeCompare(b.label));
}
