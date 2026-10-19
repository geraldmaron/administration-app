import type { Campaign } from "@admin/engine";
import { Tag } from "@admin/ui-web";
import type { BlocHold, BlocMove, BlocReading, BlocTopline, OpinionTrends } from "@admin/player-core";
import { Course } from "./Course";
import type { Valence } from "../../shell/valence";
import { ReadingBar, percent, signValence, signedTenths, stanceValence, tenths } from "./draw";

type Driver = { readonly key: string; readonly label: string; readonly delta: number };

/** Diverging rows of what moved a bloc, each against the largest of them so the bars compare. */
function Drivers({ rows, label }: { readonly rows: readonly Driver[]; readonly label: string }) {
  const reach = Math.max(...rows.map((row) => Math.abs(row.delta)), 0.0001);
  return (
    <ul className="elec-drivers" aria-label={label}>
      {rows.map((row) => {
        const valence = signValence(tenths(row.delta));
        const size = `${(Math.abs(row.delta) / reach) * 50}%`;
        return (
          <li key={row.key} className="elec-driver" data-valence={valence}>
            <span className="elec-driver__reason">{row.label}</span>
            <span className="elec-diverge" aria-hidden="true">
              <span className="elec-diverge__axis" />
              <span className="elec-diverge__bar" style={row.delta < 0 ? { insetInlineEnd: "50%", inlineSize: size } : { insetInlineStart: "50%", inlineSize: size }} />
            </span>
            <span className="elec-driver__delta ui-valence-ink" data-valence={valence}>
              {row.delta > 0 ? "▲" : row.delta < 0 ? "▼" : "▬"} {signedTenths(row.delta)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const withMove = (rows: readonly (BlocMove | BlocHold)[]): readonly Driver[] => rows.filter((row) => Math.abs(row.delta) >= 0.0005);

function TurnoutNote({ bloc }: { readonly bloc: BlocReading }) {
  const gap = Math.round((bloc.turnout.now - bloc.turnout.habit) * 100);
  if (gap === 0) return null;
  return (
    <p className="elec-note">
      {gap < 0 ? `Staying home: about ${percent(bloc.turnout.now)} would vote, ${Math.abs(gap)} points under its habit.` : `Turning out: about ${percent(bloc.turnout.now)} would vote, ${gap} points over its habit.`}
    </p>
  );
}

function Bloc({ bloc, campaign, trends }: { readonly bloc: BlocReading; readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const valence = stanceValence(bloc.stance);
  const moves = bloc.week ? withMove(bloc.week.moves) : [];
  const holds = withMove(bloc.holds);
  return (
    <li className="elec-bloc" data-valence={valence}>
      <div className="elec-bloc__head">
        <div className="elec-bloc__who">
          <p className="elec-bloc__name">
            {bloc.name}
            {bloc.base ? <Tag tone="identity">Your base</Tag> : null}
          </p>
          <p className="elec-bloc__share">
            <span className="elec-bloc__share-bar" aria-hidden="true">
              <span style={{ inlineSize: `${bloc.share * 100}%` }} />
            </span>
            <span>{percent(bloc.share)} of the country</span>
          </p>
        </div>
        <ReadingBar value={bloc.approval} valence={valence} />
        <p className="elec-figure ui-valence-ink" data-valence={valence}>
          {percent(bloc.approval)}
          <span className="elec-bloc__word"> {bloc.word}</span>
        </p>
        <Course campaign={campaign} start={trends.start} series={trends.blocs.find((series) => series.id === bloc.id)} label={`${bloc.name}, week by week`} />
      </div>
      <p className="elec-bloc__adds">
        Adds <strong>{tenths(bloc.contribution)}</strong> points to the headline: {percent(bloc.share)} of the country approving at {percent(bloc.approval)}.
      </p>
      {moves.length > 0 ? <Drivers rows={moves} label={`What moved ${bloc.name} this week`} /> : bloc.week ? <p className="elec-note">Nothing moved this bloc this week.</p> : null}
      {holds.length > 0 ? <Drivers rows={holds} label={`What is holding ${bloc.name} where it is`} /> : null}
      {bloc.id === "independent" ? null : <p className="elec-note">Moves {percent(bloc.responsiveness)} as much as independents do on the same news.</p>}
      <TurnoutNote bloc={bloc} />
    </li>
  );
}

/**
 * The headline as the three blocs it adds up to: each one's share of the
 * country and its approval, what moved it this week, and the sum. The engine
 * keeps five blocs; leaners are shown with their party.
 */
export function Blocs({ blocs, valence, campaign, trends }: { readonly blocs: BlocTopline; readonly valence: Valence; readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const total = blocs.blocs.map((bloc) => tenths(bloc.contribution));
  return (
    <div className="elec-bloc-wrap">
      <h3 className="elec-subtitle">Three blocs, one headline</h3>
      <p className="elec-note">Approval is each bloc&rsquo;s share of the country times how many of it approve, added up. Leaners are counted with the party they lean toward.</p>
      <ul className="elec-blocs" aria-label="Approval by bloc">
        {blocs.blocs.map((bloc) => (
          <Bloc key={bloc.id} bloc={bloc} campaign={campaign} trends={trends} />
        ))}
      </ul>
      <div className="elec-bloc-sum" data-valence={valence}>
        <p className="elec-bloc-sum__label">Approval, settled</p>
        <span className="elec-stack ui-valence-ink" data-valence={valence} aria-hidden="true">
          {blocs.blocs.map((bloc) => (
            <span key={bloc.id} style={{ inlineSize: `${bloc.contribution * 100}%` }} />
          ))}
        </span>
        <p className="elec-figure elec-bloc-sum__figure">{percent(blocs.headline)}</p>
        <p className="elec-note elec-bloc-sum__sum">
          {total.map((value) => value.toFixed(1)).join(" + ")} = {tenths(blocs.headline).toFixed(1)} points, the figure the Brief and removal pressure use.
        </p>
      </div>
    </div>
  );
}
