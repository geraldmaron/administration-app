import { useState, type CSSProperties } from "react";
import { agreementKey, place, type CourtSystem } from "@admin/player-core";
import { Gauge, HelpTip, Portrait } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { useDrawnLinks } from "../../shell/drawn-links";
import { leanStep } from "./court-words";

const SG_WORDS = { strained: "Strained", mixed: "Mixed", strong: "Strong" } as const;

const surname = (name: string): string => name.split(" ").at(-1) ?? name;
const initials = (name: string): string => name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("");

/** The arc and roster share the same subject identity, including focus and hover. */
export function CourtBench({ system }: { readonly system: CourtSystem }) {
  const ordered = [...system.justices].sort((a, b) => (a.lean ?? 0) - (b.lean ?? 0) || a.seat - b.seat);
  const [active, setActive] = useState<number | undefined>();
  return <section className="court-bench" aria-labelledby="court-bench-title">
    <div className="court-panel__title"><h2 id="court-bench-title">The Supreme Court</h2><HelpTip label="About the bench">Seats run left to right by recorded economic lean, not a forecast of a ruling. {system.majority} votes strike an order; six participating justices are needed for a merits ruling. An even split leaves the lower judgment in force.</HelpTip></div>
    <div className="court-bench__composition">
      <div className="court-bench__visual"><BenchArc system={system} ordered={ordered} active={active} onActive={setActive} /><p className="court-bench__axis"><span>Left</span><span>Recorded economic lean</span><span>Right</span></p></div>
      <ul className="court-bench__list" aria-label="Justices, left to right">{ordered.map((justice) => <JusticeCard key={justice.seat} justice={justice} active={active === justice.seat} onActive={setActive} />)}</ul>
    </div>
    <Gauge label="Solicitor General standing" shape="meter" value={system.solicitorGeneral.standing / 100} valueText={SG_WORDS[system.solicitorGeneral.assessment]}
      tone={system.solicitorGeneral.assessment === "strained" ? "bad" : system.solicitorGeneral.assessment === "strong" ? "good" : "watch"}
      caption="Affects review and stay odds, not the ruling. Moves with the government's record before the Court." />
  </section>;
}

function BenchArc({ system, ordered, active, onActive }: { readonly system: CourtSystem; readonly ordered: CourtSystem["justices"]; readonly active: number | undefined; readonly onActive: (seat: number | undefined) => void }) {
  const open = useDrawnLinks();
  const seated = ordered.filter((justice) => !justice.vacant).length;
  return <svg className="court-bench__arc" viewBox="0 0 320 170" role="group" aria-label={`${seated} of ${ordered.length} seats filled, ordered left to right by lean`} onClick={open}>
    {ordered.map((justice, index) => {
      const angle = Math.PI - Math.PI * (index + .5) / ordered.length;
      const x = 160 + 124 * Math.cos(angle), y = 148 - 124 * Math.sin(angle);
      const href = justice.vacant ? `${place.courts()}?view=nominations` : justice.href;
      const seat = <g className="court-bench__seat" data-step={justice.vacant ? "vacant" : leanStep(justice.lean)} data-active={active === justice.seat || undefined}>
        <circle cx={x} cy={y} r="18" className="court-bench__mark" />
        {justice.chief ? <circle cx={x} cy={y} r="23" className="court-bench__chief" /> : null}
        <text x={x} y={y + 4} className="court-bench__initial">{justice.vacant ? "—" : initials(justice.name)}</text>
        <title>{justice.vacant ? "Open seat: see nominations" : `${justice.name}: open their file`}</title>
      </g>;
      return href ? <a key={justice.seat} href={href} tabIndex={-1} className="court-bench__link" onMouseEnter={() => onActive(justice.seat)} onMouseLeave={() => onActive(undefined)}>{seat}</a> : <g key={justice.seat}>{seat}</g>;
    })}
    <text x="160" y="132" className="court-bench__figure">{system.majority}</text><text x="160" y="150" className="court-bench__caption">votes strike an order</text>
  </svg>;
}

function JusticeCard({ justice, active, onActive }: { readonly justice: CourtSystem["justices"][number]; readonly active: boolean; readonly onActive: (seat: number | undefined) => void }) {
  const href = justice.vacant ? `${place.courts()}?view=nominations` : justice.href;
  const identity = <><span className="court-bench__dot" aria-hidden="true" /><Portrait name={justice.name} monogram={initials(justice.name)} size="sm" redacted decorative /><span className="court-bench__identity"><strong>{justice.vacant ? "Open seat" : justice.name}</strong><span className="court-bench__role">{justice.vacant ? justice.pending ? `${justice.pending} before the Senate` : "No nominee" : justice.chief ? "Chief Justice" : "Associate Justice"}</span><small>{justice.vacant ? "Nominate a successor" : `${justice.age === undefined ? "Age unrecorded" : `Age ${justice.age}`} · ${justice.tenure === undefined ? "tenure unrecorded" : `${justice.tenure} years on Court`}`}</small></span><span aria-hidden="true">→</span></>;
  return <li className="court-bench__member" data-active={active || undefined} data-step={justice.vacant ? "vacant" : leanStep(justice.lean)} onMouseEnter={() => onActive(justice.seat)} onMouseLeave={() => onActive(undefined)} onFocus={() => onActive(justice.seat)} onBlur={() => onActive(undefined)}>{href ? <Door className="justice-member-link" href={href}>{identity}</Door> : <div className="justice-member-link">{identity}</div>}</li>;
}

/** How deep the record behind the matrix is, so a perfect score on one shared case is not read as a pattern. */
function depthWords(system: CourtSystem): string {
  const most = Math.max(0, ...[...system.agreement.values()].map((cell) => cell.shared));
  return most === 1
    ? "Every pair has voted in at most one case together; one shared vote is not yet a pattern."
    : `The most any pair has voted in together is ${most} cases.`;
}

/**
 * How often each pair of sitting justices voted the same way, counted only
 * over cases where both cast a recorded vote, with the sample beside it. With
 * no shared vote anywhere the whole matrix is one empty state, never a grid of
 * blanks or a zero that reads as disagreement.
 */
export function AgreementMatrix({ system }: { readonly system: CourtSystem }) {
  const seated = system.justices.filter((justice) => !justice.vacant && justice.personId);
  return (
    <section className="court-panel" aria-labelledby="court-agreement-title">
      <div className="court-panel__title">
        <h2 id="court-agreement-title">How the justices vote together</h2>
        <HelpTip label="About agreement">Each cell counts the cases both justices voted in and how many of those they voted the same way. A short record says little; the sample is always shown.</HelpTip>
      </div>
      {!system.agreementRecorded ? (
        <p className="court-empty">No two sitting justices have voted in the same recorded case yet. Agreement appears here after the Court&rsquo;s first ruling with recorded votes.</p>
      ) : (
        <>
        <p className="court-flow__summary">{depthWords(system)}</p>
        <div className="court-matrix__scroll">
          <table className="court-matrix">
            <caption className="ui-visually-hidden">Shared recorded votes: times voting the same way, of cases both voted in</caption>
            <thead>
              <tr>
                <td />
                {seated.slice(0, -1).map((justice) => <th key={justice.seat} scope="col">{justice.href ? <Door href={justice.href}>{surname(justice.name)}</Door> : surname(justice.name)}</th>)}
              </tr>
            </thead>
            <tbody>
              {seated.slice(1).map((row, below) => (
                <tr key={row.seat}>
                  <th scope="row">{row.href ? <Door href={row.href}>{surname(row.name)}</Door> : surname(row.name)}</th>
                  {seated.slice(0, -1).map((column, columnIndex) => {
                    const rowIndex = below + 1;
                    // Agreement is symmetric, so each pair is drawn once, below the diagonal.
                    if (columnIndex >= rowIndex) return <td key={column.seat} className="court-matrix__self" />;
                    const cell = system.agreement.get(agreementKey(row.personId!, column.personId!));
                    if (!cell || cell.shared === 0) return <td key={column.seat} className="court-matrix__none" title="No shared recorded votes">—</td>;
                    const share = cell.together / cell.shared;
                    return (
                      <td key={column.seat} className="court-matrix__pair" style={{ "--share": share } as CSSProperties} title={`${row.name} and ${column.name}: ${cell.together} of ${cell.shared} shared votes`}>
                        <span className="court-matrix__square" aria-hidden="true" />
                        <span className="court-matrix__count">{cell.together}/{cell.shared}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
