import { useState, type ReactNode } from "react";
import type { EffectPacket } from "@admin/engine";
import { authorityByCite, type ActCell, type ActColumn, type ActComparison, type MetricStance } from "@admin/player-core";
import { Button, Column, LegalCitation, Row, Text } from "@admin/ui";
import { ResultRow, ResultsList, Waiting, outcomeReadings, outcomeScales } from "@admin/ui/review";
import { ActResult } from "../executive/ActReceipt";
import { useOpenAuthority } from "../law/AuthorityProvider";
import type { ActCommit, Committed } from "./commit";

export const STANCE_TONE: Readonly<Record<MetricStance, "success" | "danger" | "warning" | "primary">> = { favorable: "success", adverse: "danger", caution: "warning", neutral: "primary" };

/** The law an act rests on, as a chip that opens it. */
export function Authority({ cite, compact }: { readonly cite: string; readonly compact?: boolean }) {
  const open = useOpenAuthority();
  const record = authorityByCite(cite);
  return <LegalCitation citation={{ cite, title: record?.shortTitle ?? record?.title ?? cite }} onPress={() => open(cite)} compact={compact} />;
}

function Cell({ cell }: { readonly cell: ActCell | undefined }) {
  if (!cell || cell.lines.length === 0) return <Text variant="caption" tone="tertiary">Doesn't apply</Text>;
  return <Text variant="caption" tone={cell.stance ? STANCE_TONE[cell.stance] : "primary"}>{cell.lines.filter(Boolean).join(". ")}</Text>;
}

/** What the act did, said where it was taken: one result with its moved readings, Record entry and next waiting matter, and the way back to the list it came from. */
export function ChooserReceipt({ committed, again, onAgain }: { readonly committed: Committed; readonly again: string; readonly onAgain: () => void }) {
  return (
    <ActResult
      done={committed}
      back={
        <Button kind="quiet" icon="return" onPress={onAgain}>
          {again}
        </Button>
      }
    />
  );
}

/** The picked option read row by row, each line its change from today. */
function Terms({ comparison, column }: { readonly comparison: ActComparison; readonly column: ActColumn }) {
  return (
    <Column gap="xs" role="table" aria-label={`${column.label}, what it changes`}>
      {comparison.rows.map((row) => (
        <Row key={row.key} role="row" gap="md" top wrap paddingTop="2xs" borderTopWidth={1} borderTopColor="borderColor">
          <Text variant="caption" weight="strong" tone="secondary" width={180} minWidth={140} role="rowheader">{row.label}</Text>
          <Column flex={1} minWidth={200} role="cell">
            <Cell cell={column.cells[row.key]} />
          </Column>
        </Row>
      ))}
    </Column>
  );
}

export type ActChooserProps = {
  /** Which block this is, so its receipt and problem come back to it. */
  readonly id: string;
  readonly title: string;
  readonly comparison: ActComparison;
  readonly acts: ActCommit;
  /** The citation the act rests on (DECISIONS §8.12). */
  readonly authority: string;
  readonly packet: (option: string) => EffectPacket | readonly EffectPacket[];
  readonly again: string;
  readonly onAgain?: () => void;
  readonly danger?: boolean | ((option: string) => boolean);
  /** What the picked option still needs before its verb is live. */
  readonly pending?: (option: string) => string | undefined;
  readonly terms?: ReactNode;
  readonly receiptTitle?: (column: ActColumn) => string;
};

/**
 * An act as a results list (DECISIONS §8.13): every option a row, the picked
 * one read line by line as its change from today, the engine's own refusal in
 * place of the verb where it is not open, and one named verb that opens the
 * review. Nothing is picked to begin with; not acting approves nothing.
 */
export function ActChooser({ id, title, comparison, acts, authority, packet, again, onAgain, danger, pending, terms, receiptTitle }: ActChooserProps) {
  // A lone open option starts picked: a press that only picks it would be a step that decides nothing.
  const sole = comparison.columns.length === 1 && !comparison.columns[0]!.refusal ? comparison.columns[0]!.id : undefined;
  const [selected, setSelected] = useState<string | undefined>(sole);
  if (acts.committed && acts.by === id) {
    return <ChooserReceipt committed={acts.committed} again={again} onAgain={() => { setSelected(sole); acts.dismiss(); onAgain?.(); }} />;
  }
  const column = comparison.columns.find((entry) => entry.id === selected);
  const waiting = column ? (column.refusal ?? pending?.(column.id)) : undefined;
  const forceful = column ? (typeof danger === "function" ? danger(column.id) : danger === true) : false;
  const scales = outcomeScales(comparison.columns.map((entry) => entry.outcome));
  const authorize = () => {
    if (!column || waiting) return;
    const lines = comparison.rows.flatMap((row) => {
      const cell = column.cells[row.key];
      return cell && cell.lines.length > 0 ? [{ label: row.label, value: cell.lines.filter(Boolean).join(". ") }] : [];
    });
    void acts.commit({ title: receiptTitle?.(column) ?? column.label, lines, packet: () => packet(column.id), review: { title: column.label, lines: [{ label: "What happens when you confirm", value: column.review }, ...lines], verb: column.verb, danger: forceful, authority } }, id);
  };
  return (
    <Column gap="md">
      <Row between wrap gap="sm">
        <Text variant="title">{title}</Text>
        <Authority cite={authority} />
      </Row>
      {terms}
      {comparison.waiting ? <Waiting text={comparison.waiting} /> : null}
      <ResultsList label={`${title}: options`}>
        {comparison.columns.map((entry) => (
          <ResultRow
            key={entry.id}
            label={entry.label}
            icon={entry.refusal ? "locked" : "decision"}
            {...(entry.refusal ? { note: "Locked. You can still read it." } : {})}
            readings={outcomeReadings(entry.outcome, scales)}
            selected={entry.id === selected}
            onPress={() => setSelected(entry.id)}
            pressLabel={entry.label}
            below={
              <Column gap="sm">
                <Text variant="caption" tone={entry.refusal ? "warning" : "secondary"}>{entry.refusal ? `Not available right now. ${entry.refusal}` : entry.review}</Text>
                {entry.id === selected ? <Terms comparison={comparison} column={entry} /> : null}
              </Column>
            }
          />
        ))}
      </ResultsList>
      {!column ? (
        <Text variant="caption" tone="secondary">{comparison.columns.every((entry) => entry.refusal) ? "Nothing here can be approved yet. Each option says what it waits on." : "No option is picked yet."}</Text>
      ) : waiting ? (
        <Text variant="caption" tone="warning" role="alert">{column.refusal ? `Not available right now. ${waiting}` : waiting}</Text>
      ) : (
        <Row>
          <Button kind={forceful ? "danger" : "primary"} icon="sign" disabled={acts.busy} onPress={authorize}>
            {column.verb}
          </Button>
        </Row>
      )}
      {acts.problem && acts.by === id ? <Text variant="caption" tone="danger" role="alert">{acts.problem}</Text> : null}
    </Column>
  );
}
