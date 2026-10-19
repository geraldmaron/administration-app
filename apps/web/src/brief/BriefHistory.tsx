import type { Campaign } from "@admin/engine";
import { digestView, digestWeeks, formatDate, type DigestView } from "@admin/player-core";
import { EmptyState, buttonClass } from "@admin/ui-web";
import { useCampaignState } from "../app/hooks";
import { approvalLine, digestHref } from "./WeekDigest";
import { ActGroups, WireGroups } from "./digest/Groups";
import { LastRun } from "./digest/LastRun";
import { Panel } from "./digest/Panel";
import { KpiStrip } from "./digest/Readings";
import { Movers } from "./digest/Movers";
import { WeekChart } from "./digest/WeekChart";
import { weekLensId } from "../map/lenses/delta-lens";
import { MapView } from "../map/MapView";
import { Door } from "../shell/Door";
import "../record/entry-row.css";
import "../brief/digest.css";


function StatesPanel({ view }: { readonly view: DigestView }) {
  if (view.digest.scrolledOut || view.tiles.length === 0) {
    return (
      <Panel id="digest-states" icon="flag" title="Where approval moved" note="Open a state to see why.">
        <p className="dg-none">{view.digest.scrolledOut ? "No state figures were kept for this week." : "No state's approval moved by a tenth of a point."}</p>
      </Panel>
    );
  }
  return (
    <div className="dg-states">
      <MapView title="Where approval moved" lens={weekLensId(view.digest.week)} camera="us" note="Each state colored by how far its approval moved this week. Open a state to see why." />
      <Panel id="digest-movers" icon="flag" title="Largest moves" note="The states that rose and fell most, on one scale.">
        <Movers view={view} />
      </Panel>
    </div>
  );
}

function WeekReport({ view }: { readonly view: DigestView }) {
  const { digest } = view;
  return (
    <>
      <div className="dg-band">
        <section className="dg-panel" aria-label="Pick a week">
          <WeekChart view={view} />
        </section>
        <section className="dg-panel" aria-labelledby="digest-readings">
          <h2 id="digest-readings" className="dg-panel__title">Readings at the week's close</h2>
          <p className="dg-panel__note">{digest.scrolledOut ? "This week's figures are older than the weekly record. Its entries and wire are below." : approvalLine(digest)}</p>
          <KpiStrip kpis={view.kpis} />
        </section>
      </div>
      <StatesPanel view={view} />
      <div className="dg-cols">
        <Panel id="digest-acts" icon="decision" title="What you did" note={`${digest.acts.length} recorded ${digest.acts.length === 1 ? "act" : "acts"}`}>
          <ActGroups groups={view.acts} empty="You took no recorded act this week." />
        </Panel>
        <Panel id="digest-world" icon="world" title="What the world did" note={`${digest.world.length} recorded ${digest.world.length === 1 ? "entry" : "entries"}`}>
          <ActGroups groups={view.world} empty="Nothing outside your office was recorded this week." />
        </Panel>
      </div>
      <Panel id="digest-wire" icon="press" title="What the wire filed" note={`${digest.wire.length} ${digest.wire.length === 1 ? "story" : "stories"}`}>
        <WireGroups groups={view.wire} empty="The wire filed nothing this week." />
      </Panel>
    </>
  );
}

export function BriefHistory({ campaign, week }: { readonly campaign: Campaign; readonly week: number | undefined }) {
  const state = useCampaignState();
  const weeks = digestWeeks(campaign);
  const open = week ?? weeks[0]?.week;
  const view = open === undefined ? undefined : digestView(campaign, open);
  const brief = state.status === "ready" ? state.brief : undefined;
  const acknowledged = state.status === "ready" && state.briefAcknowledged === true;
  // A run shorter than a week closes no week, and it is still the run the Brief
  // sent the player here to read.
  const run = brief && (view === undefined || view.latest) ? <LastRun campaign={campaign} brief={brief} acknowledged={acknowledged} /> : null;
  const eyebrow = view ? `Week ${view.digest.week} · ${formatDate(view.digest.from)} to ${formatDate(view.digest.to)}` : "Briefing history";
  return (
    <section aria-label="Briefing history">
      <h2 className="brief-section__title">{eyebrow}</h2>
      <div className="dg">
        {acknowledged ? null : run}
        {view ? (
          <WeekReport view={view} />
        ) : (
          <EmptyState icon="emptyRecord" title={weeks.length === 0 ? (brief ? "This week is still open" : "No week has closed yet") : "That week is not in the record"}>
            {weeks.length === 0 ? (
              brief
                ? "A weekly briefing is recorded when a week closes. Until then, this view shows the run you just made."
                : "A weekly briefing is recorded as each week closes. Press Continue in the top bar, and the first week will be here."
            ) : (
              <Door href={digestHref(weeks[0]!.week)} className={buttonClass("secondary", "sm")}>Open the latest week</Door>
            )}
          </EmptyState>
        )}
        {acknowledged ? run : null}

      </div>
    </section>
  );
}
