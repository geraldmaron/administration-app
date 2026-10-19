import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { formatDate, formatRatio, officeFile, personFile, place, type OfficeCondition, type OfficeFile } from "@admin/player-core";
import { Bar, Button, Collection, EmptyState, Icon, Portrait, Tabs, Tag, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import "../person/institution-dossier.css";
import { Screen } from "../../shell/Screen";
import { Dossier, DossierSection, IdPlate } from "../../shell/dossier/Dossier";
import { PersonReadings } from "../person/PersonReadings";
import { ActReceipt } from "./ActReceipt";
import { AgendaActs } from "./AgendaActs";
import { ChairActs, FillChair, type FillAct } from "./ChairActs";
import { OfficeChart } from "./OfficeChart";
import { Emblem, StaffingBadge } from "./StaffingBadge";
import { useChairActs, type ChairActDone } from "./acts";

export const OFFICE_VIEWS = ["overview", "leadership", "organization", "actions", "record"] as const;
export type OfficeView = typeof OFFICE_VIEWS[number];

function lede(file: OfficeFile): string {
  if (file.staffing === "vacant") return `${file.office.title}: nobody is in the chair.`;
  const name = file.holderName ?? "Somebody";
  return file.staffing === "acting" ? `${name} is acting ${file.office.title}, without its mandate.` : `${name} holds the chair.`;
}

/** Why the chair needs the President, from what the record says is waiting or missing. */
function attentionOf(file: OfficeFile): readonly string[] {
  const days = file.condition?.vacantDays ?? 0;
  return [
    ...(file.staffing === "vacant" ? [`Nobody is in the chair${days > 0 ? `, empty ${days} days` : ""}. The body under it delivers less each week it stays empty.`] : []),
    ...(file.staffing === "acting" ? [`${file.holderName ?? "An officer"} is acting, without the office's mandate. No confirmed officer is in the chair.`] : []),
    ...file.alerts.map((alert) => alert.text),
  ];
}

function Attention({ file, onAction }: { readonly file: OfficeFile; readonly onAction: () => void }) {
  const reasons = attentionOf(file);
  if (reasons.length === 0) return null;
  return (
    <section className="exec-attention" aria-labelledby="office-attention">
      <h2 id="office-attention" className="exec__heading">
        <Icon name="caution" size={20} /> Why this needs your attention
      </h2>
      <ul>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <Button kind="secondary" onClick={onAction}>Review available actions</Button>
    </section>
  );
}

function Identity({ file, asOf }: { readonly file: OfficeFile; readonly asOf: string }) {
  const site = file.site.kind === "sourced" ? `Headquarters: ${file.site.name}, ${file.site.state === "DC" ? "Washington, D.C." : file.site.state}` : `No headquarters on record: ${file.site.reason}`;
  return (
    <IdPlate
      reference={{ id: file.office.id, dated: asOf }}
      mark={file.holder ? <Portrait name={file.holderName ?? "Officer"} size="lg" redacted decorative /> : <span className="exec-office__emblem" aria-hidden="true"><Emblem name={file.emblem} size={32} /></span>}
      post={
        <>
          {file.office.title}
          {file.holder ? (
            <>
              {": "}
              <Door className="institutional-file__holder-link" href={place.person(file.holder)}>{file.holderName}<Icon name="subjectPerson" size={16} /></Door>
            </>
          ) : null}
        </>
      }
      tags={
        <>
          <StaffingBadge staffing={file.staffing} />
          {file.chips.map((chip) => (
            <Tag key={chip.key}>
              <span className="ui-visually-hidden">{chip.spoken}</span>
              <span aria-hidden="true">{chip.label}</span>
            </Tag>
          ))}
        </>
      }
      line={site}
    />
  );
}

function Facts({ file }: { readonly file: OfficeFile }) {
  const condition = file.condition;
  return <section className="office-operations" aria-label="Facts for this chair">
    <div className="office-operations__appointment"><Icon name="appoint" size={18} /><div><span>Appointment authority</span><strong>{file.lever === "cabinet" ? "Senate confirmation" : file.lever === "acting" ? "Acting appointment" : "Separate appointing authority"}</strong><small>{file.lever === "cabinet" ? "Nominate a permanent officer or appoint an acting officer" : file.lever === "acting" ? "Only an acting officer can be appointed here" : "This office is not filled from this screen"}</small></div></div>
    <dl>
      {condition ? <><div><dt>Work backlog</dt><dd>{condition.backlog}<small>items</small></dd></div><div><dt>Active directives</dt><dd>{condition.directives}</dd></div></> : null}
      {condition && condition.vacantDays > 0 ? <div><dt>Without a confirmed officer</dt><dd>{condition.vacantDays}<small>days</small></dd></div> : null}
      {file.office.actingLimitDays !== undefined ? <div><dt>Acting service limit</dt><dd>{file.office.actingLimitDays}<small>days</small></dd></div> : null}
    </dl>
  </section>;
}

/** Office performance as four slim bars on one 0 to 100 axis, so the eye reads across them; workload stays separate in the facts above. */
function Condition({ condition, n }: { readonly condition: OfficeCondition; readonly n: number }) {
  const meters = [
    { key: "quality", icon: "approve", label: "Delivery", value: condition.implementationQuality, caption: "Implementation quality" },
    { key: "capacity", icon: "building", label: "Capacity", value: condition.capacity, caption: "Ability to carry the mandate" },
    { key: "staffing", icon: "subjectPerson", label: "Staffing", value: condition.staffing, caption: "Share of posts filled" },
    { key: "morale", icon: "layerBlocs", label: "Morale", value: condition.morale, caption: "Workforce confidence" },
  ] as const satisfies readonly { key: string; icon: IconName; label: string; value: number; caption: string }[];
  return (
    <DossierSection id="exec-condition" n={n} icon="graph" title="Department performance" note="Operating assessments on a 0–100% scale. Staffing measures filled posts.">
      <div className="office-performance" role="group" aria-label="Department performance">{meters.map((meter) => <div key={meter.key} data-tone={meter.value >= .6 ? "good" : meter.value >= .4 ? "watch" : "bad"}><div><span><Icon name={meter.icon} size={16} />{meter.label}</span><strong>{formatRatio(meter.value)}</strong></div><Bar value={meter.value} tone={meter.value >= .6 ? "good" : meter.value >= .4 ? "watch" : "bad"} label={`${meter.label}: ${formatRatio(meter.value)}, zero to one hundred percent`} slim /><small>{meter.caption}</small></div>)}</div>
    </DossierSection>
  );
}

function Commands({ file }: { readonly file: OfficeFile }) {
  if (file.commands.length === 0) return null;
  return (
    <section aria-labelledby="exec-commands">
      <h2 id="exec-commands" className="exec__heading">
        Combatant commands
      </h2>
      <Collection
        items={file.commands}
        initial={6}
        noun="commands"
        className="exec-commands"
        render={(command) => (
          <li key={command.id} className="ui-row-target">
            <Door className="ui-row-link" href={place.command(command.id)}><strong>{command.abbr}</strong></Door>
            <span>{command.name}</span>
            <span className="exec-commands__posture">{command.posture.charAt(0).toUpperCase() + command.posture.slice(1)} posture</span>
          </li>
        )}
      />
    </section>
  );
}

function Record({ file }: { readonly file: OfficeFile }) {
  return (
    <section aria-labelledby="exec-record">
      <h2 id="exec-record" className="exec__heading">
        On the Record
      </h2>
      <Collection
        items={file.record}
        initial={5}
        noun="Record entries"
        className="exec-record"
        empty="Nothing on your Record names this office yet."
        render={(row) => (
          <li key={row.id} className="ui-row-target">
            <Door href={`/record/event/${encodeURIComponent(row.id)}`} className="ui-row-link">
              {row.headline}
            </Door>
            <span className="exec__when">{formatDate(row.date)}</span>
          </li>
        )}
      />
    </section>
  );
}

type DeskProps = {
  readonly campaign: Campaign;
  readonly file: OfficeFile;
  readonly fill: FillAct | undefined;
  readonly onFill: (act: FillAct | undefined) => void;
  readonly onDone: (done: ChairActDone) => void;
  readonly view: OfficeView;
  readonly onView: (view: OfficeView) => void;
};

function OfficeDesk({ campaign, file, fill, onFill, onDone, view, onView }: DeskProps) {
  const acts = useChairActs(campaign, file.camera, onDone);
  const holder = useMemo(() => (file.holder ? personFile(campaign, file.holder) : undefined), [campaign, file.holder]);
  if (fill) return <FillChair campaign={campaign} file={file} acts={acts} act={fill} onAct={onFill} onClose={() => onFill(undefined)} />;
  const asOf = formatDate(campaign.calendar);
  return (
    <Screen title={file.name} eyebrow={file.name === file.office.title ? "Office" : file.office.title} lede={lede(file)} screenClass="workspace" camera="keep" measure="data">
      <div className="exec institutional-file"><Dossier kind="Office file" institution={file.institution.id} house={file.name} asOf={asOf}>
        <Identity file={file} asOf={asOf} />
        <Attention file={file} onAction={() => onView("actions")} />
        {acts.problem ? <p className="exec__problem" role="alert">{acts.problem}</p> : null}
        <Tabs label="Office workspace" selected={view} onSelect={(next) => onView(OFFICE_VIEWS.find((value) => value === next) ?? "overview")} tabs={[{ id: "overview", label: "Operating picture", icon: "graph" }, { id: "leadership", label: "Leadership", icon: "subjectPerson" }, { id: "organization", label: "Organization", icon: "building", count: file.agencies.length }, { id: "actions", label: "Actions", icon: "appoint" }, { id: "record", label: "Record", icon: "record", count: file.record.length }]}>
          {view === "overview" ? <><section className="office-mandate" aria-labelledby="office-mandate-title"><div><h2 id="office-mandate-title" className="exec__heading"><Icon name="building" size={20} />Mandate</h2><p>{file.institution.mandate}</p></div></section><Facts file={file} />{file.condition ? <Condition condition={file.condition} n={1} /> : <EmptyState icon="graph" title="No department performance assessment">This office has no department-level operating assessment in the current model.</EmptyState>}</> : view === "leadership" ? holder ? <DossierSection id="office-leadership" n={1} icon="subjectPerson" title="Leadership assessment" note="Staff bands, confidence and consequences remain separate from proven performance."><Door className="institutional-file__identity-link" href={place.person(holder.person.id)}><Portrait name={holder.person.name} redacted size="sm" decorative /><strong>{holder.person.name}</strong><span aria-hidden="true">→</span></Door><PersonReadings readings={holder.readings} title="Officer assessments" titleHidden /></DossierSection> : <EmptyState icon="emptyCabinet" title="No officer is in this chair">Use Actions to inspect the appointments this office supports.</EmptyState> : view === "organization" ? <><OfficeChart campaign={campaign} file={file} /><Commands file={file} /></> : view === "actions" ? <DossierSection id="office-actions" n={1} icon="appoint" title="Actions on this chair" note="Each act is read as its change from today before it is authorized."><AgendaActs campaign={campaign} proposals={file.proposals} offers={file.offers} factions={file.factions} acts={acts} /><ChairActs campaign={campaign} file={file} acts={acts} onFill={onFill} /></DossierSection> : <Record file={file} />}
        </Tabs>
      </Dossier></div>
    </Screen>
  );
}

export type OfficeScreenProps = {
  readonly campaign: Campaign;
  readonly id: string;
  /** The shortlist being compared, kept in the address so Back returns to the office. */
  readonly fill?: FillAct;
  readonly onFill: (act: FillAct | undefined) => void;
  readonly view?: OfficeView;
  readonly onView?: (view: OfficeView) => void;
};

/** One office: its headquarters, who holds it, how it runs, what waits from it, and every act on the chair compared before it is done. */
export function OfficeScreen({ campaign, id, fill, onFill, view = "overview", onView = () => undefined }: OfficeScreenProps) {
  const [done, setDone] = useState<ChairActDone | undefined>();
  const file = useMemo(() => officeFile(campaign, id), [campaign, id]);
  if (done) return <ActReceipt done={done} back={{ label: "Back to the office", onBack: () => { setDone(undefined); onFill(undefined); } }} />;
  if (!file) {
    return (
      <Screen title="No such office" eyebrow="Washington" screenClass="workspace" camera="keep">
        <EmptyState icon="emptyCabinet" title="This office is not one your government seats">
          <Door href="/washington">Back to Washington</Door>
        </EmptyState>
      </Screen>
    );
  }
  return <OfficeDesk campaign={campaign} file={file} fill={fill} onFill={onFill} onDone={setDone} view={view} onView={onView} />;
}
