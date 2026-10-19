import { useMemo, useState } from "react";
import { withdrawNomination, type Campaign } from "@admin/engine";
import { costLines, judicialNominations, place, type JudicialNomination } from "@admin/player-core";
import { CompareAuthorize, Icon, type CompareRow } from "@admin/ui-web";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type Commission, type NationCommit } from "../../nation/economy/commit";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { Door } from "../../shell/Door";
import { AppointmentDesk } from "../appointments/AppointmentDesk";
import { CostCell } from "./cells";

export { CostCell, LinesCell, NoneCell, SenateMeter } from "./cells";

const WITHDRAW = "withdraw";

function withdrawRows(row: JudicialNomination): readonly CompareRow[] {
  return [
    { label: "Where it stands", icon: "pending", cells: { [WITHDRAW]: `Ends today, on the Record as withdrawn. Today: ${row.standing}, ${row.days} days in` } },
    { label: "Cost now", icon: "budget", cells: { [WITHDRAW]: <CostCell cost={row.withdrawal?.cost ?? {}} /> } },
  ];
}

/** A name before the Senate for a seat: withdrawing it, read as its change from today. */
function PendingNomination({ campaign, row, acts }: { readonly campaign: Campaign; readonly row: JudicialNomination; readonly acts: NationCommit }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const projection = useChoiceProjection(
    campaign,
    actsChoice(`${row.name}, for ${row.title}`, "keeping the nomination", "Keeping the nomination before the Senate.", [
      { id: WITHDRAW, label: "Withdraw it", ...(row.withdrawal ? { act: { act: "withdraw-nomination", id: row.id } } : { refused: "The nomination can no longer be withdrawn." }) },
    ]),
    selected,
  );
  const commission: Commission = {
    title: `${row.name}'s nomination withdrawn`,
    review: { tier: "full", title: `Withdraw ${row.name}'s nomination`, verb: "Confirm the withdrawal", danger: true },
    lines: [
      { label: "Seat", value: row.title },
      { label: "Charged", value: costLines(row.withdrawal?.cost ?? {}).join("; ") || "Nothing" },
    ],
    packet: () => {
      const result = withdrawNomination(campaign, row.id);
      if (!result.ok) throw new Error(result.reason);
      return result.packet;
    },
  };
  return (
    <div className="nominate">
      <Door className="justice-attention-row" href={place.person(row.nomineeId)}><Icon name="appoint" size={20} /><span><strong>{row.name}</strong><span>{row.title} · {row.standing} · {row.days} days before the Senate</span></span><span aria-hidden="true">→</span></Door>
      <CompareAuthorize
        title={`${row.name}, for ${row.title}`}
        options={[{ id: WITHDRAW, label: "Withdraw it", icon: "return", accent: "red", ...(row.withdrawal ? {} : { unavailable: "Not available: the nomination can no longer be withdrawn." }) }]}
        rows={withdrawRows(row)}
        selected={selected}
        onSelect={setSelected}
        verb="Withdraw the nomination"
        tone="danger"
        onAuthorize={() => void acts.commit(commission)}
        review="The name comes back today. Pulling it costs less than losing on the floor, and it is not free."
        baselineReview={row.committee ? `Kept, it waits on ${row.committee} and the floor.` : "Kept, it waits on the Senate."}
        busy={acts.busy}
        {...(projection ? { projection } : {})}
      />
    </div>
  );
}

function Heading() {
  return (
    <h2 id="courts-nominations" className="nation-section__title">
      <Icon name="appoint" size={20} /> Nominations
    </h2>
  );
}

/** The open seats on the federal courts as the appointments desk's rows, then every name already before the Senate. */
export function Nominations({ campaign }: { readonly campaign: Campaign }) {
  const acts = useNationCommit(campaign);
  const pending = useMemo(() => judicialNominations(campaign), [campaign]);
  if (acts.committed) {
    return (
      <section className="nation-section" aria-labelledby="courts-nominations">
        <Heading />
        <ActReceipt committed={acts.committed} again="Back to the nominations" onAgain={() => acts.dismiss()} mapNote={null} />
      </section>
    );
  }
  return (
    <section className="nation-section" aria-labelledby="courts-nominations">
      <Heading />
      {acts.problem ? (
        <p className="nation-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
      <AppointmentDesk
        campaign={campaign}
        scope={{ group: "courts" }}
        headingId="courts-nominations"
        empty="Every seat on the Supreme Court and the courts of appeals is filled or has a name before the Senate. A judge serves for life, so a seat opens only when one leaves it."
      />
      {pending.length > 0 ? <h3 className="nation-subtitle">Before the Senate ({pending.length})</h3> : null}
      {pending.map((row) => (
        <PendingNomination key={row.id} campaign={campaign} row={row} acts={acts} />
      ))}
    </section>
  );
}
