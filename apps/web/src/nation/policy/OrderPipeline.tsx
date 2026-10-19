import type { Campaign } from "@admin/engine";
import { formatDate, orderPipeline, type OrderStage, type PipelineRow } from "@admin/player-core";
import { Card, CardHeader, CardContent, Choice, Collection, Field, Icon, ShareBar, Tabs, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import type { Valence } from "../../shell/valence";

const STAGE_ICONS: Readonly<Record<OrderStage, IconName>> = {
  rulemaking: "pending",
  court: "court",
  desk: "sign",
  standing: "active",
  undone: "archive",
  shut: "locked",
};

const STAGE_VALENCE: Readonly<Record<OrderStage, Valence>> = { rulemaking: "watch", court: "watch", desk: "neutral", standing: "good", undone: "neutral", shut: "neutral" };

function OrderRow({ row }: { readonly row: PipelineRow }) {
  return (
    <li className="order-board__row ui-card-door ui-valence-bar" data-stage={row.stage} data-valence={STAGE_VALENCE[row.stage]}>
      <Icon name={STAGE_ICONS[row.stage]} size={20} className="order-board__glyph" />
      <Door href={row.href} className="order-board__name ui-card-door__link">
        {row.name}
      </Door>
      <span className="order-board__line">
        {row.signed ? `Signed ${formatDate(row.signed)}. ` : ""}
        {row.line}
      </span>
    </li>
  );
}

export type OrderCollectionSearch = {
  readonly orderScope?: "issued" | "catalogue" | undefined;
  readonly orderStatus?: string | undefined;
  readonly orderQuery?: string | undefined;
};

/** Templates describe available instruments; signatures describe what the President actually issued. */
export function OrderPipeline({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search: OrderCollectionSearch; readonly onSearch: (next: OrderCollectionSearch) => void }) {
  const stages = orderPipeline(campaign);
  const signed = stages.flatMap((stage) => stage.rows).filter((row) => row.signed);
  const catalogue = stages.flatMap((stage) => stage.rows).filter((row) => !row.signed);
  const scope = search.orderScope ?? (signed.length > 0 ? "issued" : "catalogue");
  const status = search.orderStatus ?? "all";
  const query = search.orderQuery ?? "";
  const rows = scope === "issued" ? signed : catalogue;
  const available = stages.filter((stage) => rows.some((row) => row.stage === stage.stage));
  const chosen = available.some((stage) => stage.stage === status) ? status : "all";
  const found = rows.filter((row) => (chosen === "all" || row.stage === chosen) && `${row.name} ${row.line}`.toLowerCase().includes(query.toLowerCase()));
  return <Card id="order-board" className="order-board" role="region" aria-labelledby="order-board-title">
    <CardHeader><h3 id="order-board-title" className="order-rail__title"><Icon name="order" size={20} />Executive orders</h3><p className="policy-view__lead">{signed.length} issued signatures · {catalogue.length} instrument templates. A template is not an issued order. Select a signed row to inspect its exact record.</p></CardHeader>
    <CardContent className="order-board__content">
      <Tabs label="Order collection" tabs={[{ id: "issued", label: "Issued signatures", count: signed.length }, { id: "catalogue", label: "Order catalogue", count: catalogue.length }]} selected={scope} onSelect={(next) => onSearch({ ...search, orderScope: next as "issued" | "catalogue", orderStatus: undefined })}>
        <div className="order-board__content">
          {rows.length > 0 ? <ShareBar label={`${scope === "issued" ? "Issued signatures" : "Catalogue templates"} by status`} segments={available.map((stage) => ({ id: stage.stage, label: stage.label, share: rows.filter((row) => row.stage === stage.stage).length, figure: String(rows.filter((row) => row.stage === stage.stage).length), icon: <Icon name={STAGE_ICONS[stage.stage]} size={16} /> }))} /> : null}
          <div className="order-board__filters"><Field label="Find an executive order">{(control) => <input {...control} type="search" className="ui-input" value={query} onChange={(event) => onSearch({ ...search, orderQuery: event.target.value || undefined })} />}</Field><Choice legend="Order status" layout="segments" value={chosen} onChange={(next) => onSearch({ ...search, orderStatus: next === "all" ? undefined : next })} options={[{ value: "all", label: "All statuses" }, ...available.map((stage) => ({ value: stage.stage, label: stage.label }))]} /></div>
          <p className="policy-view__lead" role="status">{found.length} of {rows.length} {scope === "issued" ? "signatures" : "templates"} shown.</p>
          <Collection items={found} initial={12} noun={scope === "issued" ? "signatures" : "templates"} resetKey={`${scope}:${chosen}:${query}`} className="order-board__rows" empty={scope === "issued" ? "No issued signature matches. The catalogue contains instruments you can investigate." : "No instrument matches these filters."} render={(row) => <OrderRow key={row.id} row={row} />} />
        </div>
      </Tabs>
    </CardContent>
  </Card>;
}
