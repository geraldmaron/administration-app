import { useState } from "react";
import type { Campaign, CommitmentStatus } from "@admin/engine";
import { commitmentChoices, commitmentOrder, commitmentsReading } from "@admin/player-core";
import { Field } from "@admin/ui-web";
import type { NationCommit } from "../../nation/economy/commit";
import { ActFrame } from "./ActFrame";

const VERBS: Readonly<Record<string, string>> = { active: "Resume it", suspended: "Suspend it", "wound-down": "Wind it down" };
const DONE: Readonly<Record<string, string>> = { active: "resumed", suspended: "suspended", "wound-down": "wound down" };

/** Resuming, suspending or winding down one commitment abroad, against leaving it as it stands. */
export function CommitmentActPanel({ campaign, id, acts, onClose }: { readonly campaign: Campaign; readonly id: string; readonly acts: NationCommit; readonly onClose: () => void }) {
  const row = commitmentsReading(campaign).rows.find((entry) => entry.id === id);
  const [reason, setReason] = useState("");
  const what = row?.what ?? "the commitment";
  return (
    <ActFrame
      tier="full"
      title={`Change ${what}`}
      table={commitmentChoices(campaign, id)}
      acts={acts}
      onClose={onClose}
      tone="danger"
      verb={(selected) => VERBS[selected] ?? "Change it"}
      review={(selected) => `You will ${(VERBS[selected] ?? "change it").toLowerCase().replace(" it", "")} ${what}. The other government is told, and it goes on the Record.`}
      commission={(selected) => ({
        title: `${what[0]?.toUpperCase() ?? ""}${what.slice(1)}: ${DONE[selected] ?? selected}`,
        lines: [{ label: "Your reason", value: reason.trim() || "None given" }],
        packet: () => commitmentOrder(campaign, id, selected as CommitmentStatus, reason.trim() || "No reason was given."),
      })}
    >
      <Field label="Your reason" hint="Optional. The other government reads it.">
        {(props) => <input {...props} className="ui-input" value={reason} maxLength={160} onChange={(event) => setReason(event.target.value)} />}
      </Field>
    </ActFrame>
  );
}
