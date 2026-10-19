import type { MostImportantProblem } from "@admin/player-core";

/** The most-important-problem question, every judgment ranked by the share of the week's dissatisfaction it carries. */
export function Problems({ problems }: { readonly problems: readonly MostImportantProblem[] }) {
  const longest = Math.max(...problems.map((problem) => problem.share), 0.0001);
  return (
    <section className="elec-panel" aria-labelledby="elec-problems">
      <h2 id="elec-problems" className="elec-panel__title">
        Most important problem
      </h2>
      {problems.length === 0 ? (
        <p className="elec-note">The country is missing nothing on any judgment this week.</p>
      ) : (
        <ol className="elec-problems">
          {problems.map((problem, index) => (
            <li key={problem.driver} className="elec-problem" data-lead={index === 0}>
              <p className="elec-problem__rank" aria-hidden="true">
                {index + 1}
              </p>
              <div className="elec-problem__body">
                <p className="elec-problem__label">
                  {problem.label}
                  {problem.salient ? <span className="elec-problem__flag"> · in the news this week</span> : null}
                </p>
                <span className="elec-problem__track" aria-hidden="true">
                  <span style={{ inlineSize: `${(problem.share / longest) * 100}%` }} />
                </span>
                {problem.causeDetail ? <p className="elec-problem__cause">{problem.causeDetail}</p> : null}
              </div>
              <p className="elec-figure">{problem.figure}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="elec-note">Each bar is a judgment's weighted shortfall as a share of all the dissatisfaction this week.</p>
    </section>
  );
}
