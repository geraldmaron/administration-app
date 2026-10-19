import { Card } from "@admin/ui-web";
import { AuthorityHelp } from "../../help/AuthorityHelp";
import type { AuthorizationRow, WarPowersRow } from "@admin/player-core";
import { Countdown, Tag } from "@admin/ui-web";
import { PanelHeading, NameLink } from "./parts";
import { byUrgency, isOverdue } from "./obligation-order";

/** Under a fortnight the clock is red: the force must come out without a vote soon. */
const SOON_DAYS = 14;

function PaperRow({ row }: { readonly row: WarPowersRow }) {
  const overdue = isOverdue(row);
  return (
    <li className="sec-paper ui-row-target" data-overdue={overdue ? "true" : undefined}>
      <p className="sec-paper__head">
        <strong className="sec-paper__target">
          <NameLink href={row.href}>{row.target}</NameLink>
        </strong>
        {overdue ? (
          <Tag tone="risk" icon="caution" solid>
            Overdue
          </Tag>
        ) : row.clock && row.clock.left <= SOON_DAYS ? (
          <Tag tone="caution" icon="schedule">
            Soon
          </Tag>
        ) : null}
      </p>
      <p className="sec__note">{row.description}</p>
      <p className="sec-paper__report ui-valence-ink" data-valence={row.missed ? "bad" : row.reported ? "good" : "watch"}>
        {row.missed ? "▼ The report to Congress was missed and is still owed." : row.reported ? "✓ Reported to Congress." : "⚠ The 48-hour report to Congress is owed."}
      </p>
      {row.clock ? (
        <div className="sec-paper__clock" aria-label="Days before the force must come out without a vote">
          <Countdown left={row.clock.left} window={row.clock.window} unit="day" tone={row.clock.left <= SOON_DAYS ? "bad" : row.clock.left <= 30 ? "watch" : "good"} dueText={row.clock.left < 0 ? "The window has run out" : undefined} />
        </div>
      ) : (
        <p className="sec__note">No sixty-day clock runs on this one.</p>
      )}
    </li>
  );
}

function Authorization({ row }: { readonly row: AuthorizationRow }) {
  return (
    <li className="sec-paper" data-standing={row.standing ? "true" : undefined}>
      <p className="sec-paper__head">
        <strong className="sec-paper__target">{row.title}</strong>
        <Tag tone={row.standing ? "good" : "caution"} icon={row.standing ? "favorable" : "schedule"}>
          {row.standing ? "Granted" : "Waiting on the vote"}
        </Tag>
      </p>
      <p className="sec__note">
        {row.until}
        {row.chance ? `. The count looks ${row.chance}.` : "."}
      </p>
    </li>
  );
}

/**
 * The legal obligations of the forces the President has introduced: War Powers
 * reports and the sixty-day clocks, most pressing first, and the force
 * authorizations Congress holds. A statutory deadline never waits below a feed.
 */
export function Obligations({ rows, authorizations }: { readonly rows: readonly WarPowersRow[]; readonly authorizations: readonly AuthorizationRow[] }) {
  const ordered = byUrgency(rows);
  const nothing = ordered.length === 0 && authorizations.length === 0;
  return (
    <Card role="region" id="sec-obligations" className="sec-panel" aria-labelledby="security-obligations" tabIndex={-1}>
      <PanelHeading id="security-obligations" icon="gavel">
        Legal obligations
      </PanelHeading>
      <AuthorityHelp topic="war-powers" compact />
      {nothing ? <p className="sec__note">No force you introduced is waiting on a report or a clock, and nothing is before Congress.</p> : null}
      {ordered.length > 0 ? (
        <ul className="sec-papers" aria-label="War Powers reports and clocks">
          {ordered.map((row) => (
            <PaperRow key={row.id} row={row} />
          ))}
        </ul>
      ) : null}
      {authorizations.length > 0 ? (
        <ul className="sec-papers" aria-label="Force authorizations before Congress">
          {authorizations.map((row) => (
            <Authorization key={row.id} row={row} />
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
