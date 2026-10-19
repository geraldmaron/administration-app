import { useState, type ReactNode } from "react";

export type CollectionProps<T> = {
  readonly items: readonly T[];
  /** How many lead the first view; the order of `items` is the ranking. */
  readonly initial: number;
  /** What the rows are, plural, for the count and the control: "partners", "settled bills". */
  readonly noun: string;
  readonly render: (item: T, index: number) => ReactNode;
  /** The wrapper the rows sit in; a list by default. */
  readonly as?: "ul" | "ol" | "tbody" | "div";
  readonly className?: string;
  /** For `as="tbody"`: how many columns the table has, so the foot spans exactly the table. */
  readonly columns?: number;
  /** Said when there are no rows at all. */
  readonly empty?: ReactNode;
  /** Changes when the rows are a different set (a new filter or selection), which starts again at the first page. Defaults to the row count. */
  readonly resetKey?: string | number;
};

/** The page numbers a pager shows: the first, the last and the neighbors of the current page, with gaps marked. */
export function pageWindow(page: number, pages: number): readonly (number | "gap")[] {
  const keep = new Set([0, pages - 1, page - 1, page, page + 1].filter((n) => n >= 0 && n < pages));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1]! > 1 ? (["gap", n] as const) : [n]));
}

type FootProps = { readonly total: number; readonly size: number; readonly page: number; readonly all: boolean; readonly noun: string; readonly onPage: (page: number) => void; readonly onAll: (all: boolean) => void };

/** The count of what is in view, the pages, and one control to show every row. */
function CollectionFoot({ total, size, page, all, noun, onPage, onAll }: FootProps) {
  const pages = Math.ceil(total / size);
  const first = all ? 1 : page * size + 1;
  const last = all ? total : Math.min(total, (page + 1) * size);
  return (
    <div className="ui-collection__foot">
      <span className="ui-collection__count" aria-live="polite">
        {first}–{last} of {total} {noun}
      </span>
      {!all ? (
        <nav className="ui-collection__pages" aria-label={`Pages of ${noun}`}>
          <button type="button" className="ui-collection__page" disabled={page === 0} aria-label="Previous page" onClick={() => onPage(page - 1)}>‹</button>
          {pageWindow(page, pages).map((entry, i) =>
            entry === "gap" ? (
              <span key={`gap-${i}`} className="ui-collection__gap" aria-hidden="true">…</span>
            ) : (
              <button key={entry} type="button" className="ui-collection__page" aria-current={entry === page ? "page" : undefined} aria-label={`Page ${entry + 1} of ${pages}`} onClick={() => onPage(entry)}>
                {entry + 1}
              </button>
            ),
          )}
          <button type="button" className="ui-collection__page" disabled={page >= pages - 1} aria-label="Next page" onClick={() => onPage(page + 1)}>›</button>
        </nav>
      ) : null}
      <button type="button" className="ui-button ui-button--ghost ui-collection__toggle" aria-expanded={all} onClick={() => onAll(!all)}>
        {all ? "Show by page" : `Show all ${total}`}
      </button>
    </div>
  );
}

/**
 * A ranked collection that never hides its tail: rows come a page at a time
 * with the true total always in view, every page is one press away, and one
 * control shows every row at once. Use this instead of slicing a list for
 * display. A new set of items starts again at the first page.
 */
export function Collection<T>({ items, initial, noun, render, as = "ul", className, columns = 1, empty, resetKey }: CollectionProps<T>) {
  const [all, setAll] = useState(false);
  const key = resetKey ?? items.length;
  const [paging, setPaging] = useState<{ readonly key: string | number; readonly page: number }>({ key, page: 0 });
  if (items.length === 0) return empty ? <p className="ui-collection__empty">{empty}</p> : null;
  const pages = Math.max(1, Math.ceil(items.length / initial));
  const page = paging.key === key ? Math.min(paging.page, pages - 1) : 0;
  const shown = all ? items : items.slice(page * initial, (page + 1) * initial);
  const Wrapper = as;
  const foot =
    items.length > initial ? (
      <CollectionFoot total={items.length} size={initial} page={page} all={all} noun={noun} onPage={(next) => setPaging({ key, page: next })} onAll={setAll} />
    ) : null;
  const offset = all ? 0 : page * initial;
  const rows = shown.map((item, index) => render(item, offset + index));
  if (as === "tbody") {
    return (
      <>
        <tbody className={className}>{rows}</tbody>
        {foot ? (
          <tfoot>
            <tr className="ui-collection__foot-row">
              <td colSpan={columns} className="ui-collection__foot-cell" style={{ padding: 0, border: 0, fontWeight: "var(--weight-regular)" }}>
                {foot}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </>
    );
  }
  return (
    <div className="ui-collection">
      <Wrapper className={className}>{rows}</Wrapper>
      {foot}
    </div>
  );
}
