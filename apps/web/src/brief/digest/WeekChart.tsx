import { formatDate, formatSignedPoints, type DigestView, type WeekBar } from "@admin/player-core";
import { Icon } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { digestHref } from "../WeekDigest";

function Step({ week, label, older }: { readonly week: number | undefined; readonly label: string; readonly older?: boolean }) {
  const icon = <Icon name="chevron" size={16} className={older ? "dg-weeks__older" : undefined} />;
  if (week === undefined) return <span className="dg-weeks__step" aria-hidden="true" data-disabled="true">{icon}</span>;
  return <Door href={digestHref(week)} className="dg-weeks__step" aria-label={label}>{icon}</Door>;
}

function describe(bar: WeekBar): string {
  return bar.delta === undefined ? "approval not kept for this week" : `approval ${formatSignedPoints(bar.delta)} points`;
}

/** The scale the tallest bar stands for, read back off a bar so the caption can never disagree with the chart. */
function fullHeight(bars: readonly WeekBar[]): string | undefined {
  const sample = bars.find((bar) => bar.delta !== undefined && Math.abs(bar.share) > 0.01 && Math.abs(bar.share) < 1.01);
  if (!sample || sample.delta === undefined) return undefined;
  return `${formatSignedPoints(Math.abs(sample.delta / sample.share)).slice(1)} points`;
}

/**
 * Approval's change in each week of the quarter, up for a rise and down for a
 * fall from one zero line, so the week approval fell is seen before a date is
 * read. Each column opens its week.
 */
export function WeekChart({ view }: { readonly view: DigestView }) {
  const full = fullHeight(view.bars);
  const older = view.olderWeek;
  const newer = view.newerWeek;
  return (
    <nav className="dg-weeks" aria-label="Weeks of the term">
      <div className="dg-weeks__head">
        <Step week={older} older label={older === undefined ? "No earlier week" : `Previous week, ${older}`} />
        <p className="dg-weeks__title">Approval change by week{full ? <span>Full height is {full}</span> : null}</p>
        <Step week={newer} label={newer === undefined ? "No later week" : `Next week, ${newer}`} />
      </div>
      <ol className="dg-weeks__bars">
        {view.bars.map((bar) => {
          const size = `${Math.abs(bar.share) * 100}%`;
          return (
            <li key={bar.week}>
              <Door
                href={digestHref(bar.week)}
                className="dg-weeks__bar"
                aria-current={bar.current ? "page" : undefined}
                aria-label={`Week ${bar.week}, from ${formatDate(bar.from)}: ${describe(bar)}`}
                title={`Week ${bar.week}: ${describe(bar)}`}
                data-known={bar.delta === undefined ? "false" : "true"}
              >
                <span className="dg-weeks__half" data-side="up" aria-hidden="true">{bar.share > 0 ? <span style={{ blockSize: size }} /> : null}</span>
                <span className="dg-weeks__half" data-side="down" aria-hidden="true">{bar.share < 0 ? <span style={{ blockSize: size }} /> : null}</span>
                <span className="dg-weeks__label">{bar.week}</span>
              </Door>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
