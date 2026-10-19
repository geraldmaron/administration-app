import {
  answerResignationOffer,
  projectFactionReconciliation,
  projectMinisterProposal,
  projectResignationAnswer,
  reconcileFaction,
  selectPerson,
  takeMinisterProposal,
  type CabinetFaction,
  type Campaign,
  type MinisterProposal,
  type ResignationAnswer,
  type ResignationOffer,
} from "@admin/engine";
import { type ActPrice, type PricedOption } from "@admin/player-core";
import { Column, Text } from "@admin/ui";
import { ActCompare } from "./ActCompare";
import type { ChairActs } from "./acts";

const ANSWERS: readonly ResignationAnswer[] = ["accept", "decline"];
const ANSWER_LABEL: Readonly<Record<ResignationAnswer, string>> = { accept: "Accept the resignation", decline: "Ask them to stay" };

function priced(projection: ({ readonly ok: true } & ActPrice) | { readonly ok: false; readonly reason: string }): Pick<PricedOption, "price" | "unavailable"> {
  return projection.ok ? { price: { cost: projection.cost, risks: projection.risks } } : { unavailable: projection.reason };
}

function nameOf(campaign: Campaign, person: string): string {
  return selectPerson(campaign, person as never)?.base.name ?? "The Secretary";
}

function Said({ who, text }: { readonly who: string; readonly text: string }) {
  return (
    <Text variant="body">
      <Text variant="body" weight="strong">
        {who}{" "}
      </Text>
      {text}
    </Text>
  );
}

/** A Secretary's request: take it, or leave it on the desk until it lapses. */
function Proposal({ campaign, proposal, acts }: { readonly campaign: Campaign; readonly proposal: MinisterProposal; readonly acts: ChairActs }) {
  const name = nameOf(campaign, proposal.person);
  const options: readonly PricedOption[] = [
    { id: "take", label: "Grant the request", ...priced(projectMinisterProposal(campaign, proposal.id)) },
  ];
  return (
    <Column gap="sm">
      <Said who={`${name} asks:`} text={proposal.summary} />
      <ActCompare campaign={campaign} title="Grant the request" options={options} waiting="If you don't answer by the end of the week, the request expires." verbs={{ take: "Grant the request" }} onAuthorize={() => acts.run(`${name}'s request granted`, () => takeMinisterProposal(campaign, proposal.id), { tier: "confirm", title: `Grant ${name}'s request`, law: "direct" })} busy={acts.busy} law="dismiss" />
    </Column>
  );
}

/** A Secretary's offer to resign: accept it, ask them to stay, or leave it standing. */
function Offer({ campaign, offer, acts }: { readonly campaign: Campaign; readonly offer: ResignationOffer; readonly acts: ChairActs }) {
  const name = nameOf(campaign, offer.person);
  const options: readonly PricedOption[] = [
    ...ANSWERS.map((answer) => ({ id: answer, label: ANSWER_LABEL[answer], ...priced(projectResignationAnswer(campaign, offer.id, answer)) })),
  ];
  const answer = (id: string) => {
    const chosen = ANSWERS.find((entry) => entry === id);
    if (!chosen) return;
    acts.run(chosen === "accept" ? `${name}'s resignation accepted` : `${name} asked to stay`, () => answerResignationOffer(campaign, offer.id, chosen), chosen === "accept" ? { tier: "full", title: `Accept ${name}'s resignation`, verb: "Confirm and accept", danger: true, law: "direct" } : { tier: "confirm", title: `Ask ${name} to stay` });
  };
  return (
    <Column gap="sm">
      <Said who={`${name} offers to resign:`} text={offer.reason} />
      <ActCompare campaign={campaign} title="Compare the answers" options={options} waiting="If you don't answer, the offer expires, and they'll take your silence as an answer." verbs={ANSWER_LABEL} onAuthorize={answer} busy={acts.busy} law="dismiss" />
    </Column>
  );
}

/** A bloc formed out of this chair: bring it back inside, or leave it pressing on you. Reconciling is politics, not a legal power, so it cites none. */
function Faction({ campaign, faction, acts }: { readonly campaign: Campaign; readonly faction: CabinetFaction; readonly acts: ChairActs }) {
  const options: readonly PricedOption[] = [
    { id: "reconcile", label: "Make peace with the group", ...priced(projectFactionReconciliation(campaign, faction.id)) },
  ];
  return (
    <Column gap="sm">
      <Said who={faction.name} text={`has ${faction.members.length} ${faction.members.length === 1 ? "member" : "members"}, ${faction.seated} still in your government.`} />
      <ActCompare campaign={campaign} title="Make peace with the group" options={options} waiting="Until you make peace, this group keeps adding to the pressure to remove you from office." verbs={{ reconcile: "Make peace with the group" }} onAuthorize={() => acts.run(`Made peace with ${faction.name}`, () => reconcileFaction(campaign, faction.id), { tier: "confirm", title: `Make peace with ${faction.name}` })} busy={acts.busy} />
    </Column>
  );
}

/** What the chair's Secretary has put to the President, and any bloc formed out of it. */
export function AgendaActs({ campaign, proposals, offers, factions, acts }: { readonly campaign: Campaign; readonly proposals: readonly MinisterProposal[]; readonly offers: readonly ResignationOffer[]; readonly factions: readonly CabinetFaction[]; readonly acts: ChairActs }) {
  if (proposals.length + offers.length + factions.length === 0) return null;
  return (
    <Column gap="lg" role="region" aria-label="Waiting on you">
      <Text variant="title" role="heading" aria-level={3}>
        Waiting on you
      </Text>
      {offers.map((offer) => (
        <Offer key={offer.id} campaign={campaign} offer={offer} acts={acts} />
      ))}
      {proposals.map((proposal) => (
        <Proposal key={proposal.id} campaign={campaign} proposal={proposal} acts={acts} />
      ))}
      {factions.map((faction) => (
        <Faction key={faction.id} campaign={campaign} faction={faction} acts={acts} />
      ))}
    </Column>
  );
}
