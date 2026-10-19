import type { CohortMemoryRow } from "@admin/player-core";
import { percent, signValence } from "./draw";

/** What each group remembers of the administration, the sorest first, drawn from its own balance of harms and favors. */
export function Memory({ memory, total }: { readonly memory: readonly CohortMemoryRow[]; readonly total: number }) {
  const reach = Math.max(...memory.map((row) => Math.abs(row.displacement)), 0.0001);
  return (
    <section className="elec-panel" aria-labelledby="elec-memory">
      <h2 id="elec-memory" className="elec-panel__title">
        What each group remembers
      </h2>
      {memory.length === 0 ? (
        <p className="elec-note">No group holds anything for or against this administration yet. Memories form when an act reaches a group, and fade at different speeds: harm outlasts a favor.</p>
      ) : (
        <>
          <div className="elec-memory__head" aria-hidden="true">
            <span>Group</span>
            <span className="elec-memory__head-axis">
              <span>← Holds it against you</span>
              <span>Credits you →</span>
            </span>
            <span>Share</span>
          </div>
          <ul className="elec-memory">
            {memory.map((row) => {
              const valence = signValence(row.displacement);
              const length = (Math.abs(row.displacement) / reach) * 50;
              return (
                <li key={row.cohort} className="elec-memrow" data-valence={valence}>
                  <div className="elec-memrow__name">
                    <p className="elec-memrow__group">{row.name}</p>
                    <p className="elec-memrow__axis">{row.axisLabel}</p>
                  </div>
                  <span className="elec-diverge" aria-hidden="true">
                    <span className="elec-diverge__axis" />
                    <span className="elec-diverge__bar" style={row.displacement < 0 ? { insetInlineEnd: "50%", inlineSize: `${length}%` } : { insetInlineStart: "50%", inlineSize: `${length}%` }} />
                  </span>
                  <p className="elec-memrow__share">{percent(row.share)}</p>
                  <p className="elec-memrow__reading">
                    <span className="ui-valence-ink" data-valence={valence}>
                      {row.displacement < 0 ? "▼ Holds against you. " : row.displacement > 0 ? "▲ Credits you. " : "▬ Level. "}
                    </span>
                    {row.reading}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="elec-note">{memory.length} of {total} groups remember something. Bars are to scale with each other and show a group's memory against the rest of its cut; none of it moves the headline.</p>
        </>
      )}
    </section>
  );
}
