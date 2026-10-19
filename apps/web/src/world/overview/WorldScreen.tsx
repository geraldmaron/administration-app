import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { formatDate, worldDesk, worldGovernments, type WorldDesk, type WorldReadingId, type WorldRegionId } from "@admin/player-core";
import { DoorTile } from "../../shell/DoorTile";
import { Screen } from "../../shell/Screen";
import { GovernmentsTable } from "./GovernmentsTable";
import { Kpis } from "./Kpis";
import { MapPanel, Regions } from "./MapPanel";
import { Conflicts, Developments, Pending } from "./Sections";
import { StandingPanel } from "./StandingPanel";
import "./world-overview.css";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** The headline in a sentence, from the same counts the tiles draw. */
function lede({ kpis }: WorldDesk): string {
  const { wars, standing, intelligence } = kpis;
  const fighting = wars.count === 0 ? "No armed conflict is recorded." : `${plural(wars.count, "conflict")} ${wars.count === 1 ? "is" : "are"} active${wars.withUs > 0 ? `, and the United States is a party to ${wars.withUs}` : ""}.`;
  const view = standing.mean ? ` Of ${intelligence.total} governments, ${intelligence.assessed} are assessed; on average they judge you ${standing.mean.word.toLowerCase()}.` : ` None of the ${intelligence.total} governments is assessed yet.`;
  return `${fighting}${view}`;
}

export type WorldScreenProps = {
  readonly campaign: Campaign;
  readonly reading: WorldReadingId;
  readonly onReading: (reading: WorldReadingId) => void;
  readonly region: WorldRegionId | null;
  readonly onRegion: (region: WorldRegionId | null) => void;
  readonly query: string;
  readonly onQuery: (query: string) => void;
};

/**
 * The World as an operations overview: six headline readings, a map colored by
 * the reading chosen, the wars and what is pending, every government on the
 * columns they are compared by, and the standing the administration holds with
 * all of them.
 */
export function WorldScreen({ campaign, reading, onReading, region, onRegion, query, onQuery }: WorldScreenProps) {
  const governments = useMemo(() => worldGovernments(campaign), [campaign]);
  const desk = useMemo(() => worldDesk(campaign, governments), [campaign, governments]);
  return (
    <Screen title="World" icon="world" eyebrow={`${formatDate(campaign.calendar)} · Foreign affairs`} lede={lede(desk)} screenClass="workspace" camera="keep">
      <div className="wd">
        <Kpis kpis={desk.kpis} onReading={onReading} />
        <div className="wd-band">
          <MapPanel governments={governments} reading={reading} onReading={onReading} region={region} />
          <Regions governments={governments} region={region} onRegion={onRegion} />
        </div>
        <div className="wd-cols">
          <Conflicts wars={desk.wars} />
          <div className="wd-stack">
            <Pending flight={desk.flight} />
            <Developments movers={desk.movers} />
          </div>
        </div>
        <GovernmentsTable governments={governments} region={region} onRegion={onRegion} query={query} onQuery={onQuery} />
        <StandingPanel campaign={campaign} desk={desk} />
        <DoorTile href="/world/security" icon="shield" title="National security" description="Review intelligence, commands, readiness and presidential authorities." />
      </div>
    </Screen>
  );
}
