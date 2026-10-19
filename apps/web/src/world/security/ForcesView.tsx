import { Card } from "@admin/ui-web";
import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { place, serviceHoldings, type ServiceReadiness } from "@admin/player-core";
import { Button, EmptyState } from "@admin/ui-web";
import { HoldingsTable } from "../forces/HoldingsTable";
import { PanelHeading, NameLink, Segments } from "./parts";

type Props = {
  readonly campaign: Campaign;
  readonly services: readonly ServiceReadiness[];
  /** The service the address opened, if any; absent, every service is shown. */
  readonly service: string | undefined;
  readonly onService: (service: string | undefined) => void;
};

const pct = (share: number) => `${Math.round(share * 100)}%`;

function Picker({ services, service, onService }: Pick<Props, "services" | "service" | "onService">) {
  return (
    <div className="service-picker" role="group" aria-label="Service">
      <Button kind="secondary" size="sm" className="service-picker__option" aria-pressed={service === undefined} onClick={() => onService(undefined)}>
        All services
      </Button>
      {services.map((entry) => (
        <Button key={entry.id} kind="secondary" size="sm" className="service-picker__option" aria-pressed={service === entry.id} onClick={() => onService(entry.id)}>
          {entry.name}
        </Button>
      ))}
    </div>
  );
}

/** A service's three shares on one bar, then its figures in words: free this week, held abroad, not ready. */
function ServiceStrip({ entry }: { readonly entry: ServiceReadiness }) {
  return (
    <div className="sec-service__strip">
      <Segments
        label={`${entry.name}, averaged over its assets`}
        parts={[
          { key: "good", count: Math.round(entry.ready * 1000), word: `${pct(entry.ready)} free this week` },
          { key: "abroad", count: Math.round(entry.abroad * 1000), word: `${pct(entry.abroad)} held abroad` },
          { key: "bad", count: Math.round(entry.resting * 1000), word: `${pct(entry.resting)} not ready` },
        ]}
      />
      <ul className="sec-service__figures">
        <li data-part="free">
          <strong>{pct(entry.ready)}</strong> free this week
        </li>
        <li data-part="abroad">
          <strong>{pct(entry.abroad)}</strong> held abroad
        </li>
        <li data-part="resting">
          <strong>{pct(entry.resting)}</strong> not ready
        </li>
      </ul>
    </div>
  );
}

/**
 * What each service fields, one asset per row, in the asset's own unit:
 * fielded, committed abroad, free this week and not ready. Counts are never
 * added across units, because hulls, airframes and formations are not one
 * quantity; the strip above each table averages the assets' own shares.
 */
export function ForcesView({ campaign, services, service, onService }: Props) {
  const known = service === undefined || services.some((entry) => entry.id === service);
  const shown = service === undefined || !known ? services : services.filter((entry) => entry.id === service);
  const holdings = useMemo(() => new Map(services.map((entry) => [entry.id, serviceHoldings(campaign, entry.id)] as const)), [campaign, services]);
  return (
    <div className="sec-view">
      <Picker services={services} service={known ? service : undefined} onService={onService} />
      {!known ? <p className="sec__note">No service by that name holds forces. Every service is shown instead.</p> : null}
      {services.length === 0 ? (
        <EmptyState icon="emptyRecord" title="No service reports a count">
          The services' holdings appear here once an order of battle is on file.
        </EmptyState>
      ) : null}
      {shown.map((entry) => (
        <Card role="region" key={entry.id} className="sec-panel" aria-labelledby={`service-${entry.id}`}>
          <PanelHeading id={`service-${entry.id}`} icon="building">
            {/* A heading is not a row: a stretched row link here covered the tab bar above it. */}
            <NameLink href={place.office(entry.id)} className="">{entry.name}</NameLink>
          </PanelHeading>
          <ServiceStrip entry={entry} />
          <HoldingsTable holdings={holdings.get(entry.id) ?? []} caption={`What the ${entry.name} fields, by asset`} drawn />
        </Card>
      ))}
      <p className="sec__note">Committed abroad is held by standing commitments. Not ready is fielded, uncommitted and not ready to go this week.</p>
    </div>
  );
}
