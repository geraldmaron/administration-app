import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { worldDesk, worldGovernments, type WorldDesk, type WorldReadingId, type WorldRegionId } from "@admin/player-core";
import { Column, Page, Row, useMedia } from "@admin/ui";
import { splitColumn, TopicLaw } from "../parts";
import { GovernmentsTable } from "./GovernmentsTable";
import { Kpis } from "./Kpis";
import { MapPanel, Regions } from "./MapPanel";
import { Conflicts, Developments, Pending, SecurityDoor } from "./Sections";
import { StandingPanel } from "./StandingPanel";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** The headline in a sentence, from the same counts the tiles draw. */
function lede({ kpis }: WorldDesk): string {
  const { wars, pending } = kpis;
  return `${plural(wars.count, "war")} abroad, ${wars.withUs} involving the United States, and ${plural(pending.total, "matter")} in progress.`;
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
 * The World as an operations overview: six headline readings, the map's
 * reading by part of the world, the wars and what is pending, every government
 * on the columns they are compared by, and the standing the administration
 * holds with all of them.
 */
export function WorldScreen({ campaign, reading, onReading, region, onRegion, query, onQuery }: WorldScreenProps) {
  const media = useMedia();
  const governments = useMemo(() => worldGovernments(campaign), [campaign]);
  const desk = useMemo(() => worldDesk(campaign, governments), [campaign, governments]);
  return (
    <Page eyebrow="Department of State · Foreign affairs" icon="world" title="World" lede={lede(desk)} actions={<TopicLaw topic="diplomacy" />} wide>
      <Kpis kpis={desk.kpis} onReading={onReading} />
      <Row gap="xl" top wrap={!media.desktop}>
        <Column {...splitColumn(media.desktop, 3)} gap="xl">
          <MapPanel governments={governments} reading={reading} onReading={onReading} region={region} />
        </Column>
        {desk.wars.length > 0 || desk.flight.length > 0 ? (
          <Column {...splitColumn(media.desktop, 2)} gap="xl">
            <Conflicts wars={desk.wars} />
            <Pending flight={desk.flight} />
          </Column>
        ) : null}
      </Row>
      <Regions governments={governments} region={region} onRegion={onRegion} />
      <Developments movers={desk.movers} />
      <GovernmentsTable governments={governments} region={region} onRegion={onRegion} query={query} onQuery={onQuery} />
      <StandingPanel campaign={campaign} desk={desk} />
      <SecurityDoor />
    </Page>
  );
}
