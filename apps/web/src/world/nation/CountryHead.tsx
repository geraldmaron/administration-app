import { selectDateOfTurn, type Campaign } from "@admin/engine";
import { formatDate, place, type NationFile, type StandingTrend } from "@admin/player-core";
import { Flag, Icon, Portrait, Sparkline, Steps, StepsTable, type IconName } from "@admin/ui-web";
import { faceOf } from "../../media/faces";
import { rememberDeparture } from "../../shell/return-context";
import { Door } from "../../shell/Door";
import { nationFlagUrl } from "../../media/flags";
import { toneOf, valenceOf } from "../../shell/valence";
import { COUNTRY_VIEW_LABELS } from "./country-views";
import { countryPriorities, type CountryPriority } from "./priorities";
import type { CountryView } from "./country-search";
import "./country.css";

/** A dataset region id as a reader says it: "region-east-asia" is East Asia. */
export function regionName(region: string): string {
  return region.replace(/^region-/, "").split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function Leader({ campaign, file }: { readonly campaign: Campaign; readonly file: NationFile }) {
  const { leader } = file;
  if (!leader.person) return <p id="country-leader" className="brief-section__note">The services name no one in the top office this week.</p>;
  const face = faceOf(campaign, leader.person.id, leader.person.name);
  return (
    <div id="country-leader" className="leader ui-card-door">
      <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="lg" decorative />
      <div className="leader__body">
        <p className="leader__role">{leader.title ?? "Leader"}</p>
        <p className="leader__name">
          <Door href={place.person(leader.person.id as string)} className="ui-card-door__link">
            {leader.person.name}
          </Door>
        </p>
        {file.inOfficeSince ? (
          <p className="leader__since">
            <Icon name="dossier" size={16} /> {file.inOfficeSince}
          </p>
        ) : null}
        {file.nextSelection ? (
          <p className="leader__since">
            <Icon name="schedule" size={16} /> {file.nextSelection}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type TrendRow = { readonly id: string; readonly label: string; readonly icon: IconName; readonly change: NonNullable<StandingTrend["ours"]>; readonly risingIsGood: boolean };

function trendRows(trend: StandingTrend): readonly TrendRow[] {
  const rows: readonly (TrendRow | undefined)[] = [
    trend.theirs ? { id: "theirs", label: "Their trust", icon: "layerTrust", change: trend.theirs, risingIsGood: true } : undefined,
    trend.ours ? { id: "ours", label: "Our trust", icon: "subjectPerson", change: trend.ours, risingIsGood: true } : undefined,
    trend.tension ? { id: "tension", label: "Tension", icon: "conflict", change: trend.tension, risingIsGood: false } : undefined,
  ];
  return rows.filter((row): row is TrendRow => row !== undefined);
}

/** Each reading's weekly path with its quarter's move; a record opened mid-game says where it starts instead of implying a longer one. */
function RelationshipTrend({ campaign, trend }: { readonly campaign: Campaign; readonly trend: StandingTrend }) {
  const rows = trendRows(trend);
  if (rows.length === 0) return null;
  const since = trend.start.since;
  const startNote = trend.start.fromOath ? undefined : since === undefined ? trend.start.note : `Record starts ${formatDate(selectDateOfTurn(campaign, since))}`;
  return (
    <div className="country-trend">
      <ul className="country-trend__rows">
        {rows.map((row) => {
          const move = row.change.change13;
          const moved = move !== undefined && move !== 0;
          const good = moved ? (move > 0) === row.risingIsGood : undefined;
          const valence = good === undefined ? "neutral" : good ? "good" : "bad";
          return (
            <li key={row.id} className="country-trend__row">
              <span className="country-trend__label">
                <Icon name={row.icon} size={16} /> {row.label}
              </span>
              <Sparkline values={row.change.points.map((point) => point.value)} valence={valence} />
              <span className="country-trend__change ui-valence-ink" data-valence={valence}>
                {move === undefined ? "Under 13 weeks" : !moved ? "▬ Steady over 13 weeks" : `${move > 0 ? "▲ Up" : "▼ Down"} over 13 weeks`}
              </span>
            </li>
          );
        })}
      </ul>
      {startNote ? <p className="brief-section__note">{startNote}</p> : null}
    </div>
  );
}

/** Where the two governments stand now: their view of you, your read of them and the tension between you. */
function RelationshipNow({ campaign, file }: { readonly campaign: Campaign; readonly file: NationFile }) {
  const { standing } = file;
  return (
    <section className="country-now" aria-labelledby="country-now-title">
      <h2 id="country-now-title" className="country-head__heading">
        Relationship now
      </h2>
      <StepsTable label="Relationship readings">
        {standing.theirs ? (
          <Steps layout="row" icon="layerTrust" label={standing.theirs.caption} lit={standing.theirs.trust.level} word={standing.theirs.trust.word} tone={toneOf(standing.theirs.trust.stance)} />
        ) : (
          <p className="country-unread">
            <Icon name="hidden" size={16} /> Their view of you is unread. The services have no read on it yet.
          </p>
        )}
        {standing.ours ? <Steps layout="row" icon="subjectPerson" label={standing.ours.caption} lit={standing.ours.trust.level} word={standing.ours.trust.word} tone={toneOf(standing.ours.trust.stance)} /> : null}
        {standing.tension ? <Steps layout="row" icon="conflict" label="Tension between you" lit={standing.tension.level} word={standing.tension.word} tone={toneOf(standing.tension.stance)} /> : null}
      </StepsTable>
      <RelationshipTrend campaign={campaign} trend={standing.trend} />
    </section>
  );
}

const PRIORITY_GLYPH: Readonly<Record<CountryPriority["tone"], IconName>> = { risk: "adverse", caution: "caution", neutral: "info" };

function Priorities({ file, onView }: { readonly file: NationFile; readonly onView: (view: CountryView) => void }) {
  const items = countryPriorities(file);
  return (
    <section className="country-priorities attention-worklist" aria-labelledby="country-priorities-title">
      <h2 id="country-priorities-title" className="country-head__heading">
        What needs attention
      </h2>
      {items.length === 0 ? (
        <p className="brief-section__note">Nothing stands out. No war, measure, commitment or tension marks this file.</p>
      ) : (
        <ul className="country-priorities__list">
          {items.map((item) => (
            <li key={item.id} className="country-priority" data-tone={item.tone}>
              <button type="button" id={`country-attention-${item.id}`} className="country-priority__open attention-action" onClick={(event) => { rememberDeparture(event.currentTarget); onView(item.view); }}>
                <Icon name={PRIORITY_GLYPH[item.tone]} size={16} />
                <span className="country-priority__text">{item.text}</span>
                <span className="country-priority__go">Review {COUNTRY_VIEW_LABELS[item.view].toLowerCase()} →</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The government's overall stance toward you as one chip, with a war as its own, so the file opens on a verdict. */
function StanceChip({ file }: { readonly file: NationFile }) {
  if (file.atWarWith.length > 0) {
    return (
      <span className="ui-valence-chip" data-valence="bad">
        <Icon name="conflict" size={16} /> At war
      </span>
    );
  }
  const theirs = file.standing.theirs;
  if (!theirs) {
    return (
      <span className="ui-valence-chip" data-valence="neutral">
        <Icon name="hidden" size={16} /> Unread
      </span>
    );
  }
  const valence = valenceOf(theirs.trust.stance);
  const glyph = valence === "good" ? "favorable" : valence === "bad" ? "adverse" : valence === "watch" ? "caution" : "neutral";
  return (
    <span className="ui-valence-chip" data-valence={valence}>
      <Icon name={glyph} size={16} /> {theirs.trust.word}
    </span>
  );
}

/** Shared identity stays visible while the selected country workspace leads. */
export function CountryIdentity({ file, onOverview }: { readonly file: NationFile; readonly onOverview?: () => void }) {
  const src = nationFlagUrl(file.nation);
  const alerts = countryPriorities(file).filter((item) => item.tone !== "neutral");
  return <div className="country-identity">
    <div className="country-hero">
      <Flag name={file.name} {...(src ? { src } : {})} height={40} />
      <p className="country-hero__seat"><span>{regionName(file.leader.region)}</span><span>Capital: {file.leader.capital}</span></p>
      <StanceChip file={file} />
    </div>
    {onOverview && alerts.length > 0 ? <button type="button" id="country-file-alerts" className="country-alert attention-action" onClick={(event) => { rememberDeparture(event.currentTarget); onOverview(); }}>
      <Icon name={alerts.some((item) => item.tone === "risk") ? "adverse" : "caution"} size={16} />
      <span>{alerts.length} {alerts.length === 1 ? "alert" : "alerts"} in this file</span><Icon name="chevron" size={16} />
    </button> : null}
  </div>;
}

/** Full identity, relationship and attention evidence belongs to the overview. */
export function CountryHead({ campaign, file, onView }: { readonly campaign: Campaign; readonly file: NationFile; readonly onView: (view: CountryView) => void }) {
  return (
    <header className="country-head">
      <CountryIdentity file={file} />
      <Leader campaign={campaign} file={file} />
      <RelationshipNow campaign={campaign} file={file} />
      <Priorities file={file} onView={onView} />
    </header>
  );
}
