import { useState, type ReactNode } from "react";
import { availableIssueBrokers, dismissMinister, issueMemberOutreach, removeOfficer, selectBillsInProgress, withdrawNomination, type Campaign } from "@admin/engine";
import { REMOVAL_CAUSES, personLever, withdrawalLever, type PersonFile, type PricedOption } from "@admin/player-core";
import type { PersonId } from "@admin/world";
import { Button, Column, Row, Sheet, Text, type IconName } from "@admin/ui";
import { Select } from "@admin/ui/forms";
import { ActCompare } from "../executive/ActCompare";
import type { ChairActs } from "../executive/acts";
import { removalLaw } from "../executive/present";
import { personActs, type PersonActKind } from "./person-view";

type Props = { readonly campaign: Campaign; readonly file: PersonFile; readonly acts: ChairActs };

/** Remove an officer below the cabinet, which a for-cause office allows only with the cause stated in writing. */
function RemoveOfficer({ campaign, file, acts }: Props) {
  const seat = file.seat;
  const [cause, setCause] = useState<string | undefined>(undefined);
  if (seat?.kind !== "officer") return null;
  const lever = personLever(campaign, seat);
  const forCause = seat.removal === "for-cause";
  const stated = cause?.trim() ?? "";
  const options: readonly PricedOption[] = [
    {
      id: "remove",
      label: `Remove ${file.person.name}`,
      ...(lever.kind === "available" ? { price: { cost: lever.cost, risks: lever.risks } } : { unavailable: lever.kind === "refused" ? lever.refusal : lever.rule }),
      ...(lever.kind === "available" && forCause && stated.length === 0 ? { unavailable: "Pick a reason first." } : {}),
    },
  ];
  const remove = () => {
    if (forCause && stated.length === 0) return;
    acts.run(`${file.person.name} removed as ${seat.title}`, () => removeOfficer(campaign, seat.institution, forCause ? stated : undefined), { tier: "full", title: `Remove ${file.person.name} as ${seat.title}`, verb: "Confirm the removal", danger: true, law: removalLaw(seat.institution) }, [{ label: "Office", value: seat.title }, ...(forCause ? [{ label: "Reason given", value: stated }] : [])]);
  };
  return (
    <Column gap="sm">
      {forCause ? (
        <Column gap="xs">
          <Select label="Reason for removal" placeholder="Pick a reason" value={cause} onChange={setCause} options={REMOVAL_CAUSES.map((entry) => ({ value: entry, label: entry }))} />
          <Text variant="caption" tone="secondary">
            The law lets you remove this official only for a reason, so pick one to put on the record. Picking a reason is your claim, not proof. It doesn't show they did anything wrong, or that the removal would hold up in court.
          </Text>
        </Column>
      ) : null}
      <ActCompare campaign={campaign} title="Remove them" options={options} verbs={{ remove: `Remove ${file.person.name}` }} onAuthorize={remove} busy={acts.busy} danger law={removalLaw(seat.institution)} />
    </Column>
  );
}

function Dismiss({ campaign, file, acts }: Props) {
  const seat = file.seat;
  if (seat?.kind !== "cabinet") return null;
  const lever = personLever(campaign, seat);
  const options: readonly PricedOption[] = [
    { id: "dismiss", label: `Dismiss ${file.person.name}`, ...(lever.kind === "available" ? { price: { cost: lever.cost, risks: lever.risks } } : { unavailable: lever.kind === "refused" ? lever.refusal : lever.rule }) },
  ];
  return (
    <ActCompare
      campaign={campaign}
      title="Dismiss them"
      options={options}
      verbs={{ dismiss: `Dismiss ${file.person.name}` }}
      onAuthorize={() => acts.run(`${file.person.name} dismissed`, () => dismissMinister(campaign, seat.role), { tier: "full", title: `Dismiss ${file.person.name}`, verb: "Confirm the dismissal", danger: true, law: "dismiss" }, [{ label: "Chair", value: seat.title }])}
      busy={acts.busy}
      danger
      law="dismiss"
    />
  );
}

function Withdraw({ campaign, file, acts }: Props) {
  const nomination = file.dossier.nomination;
  if (!nomination) return null;
  const id = nomination.nomination.id;
  const lever = withdrawalLever(campaign, id);
  const options: readonly PricedOption[] = [
    { id: "withdraw", label: "Withdraw the nomination", ...(lever ? { price: lever } : { unavailable: "It's too late to withdraw this nomination." }) },
  ];
  return (
    <ActCompare
      campaign={campaign}
      title="Withdraw the nomination"
      options={options}
      verbs={{ withdraw: "Withdraw the nomination" }}
      onAuthorize={() => acts.run(`${file.person.name}'s nomination withdrawn`, () => withdrawNomination(campaign, id), { tier: "full", title: `Withdraw ${file.person.name}'s nomination`, verb: "Confirm the withdrawal", danger: true, law: "withdraw" }, [{ label: "Office", value: nomination.officeTitle }])}
      busy={acts.busy}
      law="withdraw"
    />
  );
}

/** The person desk authorizes a conversation with a member of Congress, never an invented promise of a vote. */
function MemberOutreach({ campaign, file, acts }: Props) {
  const bills = selectBillsInProgress(campaign);
  const [billId, setBillId] = useState(bills[0]?.id ?? "");
  const [broker, setBroker] = useState("");
  if (!campaign.congress.members?.some((member) => member.person === file.person.id) || !campaign.people[file.person.id]?.alive) return null;
  const bill = campaign.bills[billId];
  const brokers = bill ? availableIssueBrokers(campaign, bill).filter((id) => id !== file.person.id) : [];
  const validBroker = brokers.includes(broker as PersonId) ? (broker as PersonId) : undefined;
  const prepared = bill ? issueMemberOutreach(campaign, file.person.id, bill.id, validBroker) : undefined;
  const options: readonly PricedOption[] = [
    { id: "request", label: validBroker ? "Send someone to make your case" : "Ask them yourself", ...(prepared?.ok ? { price: { cost: { standing: validBroker ? -0.02 : -0.01 }, risks: [] }, follows: [validBroker ? "This uses both of your outreach requests for today. You'll hear back in three days." : "This uses one of your two outreach requests for today. You'll hear back tomorrow.", "You won't know where they stand until they answer. Even if they agree to talk, that doesn't promise their vote."] } : { unavailable: prepared?.reason ?? "Pick a bill that's still moving through Congress first." }) },
  ];
  return (
    <Column gap="sm">
      <Select label="Proposal" placeholder="Choose a bill" value={billId || undefined} onChange={(next) => { setBillId(next); setBroker(""); }} options={bills.map((entry) => ({ value: entry.id, label: entry.title }))} />
      <Select label="Who asks" value={broker || "direct"} onChange={(next) => setBroker(next === "direct" ? "" : next)} options={[{ value: "direct", label: "You, directly" }, ...brokers.map((id) => ({ value: id as string, label: campaign.people[id]?.base.name ?? String(id) }))]} />
      <ActCompare campaign={campaign} title="Ask for their support" options={options} verbs={{ request: "Ask for their support" }} busy={acts.busy} law="outreach" onAuthorize={() => acts.run(`Asked ${file.person.name} for support`, () => issueMemberOutreach(campaign, file.person.id, billId, validBroker), { tier: "confirm", title: `Ask ${file.person.name} for support`, law: "outreach" }, [{ label: "Proposal", value: bill?.title ?? "" }])} />
    </Column>
  );
}

const ACT: Readonly<Record<PersonActKind, { readonly button: string; readonly title: string; readonly icon: IconName; readonly body: (props: Props) => ReactNode }>> = {
  dismiss: { button: "Dismiss", title: "Dismiss from the cabinet", icon: "reject", body: (props) => <Dismiss {...props} /> },
  remove: { button: "Remove from office", title: "Remove from office", icon: "reject", body: (props) => <RemoveOfficer {...props} /> },
  withdraw: { button: "Withdraw nomination", title: "Withdraw the nomination", icon: "pending", body: (props) => <Withdraw {...props} /> },
  outreach: { button: "Ask for support", title: "Ask for their support", icon: "microphone", body: (props) => <MemberOutreach {...props} /> },
};

/**
 * What the President can do about this person, as buttons in the file's
 * header: dismiss, remove or withdraw, each weighed against keeping things as
 * they are in its own sheet, and a conversation with a member of Congress.
 * The sheet closes the moment an act goes to review, so the review is the
 * only layer open when the President confirms.
 */
export function PersonActs({ campaign, file, acts }: Props) {
  const [open, setOpen] = useState<PersonActKind | undefined>(undefined);
  const kinds = personActs(campaign, file);
  if (kinds.length === 0) return null;
  const handOff: ChairActs = { ...acts, run: (...args) => { setOpen(undefined); acts.run(...args); } };
  const act = open ? ACT[open] : undefined;
  return (
    <>
      <Row id="person-acts" gap="sm" wrap role="group" aria-label="What you can do">
        {kinds.map((kind) => (
          <Button key={kind} kind="secondary" size="compact" icon={ACT[kind].icon} disabled={acts.busy} onPress={() => setOpen(kind)}>
            {ACT[kind].button}
          </Button>
        ))}
      </Row>
      <Sheet open={act !== undefined} onClose={() => setOpen(undefined)} title={act?.title ?? ""} eyebrow={file.person.name} wide>
        {act ? act.body({ campaign, file, acts: handOff }) : null}
      </Sheet>
    </>
  );
}
