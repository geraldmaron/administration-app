import type { ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { appropriationStatus, economyReading, nowReadings, orderPipeline, polarizationReading, readingBand, type NationOverview, type OpinionTrends, type ToplineView } from "@admin/player-core";
import { Bar, Stat, StatRow, Icon, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { FUNDING_ALARM_WEEKS } from "../../shell/standing-attention";
import { valenceOf, type Valence } from "../../shell/valence";
import { againstEraWords, percent, signedPoints, signedPercent, stanceValence } from "../electorate/draw";
import { settledApproval } from "../electorate/Topline";

type CountryTileProps = {
  readonly label: string;
  readonly valence: Valence;
  readonly figure: string;
  readonly unit?: string;
  readonly move?: ReactNode;
  readonly bar: ReactNode;
  readonly caption: ReactNode;
};

function CountryTile({ label, valence, figure, unit, move, bar, caption }: CountryTileProps) {
  return (
    <li className="nkpi" data-valence={valence}>
      <Stat layout="comparison" heading tone={valence} label={label} value={<>{figure}{unit ? <small>{unit}</small> : null}</>} reading={bar} period={<>{move ? <span>{move}<br /></span> : null}{caption}</>} />
    </li>
  );
}

function ApprovalTile({ campaign, topline }: { readonly campaign: Campaign; readonly topline: ToplineView }) {
  const settled = settledApproval(topline, campaign);
  const headline = nowReadings(campaign).find((reading) => reading.key === "approval");
  const valence = stanceValence(headline?.stance ?? "neutral");
  const week = headline?.week;
  const move =
    week === undefined ? undefined : week.direction === "flat" ? (
      "Unchanged on last week"
    ) : (
      <>
        <span className="ui-valence-ink" data-valence={week.direction === "up" ? "good" : "bad"}>
          <span aria-hidden="true">{week.direction === "up" ? "▲" : "▼"}</span> {week.text.replace(/^[+−-]/, "")}
          <span className="ui-visually-hidden"> {week.direction === "up" ? "up" : "down"}</span>
        </span>{" "}
        on last week
      </>
    );
  return (
    <CountryTile
      label="Approval, settled this week"
      valence={valence}
      figure={percent(settled)}
      unit={readingBand("standing", settled)?.word ?? ""}
      {...(move === undefined ? {} : { move })}
      bar={<Bar label={`Approval ${percent(settled)}; a majority is 50%`} value={settled} tone={valence === "neutral" ? "reading" : valence} marks={[{ at: 0.5, label: "50%" }]} />}
      caption={`The tracking poll has it at ${topline.poll.figure} ${topline.poll.margin}, a sample of this figure.`}
    />
  );
}

function PolarizationTile({ campaign, trends }: { readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const reading = polarizationReading(campaign);
  const series = trends.polarization;
  const change = series.change13 ?? series.change4;
  const period = series.change13 !== undefined ? "in 13 weeks" : "in 4 weeks";
  const points = change === undefined ? 0 : Math.round(change * 100);
  // A rise in division is bad for the President: it damps every judgment.
  const valence: Valence = points > 0 ? "bad" : points < 0 ? "good" : "neutral";
  return (
    <CountryTile
      label="Polarization"
      valence={valence}
      figure={signedPercent(reading.againstEra)}
      unit="against the 2020s"
      {...(change === undefined || points === 0 ? {} : { move: <span className="ui-valence-ink" data-valence={valence}><span aria-hidden="true">{points > 0 ? "▲" : "▼"}</span> {signedPoints(change).replace(/^[+−]/, "")} {period}</span> })}
      bar={<Bar label={`Division ${againstEraWords(reading.againstEra)}`} value={reading.position} mode="level" tone="neutral" marks={[{ at: reading.anchorAt, label: "2020s level" }]} />}
      caption="A more divided country holds each party's view of you where it is."
    />
  );
}

type Portfolio = { readonly href: string; readonly icon: IconName; readonly label: string; readonly reading: string; readonly note: string; readonly valence: Valence };

/** Each portfolio with the one live reading that says whether it needs the President this week. */
function portfolios(campaign: Campaign, active: number): readonly Portfolio[] {
  const jobs = economyReading(campaign, "unemployment");
  const funding = appropriationStatus(campaign);
  const ready = orderPipeline(campaign).find((stage) => stage.stage === "desk")?.rows.length ?? 0;
  const weeks = Math.max(0, funding.weeksLeft);
  return [
    { href: "/nation/economy", icon: "economyGrowth", label: "Economy", reading: jobs?.tile.figure ?? "Not available", note: "Unemployment", valence: valenceOf(jobs?.tile.stance) },
    { href: "/nation/budget", icon: "budget", label: "Budget", reading: funding.shutdown ? "Closed" : `${weeks} ${weeks === 1 ? "week" : "weeks"}`, note: funding.shutdown ? "The government is closed" : "of funding left", valence: funding.shutdown || weeks <= FUNDING_ALARM_WEEKS ? "bad" : weeks <= 16 ? "watch" : "good" },
    { href: "/nation/policy", icon: "order", label: "Policy", reading: String(ready), note: ready === 1 ? "order ready to sign" : "orders ready to sign", valence: "neutral" },
    { href: "/nation/emergency", icon: "caution", label: "Emergencies", reading: String(active), note: active === 1 ? "declaration in force" : "declarations in force", valence: active > 0 ? "watch" : "good" },
  ];
}

type KpiProps = { readonly campaign: Campaign; readonly overview: NationOverview; readonly topline: ToplineView; readonly trends: OpinionTrends };

/** The country in one band: the three readings every view below is about, then the four portfolios that act on it. */
export function NationKpis({ campaign, overview, topline, trends }: KpiProps) {
  return (
    <section className="nkpis" aria-labelledby="nkpis-title">
      <h2 id="nkpis-title" className="ui-visually-hidden">
        The country this week
      </h2>
      <StatRow as="ul" layout="comparison" className="nkpis__country">
        <ApprovalTile campaign={campaign} topline={topline} />
        <PolarizationTile campaign={campaign} trends={trends} />
      </StatRow>
      <nav className="nation-doors" aria-label="Domestic portfolios">
        {portfolios(campaign, overview.emergencies.length).map((door) => (
          <Door key={door.href} href={door.href} className="nation-doors__link" data-valence={door.valence}>
            <Icon name={door.icon} size={20} className="nation-doors__icon" />
            <span className="nation-doors__label">{door.label}</span>
            <span className="nation-doors__reading ui-valence-ink" data-valence={door.valence}>{door.reading}</span>
            <span className="nation-doors__note">{door.note}</span>
          </Door>
        ))}
      </nav>
    </section>
  );
}
