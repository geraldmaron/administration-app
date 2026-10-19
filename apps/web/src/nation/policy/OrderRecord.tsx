import { selectDateOfTurn, type Campaign } from "@admin/engine";
import { formatDate, formatRatio, orderSignatures, place } from "@admin/player-core";
import { Card, CardHeader, CardContent, EmptyState, Gauge, Icon, Sheet, Tag } from "@admin/ui-web";
import { Door } from "../../shell/Door";

/** Read the stored signature; never reconstruct signed terms from today's mutable draft. */
export function OrderRecord({ campaign, order, recordId, onClose }: { readonly campaign: Campaign; readonly order: string; readonly recordId: string | undefined; readonly onClose: () => void }) {
  const record = campaign.orders.find((entry) => entry.id === recordId && entry.order === order);
  const row = record ? orderSignatures(campaign, order).find((entry) => entry.id === record.id) : undefined;
  const subject = record?.subject;
  const country = subject?.kind === "foreign" || subject?.kind === "entry-class" ? subject.nation : undefined;
  return <Sheet open={recordId !== undefined} onClose={onClose} title="Signed order record" placement="side" lead="Stored signature and current lifecycle. This is separate from the current unsigned template.">
    {record && row ? <Card><CardHeader><Tag tone={row.stage === "standing" ? "good" : "neutral"}>{row.stage === "standing" ? "In force" : "Recorded signature"}</Tag><h3>{row.name}</h3><p>{row.line}</p></CardHeader><CardContent>
      <dl className="order-terms"><div className="order-terms__row"><dt>Signed</dt><dd>{row.signed ? formatDate(row.signed) : "Date not recorded"}</dd></div><div className="order-terms__row"><dt>Signature reference</dt><dd>{record.id}</dd></div>
        <div className="order-terms__row"><dt>Court status</dt><dd>{record.review?.status ?? "No review recorded"}</dd></div>
        {record.rescindedTurn === undefined ? null : <div className="order-terms__row"><dt>Future operation ended</dt><dd>{formatDate(selectDateOfTurn(campaign, record.rescindedTurn))}</dd></div>}
        <div className="order-terms__row"><dt>Recorded subject</dt><dd>{country ? <Door href={place.country(country)}>{campaign.nations[country]?.base.identity.name ?? country}</Door> : subject?.kind === "state" ? <Door href={place.state(subject.state)}>{campaign.states[subject.state]?.base.name ?? subject.state} · {subject.cause}</Door> : subject?.kind === "ports-of-entry" ? "All federal ports of entry" : subject ? subject.kind.replaceAll("-", " ") : "No subject reference stored"}</dd></div>
        {record.legalReviewer ? <div className="order-terms__row"><dt>Legal reviewer</dt><dd><Door href={place.person(record.legalReviewer.person)}>{campaign.people[record.legalReviewer.person]?.base.name ?? "Recorded reviewer"}</Door></dd></div> : null}
      </dl>
      <Gauge shape="meter" label="Challenge risk assessed at signature" value={record.challengeChance} valueText={formatRatio(record.challengeChance)} caption="The stored assessment when this order was signed, not a newly calculated forecast." />
      <p className="policy-view__lead"><Icon name="record" size={16} /> Prior spending and court history remain on the record after rescission. Complete historical terms are not reconstructed where the save does not store them.</p>
    </CardContent></Card> : <EmptyState icon="emptyRecord" title="Signature not found">This signature reference does not identify a record of this order in the current administration.</EmptyState>}
  </Sheet>;
}
