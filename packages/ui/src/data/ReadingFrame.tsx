import { useState, type ReactNode } from "react";
import { useMedia } from "@tamagui/core";
import { Button } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { HelpButton, type HelpContent } from "../context/HelpSheet";
import { Icon } from "../icons/Icon";
import { Key } from "./Key";
import type { KeyEntry } from "./key-entries";

/**
 * How to read a drawing: what it shows in plain words, the steps of reading
 * it, the law behind it where a power is involved, and a door to the
 * Handbook's term. The door is handed in, because the design system never
 * routes.
 */
export type ReadingHelp = {
  readonly meaning: string;
  readonly steps?: readonly string[];
  readonly law?: HelpContent["law"];
  readonly term?: { readonly label: string; readonly onOpen: () => void };
};

export type ReadingHeadProps = {
  /** What the drawing measures, in words a President would use. */
  readonly title: string;
  /** The unit and what it is a share of: "% of adults", "seats of 435". */
  readonly unit?: string;
  /** The stretch of time it covers: "Last 12 weeks", "This term". */
  readonly period?: string;
  readonly help?: ReadingHelp;
  /** 3 for a reading inside a panel, 2 for one that stands as its own section, "label" under a card whose title already heads it. */
  readonly level?: 2 | 3 | "label";
  /** A control at the head's end: the chart/table switch. */
  readonly toggle?: ReactNode;
  /** A control beside the toggle that opens the same reading set against others. */
  readonly door?: ReactNode;
};

function helpContent(title: string, help: ReadingHelp): HelpContent {
  return {
    title,
    meaning: help.meaning,
    ...(help.steps ? { steps: help.steps } : {}),
    ...(help.law ? { law: help.law } : {}),
    ...(help.term
      ? {
          related: (
            <Button kind="secondary" size="compact" icon="glossary" onPress={help.term.onOpen}>
              {`Look up “${help.term.label}” in the Handbook`}
            </Button>
          ),
        }
      : {}),
  };
}

/** The head every drawn reading shares: its title, unit and period, and its "How to read this". */
export function ReadingHead({ title, unit, period, help, level = 3, toggle, door }: ReadingHeadProps) {
  const scale = [unit, period].filter((part): part is string => !!part).join(" · ");
  const media = useMedia();
  const heading = level === "label" ? {} : ({ role: "heading", "aria-level": level } as const);
  return (
    <Column gap="2xs">
      {/* The title wraps inside its own column so the help stays at the head's end instead of dropping to a line of its own in a narrow card. */}
      <Row between gap="xs" top wrap>
        <Text variant="body" weight="medium" {...heading} flexShrink={1} flexGrow={1} minWidth={110}>
          {title}
        </Text>
        <Row gap="2xs" flexShrink={0}>
          {help ? <HelpButton content={helpContent(title, help)} label={`How to read ${title}`} {...(media.phone ? {} : { text: "How to read this" })} /> : null}
          {door}
          {toggle}
        </Row>
      </Row>
      {scale ? (
        <Text variant="caption" tone="tertiary">
          {scale}
        </Text>
      ) : null}
    </Column>
  );
}

/** The line that says a drawing's marks can be pressed, and what a press opens. */
export function PressHint({ children }: { readonly children: string }) {
  return (
    <Row gap="xs">
      <Icon name="tap" size={16} tone="colorSecondary" />
      <Text variant="caption" tone="secondary" flexShrink={1}>
        {children}
      </Text>
    </Row>
  );
}

export type ReadingFrameProps = ReadingHeadProps & {
  readonly children: ReactNode;
  /** Every encoding the drawing uses: fills, lines, dashes, dots, ticks, rings, shapes. */
  readonly legend?: readonly KeyEntry[];
  /** "Press a seat to open the member": given whenever the marks are doors. */
  readonly pressHint?: string;
  /** The same figures as a table; given, the head carries a Chart/Table switch. */
  readonly table?: ReactNode;
};

/**
 * Every chart, gauge, meter and drawn reading in the player sits in one of
 * these: what it measures with its unit and period, the drawing, a key for
 * every encoding it uses, how to read it, and whether its marks can be
 * pressed. Spacing and type come from the theme, so every reading on every
 * screen reads the same way.
 */
export function ReadingFrame({ children, legend, pressHint, table, ...head }: ReadingFrameProps) {
  const [asTable, setAsTable] = useState(false);
  const toggle = table ? (
    <Button kind="quiet" size="compact" icon={asTable ? "graph" : "ballot"} onPress={() => setAsTable(!asTable)}>
      {asTable ? "Chart" : "Table"}
    </Button>
  ) : undefined;
  return (
    <Column gap="sm" role="group" aria-label={head.title}>
      <ReadingHead {...head} toggle={toggle} />
      {asTable ? table : children}
      {!asTable && legend?.length ? <Key entries={legend} label={`Key: ${head.title}`} /> : null}
      {!asTable && pressHint ? <PressHint>{pressHint}</PressHint> : null}
    </Column>
  );
}
