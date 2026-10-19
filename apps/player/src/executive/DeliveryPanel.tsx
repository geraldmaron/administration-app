import { useState } from "react";
import { formatRatio, type BranchDelivery, type DeliveryRow } from "@admin/player-core";
import { Column, ReadingFrame, Row, Surface, Text, useMedia } from "@admin/ui";
import { termDoor } from "../handbook/term-door";
import { Segmented } from "@admin/ui/forms";
import { StaffingBadge } from "@admin/ui/dossier";
import { DeliveryBar, deliveryKeyEntries } from "./DeliveryBar";
import { InstitutionSeal, RowTo } from "./parts";
import { QUALITY_INK, qualityOf } from "./present";

type Sort = "delivery" | "lost" | "office";

const lostTotal = (row: DeliveryRow): number => row.lost.reduce((sum, part) => sum + part.value, 0);

export function sortDelivery(rows: readonly DeliveryRow[], sort: Sort): readonly DeliveryRow[] {
  const by = (a: DeliveryRow, b: DeliveryRow): number => (sort === "delivery" ? a.quality - b.quality : sort === "lost" ? lostTotal(b) - lostTotal(a) : 0) || a.name.localeCompare(b.name);
  return [...rows].sort(by);
}

function Line({ row, first }: { readonly row: DeliveryRow; readonly first: boolean }) {
  const media = useMedia();
  const lost = Math.round(lostTotal(row) * 100);
  return (
    <RowTo first={first} href={row.href} label={`Open ${row.name}`}>
      <Row gap="md" wrap padding="md" top>
        <Row gap="sm" flexBasis={media.phone ? "100%" : 280} flexGrow={1}>
          <InstitutionSeal id={row.institution} name={row.name} size={32} />
          <Column flex={1} gap="2xs">
            <Text variant="label">{row.name}</Text>
            {row.staffing === "confirmed" ? null : <StaffingBadge staffing={row.staffing} />}
          </Column>
        </Row>
        <Column flexBasis={media.phone ? "100%" : 260} flexGrow={2} gap="xs">
          <DeliveryBar row={row} />
          <Text variant="caption" tone="secondary">
            {row.reason}
          </Text>
        </Column>
        <Column width={media.phone ? "100%" : 96} alignItems={media.phone ? "baseline" : "flex-end"} flexDirection={media.phone ? "row" : "column"} gap={media.phone ? "sm" : 0}>
          <Text variant="title" tabular color={QUALITY_INK[qualityOf(row.quality)]}>
            {formatRatio(row.quality)}
          </Text>
          <Text variant="caption" tone="tertiary" tabular>
            {lost === 0 ? "0 pts lost" : `−${lost} pts lost`}
          </Text>
        </Column>
      </Row>
    </RowTo>
  );
}

/**
 * Every top-level office, each drawn as the parts that make its figure, in
 * the order chosen. The branch dial is in the headline row; this is where it
 * is read office by office.
 */
export function DeliveryPanel({ reading, bodiesCounted }: { readonly reading: BranchDelivery; readonly bodiesCounted: number }) {
  const [sort, setSort] = useState<Sort>("delivery");
  const rows = sortDelivery(reading.rows, sort);
  return (
    <Column gap="md" role="region" aria-label="Work done by each office">
      <Text variant="heading" role="heading" aria-level={2}>
        Work done by each office
      </Text>
      <Text variant="body">{reading.sentence}</Text>
      <Text variant="caption" tone="secondary">
        The overall figure, {formatRatio(reading.quality)}, averages {bodiesCounted} offices and agencies, and bigger staffs count more. These {reading.rows.length} are the top-level offices. Agencies inside a department count toward the overall figure, but you'll find them on the department's page.
      </Text>
      <Segmented<Sort> label="Order by" value={sort} onChange={setSort} options={[{ value: "delivery", label: "Weakest first" }, { value: "lost", label: "Most points lost" }, { value: "office", label: "Office" }]} />
      <ReadingFrame title="What builds each office's delivery" unit="% of its requested work, stacked from its parts" period="Now" legend={deliveryKeyEntries(reading.rows)} pressHint="Press an office to open it." help={{ meaning: "Each bar adds up the things that let an office get its work done: its capacity, its staffing, its budget, its morale and its leader. What it loses comes off the end. The figure at the right is what it delivers.", term: termDoor("policy-delivery", "policy delivery") }}>
        <Surface pad="none" overflow="hidden">
          {rows.map((row, index) => (
            <Line key={row.institution} row={row} first={index === 0} />
          ))}
        </Surface>
      </ReadingFrame>
    </Column>
  );
}
