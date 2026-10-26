import type { Campaign } from "@admin/engine";
import { digestView, digestWeeks, formatDate, formatSignedPoints, place, spanWords, stopWords, type DigestKpi, type DigestView, type StateMove } from "@admin/player-core";
import { CardGrid, Column, Empty, Icon, Meter, Page, Pressable, Reading, ReadingFrame, Row, Section, Text } from "@admin/ui";
import { useCampaignState } from "../../device/hooks";
import { BackButton } from "../../shell/BackButton";
import { go } from "../../shell/navigate";
import { beforeKey } from "../before-key";
import { WhileTimeRan } from "../Clocks";
import { ActGroups, WireGroups } from "./Groups";
import { WeekBars } from "./WeekBars";

/** One reading across the week: where it closed on its own scale, a tick where the week opened, and the words for the move. */
function KpiMeter({ kpi }: { readonly kpi: DigestKpi }) {
  if (!kpi.known || kpi.afterFraction === undefined || kpi.beforeFraction === undefined || kpi.afterText === undefined || kpi.beforeText === undefined) {
    return (
      <Column gap="2xs" flexGrow={1}>
        <Text variant="label">{kpi.label}</Text>
        <Text variant="caption" tone="secondary">{kpi.text}</Text>
      </Column>
    );
  }
  return (
    <Column gap="xs" flexGrow={1}>
      <Reading name={kpi.label} value={kpi.afterText} delta={{ text: kpi.text, direction: kpi.direction, better: "up" }} period={`from ${kpi.beforeText}`} href={kpi.href} onPress={() => go(kpi.href)} />
      <Meter label={kpi.label} value={kpi.afterFraction} figure={kpi.afterText} tone={kpi.direction === "down" ? "danger" : "accent"} marks={[{ id: "open", label: `Week opened at ${kpi.beforeText}`, at: kpi.beforeFraction, kind: "historical" }]} />
    </Column>
  );
}

function Readings({ view }: { readonly view: DigestView }) {
  return (
    <ReadingFrame title="The five readings across the week" unit="Each on its own scale" period={`Week ${view.digest.week}`} legend={beforeKey("Where the week opened")} pressHint="Press a reading to open its history." help={{ meaning: "Each bar is where a reading stood when the week closed. The tick is where it stood when the week opened, so the gap between them is what the week did to it." }}>
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 3 }} gap="xl">
        {view.kpis.map((kpi) => (
          <KpiMeter key={kpi.key} kpi={kpi} />
        ))}
      </CardGrid>
    </ReadingFrame>
  );
}

function MoverRow({ move }: { readonly move: StateMove }) {
  const up = move.delta > 0;
  return (
    <Pressable role="link" aria-label={`${move.name}, approval ${move.text}. Open the state`} href={move.href} onPress={() => go(move.href)} padding="xs" borderRadius="chip" minHeight={44} flexDirection="row" alignItems="center" gap="sm">
      <Text variant="caption" tone={up ? "success" : "danger"}>{up ? "▲" : "▼"}</Text>
      <Text variant="label" flex={1} numberOfLines={1}>{move.name}</Text>
      <Text variant="label" tone={up ? "success" : "danger"} tabular>{`${formatSignedPoints(move.delta)} points`}</Text>
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </Pressable>
  );
}

function States({ view }: { readonly view: DigestView }) {
  const { risers, fallers, scrolledOut } = view.digest;
  if (scrolledOut || (risers.length === 0 && fallers.length === 0)) {
    return <Text variant="body" tone="secondary">{scrolledOut ? "No state figures were kept for this week." : "No state's approval moved by a tenth of a point."}</Text>;
  }
  return (
    <Row gap="xl" top wrap>
      <Column flexGrow={1} flexShrink={1} flexBasis={280} minWidth={0} gap="xs" role="list" aria-label="States where approval rose most">
        <Text variant="body" weight="medium" role="heading" aria-level={3}>Rose most</Text>
        {risers.length === 0 ? <Text variant="caption" tone="secondary">No state rose.</Text> : risers.map((move) => <MoverRow key={move.id} move={move} />)}
      </Column>
      <Column flexGrow={1} flexShrink={1} flexBasis={280} minWidth={0} gap="xs" role="list" aria-label="States where approval fell most">
        <Text variant="body" weight="medium" role="heading" aria-level={3}>Fell most</Text>
        {fallers.length === 0 ? <Text variant="caption" tone="secondary">No state fell.</Text> : fallers.map((move) => <MoverRow key={move.id} move={move} />)}
      </Column>
    </Row>
  );
}

function Report({ view }: { readonly view: DigestView }) {
  const { digest } = view;
  return (
    <>
      <Section id="readings" icon="graph" title="Readings at the week's close" helper={digest.scrolledOut ? "This week's figures are older than the weekly record. Its entries and the wire are below." : "Where each reading closed, and where the week opened."}>
        {digest.scrolledOut ? null : <Readings view={view} />}
      </Section>
      <Section id="states" icon="flag" title="Where approval moved" helper="The states that rose and fell most, in points of approval.">
        <States view={view} />
      </Section>
      <Section id="acts" icon="decision" title="What you did" helper={`${digest.acts.length} recorded ${digest.acts.length === 1 ? "act" : "acts"}.`}>
        <ActGroups groups={view.acts} empty="You took no recorded act this week." />
      </Section>
      <Section id="world" icon="world" title="What the world did" helper={`${digest.world.length} recorded ${digest.world.length === 1 ? "entry" : "entries"}.`}>
        <ActGroups groups={view.world} empty="Nothing outside your office was recorded this week." />
      </Section>
      <Section id="wire" icon="press" title="What the wire filed" helper={`${digest.wire.length} ${digest.wire.length === 1 ? "story" : "stories"}.`}>
        <WireGroups groups={view.wire} empty="The wire filed nothing this week." />
      </Section>
    </>
  );
}

/** The weeks that have closed, newest first, one read at a time: its readings, the states that moved, what the President did, what the world did and what the wire filed. */
export function DigestScreen({ campaign, week, onWeek }: { readonly campaign: Campaign; readonly week: number | undefined; readonly onWeek: (week: number) => void }) {
  const state = useCampaignState();
  const weeks = digestWeeks(campaign);
  const open = week ?? weeks[0]?.week;
  const view = open === undefined ? undefined : digestView(campaign, open);
  const brief = state.status === "ready" && state.brief && !state.briefAcknowledged ? state.brief : undefined;
  const sentence = brief ? `Time moved ${spanWords(brief)}. ${stopWords(brief)}` : "";
  const eyebrow = view ? `Week ${view.digest.week} · ${formatDate(view.digest.from)} to ${formatDate(view.digest.to)}` : "Briefing history";
  return (
    <Page icon="notificationStack" eyebrow={eyebrow} title="Briefing history" lede={weeks.length === 0 ? "No week has closed yet." : `${weeks.length} ${weeks.length === 1 ? "week has" : "weeks have"} closed.`}>
      <Row><BackButton parent={place.brief()} parentLabel="Brief" /></Row>
      {view?.latest || !view ? <WhileTimeRan campaign={campaign} brief={brief} sentence={sentence} /> : null}
      {view ? (
        <>
          <Section id="weeks" icon="schedule" title="Closed weeks" helper="Weeks are numbered from the start of your term.">
            <WeekBars view={view} onPick={onWeek} />
          </Section>
          <Report view={view} />
        </>
      ) : (
        <Empty
          icon="emptyRecord"
          title={weeks.length === 0 ? (brief ? "This week is still open" : "No week has closed yet") : "That week is not in the record"}
          detail={weeks.length === 0 ? (brief ? "A weekly briefing is recorded when a week closes. Until then, this page shows the run you just made." : "A weekly briefing is recorded as each week closes. No week has closed yet.") : "Every week that has closed, by its number."}
          {...(weeks.length > 0 ? { action: { label: "Open the latest week", icon: "return" as const, onPress: () => onWeek(weeks[0]!.week) } } : {})}
        />
      )}
    </Page>
  );
}
