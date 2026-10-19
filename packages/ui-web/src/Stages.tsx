import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type StageState = "done" | "now" | "ahead" | "ended";

export type Stage = {
  readonly id: string;
  readonly label: string;
  readonly state: StageState;
  /** A line under the label: the date it happened, or that none is set. */
  readonly note?: ReactNode;
};

export type StagesProps = {
  /** Names the run for a screen reader: "Where it stands: Signed". */
  readonly label: string;
  readonly stages: readonly Stage[];
};

const MARK: Readonly<Record<StageState, IconName>> = { done: "approve", now: "pending", ahead: "neutral", ended: "reject" };
const SPOKEN: Readonly<Record<StageState, string>> = { done: "reached", now: "where it stands now", ahead: "not yet reached", ended: "ended here" };

/**
 * Where a thing stands on its way somewhere: each stage a mark on one rule,
 * the ones passed filled and joined, the one it waits at emphasized, an
 * ending in red. State is a glyph and a word, never color alone.
 */
export function Stages({ label, stages }: StagesProps) {
  return (
    <div className="ui-stages-frame"><ol className="ui-stages" aria-label={label}>
      {stages.map((stage) => (
        <li key={stage.id} className="ui-stages__step" data-state={stage.state} aria-current={stage.state === "now" ? "step" : undefined}>
          <span className="ui-stages__mark" aria-hidden="true">
            <Icon name={MARK[stage.state]} size={16} />
          </span>
          <span className="ui-stages__word">
            {stage.label}
            <span className="ui-visually-hidden">, {SPOKEN[stage.state]}</span>
          </span>
          {stage.note ? <span className="ui-stages__note">{stage.note}</span> : null}
        </li>
      ))}
    </ol></div>
  );
}
