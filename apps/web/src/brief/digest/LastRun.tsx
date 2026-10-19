import { useNavigate } from "@tanstack/react-router";
import { selectDateOfTurn, type Campaign } from "@admin/engine";
import { formatDate, metricMoves, spanWords, stopLines, stopWords, type StopBrief } from "@admin/player-core";
import { Button, Tag } from "@admin/ui-web";
import { useCampaignStore } from "../../app/hooks";
import { useBuilt } from "../../shell/built-routes";
import { Door } from "../../shell/Door";
import { Moves } from "../../shell/Moves";
import { Panel } from "./Panel";

function Stops({ brief }: { readonly brief: StopBrief }) {
  const built = useBuilt();
  const lines = stopLines(brief);
  if (lines.length === 0) return <p className="dg-none">Nothing is waiting: the run stopped where you allowed it to.</p>;
  return (
    <ul className="dg-stops">
      {lines.map((line) => {
        const open = line.href !== undefined && built(line.href);
        return (
          <li key={line.id} data-urgency={line.urgency} {...(open ? { className: "ui-row-target" } : {})}>
            <Tag tone={line.urgency === "hard" ? "risk" : "caution"} icon={line.urgency === "hard" ? "escalate" : "pending"}>
              {line.urgency === "hard" ? "Holds time" : "Needs you"}
            </Tag>
            {open && line.href ? <Door href={line.href} className="dg-stops__title ui-row-link">{line.title}</Door> : <strong className="dg-stops__title">{line.title}</strong>}
            <span className="dg-stops__reason">{line.reason}</span>

          </li>
        );
      })}
    </ul>
  );
}

/** The run that just ended, read once: why it stopped, what waits (each a door), and what it moved end to end. */
export function LastRun({ campaign, brief, acknowledged }: { readonly campaign: Campaign; readonly brief: StopBrief; readonly acknowledged: boolean }) {
  const store = useCampaignStore();
  const navigate = useNavigate();
  const done = () => {
    store.acknowledgeBrief();
    void navigate({ to: "/brief" });
  };
  const from = formatDate(selectDateOfTurn(campaign, brief.fromTurn));
  return (
    <Panel id="digest-run" icon="pending" title={`The last run: ${spanWords(brief)} from ${from}`} className="dg-run" note={stopWords(brief)}>
      <div className="dg-run__body" data-read={acknowledged ? "true" : undefined}>
        <Stops brief={brief} />
        {brief.turnsRun > 1 ? (
          <div className="dg-run__moves">
            <h3 className="dg-sub">Across the whole run</h3>
            <Moves moves={metricMoves(brief.before.metrics, brief.after.metrics)} none="No reading changed while time ran." />
          </div>
        ) : null}
        {brief.closedArcs.length > 0 ? (
          <div className="dg-run__arcs">
            <h3 className="dg-sub">Stories that ended</h3>
            <ul className="dg-plain">
              {brief.closedArcs.map((arc) => (
                <li key={arc.family}>{arc.title}, with {arc.counterpart}: {arc.chapters} {arc.chapters === 1 ? "decision" : "decisions"} over {arc.weeks} {arc.weeks === 1 ? "week" : "weeks"}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {acknowledged ? null : (
        <div className="dg-run__acknowledge">
          <Button kind="primary" onClick={done}>Done reading</Button>
        </div>
      )}
    </Panel>
  );
}
