import { useMemo, useState, type ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { Pressable } from "../primitives/Button";
import { ScrollStrip } from "../primitives/ScrollStrip";
import { PressRow } from "../primitives/PressRow";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { ordinal, rankColumn } from "./rank";

export type MatrixMetric = {
  readonly id: string;
  readonly label: string;
  readonly format: (value: number) => string;
  readonly better: "up" | "down";
  /** A benchmark the column is judged against, said under the header: "G7 median 2.1%". */
  readonly benchmark?: { readonly label: string; readonly value: number };
};

export type MatrixRow = {
  readonly id: string;
  readonly label: string;
  /** A flag, a seal or a portrait before the name. */
  readonly emblem?: ReactNode;
  readonly values: Readonly<Record<string, number | null | undefined>>;
  /** The President's own government or record: drawn first-class and never sorted out of sight. */
  readonly self?: boolean;
  /** A benchmark row (a median, a historical presidency) rather than an entity. */
  readonly reference?: boolean;
  readonly onPress?: () => void;
};

const FILL = ["dangerSoft", "warningFill", "pendingFill", "infoFill", "successFill"] as const;

function bandOf(percentile: number): (typeof FILL)[number] {
  return FILL[Math.min(FILL.length - 1, Math.floor(percentile * FILL.length - 1e-9))] ?? "pendingFill";
}

/** One entity's row: when it opens the entity's file, the whole row is the door, not only its name. */
function MatrixLine({ row, children }: { readonly row: MatrixRow; readonly children: ReactNode }) {
  const fill = row.self ? "infoFill" : row.reference ? "backgroundStrong" : "surface";
  if (!row.onPress) {
    return (
      <Row role="row" borderBottomWidth={1} borderBottomColor="borderColor" backgroundColor={fill}>
        {children}
      </Row>
    );
  }
  return (
    <PressRow role="row" label={`Open ${row.label}`} onPress={row.onPress} flexDirection="row" alignItems="center" borderBottomWidth={1} borderBottomColor="borderColor" outlineOffset={-2} backgroundColor={{ default: fill, hover: "surfaceHover", press: "backgroundPress" }}>
      {children}
    </PressRow>
  );
}

/**
 * Entities against each other on several readings at once: the U.S. beside
 * other governments, states beside states, this presidency beside earlier
 * ones. Each cell carries the figure and its rank in the column; the cell's
 * fill is the row's standing (bottom fifth to top fifth), never the only
 * signal. Sorting by any column keeps the President's own row in view. The
 * title names the table for a screen reader; the frame around it carries the
 * visible heading, and a column hidden past an edge shows an arrow.
 */
export function CompareMatrix({ title, metrics, rows, initialSort }: { readonly title: string; readonly metrics: readonly MatrixMetric[]; readonly rows: readonly MatrixRow[]; readonly initialSort?: string }) {
  const media = useMedia();
  const [sortBy, setSortBy] = useState(initialSort ?? metrics[0]?.id);
  const ranks = useMemo(() => {
    const ranked = rows.filter((row) => !row.reference);
    return Object.fromEntries(
      metrics.map((metric) => {
        const column = rankColumn(ranked.map((row) => row.values[metric.id]), metric.better);
        return [metric.id, new Map(ranked.map((row, i) => [row.id, column[i]]))];
      }),
    );
  }, [metrics, rows]);
  const sorted = useMemo(() => {
    if (!sortBy) return rows;
    const column = ranks[sortBy];
    return [...rows].sort((a, b) => {
      if (a.reference !== b.reference) return a.reference ? 1 : -1;
      return (column?.get(a.id)?.rank ?? Number.POSITIVE_INFINITY) - (column?.get(b.id)?.rank ?? Number.POSITIVE_INFINITY);
    });
  }, [rows, ranks, sortBy]);
  const nameWidth = media.phone ? 132 : 200;
  const cellWidth = media.phone ? 112 : 140;
  return (
    <View gap="sm">
      <ScrollStrip noun="columns">
        <View role="table" aria-label={title} borderWidth={1} borderColor="borderColor" borderRadius="card" overflow="hidden" backgroundColor="surface">
          <Row role="row" backgroundColor="surfaceRaised" borderBottomWidth={1} borderBottomColor="borderColorStrong">
            <View width={nameWidth} padding="sm" role="columnheader">
              <Text variant="caption" weight="strong" tone="secondary">
                Government
              </Text>
            </View>
            {metrics.map((metric) => {
              const active = metric.id === sortBy;
              return (
                <Pressable key={metric.id} width={cellWidth} padding="sm" borderRadius={0} onPress={() => setSortBy(metric.id)} role="columnheader" aria-sort={active ? (metric.better === "up" ? "descending" : "ascending") : "none"} aria-label={`Sort by ${metric.label}`}>
                  <Text variant="caption" weight="strong" tone={active ? "accent" : "secondary"} numberOfLines={2}>
                    {metric.label}
                    {active ? " ▾" : ""}
                  </Text>
                  {metric.benchmark ? (
                    <Text variant="caption" tone="tertiary" numberOfLines={1}>
                      {metric.benchmark.label} {metric.format(metric.benchmark.value)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </Row>
          {sorted.map((row) => (
            <MatrixLine key={row.id} row={row}>
              <Row width={nameWidth} padding="sm" role="rowheader" gap="sm" borderLeftWidth={row.self ? 4 : 0} borderLeftColor="accent">
                {row.emblem}
                <Text variant="label" weight={row.self ? "strong" : "medium"} numberOfLines={2} flex={1} fontStyle={row.reference ? "italic" : "normal"}>
                  {row.label}
                </Text>
              </Row>
              {metrics.map((metric) => {
                const value = row.values[metric.id];
                const rank = ranks[metric.id]?.get(row.id);
                return (
                  <View key={metric.id} width={cellWidth} padding="sm" role="cell" backgroundColor={rank && !row.reference ? bandOf(rank.percentile) : "transparent"} borderLeftWidth={1} borderLeftColor="borderColor">
                    <Text variant="label" tabular weight={row.self ? "strong" : "regular"}>
                      {value === null || value === undefined ? "No data" : metric.format(value)}
                    </Text>
                    {rank ? (
                      <Text variant="caption" tone="secondary">
                        {ordinal(rank.rank)} of {rank.of}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </MatrixLine>
          ))}
        </View>
      </ScrollStrip>
    </View>
  );
}
