import { useMemo, useState } from "react";
import type { AssessmentQuestion, Campaign, FindingState, NotificationTier, PressureDirection } from "@admin/engine";
import { FINDING_STATES, FINDING_TIERS, PRESS_WORDS, QUESTION_WORDS, assessmentRows, assessmentTargets, closeFindingChoices, closeFindingOrder, commissionChoices, commissionOrder, counselRefusal, covertReading, findingTargets, pressChoices, pressOrder, signChoices, signOrder, type FindingDraft } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { ChoiceList, Field, Select, Text, TextInput } from "@admin/ui";
import type { WorldActs } from "../world/acts";
import { topicAuthorities } from "../world/law";
import { ActFrame } from "./ActFrame";
import { FINDING_OBJECTIVES, NOTICE_REASONS } from "./options";

type PanelProps = { readonly campaign: Campaign; readonly acts: WorldActs; readonly onClose: () => void };

type Written = Exclude<FindingState, "unwritten">;

function nationOptions(targets: readonly { readonly id: NationId; readonly name: string }[]) {
  return targets.map((entry) => ({ value: entry.id as string, label: entry.name }));
}

/** Signing a covert finding: who it is aimed at, what it authorizes, how it was recorded, and which of three ways the committees are told. */
export function SignFindingPanel({ campaign, acts, onClose }: PanelProps) {
  const targets = useMemo(() => findingTargets(campaign), [campaign]);
  const [target, setTarget] = useState<NationId | undefined>(targets[0]?.id);
  const [objective, setObjective] = useState("");
  const [state, setState] = useState<Written>("written");
  const [reasons, setReasons] = useState("");
  const aimed = target ?? targets[0]?.id;
  if (!aimed) return <Text variant="body" tone="secondary">Every government already has an open covert finding, so there is no one left to sign one for.</Text>;
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
      law={topicAuthorities("intelligence-findings")}
      verb={() => "Sign the finding"}
      review={(selected) => (refusal ? "Your lawyers won't put this in writing. The attempt goes on your Record, and nothing is approved." : `You'll sign a finding on ${name} and ${FINDING_TIERS.find((tier) => tier.id === selected)?.who.toLowerCase() ?? "tell the committees"}.`)}
      commission={(selected) => ({
        title: refusal ? `Your lawyers won't put the finding on ${name} in writing` : `Finding signed on ${name}`,
        lines: [
          { label: "What it allows", value: objective.trim() },
          { label: "How it was recorded", value: FINDING_STATES.find((entry) => entry.id === state)?.label ?? state },
          { label: "Who is told", value: FINDING_TIERS.find((tier) => tier.id === selected)?.who ?? selected },
        ],
        ...(refusal ? { refused: true } : {}),
        packet: () => signOrder(campaign, draft, selected as NotificationTier),
      })}
    >
      <Field label="Which government">{(control) => <Select {...control} label="Which government" value={aimed as string} onChange={(id) => setTarget(id as NationId)} options={nationOptions(targets)} />}</Field>
      <ChoiceList label="What it's for" help="A covert finding is your signed order allowing secret action against another government. This says what it's for. It doesn't prove the threat is real, and each operation under it still gets its own review. A finding can never allow action aimed at American politics, opinion, policy, or media." value={objective} onChange={setObjective} options={FINDING_OBJECTIVES.map((value) => ({ value, label: value }))} />
      <ChoiceList label="How it's written down" value={state} onChange={setState} options={FINDING_STATES.map((entry) => ({ value: entry.id, label: entry.label, detail: entry.detail }))} />
      <ChoiceList label="Why you're waiting to tell Congress" help="You only need this if you choose to hold back notice. It records your reason. It doesn't excuse you from telling Congress later." value={reasons} onChange={setReasons} options={NOTICE_REASONS.map((value) => ({ value, label: value }))} />
    </ActFrame>
  );
}

/** Closing a finding out, against leaving the operation covered. */
export function CloseFindingPanel({ campaign, id, acts, onClose }: PanelProps & { readonly id: string }) {
  const row = covertReading(campaign).open.find((entry) => entry.id === id);
  const name = row?.targetName ?? "that government";
  return (
    <ActFrame
      tier="confirm"
      title={`Close the finding on ${name}`}
      table={closeFindingChoices(campaign, id)}
      acts={acts}
      onClose={onClose}
      law={topicAuthorities("intelligence-findings")}
      verb={() => "Close the finding"}
      review={() => `You'll close the finding on ${name}. After that, secret action against it is no longer allowed.`}
      commission={() => ({ title: `Finding on ${name} closed`, lines: [{ label: "What it was for", value: row?.objective ?? "" }], packet: () => closeFindingOrder(campaign, id) })}
    />
  );
}

/** Commissioning a judgment about a government: which one, and which of the three questions. */
export function CommissionPanel({ campaign, acts, onClose }: PanelProps) {
  const targets = useMemo(() => assessmentTargets(campaign), [campaign]);
  const [target, setTarget] = useState<NationId | undefined>(undefined);
  const aimed = target ?? targets[0]?.id;
  if (!aimed) return <Text variant="body" tone="secondary">There's no other government to ask about.</Text>;
  const name = targets.find((entry) => entry.id === aimed)?.name ?? (aimed as string);
  return (
    <ActFrame
      tier="confirm"
      title="Ask for an assessment"
      table={commissionChoices(campaign, aimed)}
      acts={acts}
      onClose={onClose}
      law={topicAuthorities("intelligence-collection").slice(0, 1)}
      verb={() => "Ask for the assessment"}
      review={() => "The intelligence agencies answer today. Their answer is filed with how sure they are, what they don't know, and who disagreed."}
      commission={(selected) => ({
        title: `Assessment requested: ${name}, ${QUESTION_WORDS[selected as AssessmentQuestion]?.label.toLowerCase() ?? selected}`,
        lines: [{ label: "The question", value: QUESTION_WORDS[selected as AssessmentQuestion]?.asks ?? selected }],
        packet: () => commissionOrder(campaign, selected as AssessmentQuestion, aimed),
      })}
    >
      <Field label="About which government" help="Before you ask, you'll see how sure the answer will be and who will write it. You'll read the answer itself when it arrives.">
        {(control) => <Select {...control} label="About which government" value={aimed as string} onChange={(id) => setTarget(id as NationId)} options={nationOptions(targets)} />}
      </Field>
    </ActFrame>
  );
}

/** Leaning on a judgment's wording, either way, against leaving it as the community wrote it. */
export function PressPanel({ campaign, id, acts, onClose }: PanelProps & { readonly id: string }) {
  const row = assessmentRows(campaign).find((entry) => entry.id === id);
  const [ask, setAsk] = useState("");
  return (
    <ActFrame
      tier="confirm"
      title={row ? `Ask analysts to reword the ${row.questionLabel.toLowerCase()} assessment of ${row.targetName}` : "Ask analysts to reword an assessment"}
      table={pressChoices(campaign, id, ask)}
      acts={acts}
      onClose={onClose}
      tone="danger"
      law={topicAuthorities("intelligence-collection").slice(0, 1)}
      verb={(selected) => PRESS_WORDS[selected as PressureDirection] ?? "Ask for new wording"}
      review={() => "The wording moves one step, and a note that you had it changed stays with it. The analysts who wrote it will be more cautious after this."}
      commission={(selected) => ({
        title: `${row?.questionLabel ?? "The"} assessment of ${row?.targetName ?? "that government"} reworded`,
        lines: [
          { label: "Direction", value: PRESS_WORDS[selected as PressureDirection] ?? selected },
          { label: "What you asked for", value: ask.trim() },
        ],
        packet: () => pressOrder(campaign, id, selected as PressureDirection, ask.trim()),
      })}
    >
      <Field label="What you're asking for" help="This is the wording that goes on file. Changing the sentence doesn't change what's actually happening in the world.">
        {(control) => <TextInput {...control} value={ask} maxLength={160} onChangeText={setAsk} />}
      </Field>
    </ActFrame>
  );
}
