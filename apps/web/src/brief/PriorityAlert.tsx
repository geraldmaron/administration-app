import type { Campaign } from "@admin/engine";
import type { BriefMatter } from "@admin/player-core";
import { Icon } from "@admin/ui-web";
import { useBuilt } from "../shell/built-routes";
import { Door } from "../shell/Door";
import { SubjectEvidence } from "./SubjectEvidence";
import { DeadlineMark, SeverityTag, inactionOf, kindIconOf } from "./matter-words";

/**
 * The leading matter as one alert: how serious, what it is, when it closes,
 * what happens if the President waits, and the single action that answers it.
 */
export function PriorityAlert({ campaign, matter }: { readonly campaign: Campaign; readonly matter: BriefMatter }) {
  const built = useBuilt();
  const door = built(matter.href) ? matter.href : undefined;
  return (
    <section className={`alert${door ? " ui-card-door" : ""}`} aria-labelledby="alert-title" data-attention-id={matter.id} data-stance={matter.stance}>
      <p className="alert__kicker">
        <SeverityTag matter={matter} />
        <span className="alert__kind">
          <Icon name={kindIconOf(matter)} size={16} /> {matter.kindLabel}
        </span>
        {matter.holds ? (
          <span className="alert__holds">
            <Icon name="paused" size={16} /> Holds time
          </span>
        ) : null}
      </p>
      <h2 id="alert-title" className="alert__title">
        {door ? <Door href={door} className="ui-card-door__link">{matter.title}<Icon name="chevron" size={20} className="ml-2 inline-block align-middle" /></Door> : matter.title}
      </h2>
      <div className="alert__glance">
        <div className="alert__fact">
          <p className="alert__label">
            <Icon name="schedule" size={16} /> Deadline
          </p>
          <DeadlineMark campaign={campaign} matter={matter} />
        </div>
        <div className="alert__fact">
          <p className="alert__label">
            <Icon name="caution" size={16} /> If you wait
          </p>
          <p className="alert__wait">{inactionOf(campaign, matter)}</p>
        </div>
      </div>
      <SubjectEvidence campaign={campaign} matter={matter} />
      <p className="alert__reason">{matter.reason}</p>
      {!door ? <p className="brief-section__note">This matter is answered from its own record, which is not available in this Brief.</p> : null}
    </section>
  );
}
