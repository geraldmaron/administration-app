import type { ReactNode } from "react";
import { Column, Row } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { Caps, Paper, Rule } from "../Paper";

// The Senate's Executive Calendar as the Secretary of the Senate prints it:
// the Senate and the calendar's name, the date, "Nominations", then each
// nomination numbered, the nominee in capitals, the office, and where it sits.

export type CalendarEntry = {
  readonly id: string;
  readonly name: string;
  /** "to be Secretary of the Treasury". */
  readonly office: string;
  /** "Referred to the Committee on Finance." */
  readonly status: string;
  /** The nominee's name as a door to the file, where the screen has one. */
  readonly door?: ReactNode;
};

export type CalendarPaperProps = {
  readonly seal?: ReactNode;
  /** "Tuesday, March 3, 2029", today's calendar. */
  readonly date: string;
  readonly entries: readonly CalendarEntry[];
};

export function CalendarPaper({ seal, date, entries }: CalendarPaperProps) {
  return (
    <Paper label={`Senate Executive Calendar, ${date}`}>
      <Column gap="xs" alignItems="center">
        {seal ?? null}
        <Caps size="caption" weight="strong">Senate of the United States</Caps>
        <Caps size="heading" weight="strong">Executive Calendar</Caps>
        <Text variant="caption" serif center>
          {date}
        </Text>
      </Column>
      <Rule double />
      <Caps size="caption" weight="strong">Nominations</Caps>
      {entries.map((entry, index) => (
        <Row key={entry.id} gap="md" top>
          <Text variant="document" serif width={28} aria-hidden>
            {`${index + 1}.`}
          </Text>
          <Column flex={1} gap="2xs" minWidth={0}>
            <Text variant="document">
              <Text variant="document" weight="strong">{entry.name.toUpperCase()}</Text>
              {`, ${entry.office}.`}
            </Text>
            <Text variant="caption" serif tone="secondary">
              {entry.status}
            </Text>
            {entry.door ?? null}
          </Column>
        </Row>
      ))}
    </Paper>
  );
}
