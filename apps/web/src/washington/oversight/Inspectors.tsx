import { useMemo, useState } from "react";
import { institutionInProse, type Campaign, type InstitutionId } from "@admin/engine";
import { inspectorNoticePacket, inspectorNoticeTerms, inspectorsBoard, officeEmblem, type InspectorNoticeTerms, type InspectorRow } from "@admin/player-core";
import { Button, CompareAuthorize, Field, Sheet, type CompareRow, Icon } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { useSettled } from "../../modeling/useSettled";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type Commission, type NationCommit } from "../../nation/economy/commit";
import { LinesCell } from "../courts/Nominations";
import { InstitutionMark } from "../executive/StaffingBadge";
import { MovedMeter } from "./DirectiveComposer";

const FILE = "file";

const POSTURE_WORDS = { "in-post": "In post", "notice-filed": "Notice of removal filed", removed: "Removed; office empty" } as const;


function InspectorItem({ row }: { readonly row: InspectorRow }) {
  const emblem = officeEmblem(row.institution);
  return (
    <li data-posture={row.posture}>
      <span className="inspectors__emblem"><InstitutionMark institution={row.institution} emblem={emblem} size={28} /></span>
      <span className="inspectors__name">{row.name}</span>
      <span className="inspectors__posture">
        {POSTURE_WORDS[row.posture]}
        {row.leaves ? ` · ${row.posture === "removed" ? "left" : "leaves"} ${row.leaves}` : ""}
      </span>
      <span className="inspectors__audits">{row.openMatters === 0 ? "No audit running" : `${row.openMatters} audit${row.openMatters === 1 ? "" : "s"} running`}</span>
    </li>
  );
}

/** The inspectors with something going on first; the quiet ones folded under one line. */
function InspectorList({ rows }: { readonly rows: readonly InspectorRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const busy = rows.filter((row) => row.openMatters > 0 || row.posture !== "in-post");
  const quiet = rows.filter((row) => !busy.includes(row));
  return <div className="inspectors-board"><ul className="inspectors" aria-label="Inspectors general">{busy.map((row) => <InspectorItem key={row.institution} row={row} />)}</ul>{busy.length === 0 ? <p className="nation-note">No inspector general has an audit running or a removal notice pending.</p> : null}{quiet.length > 0 ? <Button kind="secondary" onClick={() => setShowAll(true)}>Inspectors in post · {quiet.length}</Button> : null}<Sheet open={showAll} onClose={() => setShowAll(false)} title="Inspectors general · in post" placement="wide" lead="These offices have no audit running. This is an activity view, not a measure of independence or performance."><ul className="inspectors" aria-label="Inspectors general with no audit running">{quiet.map((row) => <InspectorItem key={row.institution} row={row} />)}</ul></Sheet></div>;
}

function noticeRows(terms: InspectorNoticeTerms): readonly CompareRow[] {
  return [
    { label: "The office", icon: "building", cells: { [FILE]: `Empties ${terms.leaves}, thirty days on. The inspector serves until then.` } },
    { label: "Audits it runs into", icon: "review", cells: { [FILE]: <LinesCell lines={terms.obstructs.map((subject) => `Made public and marked obstructed: ${subject}. It keeps running.`)} none="None: no audit is open there" /> } },
    { label: "Congress's goodwill", icon: "subjectCapitol", cells: { [FILE]: <MovedMeter label="Congress's goodwill" before={terms.dispositionBefore} after={terms.dispositionAfter} /> } },
  ];
}

function noticeCommission(campaign: Campaign, terms: InspectorNoticeTerms, reason: string): Commission {
  return {
    title: `Notice filed to remove the inspector general at ${institutionInProse(terms.name)}`,
    review: { tier: "full", title: `File notice to remove the inspector general at ${institutionInProse(terms.name)}`, verb: "Confirm and file", danger: true },
    lines: [
      { label: "Office empties", value: terms.leaves },
      { label: "Reasons", value: reason },
      { label: "Congress's goodwill", value: `${Math.round(terms.dispositionBefore * 100)}% to ${Math.round(terms.dispositionAfter * 100)}%` },
    ],
    packet: () => inspectorNoticePacket(campaign, terms.institution, reason),
  };
}

/** Choosing an inspector in post, stating reasons, and the notice read as its change from today. */
function NoticeComposer({ campaign, removable, acts }: { readonly campaign: Campaign; readonly removable: readonly InspectorRow[]; readonly acts: NationCommit }) {
  const [institution, setInstitution] = useState<InstitutionId>(removable[0]?.institution ?? "");
  const [reason, setReason] = useState("");
  const reasons = ["The President requests a change in oversight leadership. No finding of misconduct is asserted.", "The President requests a new appointment to this office. No finding of misconduct is asserted."];
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const chosen = removable.find((row) => row.institution === institution) ?? removable[0];
  const terms = useMemo(() => (chosen ? inspectorNoticeTerms(campaign, chosen.institution) : undefined), [campaign, chosen]);
  const settled = useSettled(reason.trim(), 700);
  const projection = useChoiceProjection(
    chosen ? campaign : undefined,
    chosen
      ? actsChoice("Notice of removal", "leaving them in post", "Leaving them in post.", [
          { id: FILE, label: "File notice of removal", ...(settled ? { act: { act: "inspector-notice" as const, institution: chosen.institution, reason: settled } } : { refused: "State your reasons first." }) },
        ])
      : undefined,
    selected,
  );
  if (!chosen || !terms || "refusal" in terms) return null;
  return (
    <div className="composer">
      <Field label="Inspector general">
        {(props) => (
          <select {...props} className="ui-input" value={chosen.institution} onChange={(event) => setInstitution(event.target.value)}>
            {removable.map((row) => (
              <option key={row.institution} value={row.institution}>
                {row.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Stated reason" hint="A recorded presidential statement, not evidence of misconduct. The simulation does not adjudicate the legal sufficiency of this explanation.">
        {(props) => <select {...props} className="ui-input" value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Select the statement to record</option>{reasons.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>}
      </Field>
      <CompareAuthorize
        title="Compare filing a removal notice"
        options={[{ id: FILE, label: "File notice of removal", icon: "reject", accent: "red", ...(reason.trim() ? {} : { unavailable: "Not available: state your reasons first." }) }]}
        rows={noticeRows(terms)}
        selected={selected}
        onSelect={setSelected}
        verb="File the removal notice"
        tone="danger"
        onAuthorize={() => void acts.commit(noticeCommission(campaign, terms, reason.trim()))}
        review={`The office empties ${terms.leaves}.${terms.obstructs.length > 0 ? " The audit it is running becomes public and keeps going, and this is what Congress will ask about." : ""} It goes on the Record.`}
        busy={acts.busy}
        {...(projection ? { projection } : {})}
      />
    </div>
  );
}

/** The inspectors general, and filing the thirty days' written notice that empties one office, against leaving it alone. */
export function Inspectors({ campaign }: { readonly campaign: Campaign }) {
  const rows = useMemo(() => inspectorsBoard(campaign), [campaign]);
  const removable = useMemo(() => rows.filter((row) => row.posture === "in-post"), [rows]);
  const acts = useNationCommit(campaign);
  return (
    <section className="nation-section" aria-labelledby="oversight-inspectors">
      <h2 id="oversight-inspectors" className="nation-section__title">
        <Icon name="departmentInvestigation" size={20} /> Inspectors general
      </h2>
      <InspectorList rows={rows} />
      {acts.committed ? (
        <ActReceipt committed={acts.committed} again="Back to the inspectors" onAgain={acts.dismiss} mapNote={null} />
      ) : (
        <NoticeComposer campaign={campaign} removable={removable} acts={acts} />
      )}
      {acts.problem ? (
        <p className="nation-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </section>
  );
}
