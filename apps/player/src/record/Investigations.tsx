import { useState } from "react";
import { selectFamilyRun, type Campaign } from "@admin/engine";
import { ARC_DISPOSITION_WORDS, formatDate, formatMoney, place, recordEntry, type ArcRow, type ImpactReportRow } from "@admin/player-core";
import { Badge, Button, CardLink, Column, Empty, EntityLink, Icon, PressRow, Row, Sheet, Surface, Text } from "@admin/ui";
import { Fact } from "@admin/ui/record";
import { go } from "../news/story-parts";

const range = (low: number, high: number): string => `${low.toLocaleString("en-US")}–${high.toLocaleString("en-US")}`;

/** One filed assessment read whole: its evidence, the government, the act it followed and every revision. Running totals are deliberately unread. */
function ImpactSheet({ campaign, report, onClose }: { readonly campaign: Campaign; readonly report: ImpactReportRow | undefined; readonly onClose: () => void }) {
  const event = report ? Object.values(campaign.impactEvents ?? {}).find((candidate) => candidate.spec.id === report.id) : undefined;
  const cause = event?.causedBy ? recordEntry(campaign, event.causedBy) : undefined;
  return (
    <Sheet open={report !== undefined} onClose={onClose} title={report?.title ?? "Damage report"} eyebrow={report ? `${report.nationName} · ${report.stage}` : "Report"} wide>
      {report && event ? (
        <>
          <Row gap="md" wrap>
            <Fact label="Latest report" value={formatDate(report.reported)} />
            <Fact label="Confidence" value={report.confidence} />
            <Fact label="Place" value={report.site} />
            <Fact label="Reports so far" value={String(report.revisions)} />
          </Row>
          <Text variant="body">{report.basis}</Text>
          <Row gap="md" wrap>
            <EntityLink label={report.nationName} icon="flag" href={event.spec.nation === campaign.founding.nation ? place.nation() : place.country(event.spec.nation)} onPress={() => go(event.spec.nation === campaign.founding.nation ? place.nation() : place.country(event.spec.nation))} />
            {cause ? <EntityLink label={`What caused it: ${cause.headline}`} icon="record" href={place.event(cause.id)} onPress={() => { onClose(); go(place.event(cause.id)); }} /> : <Text variant="caption" tone="secondary">The Record doesn't show what caused this.</Text>}
          </Row>
          <Text variant="caption" tone="secondary">These numbers are ranges because early counts are guesses. Each update can change them and how sure the agency is. They aren't the game's hidden totals.</Text>
          {event.reports.map((file) => (
            <Surface key={file.revision} level="raised" pad="md">
              <Column gap="xs">
                <Text variant="label">{`${formatDate(file.date)} · Update ${file.revision}`}</Text>
                <Text variant="caption" tone="secondary">{`${file.stage} · ${file.confidence} confidence`}</Text>
                <Row gap="md" wrap>
                  <Fact label="Reported deaths" value={range(file.deaths.low, file.deaths.high)} />
                  <Fact label="Injured or severely ill" value={range(file.injured.low, file.injured.high)} />
                  <Fact label="People without services" value={range(file.serviceDisruption.low, file.serviceDisruption.high)} />
                  <Fact label="Estimated economic loss" value={`${formatMoney(file.lossUSDm.low)}–${formatMoney(file.lossUSDm.high)}`} />
                </Row>
                <Text variant="caption" tone="secondary">{file.basis}</Text>
              </Column>
            </Surface>
          ))}
        </>
      ) : null}
    </Sheet>
  );
}

/** Agency assessments as cards, each opening its filed history. */
export function ImpactReportList({ campaign, reports, initial = 6 }: { readonly campaign: Campaign; readonly reports: readonly ImpactReportRow[]; readonly initial?: number }) {
  const [selected, setSelected] = useState<ImpactReportRow | undefined>(undefined);
  const [shown, setShown] = useState(initial);
  if (reports.length === 0) return <Empty title="No damage reports followed this entry" />;
  return (
    <Column gap="sm">
      {reports.slice(0, shown).map((report) => (
        <CardLink key={report.id} role="button" pad="md" label={`Open the report: ${report.title}`} onPress={() => setSelected(report)}>
          <Column gap="xs">
            <Text variant="label">{report.title}</Text>
            <Row gap="sm" wrap>
              <Text variant="caption" tone="secondary">{report.nationName}</Text>
              <Badge status="pending" icon="pending">{report.stage}</Badge>
              <Badge status="info">{`${report.confidence} confidence`}</Badge>
              <Text variant="caption" tone="tertiary">{formatDate(report.reported)}</Text>
            </Row>
            <Row gap="md" wrap>
              {report.figures.map((figure) => <Fact key={figure.label} label={figure.label} value={figure.range} />)}
            </Row>
          </Column>
        </CardLink>
      ))}
      {reports.length > shown ? <Row><Button kind="secondary" size="compact" onPress={() => setShown(reports.length)}>{`Show ${reports.length - shown} more reports`}</Button></Row> : null}
      <ImpactSheet campaign={campaign} report={selected} onClose={() => setSelected(undefined)} />
    </Column>
  );
}

/** A story arc read whole: who it was with, where, and every chapter the President decided, each opening its case where the case was kept. */
export function ArcSheet({ campaign, arc, onClose }: { readonly campaign: Campaign; readonly arc: ArcRow | undefined; readonly onClose: () => void }) {
  const run = arc ? selectFamilyRun(campaign, arc.family) : undefined;
  return (
    <Sheet open={arc !== undefined} onClose={onClose} title={arc?.title ?? "Storyline"} eyebrow={arc ? `${arc.counterpart} · ${arc.chapters} decisions · ${arc.weeks} weeks` : "Storyline"}>
      {arc && run ? (
        <>
          <Row gap="md" wrap>
            <Fact label="Opened" value={formatDate(arc.openedDate)} />
            <Fact label="Status" value={arc.disposition ? ARC_DISPOSITION_WORDS[arc.disposition] : "Ongoing"} />
            {arc.closedDate ? <Fact label="Closed" value={formatDate(arc.closedDate)} /> : null}
          </Row>
          <Row gap="md" wrap>
            <EntityLink label={arc.counterpart} icon="flag" href={run.counterpart === campaign.founding.nation ? place.nation() : place.country(run.counterpart)} onPress={() => go(run.counterpart === campaign.founding.nation ? place.nation() : place.country(run.counterpart))} />
            {run.place ? <EntityLink label={campaign.states[run.place.state]?.base.name ?? run.place.state} icon="mapPin" href={place.state(run.place!.state)} onPress={() => go(place.state(run.place!.state))} /> : null}
          </Row>
          <Text variant="eyebrow" tone="secondary">Chapters</Text>
          {run.beats.map((scenario, index) => {
            const file = Object.values(campaign.cases ?? {}).find((candidate) => candidate.contentPin?.scenarioId === scenario);
            return file ? (
              <PressRow key={`${scenario}:${index}`} label={`Open the decision, ${file.title}`} href={place.decision(scenario)} onPress={() => go(place.decision(scenario))} flexDirection="row" alignItems="center" gap="sm" padding="sm" minHeight={44} borderRadius="control">
                <Icon name="decision" size={18} tone="colorSecondary" />
                <Column flex={1} minWidth={0} gap="2xs">
                  <Text variant="label">{file.title}</Text>
                  <Text variant="caption" tone="secondary">{`${formatDate(file.raisedAt)} · ${file.status}`}</Text>
                </Column>
                <Icon name="chevron" size={16} tone="colorTertiary" />
              </PressRow>
            ) : (
              <Text key={`${scenario}:${index}`} variant="caption" tone="secondary">{`Chapter ${index + 1} happened, but its briefing wasn't saved.`}</Text>
            );
          })}
        </>
      ) : null}
    </Sheet>
  );
}
