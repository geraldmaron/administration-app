import { useEffect, useRef } from "react";
import type { CohortId } from "@admin/world";
import type { Campaign } from "@admin/engine";
import { STATE_GROUP_METHOD, formatRatio, place, statePeople, stateGroupRating, type GroupRating, type Standout, type StateDossier, type StatePeople } from "@admin/player-core";
import { Bar, Icon, Series, Stat, StatRow } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { valenceOf } from "../../shell/valence";
import { AXIS_ICON, DemographicProfile, gapText } from "../electorate/DemographicProfile";

const pct = (share: number): string => `${Math.round(share * 100)}%`;
const points = (gap: number): string => gapText(gap).replace(/^[▲▼] /, "");

const HOUSE_SEATS = 435;

function share(value: number): string {
  const rounded = Math.round(value * 1000) / 10;
  return rounded < 0.1 ? "under 0.1%" : `${rounded}%`;
}

/** Size, seats and approval: the headline figures of the place, each against what it is a part of. */
function Headlines({ dossier, people }: { readonly dossier: StateDossier; readonly people: StatePeople }) {
  const { size } = people;
  const approval = dossier.approval;
  const history = approval?.history.map((point) => point.approval) ?? [];
  const first = history[0];
  const sinceOath = approval && history.length > 1 && first !== undefined ? approval.approval - first : undefined;
  const sinceDirection = sinceOath === undefined ? "flat" : Math.round(sinceOath * 100) > 0 ? "up" : Math.round(sinceOath * 100) < 0 ? "down" : "flat";
  return (
    <div className="state-people__headlines">
    <StatRow layout="comparison">
      <Stat layout="comparison"
        size="heading"
        icon="subjectPerson"
        label="Population"
        value={dossier.populationText}
        period={`No. ${size.rank} of ${size.of} states, ${share(size.share)} of the country`}
        reading={<Bar value={size.population / size.largest} tone="reading" slim label={`Population against the largest state: ${Math.round((size.population / size.largest) * 100)} percent`} />}
      />
      <Stat layout="comparison" size="heading" icon="subjectChamber" label="House seats" value={String(dossier.house.seats)} period={`of ${HOUSE_SEATS} · ${share(dossier.house.seats / HOUSE_SEATS)} of the House`} />
      {approval ? (
        <Stat layout="comparison"
          size="heading"
          icon="favorable"
          label="Approval here"
          value={formatRatio(approval.approval)}
          {...(sinceOath === undefined ? {} : { delta: { text: sinceDirection === "flat" ? "0 pts" : points(sinceOath), direction: sinceDirection, tone: sinceDirection === "up" ? "good" : sinceDirection === "down" ? "bad" : "neutral" }, period: "since the oath" })}
          reading={history.length > 1 ? <Series label="Approval here, week by week" values={history} format={formatRatio} reference={{ value: 0.5, label: "Half the state" }} tone={approval.approval >= 0.5 ? "good" : approval.approval >= 0.4 ? "watch" : "bad"} /> : <p className="state-people__note">One week on record so far.</p>}
        />
      ) : null}
    </StatRow>
    </div>
  );
}

/** One group that sets the state apart: its glyph, its share here and what that is against the country. */
function StandoutFact({ fact, name }: { readonly fact: Standout; readonly name: string }) {
  const over = fact.gap > 0;
  return (
    <li className="state-people__fact" data-direction={over ? "over" : "under"}>
      <Icon name={AXIS_ICON[fact.axis]} size={20} />
      <p className="state-people__fact-text">
        <strong>{fact.name}</strong>
        <span className="state-people__fact-detail">
          {pct(fact.state)} of {name} against {pct(fact.nation)} nationally
        </span>
      </p>
      <p className="state-people__fact-gap">
        {gapText(fact.gap)}
        <span className="ui-visually-hidden"> against the country</span>
      </p>
    </li>
  );
}

/** What sets this state's people apart from the country's, at the head of the People view. */
function Standouts({ people, name }: { readonly people: StatePeople; readonly name: string }) {
  if (people.standouts.length === 0) return <p className="brief-section__note">{name} sits close to the country on every axis.</p>;
  return (
    <ul className="state-people__facts" aria-label={`What sets ${name} apart`}>
      {people.standouts.map((fact) => (
        <StandoutFact key={fact.cohort} fact={fact} name={name} />
      ))}
    </ul>
  );
}

function RatingRow({ rating, name }: { readonly rating: GroupRating; readonly name: string }) {
  const valence = valenceOf(rating.stance);
  const national = pct(rating.national);
  const versus = Math.round(rating.gap * 100) === 0 ? `same as nationally (${national})` : `${gapText(rating.gap)} against ${national} nationally`;
  return (
    <li className="state-people__rating" data-valence={valence}>
      <p className="state-people__rating-name">
        <Icon name={AXIS_ICON[rating.axis]} size={18} />
        <span>{rating.name}</span>
      </p>
      <div className="state-people__rating-weight">
        <span className="state-people__rating-key">Share here</span>
        <Bar value={rating.state} tone="reading" slim />
        <span className="state-people__rating-figure">
          {pct(rating.state)}
        </span>
      </div>
      <div className="state-people__rating-support">
        <span className="state-people__rating-key">Support in {name}</span>
        <Bar value={rating.support} tone={valence} slim marks={[{ at: rating.national, label: `Nationally ${national}` }]} label={`${rating.name} in ${name}: ${rating.figure}, against ${national} nationally`} />
        <span className="state-people__rating-figure ui-valence-ink" data-valence={valence}>
          {rating.figure}
          <span className="state-people__rating-unit"> {rating.word.toLowerCase()}</span>
        </span>
      </div>
      <p className="state-people__rating-versus">{versus}</p>
    </li>
  );
}

/** How the groups this state has the most of rate the President here, each against the group's national figure. */
function Ratings({ people, name }: { readonly people: StatePeople; readonly name: string }) {
  if (people.ratings.length === 0) return null;
  return (
    <section className="state-people__block" aria-labelledby="state-people-ratings">
      <h3 id="state-people-ratings" className="state-people__title">
        <Icon name="layerReading" size={20} /> How these groups rate you in {name}
      </h3>
      <p className="brief-section__note">
        The four groups most over-represented here, then the two largest. The tick on each bar is the group's national figure.
      </p>
      <ul className="state-people__ratings" aria-label={`Support among the groups ${name} has most of`}>
        {people.ratings.map((rating) => (
          <RatingRow key={rating.cohort} rating={rating} name={name} />
        ))}
      </ul>
      <p className="state-people__method">{STATE_GROUP_METHOD}</p>
    </section>
  );
}

/** The People view: size and approval, who lives here against the country on every axis, and how those groups rate the President here. */
export function People({ campaign, dossier, cohort }: { readonly campaign: Campaign; readonly dossier: StateDossier; readonly cohort?: CohortId | undefined }) {
  const people = statePeople(campaign, dossier.id);
  const selected = cohort ? stateGroupRating(campaign, dossier.id, cohort) : undefined;
  const selectedPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!cohort) return;
    const frame = requestAnimationFrame(() => { selectedPanel.current?.scrollIntoView({ block: "start", behavior: "instant" }); selectedPanel.current?.focus({ preventScroll: true }); });
    return () => cancelAnimationFrame(frame);
  }, [cohort, dossier.id]);
  if (!people) {
    return (
      <section className="state-section" aria-labelledby="state-people-title">
        <h2 id="state-people-title" className="ui-visually-hidden">People</h2>
        <p className="brief-section__note">The dataset carries no population breakdown for {dossier.name}.</p>
      </section>
    );
  }
  return (
    <section className="state-section state-people" aria-labelledby="state-people-title">
      <h2 id="state-people-title" className="ui-visually-hidden">
        People
      </h2>
      {cohort ? <section ref={selectedPanel} tabIndex={-1} className="state-people__block state-people__selected" aria-labelledby="selected-community-title">
        <h3 id="selected-community-title" className="state-people__title"><Icon name="layerBlocs" size={20} />{selected ? `${selected.name} in ${dossier.name}` : "Community reading unavailable"}</h3>
        {selected ? <><ul className="state-people__ratings"><RatingRow rating={selected} name={dossier.name} /></ul><p className="state-people__method">{STATE_GROUP_METHOD}</p></> : <p>No modeled support reading exists for this community in {dossier.name}.</p>}
      </section> : null}
      <Headlines dossier={dossier} people={people} />
      <section className="state-people__block" aria-labelledby="state-people-apart">
        <h3 id="state-people-apart" className="state-people__title">
          <Icon name="layerBlocs" size={20} /> What sets {dossier.name} apart
        </h3>
        <Standouts people={people} name={dossier.name} />
      </section>
      <section className="state-people__block" aria-labelledby="state-people-mix">
        <h3 id="state-people-mix" className="state-people__title">
          <Icon name="graph" size={20} /> Who lives here, against the country
        </h3>
        <DemographicProfile name={dossier.name} axes={people.axes} grouped />
      </section>
      <Ratings people={people} name={dossier.name} />
    </section>
  );
}

/** The most distinctive facts about the people and every breakdown against the country, open on the Overview; the People view adds how the groups rate the President. */
export function PeopleStrip({ campaign, dossier }: { readonly campaign: Campaign; readonly dossier: StateDossier }) {
  const people = statePeople(campaign, dossier.id);
  if (!people || people.standouts.length === 0) return null;
  return (
    <section className="state-people__strip" aria-labelledby="state-people-strip">
      <h3 id="state-people-strip" className="state-people__title">
        <Icon name="subjectPerson" size={20} /> Who lives here
      </h3>
      <ul className="state-people__facts" aria-label={`What sets ${dossier.name} apart`}>
        {people.standouts.slice(0, 4).map((fact) => (
          <StandoutFact key={fact.cohort} fact={fact} name={dossier.name} />
        ))}
      </ul>
      <h3 className="state-people__title">
        <Icon name="graph" size={20} /> Who lives here, against the country
      </h3>
      <DemographicProfile name={dossier.name} axes={people.axes} grouped />
      <Door href={`${place.state(dossier.id)}?view=people`} className="state-people__more">
        How these groups rate you in {dossier.name}
      </Door>
    </section>
  );
}
