import type { BudgetAccount } from "@admin/engine";
import type { DraftAccountRow } from "@admin/player-core";
import { Pane, Button, Column, Icon, ReadingFrame, Row, Slider, Surface, Text } from "@admin/ui";
import { InlineField } from "@admin/ui/forms";
import { Track, shareSegments } from "@admin/ui/nation";
import { StackedBar, segmentKeyEntries } from "@admin/ui/news";
import { ACCOUNT_GLYPH } from "../glyphs";
import { markEntry } from "../keys";

/** A twentieth of a point of national income: the finest step a line is drafted in. */
export const DRAFT_STEP = 0.0005;

/** A share snapped to the drafting step, on a grid through today's amount so stepping from an amount off a round step stays on it. */
export const onDraftGrid = (share: number, inForce: number): number => inForce + Math.round((share - inForce) / DRAFT_STEP) * DRAFT_STEP;

/** A share of national income as the table prints it, to a hundredth of a point. */
export const incomeShare = (share: number): string => `${(share * 100).toFixed(2)}%`;

/** A change in points of national income, signed; a true zero reads "No change". */
export function pointChange(change: number): string {
  if (Math.abs(change) < DRAFT_STEP / 2) return "No change";
  return `${change > 0 ? "▲ +" : "▼ −"}${(Math.abs(change) * 100).toFixed(2)} pts`;
}

const DIRECTION_WORDS = { building: "Builds it up", holding: "Keeps it level", "drawing down": "Lets it run down" } as const;
/** A share as hundredths of a point, rounded so a restored line equals today's exactly. */
const points = (share: number): number => Number((share * 100).toFixed(2));
const isMoved = (row: DraftAccountRow): boolean => Math.abs(row.draft - row.inForce) >= DRAFT_STEP / 2;

/**
 * One line of the book as a slider from nothing to the cap Congress allows.
 * The track beneath marks the line in force (dark) and the level that holds
 * the account (gold), so the request is read against both.
 */
function Line({ row, onChange }: { readonly row: DraftAccountRow; readonly onChange: (account: BudgetAccount, share: number) => void }) {
  const set = (share: number) => onChange(row.account, Math.min(row.cap, Math.max(0, onDraftGrid(share, row.inForce))));
  const at = (share: number) => (row.cap > 0 ? share / row.cap : 0);
  return (
    <Surface level={isMoved(row) ? "raised" : "base"} pad="md" accentEdge={isMoved(row) ? "accent" : undefined}>
      <Column gap="sm">
        <Row gap="sm" wrap>
          <Icon name={ACCOUNT_GLYPH[row.account]} size={24} tone="gold" />
          <Column flex={1} minWidth={160}>
            <Text variant="label">{row.name}</Text>
            <Text variant="caption" tone="secondary">
              {DIRECTION_WORDS[row.direction]}
            </Text>
          </Column>
          <Column alignItems="flex-end">
            <InlineField
              label={`${row.name} amount, in points of national income`}
              value={points(row.draft)}
              baseline={points(row.inForce)}
              min={0}
              max={points(row.cap)}
              step={DRAFT_STEP * 100}
              format={(pts) => `${pts.toFixed(2)}%`}
              onChange={(pts) => set(pts / 100)}
            />
            <Text variant="caption" tone="secondary">
              {pointChange(row.draft - row.inForce)}
            </Text>
          </Column>
        </Row>
        <Slider value={row.draft} min={0} max={row.cap} step={DRAFT_STEP} onChange={set} label={`${row.name} amount`} valueText={`${incomeShare(row.draft)} of national income. Now ${incomeShare(row.inForce)}. Limit ${incomeShare(row.cap)}`} />
        <Track value={at(row.draft)} from={at(row.inForce)} slim marks={[{ at: at(row.inForce), label: "Now", strong: true }]} {...(row.direction === "holding" ? {} : { target: at(row.sustain) })} />
        <Row between wrap gap="xs">
          <Text variant="caption" tone="tertiary">
            0% · limit {incomeShare(row.cap)}
          </Text>
          <Row gap="xs">
            <Button kind="quiet" size="compact" disabled={!isMoved(row)} onPress={() => set(row.inForce)}>
              {`Current ${incomeShare(row.inForce)}`}
            </Button>
            {row.direction === "holding" ? null : (
              <Button kind="quiet" size="compact" onPress={() => set(row.sustain)}>
                {`Keep level ${incomeShare(row.sustain)}`}
              </Button>
            )}
          </Row>
        </Row>
      </Column>
    </Surface>
  );
}

/** The administration's own book: each line a slider against what is in force and the cap, and the totals at the foot. */
export function AllocationEditor({ rows, onChange, onReset }: { readonly rows: readonly DraftAccountRow[]; readonly onChange: (account: BudgetAccount, share: number) => void; readonly onReset: () => void }) {
  const moved = rows.some(isMoved);
  const inForce = rows.reduce((sum, row) => sum + row.inForce, 0);
  const draft = rows.reduce((sum, row) => sum + row.draft, 0);
  const split = shareSegments(rows.map((row) => ({ id: row.account, label: row.name, share: row.draft, figure: `${((row.draft / draft) * 100).toFixed(0)}%` })));
  return (
    <Pane title="How the money is split" icon="budget" line="Each line's amount is a share of national income, which is everything the country earns in a year." actions={<Button kind="quiet" size="compact" icon="return" disabled={!moved} onPress={onReset}>Reset to the current budget</Button>}>
      {draft > 0 ? (
        <ReadingFrame title="Where your proposed money goes" unit="% of the total you propose" legend={segmentKeyEntries(split)} help={{ meaning: "The bar is your whole proposal, cut into the five budget lines. A wider part is a bigger share of the money." }}>
          <StackedBar label="Where your proposed money goes" segments={split} height={14} />
        </ReadingFrame>
      ) : null}
      <ReadingFrame title="Each line against today and the level that holds it" unit="% of national income, from 0 to the limit Congress allows" legend={[{ id: "draft", kind: "swatch", label: "Your proposed amount", ink: "accent" }, markEntry("now", "Today's amount"), { id: "level", kind: "tick", label: "The amount that keeps it from growing or shrinking", ink: "gold", weight: 3 }]} help={{ meaning: "Each bar runs from nothing to the most Congress allows for that line. The filled part is what you propose. The dark line is what the line gets today, and the gold line is the amount that holds the line where it is." }}>
        <Column gap="sm">
          {rows.map((row) => (
            <Line key={row.account} row={row} onChange={onChange} />
          ))}
        </Column>
      </ReadingFrame>
      <Row between wrap padding="sm" borderTopWidth={2} borderTopColor="borderColorStrong">
        <Text variant="label">Total</Text>
        <Text variant="caption" tone="secondary">
          Now {incomeShare(inForce)}
        </Text>
        <Text variant="title" tabular>
          {incomeShare(draft)}
        </Text>
        <Text variant="label">{pointChange(draft - inForce)}</Text>
      </Row>
    </Pane>
  );
}
