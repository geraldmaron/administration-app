import { useState } from "react";
import { daysBetween, type Campaign } from "@admin/engine";
import { PLACES, familyQueue, formatDate, place, resolveAuthorityText, summonsReading, type SummonsReading } from "@admin/player-core";
import { Button, Column, EntityLink, LegalCitation, Loading, Page, Row, Section, Tag, Text } from "@admin/ui";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { ReviewBoundary } from "../review/PresidentialReview";
import { BackButton } from "../shell/BackButton";
import { CaseReceipt, CaseScreen, type CaseDone } from "./CaseScreen";
import { FactGrid } from "@admin/ui/record";
import { ClockReading, History, go, useCarryingOut } from "./parts";

const URGENCY = { due: { tone: "danger", word: "Due" }, closing: { tone: "warning", word: "Closing" }, standing: { tone: "outline", word: "Standing" } } as const;

function Window({ reading }: { readonly reading: SummonsReading }) {
  const openLaw = useOpenAuthority();
  const window = reading.brief.window;
  if (!window) return null;
  const left = Math.max(0, window.length - window.consumed);
  const law = window.statute ? resolveAuthorityText(window.statute) : undefined;
  return (
    <Column gap="sm">
      <ClockReading clock={{ label: window.statute ?? "Time allowed", window: window.length, left, unit: window.unit === "day" ? "day" : "week" }} />
      {law ? <LegalCitation citation={{ cite: law.cite, title: law.shortTitle ?? law.title }} onPress={() => openLaw(law.cite)} /> : null}
    </Column>
  );
}

/** A statutory clock as an obligation dossier: status, due date, consequence, required act, responsible institution and the last time it came due. */
function SummonsScreen({ campaign, reading }: { readonly campaign: Campaign; readonly reading: SummonsReading }) {
  const { brief, due } = reading;
  const left = due ? daysBetween(campaign.calendar, due.dueDate) : undefined;
  const running = due !== undefined;
  const owner = PLACES[reading.spec.owner];
  const institution = owner?.title;
  const urgency = due ? URGENCY[due.urgency] : undefined;
  return (
    <Page icon="pending" eyebrow={running ? "Deadline · clock running" : "Deadline · clock stopped"} title={brief.title} lede={brief.clockLine}>
      <Row><BackButton parent={place.brief()} parentLabel="Brief" /></Row>
      <Section icon="pending" title="What you owe" actions={<Tag tone={urgency?.tone ?? "outline"}>{urgency?.word ?? "Stopped"}</Tag>}>
        <FactGrid
          items={[
            { label: "Due date", value: due ? `${left !== undefined && left < 0 ? "Overdue since" : "Due"} ${formatDate(due.dueDate)}` : "This clock isn't running right now" },
            { label: "Time remaining", value: left === undefined ? "Doesn't apply" : left < 0 ? "Past the due date" : `${left} ${left === 1 ? "day" : "days"}` },
            { label: "Measure", value: brief.figure },
            { label: "Who's responsible", value: institution && owner ? <EntityLink label={institution} href={owner.href} onPress={() => go(owner.href)} /> : "Not stated" },
            { label: "What you need to do", value: reading.spec.answerable ? brief.door.label : "None. Nothing you do changes this date." },
          ]}
        />
        <Window reading={reading} />
      </Section>
      {brief.posture.length > 0 ? (
        <Section icon="dossier" title="Where it stands">
          <FactGrid items={brief.posture.map((posture) => ({ label: posture.caption, value: <Text variant="label" tone={posture.stance === "adverse" ? "danger" : posture.stance === "favorable" ? "success" : "primary"}>{posture.figure}</Text> }))} />
        </Section>
      ) : null}
      {brief.counsel ? (
        <Section icon="microphone" title="Counsel">
          <Text variant="voice">{brief.counsel}</Text>
        </Section>
      ) : null}
      {running && reading.spec.answerable ? (
        <Section icon="sign" title="Your answer">
          <Row>
            <Button kind="primary" icon="open" onPress={() => go(brief.door.href)}>
              {brief.door.label}
            </Button>
          </Row>
        </Section>
      ) : null}
      <History empty="This deadline hasn't come up before." events={brief.history.map((line) => ({ key: line.key, when: line.label, text: line.detail }))} />
    </Page>
  );
}

function NotRunning() {
  return (
    <Page icon="pending" eyebrow="Deadline" title="This clock isn't running" lede="It was either answered or it ran out.">
      <Row><BackButton parent={place.brief()} parentLabel="Brief" /></Row>
    </Page>
  );
}

/** A clock on the desk: a case answered here, or a statutory clock read as its dossier. */
export function Clock({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const [done, setDone] = useState<CaseDone | undefined>();
  const entry = familyQueue(campaign).find((candidate) => candidate.record.id === id);
  const reading = entry ? undefined : summonsReading(campaign, id);
  const carrying = useCarryingOut(entry !== undefined);
  return (
    <ReviewBoundary>
      {done ? <CaseReceipt campaign={campaign} done={done} here={place.clock(id)} /> : entry ? <CaseScreen campaign={campaign} entry={entry} onDone={setDone} /> : reading ? <SummonsScreen campaign={campaign} reading={reading} /> : carrying ? <Loading title="Carrying out your answer" /> : <NotRunning />}
    </ReviewBoundary>
  );
}
