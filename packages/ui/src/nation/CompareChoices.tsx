import { useEffect, type ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Button } from "../primitives/Button";
import { ResultRow, ResultsList } from "../review/Results";
import { Surface } from "../primitives/Surface";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type ChoiceVerdict = { readonly text: string; readonly tone: "good" | "bad" | "neutral" };

export type ChoiceOptionView = {
  readonly id: string;
  readonly label: string;
  /** Why it cannot be authorized today, in the engine's words. */
  readonly unavailable?: string;
  readonly icon?: IconName;
  readonly verdict?: readonly ChoiceVerdict[];
};

export type ChoiceRowView = {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  /** What the option is in its own words, read before any figure. */
  readonly lead?: boolean;
  /** An option with no entry has no line: a row it does not touch is left out of its terms rather than drawn empty. */
  readonly cells: Readonly<Record<string, ReactNode>>;
};

export type CompareChoicesProps = {
  readonly title: string;
  readonly options: readonly ChoiceOptionView[];
  readonly rows: readonly ChoiceRowView[];
  /** The option picked, or none yet: not acting is approving nothing. */
  readonly selected: string | undefined;
  readonly onSelect: (id: string) => void;
  /** The one verb the act is taken by: "Sign the order". */
  readonly verb: string;
  readonly onAuthorize: () => void;
  /** What the selected act commits the President to, said before the press. */
  readonly review?: string;
  /** What happens on its own if nothing is approved, where that has a clock. Said beside the options, never as one. */
  readonly waiting?: string;
  readonly busy?: boolean;
  readonly danger?: boolean;
  /** Anything the screen adds under the comparison (a footnote, a projection). */
  readonly footnote?: ReactNode;
};

const VERDICT_INK = { good: "success", bad: "danger", neutral: "secondary" } as const;

function Verdict({ verdict }: { readonly verdict: readonly ChoiceVerdict[] | undefined }) {
  if (!verdict?.length) return null;
  return (
    <Column gap={2}>
      {verdict.map((entry) => (
        <Text key={entry.text} variant="caption" weight="strong" tone={VERDICT_INK[entry.tone]}>
          {entry.text}
        </Text>
      ))}
    </Column>
  );
}

/** The picked option read row by row: each line is its change from today. */
function Terms({ rows, option }: { readonly rows: readonly ChoiceRowView[]; readonly option: ChoiceOptionView }) {
  return (
    <Column gap="xs" role="table" aria-label={`${option.label}, what it changes`}>
      {rows.filter((row) => row.cells[option.id] !== undefined).map((row) => (
        <Row key={row.id} role="row" gap="md" top wrap paddingVertical="2xs" borderTopWidth={1} borderTopColor="borderColor">
          <Row gap="xs" top width={200} minWidth={160} role="rowheader">
            {row.icon ? <Icon name={row.icon} size={16} tone="colorSecondary" /> : null}
            <Text variant="caption" weight="strong" tone="secondary" flex={1}>
              {row.label}
            </Text>
          </Row>
          <View flex={1} minWidth={200} role="cell">
            {typeof row.cells[option.id] === "string" ? <Text variant="caption">{row.cells[option.id]}</Text> : (row.cells[option.id] ?? null)}
          </View>
        </Row>
      ))}
    </Column>
  );
}

/**
 * The one compare-and-authorize pattern for the nation desks (DECISIONS
 * §8.13): every option as a row of a results list, its verdict drawn as its
 * change from today, the picked one read line by line, its terms said in a
 * sentence, and one verb. There is no row for doing nothing. The verb is never
 * pressable before an option is picked or on one the engine withholds; the
 * withheld one stays visible with its reason.
 */
export function CompareChoices({ title, options, rows, selected, onSelect, verb, onAuthorize, review, waiting, busy, danger, footnote }: CompareChoicesProps) {
  const media = useMedia();
  const sole = options.length === 1 && !options[0]!.unavailable ? options[0]!.id : undefined;
  // A lone open option is picked for the President, since a press that only picks it would be a step that decides nothing.
  useEffect(() => {
    if (selected === undefined && sole !== undefined) onSelect(sole);
  }, [selected, sole, onSelect]);
  const chosen = options.find((option) => option.id === selected);
  const blocked = !chosen || chosen.unavailable !== undefined || busy === true;
  const sentence = chosen ? (chosen.unavailable ?? review) : options.every((option) => option.unavailable) ? "Nothing here can be approved yet. Each option says what it waits on." : "No option picked yet. Each one shows what it changes before anything is approved.";
  return (
    <Surface pad="lg" role="region" aria-label={title}>
      <Column gap="md">
        <Text variant="title" role="heading" aria-level={2}>
          {title}
        </Text>
        {waiting ? (
          <Row gap="xs" top role="note">
            <Icon name="schedule" size={16} tone="colorSecondary" />
            <Text variant="caption" tone="secondary" flex={1}>
              {waiting}
            </Text>
          </Row>
        ) : null}
        <ResultsList label={`Options: ${title}`}>
          {options.map((option) => (
            <ResultRow
              key={option.id}
              label={option.label}
              icon={option.unavailable ? "locked" : (option.icon ?? "order")}
              {...(option.unavailable ? { note: "Locked. You can still read it." } : {})}
              readings={{ move: <Verdict verdict={option.verdict} /> }}
              selected={option.id === selected}
              onPress={() => onSelect(option.id)}
              pressLabel={option.label}
              below={
                <Column gap="sm">
                  {option.unavailable ? <Text variant="caption" tone="warning">{option.unavailable}</Text> : null}
                  {option.id === selected && rows.length > 0 ? <Terms rows={rows} option={option} /> : null}
                </Column>
              }
            />
          ))}
        </ResultsList>
        {footnote}
        <Surface level="sunken" pad="md">
          <Column gap="sm">
            {sentence ? (
              <Text variant="body" aria-live="polite">
                {sentence}
              </Text>
            ) : null}
            <Button kind={danger ? "danger" : "primary"} size="large" icon="sign" disabled={blocked} onPress={onAuthorize} block={media.phone}>
              {busy ? "Working…" : verb}
            </Button>
          </Column>
        </Surface>
      </Column>
    </Surface>
  );
}
