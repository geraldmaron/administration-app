import { useMemo, useState } from "react";
import { institutionInProse, type Campaign, type InstitutionId } from "@admin/engine";
import { inspectorNoticePacket, inspectorNoticeTerms, inspectorsBoard, sealFor, type ActComparison, type InspectorNoticeTerms, type InspectorRow } from "@admin/player-core";
import { Tag, Button, Card, Column, Empty, Row, Seal, Select, Sheet, Text } from "@admin/ui";
import { ActChooser } from "../congress/ActChooser";
import type { ActCommit } from "../congress/commit";
import { Note } from "../congress/parts";
import { CitedLawHelp } from "../law/LawHelp";
import { LAW, movedWords } from "./model";

const POSTURE = { "in-post": { label: "In office", status: "success" }, "notice-filed": { label: "Removal notice sent", status: "warning" }, removed: { label: "Removed, office empty", status: "danger" } } as const;
const REASONS = ["The President requests a change in oversight leadership. No finding of misconduct is asserted.", "The President requests a new appointment to this office. No finding of misconduct is asserted."];

function InspectorItem({ row }: { readonly row: InspectorRow }) {
  const posture = POSTURE[row.posture];
  return (
    <Row gap="sm" paddingVertical="xs" borderBottomWidth={1} borderColor="borderColor" wrap>
      <Seal spec={sealFor(row.institution, row.name)} size={36} />
      <Column flex={1} minWidth={180} gap="2xs">
        <Text variant="label">{row.name}</Text>
        <Text variant="caption" tone="secondary">{row.openMatters === 0 ? "No audit running" : `${row.openMatters} audit${row.openMatters === 1 ? "" : "s"} running`}</Text>
      </Column>
      <Tag tone={posture.status} icon={row.posture === "in-post" ? "approve" : "caution"}>{`${posture.label}${row.leaves ? ` · ${row.posture === "removed" ? "left" : "leaves"} ${row.leaves}` : ""}`}</Tag>
    </Row>
  );
}

function noticeComparison(terms: InspectorNoticeTerms): ActComparison {
  return {
    rows: [{ key: "office", label: "The office" }, { key: "audits", label: "Audits it affects" }, { key: "goodwill", label: "Congress's goodwill" }],
    columns: [
      { id: "file", label: "Send a removal notice", verb: "Send the removal notice", review: `The inspector leaves ${terms.leaves}.${terms.obstructs.length > 0 ? " The audit they're running becomes public and keeps going, and Congress will ask about it." : ""} It goes into the Record.`, cells: { office: { lines: [`Empty from ${terms.leaves}, 30 days from now. The inspector stays until then.`] }, audits: { lines: terms.obstructs.length ? terms.obstructs.map((subject) => `${subject} becomes public and is marked as interfered with. It keeps going.`) : ["None, since no audit is open there"], stance: terms.obstructs.length ? "adverse" : "neutral" }, goodwill: { lines: [movedWords(terms.dispositionBefore, terms.dispositionAfter)], stance: "adverse" } } },
    ],
  };
}

function NoticeComposer({ campaign, removable, acts }: { readonly campaign: Campaign; readonly removable: readonly InspectorRow[]; readonly acts: ActCommit }) {
  const [institution, setInstitution] = useState<InstitutionId | undefined>(removable[0]?.institution);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const chosen = removable.find((row) => row.institution === institution) ?? removable[0];
  const terms = useMemo(() => (chosen ? inspectorNoticeTerms(campaign, chosen.institution) : undefined), [campaign, chosen]);
  if (!chosen || !terms) return <Empty title="No inspector general is in office" detail="None has been confirmed yet." />;
  if ("refusal" in terms) return <Note tone="warning">{terms.refusal}</Note>;
  return (
    <ActChooser key={chosen.institution} id="ig-notice" title={`Removal notice: ${chosen.name}`} comparison={noticeComparison(terms)} acts={acts} authority={LAW.inspectors} danger again="Back to the inspectors"
      pending={() => (reason ? undefined : "No reason chosen yet.")}
      receiptTitle={() => `Removal notice sent for the inspector general at ${institutionInProse(terms.name)}`}
      packet={() => inspectorNoticePacket(campaign, terms.institution, reason ?? "")}
      terms={
        <Column gap="sm">
          <Select label="Inspector general" options={removable.map((row) => ({ value: row.institution, label: row.name }))} value={chosen.institution} onChange={setInstitution} />
          <Select label="Reason you'll give" options={REASONS.map((entry) => ({ value: entry, label: entry }))} value={reason} onChange={setReason} placeholder="No statement chosen" />
          <Note tone="tertiary">This is your official statement, not proof of wrongdoing. The game doesn't judge whether this reason would hold up legally.</Note>
        </Column>
      } />
  );
}

/** The inspectors general with something going on, the quiet ones folded away, and the thirty days' written notice that empties one office. */
export function Inspectors({ campaign, acts }: { readonly campaign: Campaign; readonly acts: ActCommit }) {
  const rows = useMemo(() => inspectorsBoard(campaign), [campaign]);
  const [showAll, setShowAll] = useState(false);
  const busy = rows.filter((row) => row.openMatters > 0 || row.posture !== "in-post");
  const quiet = rows.filter((row) => !busy.includes(row));
  return (
    <Card title="Inspectors general" icon="departmentInvestigation" help={<CitedLawHelp title="Inspectors general" meaning="An inspector general is a watchdog inside an agency. They check its work, look into problems, and report to the agency's head and to Congress. You can remove one, but you have to tell both the House and the Senate your reasons in writing 30 days before." steps={["Send Congress a written notice with your reasons", "30 days pass, and the inspector stays until then", "The office is empty, and any audit keeps going"]} cites={[LAW.inspectors]} />}>
      {busy.length === 0 ? <Empty title="No audits or removal notices" detail="No inspector general has an audit open or a removal notice pending." /> : busy.map((row) => <InspectorItem key={row.institution} row={row} />)}
      {quiet.length > 0 ? <Row><Button kind="secondary" size="compact" icon="folder" onPress={() => setShowAll(true)}>{`Inspectors in office · ${quiet.length}`}</Button></Row> : null}
      <Sheet open={showAll} onClose={() => setShowAll(false)} title="Inspectors general in office" eyebrow="No audit running" wide>
        <Note>These offices have no audit running right now. That shows how busy they are, not how independent or how good they are.</Note>
        {quiet.map((row) => <InspectorItem key={row.institution} row={row} />)}
      </Sheet>
      <NoticeComposer campaign={campaign} removable={rows.filter((row) => row.posture === "in-post")} acts={acts} />
    </Card>
  );
}
