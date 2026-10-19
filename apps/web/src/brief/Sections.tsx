import { compareDates, daysBetween, type Campaign } from "@admin/engine";
import { formatDate, formatRatio, place, recordRows, removalStanding, runningClocks, stopLines, type RunningClockRow, type StopBrief } from "@admin/player-core";
import { BarRows, HelpTip, Collection, Countdown, Gauge, Icon, Tag } from "@admin/ui-web";
import { useBuilt } from "../shell/built-routes";
import { Door } from "../shell/Door";
import { EntryRow, moveScales } from "../record/EntryRow";

/** How many of the President's acts the Brief lists before it offers the rest. */
const OUTCOMES_SHOWN = 4;

/**
 * How far the last run took the country and what stopped it, until the
 * digest is read. Every stop is named with the screen that answers it.
 */
export function LastRun({ brief, sentence }: { readonly brief: StopBrief; readonly sentence: string }) {
  const built = useBuilt();
  const lines = stopLines(brief);
  return (
    <section className="last-run ui-card-door" aria-labelledby="last-run-title">
      <h2 id="last-run-title" className="brief-section__title">
        <Icon name="pending" size={20} /> <Door href="/brief?view=history" className="ui-card-door__link text-foreground no-underline hover:no-underline">While time ran</Door>
      </h2>
      <p className="last-run__sentence">{sentence}</p>
      {lines.length > 0 ? (
        <ul className="last-run__stops">
          {lines.map((line) => (
            <li key={line.id} {...(built(line.href) ? { className: "ui-row-target" } : {})}>
              <Icon name={line.urgency === "hard" ? "escalate" : "pending"} size={16} />
              {built(line.href) ? <Door href={line.href} className="ui-row-link">{line.title}</Door> : <span>{line.title}</span>}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ClockRow({ campaign, clock }: { readonly campaign: Campaign; readonly clock: RunningClockRow }) {
  const days = clock.due ? daysBetween(campaign.calendar, clock.due) : undefined;
  const window = clock.window;
  const valence = clock.urgency === "due" ? "bad" : clock.urgency === "closing" ? "watch" : undefined;
  return (
    <li className="clock-row ui-row-target" data-urgency={clock.urgency}>
      <Door href={clock.href} className="clock-row__title ui-row-link text-foreground no-underline hover:no-underline">
        {clock.title}
      </Door>
      {days !== undefined && days < 0 ? (
        <p className="clock-row__due">
          <Tag tone="neutral" icon="pending">Running</Tag> since {formatDate(clock.due!)}
        </p>
      ) : window ? (
        <Countdown left={Math.max(0, window.length - window.consumed)} window={window.length} unit={window.unit} {...(clock.due ? { dueText: formatDate(clock.due) } : {})} {...(valence ? { tone: valence } : {})} />
      ) : days !== undefined ? (
        <Countdown left={days} unit="day" {...(clock.due ? { dueText: formatDate(clock.due) } : {})} {...(valence ? { tone: valence } : {})} />
      ) : (
        <p className="clock-row__due">No date set</p>
      )}
      <p className="clock-row__line">{clock.line}</p>
    </li>
  );
}

/**
 * The institutional clocks running now, nearest first. Every one is listed;
 * the nearest lead and the count says how many more there are.
 */
export function RunningClocks({ campaign }: { readonly campaign: Campaign }) {
  const running = runningClocks(campaign)
    .filter((clock) => clock.due !== undefined)
    .sort((a, b) => compareDates(a.due!, b.due!));
  return (
    <section className="clocks" aria-labelledby="clocks-title">
      <h2 id="clocks-title" className="brief-section__title">
        <Icon name="pending" size={20} /> Effective dates and review
      </h2>
      <Collection items={running} initial={5} noun="dates" className="clocks__list" render={(clock) => <ClockRow key={clock.id} campaign={campaign} clock={clock} />} empty="No deadline or review date is running." />
    </section>
  );
}

/** The President's own recent acts and what they moved, newest first, each opening its Record entry. */
export function RecentOutcomes({ campaign }: { readonly campaign: Campaign }) {
  const rows = recordRows(campaign, "player");
  const scales = moveScales(rows);
  return (
    <section className="outcomes" aria-labelledby="outcomes-title">
      <h2 id="outcomes-title" className="brief-section__title">
        <Icon name="record" size={20} /> Recent outcomes
      </h2>
      <Collection
        items={rows}
        initial={OUTCOMES_SHOWN}
        noun="entries"
        as="ol"
        className="rec-rows"
        empty="You have not acted yet. Your first decision will be recorded here."
        render={(row) => <EntryRow key={row.id} row={row} href={place.event(row.id)} scales={scales} />}
      />
    </section>
  );
}

/** How close Congress is to moving against the President, against the lines that open each proceeding; the terms behind the figure fold away while calm. */
export function Standing({ campaign }: { readonly campaign: Campaign }) {
  const standing = removalStanding(campaign);
  const tone = standing.stance === "adverse" ? "bad" : standing.stance === "caution" ? "watch" : "good";
  return (
    <section className="standing" aria-labelledby="standing-title" data-stance={standing.stance}>
      <h2 id="standing-title" className="brief-section__title">
        <Icon name="layerReading" size={20} /> Standing
      </h2>
      <Gauge
        label="Removal pressure"
        shape="meter"
        value={standing.pressure}
        valueText={standing.figure}
        tone={tone}
        marks={standing.thresholds.map((line) => ({ at: line.at, label: line.label }))}
        caption={standing.thresholds.map((line) => `${formatRatio(line.at)}: ${line.label}`).join(" · ")}
      />
      <section className="standing__fold" aria-label="Sources of removal pressure">
        <h3>Sources of pressure <HelpTip label="About removal pressure">These are simulation contributions to congressional pressure, not legal findings or a prediction that Congress will remove the President.</HelpTip></h3>
        <BarRows
          label="What the pressure is made of now"
          labelWidth="14rem"
          slim
          rows={standing.terms.map((term) => {
            const part = Math.min(1, term.share / Math.max(0.0001, standing.liveTotal));
            return { id: term.key, label: term.label, value: part, figure: formatRatio(part), tone: "neutral" as const, spoken: "of pressure" };
          })}
        />
      </section>
      {standing.ownParty ? <OwnParty standing={standing.ownParty} /> : null}
    </section>
  );
}

/** Where the President's own party stands: what a grave charge would cost in their caucus, and the inability watch against its design threshold. */
function OwnParty({ standing }: { readonly standing: NonNullable<ReturnType<typeof removalStanding>["ownParty"]> }) {
  const { inability } = standing;
  const lost = standing.senatorsLost;
  return (
    <section className="standing__fold" aria-label="Your own party">
      <h3>Your own party</h3>
      <Gauge
        label="Your party's identifiers approving you"
        shape="meter"
        value={standing.approval}
        valueText={standing.figure}
        tone={inability.below ? "bad" : "good"}
        marks={[{ at: inability.line, label: `Inability line, ${inability.lineFigure}` }]}
        caption={`A grave charge would cost you about ${lost} of your ${standing.senators} senators. Without one, none break.`}
      />
      <Gauge
        label="Weeks below the inability line"
        shape="meter"
        value={Math.min(1, inability.weeksBelow / inability.weeksNeeded)}
        valueText={`${inability.weeksBelow} of ${inability.weeksNeeded}`}
        tone={inability.below ? "watch" : "good"}
        caption={
          inability.weeksUntilRetry
            ? `A declaration failed in Congress; another cannot come for ${inability.weeksUntilRetry} weeks.`
            : inability.below
              ? `Your party's identifiers are under ${inability.lineFigure}. If that holds for ${inability.weeksNeeded} weeks, the Vice President and cabinet can declare you unable to serve, and two thirds of each chamber must uphold it. The ${inability.lineFigure} line is a game threshold; no President has been tested on it.`
              : `The Vice President and cabinet can declare you unable to serve once your party's identifiers stay under ${inability.lineFigure} for ${inability.weeksNeeded} weeks. That line is a game threshold; no President has been tested on it.`
        }
      />
    </section>
  );
}
