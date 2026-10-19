import { useMemo, useState } from "react";
import { COVERAGE_TONES, COVERAGE_TONE_WORD, TOPIC_LABEL, coverageTopics, filterCoverage, type CoverageRow, type CoverageTone, type DeskRow } from "@admin/player-core";
import { Button, Column, Empty, Row, Sheet, Surface, Text } from "@admin/ui";
import { Select } from "@admin/ui/forms";
import { ArticleRow } from "@admin/ui/news";
import { namingNation, nationsInCoverage } from "./front-page";
import { coverageFilterOf, filterCount, type PressParams } from "./press-params";
import { storySummary } from "./story-parts";

const PAGE = 15;
const ANY = "any";

type Props = {
  readonly rows: readonly CoverageRow[];
  readonly desks: readonly DeskRow[];
  readonly params: PressParams;
  readonly onParams: (next: PressParams) => void;
};

function describe(params: PressParams, desks: readonly DeskRow[], nationName: string | undefined): string {
  return [
    ...(params.week !== undefined ? [`week ${params.week}`] : []),
    ...(params.outlet ? [desks.find((desk) => desk.id === params.outlet)?.name ?? "an unknown news outlet"] : []),
    ...(params.tone ? [COVERAGE_TONE_WORD[params.tone].toLowerCase()] : []),
    ...(params.topic ? [TOPIC_LABEL[params.topic].toLowerCase()] : []),
    ...(params.nation ? [`about ${nationName ?? params.nation}`] : []),
  ].join(", ");
}

/** Topic, desk, lean and government, each with how many stories it keeps. */
function Filters({ rows, desks, params, onParams }: Props) {
  const topics = useMemo(() => coverageTopics(rows), [rows]);
  const nations = useMemo(() => nationsInCoverage(rows), [rows]);
  const set = (patch: Partial<Record<keyof PressParams, string | undefined>>) => onParams({ ...params, ...(patch as PressParams) });
  const pick = (value: string) => (value === ANY ? undefined : value);
  return (
    <Column gap="md">
      <Select label="Topic" value={params.topic ?? ANY} onChange={(value) => set({ topic: pick(value) })} options={[{ value: ANY, label: "All topics" }, ...topics.map((topic) => ({ value: topic.topic, label: `${topic.label} (${topic.count})` }))]} />
      <Select label="News outlet" value={params.outlet ?? ANY} onChange={(value) => set({ outlet: pick(value) })} options={[{ value: ANY, label: "All news outlets" }, ...desks.map((desk) => ({ value: desk.id, label: `${desk.name} (${desk.filed})`, detail: `${desk.format} · ${desk.stanceWord}` }))]} />
      <Select label="How it treats you" value={params.tone ?? ANY} onChange={(value) => set({ tone: pick(value) as CoverageTone | undefined })} options={[{ value: ANY, label: "Any tone" }, ...COVERAGE_TONES.map((tone) => ({ value: tone, label: COVERAGE_TONE_WORD[tone] }))]} />
      <Select label="Country" value={params.nation ?? ANY} onChange={(value) => set({ nation: pick(value) })} options={[{ value: ANY, label: "Any country" }, ...nations.map((nation) => ({ value: nation.id, label: `${nation.name} (${nation.count})` }))]} />
    </Column>
  );
}

/**
 * Every story filed, newest first, narrowed by topic, desk, lean, week or
 * the government it names. The address carries the filters, so a desk, a
 * week column, a topic or a government elsewhere lands here already narrowed.
 */
export function FeedView({ rows, desks, params, onParams }: Props) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const filtered = useMemo(() => namingNation(filterCoverage(rows, coverageFilterOf(params)), params.nation), [rows, params]);
  const count = filterCount(params);
  const nationName = params.nation ? rows.flatMap((row) => row.nations).find((nation) => nation.id === params.nation)?.name : undefined;
  const visible = filtered.slice(0, shown);
  return (
    <Column id="press-feed" gap="md">
      <Row between gap="sm" wrap>
        <Text variant="body" tone="secondary" role="status" flex={1} minWidth={220}>
          {count > 0 ? `${filtered.length.toLocaleString("en-US")} of ${rows.length.toLocaleString("en-US")} stories: ${describe(params, desks, nationName)}.` : `${rows.length.toLocaleString("en-US")} stories since your term began, newest first.`}
        </Text>
        <Row gap="sm">
          <Button kind="secondary" size="compact" icon="utilitySettings" onPress={() => setOpen(true)}>
            {count > 0 ? `Filters · ${count}` : "Filters"}
          </Button>
          {count > 0 ? (
            <Button kind="quiet" size="compact" icon="close" onPress={() => onParams({ view: "feed" })}>
              Clear
            </Button>
          ) : null}
        </Row>
      </Row>
      <Sheet open={open} onClose={() => setOpen(false)} title="Filter stories" eyebrow="All stories" footer={<Button kind="primary" block onPress={() => setOpen(false)}>{`Show ${filtered.length.toLocaleString("en-US")} stories`}</Button>}>
        <Text variant="body" tone="secondary">
          Pick a topic, news outlet, tone, or country to see fewer stories. Your choices stay in the page link, so you can come back to them.
        </Text>
        <Filters rows={rows} desks={desks} params={params} onParams={(next) => { setShown(PAGE); onParams(next); }} />
      </Sheet>
      {filtered.length === 0 ? (
        <Surface level="sunken">
          <Empty title="No stories match these filters" detail="Try removing one." icon="press" />
        </Surface>
      ) : (
        <Surface pad="none" role="list" aria-label="Stories, newest first">
          {visible.map((row, i) => (
            <ArticleRow key={row.index} story={storySummary(row)} first={i === 0} />
          ))}
        </Surface>
      )}
      {filtered.length > visible.length ? (
        <Row gap="sm" between wrap>
          <Text variant="caption" tone="secondary">{`Showing ${visible.length} of ${filtered.length.toLocaleString("en-US")}`}</Text>
          <Button kind="secondary" size="compact" onPress={() => setShown(shown + PAGE)}>
            {`Show ${Math.min(PAGE, filtered.length - visible.length)} older`}
          </Button>
        </Row>
      ) : null}
    </Column>
  );
}
