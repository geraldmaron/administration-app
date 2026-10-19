import type { Campaign } from "@admin/engine";
import { formatRatio, personFile, place, type OverviewOffice } from "@admin/player-core";
import { Icon, Portrait, Steps } from "@admin/ui-web";
import { useMemo } from "react";
import { institutionArtwork } from "../../media/authority";
import { Door } from "../../shell/Door";
import { toneOf } from "../../shell/valence";
import { DeliveryBar, DeliveryLegend } from "./Delivery";
import { StaffingBadge } from "./StaffingBadge";

export function OfficeInspector({ campaign, office }: { readonly campaign: Campaign; readonly office: OverviewOffice }) {
  const { node, delivery } = office;
  const artwork = institutionArtwork(node.institution);
  const file = useMemo(() => node.holder ? personFile(campaign, node.holder) : undefined, [campaign, node.holder]);
  return <section className="office-inspector" aria-label={`Selected office: ${node.name}`}>
    {artwork ? <img src={artwork.src} className="office-inspector__watermark" alt="" /> : null}
    <header className="office-inspector__header">{artwork ? <img src={artwork.src} alt={`${artwork.name} insignia`} /> : null}<span className="command-eyebrow">Office assessment</span><StaffingBadge staffing={node.staffing} /></header>
    <h3>{node.name}</h3>
    <div className="office-inspector__identity"><Portrait name={node.holderName ?? "Unfilled office"} size="lg" decorative /><div>{node.holder ? <Door href={place.person(node.holder)}>{node.holderName}</Door> : <strong>Vacant chair</strong>}<p>{node.title}</p></div></div>
    {delivery ? <div className="office-inspector__delivery"><div className="command-measure"><strong>{formatRatio(delivery.quality)}</strong><span>delivery</span></div><DeliveryBar row={delivery} /><DeliveryLegend rows={[delivery]} /><p>{delivery.reason}</p></div> : <p className="office-inspector__unmeasured"><Icon name="review" size={16} />{office.section === "independent" ? "Independent mandate · no executive delivery score" : "No delivery assessment recorded for this office"}</p>}
    {file ? <div className="office-inspector__assessments"><span className="command-eyebrow">Staff assessment · four ordinal bands</span><div>{file.readings.filter((r) => r.key !== "charisma").map((reading) => <Steps key={reading.key} label={reading.label} lit={reading.band + 1} word={reading.word} tone={reading.kind === "pressure" ? "reading" : toneOf(reading.stance)} showBand />)}</div></div> : null}
    <OfficeMatters office={office} />
    <footer><Door href={node.href} className="ui-button ui-button--primary">Open office <Icon name="open" size={16} /></Door>{node.holder ? <Door href={`${place.record()}?subject=${encodeURIComponent(`person:${node.holder}`)}`}>Recorded activity</Door> : null}</footer>
  </section>;
}

function OfficeMatters({ office }: { readonly office: OverviewOffice }) {
  return <div className="office-inspector__matters">
    {office.services ? <p><strong>{office.services.good}/{office.services.total}</strong> services keeping up</p> : null}
    {office.agencies > 0 ? <p><strong>{office.agencies}</strong> agencies · <strong>{office.agenciesNeedingYou}</strong> need you</p> : null}
    {office.node.alerts.map((alert) => <p key={alert.kind}><Icon name="caution" size={14} />{alert.text}</p>)}
    {office.nominee ? <p><Icon name="appoint" size={14} />{office.nominee.name} · {office.nominee.stage}</p> : null}
  </div>;
}
