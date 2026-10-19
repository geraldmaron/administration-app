import type { Campaign, CommodityId } from "@admin/engine";
import { commodityDetail, commodityHref, place } from "@admin/player-core";
import { Bar, Collection, Flag, Icon, ShareBar } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";
import { COMMODITY_GLYPH } from "../../shell/glyphs";

const percent = (share: number): string => `${Math.round(share * 1000) / 10}%`;

/** Current relationships stay current while the neighboring price chart replays history. */
export function CommodityDetail({ campaign, id, onCommodity }: { readonly campaign: Campaign; readonly id: CommodityId; readonly onCommodity?: (id: CommodityId) => void }) {
  const detail = commodityDetail(campaign, id);
  const leaders = detail.suppliers.slice(0, 3);
  const others = detail.suppliers.slice(3).reduce((sum, supplier) => sum + supplier.share, 0);
  const assigned = detail.suppliers.reduce((sum, supplier) => sum + supplier.share, 0);
  const unassigned = Math.max(0, 1 - assigned);
  const segments = [...leaders.map((supplier) => ({ id: supplier.nation, label: supplier.name, share: supplier.share, figure: percent(supplier.share) })), ...(others > 0 ? [{ id: "others", label: "Other suppliers", share: others, figure: percent(others) }] : []), ...(unassigned > .0001 ? [{ id: "unassigned", label: "Not assigned", share: unassigned, figure: percent(unassigned), tone: "neutral" as const }] : [])];
  return <div className="market-evidence">
    <section className="eco-panel" aria-labelledby="commodity-suppliers">
      <h2 id="commodity-suppliers" className="eco-panel__title"><Icon name="world" size={22} />Supply footprint</h2>
      <p className="nation-note">Share of world supply · current snapshot · all bars use 0–100%.</p>
      <ShareBar label="World supply" shape="ring" segments={segments} />
      {unassigned > .0001 ? <p className="nation-note">{percent(assigned)} of world supply is assigned to suppliers in the dataset. The remaining {percent(unassigned)} is not attributed to a country.</p> : null}
      <Collection items={detail.suppliers} initial={5} noun="suppliers" className="eco-commodity__list" empty="No supplier share is recorded." render={(supplier) => <li className="market-supplier" key={supplier.nation}>
        <Door href={place.country(supplier.nation)} className="market-supplier__name"><Flag name={supplier.name} src={nationFlagUrl(supplier.nation)} height={16} decorative />{supplier.name}</Door>
        <span className="market-supplier__share">{percent(supplier.share)}</span><Bar label={`${supplier.name}: ${percent(supplier.share)} of world supply`} value={supplier.share} />
      </li>} />
      <div className="market-stock"><span>Stocks against normal cover</span><strong>{Math.round(detail.row.stocks * 100)}%</strong></div>
    </section>
    <section className="eco-panel market-connections" aria-labelledby="commodity-connections">
      <h2 id="commodity-connections" className="eco-panel__title"><Icon name="graph" size={22} />Follow the connection</h2>
      <p className="nation-note">Current supply → {detail.row.name.toLowerCase()} → domestic exposure. These are modeled channels, not quantified contributions.</p>
      <div className="market-flow" aria-label="Current supply and modeled exposure relationship">
        <div className="market-flow__node"><span className="market-label">Leading suppliers</span>{leaders.map((supplier) => <Door key={supplier.nation} href={place.country(supplier.nation)}><Flag name={supplier.name} src={nationFlagUrl(supplier.nation)} height={14} decorative />{supplier.name}</Door>)}</div>
        <span className="market-flow__edge" aria-hidden="true">→</span>
        <div className="market-flow__node market-flow__subject"><Icon name={COMMODITY_GLYPH[id]} size={30} /><strong>{detail.row.name}</strong><span className="nation-note">{detail.family}</span></div>
        <span className="market-flow__edge" aria-hidden="true">→</span>
        <div className="market-flow__node"><span className="market-label">Domestic exposure</span><Icon name="building" size={24} />{detail.exposureHref ? <Door href={detail.exposureHref}>{detail.row.reader}</Door> : <strong>{detail.row.reader}</strong>}</div>
      </div>
      <h3 className="market-label">What is moving it now</h3>
      <Collection items={detail.shocks} initial={4} noun="pressures" className="eco-commodity__list market-pressures" empty="No supply disruption is recorded this week." render={(shock) => <li key={shock.cause}><Icon name="caution" size={16} /><div><strong>{shock.cause}</strong><p>{shock.share}</p></div></li>} />
      {detail.shocks.length > 0 ? <p className="nation-note">Pressures may overlap; these supply shares are not added into a single loss total.</p> : null}
      {detail.inputs.length > 0 ? <><h3 className="market-label">Inputs with a lag</h3><ul className="eco-commodity__list">{detail.inputs.map((input) => <li key={input.id}><Door href={commodityHref(input.id)} onClick={onCommodity ? (event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onCommodity(input.id); } } : undefined}><Icon name={COMMODITY_GLYPH[input.id]} size={18} /> {input.text}</Door></li>)}</ul></> : null}
    </section>
  </div>;
}
