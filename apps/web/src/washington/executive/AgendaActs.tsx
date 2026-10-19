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
import { ActCompare } from "./ActCompare";
import type { useChairActs } from "./acts";

type Acts = ReturnType<typeof useChairActs>;

const ANSWERS: readonly ResignationAnswer[] = ["accept", "decline"];
const ANSWER_LABEL: Readonly<Record<ResignationAnswer, string>> = { accept: "Accept the resignation", decline: "Ask them to stay" };

function priced(projection: ({ readonly ok: true } & ActPrice) | { readonly ok: false; readonly reason: string }): Pick<PricedOption, "price" | "unavailable"> {
  return projection.ok ? { price: { cost: projection.cost, risks: projection.risks } } : { unavailable: projection.reason };
}

function nameOf(campaign: Campaign, person: string): string {
  return selectPerson(campaign, person as never)?.base.name ?? "The Secretary";
}

/** A Secretary's request: take it, or leave it on the desk until it lapses. */
function Proposal({ campaign, proposal, acts }: { readonly campaign: Campaign; readonly proposal: MinisterProposal; readonly acts: Acts }) {
  const name = nameOf(campaign, proposal.person);
  const options: readonly PricedOption[] = [
    { id: "take", label: "Grant the request", ...priced(projectMinisterProposal(campaign, proposal.id)) },
  ];
  return (
    <article id={`agenda-${proposal.id}`} className="exec-agenda" aria-label={`${name}'s request`}>
      <p className="exec-agenda__said">
        <strong>{name} asks:</strong> {proposal.summary}
      </p>
      <ActCompare campaign={campaign} title="Grant the request" options={options} verbs={{ take: "Grant the request" }} acts={{ take: { act: "take-proposal", id: proposal.id } }} onAuthorize={() => void acts.run(`${name}'s request granted`, () => takeMinisterProposal(campaign, proposal.id), { tier: "confirm", title: `Grant ${name}'s request` })} baselineReview="If you don't answer when its week passes, the request lapses." busy={acts.busy} />
    </article>
  );
}

/** A Secretary's offer to resign: accept it, ask them to stay, or leave it standing. */
function Offer({ campaign, offer, acts }: { readonly campaign: Campaign; readonly offer: ResignationOffer; readonly acts: Acts }) {
  const name = nameOf(campaign, offer.person);
  const options: readonly PricedOption[] = [
    ...ANSWERS.map((answer) => ({ id: answer, label: ANSWER_LABEL[answer], ...priced(projectResignationAnswer(campaign, offer.id, answer)) })),
  ];
  const answer = (id: string) => {
    const chosen = ANSWERS.find((entry) => entry === id);
    if (!chosen) return;
    void acts.run(chosen === "accept" ? `${name}'s resignation accepted` : `${name} asked to stay`, () => answerResignationOffer(campaign, offer.id, chosen), chosen === "accept" ? { tier: "full", title: `Accept ${name}'s resignation`, verb: "Confirm and accept", danger: true } : { tier: "confirm", title: `Ask ${name} to stay` });
  };
  return (
    <article id={`agenda-${offer.id}`} className="exec-agenda" aria-label={`${name}'s offer to resign`}>
      <p className="exec-agenda__said">
        <strong>{name} offers to resign:</strong> {offer.reason}
      </p>
      <ActCompare campaign={campaign} title="Compare the answers" options={options} verbs={{ accept: "Accept the resignation", decline: "Ask them to stay" }} acts={{ accept: { act: "answer-resignation", id: offer.id, answer: "accept" }, decline: { act: "answer-resignation", id: offer.id, answer: "decline" } }} onAuthorize={answer} baselineReview="An offer left unanswered lapses, and they read the silence." busy={acts.busy} />
    </article>
  );
}

/** A bloc formed out of this chair: bring it back inside, or leave it pressing on you. */
function Faction({ campaign, faction, acts }: { readonly campaign: Campaign; readonly faction: CabinetFaction; readonly acts: Acts }) {
  const options: readonly PricedOption[] = [
    { id: "reconcile", label: "Reconcile the bloc", ...priced(projectFactionReconciliation(campaign, faction.id)) },
  ];
  return (
    <article className="exec-agenda" aria-label={faction.name}>
      <p className="exec-agenda__said">
        <strong>{faction.name}</strong> has {faction.members.length} {faction.members.length === 1 ? "member" : "members"}, {faction.seated} still in your government.
      </p>
      <ActCompare campaign={campaign} title="Reconcile the bloc" options={options} verbs={{ reconcile: "Reconcile the bloc" }} acts={{ reconcile: { act: "reconcile", faction: faction.id } }} onAuthorize={() => void acts.run(`${faction.name} reconciled`, () => reconcileFaction(campaign, faction.id), { tier: "confirm", title: `Reconcile ${faction.name}` })} baselineReview="Until you reconcile it, the bloc keeps adding to the pressure to remove you." busy={acts.busy} />
    </article>
  );
}

/** What the chair's Secretary has put to the President, and any bloc formed out of it. */
export function AgendaActs({ campaign, proposals, offers, factions, acts }: { readonly campaign: Campaign; readonly proposals: readonly MinisterProposal[]; readonly offers: readonly ResignationOffer[]; readonly factions: readonly CabinetFaction[]; readonly acts: Acts }) {
  if (proposals.length + offers.length + factions.length === 0) return null;
  return (
    <section className="exec-acts" aria-labelledby="exec-agenda">
      <h2 id="exec-agenda" className="exec__heading">
        Waiting on you
      </h2>
      {offers.map((offer) => (
        <Offer key={offer.id} campaign={campaign} offer={offer} acts={acts} />
      ))}
      {proposals.map((proposal) => (
        <Proposal key={proposal.id} campaign={campaign} proposal={proposal} acts={acts} />
      ))}
      {factions.map((faction) => (
        <Faction key={faction.id} campaign={campaign} faction={faction} acts={acts} />
      ))}
    </section>
  );
}
