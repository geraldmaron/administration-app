import type { Campaign } from "@admin/engine";
import { appropriationReading, extensionNotices, warPowersReading } from "@admin/player-core";
import { Gauge, Icon } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { valenceOf } from "../../shell/valence";

/**
 * What Congress is owed or is owed by you: war powers and the appropriation.
 * A running War Powers clock is decided where the force is, so each one points
 * to its paper rather than being certified from here without its context.
 */
export function Notices({ campaign }: { readonly campaign: Campaign }) {
  const war = warPowersReading(campaign);
  const money = appropriationReading(campaign);
  const notices = extensionNotices(campaign);
  return (
    <section className="hill-section" aria-labelledby="congress-notices">
      <h2 id="congress-notices" className="hill-section__title">
        <Icon name="law" size={20} /> Notices, war powers and appropriations
      </h2>
      <div className="ledger">
        <div className="ledger__row" data-valence={war.unauthorized.length > 0 ? "bad" : "good"}>
          <span className="ledger__title ui-valence-ink" data-valence={war.unauthorized.length > 0 ? "bad" : "good"}>
            {war.unauthorized.length > 0 ? "\u25BC " : "\u2713 "}
            {war.headline}
          </span>
          <p className="ledger__line">{war.detail}</p>
        </div>
        <div className="ledger__row" data-valence={valenceOf(money.stance)}>
          <span className="ledger__title ui-valence-ink" data-valence={valenceOf(money.stance)}>
            {money.headline}
          </span>
          <p className="ledger__line">{money.detail}</p>
          {money.windowWeeks > 0 ? (
            <Gauge shape="meter" label="Funding left" value={money.weeksLeft / money.windowWeeks} valueText={`${money.weeksLeft} of ${money.windowWeeks} weeks`} tone={money.weeksLeft <= 4 ? "bad" : money.weeksLeft <= 8 ? "watch" : "good"} />
          ) : null}
        </div>
      </div>
      {notices.length === 0 ? <p className="hill-note">No sixty-day war-powers clock is running, so no extension is owed or open.</p> : null}
      {notices.length > 0 ? (
        <ul className="ledger" aria-label="Sixty-day War Powers clocks">
          {notices.map((notice) => (
            <li key={notice.id} className="ledger__row" data-valence={notice.daysLeft <= 14 ? "bad" : "watch"}>
              <p className="ledger__line">{notice.line}</p>
              <Door href={notice.home}>Open the War Powers paper on {notice.target}</Door>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
