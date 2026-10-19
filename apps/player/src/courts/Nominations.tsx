import { useMemo } from "react";
import { withdrawNomination, type Campaign } from "@admin/engine";
import { costLines, judicialNominations, type ActComparison, type JudicialNomination } from "@admin/player-core";
import { Card, Column, ReadingFrame, Text } from "@admin/ui";
import { PersonName } from "../dossier/PersonPeek";
import { voteFrame } from "../congress/mood";
import { VoteCount } from "@admin/ui/legislature";
import { ActChooser } from "../congress/ActChooser";
import type { ActCommit } from "../congress/commit";

import { CitedLawHelp } from "../law/LawHelp";
import { AppointmentDesk } from "../oversight/Appointments";
import { LAW } from "./model";

function withdrawComparison(row: JudicialNomination): ActComparison {
  return {
    rows: [{ key: "stands", label: "Where it stands" }, { key: "senate", label: "Senate support" }, { key: "raised", label: "Concerns from the background check" }, { key: "cost", label: "Cost" }],
    columns: [
      { id: "withdraw", label: "Withdraw it", verb: "Withdraw the nomination", ...(row.withdrawal ? {} : { refusal: "It's too late to withdraw this nomination." }), review: "The nomination ends today. Pulling it costs less than losing a Senate vote, but it still costs something.", cells: { stands: { lines: ["Ends today and shows in the Record as withdrawn"] }, senate: { lines: ["No vote"] }, raised: { lines: ["No longer matters"] }, cost: { lines: costLines(row.withdrawal?.cost ?? {}).length ? costLines(row.withdrawal?.cost ?? {}) : ["Nothing"], stance: "caution" } } },
    ],
  };
}

/** The open seats on the federal courts as the appointments desk draws them, then every name already before the Senate against withdrawing it. */
export function JudicialNominations({ campaign, acts }: { readonly campaign: Campaign; readonly acts: ActCommit }) {
  const pending = useMemo(() => judicialNominations(campaign), [campaign]);
  return (
    <Card title="Nominations" icon="appoint" help={<CitedLawHelp title="Picking judges" meaning="You nominate judges for the Supreme Court and the appeals courts, and the Senate confirms them. Judges serve for life, so a seat opens only when a judge leaves." cites={[LAW.appointments]} />}>
      <AppointmentDesk campaign={campaign} acts={acts} scope={{ group: "courts" }} empty="Every seat on the Supreme Court and the appeals courts is filled or has a nominee waiting on the Senate. Judges serve for life, so a seat opens only when one leaves." />
      {pending.length > 0 ? <Text variant="label">Waiting on the Senate ({pending.length})</Text> : null}
      {pending.map((row) => (
        <Column key={row.id} gap="md" paddingVertical="sm" borderTopWidth={1} borderColor="borderColor">
          <Column gap="2xs">
            <PersonName campaign={campaign} id={row.nomineeId} name={row.name} role={`Nominee for ${row.title}`} />
            <Text variant="caption" tone="secondary">{`${row.title} · ${row.standing} · ${row.days} days waiting on the Senate`}</Text>
          </Column>
          <ReadingFrame {...voteFrame(`Senate votes ${row.name} needs`)}>
            <VoteCount name="Senate, to confirm" seats={row.vote.yeas + row.vote.nays} required={row.vote.required} requiredLabel="a majority of those voting" range={{ lower: 0, upper: row.vote.yeas + row.vote.nays }} />
          </ReadingFrame>
          <ActChooser id={`withdraw:${row.id}`} title={`${row.name}, for ${row.title}`} comparison={withdrawComparison(row)} acts={acts} authority={LAW.appointments} danger again="Back to the nominations" receiptTitle={() => `${row.name}'s nomination withdrawn`}
            packet={() => {
              const result = withdrawNomination(campaign, row.id);
              if (!result.ok) throw new Error(result.reason);
              return result.packet;
            }} />
        </Column>
      ))}
    </Card>
  );
}
