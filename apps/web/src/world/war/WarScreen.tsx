import { AuthorityHelp } from "../../help/AuthorityHelp";
import { Card } from "@admin/ui-web";
import type { Campaign } from "@admin/engine";
import { place, type WarScreenReading } from "@admin/player-core";
import { EmptyState, IconLabel } from "@admin/ui-web";
import { MapView } from "../../map/MapView";
import { sidesLensId } from "../../map/lenses/set-lenses";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import { ActsReceipt, useNationCommit } from "../set/SetAct";
import { WarDecisions } from "./WarDecisions";
import { WarForces, WarRecord } from "./WarEvidence";
import { WarAssessment, WarOverview, WarSides } from "./WarOverview";
import { WarPowersSection } from "./WarPowers";
import "../set/set.css";
import "./war.css";

export function WarScreen({ campaign, reading }: { readonly campaign: Campaign; readonly reading: WarScreenReading }) {
  const acts = useNationCommit(campaign);
  const href = place.war(reading.id);
  return <Screen title={reading.title} icon="conflict" iconTone="red" eyebrow={`World · conflict workspace · ${reading.statusWord}`} lede={<Door href={place.world()}>Back to the World</Door>} screenClass="workspace" measure="data" camera="keep">
    <div className="war-workspace">
      <ActsReceipt acts={acts} again="Back to the war" />
      <WarOverview reading={reading} />
      <nav className="war-nav" aria-label="Conflict workspace sections">{[["war-sides", "The parties"], ["war-geography", "Theater"], ["war-forces", "Forces"], ["war-decisions", "Presidential decisions"], ["war-beats", "History"]].map(([id, label]) => <Door key={id} href={`${href}#${id}`}>{label}</Door>)}</nav>
      <div className="war-situation-grid">
        <Card role="region" className="war-panel war-map" aria-labelledby="war-geography"><h2 id="war-geography"><IconLabel icon="world" size={20}>Theater and participation</IconLabel></h2><MapView title="The war on the map" marks="forces" lens={acts.committed ? "delta" : sidesLensId(reading.id)} camera={`set:${reading.set}`} selection={reading.set} note="Each side in its own color. Participation and recorded placements, not a mapped front line or territorial control." height={300} /></Card>
        <WarAssessment reading={reading} />
      </div>
      <WarSides reading={reading} />
      <WarForces reading={reading} />
      <Card role="region" className="war-decisions" aria-labelledby="war-decisions-title" id="war-decisions">
        <div className="war-section-head"><h2 id="war-decisions-title"><IconLabel icon="order" size={22}>Presidential decisions</IconLabel></h2><span className="war-note">Compare · review · authorize · receipt</span></div>
        <AuthorityHelp topic="war-powers" compact />
        <p className="war-note">Operational decisions and congressional authority are separate. Each action requires presidential review.</p>
        {reading.over ? <div className="war-empty"><IconLabel icon="record" size={22}>This conflict has ended</IconLabel><p>The record and participants remain available. No new war decisions are offered here.</p></div> : <WarDecisions campaign={campaign} reading={reading} acts={acts} />}
        <WarPowersSection campaign={campaign} papers={reading.papers} acts={acts} />
      </Card>
      <WarRecord reading={reading} />
    </div>
  </Screen>;
}

export function NoSuchWar() {
  return <Screen title="No such war" eyebrow="World" screenClass="workspace" camera="keep"><EmptyState icon="emptyRecord" title="That war is not on the board"><Door href={place.world()}>Back to the world</Door></EmptyState></Screen>;
}
