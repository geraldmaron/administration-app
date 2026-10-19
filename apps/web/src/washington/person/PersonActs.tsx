import { MemberOutreach } from "./MemberOutreach";
import { useState } from "react";
import { dismissMinister, removeOfficer, withdrawNomination, type Campaign } from "@admin/engine";
import { REMOVAL_CAUSES, personLever, withdrawalLever, type PersonFile, type PricedOption } from "@admin/player-core";
import { Field } from "@admin/ui-web";
import { ActCompare } from "../executive/ActCompare";
import type { useChairActs } from "../executive/acts";

type Acts = ReturnType<typeof useChairActs>;

/** Remove an officer below the cabinet, which a for-cause office allows only with the cause stated in writing. */
function RemoveOfficer({ campaign, file, acts }: { readonly campaign: Campaign; readonly file: PersonFile; readonly acts: Acts }) {
  const seat = file.seat;
  const [cause, setCause] = useState("");
  if (seat?.kind !== "officer") return null;
  const lever = personLever(campaign, seat);
  const forCause = seat.removal === "for-cause";
  const options: readonly PricedOption[] = [
    {
      id: "remove",
      label: `Remove ${file.person.name}`,
      ...(lever.kind === "available" ? { price: { cost: lever.cost, risks: lever.risks } } : { unavailable: lever.kind === "refused" ? lever.refusal : lever.rule }),
      ...(lever.kind === "available" && forCause && cause.trim().length === 0 ? { unavailable: "state the cause first" } : {}),
    },
  ];
  const remove = () => {
    if (forCause && cause.trim().length === 0) return;
    void acts.run(`${file.person.name} removed as ${seat.title}`, () => removeOfficer(campaign, seat.institution, forCause ? cause.trim() : undefined), { tier: "full", title: `Remove ${file.person.name} as ${seat.title}`, verb: "Confirm the removal", danger: true }, [{ label: "Office", value: seat.title }]);
  };
  return (
    <>
      {forCause ? (
        <Field label="Stated removal cause" hint="Choose a supported cause to record. Selection is a presidential assertion, not evidence that misconduct occurred or that removal is legally sufficient.">
          {(control) => <select {...control} className="ui-input" value={cause} onChange={(event) => setCause(event.target.value)}><option value="">Select a supported cause</option>{REMOVAL_CAUSES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>}
        </Field>
      ) : null}
      <ActCompare campaign={campaign} title="Remove them" options={options} verbs={{ remove: `Remove ${file.person.name}` }} onAuthorize={remove} busy={acts.busy} tone="danger" />
    </>
  );
}

function Dismiss({ campaign, file, acts }: { readonly campaign: Campaign; readonly file: PersonFile; readonly acts: Acts }) {
  const seat = file.seat;
  if (seat?.kind !== "cabinet") return null;
  const lever = personLever(campaign, seat);
  const options: readonly PricedOption[] = [
    {
      id: "dismiss",
      label: `Dismiss ${file.person.name}`,
      ...(lever.kind === "available" ? { price: { cost: lever.cost, risks: lever.risks } } : { unavailable: lever.kind === "refused" ? lever.refusal : lever.rule }),
    },
  ];
  return (
    <ActCompare
      campaign={campaign}
      title="Dismiss them"
      options={options}
      verbs={{ dismiss: `Dismiss ${file.person.name}` }}
      onAuthorize={() => void acts.run(`${file.person.name} dismissed`, () => dismissMinister(campaign, seat.role), { tier: "full", title: `Dismiss ${file.person.name}`, verb: "Confirm the dismissal", danger: true }, [{ label: "Chair", value: seat.title }])}
      busy={acts.busy}
      tone="danger"
    />
  );
}

function Withdraw({ campaign, file, acts }: { readonly campaign: Campaign; readonly file: PersonFile; readonly acts: Acts }) {
  const nomination = file.dossier.nomination;
  if (!nomination) return null;
  const id = nomination.nomination.id;
  const lever = withdrawalLever(campaign, id);
  const options: readonly PricedOption[] = [
    { id: "withdraw", label: "Withdraw the nomination", ...(lever ? { price: lever } : { unavailable: "That nomination can no longer be withdrawn." }) },
  ];
  return (
    <ActCompare
      campaign={campaign}
      title="Withdraw the nomination"
      options={options}
      verbs={{ withdraw: "Withdraw the nomination" }}
      onAuthorize={() => void acts.run(`${file.person.name}'s nomination withdrawn`, () => withdrawNomination(campaign, id), { tier: "full", title: `Withdraw ${file.person.name}'s nomination`, verb: "Confirm the withdrawal", danger: true }, [{ label: "Office", value: nomination.officeTitle }])}
      busy={acts.busy}
    />
  );
}

/** What the President can do to this person's standing: dismiss, remove or withdraw, each against keeping things as they are. */
export function PersonActs({ campaign, file, acts }: { readonly campaign: Campaign; readonly file: PersonFile; readonly acts: Acts }) {
  if (!file.seat && !file.dossier.nomination) return <MemberOutreach campaign={campaign} file={file} acts={acts} />;
  return (
    <section className="exec-acts" aria-labelledby="person-acts">
      <h2 id="person-acts" className="exec__heading">
        Actions on this person
      </h2>
      <Dismiss campaign={campaign} file={file} acts={acts} />
      <RemoveOfficer campaign={campaign} file={file} acts={acts} />
      <Withdraw campaign={campaign} file={file} acts={acts} />
      <MemberOutreach campaign={campaign} file={file} acts={acts} />
    </section>
  );
}
