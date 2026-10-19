import { useMemo, useState } from "react";
import type { AssessmentQuestion, Campaign, PressureDirection } from "@admin/engine";
import { PRESS_WORDS, QUESTION_WORDS, assessmentRows, assessmentTargets, commissionChoices, commissionOrder, pressChoices, pressOrder } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Field } from "@admin/ui-web";
import type { NationCommit } from "../../nation/economy/commit";
import { ActFrame } from "./ActFrame";

/** Commissioning a judgment about a government: which one, and which of the three questions. */
export function CommissionPanel({ campaign, acts, onClose }: { readonly campaign: Campaign; readonly acts: NationCommit; readonly onClose: () => void }) {
  const targets = useMemo(() => assessmentTargets(campaign), [campaign]);
  const [target, setTarget] = useState<NationId | undefined>(undefined);
  const aimed = target ?? targets[0]?.id;
  if (!aimed) return <p className="nation-note">There is no other government to ask about.</p>;
  const name = targets.find((entry) => entry.id === aimed)?.name ?? (aimed as string);
  return (
    <ActFrame
      tier="confirm"
      title="Commission an assessment"
      table={commissionChoices(campaign, aimed)}
      acts={acts}
      onClose={onClose}
      verb={() => "Commission the assessment"}
      review={() => "The community answers today. The judgment goes on file with how sure it is, what it does not know, and who dissented."}
      commission={(selected) => ({
        title: `Assessment commissioned: ${name}, ${QUESTION_WORDS[selected as AssessmentQuestion]?.label.toLowerCase() ?? selected}`,
        lines: [{ label: "The question", value: QUESTION_WORDS[selected as AssessmentQuestion]?.asks ?? selected }],
        packet: () => commissionOrder(campaign, selected as AssessmentQuestion, aimed),
      })}
    >
      <Field label="About which government" hint="You are shown how sure the answer will be, and who writes it. What it says you read when it arrives.">
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
    </ActFrame>
  );
}

/** Leaning on a judgment's wording, either way, against leaving it as the community wrote it. */
export function PressPanel({ campaign, id, acts, onClose }: { readonly campaign: Campaign; readonly id: string; readonly acts: NationCommit; readonly onClose: () => void }) {
  const row = assessmentRows(campaign).find((entry) => entry.id === id);
  const [ask, setAsk] = useState("");
  return (
    <ActFrame
      tier="confirm"
      title={row ? `Press the ${row.questionLabel.toLowerCase()} assessment of ${row.targetName}` : "Press an assessment"}
      table={pressChoices(campaign, id, ask)}
      acts={acts}
      onClose={onClose}
      tone="danger"
      verb={(selected) => PRESS_WORDS[selected as PressureDirection] ?? "Press the wording"}
      review={() => "The sentence moves one rung and a line saying it was reworded stays with it. The analysts who wrote it hedge more afterward."}
      commission={(selected) => ({
        title: `${row?.questionLabel ?? "The"} assessment of ${row?.targetName ?? "that government"} reworded`,
        lines: [
          { label: "Direction", value: PRESS_WORDS[selected as PressureDirection] ?? selected },
          { label: "Your ask", value: ask.trim() },
        ],
        packet: () => pressOrder(campaign, id, selected as PressureDirection, ask.trim()),
      })}
    >
      <Field label="What you ask for" hint="In the words the file keeps. There is nothing to bend but the sentence; the world it reads does not change.">
        {(props) => <input {...props} className="ui-input" value={ask} maxLength={160} onChange={(event) => setAsk(event.target.value)} />}
      </Field>
    </ActFrame>
  );
}
