import { AuthorityHelp } from "../../help/AuthorityHelp";
import { FINDING_OBJECTIVES, NOTICE_REASONS } from "./security-options";
import { useMemo, useState } from "react";
import type { Campaign, FindingState, NotificationTier } from "@admin/engine";
import { FINDING_STATES, FINDING_TIERS, closeFindingChoices, closeFindingOrder, counselRefusal, covertReading, findingTargets, signChoices, signOrder, type FindingDraft } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Choice, Field } from "@admin/ui-web";
import type { NationCommit } from "../../nation/economy/commit";
import { ActFrame } from "./ActFrame";

type Written = Exclude<FindingState, "unwritten">;

/** Signing a covert finding: who it is aimed at, what it authorizes, how it was recorded, and which of three ways the committees are told. */
export function SignFindingPanel({ campaign, acts, onClose }: { readonly campaign: Campaign; readonly acts: NationCommit; readonly onClose: () => void }) {
  const targets = useMemo(() => findingTargets(campaign), [campaign]);
  const [target, setTarget] = useState<NationId | undefined>(targets[0]?.id);
  const [objective, setObjective] = useState("");
  const [state, setState] = useState<Written>("written");
  const [reasons, setReasons] = useState("");
  const aimed = target ?? targets[0]?.id;
  if (!aimed) return <p className="nation-note">Every government already has a finding standing over it.</p>;
  const draft: FindingDraft = { target: aimed, objective, state, reasons };
  const name = targets.find((entry) => entry.id === aimed)?.name ?? (aimed as string);
  const refusal = counselRefusal(campaign, draft);
  return (
    <ActFrame
      tier="full"
      title="Sign a covert finding"
      table={signChoices(campaign, draft)}
      acts={acts}
      onClose={onClose}
      tone="danger"
      verb={() => "Sign the finding"}
      review={(selected) => (refusal ? `Counsel will not paper this. The attempt goes on the Record and nothing is authorized.` : `You will sign a finding on ${name} and ${FINDING_TIERS.find((tier) => tier.id === selected)?.who.toLowerCase() ?? "tell the committees"}.`)}
      commission={(selected) => ({
        title: refusal ? `Counsel would not paper the finding on ${name}` : `Finding signed on ${name}`,
        lines: [
          { label: "What it authorizes", value: objective.trim() },
          { label: "How it was recorded", value: FINDING_STATES.find((entry) => entry.id === state)?.label ?? state },
          { label: "Who is told", value: FINDING_TIERS.find((tier) => tier.id === selected)?.who ?? selected },
        ],
        ...(refusal ? { outcome: "refused" as const } : {}),
        packet: () => signOrder(campaign, draft, selected as NotificationTier),
      })}
    >
      <Field label="Aimed at">
        {(props) => (
          <select {...props} className="ui-input" value={aimed} onChange={(event) => setTarget(event.target.value as NationId)}>
            {targets.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <AuthorityHelp topic="intelligence-findings" compact />
      <Choice legend="Finding objective" layout="cards" value={objective} onChange={setObjective} hint="A recorded purpose, not a finding that the threat exists. Each later operation has a separate comparison and review. A finding cannot authorize action aimed at American politics, opinion, policy or media." options={FINDING_OBJECTIVES.map((value) => ({ value, label: value }))} />
      <Choice legend="How it is recorded" layout="cards" value={state} onChange={setState} options={FINDING_STATES.map((entry) => ({ value: entry.id, label: entry.label, detail: entry.detail }))} />
      <Choice legend="Reason for delaying prior notice" layout="cards" value={reasons} onChange={setReasons} hint="Required only for the withholding-notice option. This records the President's rationale; it is not an exemption from later congressional notice." options={NOTICE_REASONS.map((value) => ({ value, label: value }))} />
    </ActFrame>
  );
}

/** Closing a finding out, against leaving the operation covered. */
export function CloseFindingPanel({ campaign, id, acts, onClose }: { readonly campaign: Campaign; readonly id: string; readonly acts: NationCommit; readonly onClose: () => void }) {
  const row = covertReading(campaign).open.find((entry) => entry.id === id);
  return (
    <ActFrame
      tier="confirm"
      title={row ? `Close the finding on ${row.targetName}` : "Close a finding"}
      table={closeFindingChoices(campaign, id)}
      acts={acts}
      onClose={onClose}
      verb={() => "Close the finding"}
      review={() => `You will close the finding on ${row?.targetName ?? "that government"}. A covert act against it after that has no paper behind it.`}
      commission={() => ({
        title: `Finding on ${row?.targetName ?? "that government"} closed`,
        lines: [{ label: "Objective", value: row?.objective ?? "" }],
        packet: () => closeFindingOrder(campaign, id),
      })}
    />
  );
}
