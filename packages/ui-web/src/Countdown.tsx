import { Bar, type BarTone } from "./Bar";
import { Icon } from "./Icon";

export type CountdownTone = "good" | "watch" | "bad" | "neutral";

export type CountdownProps = {
  /** Units still left; zero or less reads as due. */
  readonly left: number;
  /** The whole window a rule gave, where one exists: only a window can draw how much of it is gone. */
  readonly window?: number;
  readonly unit: "day" | "week";
  /** The due date as the screen writes it; shown under the figure. */
  readonly dueText?: string;
  /** Overrides the color a window would pick: a model's own urgency beats a ratio. */
  readonly tone?: CountdownTone;
};

function plural(n: number, unit: "day" | "week"): string {
  return n === 1 ? unit : `${unit}s`;
}

/** A window running down is red once a third is left, amber under two thirds. */
function toneOf(left: number, window: number | undefined): CountdownTone {
  if (left <= 0) return "bad";
  if (window === undefined || window <= 0) return "neutral";
  const share = left / window;
  return share < 1 / 3 ? "bad" : share < 2 / 3 ? "watch" : "neutral";
}

const BAR_TONE: Readonly<Record<CountdownTone, BarTone>> = { good: "good", watch: "watch", bad: "bad", neutral: "neutral" };

/**
 * Time left as a flat track that drains toward the deadline, with the figure
 * big beside it and the date under it. Without a rule's window there is no
 * honest length to drain from, so only the figure and the date are drawn.
 */
export function Countdown({ left, window, unit, dueText, tone }: CountdownProps) {
  const read = tone ?? toneOf(left, window);
  const share = window && window > 0 ? Math.min(1, Math.max(0, left / window)) : undefined;
  const said = left <= 0 ? "Due now" : `${left} ${plural(left, unit)} left`;
  const spoken = `${said}${window ? ` of ${window}` : ""}${dueText ? `, ${dueText}` : ""}`;
  return (
    <span className="ui-countdown" data-valence={read} role="img" aria-label={spoken}>
      <span className="ui-countdown__figure" aria-hidden="true">
        {left <= 0 ? (
          <span className="ui-countdown__num">Due</span>
        ) : (
          <>
            <span className="ui-countdown__num">{left}</span>
            <span className="ui-countdown__unit">{plural(left, unit)}</span>
          </>
        )}
      </span>
      {share !== undefined ? <Bar value={share} tone={BAR_TONE[read]} slim /> : null}
      {dueText ? (
        <span className="ui-countdown__due" aria-hidden="true">
          <Icon name="schedule" size={14} /> {dueText}
        </span>
      ) : null}
    </span>
  );
}

/** A matter with no rule behind it has no deadline; saying so with a glyph beats a sentence about the absence. */
export function OpenEnded({ holds, note }: { readonly holds: boolean; readonly note?: string }) {
  return (
    <span className="ui-countdown" data-open="true" data-valence="neutral" role="img" aria-label={`No deadline${note ? `; ${note}` : ""}${holds ? "; time is held" : ""}`}>
      <span className="ui-countdown__figure" aria-hidden="true">
        <Icon name={holds ? "paused" : "pending"} size={18} />
        <span className="ui-countdown__unit">{holds ? "Time held" : "No deadline"}</span>
      </span>
      {note ? (
        <span className="ui-countdown__due" aria-hidden="true">
          {note}
        </span>
      ) : null}
    </span>
  );
}
