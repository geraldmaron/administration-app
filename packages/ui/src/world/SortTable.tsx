import { useMemo, useState, type ReactNode } from "react";
import { ScrollView } from "react-native";
import { View, useMedia } from "@tamagui/core";
import { Button, Pressable } from "../primitives/Button";
import { useMeasuredWidth } from "../layout/Fit";
import { PressRow } from "../primitives/PressRow";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** Under this container width the rows stack with their labels, whatever the window is. */
const STACK_BELOW = 520;

export type SortValue = string | number | undefined;

export type TableColumn<T> = {
  readonly id: string;
  readonly label: string;
  /** A second line under the header: the unit or the window. */
  readonly detail?: string;
  readonly width?: number;
  readonly align?: "start" | "end";
  /**
   * A cell can hold an `InlineField` to edit in place: a press inside the cell
   * goes to the field, so editing never opens or selects the row.
   */
  readonly render: (row: T) => ReactNode;
  /** Present, the header sorts by it; absent, the column does not sort (counts in different units, say). */
  readonly sort?: (row: T) => SortValue;
  /** Which way the first press sorts. */
  readonly first?: "ascending" | "descending";
};

export type SortState = { readonly key: string; readonly direction: "ascending" | "descending" };

/** Missing values sort last either way: an unread government has no figure to rank. */
export function sortRows<T>(rows: readonly T[], value: ((row: T) => SortValue) | undefined, direction: SortState["direction"], tie?: (a: T, b: T) => number): readonly T[] {
  if (!value) return rows;
  const sign = direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === undefined || right === undefined) return left === right ? (tie?.(a, b) ?? 0) : left === undefined ? 1 : -1;
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return order !== 0 ? order * sign : (tie?.(a, b) ?? 0);
  });
}

export type SortTableProps<T> = {
  /** Read to a screen reader as the table's name. */
  readonly caption: string;
  readonly columns: readonly TableColumn<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  readonly initialSort?: SortState;
  /** Rows shown before "Show more". */
  readonly page?: number;
  readonly empty: string;
  /** Applied to equal values, so the order is stable. */
  readonly tie?: (a: T, b: T) => number;
  /** A row that should read as a whole: the President's own, a flagged one. */
  readonly highlight?: (row: T) => boolean;
  /** The narrow reading: one card per row; defaults to the columns as label and value. */
  readonly card?: (row: T) => ReactNode;
  /**
   * Each row is a door: the whole row opens it, not a name inside it. The
   * label is what a screen reader says for the row: "Open France's file".
   */
  readonly rowPress?: RowPress<T>;
  /** The row the screen is showing now; it is marked and carries aria-current. */
  readonly selected?: (row: T) => boolean;
};

export type RowPress<T> = {
  readonly href?: (row: T) => string;
  readonly onPress: (row: T) => void;
  readonly label: (row: T) => string;
  /** A row with nowhere to go stays a plain row rather than a door that does nothing. */
  readonly enabled?: (row: T) => boolean;
};

function pressFor<T>(row: T, press: RowPress<T> | undefined): RowPress<T> | undefined {
  return press && press.enabled?.(row) !== false ? press : undefined;
}

function Header<T>({ column, sort, onSort }: { readonly column: TableColumn<T>; readonly sort: SortState | undefined; readonly onSort: (key: string) => void }) {
  const active = sort?.key === column.id;
  const arrow = active ? (sort?.direction === "ascending" ? " ▴" : " ▾") : "";
  const body = (
    <Column>
      <Text variant="caption" weight="strong" tone={active ? "accent" : "secondary"} textAlign={column.align === "end" ? "right" : "left"}>
        {column.label}
        {arrow}
      </Text>
      {column.detail ? (
        <Text variant="caption" tone="tertiary" textAlign={column.align === "end" ? "right" : "left"}>
          {column.detail}
        </Text>
      ) : null}
    </Column>
  );
  if (!column.sort) {
    return (
      <View width={column.width ?? 140} padding="sm" role="columnheader">
        {body}
      </View>
    );
  }
  return (
    <Pressable width={column.width ?? 140} padding="sm" borderRadius={0} role="columnheader" aria-sort={active ? sort?.direction : "none"} aria-label={`Sort by ${column.label}`} onPress={() => onSort(column.id)}>
      {body}
    </Pressable>
  );
}

function DefaultCard<T>({ row, columns }: { readonly row: T; readonly columns: readonly TableColumn<T>[] }) {
  const [lead, ...rest] = columns;
  return (
    <Column gap="xs">
      {lead ? lead.render(row) : null}
      <Row gap="md" wrap>
        {rest.map((column) => (
          <Column key={column.id} minWidth={120} flexBasis={140} flexGrow={1} gap="2xs">
            <Text variant="caption" tone="tertiary">
              {column.label}
            </Text>
            {column.render(row)}
          </Column>
        ))}
      </Row>
    </Column>
  );
}

type LineProps<T> = { readonly row: T; readonly lit: boolean; readonly press: RowPress<T> | undefined; readonly children: ReactNode };

/**
 * One table row: the whole row is the door when the table has one. A
 * `chosen` of undefined means the table marks no selection, so no edge is
 * drawn and the cells stay aligned with the header.
 */
function TableLine<T>({ row, lit, chosen, press, children }: LineProps<T> & { readonly chosen: boolean | undefined }) {
  const fill = lit || chosen ? "infoFill" : "surface";
  const edge = chosen === undefined ? {} : { borderLeftWidth: 3, borderLeftColor: chosen ? "accent" : "transparent" } as const;
  if (!press) {
    return (
      <Row role="row" borderBottomWidth={1} borderBottomColor="borderColor" backgroundColor={fill} top aria-current={chosen ? "true" : undefined} {...edge}>
        {children}
      </Row>
    );
  }
  return (
    <PressRow href={press.href?.(row)} role="row" label={press.label(row)} selected={chosen} onPress={() => press.onPress(row)} flexDirection="row" alignItems="flex-start" borderBottomWidth={1} borderBottomColor="borderColor" backgroundColor={{ default: fill, hover: "surfaceHover", press: "backgroundPress" }} outlineOffset={-2} {...edge}>
      {children}
    </PressRow>
  );
}

/** One row as a card on a phone; the whole card is the door when the table has one. */
function PhoneCard<T>({ row, lit, chosen, press, children }: LineProps<T> & { readonly chosen: boolean }) {
  const border = chosen ? 2 : 1;
  const frame = { padding: chosen ? 11 : "md", borderRadius: "card", borderWidth: border, borderColor: chosen || lit ? "accent" : "borderColor" } as const;
  if (!press) {
    return (
      <View role="listitem" {...frame} backgroundColor={lit || chosen ? "infoFill" : "surface"} aria-current={chosen ? "true" : undefined}>
        {children}
      </View>
    );
  }
  return (
    <View role="listitem">
      <PressRow href={press.href?.(row)} role="link" label={press.label(row)} selected={chosen} onPress={() => press.onPress(row)} minHeight={44} {...frame} backgroundColor={{ default: lit || chosen ? "infoFill" : "surface", hover: "surfaceHover", press: "backgroundPress" }}>
        {children}
      </PressRow>
    </View>
  );
}

/**
 * A full-data collection: every row on the columns it is compared by, sorted
 * by any sortable header, paged with "Show more". In a narrow container (a
 * phone, or a pane under 520px on a wide screen) each row becomes a card with
 * the same fields named, so nothing is cut to fit or scrolled sideways.
 */
export function SortTable<T>({ caption, columns, rows, rowKey, initialSort, page = 20, empty, tie, highlight, card, rowPress, selected }: SortTableProps<T>) {
  const media = useMedia();
  const [width, onLayout] = useMeasuredWidth();
  const [sort, setSort] = useState<SortState | undefined>(initialSort);
  const [shown, setShown] = useState(page);
  const sorted = useMemo(() => sortRows(rows, columns.find((column) => column.id === sort?.key)?.sort, sort?.direction ?? "ascending", tie), [rows, columns, sort, tie]);
  const onSort = (key: string) => {
    const column = columns.find((entry) => entry.id === key);
    setSort((current) => (current?.key === key ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" } : { key, direction: column?.first ?? "ascending" }));
    setShown(page);
  };
  const visible = sorted.slice(0, shown);
  if (rows.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        {empty}
      </Text>
    );
  }
  const more = sorted.length > shown ? (
    <Button kind="secondary" size="compact" icon="expandPanel" onPress={() => setShown((count) => count + page)}>
      {`Show more (${sorted.length - shown} of ${sorted.length} not shown)`}
    </Button>
  ) : null;
  if (!media.desktop || (width !== undefined && width < STACK_BELOW)) {
    const sortable = columns.filter((column) => column.sort);
    return (
      <Column gap="sm" role="list" aria-label={caption} onLayout={onLayout}>
        {sortable.length > 0 ? (
          <Row gap="xs" wrap role="group" aria-label="Sort by">
            {sortable.map((column) => (
              <Button key={column.id} kind={sort?.key === column.id ? "primary" : "secondary"} size="compact" onPress={() => onSort(column.id)}>
                {`${column.label}${sort?.key === column.id ? (sort.direction === "ascending" ? " ▴" : " ▾") : ""}`}
              </Button>
            ))}
          </Row>
        ) : null}
        {visible.map((row) => (
          <PhoneCard key={rowKey(row)} row={row} lit={highlight?.(row) === true} chosen={selected?.(row) === true} press={pressFor(row, rowPress)}>
            {card ? card(row) : <DefaultCard row={row} columns={columns} />}
          </PhoneCard>
        ))}
        {more}
      </Column>
    );
  }
  return (
    <Column gap="sm" onLayout={onLayout}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <Column role="table" aria-label={caption} borderWidth={1} borderColor="borderColor" borderRadius="card" overflow="hidden">
          <Row role="row" backgroundColor="surfaceRaised" borderBottomWidth={1} borderBottomColor="borderColorStrong" top {...(selected ? { borderLeftWidth: 3, borderLeftColor: "transparent" } : {})}>
            {columns.map((column) => (
              <Header key={column.id} column={column} sort={sort} onSort={onSort} />
            ))}
          </Row>
          {visible.map((row) => (
            <TableLine key={rowKey(row)} row={row} lit={highlight?.(row) === true} chosen={selected?.(row)} press={pressFor(row, rowPress)}>
              {columns.map((column, index) => (
                <View key={column.id} width={column.width ?? 140} padding="sm" role={index === 0 ? "rowheader" : "cell"} alignItems={column.align === "end" ? "flex-end" : "flex-start"}>
                  {column.render(row)}
                </View>
              ))}
            </TableLine>
          ))}
        </Column>
      </ScrollView>
      {more}
    </Column>
  );
}
