import type { BudgetAccount } from "@admin/engine";
import type { DraftAccountRow } from "@admin/player-core";
import { Card, CardHeader, CardContent, Button, Icon, ShareBar, type IconName } from "@admin/ui-web";
import { MoveText } from "../../shell/valence";

/** The glyph an account wears: the instrument it funds, or the government itself. */
const ACCOUNT_GLYPH: Readonly<Record<BudgetAccount, IconName>> = {
  diplomatic: "instrumentDiplomatic",
  economic: "instrumentEconomic",
  covert: "instrumentCovert",
  military: "instrumentMilitary",
  domestic: "domesticLedger",
};

/** A twentieth of a point of national income: the finest step a line is drafted in. */
export const DRAFT_STEP = 0.0005;

/** A share of national income as the table and its summary print it, to a hundredth of a point. */
export const incomeShare = (share: number): string => `${(share * 100).toFixed(2)}%`;

/** A change in points of national income, signed; a true zero reads "No change". */
export function pointChange(change: number): string {
  if (Math.abs(change) < DRAFT_STEP / 2) return "No change";
  return `${change > 0 ? "+" : "−"}${(Math.abs(change) * 100).toFixed(2)} pts`;
}

/** The change as a sign and an arrow in neutral ink: a bigger book is not good or bad in itself. */
function moveOf(change: number) {
  if (Math.abs(change) < DRAFT_STEP / 2) return <span className="budget-still">No change</span>;
  return <MoveText delta={change} valence="neutral">{pointChange(change)}</MoveText>;
}

const DIRECTION_WORDS = { building: "Builds the account", holding: "Holds the account level", "drawing down": "Draws the account down" } as const;

const isMoved = (row: DraftAccountRow): boolean => Math.abs(row.draft - row.inForce) >= DRAFT_STEP / 2;

const pct = (share: number, cap: number): string => `${cap > 0 ? Math.min(100, Math.max(0, (share / cap) * 100)) : 0}%`;

/**
 * One line of the book as a slider from nothing to the cap Congress allows: the
 * line in force and the level that holds the account are marked on the track,
 * the span between what is in force and the request is filled, and the request
 * is read out beside it. A native range input underneath gives drag, arrow keys
 * and a screen reader the same control.
 */
function LineSlider({ row, onChange }: { readonly row: DraftAccountRow; readonly onChange: (account: BudgetAccount, share: number) => void }) {
  const id = `budget-request-${row.account}`;
  const low = Math.min(row.inForce, row.draft);
  const high = Math.max(row.inForce, row.draft);
  const set = (share: number) => onChange(row.account, Math.min(row.cap, Math.max(0, Math.round(share / DRAFT_STEP) * DRAFT_STEP)));
  return (
    <li className="alloc" data-moved={isMoved(row) ? "true" : undefined}>
      <div className="alloc__name">
        <Icon name={ACCOUNT_GLYPH[row.account]} size={24} className="alloc__icon" />
        <span>
          <label htmlFor={id} className="alloc__label">
            {row.name}
          </label>
          <span className="alloc__hint">{DIRECTION_WORDS[row.direction]}</span>
        </span>
      </div>
      <div className="alloc__control">
        <div className="alloc__track" aria-hidden="true">
          <span className="alloc__fill" data-dir={row.draft >= row.inForce ? "up" : "down"} style={{ insetInlineStart: pct(low, row.cap), inlineSize: `calc(${pct(high, row.cap)} - ${pct(low, row.cap)})` }} />
          <span className="alloc__mark alloc__mark--force" style={{ insetInlineStart: pct(row.inForce, row.cap) }} />
          {row.direction === "holding" ? null : <span className="alloc__mark alloc__mark--level" style={{ insetInlineStart: pct(row.sustain, row.cap) }} />}
        </div>
        <input
          id={id}
          className="alloc__range"
          type="range"
          min={0}
          max={row.cap}
          step={DRAFT_STEP}
          value={row.draft}
          aria-valuetext={`${incomeShare(row.draft)} of national income; in force ${incomeShare(row.inForce)}; cap ${incomeShare(row.cap)}`}
          onChange={(event) => set(Number(event.currentTarget.value))}
        />
        <div className="alloc__scale" aria-hidden="true">
          <span>0%</span>
          <span>Cap {incomeShare(row.cap)}</span>
        </div>
      </div>
      <div className="alloc__read">
        <span className="alloc__figure">{incomeShare(row.draft)}</span>
        <span className="alloc__change">{moveOf(row.draft - row.inForce)}</span>
        <span className="alloc__snaps">
          <button type="button" className="alloc__snap" disabled={!isMoved(row)} onClick={() => set(row.inForce)}>
            In force {incomeShare(row.inForce)}
          </button>
          {row.direction === "holding" ? null : (
            <button type="button" className="alloc__snap" onClick={() => set(row.sustain)}>
              Hold level {incomeShare(row.sustain)}
            </button>
          )}
        </span>
      </div>
    </li>
  );
}

/**
 * The administration's own book: each line a slider against what is in force
 * and the cap, its request read out beside it, and the totals at the foot.
 * Shares are of national income a year.
 */
export function AllocationEditor({ rows, onChange, onReset }: { readonly rows: readonly DraftAccountRow[]; readonly onChange: (account: BudgetAccount, share: number) => void; readonly onReset: () => void }) {
  const moved = rows.some(isMoved);
  const inForce = rows.reduce((sum, row) => sum + row.inForce, 0);
  const draft = rows.reduce((sum, row) => sum + row.draft, 0);
  return (
    <Card role="region" className="budget-editor" aria-labelledby="budget-editor"><CardHeader>
      <div className="budget-section__head">
        <h2 id="budget-editor" className="budget-section__title">
          Allocation by line
        </h2>
        <Button kind="ghost" size="sm" disabled={!moved} onClick={onReset}>
          Reset to the book in force
        </Button>
      </div>
      </CardHeader><CardContent className="budget-editor__content">
      {draft > 0 ? (
        <ShareBar
          label="Where the proposed money goes, by line"
          segments={rows.map((row) => ({ id: row.account, label: row.name, share: row.draft, figure: `${((row.draft / draft) * 100).toFixed(0)}%`, icon: <Icon name={ACCOUNT_GLYPH[row.account]} size={16} /> }))}
        />
      ) : null}
      <p className="budget-note">Drag a line, or use the arrow keys, to set its request as a share of national income a year. The solid tick is the line in force, the hollow tick the level that holds the account, and the track ends at the most Congress allows.</p>
      <ul className="alloc-list">
        {rows.map((row) => (
          <LineSlider key={row.account} row={row} onChange={onChange} />
        ))}
      </ul>
      <div className="alloc-total">
        <span>Total</span>
        <span className="alloc-total__force">In force {incomeShare(inForce)}</span>
        <strong className="alloc-total__figure">{incomeShare(draft)}</strong>
        <span>{moveOf(draft - inForce)}</span>
      </div>
    </CardContent></Card>
  );
}
