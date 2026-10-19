import { useMemo, useState } from "react";
import { COLLECTION_FOCUS_LABELS, COLLECTION_FOCUS_QUESTIONS, type Campaign, type CollectionFocus, type CommitmentStatus, type Discipline, type IcElementId, type TaskingTargetKind } from "@admin/engine";
import { TARGET_KINDS, assessmentTargets, closeTaskingChoices, closeTaskingOrder, collectionElements, collectionReading, collectionRecipients, collectionReports, collectionScopeWords, commitmentChoices, commitmentOrder, commitmentsReading, disciplineWords, shareReportChoices, shareReportOrder, taskChoices, taskOrder, taskingRefusal, type TaskingDraft } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { CheckCard, ChoiceList, Field, Select, Text, TextInput } from "@admin/ui";
import type { WorldActs } from "../world/acts";
import { commitmentAuthorities, topicAuthorities } from "../world/law";
import { SealOf } from "../world/parts";
import { ActFrame } from "./ActFrame";

type PanelProps = { readonly campaign: Campaign; readonly acts: WorldActs; readonly onClose: () => void };

const POLITICS = "United States political processes, public opinion, policy or media";

function targetNote(kind: TaskingTargetKind): string {
  if (kind === "domestic-politics") return `This would point spying at ${POLITICS}. The agency's lawyers will refuse, and your request stays on the record.`;
  if (kind === "foreign-person") return "You can't point spying at one foreign person from here. Pick a foreign government instead.";
  return "You can't point spying at one person from here. Where someone is from, or the office they hold, doesn't prove where they live or give a legal reason to watch them. Pick a state or a foreign government instead.";
}

/** Pointing an element of the community at a question: who, with what discipline, at what, and what it is to answer. */
export function TaskPanel({ campaign, acts, onClose }: PanelProps) {
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
  const target = kind === "foreign-nation" ? nation : kind === "domestic-state" ? state : kind === "domestic-politics" ? POLITICS : "";
  const draft: TaskingDraft = { element: def.id, discipline: used, kind, target, focus: selectedFocus, question: COLLECTION_FOCUS_QUESTIONS[selectedFocus], note };
  const refusal = taskingRefusal(draft);
  const targetName = kind === "foreign-nation" ? (nations.find((entry) => entry.id === nation)?.name ?? nation) : kind === "domestic-state" ? (states.find((entry) => entry.id === state)?.name ?? state) : kind === "domestic-politics" ? POLITICS : "No one you can target";
  return (
    <ActFrame
      tier="full"
      title="Ask an intelligence agency a question"
      table={taskChoices(campaign, draft)}
      acts={acts}
      onClose={onClose}
      law={topicAuthorities("intelligence-collection")}
      verb={() => "Send the request"}
      review={() => (refusal ? `${def.abbr}'s lawyers will turn this down. The refusal goes on the record, and asking still costs you.` : `${def.abbr} will report on ${collectionScopeWords(draft) || "the topics it covers"}. Your note is kept on file, but the agency doesn't treat it as an order.`)}
      commission={() => ({
        title: refusal ? `${def.abbr} turned down the request` : `${def.abbr} took the question`,
        lines: [
          { label: "Question", value: draft.question },
          { label: "Focus", value: COLLECTION_FOCUS_LABELS[selectedFocus] },
          { label: "What it can find", value: collectionScopeWords(draft) || "Nothing, with this method" },
          ...(note.trim() ? [{ label: "Your note", value: note.trim() }] : []),
          { label: "About", value: targetName },
          { label: "How it finds out", value: disciplineWords(used) },
        ],
        ...(refusal ? { refused: true } : {}),
        packet: () => taskOrder(campaign, draft),
      })}
    >
      <Field label="Which agency" aside={<SealOf id={def.id} name={def.name} size={36} />}>
        {(control) => <Select {...control} label="Which agency" value={def.id} onChange={(id) => setElement(id as IcElementId)} options={elements.map((entry) => ({ value: entry.id, label: `${entry.abbr}: ${entry.name}` }))} />}
      </Field>
      <Field label="How it finds out" help={def.boundary}>
        {(control) => <Select {...control} label="How it finds out" value={used} onChange={(value) => setDiscipline(value as Discipline)} options={def.disciplines.map((entry) => ({ value: entry, label: disciplineWords(entry) }))} />}
      </Field>
      <ChoiceList label="What to look at" value={kind} onChange={setKind} options={TARGET_KINDS.map((entry) => ({ value: entry.id, label: entry.label, detail: entry.id === "domestic-person" ? "Not available. The game can't target one person here." : entry.id === "foreign-person" ? "Not available. Here you can look at a foreign government, not one person." : entry.detail }))} />
      {kind === "foreign-nation" ? (
        <Field label="Which government">{(control) => <Select {...control} label="Which government" value={nation} onChange={setNation} options={nations.map((entry) => ({ value: entry.id as string, label: entry.name }))} />}</Field>
      ) : kind === "domestic-state" ? (
        <Field label="Which state">{(control) => <Select {...control} label="Which state" value={state} onChange={setState} options={states.map((entry) => ({ value: entry.id, label: entry.name }))} />}</Field>
      ) : (
        <Text variant="body" tone="warning">{targetNote(kind)}</Text>
      )}
      {kind === "domestic-state" ? (
        <Text variant="body">The intelligence office at Homeland Security (DHS I&A) answers one question here. {COLLECTION_FOCUS_QUESTIONS["domestic-public-conditions"]} It only reports what's already on record and what governors have asked for.</Text>
      ) : (
        <ChoiceList label="What you want to know" value={focus} onChange={setFocus} options={(["overview", "external-intent", "force-posture", "economic-pressure"] as const).map((entry) => ({ value: entry, label: COLLECTION_FOCUS_LABELS[entry], detail: COLLECTION_FOCUS_QUESTIONS[entry] }))} />
      )}
      <Text variant="caption" tone="secondary">
        {disciplineWords(used)} can report on {collectionScopeWords({ discipline: used, kind, focus: selectedFocus }) || "nothing this question needs"}. Only the question you pick decides what goes in the report.
      </Text>
      <Field label="Note (optional)" help="It's kept with the request and the report. It doesn't change what the agency looks at, and it can't widen the question you picked.">
        {(control) => <TextInput {...control} value={note} maxLength={160} onChangeText={setNote} />}
      </Field>
    </ActFrame>
  );
}

/** Taking an element off a standing question. */
export function CloseTaskingPanel({ campaign, id, acts, onClose }: PanelProps & { readonly id: string }) {
  const row = collectionReading(campaign).taskings.find((entry) => entry.id === id);
  return (
    <ActFrame
      tier="confirm"
      title={row ? `Stop ${row.element}'s work on this question: ${row.question}` : "Stop an agency's work on a question"}
      table={closeTaskingChoices(campaign, id)}
      acts={acts}
      onClose={onClose}
      law={topicAuthorities("intelligence-collection").slice(0, 1)}
      verb={() => "Stop the work"}
      review={() => `${row?.element ?? "The agency"} stops looking into this. Its last report stays on file.`}
      commission={() => ({ title: `${row?.element ?? "The agency"} stopped work on the question`, lines: [{ label: "Question", value: row?.question ?? "" }], packet: () => closeTaskingOrder(campaign, id) })}
    />
  );
}

/** Sharing what a report found with a foreign government, finding by finding. */
export function ShareReportPanel({ campaign, id, acts, onClose }: PanelProps & { readonly id: string }) {
  const report = collectionReports(campaign).find((row) => row.id === id);
  const recipients = collectionRecipients(campaign, id);
  const [recipient, setRecipient] = useState<NationId | undefined>(undefined);
  const [indexes, setIndexes] = useState<readonly number[]>([]);
  const selected = recipients.find((entry) => entry.id === recipient);
  const findings = report?.findings.length ? indexes : undefined;
  return (
    <ActFrame
      tier="full"
      title="Share an intelligence report"
      table={shareReportChoices(campaign, id, recipient, findings)}
      acts={acts}
      onClose={onClose}
      law={topicAuthorities("classification")}
      verb={() => "Send this report"}
      review={() => `${selected?.name ?? "The other government"} gets the findings you picked from the report filed ${report?.filed ?? "earlier"}, except any it already has. The report still says how sure it is.`}
      commission={() => ({
        title: `Intelligence shared with ${selected?.name ?? "another government"}`,
        lines: [{ label: "Report", value: report?.question ?? "" }],
        packet: () => {
          if (!recipient) throw new Error("Pick a government to send it to first.");
          return shareReportOrder(campaign, id, recipient, findings);
        },
      })}
    >
      <Text variant="body" tone="secondary">{report?.target}: {report?.question}. You can send one report to several governments, one decision at a time.</Text>
      <Field label="Send it to" help={selected?.reason ?? "Check who gets it and the limits on sharing before you send it."}>
        {(control) => <Select {...control} label="Send it to" value={recipient as string | undefined} placeholder="Pick a government" onChange={(value) => setRecipient(value as NationId)} options={recipients.map((entry) => ({ value: entry.id as string, label: entry.name }))} />}
      </Field>
      {report?.findings.length ? (
        report.findings.map((finding, index) => (
          <CheckCard key={`${finding.topic}:${index}`} label={finding.observation} detail={`Source: ${finding.source}.`} checked={indexes.includes(index)} onChange={(on) => setIndexes(on ? [...indexes, index].sort((a, b) => a - b) : indexes.filter((value) => value !== index))} />
        ))
      ) : (
        <Text variant="body" tone="secondary">This report has no separate findings because it found nothing. If you share it, you share the whole report with its date.</Text>
      )}
    </ActFrame>
  );
}

const VERBS: Readonly<Record<string, string>> = { active: "Resume it", suspended: "Pause it", "wound-down": "End it" };
const DONE: Readonly<Record<string, string>> = { active: "resumed", suspended: "suspended", "wound-down": "wound down" };

/** Resuming, suspending or winding down one commitment abroad, against leaving it as it stands. */
export function CommitmentActPanel({ campaign, id, acts, onClose }: PanelProps & { readonly id: string }) {
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
      law={commitmentAuthorities(row?.kind ?? "")}
      verb={(selected) => VERBS[selected] ?? "Change it"}
      review={(selected) => `You'll ${(VERBS[selected] ?? "change it").toLowerCase().replace(" it", "")} ${what}. The other government is told, and it goes on your Record.`}
      commission={(selected) => ({
        title: `${what[0]?.toUpperCase() ?? ""}${what.slice(1)}: ${DONE[selected] ?? selected}`,
        lines: [{ label: "Your reason", value: reason.trim() || "None given" }],
        packet: () => commitmentOrder(campaign, id, selected as CommitmentStatus, reason.trim() || "No reason was given."),
      })}
    >
      <Field label="Your reason" help="Optional. The other government will see it.">
        {(control) => <TextInput {...control} value={reason} maxLength={160} onChangeText={setReason} />}
      </Field>
    </ActFrame>
  );
}
