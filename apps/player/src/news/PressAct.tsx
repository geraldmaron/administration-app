import { usePathname } from "expo-router";
import { useState, type ReactNode } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import { authorityByCite, type ActCell, type ActColumn, type ActComparison } from "@admin/player-core";
import { Button, Column, LegalCitation, Row, Text } from "@admin/ui";
import { CompareAuthorize, type CompareOption } from "@admin/ui/review";
import { ResultBody } from "../decision/ResultPage";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { useAuthorize } from "../review/use-authorize";

type ReceiptLine = { readonly label: string; readonly value: string };

export type PressCommitted = { readonly by: string; readonly title: string; readonly date: string; readonly lines: readonly ReceiptLine[]; readonly eventId?: string; readonly saveError?: string };

/**
 * One commit path for every act on the press desk, through the shared
 * presidential review: the packet built at press time, reviewed, then
 * committed against the campaign the screen priced. The receipt is kept by
 * the block that authorized it.
 */
export function usePressCommit(campaign: Campaign) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const [committed, setCommitted] = useState<PressCommitted | undefined>(undefined);
  const [by, setBy] = useState<string | undefined>(undefined);
  async function commit(block: string, title: string, lines: readonly ReceiptLine[], review: { readonly title: string; readonly verb: string; readonly danger: boolean; readonly lines: readonly ReceiptLine[] }, packet: () => EffectPacket) {
    setBy(block);
    const done = await authorize(() => ({ packet: packet() }), { tier: "confirm", ...review }, { camera: "us" });
    if (!done) return;
    setCommitted({ by: block, title, date: done.date, lines, ...(done.eventId ? { eventId: done.eventId } : {}), ...(done.saveError ? { saveError: done.saveError } : {}) });
  }
  return { busy, problem, by, committed, commit, dismiss: () => setCommitted(undefined) };
}

export type PressCommit = ReturnType<typeof usePressCommit>;

const cellText = (cell: ActCell | undefined): string | undefined => (cell && cell.lines.length > 0 ? cell.lines.filter(Boolean).join(". ") : undefined);

function linesOf(comparison: ActComparison, column: ActColumn): readonly ReceiptLine[] {
  return comparison.rows.flatMap((row) => {
    const text = cellText(column.cells[row.key]);
    return text ? [{ label: row.label, value: text }] : [];
  });
}

/** The law the act rests on, as a chip that opens it. */
export function Citation({ cite }: { readonly cite: string }) {
  const open = useOpenAuthority();
  const record = authorityByCite(cite);
  return <LegalCitation citation={{ cite, title: record?.shortTitle ?? record?.title ?? cite }} onPress={() => open(cite)} />;
}

function optionsOf(comparison: ActComparison, cite: string): readonly CompareOption[] {
  return comparison.columns.map((column) => ({
    id: column.id,
    label: column.label,
    icon: "microphone",
    accent: "blue",
    ...(column.refusal ? { unavailable: column.refusal } : {}),
    lead: <Text variant="caption" tone="secondary">{column.review}</Text>,
    lines: linesOf(comparison, column).map((line) => ({ label: line.label, value: line.value })),
    ...(column.outcome ? { outcome: column.outcome } : {}),
    foot: <Citation cite={cite} />,
  }));
}

export type PressActProps = {
  readonly campaign: Campaign;
  readonly id: string;
  readonly title: string;
  readonly comparison: ActComparison;
  readonly acts: PressCommit;
  /** The citation the act rests on (DECISIONS §8.12). */
  readonly cite: string;
  readonly packet: (option: string) => EffectPacket;
  readonly again: string;
  readonly danger?: boolean;
  readonly terms?: ReactNode;
  readonly receiptTitle?: (column: ActColumn) => string;
};

/** A press act: the options as a results list, any silence clock said beside them, one picked, one named verb, the review, then the receipt in place. */
export function PressAct({ campaign, id, title, comparison, acts, cite, packet, again, danger, terms, receiptTitle }: PressActProps) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const here = usePathname();
  if (acts.committed && acts.committed.by === id) {
    const { committed } = acts;
    return (
      <Column gap="md">
        <ResultBody campaign={campaign} title={committed.title} date={committed.date} saveError={committed.saveError} eventId={committed.eventId} lines={committed.lines} here={here} />
        <Row>
          <Button kind="quiet" size="compact" icon="return" onPress={() => { setSelected(undefined); acts.dismiss(); }}>{again}</Button>
        </Row>
      </Column>
    );
  }
  const column = comparison.columns.find((entry) => entry.id === selected);
  const authorize = () => {
    if (!column || column.refusal) return;
    const lines = linesOf(comparison, column);
    void acts.commit(id, receiptTitle?.(column) ?? column.label, lines, { title: column.label, verb: column.verb, danger: danger === true, lines: [{ label: "What it does", value: column.review }, { label: "Authority", value: cite }, ...lines] }, () => packet(column.id));
  };
  return (
    <Column gap="md">
      {terms}
      <CompareAuthorize title={title} options={optionsOf(comparison, cite)} selected={selected} onSelect={setSelected} verb={column?.verb ?? comparison.columns[0]?.verb ?? "Respond"} onAuthorize={authorize} tone={danger ? "danger" : "commit"} {...(column ? { review: column.review } : {})} {...(comparison.waiting ? { waiting: comparison.waiting } : {})} busy={acts.busy} />
      {acts.problem && acts.by === id ? (
        <Text variant="label" tone="danger" role="alert">
          {acts.problem}
        </Text>
      ) : null}
    </Column>
  );
}
