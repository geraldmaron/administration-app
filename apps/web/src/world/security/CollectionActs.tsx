import { AuthorityHelp } from "../../help/AuthorityHelp";
import { useMemo, useState } from "react";
import { COLLECTION_FOCUS_LABELS, COLLECTION_FOCUS_QUESTIONS, type Campaign, type CollectionFocus, type Discipline, type IcElementId, type TaskingTargetKind } from "@admin/engine";
import { TARGET_KINDS, assessmentTargets, closeTaskingChoices, closeTaskingOrder, collectionElements, collectionReading, collectionScopeWords, disciplineWords, taskChoices, taskOrder, taskingRefusal, type TaskingDraft } from "@admin/player-core";
import { Choice, Field } from "@admin/ui-web";
import type { NationCommit } from "../../nation/economy/commit";
import { ActFrame } from "./ActFrame";

/** Pointing an element of the community at a question: who, with what discipline, at what, and what it is to answer. */
export function TaskPanel({ campaign, acts, onClose }: { readonly campaign: Campaign; readonly acts: NationCommit; readonly onClose: () => void }) {
  const elements = useMemo(() => collectionElements(), []);
  const nations = useMemo(() => assessmentTargets(campaign), [campaign]);
  const states = useMemo(() => Object.entries(campaign.states).map(([id, state]) => ({ id, name: state.base.name })).sort((a, b) => a.name.localeCompare(b.name)), [campaign]);
  const [element, setElement] = useState<IcElementId>("IC-CIA");
  const [discipline, setDiscipline] = useState<Discipline | undefined>(undefined);
  const [kind, setKind] = useState<TaskingTargetKind>("foreign-nation");
  const [nation, setNation] = useState<string>(nations[0]?.id ?? "");
  const [state, setState] = useState<string>(states[0]?.id ?? "");
  const [focus, setFocus] = useState<CollectionFocus>("external-intent");
  const [note, setNote] = useState("");
  const def = elements.find((entry) => entry.id === element) ?? elements[0]!;
  const used = discipline && def.disciplines.includes(discipline) ? discipline : (def.disciplines[0] ?? "all-source");
  const selectedFocus = kind === "domestic-state" ? "domestic-public-conditions" : focus;
  const draft: TaskingDraft = { element: def.id, discipline: used, kind, target: kind === "foreign-nation" ? nation : kind === "domestic-state" ? state : kind === "domestic-politics" ? "United States political processes, public opinion, policy or media" : "",
    focus: selectedFocus, question: COLLECTION_FOCUS_QUESTIONS[selectedFocus], note };
  const refusal = taskingRefusal(draft);
  const targetName = kind === "foreign-nation" ? (nations.find((entry) => entry.id === nation)?.name ?? nation) : kind === "domestic-state" ? (states.find((entry) => entry.id === state)?.name ?? state) : kind === "domestic-politics" ? "United States political processes, public opinion, policy or media" : "No verified person-level target";
  return (
    <ActFrame
      tier="full"
      title="Task the intelligence community"
      table={taskChoices(campaign, draft)}
      acts={acts}
      onClose={onClose}
      verb={() => "Send the tasking"}
      review={() => (refusal ? `${def.abbr}'s counsel will decline this. The refusal goes on the record, and you pay for having asked.` : `${def.abbr} reports on ${collectionScopeWords(draft) || "its available topics"}. Your note is recorded, not interpreted as an instruction.`)}
      commission={() => ({
        title: refusal ? `${def.abbr} declined the tasking` : `${def.abbr} is tasked`,
        lines: [
          { label: "Question", value: draft.question },
          { label: "Focus", value: COLLECTION_FOCUS_LABELS[selectedFocus] },
          { label: "Available evidence", value: collectionScopeWords(draft) || "Unavailable with this discipline" },
          ...(note.trim() ? [{ label: "Recorded note", value: note.trim() }] : []),
          { label: "About", value: targetName },
          { label: "By way of", value: disciplineWords(used) },
        ],
        ...(refusal ? { outcome: "refused" as const } : {}),
        packet: () => taskOrder(campaign, draft),
      })}
    >
      <Field label="Which element of the community">
        {(props) => (
          <select {...props} className="ui-input" value={def.id} onChange={(event) => setElement(event.target.value as IcElementId)}>
            {elements.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {`${entry.abbr}: ${entry.name}`}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="By way of" hint={def.boundary}>
        {(props) => (
          <select {...props} className="ui-input" value={used} onChange={(event) => setDiscipline(event.target.value as Discipline)}>
            {def.disciplines.map((entry) => (
              <option key={entry} value={entry}>
                {disciplineWords(entry)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Choice legend="What it is pointed at" layout="cards" value={kind} onChange={setKind} options={TARGET_KINDS.map((entry) => ({ value: entry.id, label: entry.label, detail: entry.id === "domestic-person" ? "Unavailable: person-level jurisdiction is not modeled on this desk." : entry.id === "foreign-person" ? "Unavailable: this desk supports government-level foreign collection." : entry.detail }))} />
      {kind === "foreign-nation" ? (
        <Field label="Which government">
          {(props) => (
            <select {...props} className="ui-input" value={nation} onChange={(event) => setNation(event.target.value)}>
              {nations.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      ) : kind === "domestic-state" ? (
        <Field label="Which state">
          {(props) => (
            <select {...props} className="ui-input" value={state} onChange={(event) => setState(event.target.value)}>
              {states.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          )}
        </Field>
      ) : (
        <div>
          <AuthorityHelp topic="intelligence-collection" compact />
          <p className="nation-note">{kind === "domestic-politics" ? "This request targets United States political processes, public opinion, policy or media. Counsel will refuse it; the attempted instruction remains on the record." : kind === "foreign-person" ? "Person-specific foreign collection is unavailable on this desk. Choose a foreign government for supported reporting." : "No person-level target with verified jurisdiction is available on this desk. A person's nationality or public office does not establish residence or a lawful collection basis. Choose public state conditions or a foreign government instead."}</p>
        </div>
      )}
      {kind === "domestic-state" ? <p>DHS I&A answers: {COLLECTION_FOCUS_QUESTIONS["domestic-public-conditions"]} It reports only recorded conditions and governor requests.</p> : (
        <Choice legend="What it is to answer" layout="cards" value={focus} onChange={setFocus} options={(["overview", "external-intent", "force-posture", "economic-pressure"] as const).map((entry) => ({ value: entry, label: COLLECTION_FOCUS_LABELS[entry], detail: COLLECTION_FOCUS_QUESTIONS[entry] }))} />
      )}
      <p className="nation-note">{disciplineWords(used)} can report on {collectionScopeWords({ discipline: used, kind, focus: selectedFocus }) || "none of this focus's evidence"}. Only the selected focus controls which findings may be filed.</p>
      <Field label="Optional recorded note" hint="Kept with the tasking and report. This note does not change the evidence selected or authorize collection outside the chosen focus.">
        {(props) => <input {...props} className="ui-input" value={note} maxLength={160} onChange={(event) => setNote(event.target.value)} />}
      </Field>
    </ActFrame>
  );
}

/** Taking an element off a standing question. */
export function CloseTaskingPanel({ campaign, id, acts, onClose }: { readonly campaign: Campaign; readonly id: string; readonly acts: NationCommit; readonly onClose: () => void }) {
  const row = collectionReading(campaign).taskings.find((entry) => entry.id === id);
  return (
    <ActFrame
      tier="confirm"
      title={row ? `Take ${row.element} off: ${row.question}` : "Take an element off a question"}
      table={closeTaskingChoices(campaign, id)}
      acts={acts}
      onClose={onClose}
      verb={() => "Take it off the question"}
      review={() => `${row?.element ?? "The element"} stops collecting on this. The last product stays in the file.`}
      commission={() => ({
        title: `${row?.element ?? "The element"} is taken off the question`,
        lines: [{ label: "Question", value: row?.question ?? "" }],
        packet: () => closeTaskingOrder(campaign, id),
      })}
    />
  );
}
