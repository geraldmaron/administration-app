import { useState, type ReactNode } from "react";
import { daysBetween, type Campaign } from "@admin/engine";
import {
  ARC_DISPOSITION_WORDS,
  METRIC_LABELS,
  PLEDGE_WARNING_DAYS,
  formatDate,
  formatRatio,
  impactReports,
  inheritedQuarter,
  polarizationReading,
  selectArcReading,
  selectPromises,
  type ArcRow,
  type PromiseRow,
} from "@admin/player-core";
import { Button, Collection, EmptyState, Gauge, Series, Tag } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { ArcInvestigation, ImpactReportList } from "./Investigations";

const STATUS_WORD = { open: "Open", kept: "Kept", broken: "Broken" } as const;
const STATUS_TONE = { open: "neutral", kept: "good", broken: "risk" } as const;

function Section({ id, title, children }: { readonly id: string; readonly title: string; readonly children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rec-section">
      <h2 id={id} className="rec-section__title">{title}</h2>
      {children}
    </section>
  );
}

function ArcItem({ arc, onOpen }: { readonly arc: ArcRow; readonly onOpen: () => void }) {
  const weeks = `${arc.weeks} ${arc.weeks === 1 ? "week" : "weeks"}`;
  const chapters = `${arc.chapters} ${arc.chapters === 1 ? "decision" : "decisions"}`;
  return (
    <li className="rec-item ui-card-door">
      <Button kind="ghost" className="rec-investigate ui-card-door__link" onClick={onOpen}>{arc.title}</Button>
      <p className="rec-when">
        {arc.counterpart} · {weeks} · {chapters}
        {arc.disposition && arc.closedDate ? ` · ${ARC_DISPOSITION_WORDS[arc.disposition]}, ${formatDate(arc.closedDate)}` : ` · since ${formatDate(arc.openedDate)}`}
      </p>
    </li>
  );
}

/** Stories the President has been through: the ones still running, then the ones that ended and how. */
export function Arcs({ campaign }: { readonly campaign: Campaign }) {
  const arcs = selectArcReading(campaign);
  const [selected, setSelected] = useState<ArcRow | undefined>(undefined);
  if (arcs.running.length + arcs.finished.length === 0) {
    return <EmptyState icon="emptyRecord" title="No story arc has opened">Arcs open when a decision starts a story that runs for weeks.</EmptyState>;
  }
  return (
    <Section id="record-arcs" title="Story arcs">
      <h3 className="rec-subhead">Running</h3>
      <Collection items={arcs.running} initial={8} noun="running arcs" className="rec-items" empty="Nothing is running." render={(arc) => <ArcItem key={arc.family} arc={arc} onOpen={() => setSelected(arc)} />} />
      <h3 className="rec-subhead">Ended</h3>
      <Collection items={arcs.finished} initial={8} noun="ended arcs" className="rec-items" empty="No story has ended yet." render={(arc) => <ArcItem key={arc.family} arc={arc} onOpen={() => setSelected(arc)} />} />
      <ArcInvestigation campaign={campaign} arc={selected} onClose={() => setSelected(undefined)} />
      {arcs.quietSince ? <p className="rec-note">Nothing has ended since {formatDate(arcs.quietSince)}.</p> : null}
    </Section>
  );
}

function PledgeItem({ campaign, pledge }: { readonly campaign: Campaign; readonly pledge: PromiseRow }) {
  const dueIn = daysBetween(campaign.calendar, pledge.dueDate);
  const due = pledge.status === "open" && dueIn <= PLEDGE_WARNING_DAYS;
  const when =
    pledge.status === "open"
      ? `Due ${formatDate(pledge.dueDate)}${due ? (dueIn < 0 ? ", past its date" : `, in ${dueIn} ${dueIn === 1 ? "day" : "days"}`) : ""}`
      : pledge.settledDate
        ? formatDate(pledge.settledDate)
        : "";
  return (
    <li className={`rec-item${pledge.status === "open" && pledge.door ? " ui-row-target" : ""}`} data-due={due ? "true" : undefined} data-status={pledge.status}>
      <p className="rec-item__title">
        {pledge.title} <Tag tone={STATUS_TONE[pledge.status]}>{STATUS_WORD[pledge.status]}</Tag>
        {due ? <Tag tone="caution">Falls due soon</Tag> : null}
      </p>
      <p className="rec-when">
        {when}
        {pledge.firstHundredDays ? " · first hundred days" : ""}
      </p>
      {pledge.status === "open" && pledge.keptWhen ? <p className="rec-when">Kept when {pledge.keptWhen}</p> : null}
      {pledge.status === "open" && pledge.door ? <Door href={pledge.door.href} className="ui-row-link">{pledge.door.label}</Door> : null}
    </li>
  );
}

/** The platform's promises, soonest due first; one that falls due within two weeks is marked. */
export function Promises({ campaign }: { readonly campaign: Campaign }) {
  const pledges = selectPromises(campaign);
  if (pledges.length === 0) return <EmptyState icon="emptyRecord" title="No promises on the platform">This administration made no pledges to keep.</EmptyState>;
  return (
    <Section id="record-promises" title="Promises and due pledges">
      <Collection items={pledges} initial={10} noun="promises" className="rec-items" render={(pledge) => <PledgeItem key={pledge.id} campaign={campaign} pledge={pledge} />} />
    </Section>
  );
}

/** How divided the country is against the 2020s level, what this administration added or healed, and what the drift costs. */
function Polarization({ campaign }: { readonly campaign: Campaign }) {
  const reading = polarizationReading(campaign);
  const pct = (share: number) => `${share > 0 ? "+" : share < 0 ? "−" : ""}${Math.abs(Math.round(share * 100))}%`;
  const drifts = reading.series.map((value) => value - reading.anchor);
  return (
    <Section id="record-polarization" title="Polarization">
      <Gauge shape="meter" label="Division against the 2020s level" value={reading.position} valueText={pct(reading.againstEra)} tone="reading" marks={[{ at: reading.anchorAt, label: `2020s level` }]} caption={`A term can move it from ${pct(reading.driftMin)} to ${pct(reading.driftMax)} of the 2020s level.`} />
      {drifts.length > 1 ? <Series label="Division against the 2020s level, week by week" values={drifts} domain={[reading.driftMin, reading.driftMax]} format={pct} /> : null}
      <p className="rec-note">
        Your decisions added {pct(reading.addedByUs)}; events beyond your control {pct(reading.addedByTheWorld)}; {pct(-reading.healed)} was given back.
        {reading.heaviest ? ` The heaviest single decision: ${reading.heaviest.description}` : ""} At this level your own party&rsquo;s identifiers move {Math.round(reading.ownIdentifierMovement.now * 100)}% as much as independents on the same news.
      </p>
    </Section>
  );
}

/** The quarter before the oath, which the Record reconstructs and says is modeled. */
function Inherited({ campaign }: { readonly campaign: Campaign }) {
  const quarter = inheritedQuarter(campaign);
  if (!quarter) return null;
  return (
    <Section id="record-inherited" title="The quarter you inherited">
      <p className="rec-note">The {quarter.weeks} weeks before the oath belong to the previous administration. The Record reconstructs them from where the readings stood on the day of the oath; they are modeled, not recorded.</p>
      <dl className="rec-facts">
        {quarter.moves.map((move) => (
          <div key={move.metric}>
            <dt>{METRIC_LABELS[move.metric]}</dt>
            <dd>
              {formatRatio(move.from)} to {formatRatio(move.to)}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/** Where the country stood when the term began and how divided it is now. */
export function Standing({ campaign }: { readonly campaign: Campaign }) {
  return (
    <div className="rec-stack">
      <Polarization campaign={campaign} />
      <Inherited campaign={campaign} />
    </div>
  );
}

/** What the agencies assessed an act would cost, for the last ninety days. */
export function Impacts({ campaign }: { readonly campaign: Campaign }) {
  const reports = impactReports(campaign, { withinDays: 90 });
  if (reports.length === 0) return <EmptyState icon="emptyRecord" title="No assessments in the last 90 days">An agency files one when an incident's toll is first estimated.</EmptyState>;
  return (
    <Section id="record-impacts" title="Impact assessments, last 90 days">
      <ImpactReportList campaign={campaign} reports={reports} />
    </Section>
  );
}
