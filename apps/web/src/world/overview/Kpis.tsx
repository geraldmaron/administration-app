import type { MouseEvent, ReactNode } from "react";
import { TREND_FLAT, type StandingKpi, type WorldKpis, type WorldReadingId } from "@admin/player-core";
import { Bar, HelpTip, Icon, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";

type Segment = { readonly key: string; readonly count: number; readonly word: string };

/** A set divided into its parts on one bar, each part its count; the words are what a screen reader hears. */
function Segments({ parts, label }: { readonly parts: readonly Segment[]; readonly label: string }) {
  const spoken = `${label}: ${parts.map((part) => `${part.count} ${part.word}`).join(", ")}.`;
  return (
    <span className="wd-segments" role="img" aria-label={spoken}>
      {parts.map((part) => (part.count > 0 ? <span key={part.key} data-segment={part.key} style={{ flexGrow: part.count }} /> : null))}
    </span>
  );
}

type Target = { readonly kind: "jump"; readonly id: string; readonly reading?: WorldReadingId } | { readonly kind: "door"; readonly href: string };

type TileProps = {
  readonly icon: IconName;
  readonly label: string;
  readonly tone?: "good" | "watch" | "bad" | undefined;
  readonly figure: ReactNode;
  readonly unit?: string;
  readonly reading?: ReactNode;
  readonly caption: ReactNode;
  readonly target: Target;
  readonly onReading: (reading: WorldReadingId) => void;
};

function Tile({ icon, label, tone, figure, unit, reading, caption, target, onReading }: TileProps) {
  const name = (
    <>
      <Icon name={icon} size={16} /> {label}
    </>
  );
  const jump = (event: MouseEvent<HTMLAnchorElement>) => {
    if (target.kind !== "jump") return;
    const section = document.getElementById(target.id);
    if (!section) return;
    event.preventDefault();
    if (target.reading) onReading(target.reading);
    section.scrollIntoView({ block: "start" });
    section.focus({ preventScroll: true });
  };
  return (
    <li className="wd-kpi ui-row-target" data-tone={tone}>
      <div className="wd-kpi__heading">
        {target.kind === "jump" ? <a className="ui-row-link" href={`#${target.id}`} onClick={jump}>{name}</a> : <Door className="ui-row-link" href={target.href}>{name}</Door>}
        <span className="wd-kpi__figure">{figure}{unit ? <small>{unit}</small> : null}</span>
      </div>
      {reading ? <div className="wd-kpi__reading">{reading}</div> : null}
      <HelpTip label={`${label}: context`}><p>{caption}</p></HelpTip>
    </li>
  );
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

const STANCE_TONE = { favorable: "good", neutral: undefined, caution: "watch", adverse: "bad" } as const;

function standingCaption({ counts, read, change4 }: StandingKpi): string {
  const move = change4 === undefined ? "" : change4 > TREND_FLAT ? " Warming over four weeks." : change4 < -TREND_FLAT ? " Cooling over four weeks." : " Steady over four weeks.";
  return `${counts.favorable} trust you and ${counts.adverse} are hostile, of ${read} the services read.${move}`;
}

function pendingCaption({ byKind, total }: WorldKpis["pending"]): string {
  if (total === 0) return "No operation, request to Congress, treaty or tariff answer is pending.";
  const parts = [
    [byKind.operation, "operation"],
    [byKind.authorization, "request before Congress"],
    [byKind.treaty, "treaty awaiting the Senate"],
    [byKind.retaliation, "expected answer"],
  ] as const;
  return parts.filter(([count]) => count > 0).map(([count, noun]) => plural(count, noun)).join(", ") + ".";
}

function conflictsReading({ hottest }: WorldKpis["wars"]): ReactNode {
  if (!hottest) return null;
  const names = hottest.sides.map((side) => side.name).join(" and ");
  return <Bar label={`${names}, intensity: ${hottest.intensityText}`} value={hottest.intensity} tone={hottest.intensity >= 0.66 ? "bad" : "watch"} />;
}

/**
 * The world in six readings a President scans before anything else. Each tile
 * is a door to the part of the page, or the page, that explains it.
 */
export function Kpis({ kpis, onReading }: { readonly kpis: WorldKpis; readonly onReading: (reading: WorldReadingId) => void }) {
  const { wars, standing, treaties, pending, trade, intelligence } = kpis;
  const counts = standing.counts;
  return (
    <section aria-label="The world at a glance">
      <ul className="wd-kpis">
        <Tile
          icon="conflict"
          label="Active conflicts"
          tone={wars.count === 0 ? "good" : wars.withUs > 0 ? "bad" : "watch"}
          figure={wars.count}
          unit={wars.count === 1 ? "war" : "wars"}
          reading={conflictsReading(wars)}
          caption={wars.count === 0 ? "No armed conflict is recorded. That does not rule out tension or an unread threat." : wars.withUs > 0 ? `The United States is a party to ${wars.withUs}.` : "The United States is not a party to any."}
          target={{ kind: "jump", id: "wd-conflicts" }}
          onReading={onReading}
        />
        <Tile
          icon="subjectChamber"
          label="Standing toward the US"
          tone={standing.mean ? STANCE_TONE[standing.mean.stance] : undefined}
          figure={standing.mean ? standing.mean.word : "Unread"}
          reading={<Segments label="Governments by view of the United States" parts={[{ key: "favorable", count: counts.favorable, word: "trust you" }, { key: "neutral", count: counts.neutral, word: "judge on the merits" }, { key: "caution", count: counts.caution, word: "wary" }, { key: "adverse", count: counts.adverse, word: "hostile" }, { key: "unread", count: counts.unread, word: "unread" }]} />}
          caption={standingCaption(standing)}
          target={{ kind: "jump", id: "wd-map", reading: "standing" }}
          onReading={onReading}
        />
        <Tile
          icon="sign"
          label="Treaties in force"
          tone={treaties.awaiting > 0 ? "watch" : undefined}
          figure={treaties.inForce}
          unit={treaties.inForce === 1 ? "treaty" : "treaties"}
          caption={`${plural(treaties.alliances, "alliance")} in force, ${treaties.awaiting} awaiting the Senate. ${treaties.alignedGovernments} governments are aligned or leaning aligned with you.`}
          target={{ kind: "jump", id: "wd-governments" }}
          onReading={onReading}
        />
        <Tile
          icon="pending"
          label="Pending abroad"
          tone={pending.total > 0 ? "watch" : "good"}
          figure={pending.total}
          unit={pending.total === 1 ? "matter" : "matters"}
          caption={pendingCaption(pending)}
          target={{ kind: "jump", id: "wd-pending" }}
          onReading={onReading}
        />
        <Tile
          icon="subjectTrade"
          label="Trade exposure"
          tone={trade.measures > 0 || trade.expectedAnswers > 0 ? "watch" : undefined}
          figure={trade.topText}
          unit="with five partners"
          caption={`${trade.topNames.slice(0, 3).join(", ")} lead. ${plural(trade.measures, "measure")} in force, ${plural(trade.expectedAnswers, "answer")} expected.`}
          target={{ kind: "jump", id: "wd-map", reading: "trade" }}
          onReading={onReading}
        />
        <Tile
          icon="intel"
          label="Governments assessed"
          tone={intelligence.unread > 0 ? "watch" : "good"}
          figure={intelligence.assessed}
          unit={`of ${intelligence.total}`}
          reading={<Segments label="Governments" parts={[{ key: "assessed", count: intelligence.assessed, word: "assessed" }, { key: "unread", count: intelligence.unread, word: "unread" }]} />}
          caption={intelligence.unread > 0 ? `${intelligence.unread} unread: the services have no read on how they see you.` : "Every government is read."}
          target={{ kind: "door", href: "/world/security" }}
          onReading={onReading}
        />
      </ul>
    </section>
  );
}
