import { useMemo, useState } from "react";
import { institutionInProse, institutionOpening, REFUSALS_BEFORE_MATTER, type Campaign, type DirectiveKind, type InstitutionId } from "@admin/engine";
import { DIRECTIVE_KIND_LABELS, directivePacket, directivePreview, directiveTargets, type DirectivePreview, type DirectiveTarget } from "@admin/player-core";
import { Choice, CompareAuthorize, Field, Gauge, type CompareRow } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { directiveSubjects } from "./directive-options";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type Commission } from "../../nation/economy/commit";
import { NoneCell } from "../courts/Nominations";

const ISSUE = "issue";

const STATUS_WORDS = {
  carried: "Carries it",
  "slow-walked": "Acknowledges it and does not move on it",
  refused: "Refuses it, in a memorandum citing the statute",
} as const;

/** A 0..1 reading moved by the act: the meter at the value after, a tick where it stood before. */
export function MovedMeter({ label, before, after }: { readonly label: string; readonly before: number; readonly after: number }) {
  const moved = Math.abs(after - before) > 0.0005;
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  return (
    <Gauge
      shape="meter"
      label={label}
      labelHidden
      value={after}
      valueText={moved ? `${percent(before)} to ${percent(after)}` : percent(after)}
      tone={after > before ? "risk" : "reading"}
      marks={moved ? [{ at: before, label: `Before, ${percent(before)}` }] : []}
    />
  );
}

function statuteCell(preview: Extract<DirectivePreview, { ok: true }>) {
  return preview.memorandum ? `Barred by ${preview.memorandum.authority}` : <NoneCell>No statutory refusal is modeled</NoneCell>;
}

/** The statutory limit read before signing: the memorandum the body would write, or what it will do with a lawful instruction. */
function StatutePreview({ preview, body }: { readonly preview: DirectivePreview; readonly body: string }) {
  if (!preview.ok) return <p className="nation-problem">{preview.reason}</p>;
  if (!preview.memorandum) {
    return (
      <p className="statute-preview" data-status={preview.status}>
        {preview.status === "carried" ? `Modeled response: ${institutionOpening(body)} will carry it.` : `Modeled response: ${institutionInProse(body)} will acknowledge it and not move on it.`}
      </p>
    );
  }
  return (
    <figure className="statute-preview" data-status="refused">
      <figcaption>The statutory limit: counsel will refuse this instruction</figcaption>
      <blockquote className="memorandum">
        <p>{preview.memorandum.reason}</p>
        <footer>
          {preview.memorandum.signedBy}, under {preview.memorandum.authority}
        </footer>
      </blockquote>
    </figure>
  );
}

function compareRows(preview: DirectivePreview): readonly CompareRow[] {
  if (!preview.ok) return [{ label: "What the body does", icon: "order", cells: { [ISSUE]: preview.reason } }];
  return [
    { label: "What the body does", icon: "order", cells: { [ISSUE]: STATUS_WORDS[preview.status] } },
    { label: "The statutory limit", icon: "law", cells: { [ISSUE]: statuteCell(preview) } },
    { label: "Bent toward your politics", icon: "layerLean", cells: { [ISSUE]: <MovedMeter label="Politicization" before={preview.politicization.before} after={preview.politicization.after} /> } },
    { label: "How closely it is watched", icon: "review", cells: { [ISSUE]: <MovedMeter label="Oversight pressure" before={preview.oversight.before} after={preview.oversight.after} /> } },
    { label: "An inquiry", icon: "departmentInvestigation", cells: { [ISSUE]: preview.opensInquiry ? "Opens: a second refusal here is a pattern its inspector general looks into" : <NoneCell>None opened</NoneCell> } },
  ];
}

function directiveCommission(campaign: Campaign, target: DirectiveTarget, kind: DirectiveKind, subject: string, preview: DirectivePreview): Commission {
  return {
    title: `Directive to ${institutionInProse(target.name)}`,
    review: { tier: "confirm", title: `Send a directive to ${institutionInProse(target.name)}`, lines: [{ label: "Instruction", value: `${DIRECTIVE_KIND_LABELS[kind].label}: ${subject}` }] },
    lines: [
      { label: "Instruction", value: `${DIRECTIVE_KIND_LABELS[kind].label}: ${subject}` },
      { label: "What the body did", value: preview.ok ? STATUS_WORDS[preview.status] : "" },
    ],
    packet: () => directivePacket(campaign, target.institution, kind, subject),
  };
}

function useComposer(campaign: Campaign, targets: readonly DirectiveTarget[]) {
  const [institution, setInstitution] = useState<InstitutionId>(targets[0]?.institution ?? "");
  const target = targets.find((entry) => entry.institution === institution) ?? targets[0];
  const [chosenKind, setKind] = useState<DirectiveKind | undefined>(undefined);
  const kind = chosenKind && target?.kinds.includes(chosenKind) ? chosenKind : target?.kinds[0];
  const [chosenSubject, setSubject] = useState("");
  const subjects = useMemo(() => target && kind ? directiveSubjects(campaign, target, kind) : [], [campaign, target, kind]);
  const subject = subjects.find((entry) => entry.value === chosenSubject)?.value ?? subjects[0]?.value ?? "";
  const preview = useMemo(() => (target && kind ? directivePreview(campaign, target.institution, kind, subject) : undefined), [campaign, target, kind, subject]);
  return { target, kind, subject, subjects, preview, setInstitution, setKind, setSubject };
}

/** The composer: a body, an instruction it could carry, what it is about, and what the body will do with it before you sign. */
export function DirectiveComposer({ campaign }: { readonly campaign: Campaign }) {
  const targets = useMemo(() => directiveTargets(campaign), [campaign]);
  const acts = useNationCommit(campaign);
  const composer = useComposer(campaign, targets);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const { target, kind, subject, preview } = composer;
  const settled = subject.trim();
  const projection = useChoiceProjection(
    target && kind ? campaign : undefined,
    target && kind
      ? actsChoice("The directive", "not issuing it", "Not issuing it.", [
          { id: ISSUE, label: "Issue it", ...(!settled ? { refused: "No relevant recorded subject is available for this instruction." } : preview && !preview.ok ? { refused: preview.reason } : { act: { act: "directive" as const, institution: target.institution, kind, subject: settled } }) },
        ])
      : undefined,
    selected,
  );
  if (acts.committed) return <ActReceipt committed={acts.committed} again="Prepare another directive" onAgain={() => { setSelected(undefined); composer.setSubject(""); acts.dismiss(); }} mapNote={null} />;
  if (!target || !kind || !preview) return <p className="nation-note">No body holds a function a directive could be addressed to.</p>;
  const locked = !subject.trim() ? "Not available: no relevant recorded subject is available." : !preview.ok ? `Not available: ${preview.reason}` : undefined;
  return (
    <div className="composer">
      <Field label="The body" hint={`Refused here so far: ${target.refusals}. At ${REFUSALS_BEFORE_MATTER} refusals at one body, its inspector general opens an inquiry.`}>
        {(props) => (
          <select {...props} className="ui-input" value={target.institution} onChange={(event) => composer.setInstitution(event.target.value)}>
            {targets.map((entry) => (
              <option key={entry.institution} value={entry.institution}>
                {entry.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Choice legend="The instruction" layout="cards" value={kind} onChange={(value) => composer.setKind(value)} options={target.kinds.map((value) => ({ value, label: DIRECTIVE_KIND_LABELS[value].label, detail: DIRECTIVE_KIND_LABELS[value].detail }))} />
      <Field label="Directive subject" hint={composer.subjects.length ? "Predefined request or a subject already recorded for this institution. An instruction does not itself change the policy rate or decide a case." : "No relevant recorded subject exists for this institution. Select another instruction or body; inventing a case is not available."}>
        {(props) => <select {...props} className="ui-input" value={subject} disabled={!composer.subjects.length} onChange={(event) => composer.setSubject(event.target.value)}>{!composer.subjects.length ? <option value="">No relevant subject available</option> : composer.subjects.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select>}
      </Field>
      <StatutePreview preview={preview} body={target.name} />
      <CompareAuthorize
        title="Compare issuing the directive"
        options={[{ id: ISSUE, label: "Issue it", icon: "order", ...(locked ? { unavailable: locked } : {}) }]}
        rows={compareRows(preview)}
        selected={selected}
        onSelect={setSelected}
        verb="Issue the directive"
        onAuthorize={() => void acts.commit(directiveCommission(campaign, target, kind, subject.trim(), preview))}
        review={preview.ok ? `${institutionOpening(target.name)} ${STATUS_WORDS[preview.status].toLowerCase()}. It goes on the Record${preview.status === "refused" ? ", and a refusal is kept forever" : ""}.` : undefined}
        busy={acts.busy}
        {...(projection ? { projection } : {})}
      />
      {acts.problem ? (
        <p className="nation-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </div>
  );
}
