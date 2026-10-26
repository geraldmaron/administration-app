import { useEffect, useRef, useState } from "react";
import { formatDate, type MatterClock } from "@admin/player-core";
import { Button, Column, Icon, Meter, PressRow, ReadingFrame, Row, Section, Surface, Text, type PressRowProps } from "@admin/ui";
import { go } from "../shell/navigate";

export { go };


/**
 * A line in a list that opens one thing: the whole line is the press target,
 * with a chevron at its end, and Enter or Space opens it from the keyboard.
 * A button placed inside it still does its own job.
 */
export function RowLink({ label, onPress, children, ...rest }: PressRowProps) {
  return (
    <PressRow label={label} onPress={onPress} padding="xs" borderRadius="chip" minHeight={44} flexDirection="row" alignItems="center" gap="sm" {...rest}>
      <Row gap="sm" flexGrow={1} flexShrink={1} flexBasis={0} minWidth={0} wrap>
        {children}
      </Row>
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </PressRow>
  );
}

const unitWords = (count: number, unit: "day" | "week"): string => `${count} ${unit}${count === 1 ? "" : "s"}`;

export const DEADLINE_KEY = [
  { id: "left", kind: "swatch", label: "More than half the time left", ink: "accent" },
  { id: "half", kind: "swatch", label: "Half or less left", ink: "warningInk" },
  { id: "quarter", kind: "swatch", label: "A quarter or less left", ink: "danger" },
] as const;

/** A running window as a meter that empties: what is left of it, and the date it closes. */
export function ClockReading({ clock }: { readonly clock: MatterClock }) {
  const left = Math.max(0, clock.left);
  const tone = left <= clock.window * 0.25 ? "danger" : left <= clock.window * 0.5 ? "warningInk" : "accent";
  return (
    <ReadingFrame title="Time left on this deadline" unit={`${clock.unit}s of ${clock.window}`} legend={DEADLINE_KEY} help={{ meaning: "The bar is the part of the allowed time that is still left. It empties as the due date comes closer, and its color changes when half and then a quarter of the time remains." }}>
      <Meter label={clock.label} value={clock.window > 0 ? left / clock.window : 0} figure={`${unitWords(left, clock.unit)} of ${clock.window} left`} tone={tone} />
      {clock.due ? (
        <Text variant="caption" tone="secondary">{`Due ${formatDate(clock.due)}`}</Text>
      ) : null}
    </ReadingFrame>
  );
}

/** No rule sets a deadline: said in words, with whether the matter holds time while it waits. */
export function OpenEnded({ holds, note }: { readonly holds: boolean; readonly note: string }) {
  return (
    <Row gap="xs" top>
      <Icon name={holds ? "paused" : "schedule"} size={16} tone="colorSecondary" />
      <Text variant="body" tone="secondary" flex={1}>
        {holds ? `${note}. Time stays paused until you deal with it.` : note}
      </Text>
    </Row>
  );
}

export type HistoryEvent = { readonly key: string; readonly when?: string; readonly text: string };

/** What happened to an obligation, oldest first, six at a time with the rest a press away. */
export function History({ events, empty }: { readonly events: readonly HistoryEvent[]; readonly empty: string }) {
  const [shown, setShown] = useState(6);
  return (
    <Section icon="archive" title="History">
      {events.length === 0 ? (
        <Text variant="body" tone="secondary">
          {empty}
        </Text>
      ) : (
        <Column gap="sm" role="list">
          {events.slice(0, shown).map((event) => (
            <Column key={event.key} role="listitem" gap="2xs" borderLeftWidth={2} borderLeftColor="borderColorStrong" paddingLeft="md" paddingVertical="xs">
              {event.when ? (
                <Text variant="caption" weight="strong" tone="secondary">
                  {event.when}
                </Text>
              ) : null}
              <Text variant="body">{event.text}</Text>
            </Column>
          ))}
          {events.length > shown ? (
            <Button kind="quiet" size="compact" icon="expandPanel" onPress={() => setShown(events.length)}>
              {`Show all ${events.length} entries`}
            </Button>
          ) : null}
        </Column>
      )}
    </Section>
  );
}

/** A refusal or a failure the screen must say aloud. */
export function Problem({ words }: { readonly words: string }) {
  if (!words) return null;
  return (
    <Surface level="raised" pad="md" accentEdge="danger" role="alert">
      <Row gap="sm" top>
        <Icon name="caution" size={20} tone="danger" />
        <Text variant="body" flex={1}>
          {words}
        </Text>
      </Row>
    </Surface>
  );
}

// Long enough for a save to hand back its result; past it, a decision that left the desk left it some other way.
const CARRYING_OUT_MS = 5000;

/** True for a moment after a decision this page held leaves the desk, while its result is on the way. */
export function useCarryingOut(present: boolean): boolean {
  const held = useRef(false);
  const [expired, setExpired] = useState(false);
  if (present) held.current = true;
  const waiting = held.current && !present;
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setExpired(true), CARRYING_OUT_MS);
    return () => clearTimeout(timer);
  }, [waiting]);
  return waiting && !expired;
}
