import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { daysBetween, type Campaign } from "@admin/engine";
import { PLACES, familyQueue, formatDate, summonsReading, type SummonsReading } from "@admin/player-core";
import { Card, CardContent, EmptyState, Gauge, Icon, Tag, buttonClass } from "@admin/ui-web";
import { ObligationFacts, ObligationHistory } from "../brief/Obligation";
import { CaseReceipt, CaseScreen, type CaseDone } from "../brief/CaseScreen";
import { useBuilt } from "../shell/built-routes";
import { Door } from "../shell/Door";
import { InTerm } from "../shell/InTerm";
import { Screen } from "../shell/Screen";

/** A statutory clock as an obligation dossier: status, due date, consequence, required act, responsible institution and the last time it came due. */
function SummonsScreen({ campaign, reading }: { readonly campaign: Campaign; readonly reading: SummonsReading }) {
  const built = useBuilt();
  const { brief, due } = reading;
  const left = due ? daysBetween(campaign.calendar, due.dueDate) : undefined;
  const running = due !== undefined;
  const institution = PLACES[reading.spec.owner]?.title;
  return (
    <Screen icon="pending" title={brief.title} eyebrow={running ? "Obligation · running" : "Obligation · not running"} lede={brief.clockLine} screenClass="workspace" camera="us">
      <div className="case">
        <Card role="region" aria-labelledby="clock-status"><CardContent className="grid gap-3 pt-5">
          <h2 id="clock-status" className="brief-section__title">
            {running ? <Tag tone={due.urgency === "due" ? "risk" : due.urgency === "closing" ? "caution" : "neutral"}>{due.urgency === "due" ? "Due" : due.urgency === "closing" ? "Closing" : "Standing"}</Tag> : <Tag tone="neutral">Not running</Tag>} What is owed
          </h2>
          <ObligationFacts
            facts={[
              { label: "Due date", value: due ? `${left !== undefined && left < 0 ? "Running since" : "Due"} ${formatDate(due.dueDate)}` : "Nothing is running on this clock now" },
              { label: "Time remaining", value: left === undefined ? "Not applicable" : left < 0 ? "Past the date" : `${left} ${left === 1 ? "day" : "days"}` },
              { label: "Measure", value: brief.figure },
              { label: "Responsible institution", value: institution ?? "Not stated" },
              { label: "Required act", value: reading.spec.answerable ? brief.door.label : "None. No act of the President moves this date." },
            ]}
          />
          {brief.window ? (
            <Gauge
              shape="meter"
              label={brief.window.statute ?? "The window"}
              value={Math.max(0, brief.window.length - brief.window.consumed) / brief.window.length}
              valueText={`${Math.max(0, brief.window.length - brief.window.consumed)} of ${brief.window.length} ${brief.window.unit === "day" ? "days" : "weeks"} left`}
              tone={due?.urgency === "due" ? "risk" : "reading"}
            />
          ) : null}
        </CardContent></Card>
        {brief.posture.length > 0 ? (
          <Card role="region" aria-labelledby="clock-posture"><CardContent className="grid gap-3 pt-5">
            <h2 id="clock-posture" className="brief-section__title">
              <Icon name="dossier" size={20} /> Where it stands
            </h2>
            <dl className="particulars">
              {brief.posture.map((posture) => (
                <div key={posture.key} data-stance={posture.stance}>
                  <dt>{posture.caption}</dt>
                  <dd>{posture.figure}</dd>
                </div>
              ))}
            </dl>
          </CardContent></Card>
        ) : null}
        {brief.counsel ? (
          <Card role="region" aria-labelledby="clock-counsel"><CardContent className="grid gap-3 pt-5">
            <h2 id="clock-counsel" className="brief-section__title">
              <Icon name="microphone" size={20} /> Counsel
            </h2>
            <p>{brief.counsel}</p>
          </CardContent></Card>
        ) : null}
        {running && reading.spec.answerable ? (
          <Card role="region" aria-labelledby="clock-act"><CardContent className="grid gap-3 pt-5">
            <h2 id="clock-act" className="brief-section__title">
              <Icon name="sign" size={20} /> Your answer
            </h2>
            {built(brief.door.href) ? (
              <Door href={brief.door.href} className={buttonClass("primary")}>
                {brief.door.label}
              </Door>
            ) : (
              <p className="matter__later">{brief.door.label} is taken on its own record, which does not open from here.</p>
            )}
          </CardContent></Card>
        ) : null}
        <ObligationHistory empty="This clock has never come due." events={brief.history.map((line) => ({ key: line.key, when: line.label, text: line.detail }))} />
      </div>
    </Screen>
  );
}

function Clock({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const [done, setDone] = useState<CaseDone | undefined>();
  if (done) return <CaseReceipt done={done} />;
  const entry = familyQueue(campaign).find((candidate) => candidate.record.id === id);
  if (entry) return <CaseScreen campaign={campaign} entry={entry} onDone={setDone} />;
  const reading = summonsReading(campaign, id);
  if (reading) return <SummonsScreen campaign={campaign} reading={reading} />;
  return (
    <Screen title="This clock is not running" eyebrow="Obligation" screenClass="workspace" camera="us">
      <EmptyState icon="emptyInbox" title="Nothing here">
        It was answered or it lapsed. <Door href="/brief" className={buttonClass("secondary")}>Back to the Brief</Door>
      </EmptyState>
    </Screen>
  );
}

function ClockPage() {
  const { id } = Route.useParams();
  return <InTerm>{(campaign) => <Clock key={id} campaign={campaign} id={id} />}</InTerm>;
}

export const Route = createFileRoute("/brief/clock/$id")({
  component: ClockPage,
});
