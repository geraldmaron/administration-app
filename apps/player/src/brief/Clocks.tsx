import { daysBetween, type Campaign } from "@admin/engine";
import { formatDate, pendingHref, runningClocks, stopLines, type StopBrief } from "@admin/player-core";
import { Card, Column, Empty, Icon, Meter, PressRow, ReadingFrame, Row, Surface, Text, View } from "@admin/ui";
import { DEADLINE_KEY } from "../decision/parts";
import { go } from "../shell/navigate";

const unitWord = (unit: "day" | "week", count: number): string => `${unit}${count === 1 ? "" : "s"}`;

/** One running clock: its name, the time left, and the bar that empties toward its due date. */
function ClockRow({ campaign, clock }: { readonly campaign: Campaign; readonly clock: ReturnType<typeof runningClocks>[number] }) {
  const unit = clock.window?.unit ?? "day";
  const left = clock.window ? Math.max(0, clock.window.length - clock.window.consumed) : clock.due ? daysBetween(campaign.calendar, clock.due) : undefined;
  const tone = clock.urgency === "due" ? "danger" : clock.urgency === "closing" ? "warningInk" : "accent";
  return (
    <PressRow label={`Open the deadline, ${clock.title}`} href={clock.href} onPress={() => go(clock.href)} padding="xs" borderRadius="chip" gap="xs">
      <Row between gap="sm" top>
        <Text variant="label" flex={1} numberOfLines={2}>
          {clock.title}
        </Text>
        {left !== undefined && left >= 0 ? (
          <Column alignItems="flex-end">
            <Text variant="title" tone={clock.urgency === "due" ? "danger" : clock.urgency === "closing" ? "warning" : "secondary"} tabular>
              {left}
            </Text>
            <Text variant="caption" tone="secondary">{`${unitWord(unit, left)} left`}</Text>
          </Column>
        ) : null}
      </Row>
      {clock.window && left !== undefined ? <Meter label="Time left" value={clock.window.length > 0 ? left / clock.window.length : 0} figure={`Day ${clock.window.consumed} of ${clock.window.length}`} tone={tone} /> : null}
      <Text variant="caption" tone="secondary" numberOfLines={2}>
        {clock.due ? `${formatDate(clock.due)} · ` : ""}
        {clock.line}
      </Text>
    </PressRow>
  );
}

/** Clocks a rule is running: days left on a window, or the date it falls due; one quiet line when none is counting down. */
export function RunningClocks({ campaign, quietNote }: { readonly campaign: Campaign; readonly quietNote?: string }) {
  const all = runningClocks(campaign);
  // A clock with no date and no window is a standing check reporting that nothing is pending; the Brief counts those rather than listing them.
  const clocks = all.filter((clock) => clock.due !== undefined || clock.window !== undefined);
  const quiet = all.length - clocks.length;
  if (clocks.length === 0) {
    return (
      <Card title="Deadlines" icon="pending">
        <Empty icon="pending" title="No legal deadlines are counting down" detail={[quietNote, quiet > 0 ? `${quiet} regular ${quiet === 1 ? "check finds" : "checks find"} nothing due.` : "A deadline appears here when a law or an order starts a clock."].filter(Boolean).join(" ")} />
      </Card>
    );
  }
  const rows = (
    <Column gap="md">
      {clocks.map((clock) => (
        <ClockRow key={clock.id} campaign={campaign} clock={clock} />
      ))}
    </Column>
  );
  const list = clocks.some((clock) => clock.window) ? (
    <ReadingFrame title="Time left on each deadline" unit="Days or weeks of the allowed time" legend={DEADLINE_KEY} help={{ meaning: "Each bar is the part of the allowed time that is still left. It empties as the due date comes closer, and its color changes when half and then a quarter of the time remains.", steps: ["Read the words on the bar. They give the day you are on and how many are left.", "Press a deadline to see what you owe and what happens if you don't answer."] }} pressHint="Press a deadline to open it.">
      {rows}
    </ReadingFrame>
  ) : (
    rows
  );
  return (
    <Card title="Deadlines" icon="pending" helper={quiet > 0 ? `${quiet} regular ${quiet === 1 ? "check finds" : "checks find"} nothing due.` : undefined}>
      {list}
    </Card>
  );
}

/** How far the last run took the country and what stopped it, until the next press. */
export function WhileTimeRan({ campaign, brief, sentence }: { readonly campaign: Campaign; readonly brief: StopBrief | undefined; readonly sentence: string }) {
  if (!sentence) return null;
  // Each line opens the card it stopped for, so the stop is a way in rather than a list to go looking for.
  const lines = brief ? stopLines(brief, (id) => pendingHref(campaign, id)) : [];
  return (
    <Surface level="raised" pad="lg" accentEdge="gold" role="status">
      <Column gap="sm">
        <Text variant="eyebrow" tone="gold">
          While time ran
        </Text>
        <Text variant="body">{sentence}</Text>
        {lines.map((line) => {
          const row = (
            <Row gap="sm">
              <Icon name={line.urgency === "hard" ? "escalate" : "pending"} size={16} tone={line.urgency === "hard" ? "danger" : "colorSecondary"} />
              <Column flex={1} minWidth={0}>
                <Text variant="label" weight="regular">
                  {line.title}
                </Text>
                {line.reason ? (
                  <Text variant="caption" tone="secondary">
                    {line.reason}
                  </Text>
                ) : null}
              </Column>
              {line.href ? <Icon name="chevron" size={16} tone="colorTertiary" /> : null}
            </Row>
          );
          return line.href ? (
            <PressRow key={line.id} label={`Open ${line.title}`} href={line.href!} onPress={() => go(line.href!)} padding="xs" borderRadius="chip">
              {row}
            </PressRow>
          ) : (
            <View key={line.id} padding="xs">
              {row}
            </View>
          );
        })}
      </Column>
    </Surface>
  );
}
