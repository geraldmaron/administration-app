import { Meter } from "../data/Meter";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type DeadlineProps = {
  /** What is due, or how old a standing matter is when it has no countdown. */
  readonly label: string;
  /** A game date, never wall time. */
  readonly date?: string;
  readonly left?: number;
  /** The whole window, in the same unit as `left`; with it the bar shows how much is used. */
  readonly total?: number;
  readonly unit?: "day" | "week";
  /** What waiting costs. */
  readonly cost?: string;
};

/** Under a quarter of the window left is short; a window with nothing left is short too. */
export function isShort(left: number | undefined, total: number | undefined): boolean {
  return left !== undefined && total !== undefined && total > 0 && left / total < 0.25;
}

const plural = (unit: string, count: number) => `${unit}${count === 1 ? "" : "s"}`;

/** A game date, how long is left, the share of the window used, and what waiting costs. */
export function Deadline({ label, date, left, total, unit = "day", cost }: DeadlineProps) {
  const short = isShort(left, total);
  const used = left !== undefined && total !== undefined && total > 0 ? Math.min(1, Math.max(0, 1 - left / total)) : undefined;
  return (
    <Column gap="xs" role="group" aria-label={`Deadline: ${label}`}>
      <Row gap="sm" top>
        {left !== undefined ? (
          <Row gap="xs" alignItems="baseline">
            <Text variant="title" tone={short ? "warning" : "primary"} tabular>
              {left}
            </Text>
            <Text variant="caption" tone="secondary">
              {`${plural(unit, left)} left`}
            </Text>
          </Row>
        ) : null}
        <Column flex={1} minWidth={0} gap="2xs">
          <Text variant="label">{label}</Text>
          {date || cost ? (
            <Text variant="caption" tone="secondary">
              {[date, cost].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </Column>
      </Row>
      {used !== undefined && total !== undefined && left !== undefined ? <Meter label="Window used" value={used} figure={`${total - left} of ${total} ${plural(unit, total)}`} tone={short ? "warningInk" : "accent"} /> : null}
    </Column>
  );
}
