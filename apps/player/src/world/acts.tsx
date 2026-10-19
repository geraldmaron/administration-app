import { useState, type ReactNode } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import { place, type ActCell, type ActColumn, type ActComparison, type Authority, type ChoiceCell, type ChoiceTable, type MetricStance } from "@admin/player-core";
import { Button, Column, Row, Text, type IconName } from "@admin/ui";
import { CompareAuthorize, ResultView, type CompareOption } from "@admin/ui/review";
import { ActResult } from "../executive/ActReceipt";
import { useAuthorize } from "../review/use-authorize";
import { LawChips, Problem, go } from "./parts";

type Line = { readonly label: string; readonly value: string };

/** What an act did, kept beside its receipt so it is said from what the commit returned. */
export type Committed = {
  readonly title: string;
  readonly date: string;
  readonly before: Campaign;
  readonly after: Campaign;
  readonly lines: readonly Line[];
  readonly refused?: boolean;
  readonly eventId?: string;
  readonly saveError?: string;
};

export type Commission = {
  readonly title: string;
  readonly lines: readonly Line[];
  readonly refused?: boolean;
  /** How the act is put to the President: the terms the screen showed, never what the build returned. */
  readonly review: { readonly tier: "full" | "confirm"; readonly title: string; readonly lines: readonly Line[]; readonly verb: string; readonly danger: boolean };
  /** Built at press time on the campaign the screen priced; a refusal is thrown in the engine's words. */
  readonly packet: () => EffectPacket | readonly EffectPacket[];
};

/**
 * One act on the world, committed through the shared presidential review
 * against the campaign the screen priced it on, so a press after time moved is
 * refused rather than charged at a price nobody quoted.
 */
export function useWorldActs(campaign: Campaign, camera = "world") {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const [committed, setCommitted] = useState<Committed | undefined>(undefined);
  async function commit(commission: Commission): Promise<void> {
    const done = await authorize(() => ({ packet: commission.packet() }), commission.review, { camera });
    if (!done) return;
    setCommitted({
      title: commission.title,
      date: done.date,
      before: done.before,
      after: done.after,
      lines: commission.lines,
      ...(commission.refused ? { refused: true } : {}),
      ...(done.eventId ? { eventId: done.eventId } : {}),
      ...(done.saveError ? { saveError: done.saveError } : {}),
    });
  }
  return { busy, problem, committed, commit, dismiss: () => setCommitted(undefined) };
}

export type WorldActs = ReturnType<typeof useWorldActs>;

/** An act the one with the last word turned down: what was tried, and the way on. It is on the Record. */
export function RefusedResult({ title, date, lines, eventId, back }: { readonly title: string; readonly date: string; readonly lines: readonly Line[]; readonly eventId?: string; readonly back: ReactNode }) {
  return (
    <ResultView
      title={title}
      verdict={{ word: "Turned down", tone: "danger", icon: "reject" }}
      summary={`${date}. You tried, and it was turned down. It's on your Record.`}
      readings={
        <Column gap="xs">
          {lines.map((line) => (
            <Row key={line.label} gap="sm" between wrap>
              <Text variant="caption" tone="secondary">
                {line.label}
              </Text>
              <Text variant="label" flexShrink={1}>
                {line.value}
              </Text>
            </Row>
          ))}
        </Column>
      }
      {...(eventId ? { record: <Row><Button kind="secondary" icon="record" onPress={() => go(place.event(eventId))}>Open the Record entry</Button></Row> } : {})}
      secondary={back}
    />
  );
}

/** The result of the screen's last act: the verdict, the terms, what it moved, its Record entry and the next matter waiting. */
export function ActsReceipt({ acts, again }: { readonly acts: WorldActs; readonly again: string }) {
  const done = acts.committed;
  if (!done) return null;
  const back = (
    <Button kind="quiet" size="compact" icon="return" onPress={acts.dismiss}>
      {again}
    </Button>
  );
  if (done.refused) return <RefusedResult title={done.title} date={done.date} lines={done.lines} {...(done.eventId ? { eventId: done.eventId } : {})} back={back} />;
  return <ActResult done={{ title: done.title, date: done.date, lines: done.lines, before: done.before, after: done.after, ...(done.eventId ? { eventId: done.eventId } : {}), ...(done.saveError ? { saveError: done.saveError } : {}) }} back={back} />;
}

const STANCE_TONE: Readonly<Record<MetricStance, "success" | "secondary" | "warning" | "danger">> = { favorable: "success", neutral: "secondary", caution: "warning", adverse: "danger" };

const cellText = (cell: ActCell | undefined): string | undefined => (cell && cell.lines.length > 0 ? cell.lines.filter(Boolean).join(". ") : undefined);

/** The lines a receipt reads: the picked column, row by row, as the comparison priced it. */
export function receiptLines(comparison: ActComparison, column: ActColumn): readonly Line[] {
  return comparison.rows.flatMap((row) => {
    const text = cellText(column.cells[row.key]);
    return text ? [{ label: row.label, value: text.replace(/\.$/, "") }] : [];
  });
}

const ACT_ROW_ICONS: Readonly<Record<string, IconName>> = { does: "dossier", tradeoff: "law", funding: "departmentTreasury", effects: "economyGrowth", hill: "subjectCapitol", count: "subjectChamber", happens: "dispatch", cost: "budget", congress: "subjectCapitol" };

/** An act comparison's columns as the shared review's result rows, each row a labeled line in its stance's ink. */
export function actOptions(comparison: ActComparison, danger: boolean, law?: readonly Authority[]): readonly CompareOption[] {
  return comparison.columns.map((column) => ({
    id: column.id,
    label: column.label,
    icon: danger ? "escalate" : "order",
    accent: danger ? "red" : "blue",
    ...(column.refusal ? { unavailable: `Not available right now. ${column.refusal}` } : {}),
    lead: <Text variant="caption" tone="secondary">{column.review}</Text>,
    lines: comparison.rows.flatMap((row) => {
      const cell = column.cells[row.key];
      const text = cellText(cell);
      const icon = ACT_ROW_ICONS[row.key];
      return text ? [{ label: row.label, ...(icon ? { icon } : {}), value: <Text variant="label" weight="regular" tone={cell?.stance ? STANCE_TONE[cell.stance] : "primary"}>{text}</Text> }] : [];
    }),
    ...(column.outcome ? { outcome: column.outcome } : {}),
    ...(law?.length ? { foot: <LawChips authorities={law} compact /> } : {}),
  }));
}

export type SetActProps = {
  readonly title: string;
  readonly comparison: ActComparison;
  readonly acts: WorldActs;
  /** The packet the picked option commits, built at press time; a refusal throws in the engine's words. */
  readonly packet: (option: string) => EffectPacket;
  readonly receiptTitle: (column: ActColumn) => string;
  readonly tone?: "commit" | "danger";
  /** Inputs the option takes, drawn above the list. */
  readonly terms?: ReactNode;
  /** What the picked option still needs from the President before its verb is live. */
  readonly pending?: (option: string) => string | undefined;
  /** The law the act rests on, set at the foot of each picked row. */
  readonly law?: readonly Authority[];
};

/**
 * One act on a treaty, a war or a paper, its options read as changes from
 * today, with any clock that runs unanswered said beside them. Every act here
 * is never routine, so each gets the full presidential review.
 */
export function SetAct({ title, comparison, acts, packet, receiptTitle, tone = "commit", terms, pending, law }: SetActProps) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const column = comparison.columns.find((entry) => entry.id === selected);
  const needs = selected ? pending?.(selected) : undefined;
  const options = actOptions(comparison, tone === "danger", law).map((option) => (option.id === selected && needs && !option.unavailable ? { ...option, unavailable: needs } : option));
  const authorize = () => {
    if (!column || column.refusal || needs) return;
    const lines = receiptLines(comparison, column);
    setSelected(undefined);
    void acts.commit({ title: receiptTitle(column), lines, packet: () => packet(column.id), review: { tier: "full", title: column.label, lines: [{ label: "What it does", value: column.review }, ...lines], verb: column.verb, danger: tone === "danger" } });
  };
  const verb = (column ?? comparison.columns[0])?.verb ?? "Authorize";
  return (
    <Column gap="md">
      {terms}
      <CompareAuthorize title={title} options={options} selected={selected} onSelect={setSelected} verb={verb} onAuthorize={authorize} tone={tone} {...(column ? { review: column.review } : {})} {...(comparison.waiting ? { waiting: comparison.waiting } : {})} busy={acts.busy} />
      <Problem problem={acts.problem} />
    </Column>
  );
}

const CHOICE_TONE = { favorable: "success", adverse: "danger", neutral: "primary" } as const;

function choiceCellNode(cell: ChoiceCell): ReactNode {
  if (cell.moves && cell.moves.length > 0) {
    return (
      <Column gap="2xs">
        {cell.moves.map((move) => (
          <Text key={`${move.label ?? ""}${move.text}`} variant="label" weight="regular" tone={CHOICE_TONE[move.tone]}>
            {move.label ? `${move.label}: ` : ""}
            {move.tone === "favorable" ? "▲ " : move.tone === "adverse" ? "▼ " : ""}
            {move.text}
          </Text>
        ))}
      </Column>
    );
  }
  return (
    <Text variant="label" weight="regular" tone={CHOICE_TONE[cell.tone]}>
      {cell.text}
    </Text>
  );
}

const CHOICE_ROW_ICONS: Readonly<Record<string, IconName>> = { cost: "budget", now: "budget", "per-week": "schedule", bill: "schedule", effects: "graph", politics: "layerLean", reach: "mapPin", review: "law", opens: "open", challenge: "court" };

/** A desk's choice table as the shared review's result rows, every column read on the same rows. */
export function choiceOptions(table: ChoiceTable, danger: boolean, law?: readonly Authority[]): readonly CompareOption[] {
  return table.columns.map((column, index) => {
    const moves = table.rows.flatMap((row) => row.cells[index]?.moves ?? []);
    const good = moves.filter((move) => move.tone === "favorable").length;
    const bad = moves.filter((move) => move.tone === "adverse").length;
    const verdict = good === 0 && bad === 0 ? "No changes we can measure" : [good > 0 ? `${good} in your favor` : "", bad > 0 ? `${bad} against you` : ""].filter(Boolean).join(" · ");
    return {
      id: column.id,
      label: column.label,
      icon: danger ? "escalate" : "order",
      accent: danger ? "red" : "blue",
      ...(column.locked ? { unavailable: column.locked } : {}),
      lead: <Text variant="caption" tone={bad > good ? "danger" : good > 0 ? "success" : "secondary"}>{verdict}</Text>,
      lines: table.rows.flatMap((row) => {
        const cell = row.cells[index];
        const icon = CHOICE_ROW_ICONS[row.id];
        return cell ? [{ label: row.label, ...(icon ? { icon } : {}), value: choiceCellNode(cell) }] : [];
      }),
      ...(law?.length ? { foot: <LawChips authorities={law} compact /> } : {}),
    };
  });
}
