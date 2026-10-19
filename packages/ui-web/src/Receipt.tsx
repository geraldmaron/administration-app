import { useId, type ReactNode } from "react";
import { Icon } from "./Icon";

export type ReceiptLine = { readonly label: string; readonly value: ReactNode };

/** How the act came out: done as asked, or refused by whoever had the last word (Congress, a governor). */
export type ReceiptOutcome = "done" | "refused";

export type ReceiptProps = {
  /** What was done, as a past-tense sentence: "Sworn in as President". */
  readonly title: string;
  /** When, in the game's calendar. */
  readonly date: string;
  readonly lines: readonly ReceiptLine[];
  /** Absent, the act was done. A refused act is still on the Record, so it still gets a receipt, without the check. */
  readonly outcome?: ReceiptOutcome;
  /** Where it is written down: the Record entry, or why it is not. */
  readonly record?: ReactNode;
  /** Doors onward. */
  readonly children?: ReactNode;
};

/** The proof an act happened: what, when, what it set, and where it is recorded. */
export function Receipt({ title, date, lines, outcome = "done", record, children }: ReceiptProps) {
  const id = useId();
  const refused = outcome === "refused";
  return (
    <article className="ui-receipt" data-outcome={outcome} aria-labelledby={`${id}-title`}>
      <header className="ui-receipt__head">
        <Icon name={refused ? "reject" : "approve"} size={24} className="ui-receipt__mark" />
        <div>
          {refused ? <p className="ui-receipt__outcome">Refused</p> : null}
          <h3 id={`${id}-title`} className="ui-receipt__title">
            {title}
          </h3>
          <p className="ui-receipt__date">{date}</p>
        </div>
      </header>
      {lines.length > 0 ? (
        <dl className="ui-receipt__lines">
          {lines.map((line) => (
            <div key={line.label} className="ui-receipt__line">
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {record ? <p className="ui-receipt__record">{record}</p> : null}
      {children ? <div className="ui-receipt__doors">{children}</div> : null}
    </article>
  );
}
