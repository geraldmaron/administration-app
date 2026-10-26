import { useEffect, useMemo, useState, type ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { Button, Pressable } from "../primitives/Button";
import { PressRow } from "../primitives/PressRow";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type SortDirection = "ascending" | "descending";
export type SortState<K extends string> = { readonly key: K; readonly direction: SortDirection };

export type TableColumn<T, K extends string = string> = {
  readonly id: string;
  readonly label: string;
  /** Under the header in small type: "52% nationally". */
  readonly detail?: string;
  readonly align?: "start" | "end";
  /** A share of the row's width; the first column defaults to the widest. */
  readonly flex?: number;
  readonly render: (row: T) => ReactNode;
  /** Given, the header sorts the table by this key. */
  readonly sortKey?: K;
  /** The direction a first press sorts in: readings largest first. */
  readonly first?: SortDirection;
  /** Hidden in the phone's stacked card, where the row header already says it. */
  readonly phoneHidden?: boolean;
};

/** The next sort after pressing a header: the same column flips, a new column starts in its own first direction. */
export function nextSort<K extends string>(current: SortState<K>, key: K, first: SortDirection = "ascending"): SortState<K> {
  return current.key === key ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" } : { key, direction: first };
}

export type DataTableProps<T, K extends string> = {
  readonly caption: string;
  readonly columns: readonly TableColumn<T, K>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  readonly sort?: SortState<K>;
  readonly onSort?: (sort: SortState<K>) => void;
  /** Rows before "Show all"; every row is one press away. */
  readonly initial?: number;
  readonly noun: string;
  readonly empty?: string;
  /** A row drawn as the President's own or the chosen one. */
  readonly highlight?: (row: T) => boolean;
  /**
   * Each row is a door: the whole row opens it, not a name inside it. The
   * label is what a screen reader says for the row: "Open Ohio".
   */
  readonly rowPress?: { readonly href?: (row: T) => string; readonly onPress: (row: T) => void; readonly label: (row: T) => string };
  /** The row the screen is showing now; it carries aria-current. */
  readonly selected?: (row: T) => boolean;
};

function Header<T, K extends string>({ column, sort, onSort }: { readonly column: TableColumn<T, K>; readonly sort?: SortState<K>; readonly onSort?: (sort: SortState<K>) => void }) {
  const active = sort !== undefined && column.sortKey !== undefined && sort.key === column.sortKey;
  const body = (
    <Column alignItems={column.align === "end" ? "flex-end" : "flex-start"}>
      <Text variant="caption" weight="strong" tone={active ? "accent" : "secondary"} numberOfLines={2} textAlign={column.align === "end" ? "right" : "left"}>
        {column.label}
        {active ? (sort?.direction === "ascending" ? " ▴" : " ▾") : ""}
      </Text>
      {column.detail ? (
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {column.detail}
        </Text>
      ) : null}
    </Column>
  );
  if (!column.sortKey || !onSort || !sort) {
    return (
      <View flex={column.flex ?? 1} padding="xs" role="columnheader">
        {body}
      </View>
    );
  }
  const key = column.sortKey;
  return (
    <Pressable
      {...(column.flex === 0 ? { flexGrow: 0, flexShrink: 0, flexBasis: "auto", minHeight: 44, justifyContent: "center" } : { flex: column.flex ?? 1 })}
      padding="xs"
      {...(column.flex === 0 ? { paddingHorizontal: "sm" } : {})}
      borderRadius="chip"
      role="columnheader"
      aria-sort={active ? sort.direction : "none"}
      aria-label={`Sort by ${column.label}`}
      onPress={() => onSort(nextSort(sort, key, column.first))}
    >
      {body}
    </Pressable>
  );
}

type LineProps<T> = {
  readonly row: T;
  readonly lit: boolean;
  readonly chosen: boolean;
  readonly press: DataTableProps<T, string>["rowPress"];
  readonly phone: boolean;
  readonly children: ReactNode;
};

/** One row: a stacked card on a phone, a line of cells wider; the whole of it is the door when the table has one. */
function Line<T>({ row, lit, chosen, press, phone, children }: LineProps<T>) {
  const fill = lit ? "infoFill" : phone ? "surface" : "transparent";
  const frame = phone
    ? ({ flexDirection: "column", gap: "2xs", padding: "sm", borderRadius: "chip", borderWidth: 1, borderColor: lit ? "accent" : "borderColor" } as const)
    : ({ flexDirection: "row", alignItems: "center", gap: "sm", paddingHorizontal: "xs", paddingVertical: "xs", borderBottomWidth: 1, borderBottomColor: "borderColor" } as const);
  if (!press) {
    return (
      <View role="row" {...frame} backgroundColor={fill} aria-current={chosen ? "true" : undefined}>
        {children}
      </View>
    );
  }
  return (
    <PressRow href={press.href?.(row)} role="row" label={press.label(row)} selected={chosen} onPress={() => press.onPress(row)} minHeight={44} outlineOffset={-2} {...frame} borderRadius={phone ? "chip" : 0} backgroundColor={{ default: fill, hover: "surfaceHover", press: "backgroundPress" }}>
      {children}
    </PressRow>
  );
}

/**
 * Every row of a collection in one sortable table: a header per column on
 * a tablet or desktop, a stacked card per row on a phone with each figure
 * named. The count shown is always said, and every row is one press away.
 */
export function DataTable<T, K extends string = string>({ caption, columns, rows, rowKey, sort, onSort, initial = 12, noun, empty, highlight, rowPress, selected }: DataTableProps<T, K>) {
  const media = useMedia();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [sort?.key, sort?.direction, rows.length]);
  const shown = useMemo(() => (open ? rows : rows.slice(0, initial)), [open, rows, initial]);
  if (rows.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        {empty ?? `No ${noun}.`}
      </Text>
    );
  }
  const [lead, ...rest] = columns;
  return (
    <Column gap="xs" role="table" aria-label={caption}>
      {media.phone ? (
        sort && onSort ? (
          <Row gap="xs" wrap role="row">
            <Text variant="caption" tone="secondary">
              Sort by
            </Text>
            {columns.filter((column) => column.sortKey).map((column) => (
              <Header key={column.id} column={{ ...column, flex: 0 }} sort={sort} onSort={onSort} />
            ))}
          </Row>
        ) : null
      ) : (
        <Row role="row" borderBottomWidth={1} borderBottomColor="borderColorStrong" gap="sm" paddingHorizontal="xs">
          {columns.map((column, index) => (
            <Header key={column.id} column={{ ...column, flex: column.flex ?? (index === 0 ? 2 : 1) }} sort={sort} onSort={onSort} />
          ))}
        </Row>
      )}
      {shown.map((row) => {
        const chosen = selected?.(row) === true;
        const lit = highlight?.(row) === true || chosen;
        const line = { row, lit, chosen, press: rowPress };
        return media.phone ? (
          <Line key={rowKey(row)} {...line} phone>
            {lead ? <View role="rowheader">{lead.render(row)}</View> : null}
            {rest.filter((column) => !column.phoneHidden).map((column) => (
              <Row key={column.id} between gap="sm" role="cell">
                <Text variant="caption" tone="secondary" flexShrink={1}>
                  {column.label}
                </Text>
                <View flexShrink={1} alignItems="flex-end">
                  {column.render(row)}
                </View>
              </Row>
            ))}
          </Line>
        ) : (
          <Line key={rowKey(row)} {...line} phone={false}>
            {columns.map((column, index) => (
              <View key={column.id} flex={column.flex ?? (index === 0 ? 2 : 1)} role={index === 0 ? "rowheader" : "cell"} alignItems={column.align === "end" ? "flex-end" : "flex-start"} minWidth={0}>
                {column.render(row)}
              </View>
            ))}
          </Line>
        );
      })}
      <Row between wrap gap="sm">
        <Text variant="caption" tone="tertiary" aria-live="polite">
          {shown.length} of {rows.length} {noun} shown.
        </Text>
        {rows.length > initial ? (
          <Button kind="quiet" size="compact" icon={open ? "chevron" : "expandPanel"} onPress={() => setOpen(!open)}>
            {open ? `Show the first ${initial}` : `Show all ${rows.length}`}
          </Button>
        ) : null}
      </Row>
    </Column>
  );
}

/** Rows sorted by a key's reader, ties by a stable second key so the order never shifts between renders. */
export function sortRows<T, K extends string>(rows: readonly T[], sort: SortState<K>, read: Readonly<Record<K, (row: T) => number | string>>, tie?: (a: T, b: T) => number): readonly T[] {
  const sign = sort.direction === "ascending" ? 1 : -1;
  const reader = read[sort.key];
  return [...rows].sort((a, b) => {
    const left = reader(a);
    const right = reader(b);
    const order = typeof left === "string" && typeof right === "string" ? left.localeCompare(right) : Number(left) - Number(right);
    return sign * order || (tie ? tie(a, b) : 0);
  });
}
