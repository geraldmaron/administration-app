import type { Campaign } from "@admin/engine";
import { deferMatterPacket, formatDate, type BriefMatter, type MatterClock } from "@admin/player-core";
import { Button, Icon, IconBadge, Tag } from "@admin/ui-web";
import { useAuthorize } from "../app/use-authorize";
import { valenceOf as valenceOfStance } from "../shell/valence";
import { useBuilt } from "../shell/built-routes";
import { Door } from "../shell/Door";
import { DeadlineMark, SeverityTag, inactionOf, kindIconOf } from "./matter-words";

/** A countdown drawn round its own window, red once less than a third of it is left. */
export function ClockMeter({ clock }: { readonly clock: MatterClock }) {
  const unit = clock.unit === "week" ? (clock.left === 1 ? "week" : "weeks") : clock.left === 1 ? "day" : "days";
  return (
    <div className="clock-line" data-closing={clock.window > 0 && clock.left / clock.window < 1 / 3 ? "true" : undefined}>
      <Icon name="pending" size={16} />
      <span className="clock-line__label">{clock.label}</span>
      <span className="clock-line__when">
        {clock.due ? `Closes ${formatDate(clock.due)}, ` : ""}
        {clock.left} {unit} left of {clock.window}
      </span>
    </div>
  );
}

/**
 * One row of the decision queue, on the columns the header names: subject,
 * kind, deadline, what waiting costs, and the actions. Putting it off takes
 * the row out of the list, so the receipt goes to `onSettled` for the Desk.
 */
export function MatterRow({ campaign, matter, onSettled }: { readonly campaign: Campaign; readonly matter: BriefMatter; readonly onSettled?: (said: string) => void }) {
  const built = useBuilt();
  const { busy, problem, authorize } = useAuthorize(campaign);
  const door = built(matter.href) ? matter.href : undefined;

  async function putOff() {
    const held = matter.putOff;
    if (!held) return;
    const authorized = await authorize(() => ({ packet: deferMatterPacket(campaign, held) }), { tier: "confirm", title: `Put off: ${matter.title.replace(/\.$/, "")}` });
    if (!authorized) return;
    const title = matter.title.replace(/\.$/, "");
    onSettled?.(authorized.saveError ? `Put off: ${title}. It stands, but this device did not save it: ${authorized.saveError}` : `Put off: ${title}.`);
  }

  return (
    <li className={`queue__row${door ? " ui-row-target" : ""}`} data-attention-id={matter.id} data-stance={matter.stance} data-valence={matter.stance === "adverse" || matter.stance === "caution" ? valenceOfStance(matter.stance) : "neutral"}>
      <div className="queue__cell queue__subject">
        <IconBadge name={kindIconOf(matter)} size={36} tone={matter.stance === "adverse" ? "red" : matter.stance === "caution" ? "gold" : "blue"} className="queue__glyph" />
        <p className="queue__title">{door ? <Door href={door} className="ui-row-link text-foreground no-underline hover:no-underline">{matter.title}</Door> : matter.title}</p>
        <p className="queue__reason">{matter.reason}</p>
        <span className="queue__tags">
          <SeverityTag matter={matter} />
          <Tag tone="neutral">{matter.kindLabel}</Tag>
          {matter.holds ? (
            <Tag tone="caution" icon="paused">
              Holds time
            </Tag>
          ) : null}
        </span>
      </div>
      <div className="queue__cell queue__deadline">
        <span className="queue__label">Deadline</span>
        <DeadlineMark campaign={campaign} matter={matter} />
      </div>
      <div className="queue__cell queue__wait">
        <span className="queue__label">If you wait</span>
        <span className="queue__clamp">{inactionOf(campaign, matter)}</span>
      </div>
      <div className="queue__cell queue__acts">
        {door ? <Icon name="chevron" size={18} /> : <span className="queue__later">Answered from its own record</span>}
        {matter.putOff ? (
          <Button size="sm" kind="ghost" busy={busy} icon={<Icon name="schedule" size={16} />} onClick={() => void putOff()}>
            Put off
          </Button>
        ) : null}
      </div>
      {problem ? (
        <p className="queue__problem" role="alert">
          {problem}
        </p>
      ) : null}
    </li>
  );
}
