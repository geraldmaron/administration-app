import { Card } from "@admin/ui-web";
import type { InFlight, Mover, Stance, WarDeskRow } from "@admin/player-core";
import { trustWord } from "@admin/player-core";
import { Flag, Gauge, Icon, Tag, type IconName } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";
import type { Valence } from "../../shell/valence";

const FLIGHT: Readonly<Record<InFlight["kind"], { readonly icon: IconName; readonly word: string }>> = {
  operation: { icon: "pending", word: "Operation" },
  authorization: { icon: "subjectCapitol", word: "Before Congress" },
  treaty: { icon: "sign", word: "Treaty" },
  retaliation: { icon: "caution", word: "Expected answer" },
};

const VALENCE: Readonly<Record<Stance | "unread", Valence>> = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad", unread: "neutral" };

function FlagOf({ nation, name, height = 18 }: { readonly nation: string; readonly name: string; readonly height?: number }) {
  const src = nationFlagUrl(nation);
  return <Flag name={name} {...(src ? { src } : {})} height={height} decorative />;
}

function WarLine({ war }: { readonly war: WarDeskRow }) {
  const title = war.sides.map((side) => side.name).join(" and ");
  return (
    <li className="wd-war ui-row-target" data-party={war.youAreParty ? "true" : undefined}>
      <span className="wd-war__flags" aria-hidden="true">
        {war.sides.map((side) => <FlagOf key={side.nation} nation={side.nation} name={side.name} height={22} />)}
      </span>
      <span className="wd-war__body">
        <span className="wd-war__top">
          <Door href={war.href} className="wd-war__title ui-row-link">{title}</Door>
          {war.youAreParty ? <Tag tone="risk">You are a party</Tag> : null}
          {war.joined > 0 ? <span className="wd-muted">{war.joined} joined since</span> : null}
        </span>
        <Gauge shape="meter" label={`${title}, intensity`} labelHidden value={war.intensity} valueText={war.intensityText} tone={war.intensity >= 0.66 ? "bad" : "watch"} />
        <span className="wd-muted">{[war.age, war.exposure].filter(Boolean).join(" ")}</span>
      </span>
    </li>
  );
}

/** Every war on the board as a row: who, how hot, how long, and whether American forces stand in it. */
export function Conflicts({ wars }: { readonly wars: readonly WarDeskRow[] }) {
  return (
    <Card role="region" id="wd-conflicts" aria-labelledby="wd-conflicts-title" tabIndex={-1} className="wd-panel">
      <h2 id="wd-conflicts-title" className="wd-panel__title"><Icon name="conflict" size={20} /> Active conflicts <span className="wd-count">{wars.length}</span></h2>
      {wars.length > 0 ? <ul className="wd-rows" aria-label="Wars">{wars.map((war) => <WarLine key={war.id} war={war} />)}</ul>
        : <p className="wd-note">No active armed conflict is recorded. This does not rule out tensions or an unread threat.</p>}
    </Card>
  );
}

/** What the President already has in motion abroad, each a door to the place it is answered. */
export function Pending({ flight }: { readonly flight: readonly InFlight[] }) {
  return (
    <Card role="region" id="wd-pending" aria-labelledby="wd-pending-title" tabIndex={-1} className="wd-panel">
      <h2 id="wd-pending-title" className="wd-panel__title"><Icon name="pending" size={20} /> Pending abroad <span className="wd-count">{flight.length}</span></h2>
      {flight.length > 0 ? (
        <ul className="wd-rows" aria-label="In flight">
          {flight.map((item) => (
            <li key={item.id} className="wd-line ui-row-target">
              <Icon name={FLIGHT[item.kind].icon} size={18} className="wd-line__mark" />
              <span className="wd-line__body">
                <Door href={item.href} className="wd-line__title ui-row-link">{item.title}</Door>
                <span className="wd-muted">{item.detail}</span>
              </span>
              <span className="wd-line__kind">{FLIGHT[item.kind].word}</span>
            </li>
          ))}
        </ul>
      ) : <p className="wd-note">No operation, congressional request, treaty ratification or tariff response is pending.</p>}
    </Card>
  );
}

/** The governments that moved in the last four weeks, with what they did. */
export function Developments({ movers }: { readonly movers: readonly Mover[] }) {
  return (
    <Card role="region" aria-labelledby="wd-moved-title" className="wd-panel">
      <h2 id="wd-moved-title" className="wd-panel__title"><Icon name="press" size={20} /> Recent developments <span className="wd-count">{movers.length}</span></h2>
      {movers.length > 0 ? (
        <ul className="wd-rows" aria-label="Governments that moved">
          {movers.map((mover) => (
            <li key={mover.nation} className="wd-line ui-row-target">
              <FlagOf nation={mover.nation} name={mover.name} />
              <span className="wd-line__body">
                <span className="wd-line__head">
                  <Door href={mover.href} className="wd-line__title ui-row-link">{mover.name}</Door>
                  {mover.stance && mover.stance !== "unread" ? <span className="ui-valence-ink wd-line__stance" data-valence={VALENCE[mover.stance]}>{trustWord(mover.stance)}</span> : null}
                </span>
                <span className="wd-muted">{mover.headline}</span>
              </span>
              <span className="wd-line__kind">{mover.when}</span>
            </li>
          ))}
        </ul>
      ) : <p className="wd-note">No new government activity reached the wire in the last four weeks. Standing conflicts remain above.</p>}
    </Card>
  );
}
