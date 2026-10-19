import type { ChamberVote } from "@admin/engine";
import { CHAMBER_TITLE, type FloorCount } from "@admin/player-core";
import { Tag } from "@admin/ui-web";
import type { Valence } from "../../shell/valence";

/** How near the line counts as too close to call, as a share of the chamber's seats. */
const CLOSE_SHARE = 0.02;

/**
 * Whether a projected count is in the President's favor. A passage count that
 * clears its line is good; an override count that clears it is the President
 * losing the veto, so it reads the other way. Within a few seats of the line
 * is a watch either way.
 */
export function countValence(count: FloorCount, against = false): Valence {
  if (count.supportKnown !== true) return "neutral";
  const margin = count.yeas - count.required;
  if (Math.abs(margin) <= count.seats * CLOSE_SHARE && count.seats > 0) return "watch";
  const clears = margin >= 0;
  return clears === !against ? "good" : "bad";
}

/** The count's standing against its line, in words: it carries, falls short, or is too close to call. */
export function countWord(count: FloorCount, against = false): string {
  if (count.supportKnown !== true) return "Support unresolved";
  const margin = count.yeas - count.required;
  const near = count.seats > 0 && Math.abs(margin) <= count.seats * CLOSE_SHARE;
  if (against) return near ? "Override too close to call" : margin >= 0 ? "Override would carry" : `Override short by ${-margin}`;
  return near ? "Too close to call" : margin >= 0 ? "Carries" : `Short by ${-margin}`;
}

/**
 * A count no member has committed to yet: the whole chamber drawn as
 * unresolved, with the line the question needs. It never draws a yea it does
 * not have, so it cannot be read as a forecast.
 */
export function CountMeter({ count, against }: { readonly count: FloorCount; readonly against?: boolean }) {
  const at = count.seats > 0 ? (count.required / count.seats) * 100 : 0;
  return (
    <div className="count-meter" role="img" aria-label={`${count.name}${against ? ", to override" : ""}: ${count.required} of ${count.seats} needed; support unresolved.`}>
      <span className="count-meter__name">{count.name}{against ? ", to override" : ""}</span>
      <span className="count-meter__track" aria-hidden="true"><span className="count-meter__need" style={{ insetInlineStart: `${at}%` }} /></span>
      <span className="count-meter__word">{count.required} of {count.seats} needed · unresolved</span>
    </div>
  );
}

/**
 * A completed vote as the Journal recorded it: exact yeas and nays, solid
 * rule. It is the only tally on the page allowed to read as a fact.
 */
export function RecordedTally({ votes, heading = "Recorded vote" }: { readonly votes: readonly ChamberVote[]; readonly heading?: string }) {
  return (
    <section className="tally tally--recorded" aria-label={heading}>
      <Tag tone="identity" icon="statusIssued">
        {heading}
      </Tag>
      {votes.length === 0 ? (
        <p className="tally__none">No vote was taken in either chamber.</p>
      ) : (
        <dl className="tally__rows">
          {votes.map((vote) => (
            <div key={vote.chamber} className="tally__row">
              <dt>{CHAMBER_TITLE[vote.chamber]}</dt>
              <dd>
                <strong>
                  {vote.yeas} yea, {vote.nays} nay
                </strong>
                <span>
                  {vote.required} needed. {vote.passed ? "Carried." : "Failed."}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * A count before the vote: the model's projection at today's standing, drawn
 * with a dashed edge and worded as a projection so it never reads as a result.
 */
export function ProjectedTally({ counts, heading = "Public support assessment", against = false }: { readonly counts: readonly FloorCount[]; readonly heading?: string; readonly against?: boolean }) {
  return (
    <section className="tally tally--projected" aria-label={heading}>
      <span className="tally__heading">{heading}</span>
      {counts.map((count) => (
        <CountMeter key={count.chamber} count={count} against={against} />
      ))}
      <p className="tally__basis">No member has committed yet. The hatched area is support that is still unresolved. It is not a forecast.</p>
    </section>
  );
}
