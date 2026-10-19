import { Card } from "@admin/ui-web";
import type { ReactNode } from "react";
import { place, type NationFile } from "@admin/player-core";
import { BarRows, Icon, Stat, StatRow, Steps, StepsTable } from "@admin/ui-web";
import { toneOf } from "../../shell/valence";
import { Place } from "./Place";
import { FORCE_STEPS, TEMPERAMENT_WORD, VITAL_GLYPH } from "./country-glyphs";
import { PowerStats, TieFlags } from "./CountryFigures";
import { COUNTRY_VIEW_GLYPH, COUNTRY_VIEW_LABELS } from "./country-views";
import type { CountryView } from "./country-search";
import "./country.css";

function Brief({ view, children, onView }: { readonly view: CountryView; readonly children: ReactNode; readonly onView: (view: CountryView) => void }) {
  return (
    <Card role="region" className="country-brief ui-card-door" aria-labelledby={`country-brief-${view}`}>
      <div className="country-brief__head">
        <h3 id={`country-brief-${view}`} className="country-group__heading">
          <Icon name={COUNTRY_VIEW_GLYPH[view]} size={20} />
          <button type="button" className="country-brief__title ui-card-door__link" onClick={() => onView(view)}>
            {COUNTRY_VIEW_LABELS[view]}
          </button>
        </h3>
        <Icon name="chevron" size={16} />
      </div>
      <div className="country-brief__figures">{children}</div>
    </Card>
  );
}

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

function EconomyBrief({ file }: { readonly file: NationFile }) {
  const { trade, vitals } = file;
  const tradeTop = Math.max(trade.imports, trade.exports, 1);
  const shown = vitals.filter((vital) => vital.key !== "living" && !vital.unread);
  return (
    <>
      <PowerStats power={file.power} />
      <StepsTable label="How its economy is doing">
        {shown.map((vital) => (
          <Steps layout="row" key={vital.key} icon={VITAL_GLYPH[vital.key]} label={vital.caption} lit={vital.level ?? 2} word={vital.word} tone={toneOf(vital.stance)} />
        ))}
      </StepsTable>
      <BarRows
        label={`US buys ${trade.importsText} a year and sells ${trade.exportsText} a year`}
        labelWidth="4.5rem"
        slim
        rows={[
          { id: "buy", label: "US buys", value: trade.imports > 0 ? Math.max(0.02, trade.imports / tradeTop) : 0, figure: trade.importsText, tone: "reading" },
          { id: "sell", label: "US sells", value: trade.exports > 0 ? Math.max(0.02, trade.exports / tradeTop) : 0, figure: trade.exportsText, tone: "neutral" },
        ]}
      />
      <StatRow layout="comparison">
        <Stat layout="comparison" size="heading" icon="subjectTrade" label="Share of US goods trade" value={trade.usShareText ?? "None"} />
        <Stat layout="comparison" size="heading" label="On file" value={trade.sectors.length} period={`kinds of goods, ${plural(trade.partners.length, "partner", "partners")}`} />
      </StatRow>
    </>
  );
}

function SecurityBrief({ file }: { readonly file: NationFile }) {
  const { forces, presence } = file;
  return (
    <>
      {forces.strip.length > 0 ? (
        <StepsTable label="Forces by domain">
          {forces.strip.map((domain) => (
            <Steps layout="row" key={domain.domain} label={domain.label} lit={FORCE_STEPS[domain.band]} steps={5} word={domain.band} />
          ))}
        </StepsTable>
      ) : null}
      <StatRow layout="comparison">
        <Stat layout="comparison" size="heading" icon="shield" label="US forces here" value={presence.length} period={presence.length === 1 ? "placement" : "placements"} />
        {forces.warfighting ? <Stat layout="comparison" size="heading" icon="unitGroundFormation" label="Force class" value={forces.warfighting.label} /> : null}
        {forces.nuclear ? <Stat layout="comparison" size="heading" icon="escalate" label="Nuclear" value={forces.nuclear.band} /> : null}
      </StatRow>
    </>
  );
}

function DiplomacyBrief({ file }: { readonly file: NationFile }) {
  const standing = file.commitments.filter((commitment) => commitment.status !== "wound-down").length;
  const measures = file.trade.measures.length;
  return (
    <>
      {file.ties.length > 0 ? <TieFlags ties={file.ties} limit={4} /> : <p className="country-line">No close partner or rival stands out.</p>}
      <StatRow layout="comparison">
        <Stat layout="comparison" size="heading" icon="sign" label="Commitments" value={standing} period="standing" />
        <Stat layout="comparison" size="heading" icon="subjectTrade" label="Trade measures" value={measures} period="in force" />
        <Stat layout="comparison" size="heading" icon="building" label="Organizations" value={file.organizations.length} />
      </StatRow>
    </>
  );
}

function IntelBrief({ file }: { readonly file: NationFile }) {
  const { posture } = file;
  if (posture.unread) {
    return (
      <p className="country-unread">
        <Icon name="hidden" size={16} /> The services have no read on this government's aims.
      </p>
    );
  }
  return (
    <>
      <StepsTable label="Temperament">
        {posture.temperament.slice(0, 3).map((reading) => (
          <Steps layout="row" key={reading.axis} label={reading.axis.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase())} lit={reading.level} steps={5} word={TEMPERAMENT_WORD[reading.level]} caption={reading.text} />
        ))}
      </StepsTable>
      <StatRow layout="comparison">
        <Stat layout="comparison" size="heading" icon="intel" label="Aims read" value={posture.aims.length} />
        {file.provenance ? <Stat layout="comparison" size="heading" label="Source" value="Estimated" period="not researched in full" /> : null}
      </StatRow>
    </>
  );
}

function ActivityBrief({ file }: { readonly file: NationFile }) {
  const latest = file.recent[0];
  if (!latest) return <p className="country-line">No move by this government has reached the wire lately.</p>;
  return (
    <div className="country-brief__latest">
      <p className="country-brief__headline">{latest.headline}</p>
      <p className="country-brief__when">
        {latest.when}. {plural(file.recent.length, "move", "moves")} on the wire.
      </p>
    </div>
  );
}

/** The file at a glance: its posture on a scale, then each of the other views as a card of drawn figures with the way into it. */
export function Overview({ file, onView }: { readonly file: NationFile; readonly onView: (view: CountryView) => void }) {
  const { posture } = file;
  return (
    <div className="country-view">
      <StepsTable label="Posture">
        <Steps layout="row"
          icon="layerRegime"
          label="Posture"
          lit={posture.posture.level}
          word={posture.posture.word}
          tone={toneOf(posture.posture.stance)}
          caption="What its published doctrine says it means to do with the force it has."
        />
      </StepsTable>
      {file.atWarWith.length > 0 ? (
        <p className="country-war">
          <Icon name="conflict" size={16} /> You are at war with this government.{" "}
          {file.atWarWith.map((id) => (
            <Place key={id} href={place.war(id)}>
              Open the war
            </Place>
          ))}
        </p>
      ) : null}
      <Brief view="diplomacy" onView={onView}>
        <DiplomacyBrief file={file} />
      </Brief>
      <Brief view="economy" onView={onView}>
        <EconomyBrief file={file} />
      </Brief>
      <Brief view="security" onView={onView}>
        <SecurityBrief file={file} />
      </Brief>
      <Brief view="intelligence" onView={onView}>
        <IntelBrief file={file} />
      </Brief>
      <Brief view="activity" onView={onView}>
        <ActivityBrief file={file} />
      </Brief>
    </div>
  );
}
