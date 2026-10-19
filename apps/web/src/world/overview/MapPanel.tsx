import { Card } from "@admin/ui-web";
import { WORLD_READINGS, WORLD_REGIONS, WORLD_REGION_NAMES, tallyStances, type WorldGovernment, type WorldReadingId, type WorldRegionId } from "@admin/player-core";
import { Flag, Icon } from "@admin/ui-web";
import { MapView } from "../../map/MapView";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";

const LENS: Readonly<Record<WorldReadingId, string>> = { standing: "relations", trend: "world-trend", alignment: "world-alignment", trade: "trade-share", forces: "forces" };
const SHORT: Readonly<Record<WorldReadingId, string>> = { standing: "Standing", trend: "Direction", alignment: "Alignment", trade: "Trade", forces: "Forces" };
const NOTES: Readonly<Record<WorldReadingId, string>> = {
  standing: "How each government sees the United States. Gray governments are unread: the services have no read on them.",
  trend: "Whether their trust in the United States has warmed or cooled over the last four closed weeks.",
  alignment: "Where each government sits against the United States on the dataset's alignment axis.",
  trade: "Each partner's share of US goods trade.",
  forces: "Where American personnel are stationed, sized by how many.",
};

/** The one shared map, colored by the reading chosen; each region opens its own file. */
export function MapPanel({ governments, reading, onReading, region }: { readonly governments: readonly WorldGovernment[]; readonly reading: WorldReadingId; readonly onReading: (reading: WorldReadingId) => void; readonly region: WorldRegionId | null }) {
  const byLens = new Map(WORLD_READINGS.map((id) => [LENS[id], id] as const));
  return (
    <Card role="region" aria-label="World geography" id="wd-map" tabIndex={-1} className="wd-map">
      <MapView
        title="The world"
        lens={LENS[reading]}
        camera={region ? `set:${governments.filter((government) => government.region === region).map((government) => `nation:${government.nation}`).join("|")}` : "world"}
        note={`${NOTES[reading]}${region ? ` The table below is filtered to ${WORLD_REGION_NAMES[region]}.` : ""}`}
        lenses={WORLD_READINGS.map((id) => ({ id: LENS[id], label: SHORT[id] }))}
        onLens={(id) => onReading(byLens.get(id) ?? "standing")}
        height={420}
      />
    </Card>
  );
}

/** Where the governments stand by part of the world; choosing one zooms the map and filters the table. */
export function Regions({ governments, region, onRegion }: { readonly governments: readonly WorldGovernment[]; readonly region: WorldRegionId | null; readonly onRegion: (region: WorldRegionId | null) => void }) {
  return (
    <Card role="region" aria-labelledby="wd-regions-title" className="wd-panel">
      <h2 id="wd-regions-title" className="wd-panel__title"><Icon name="layerBlocs" size={20} /> By part of the world</h2>
      <ul className="wd-regions">
        {WORLD_REGIONS.map((id) => {
          const rows = governments.filter((government) => government.region === id);
          const counts = tallyStances(rows);
          const atWar = rows.filter((government) => government.atWar).length;
          const notable = [...rows].filter((government) => government.atWar || government.stance === "adverse").slice(0, 4);
          return (
            <li key={id} className="wd-region ui-card-door" data-current={region === id ? "true" : undefined}>
              <button type="button" className="wd-region__head ui-card-door__link" aria-pressed={region === id} onClick={() => onRegion(region === id ? null : id)}>
                <span className="wd-region__name">{WORLD_REGION_NAMES[id]}</span>
                <span className="wd-region__count">{rows.length}</span>
              </button>
              <span className="wd-segments" role="img" aria-label={`${WORLD_REGION_NAMES[id]}: ${counts.favorable} trust you, ${counts.neutral} on the merits, ${counts.caution} wary, ${counts.adverse} hostile, ${counts.unread} unread.`}>
                {(["favorable", "neutral", "caution", "adverse", "unread"] as const).map((key) => (counts[key] > 0 ? <span key={key} data-segment={key} style={{ flexGrow: counts[key] }} /> : null))}
              </span>
              <span className="wd-region__foot">
                <span className="wd-muted">{atWar > 0 ? `${atWar} at war with the US` : counts.adverse > 0 ? `${counts.adverse} hostile` : "None hostile"}</span>
                <span className="wd-region__flags">
                  {notable.map((government) => {
                    const src = nationFlagUrl(government.nation);
                    return <Door key={government.nation} href={government.href} className="wd-region__flag" aria-label={`${government.name}: ${government.atWar ? "at war with the US" : government.standingWord}`} title={government.name}><Flag name={government.name} {...(src ? { src } : {})} height={16} decorative /></Door>;
                  })}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
