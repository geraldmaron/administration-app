import { useMemo, useState } from "react";
import { institutionInProse, institutionOpening, REFUSALS_BEFORE_MATTER, type Campaign, type DirectiveKind, type InstitutionId } from "@admin/engine";
import { DIRECTIVE_KIND_LABELS, directivePacket, directivePreview, directiveTargets, resolveAuthorityText, sealFor, type ActComparison, type DirectivePreview } from "@admin/player-core";
import { Card, ChoiceList, Column, DocParagraph, Empty, MemoPaper, Seal, Select, Stamp } from "@admin/ui";
import { ActChooser, Authority } from "../congress/ActChooser";
import type { ActCommit } from "../congress/commit";
import { Note } from "../congress/parts";
import { CitedLawHelp } from "../law/LawHelp";
import { LAW, directiveSubjects, movedWords } from "./model";

const STATUS_WORDS = { carried: "Does it", "slow-walked": "Says yes but doesn't act on it", refused: "Refuses in writing, citing the law that forbids it" } as const;

function comparison(preview: DirectivePreview, locked: string | undefined, body: string): ActComparison {
  const ok = preview.ok ? preview : undefined;
  return {
    rows: [{ key: "does", label: "What the agency does" }, { key: "statute", label: "What the law allows" }, { key: "politics", label: "How political it looks" }, { key: "watched", label: "How closely it's watched" }, { key: "inquiry", label: "An investigation" }],
    columns: [
      {
        id: "issue", label: "Send it", verb: "Send the instruction", ...(locked ? { refusal: locked } : {}),
        review: ok ? `${institutionOpening(body)} ${STATUS_WORDS[ok.status].toLowerCase()}. It goes into the Record${ok.status === "refused" ? ", and a refusal stays there for good" : ""}.` : "Not available right now.",
        cells: ok ? { does: { lines: [STATUS_WORDS[ok.status]], stance: ok.status === "carried" ? "favorable" : "adverse" }, statute: { lines: [ok.memorandum ? `Forbidden by ${ok.memorandum.authority}` : "No law is expected to stop it"] }, politics: { lines: [movedWords(ok.politicization.before, ok.politicization.after)], stance: ok.politicization.after > ok.politicization.before ? "adverse" : "neutral" }, watched: { lines: [movedWords(ok.oversight.before, ok.oversight.after)], stance: ok.oversight.after > ok.oversight.before ? "adverse" : "neutral" }, inquiry: { lines: [ok.opensInquiry ? "Starts one. A second refusal at the same agency is a pattern its inspector general looks into" : "None"], stance: ok.opensInquiry ? "adverse" : "neutral" } } : { does: { lines: [preview.ok ? "" : preview.reason] } },
      },
    ],
  };
}

/** The statutory limit read before signing: the memorandum counsel would send back, on the body's letterhead, or what it will do with a lawful instruction. */
function StatutePreview({ preview, body, institution }: { readonly preview: DirectivePreview; readonly body: string; readonly institution: InstitutionId }) {
  if (!preview.ok) return <Note tone="danger">{preview.reason}</Note>;
  if (!preview.memorandum) return <Note>{preview.status === "carried" ? `Expect ${institutionInProse(body)} to do it.` : `Expect ${institutionInProse(body)} to say yes but not act on it.`}</Note>;
  const record = resolveAuthorityText(preview.memorandum.authority);
  return (
    <Column gap="sm">
      <Note tone="warning">If you send this instruction, counsel will refuse it in writing. This is the memorandum they would send back.</Note>
      <MemoPaper
        seal={<Seal spec={sealFor(institution, body)} size={56} />}
        house={body}
        from={preview.memorandum.signedBy}
        subject="Lawfulness of the President's proposed instruction"
        stamp={<Stamp tone="pending">Not yet sent</Stamp>}
      >
        <DocParagraph>{preview.memorandum.reason}</DocParagraph>
      </MemoPaper>
      {record ? <Authority cite={record.cite} /> : null}
    </Column>
  );
}

/** The composer: a body, an instruction it could carry, what it is about, and what the body will do with it, before the President signs. */
export function Directives({ campaign, acts }: { readonly campaign: Campaign; readonly acts: ActCommit }) {
  const targets = useMemo(() => directiveTargets(campaign), [campaign]);
  const [institution, setInstitution] = useState<InstitutionId | undefined>(targets[0]?.institution);
  const target = targets.find((entry) => entry.institution === institution) ?? targets[0];
  const [chosenKind, setKind] = useState<DirectiveKind | undefined>(undefined);
  const kind = chosenKind && target?.kinds.includes(chosenKind) ? chosenKind : target?.kinds[0];
  const [chosenSubject, setSubject] = useState<string | undefined>(undefined);
  const subjects = useMemo(() => (target && kind ? directiveSubjects(campaign, target, kind) : []), [campaign, target, kind]);
  const subject = subjects.find((entry) => entry.value === chosenSubject)?.value ?? subjects[0]?.value ?? "";
  const preview = useMemo(() => (target && kind ? directivePreview(campaign, target.institution, kind, subject) : undefined), [campaign, target, kind, subject]);
  const help = <CitedLawHelp title="Giving instructions to your government" meaning="As President, you run the executive branch, and your job is to see that the laws are carried out. If you give an agency an instruction the law forbids, its lawyers will refuse in writing and name the law. If that keeps happening at one agency, its inspector general will look into it." cites={[LAW.takeCare, LAW.inspectors]} />;
  if (!target || !kind || !preview) return <Card title="Give an instruction" icon="order" help={help}><Empty title="No agency can take an instruction right now" detail="Agencies you may direct will show here once they're in place." /></Card>;
  const locked = !subject ? "There's nothing on record at this agency for this instruction to be about." : !preview.ok ? preview.reason : undefined;
  return (
    <Card title="Give an instruction" icon="order" help={help}>
      <ActChooser key={`${target.institution}:${kind}:${subject}`} id="directive" title={`Instruction to ${institutionInProse(target.name)}`} comparison={comparison(preview, locked, target.name)} acts={acts} authority={LAW.takeCare} again="Write another instruction" onAgain={() => setSubject(undefined)}
        receiptTitle={() => `Instruction to ${institutionInProse(target.name)}`}
        packet={() => directivePacket(campaign, target.institution, kind, subject)}
        terms={
          <Column gap="md">
            <Select label="The agency" options={targets.map((entry) => ({ value: entry.institution, label: entry.name }))} value={target.institution} onChange={setInstitution} />
            <Note tone="tertiary">Refusals here so far: {target.refusals}. After {REFUSALS_BEFORE_MATTER} refusals at one agency, its inspector general starts an investigation.</Note>
            <ChoiceList label="The instruction" options={target.kinds.map((value) => ({ value, label: DIRECTIVE_KIND_LABELS[value].label, detail: DIRECTIVE_KIND_LABELS[value].detail }))} value={kind} onChange={setKind} minCardWidth={220} />
            {subjects.length ? <Select label="What it's about" options={subjects} value={subject} onChange={setSubject} /> : <Note tone="warning">This agency has nothing on record that fits. Try another instruction or agency.</Note>}
            <StatutePreview preview={preview} body={target.name} institution={target.institution} />
          </Column>
        } />
    </Card>
  );
}
