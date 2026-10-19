import type { ChamberVote } from "@admin/engine";
import { Gauge } from "@admin/ui-web";

/**
 * The Senate's count on a nominee today, drawn as a meter against the votes
 * needed. Labeled a staff projection: no senator has committed to it, and the
 * vote itself is counted months from now against the Senate as it is then.
 */
export function SenateProjection({ vote, note = false }: { readonly vote: ChamberVote; readonly note?: boolean }) {
  const seats = vote.yeas + vote.nays;
  const verdict = `${vote.passed ? "Confirms" : "Falls short"}, ${vote.yeas} to ${vote.nays}`;
  return (
    <div className="appt-senate">
      <Gauge
        shape="meter"
        label="Staff projection of the Senate vote"
        labelHidden
        value={seats > 0 ? vote.yeas / seats : 0}
        valueText={verdict}
        tone={vote.passed ? "good" : "bad"}
        marks={[{ at: seats > 0 ? vote.required / seats : 0.5, label: `${vote.required} needed` }]}
      />
      {note ? <span className="appt-senate__note">Staff projection from today's count. {vote.required} needed.</span> : null}
    </div>
  );
}
