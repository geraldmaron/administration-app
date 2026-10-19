import { place, formatDate, formatSignedPoints, type DigestView } from "@admin/player-core";
import { Button, Column, Pressable, ReadingFrame, Row, Text, View, type KeyEntry } from "@admin/ui";

const WEEK_KEY: readonly KeyEntry[] = [
  { id: "rose", kind: "swatch", label: "Approval rose that week", ink: "successInk" },
  { id: "fell", kind: "swatch", label: "Approval fell that week", ink: "danger" },
  { id: "open", kind: "ring", label: "The week you're reading", ink: "accent" },
];

const HALF = 36;

function wordsOf(delta: number | undefined): string {
  if (delta === undefined) return "not tracked that far back";
  if (delta === 0) return "no change";
  return `approval ${delta > 0 ? "up" : "down"} ${formatSignedPoints(delta).replace(/^[+−-]/, "")} points`;
}

/** One week's bar: it rises from the line for a gain and drops from it for a loss, and a press reads that week. */
function Bar({ week, bar, onPick }: { readonly week: number; readonly bar: DigestView["bars"][number]; readonly onPick: (week: number) => void }) {
  const height = Math.max(bar.delta === undefined || bar.delta === 0 ? 2 : 4, Math.round(Math.abs(bar.share) * HALF));
  const rose = bar.share >= 0;
  return (
    <Pressable href={`${place.digest()}?week=${week}`} flex={1} minWidth={0} role="link" aria-label={`Week ${week}, ${formatDate(bar.from)}: ${wordsOf(bar.delta)}`} aria-current={bar.current ? "true" : undefined} onPress={() => onPick(week)} borderRadius="chip" borderWidth={2} borderColor={bar.current ? "accent" : "transparent"} alignItems="center">
      <View height={HALF} width="100%" justifyContent="flex-end" alignItems="center">
        {rose ? <View width="60%" height={height} backgroundColor="successInk" borderTopLeftRadius="chip" borderTopRightRadius="chip" /> : null}
      </View>
      <View height={1} width="100%" backgroundColor="borderColorStrong" />
      <View height={HALF} width="100%" alignItems="center">
        {rose ? null : <View width="60%" height={height} backgroundColor="danger" borderBottomLeftRadius="chip" borderBottomRightRadius="chip" />}
      </View>
      <Text variant="caption" tone={bar.current ? "primary" : "secondary"} weight={bar.current ? "strong" : "regular"} tabular>
        {week}
      </Text>
    </Pressable>
  );
}

/** The thirteen weeks around the one being read, drawn as approval's change in each, with steps to the older and newer week. */
export function WeekBars({ view, onPick }: { readonly view: DigestView; readonly onPick: (week: number) => void }) {
  return (
    <ReadingFrame title="Approval's change, week by week" unit="Points of approval gained or lost in the week" period={`Weeks ${view.bars[0]?.week ?? ""} to ${view.bars[view.bars.length - 1]?.week ?? ""}`} legend={WEEK_KEY} pressHint="Press a bar to read that week." help={{ meaning: "Each bar is one week. A bar above the line is a week your approval rose. A bar below it is a week it fell. The bars are scaled to the biggest week shown, so compare them with each other, not with other charts." }}>
      <Column gap="sm">
        <Row gap="2xs" alignItems="stretch">
          {view.bars.map((bar) => (
            <Bar key={bar.week} week={bar.week} bar={bar} onPick={onPick} />
          ))}
        </Row>
        <Row between gap="sm" wrap>
          {view.olderWeek !== undefined ? <Button kind="secondary" size="compact" icon="return" onPress={() => onPick(view.olderWeek!)}>{`Week ${view.olderWeek}`}</Button> : <View />}
          {view.newerWeek !== undefined ? <Button kind="secondary" size="compact" iconAfter="chevron" onPress={() => onPick(view.newerWeek!)}>{`Week ${view.newerWeek}`}</Button> : <View />}
        </Row>
      </Column>
    </ReadingFrame>
  );
}
