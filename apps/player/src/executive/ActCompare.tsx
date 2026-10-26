import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { pricedRows, type PricedOption } from "@admin/player-core";
import { Button, Column, LegalCitation, Row, Surface, Text } from "@admin/ui";
import { MoneyBar, ResultRow, ResultsList, Waiting, moneyScale, type ResultReadings } from "@admin/ui/review";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { actCitation, cellWords, type ActLaw } from "./present";

export type ActCompareProps = {
  readonly campaign: Campaign;
  readonly title: string;
  /** Each act, priced by the engine's own projection. */
  readonly options: readonly PricedOption[];
  /** The named verb for each act option, by id. */
  readonly verbs: Readonly<Record<string, string>>;
  readonly onAuthorize: (id: string) => void;
  /** What happens on its own if nothing is approved, where that has a clock. */
  readonly waiting?: string;
  readonly busy: boolean;
  readonly danger?: boolean;
  /** The law the act rests on, shown with the terms. */
  readonly law?: ActLaw;
};

const TONE = { good: "success", bad: "danger", neutral: "primary" } as const;

function Terms({ campaign, options, index }: { readonly campaign: Campaign; readonly options: readonly PricedOption[]; readonly index: number }) {
  const rows = pricedRows(campaign, options);
  return (
    <Column gap="xs" maxWidth={720}>
      {rows.map((row) => {
        const words = cellWords(row.cells[index]);
        return (
          <Row key={row.id} gap="md" between top wrap>
            <Text variant="caption" tone="secondary" minWidth={120}>
              {row.label}
            </Text>
            <Text variant="label" tone={TONE[words.tone]} flex={1} textAlign="right" minWidth={160}>
              {words.text}
            </Text>
          </Row>
        );
      })}
    </Column>
  );
}

const MONEY_ROW = "effect:treasury";

/** A row's slots: the money it spends from $0, and the first other reading it moves, in that move's ink. */
function slots(rows: ReturnType<typeof pricedRows>, index: number, scale: number): ResultReadings {
  const money = rows.find((row) => row.id === MONEY_ROW)?.cells[index];
  const moved = rows.find((row) => row.id !== MONEY_ROW && row.id !== "follows" && row.cells[index]?.kind === "impact");
  const amount = money?.kind === "money" ? money.amount : 0;
  const words = moved ? cellWords(moved.cells[index]) : undefined;
  return {
    money: <MoneyBar now={Math.max(0, -amount)} scale={scale} text={amount === 0 ? "No money" : cellWords(money).text} {...(amount > 0 ? { incoming: true } : {})} />,
    move: words ? <Text variant="caption" weight="strong" tone={TONE[words.tone]} numberOfLines={2}>{`${moved!.label}: ${words.text}`}</Text> : <Text variant="caption" tone="tertiary">No reading moves</Text>,
  };
}

/**
 * An act on a chair as a results list (DECISIONS §8.13): each option a row
 * drawn as its change from today, the picked one's terms and the law it rests
 * on, then its named verb. Nothing is picked to begin with, and there is no
 * row for doing nothing; a wait with a clock is the `waiting` line.
 */
export function ActCompare({ campaign, title, options, verbs, onAuthorize, waiting, busy, danger, law }: ActCompareProps) {
  const openLaw = useOpenAuthority();
  // A lone open option starts picked: a press that only picks it would be a step that decides nothing.
  const [selected, setSelected] = useState<string | undefined>(options.length === 1 && !options[0]!.unavailable ? options[0]!.id : undefined);
  const picked = options.find((option) => option.id === selected);
  const rows = pricedRows(campaign, options);
  const scale = moneyScale(options.map((option) => ({ now: Math.max(0, -(option.price?.cost.treasury ?? 0)) })));
  const citation = law ? actCitation(law) : undefined;
  const closed = !picked || picked.unavailable !== undefined;
  return (
    <Surface level="raised" pad="md" accentEdge={danger ? "danger" : "accent"} role="region" aria-label={title}>
      <Column gap="md">
        <Row gap="sm" between wrap>
          <Text variant="label" role="heading" aria-level={3} flex={1} minWidth={200}>
            {title}
          </Text>
          {citation ? <LegalCitation citation={citation} onPress={() => openLaw(citation.cite)} /> : null}
        </Row>
        {waiting ? <Waiting text={waiting} /> : null}
        <ResultsList label={title}>
          {options.map((option, index) => (
            <ResultRow
              key={option.id}
              label={option.label}
              icon={option.unavailable ? "locked" : "decision"}
              {...(option.unavailable ? { note: "Locked. You can still read it." } : {})}
              readings={option.unavailable ? {} : slots(rows, index, scale)}
              selected={option.id === selected}
              onPress={() => setSelected(option.id)}
              pressLabel={option.label}
              below={
                <Column gap="sm">
                  {option.unavailable ? <Text variant="caption" tone="warning">{`Not available right now. ${option.unavailable}`}</Text> : null}
                  {option.id === selected ? <Terms campaign={campaign} options={options} index={index} /> : null}
                </Column>
              }
            />
          ))}
        </ResultsList>
        <Text variant="caption" tone="secondary" aria-live="polite">
          {picked ? (picked.unavailable ? `Not available right now. ${picked.unavailable}` : "What you do and what it costs go on your Record.") : options.every((option) => option.unavailable) ? "Nothing here can be approved yet. Each option says what it waits on." : "No option is picked yet."}
        </Text>
        <Row>
          <Button kind={danger ? "danger" : "primary"} icon="review" disabled={closed || busy} onPress={() => picked && onAuthorize(picked.id)}>
            {(picked && verbs[picked.id]) ?? Object.values(verbs)[0] ?? "Authorize"}
          </Button>
        </Row>
      </Column>
    </Surface>
  );
}
