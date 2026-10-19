import { NativeSelect } from "./NativeSelect";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type SortDirection = "ascending" | "descending";

export type SortState<K extends string> = { readonly key: K; readonly direction: SortDirection };

/** A value a column sorts by. `undefined` is a missing reading and always sorts last, never as zero. */
export type SortValue = number | string | undefined;

/** Pressing the active column flips it; pressing another starts it in the direction that column reads best first. */
export function nextSort<K extends string>(current: SortState<K>, key: K, first: SortDirection = "ascending"): SortState<K> {
  if (current.key !== key) return { key, direction: first };
  return { key, direction: current.direction === "ascending" ? "descending" : "ascending" };
}

/**
 * Rows ordered by one column. Missing values go last in either direction, and
 * ties fall back to `tiebreak` so the order is stable from one render to the next.
 */
export function sortRows<T, K extends string>(rows: readonly T[], sort: SortState<K>, value: Readonly<Record<K, (row: T) => SortValue>>, tiebreak?: (a: T, b: T) => number): readonly T[] {
  const sign = sort.direction === "ascending" ? 1 : -1;
  const read = value[sort.key];
  return [...rows].sort((a, b) => {
    const left = read(a);
    const right = read(b);
    if (left === undefined || right === undefined) {
      if (left === right) return tiebreak?.(a, b) ?? 0;
      return left === undefined ? 1 : -1;
    }
    const order = typeof left === "string" || typeof right === "string" ? String(left).localeCompare(String(right)) : left - right;
    return order * sign || (tiebreak?.(a, b) ?? 0);
  });
}

/**
 * Sort state that starts again from `initial` when `resetKey` changes, so a new
 * filter or selection opens in its own natural order.
 */
export function useSort<K extends string>(initial: SortState<K>, resetKey?: string | number): readonly [SortState<K>, (key: K, first?: SortDirection) => void, (next: SortState<K>) => void] {
  const [state, setState] = useState<{ readonly reset: string | number | undefined; readonly sort: SortState<K> }>({ reset: resetKey, sort: initial });
  const sort = state.reset === resetKey ? state.sort : initial;
  const onSort = (key: K, first?: SortDirection) => setState({ reset: resetKey, sort: nextSort(sort, key, first) });
  const setSort = (next: SortState<K>) => setState({ reset: resetKey, sort: next });
  return [sort, onSort, setSort] as const;
}

export type SortHeaderProps<K extends string> = {
  readonly label: ReactNode;
  /** A second line under the label, such as a unit. */
  readonly detail?: ReactNode;
  readonly sortKey: K;
  readonly sort: SortState<K>;
  readonly onSort: (key: K, first?: SortDirection) => void;
  /** The direction this column reads best first: highest first for a reading, A to Z for a name. */
  readonly first?: SortDirection;
  /** Numeric columns align to the end, with the arrow before the label. */
  readonly align?: "start" | "end";
  readonly className?: string;
};

/** A column header that sorts its table: the button announces the column and the header carries `aria-sort`. */
export function SortHeader<K extends string>({ label, detail, sortKey, sort, onSort, first = "ascending", align = "start", className }: SortHeaderProps<K>) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" aria-sort={active ? sort.direction : "none"} className={className} data-align={align}>
      <button type="button" className="ui-sort" data-align={align} data-active={active ? "true" : undefined} onClick={() => onSort(sortKey, first)}>
        <span className="ui-sort__label">
          {label}
          {detail ? <span className="ui-sort__detail">{detail}</span> : null}
        </span>
        <span aria-hidden="true" className="ui-sort__arrow">{active ? (sort.direction === "ascending" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

export type SortOption<K extends string> = { readonly key: K; readonly label: string };

const DIRECTION_WORD: Readonly<Record<SortDirection, string>> = { ascending: "low to high", descending: "high to low" };

/** Whether the table right after `element` (or inside the wrapper right after it) hides its header row, whichever stacking rule hid it. */
function headersHidden(element: HTMLElement | null): boolean {
  const next = element?.nextElementSibling;
  const table = next?.matches("table") ? next : next?.querySelector("table");
  const head = table?.querySelector("thead");
  if (!head) return false;
  const box = head.getBoundingClientRect();
  return box.height <= 1 || box.width <= 1 || getComputedStyle(head).display === "none";
}

/**
 * The same sort as a select, for a table whose column headers are hidden
 * because it has stacked into blocks on a narrow screen. It measures its own
 * table rather than assuming a breakpoint, so it appears exactly when the
 * headers are gone, under any of the app's stacking rules. Place it directly
 * before the table, or before the wrapper that holds it.
 */
export function SortPicker<K extends string>({ options, sort, onSort, label = "Sort by", defaultLabel = "Listed order", alwaysVisible = false }: { readonly options: readonly SortOption<K>[]; readonly sort: SortState<K>; readonly onSort: (next: SortState<K>) => void; readonly label?: string; readonly defaultLabel?: string; readonly alwaysVisible?: boolean }) {
  const ref = useRef<HTMLLabelElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (alwaysVisible) return;
    const element = ref.current;
    const parent = element?.parentElement;
    if (!element || !parent || typeof ResizeObserver === "undefined") return;
    const check = () => setShown(headersHidden(element));
    check();
    const observer = new ResizeObserver(check);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [alwaysVisible]);
  const listed = !options.some((option) => option.key === sort.key);
  return (
    <label ref={ref} className="ui-sort-picker" hidden={!alwaysVisible && !shown}>
      <span>{label}</span>
      <NativeSelect value={`${sort.key}:${sort.direction}`} onChange={(event) => {
        const [key, direction] = event.target.value.split(":") as [K, SortDirection];
        onSort({ key, direction });
      }}>
        {listed ? <option value={`${sort.key}:${sort.direction}`}>{defaultLabel}</option> : null}
        {options.flatMap((option) => (["ascending", "descending"] as const).map((direction) => (
          <option key={`${option.key}:${direction}`} value={`${option.key}:${direction}`}>{option.label}, {DIRECTION_WORD[direction]}</option>
        )))}
      </NativeSelect>
    </label>
  );
}
