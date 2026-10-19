import { digestWeeks, formatDate, formatSignedPoints, weekDigest, type WeekDigest } from "@admin/player-core";
import { Icon } from "@admin/ui-web";
import type { Campaign } from "@admin/engine";
import { Door } from "../shell/Door";
import { StateName } from "../media/StateName";

export const digestHref = (week: number): string => `/brief?view=history&week=${week}`;

/** Approval's move across a week, in words a headline can carry. */
export function approvalLine(digest: WeekDigest): string {
  if (digest.approvalDelta === undefined) return "Approval for this week is older than the weekly record.";
  if (Math.abs(digest.approvalDelta) < 0.0005) return "Approval held steady, moving less than a tenth of a point.";
  return `Approval ${digest.approvalDelta > 0 ? "rose" : "fell"} ${formatSignedPoints(Math.abs(digest.approvalDelta)).slice(1)} points.`;
}

/** The Desk's door to the digest: the last closed week in a line, its largest state moves, and the way in. */
export function LastWeek({ campaign }: { readonly campaign: Campaign }) {
  const latest = digestWeeks(campaign)[0];
  const digest = latest ? weekDigest(campaign, latest.week) : undefined;
  if (!digest) return null;
  const largest = [...digest.risers, ...digest.fallers].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
  return (
    <section className="last-week ui-card-door" aria-labelledby="last-week-title">
      <h2 id="last-week-title" className="brief-section__title">
        <Icon name="notificationStack" size={20} /> <Door href={digestHref(digest.week)} className="ui-card-door__link text-foreground no-underline hover:no-underline">Last week</Door>
      </h2>
      <p className="brief-section__note">Week {digest.week}, {formatDate(digest.from)} to {formatDate(digest.to)}</p>
      <p className="last-week__line">{approvalLine(digest)}</p>
      {largest.length > 0 ? (
        <ol className="movers__list">
          {largest.map((move) => (
            <li key={move.id}>
              <Door href={move.href} className="movers__row" aria-label={`${move.name}: ${move.text}`}>
                <span className="movers__name"><StateName id={move.id} name={move.name} /></span>
                <span />
                <span className="movers__figure" data-direction={move.delta >= 0 ? "up" : "down"}>{formatSignedPoints(move.delta)}</span>
              </Door>
            </li>
          ))}
        </ol>
      ) : null}
      <p className="brief-section__note">
        {digest.wire.length} {digest.wire.length === 1 ? "story" : "stories"} filed, {digest.world.length} {digest.world.length === 1 ? "move" : "moves"} by the world
      </p>
    </section>
  );
}
