import { COVERAGE_TONES, COVERAGE_TONE_WORD, type CoverageTone, type WeekCoverage } from "@admin/player-core";
import { EmptyState } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { feedHref } from "./press-search";

const STACK = ["critical", "even", "friendly"] as const;
/** A quarter of slots at the least, so three weeks read as the start of a quarter rather than three slabs, and the frame holds still as weeks arrive. */
const MIN_SLOTS = 13;

/** A round top for the scale whose midpoint is a whole number of stories, so both gridlines carry a label a reader can trust. */
function scaleTop(tallest: number): number {
  const step = tallest <= 10 ? 2 : tallest <= 40 ? 4 : 10;
  return Math.max(step, Math.ceil(tallest / step) * step);
}

function spoken(week: WeekCoverage): string {
  if (week.total === 0) return `Week ${week.week}: nothing filed`;
  const parts = COVERAGE_TONES.filter((tone) => week[tone] > 0).map((tone) => `${week[tone]} ${COVERAGE_TONE_WORD[tone].toLowerCase()}`);
  if (week.other > 0) parts.push(`${week.other} from the administration or intelligence`);
  return `Week ${week.week}: ${week.total} ${week.total === 1 ? "story" : "stories"}, ${parts.join(", ")}`;
}

function Legend({ weeks }: { readonly weeks: readonly WeekCoverage[] }) {
  const sum = (tone: CoverageTone) => weeks.reduce((total, week) => total + week[tone], 0);
  const other = weeks.reduce((total, week) => total + week.other, 0);
  return (
    <ul className="pr-legend" aria-label="What the colors mean">
      {COVERAGE_TONES.map((tone) => (
        <li key={tone} data-segment={tone}>
          <span aria-hidden="true" /> {COVERAGE_TONE_WORD[tone]} <strong>{sum(tone)}</strong>
        </li>
      ))}
      {other > 0 ? (
        <li data-segment="other">
          <span aria-hidden="true" /> From the administration or intelligence <strong>{other}</strong>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Every recent week of coverage as one column, split by how the filing desks
 * leaned toward the administration, so the week the press turned is seen
 * before a date is read. Each column filters the feed below to its week.
 */
export function Weeks({ weeks, selected }: { readonly weeks: readonly WeekCoverage[]; readonly selected: number | undefined }) {
  const populated = weeks.some((week) => week.total > 0);
  const top = scaleTop(Math.max(1, ...weeks.map((week) => week.total)));
  const ticks = [top, top / 2, 0];
  const slots = Math.max(MIN_SLOTS, weeks.length);
  return (
    <section id="press-weeks" aria-labelledby="press-weeks-title" tabIndex={-1} className="pr-panel">
      <div className="pr-panel__head">
        <h2 id="press-weeks-title" className="pr-heading">
          Coverage by week
        </h2>
        <p className="pr-note">Stories filed each week. A column opens that week's stories below.</p>
      </div>
      {populated ? <div className="pr-chart">
        <ol className="pr-chart__axis" aria-hidden="true">
          {ticks.map((tick) => (
            <li key={tick} style={{ insetBlockEnd: `${(tick / top) * 100}%` }}>
              {tick}
            </li>
          ))}
        </ol>
        <div className="pr-chart__plot">
          <span className="pr-chart__grid" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} style={{ insetBlockEnd: `${(tick / top) * 100}%` }} data-zero={tick === 0 ? "true" : undefined} />
            ))}
          </span>
          <ol className="pr-weeks" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
            {weeks.map((week) => (
              <li key={week.week}>
                <Door
                  href={feedHref({ week: week.week })}
                  className="pr-weeks__col"
                  aria-label={spoken(week)}
                  aria-current={week.week === selected ? "true" : undefined}
                  title={spoken(week)}
                  data-current={week.current ? "true" : undefined}
                >
                  <span className="pr-weeks__bar" aria-hidden="true">
                    <span className="pr-weeks__stack" style={{ blockSize: `${(week.total / top) * 100}%` }}>
                      {week.other > 0 ? <span data-segment="other" style={{ flexGrow: week.other }} /> : null}
                      {[...STACK].reverse().map((key) => (week[key] > 0 ? <span key={key} data-segment={key} style={{ flexGrow: week[key] }} /> : null))}
                    </span>
                  </span>
                  <span className="pr-weeks__label" aria-hidden="true">
                    {week.week}
                  </span>
                </Door>
              </li>
            ))}
          </ol>
        </div>
      </div> : <EmptyState icon="press" title="No coverage filed yet">The weekly comparison appears when a desk files its first story.</EmptyState>}
      {populated ? <Legend weeks={weeks} /> : null}
    </section>
  );
}
