import { EvidencePanel } from "@admin/ui-web";
import type { ReachLine } from "@admin/player-core";

const FIRST = 6;

/**
 * Who an act lands on, drawn: groups it helps run right in good ink, groups it
 * costs run left in bad ink, and every bar is to scale with the others. The
 * heaviest group fills its half; weights are small shares of the act's whole
 * reach, so the figure that matters is how groups compare.
 *
 * Mount wherever `reachLines` is available, in place of the `reach` sentence.
 */
export function ReachBars({ lines, label = "Who it reaches", limit = FIRST }: { readonly lines: readonly ReachLine[]; readonly label?: string; readonly limit?: number }) {
  if (lines.length === 0) return <p className="elec-note">It names no group in particular.</p>;
  const heaviest = Math.max(...lines.map((line) => line.weight), 0.0001);
  const shown = lines.slice(0, limit);
  const helps = lines.filter((line) => line.direction === "helps").length;
  const costs = lines.length - helps;
  return (
    <div className="reach" role="group" aria-label={label}>
      <p className="reach__axis" aria-hidden="true">
        <span className="reach__axis-side" data-valence="bad">
          ← Costs{costs > 0 ? ` ${costs}` : ""}
        </span>
        <span className="reach__axis-side" data-valence="good">
          Helps{helps > 0 ? ` ${helps}` : ""} →
        </span>
      </p>
      <ul className="reach__rows">
        {shown.map((line) => {
          const good = line.direction === "helps";
          const length = (line.weight / heaviest) * 50;
          return (
            <li key={line.cohort} className="reach__row" data-valence={good ? "good" : "bad"}>
              <p className="reach__name">{line.name}</p>
              <span className="elec-diverge" aria-hidden="true">
                <span className="elec-diverge__axis" />
                <span className="elec-diverge__bar" style={good ? { insetInlineStart: "50%", inlineSize: `${length}%` } : { insetInlineEnd: "50%", inlineSize: `${length}%` }} />
              </span>
              <p className="reach__word ui-valence-ink" data-valence={good ? "good" : "bad"}>
                {good ? "▲ Helps" : "▼ Costs"}
              </p>
            </li>
          );
        })}
      </ul>
      {lines.length > limit ? <EvidencePanel title={label} label={`Compare all ${lines.length} groups`}>
        <ReachBars lines={lines} label={label} limit={lines.length} />
      </EvidencePanel> : null}
    </div>
  );
}
