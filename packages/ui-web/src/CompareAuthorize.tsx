import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, type ButtonKind } from "./Button";
import { ChoiceList, type ChoiceItem, type ChoiceOutcomeView, type ChoiceProjection } from "./ChoiceList";
import { Icon, type IconBadgeTone, type IconName } from "./Icon";
import type { MovementValence } from "./Movement";
import { useSurfaceFoot } from "./WorkSurface";

/** One headline judgment about an option, read before its rows: its price, its net moves, its odds. */
export type CompareVerdict = {
  readonly text: string;
  readonly valence: MovementValence;
  readonly icon?: IconName;
};

export type CompareOption = {
  readonly id: string;
  readonly label: string;
  /** The option's character at a glance: force red, accord blue, principle gold, waiting plain. */
  readonly icon?: IconName;
  readonly accent?: IconBadgeTone;
  /** A mark that leads the name in place of the emblem: a person's face. */
  readonly mark?: ReactNode;
  /** Said where a screen or model recommends this option; the baseline is flagged "Default" without it. */
  readonly recommended?: boolean;
  /** A strip of judgments under the name, each a word with its good or bad cue. */
  readonly verdict?: readonly CompareVerdict[];
  /** A do-nothing or wait column, where a comparison carries one; at most one option is the baseline. */
  readonly baseline?: boolean;
  /** Why this option cannot be authorized today; it can still be read and compared. */
  readonly unavailable?: string;
  /**
   * The option's price, odds, moves and worst case as numbers, drawn in the
   * list's columns on one shared axis. An option with an outcome reads its
   * opened detail from the outcome and not from `rows`.
   */
  readonly outcome?: ChoiceOutcomeView;
};

export type CompareRow = {
  readonly label: string;
  /** A glyph set before the label, decorative: the label alone names the row. */
  readonly mark?: ReactNode;
  /**
   * `lead` is the option's own voice (what you would say, what the act is),
   * set under its name in larger type; every other row is a reading.
   */
  readonly kind?: "lead" | "reading";
  /** The row's glyph, set before its name in every card. */
  readonly icon?: IconName;
  /** One cell per option id, on the same terms, so the options are read across. */
  readonly cells: Readonly<Record<string, ReactNode>>;
};

export type CompareAuthorizeProps = {
  readonly title: string;
  readonly options: readonly CompareOption[];
  readonly rows: readonly CompareRow[];
  /** Absent until the player picks a row, where the comparison has no baseline to start on. */
  readonly selected: string | undefined;
  readonly onSelect: (id: string) => void;
  /** The one named verb: "Enable God Mode", "Sign the order". */
  readonly verb: string;
  readonly onAuthorize: () => void;
  /** `danger` for an irreversible or forceful act. */
  readonly tone?: Extract<ButtonKind, "commit" | "danger">;
  /** What authorizing will do, in one line, shown above the verb. */
  readonly review?: ReactNode;
  /**
   * What the baseline means when it is picked, or what waiting costs while
   * nothing is picked; absent, the line says nothing changes.
   */
  readonly baselineReview?: ReactNode;
  readonly busy?: boolean;
  /**
   * Docks the verb in the work surface's foot, below the scrolling body, so on
   * a phone it stays in the thumb's reach wherever the player has scrolled and
   * never covers a column. Outside a surface the verb stays in place.
   */
  readonly docked?: boolean;
  /** Set under the table: what folded away, a source line. */
  readonly footnote?: ReactNode;
  /** A forward projection of the options, laid into the list by the screen that can run one. */
  readonly projection?: ChoiceProjection;
};

/** The baseline column where there is one, or a thrown error when two options both claim to do nothing. */
export function baselineOf(options: readonly CompareOption[]): CompareOption | undefined {
  const baselines = options.filter((option) => option.baseline);
  if (baselines.length > 1) {
    throw new Error(`A comparison takes at most one do-nothing baseline; this one has ${baselines.length}.`);
  }
  return baselines[0];
}

const flag = (on: boolean | undefined): "true" | undefined => (on ? "true" : undefined);

/** The one reason every locked option shares, where two or more are locked for it; otherwise each row says its own. */
function sharedLockOf(options: readonly CompareOption[]): string | undefined {
  const reasons = options.flatMap((option) => (option.unavailable === undefined ? [] : [option.unavailable]));
  return reasons.length >= 2 && reasons.every((reason) => reason === reasons[0]) ? reasons[0] : undefined;
}

// A screen that still hands over rows of drawn cells has its price, its odds
// and its worst case lifted into the list's columns by the row's own name, so
// they stay in view on every row; everything else waits in the opened row.
const COST_ROW = /\bcosts?\b/i;
const NOT_COST = /priced|basis|how the cost/i;
const ODDS_ROW = /chance|odds|how likely|would they (accept|sign)|says yes/i;
const WORST_ROW = /goes wrong|goes badly|could go wrong|^risks?$|^the risk$|if they decline/i;

type Promoted = { readonly lead?: CompareRow; readonly cost?: CompareRow; readonly odds?: CompareRow; readonly worst?: CompareRow };

function promoted(rows: readonly CompareRow[]): Promoted {
  const lead = rows.find((row) => row.kind === "lead");
  const reading = rows.filter((row) => row.kind !== "lead");
  const cost = reading.find((row) => COST_ROW.test(row.label) && !NOT_COST.test(row.label));
  const odds = reading.find((row) => ODDS_ROW.test(row.label));
  const worst = reading.find((row) => WORST_ROW.test(row.label));
  return { ...(lead ? { lead } : {}), ...(cost ? { cost } : {}), ...(odds ? { odds } : {}), ...(worst ? { worst } : {}) };
}

const none = <span className="ui-compare__none">Does not apply</span>;

/** One option as a row of the results list: its outcome where the screen has one, otherwise its rows with the price, odds and worst case lifted out. */
function itemOf(option: CompareOption, rows: readonly CompareRow[], lift: Promoted, sharedLock: string | undefined): ChoiceItem {
  const cellOf = (row: CompareRow | undefined) => (row ? (row.cells[option.id] ?? none) : undefined);
  const head: ChoiceItem = {
    id: option.id,
    label: option.label,
    ...(option.icon ? { icon: option.icon } : {}),
    ...(option.accent ? { accent: option.accent } : {}),
    ...(option.mark ? { mark: option.mark } : {}),
    ...(option.baseline ? { baseline: true } : {}),
    ...(option.recommended ? { recommended: true } : {}),
    ...(option.unavailable ? { unavailable: option.unavailable, lockShared: option.unavailable === sharedLock } : {}),
  };
  if (option.outcome) return { ...head, outcome: option.outcome };
  const lifted = new Set([lift.lead, lift.cost, lift.odds]);
  return {
    ...head,
    ...(option.verdict ? { verdict: option.verdict } : {}),
    ...(lift.lead ? { lead: cellOf(lift.lead) } : {}),
    ...(lift.cost ? { cost: cellOf(lift.cost) } : {}),
    ...(lift.odds ? { odds: cellOf(lift.odds), oddsLabel: lift.odds.label } : {}),
    ...(lift.worst ? { worst: cellOf(lift.worst) } : {}),
    detail: rows.filter((row) => !lifted.has(row)).map((row) => ({ label: row.label, ...(row.icon ? { icon: row.icon } : {}), value: row.cells[option.id] ?? none })),
  };
}

/**
 * Every consequential act: the options side by side, one picked, what it
 * will do in a line, and one named verb. The verb stays off while nothing or
 * the baseline is picked, because doing nothing needs no signature.
 */
export function CompareAuthorize({ title, options, rows, selected, onSelect, verb, onAuthorize, tone = "commit", review, baselineReview, busy = false, docked = false, footnote, projection }: CompareAuthorizeProps) {
  const id = useId();
  const foot = useSurfaceFoot();
  const baseline = baselineOf(options);
  const picked = options.find((option) => option.id === selected);
  const acting = picked !== undefined && !picked.baseline;
  const locked = picked?.unavailable;
  const inFoot = docked && foot !== null;
  const sharedLock = sharedLockOf(options);
  const lift = promoted(rows);
  const items = options.map((option) => itemOf(option, rows, lift, sharedLock));
  const act = (
    <div className="ui-compare__act" {...(inFoot ? { role: "group", "aria-labelledby": `${id}-title` } : {})}>
      <p id={`${id}-review`} className="ui-compare__review" aria-live="polite">
        <span>{locked ?? (acting ? review : (baselineReview ?? (baseline ? `${baseline.label} is picked. Nothing changes.` : "Pick an option to read what it does.")))}</span>
      </p>
      <Button
        kind={tone}
        disabled={!acting || locked !== undefined}
        busy={busy}
        aria-describedby={`${id}-review`}
        onClick={() => {
          if (selected !== undefined) projection?.onAuthorize?.(selected);
          onAuthorize();
        }}
      >
        {verb}
      </Button>
    </div>
  );
  return (
    <section className="ui-compare" data-docked={flag(docked)} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="ui-compare__title">
        {title}
      </h3>
      {sharedLock ? (
        <p className="ui-compare__locked ui-compare__locked--shared" id={`${id}-locked`}>
          <Icon name="locked" size={16} />
          <span>
            <strong>Locked.</strong> {sharedLock}
          </span>
        </p>
      ) : null}
      <ChoiceList labeledBy={`${id}-title`} name={id} items={items} selected={selected ?? ""} onSelect={onSelect} footer={<>{footnote ? <div className="ui-compare__footnote">{footnote}</div> : null}{inFoot ? createPortal(act, foot) : act}</>} {...(projection ? { projection } : {})} />
    </section>
  );
}
