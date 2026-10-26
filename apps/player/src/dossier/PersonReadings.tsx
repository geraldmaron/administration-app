import { useState } from "react";
import type { PersonReading } from "@admin/player-core";
import { Column, Icon, Pressable, Row, Sheet, Text, View, type IconName } from "@admin/ui";
import { BandSteps } from "@admin/ui/dossier";
import { readingTone } from "../executive/present";
import { Fitted } from "./parts";

const CONFIDENCE = { low: "Staff aren't sure", moderate: "Staff are fairly sure", high: "Staff are sure" } as const;

/** What each quality means, in one plain line, for a reader meeting the word for the first time. */
const MEANING: Readonly<Record<string, string>> = {
  competence: "Competence is how good they are at their job.",
  loyalty: "Loyalty is how firmly they stand with you.",
  integrity: "Integrity is how honest they are and how closely they keep to their principles.",
  charisma: "Charisma is how well they win people over.",
  ambition: "Ambition is how much they want power of their own. It isn't good or bad. Once it passes a certain mark, someone who breaks with you starts a rival group instead of quitting.",
};

/** The mark each reading is drawn with. */
export const READING_MARK: Readonly<Record<string, IconName>> = { competence: "graph", loyalty: "shield", integrity: "law", charisma: "microphone", ambition: "escalate" };

/** Every reading on one row where the width allows it, else three, else two, so a row never holds a tile too narrow for its words. */
const readingColumns = (width: number) => (width >= 1040 ? 6 : width >= 540 ? 3 : 2);

/** Ambition is pressure toward a mark, so it has no confidence to state; the others say how sure the staff is in words. */
function confidenceWords(reading: PersonReading): string | undefined {
  if (reading.kind === "pressure") return "Shows risk, not skill";
  return reading.confidence ? CONFIDENCE[reading.confidence] : undefined;
}

function Trend({ reading }: { readonly reading: PersonReading }) {
  if (!reading.trend) return null;
  return (
    <Row gap="xs" top>
      <Icon name={reading.trend === "rising" ? "favorable" : "adverse"} size={14} tone={reading.trend === "rising" ? "successInk" : "danger"} />
      <Text variant="caption" flex={1}>
        {reading.trendText}
      </Text>
    </Row>
  );
}

function PersonReadingRow({ reading, onOpen }: { readonly reading: PersonReading; readonly onOpen: () => void }) {
  const confidence = confidenceWords(reading);
  return (
    <Pressable onPress={onOpen} aria-label={[`${reading.label}: ${reading.word}`, confidence, "Open details about this reading"].filter(Boolean).join(". ")} padding="md" borderRadius="card" borderWidth={1} borderColor="borderColor" backgroundColor={{ default: "surfaceRaised", hover: "surfaceHover" }} gap="sm" flexGrow={1}>
      <Row gap="xs">
        <Icon name={READING_MARK[reading.key] ?? "layerReading"} size={18} tone="gold" />
        <Text variant="label" tone="secondary" flex={1} numberOfLines={1}>
          {reading.label}
        </Text>
      </Row>
      <BandSteps label={reading.label} labelHidden lit={reading.band + 1} word={reading.word} tone={readingTone(reading)} />
      {confidence ? (
        <Text variant="caption" tone="secondary">
          {confidence}
        </Text>
      ) : null}
      <Trend reading={reading} />
      <View flexGrow={1} />
      <Row gap="xs">
        <Icon name="info" size={14} tone="accent" />
        <Text variant="caption" tone="accent" weight="medium">
          About this reading
        </Text>
      </Row>
    </Pressable>
  );
}

function Evidence({ reading }: { readonly reading: PersonReading }) {
  const confidence = confidenceWords(reading);
  return (
    <Column gap="md">
      {MEANING[reading.key] ? <Text variant="body">{MEANING[reading.key]}</Text> : null}
      <Text variant="body" tone="secondary">
        This is your staff's best guess, shown as a step on a meter instead of a number. It isn't a measured fact. When staff aren't sure, the guess is more likely to be wrong, so watch what this person actually does.
      </Text>
      <BandSteps label={reading.label} lit={reading.band + 1} word={reading.word} tone={readingTone(reading)} />
      {confidence ? <Text variant="label">{confidence}</Text> : null}
      <Column gap="2xs">
        <Text variant="eyebrow" tone="secondary">
          What it means for you
        </Text>
        <Text variant="body">{reading.consequence}</Text>
      </Column>
      {reading.basis ? (
        <Column gap="2xs">
          <Text variant="eyebrow" tone="secondary">
            What staff base it on
          </Text>
          <Text variant="body">{reading.basis}</Text>
        </Column>
      ) : null}
      {reading.trendText ? <Text variant="body">{reading.trendText}</Text> : null}
    </Column>
  );
}

/**
 * The readings on a person as discrete bands in one grid of equal tiles: the
 * word on a four-step meter, how sure the read is, which way it has gone
 * since they were seated, and a door to the evidence. Ambition is drawn as
 * pressure toward a mark, never graded.
 */
export function PersonReadings({ readings }: { readonly readings: readonly PersonReading[] }) {
  const [selected, setSelected] = useState<PersonReading | undefined>(undefined);
  return (
    <>
      <Fitted count={readings.length} columnsFor={readingColumns} label="Staff readings">
        {readings.map((reading) => (
          <PersonReadingRow key={reading.key} reading={reading} onOpen={() => setSelected(reading)} />
        ))}
      </Fitted>
      <Sheet open={selected !== undefined} onClose={() => setSelected(undefined)} title={selected ? selected.label : "About this reading"} eyebrow="About this reading">
        {selected ? <Evidence reading={selected} /> : null}
      </Sheet>
    </>
  );
}
