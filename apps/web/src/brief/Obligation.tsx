import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, Collection, Icon } from "@admin/ui-web";

export type ObligationFact = { readonly label: string; readonly value: ReactNode };
export type ObligationEvent = { readonly key: string; readonly when?: string; readonly text: ReactNode };

/** The facts an obligation is read by, in one aligned list. */
export function ObligationFacts({ facts }: { readonly facts: readonly ObligationFact[] }) {
  return (
    <dl className="m-0 grid gap-4 sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0 border-l-2 border-border pl-3">
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd className="m-0 pt-1 text-sm font-medium tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What happened to this obligation, oldest first, every entry reachable. */
export function ObligationHistory({ events, empty }: { readonly events: readonly ObligationEvent[]; readonly empty: string }) {
  return (
    <Card role="region" aria-labelledby="obligation-history"><CardHeader>
      <h2 id="obligation-history" className="brief-section__title">
        <Icon name="archive" size={20} /> History
      </h2>
      </CardHeader><CardContent><Collection
        items={events}
        initial={6}
        noun="entries"
        as="ol"
        className="m-0 grid list-none gap-0 p-0"
        empty={empty}
        render={(event) => (
          <li key={event.key} className="grid gap-1 border-l-2 border-border py-3 pl-4 text-sm">
            {event.when ? <strong className="text-xs text-muted-foreground">{event.when}</strong> : null}
            {event.text}
          </li>
        )}
      />
    </CardContent></Card>
  );
}
