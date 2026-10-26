import type { Campaign } from "@admin/engine";
import { formatDate, orderPipeline, type OrderStage, type PipelineRow } from "@admin/player-core";
import { Pane, CardLink, Column, Icon, ReadingFrame, Row, Segmented, Text, TextInput, type IconName } from "@admin/ui";
import { Collection, ViewTabs } from "@admin/ui/nation";
import { StackedBar, segmentKeyEntries, type BarSegment } from "@admin/ui/news";
import { go } from "../../shell/navigate";

const STAGE_ICONS: Readonly<Record<OrderStage, IconName>> = { rulemaking: "pending", court: "court", desk: "sign", standing: "active", undone: "archive", shut: "locked" };
const STAGE_INK = { rulemaking: "warningInk", court: "gold", desk: "accent", standing: "successInk", undone: "colorTertiary", shut: "colorTertiary" } as const;

export type OrderSearch = { readonly orderScope?: "issued" | "catalogue"; readonly orderStatus?: string; readonly orderQuery?: string };

function OrderRow({ row }: { readonly row: PipelineRow }) {
  return (
    <CardLink label={`Open the order ${row.name}. ${row.line}`} href={row.href} onPress={() => go(row.href)} flexDirection="row" alignItems="flex-start" gap="sm" pad="sm" radius="chip" borderLeftWidth={4} borderLeftColor={STAGE_INK[row.stage]}>
      <Icon name={STAGE_ICONS[row.stage]} size={20} tone={STAGE_INK[row.stage]} />
      <Column flex={1} gap="2xs">
        <Text variant="label">
          {row.name}
        </Text>
        <Text variant="caption" tone="secondary">
          {row.signed ? `Signed ${formatDate(row.signed)}. ` : ""}
          {row.line}
        </Text>
      </Column>
      <Icon name="chevron" size={14} tone="colorTertiary" />
    </CardLink>
  );
}

/** Templates describe instruments the President could sign; signatures describe what the President actually issued. */
export function OrderPipeline({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search: OrderSearch; readonly onSearch: (next: OrderSearch) => void }) {
  const stages = orderPipeline(campaign);
  const all = stages.flatMap((stage) => stage.rows);
  const signed = all.filter((row) => row.signed);
  const catalogue = all.filter((row) => !row.signed);
  const scope = search.orderScope ?? (signed.length > 0 ? "issued" : "catalogue");
  const query = search.orderQuery ?? "";
  const rows = scope === "issued" ? signed : catalogue;
  const available = stages.filter((stage) => rows.some((row) => row.stage === stage.stage));
  const chosen = available.some((stage) => stage.stage === search.orderStatus) ? (search.orderStatus as string) : "all";
  const byStage: readonly BarSegment[] = available.map((stage) => ({ key: stage.stage, label: stage.label, count: rows.filter((row) => row.stage === stage.stage).length, ink: STAGE_INK[stage.stage] }));
  const found = rows.filter((row) => (chosen === "all" || row.stage === chosen) && `${row.name} ${row.line}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Pane title="Executive orders" icon="order" line={`${signed.length} signed · ${catalogue.length} not signed yet. An unsigned order is a draft waiting for you.`}>
      <ViewTabs<"issued" | "catalogue"> label="Which orders" tabs={[{ id: "issued", label: "Signed", count: signed.length }, { id: "catalogue", label: "Not signed yet", count: catalogue.length }]} selected={scope} onSelect={(next) => onSearch({ ...search, orderScope: next, orderStatus: undefined })} />
      {rows.length > 0 ? (
        <ReadingFrame title={`${scope === "issued" ? "Signed orders" : "Unsigned orders"} by status`} unit="Number of orders" legend={segmentKeyEntries(byStage)} help={{ meaning: "The bar is every order in this list, split by where it stands. A wider part means more orders. The colored edge on each order below matches its part of the bar." }}>
          <StackedBar label={`${scope === "issued" ? "Signed orders" : "Unsigned orders"} by status`} segments={byStage} height={14} />
        </ReadingFrame>
      ) : null}
      <Row gap="md" wrap top>
        <Column flex={1} minWidth={240}>
          <TextInput kind="search" label="Find an executive order" icon="order" value={query} onChangeText={(text) => onSearch({ ...search, orderQuery: text || undefined })} placeholder="Find an executive order" />
        </Column>
        <Segmented label="Order status" value={chosen} onChange={(next) => onSearch({ ...search, orderStatus: next === "all" ? undefined : next })} options={[{ value: "all", label: "All" }, ...available.map((stage) => ({ value: stage.stage, label: stage.label }))]} />
      </Row>
      <Text variant="caption" tone="secondary" role="status">
        {found.length} of {rows.length} {scope === "issued" ? "signed orders" : "unsigned orders"} shown.
      </Text>
      <Collection items={found} initial={12} noun={scope === "issued" ? "signed orders" : "unsigned orders"} resetKey={`${scope}:${chosen}:${query}`} empty={scope === "issued" ? "No signed order matches. Orders you haven't signed are under Not signed yet." : "No order matches these filters."} render={(row) => <OrderRow key={row.id} row={row} />} />
    </Pane>
  );
}
