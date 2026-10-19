import type { ReactNode } from "react";
import type { SecurityOverview } from "@admin/player-core";
import { HelpTip, Icon, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { Segments } from "./parts";
import { securityHref } from "./security-search";
import type { SecurityView } from "./security-search";

type Tone = "good" | "watch" | "bad" | undefined;

type TileProps = {
  readonly icon: IconName;
  readonly label: string;
  readonly tone?: Tone;
  readonly figure: ReactNode;
  readonly unit?: string;
  readonly reading?: ReactNode;
  readonly caption: ReactNode;
  readonly target: { readonly view: SecurityView; readonly anchor?: string };
};

function Tile({ icon, label, tone, figure, unit, reading, caption, target }: TileProps) {
  const name = <><Icon name={icon} size={18} /><span>{label}</span></>;
  return (
    <li className="sec-kpi ui-row-target" data-tone={tone} data-door="true">
      <div className="sec-kpi__heading">
        <Door className="ui-row-link" href={`${securityHref(target.view)}${target.anchor ? `#${target.anchor}` : ""}`}>{name}</Door>
        <span className="sec-kpi__figure">{figure}{unit ? <small>{unit}</small> : null}</span>
      </div>
      {reading ? <div className="sec-kpi__reading">{reading}</div> : null}
      <HelpTip label={`${label}: context`}><p>{caption}</p></HelpTip>
    </li>
  );
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const pct = (share: number) => `${Math.round(share * 100)}%`;

function theatersTile({ postures }: SecurityOverview): TileProps {
  const raised = postures.surge + postures.heightened;
  return {
    icon: "escalate",
    label: "Commands above routine",
    tone: postures.surge > 0 ? "bad" : postures.heightened > 0 ? "watch" : "good",
    figure: raised,
    unit: `of ${postures.total}`,
    reading: (
      <Segments
        label="Commands"
        parts={[
          { key: "bad", count: postures.surge, word: "at surge" },
          { key: "watch", count: postures.heightened, word: "heightened" },
          { key: "good", count: postures.routine, word: "routine" },
        ]}
      />
    ),
    caption: `${postures.surge} surge, ${postures.heightened} heightened. ${postures.engaged === 0 ? "None engaged abroad." : `${postures.engaged} engaged abroad.`}`,
    target: { view: "theaters" },
  };
}

function forcesTile({ force }: SecurityOverview): TileProps {
  return {
    icon: "unitGroundFormation",
    label: "Forces free to go",
    tone: force.ready >= 0.6 ? "good" : force.ready >= 0.4 ? "watch" : "bad",
    figure: pct(force.ready),
    reading: (
      <Segments
        label="Forces"
        parts={[
          { key: "good", count: Math.round(force.ready * 1000), word: `${pct(force.ready)} free this week` },
          { key: "abroad", count: Math.round(force.abroad * 1000), word: `${pct(force.abroad)} held abroad` },
          { key: "bad", count: Math.round(force.resting * 1000), word: `${pct(force.resting)} not ready` },
        ]}
      />
    ),
    caption: `${pct(force.abroad)} held abroad, ${pct(force.resting)} not ready, averaged over ${plural(force.lines, "asset")}.`,
    target: { view: "forces" },
  };
}

function operationsTile({ operations }: SecurityOverview): TileProps {
  const kinds = operations.byKind.map((entry) => `${entry.count} ${entry.label.toLowerCase()}`).join(", ");
  return {
    icon: "summit",
    label: "Operations open",
    tone: operations.flagged > 0 ? "watch" : undefined,
    figure: operations.total,
    unit: operations.total === 1 ? "operation" : "operations",
    reading: <Segments label="Operations by kind" parts={operations.byKind.map((entry, index) => ({ key: `kind-${index % 5}`, count: entry.count, word: entry.label.toLowerCase() }))} />,
    caption: `${kinds || "None open"}. ${operations.flagged > 0 ? `${operations.flagged} ${operations.flagged === 1 ? "needs" : "need"} a look. ` : ""}${operations.weeklyBill}.`,
    target: { view: "operations" },
  };
}

function intelTile({ intel }: SecurityOverview): TileProps {
  const items = intel.urgent + intel.watch + intel.ambient;
  return {
    icon: "intel",
    label: "Urgent intelligence",
    tone: intel.urgent > 0 ? "bad" : intel.watch > 0 ? "watch" : "good",
    figure: intel.urgent,
    unit: `of ${plural(items, "item")}`,
    reading: (
      <Segments
        label="Overnight items"
        parts={[
          { key: "bad", count: intel.urgent, word: "need you now" },
          { key: "watch", count: intel.watch, word: "to watch" },
          { key: "neutral", count: intel.ambient, word: "for awareness" },
        ]}
      />
    ),
    caption: `${plural(intel.reports, "report")} filed${intel.stale > 0 ? `, ${intel.stale} past a cycle` : ""}. ${plural(intel.taskings, "tasking")} standing.`,
    target: { view: "intelligence" },
  };
}

function obligationsTile({ obligations }: SecurityOverview): TileProps {
  const { soonest } = obligations;
  const caption = soonest ? `Soonest: ${soonest.target}, ${plural(soonest.left, "day")} left.` : obligations.open > 0 ? "No sixty-day clock is running on these." : "No force you introduced is waiting on a report.";
  return {
    icon: "gavel",
    label: "War Powers",
    tone: obligations.overdue > 0 ? "bad" : soonest && soonest.left <= 14 ? "watch" : "good",
    figure: obligations.open,
    unit: obligations.open === 1 ? "paper open" : "papers open",
    caption: `${caption}${obligations.authorizationsWaiting > 0 ? ` ${plural(obligations.authorizationsWaiting, "authorization")} waiting on Congress.` : ""}${obligations.overdue > 0 ? ` ${obligations.overdue} overdue.` : ""}`,
    target: { view: "theaters", anchor: "sec-obligations" },
  };
}

/** The desk in five supporting readings a President scans first. Each tile opens the view or the part of the page that explains it. */
export function Kpis({ overview }: { readonly overview: SecurityOverview }) {
  const tiles = [theatersTile, forcesTile, operationsTile, intelTile, obligationsTile].map((build) => build(overview));
  return (
    <section className="sec-kpis-wrap" aria-label="National security at a glance">
      <ul className="sec-kpis">
        {tiles.map((tile) => (
          <Tile key={tile.label} {...tile} />
        ))}
      </ul>
    </section>
  );
}
