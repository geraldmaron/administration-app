import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconBadgeTone, type IconName } from "./Icon";
import type { MovementValence } from "./Movement";

// The results list a President picks an act from, the way a flight search
// lists fares: one row per option, a few narrow drawn columns (the price now,
// the odds, the likely moves on one axis every row shares, the worst case
// under them), doing nothing as a thin reference row on top, and the whole
// row the radio. The picked row opens in place to show everything else.
// Structural types, so a producer's outcome is passed straight through
// without this package knowing where it was made.

export type ChoiceTone = "favorable" | "neutral" | "caution" | "adverse";

/** One reading an option moves. `value` is the likely move in `unit`; `ifWell` and `ifBadly` bound it where it can land either way. */
export type ChoiceEffectView = {
  readonly metric: string;
  readonly label: string;
  readonly value: number;
  readonly text: string;
  readonly tone: ChoiceTone;
  /** "pts", or "band" for a move on the ±3 magnitude scale. */
  readonly unit: string;
  readonly ifWell?: number;
  readonly ifBadly?: number;
};

export type ChoiceOutcomeView = {
  readonly cost: { readonly text: string; readonly figure?: { readonly value: number }; readonly borrowing?: { readonly text: string; readonly amount: number } };
  readonly odds?: { readonly share: number; readonly word: string; readonly confidence?: string };
  readonly effects: readonly ChoiceEffectView[];
  readonly worstCase?: string;
  readonly baseline?: boolean;
  /** Everything else, for the opened row. A screen may draw a line (a face, a meter) where a producer gave words. */
  readonly details: readonly { readonly label: string; readonly text: ReactNode; readonly icon?: IconName }[];
};

export type ChoiceDetailLine = { readonly label: string; readonly icon?: IconName; readonly value: ReactNode };

export type ChoiceItem = {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly accent?: IconBadgeTone;
  /** A mark that leads the name in place of the icon: a person's face. */
  readonly mark?: ReactNode;
  readonly baseline?: boolean;
  readonly recommended?: boolean;
  /** Why it cannot be authorized today; it can still be read and picked to read. */
  readonly unavailable?: string;
  /** Set where the reason is said once above the list for every option it locks. */
  readonly lockShared?: boolean;
  readonly outcome?: ChoiceOutcomeView;
  /** For an option drawn without an outcome: its cost, odds and worst case as the screen drew them. */
  readonly cost?: ReactNode;
  readonly odds?: ReactNode;
  /** The producer's question for a lifted odds cell, which may be success or a counterpart's willingness. */
  readonly oddsLabel?: string;
  readonly worst?: ReactNode;
  /** One line under the name: what the option is, in its own words. */
  readonly lead?: ReactNode;
  /** A strip of judgments, drawn only where there is no outcome to draw. */
  readonly verdict?: readonly { readonly text: string; readonly valence: MovementValence; readonly icon?: IconName }[];
  /** Everything else, shown once the option is picked. */
  readonly detail?: readonly ChoiceDetailLine[];
};

/**
 * A forward projection laid into the list by the screen that owns the choice:
 * a control over the list to run it, one cell per option id drawn under that
 * option's moves, and the picked option's opened detail. Nodes, not numbers,
 * so this package draws the slot without knowing how a projection is made.
 */
export type ChoiceProjection = {
  readonly control: ReactNode;
  readonly perItem: Readonly<Record<string, ReactNode>>;
  readonly detail?: ReactNode;
  /** Told which option was authorized, before the act is sent: the screen files the forecast it was shown. */
  readonly onAuthorize?: (id: string) => void;
};

export type ChoiceListProps = {
  /** The id of the heading that names the choice. */
  readonly labeledBy: string;
  /** The radio group's name and the prefix of every id inside it. */
  readonly name: string;
  readonly items: readonly ChoiceItem[];
  readonly selected: string;
  readonly onSelect: (id: string) => void;
  readonly projection?: ChoiceProjection;
  /** Authorization follows the comparison, before expanded evidence. */
  readonly footer?: ReactNode;
};

export type ChoiceAxis = { readonly unit: string; readonly lo: number; readonly hi: number; readonly ticks: readonly { readonly at: number; readonly label: string }[] };

const BAND_TICKS: Readonly<Record<number, string>> = { [-3]: "Major fall", 0: "None", 3: "Major rise" };

/** A round step that puts the axis's end at or past `span`. */
function niceCeil(span: number): number {
  if (span <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(span));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= span)!;
  return step * power;
}

const signedTick = (value: number): string => (value === 0 ? "0" : `${value > 0 ? "+" : "−"}${Math.abs(value)}`);

/**
 * The one axis every move in `unit` is drawn on, sized to the likely moves so
 * a move of a point reads as a bar and not a speck. A good or bad case past
 * the end is clipped there and marked; its figure is in the worst-case line.
 * Where moves go both ways the axis is even about zero, so a rise and a fall
 * of the same size draw the same length.
 */
export function choiceAxis(effects: readonly ChoiceEffectView[], unit: string): ChoiceAxis {
  const values = effects.filter((effect) => effect.unit === unit).map((effect) => effect.value);
  const reach = niceCeil(Math.max(0, ...values.map(Math.abs)));
  const low = values.some((value) => value < 0) ? -reach : 0;
  const high = values.some((value) => value > 0) ? reach : 0;
  if (unit === "band") {
    return { unit, lo: -3, hi: 3, ticks: [-3, 0, 3].map((at) => ({ at, label: BAND_TICKS[at]! })) };
  }
  const lo = low < 0 ? -niceCeil(-low) : 0;
  const hi = niceCeil(high) || (lo === 0 ? 1 : 0);
  const ticks = [lo, 0, hi].filter((at, index, all) => all.indexOf(at) === index);
  return { unit, lo, hi, ticks: ticks.map((at) => ({ at, label: at === hi && unit ? `${signedTick(at)} ${unit}` : signedTick(at) })) };
}

const at = (axis: ChoiceAxis, value: number): number => (axis.hi === axis.lo ? 50 : ((Math.min(axis.hi, Math.max(axis.lo, value)) - axis.lo) / (axis.hi - axis.lo)) * 100);
const pct = (value: number): string => `${value.toFixed(2)}%`;

const VALENCE: Readonly<Record<ChoiceTone, MovementValence>> = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad" };
const VERDICT: Readonly<Record<MovementValence, string>> = { good: ", in your favor", bad: ", against you", watch: ", worth watching", neutral: "" };

function spokenEffect(effect: ChoiceEffectView): string {
  const range = effect.ifWell !== undefined && effect.ifBadly !== undefined ? `; ${signedTick(effect.ifWell)} if it goes well, ${signedTick(effect.ifBadly)} if badly` : "";
  return `${effect.label}: ${effect.text} likely${range}${VERDICT[VALENCE[effect.tone]]}`;
}

/** One move as a slim bar from the zero line on the shared axis, its good-to-bad range as a hairline behind it. */
function EffectLine({ effect, axis }: { readonly effect: ChoiceEffectView; readonly axis: ChoiceAxis }) {
  const zero = at(axis, 0);
  const end = at(axis, effect.value);
  const ranged = effect.ifWell !== undefined && effect.ifBadly !== undefined;
  const lowCase = ranged ? Math.min(effect.ifWell!, effect.ifBadly!) : 0;
  const highCase = ranged ? Math.max(effect.ifWell!, effect.ifBadly!) : 0;
  const from = at(axis, lowCase);
  const to = at(axis, highCase);
  const clipped = ranged && (lowCase < axis.lo || highCase > axis.hi);
  return (
    <div className="ui-choice__effect" data-valence={VALENCE[effect.tone]} role="img" aria-label={spokenEffect(effect)}>
      <span className="ui-choice__metric" aria-hidden="true">
        {effect.label}
      </span>
      <span className="ui-choice__track" data-unit={effect.unit} aria-hidden="true" style={{ "--choice-zero": pct(zero) } as CSSProperties}>
        {ranged ? <span className="ui-choice__range" data-clip-start={flag(lowCase < axis.lo)} data-clip-end={flag(highCase > axis.hi)} data-clipped={flag(clipped)} style={{ insetInlineStart: pct(from), inlineSize: pct(to - from) }} /> : null}
        {effect.unit === "band" ? <span className="ui-choice__steps">{[-3, -2, -1, 1, 2, 3].map((step) => <span key={step} data-active={flag(effect.value < 0 ? step < 0 && step >= effect.value : step > 0 && step <= effect.value)} />)}</span> : <span className="ui-choice__bar" data-zero={flag(effect.value === 0)} style={{ insetInlineStart: pct(Math.min(zero, end)), inlineSize: pct(Math.abs(end - zero)) }} />}
      </span>
      <span className="ui-choice__fig" aria-hidden="true">
        {effect.text}
      </span>
    </div>
  );
}

/** The axis's labeled ends and zero, set once over the effects column on the same grid as every effect line. */
function AxisHead({ axis }: { readonly axis: ChoiceAxis }) {
  return (
    <span className="ui-choice__axis" aria-hidden="true">
      <span className="ui-choice__metric">Likely effect</span>
      <span className="ui-choice__ticks">
        {axis.ticks.map((tick) => (
          <span key={tick.at} className="ui-choice__tick" data-edge={tick.at === axis.lo ? "start" : tick.at === axis.hi ? "end" : undefined} style={{ insetInlineStart: pct(at(axis, tick.at)) }}>
            {tick.label}
          </span>
        ))}
      </span>
      <span className="ui-choice__fig" />
    </span>
  );
}

function Odds({ odds }: { readonly odds: NonNullable<ChoiceOutcomeView["odds"]> }) {
  const percent = Math.round(odds.share * 100);
  const valence: MovementValence = odds.share >= 0.6 ? "good" : odds.share >= 0.4 ? "watch" : "bad";
  return (
    <span className="ui-choice__odds" data-valence={valence}>
      <span className="ui-visually-hidden">Chance it goes well: </span>
      <span className="ui-choice__share" aria-hidden="true" style={{ "--choice-share": odds.share } as CSSProperties} />
      <strong className="ui-choice__percent">
        {percent}% <span className="ui-choice__word">{odds.word}</span>
      </strong>
      {odds.confidence ? <span className="ui-choice__confidence">{odds.confidence} confidence</span> : null}
    </span>
  );
}

function Cost({ cost }: { readonly cost: ChoiceOutcomeView["cost"] }) {
  const free = !cost.borrowing && cost.figure === undefined && cost.text === "Free";
  const valence = cost.figure && cost.figure.value > 0 ? "good" : undefined;
  return (
    <span className="ui-choice__money" data-free={free ? "true" : undefined} {...(valence ? { "data-valence": valence } : {})}>
      {cost.borrowing && cost.text === "Free" ? "No authority spent" : cost.text}
      {cost.borrowing ? <span className="ui-choice__borrowing"><span>Borrowing</span><strong>{cost.borrowing.text}</strong></span> : null}
    </span>
  );
}

type Columns = { readonly cost: boolean; readonly odds: boolean; readonly effects: boolean };

/** A cost every option shares is not a difference between them, so it is said once rather than on every row. */
function costsDiffer(items: readonly ChoiceItem[]): boolean {
  if (items.some((item) => item.cost !== undefined || item.outcome?.cost.borrowing !== undefined)) return true;
  const texts = new Set(items.flatMap((item) => (item.outcome ? [item.outcome.cost.figure ? `#${item.outcome.cost.figure.value}` : item.outcome.cost.text] : [])));
  return texts.size > 1;
}

function sharedCost(items: readonly ChoiceItem[]): string | undefined {
  if (costsDiffer(items)) return undefined;
  return items.find((item) => item.outcome)?.outcome?.cost.text;
}

function columnsOf(items: readonly ChoiceItem[]): Columns {
  return {
    cost: costsDiffer(items),
    odds: items.some((item) => item.outcome?.odds !== undefined || item.odds !== undefined),
    effects: items.some((item) => (item.outcome?.effects.length ?? 0) > 0),
  };
}

/** The axes a list draws on, one per unit its moves are in, the most used first so the header labels it. */
function axesOf(items: readonly ChoiceItem[]): ReadonlyMap<string, ChoiceAxis> {
  const effects = items.flatMap((item) => item.outcome?.effects ?? []);
  const units = [...new Set(effects.map((effect) => effect.unit))].sort((a, b) => effects.filter((e) => e.unit === b).length - effects.filter((e) => e.unit === a).length);
  return new Map(units.map((unit) => [unit, choiceAxis(effects, unit)]));
}

/** The common scale and monetary basis stay visible above the options. */
function Head({ columns, axis, shared }: { readonly columns: Columns; readonly axis: ChoiceAxis | undefined; readonly shared: string | undefined }) {
  if (!(columns.effects && axis) && !shared) return null;
  return <div className="ui-choice__head">
    {shared ? <span className="ui-choice__shared">{shared === "Free" ? "No monetary cost for any option" : `Every option costs ${shared} now`}</span> : null}
    {columns.effects && axis ? <AxisHead axis={axis} /> : null}
    {axis?.unit === "band" ? <span className="ui-choice__scale-note">Qualitative magnitude · three steps each direction</span> : null}
  </div>;
}

const flag = (on: boolean | undefined): "true" | undefined => (on ? "true" : undefined);

function Name({ item, name, selected, onSelect }: { readonly item: ChoiceItem; readonly name: string; readonly selected: boolean; readonly onSelect: (id: string) => void }) {
  const lockId = item.lockShared ? `${name}-locked` : `${name}-${item.id}-locked`;
  const look = item.icon ?? (item.baseline ? "schedule" : undefined);
  return (
    <div className="ui-choice__name">
      <label className="ui-compare__pick ui-row-link">
        <span id={`${name}-${item.id}-name`}>{item.label}</span>
        <input type="radio" name={`${name}-pick`} checked={selected} onChange={() => onSelect(item.id)} {...(item.unavailable ? { "aria-describedby": lockId } : {})} />
      </label>
      {item.mark ? <span className="ui-choice__emblem">{item.mark}</span> : look ? <span className="ui-choice__emblem" data-accent={item.accent ?? "neutral"}><Icon name={look} size={18} /></span> : null}
      {item.baseline || item.recommended ? (
        <span className="ui-choice__flags">
          {item.baseline ? <span className="ui-choice__flag">Default</span> : null}
          {item.recommended ? <span className="ui-choice__flag" data-recommended="true">Recommended</span> : null}
        </span>
      ) : null}
      {item.lead ? <span className="ui-choice__lead">{item.lead}</span> : null}
      {item.unavailable && !item.lockShared ? (
        <span className="ui-compare__locked ui-choice__locked" id={lockId}>
          <Icon name="locked" size={14} />
          <span>{item.unavailable}</span>
        </span>
      ) : item.unavailable ? (
        <span className="ui-choice__locked">
          <Icon name="locked" size={14} /> Locked
        </span>
      ) : null}
      {!item.outcome && item.verdict && item.verdict.length > 0 ? (
        <span className="ui-choice__verdict">
          {item.verdict.map((entry) => (
            <span key={entry.text} className="ui-valence-chip" data-valence={entry.valence}>
              {entry.icon ? <Icon name={entry.icon} size={14} /> : null}
              {entry.text}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function Effects({ outcome, axes }: { readonly outcome: ChoiceOutcomeView | undefined; readonly axes: ReadonlyMap<string, ChoiceAxis> }) {
  if (!outcome) return <div className="ui-choice__effects" />;
  if (outcome.effects.length === 0) return <div className="ui-choice__effects"><span className="ui-choice__quiet">{outcome.baseline ? "Nothing moves now" : "No change expected"}</span></div>;
  return (
    <div className="ui-choice__effects">
      {outcome.effects.map((effect) => (
        <EffectLine key={effect.metric} effect={effect} axis={axes.get(effect.unit)!} />
      ))}
    </div>
  );
}

function Detail({ item }: { readonly item: ChoiceItem }) {
  const lines: readonly ChoiceDetailLine[] = item.outcome ? item.outcome.details.map((line) => ({ label: line.label, value: line.text, ...(line.icon ? { icon: line.icon } : {}) })) : (item.detail ?? []);
  if (lines.length === 0) return null;
  return (
    <dl className="ui-choice__detail">
      {lines.map((line) => (
        <div key={line.label} className="ui-choice__line">
          <dt>
            {line.icon ? <Icon name={line.icon} size={16} /> : null}
            {line.label}
          </dt>
          <dd>{line.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type RowProps = { readonly item: ChoiceItem; readonly name: string; readonly columns: Columns; readonly axes: ReadonlyMap<string, ChoiceAxis>; readonly selected: boolean; readonly onSelect: (id: string) => void; readonly projection: ChoiceProjection | undefined; readonly baselineEffects: readonly ChoiceEffectView[] };

function Row({ item, name, columns, axes, selected, onSelect, projection, baselineEffects }: RowProps) {
  const projected = projection?.perItem[item.id];
  const odds = item.outcome?.odds;
  const worst = item.outcome?.worstCase ?? item.worst;
  return (
    <div className="ui-choice__row ui-compare__card ui-row-target" data-selected={flag(selected)} data-baseline={flag(item.baseline)} data-locked={flag(item.unavailable !== undefined)}>
      <Name item={item} name={name} selected={selected} onSelect={onSelect} />
      {columns.cost ? <div className="ui-choice__cost" data-label={item.outcome?.cost.borrowing ? "Authority / borrowing" : "Cost now"}>{item.outcome ? <Cost cost={item.outcome.cost} /> : item.cost}</div> : null}
      {columns.odds ? (
        <div className="ui-choice__chance" data-label={item.oddsLabel ?? "Odds"}>
          {odds ? <Odds odds={odds} /> : item.outcome ? <span className="ui-choice__quiet">Certain</span> : item.odds !== undefined ? <><span className="ui-visually-hidden">{item.oddsLabel ?? "Odds"}: </span>{item.odds}</> : null}
        </div>
      ) : null}
      {columns.effects ? <Effects outcome={item.baseline && item.outcome && item.outcome.effects.length === 0 ? { ...item.outcome, effects: baselineEffects } : item.outcome} axes={axes} /> : null}
      {worst ? (
        // A div, not a paragraph: the worst case can carry a drawn reading, and a
        // gauge's block element inside a <p> is invalid markup the browser
        // silently re-parents.
        <div className="ui-choice__worst" data-under={columns.effects ? "effects" : "row"}>
          <span className="ui-choice__worst-label">
            {item.baseline ? "Baseline outcome" : "Downside scenario"}
          </span>
          <span className="ui-choice__worst-text">{worst}</span>
        </div>
      ) : null}
      {projected ? (
        <div className="ui-choice__projected" data-under={columns.effects ? "effects" : "row"}>
          {projected}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The options as a results list: doing nothing on top as the reference, each
 * option one row whose whole width is its radio (arrow keys move the pick),
 * the picked row open to everything else. The price, the odds, the moves and
 * the worst case never fold away.
 */
export function ChoiceList({ labeledBy, name, items, selected, onSelect, projection, footer }: ChoiceListProps) {
  const ordered = [...items.filter((item) => item.baseline), ...items.filter((item) => !item.baseline)];
  const columns = columnsOf(ordered);
  const axes = axesOf(ordered);
  const primary = axes.values().next().value as ChoiceAxis | undefined;
  const picked = ordered.find((item) => item.id === selected);
  const compared = ordered.flatMap((item) => item.outcome?.effects ?? []);
  const baselineEffects = compared.filter((effect, index) => compared.findIndex((entry) => entry.metric === effect.metric) === index).map((effect): ChoiceEffectView => ({ metric: effect.metric, label: effect.label, unit: effect.unit, value: 0, text: effect.unit === "band" ? "Unchanged" : `0 ${effect.unit}`, tone: "neutral" }));
  return (
    <>
      {projection ? <div className="ui-choice__projection-control">{projection.control}</div> : null}
      <div className="ui-choice" role="radiogroup" aria-labelledby={labeledBy}>
        <Head columns={columns} axis={primary} shared={sharedCost(ordered)} />
        <div className="ui-choice__comparisons">
          {ordered.map((item) => <Row key={item.id} item={item} name={name} columns={columns} axes={axes} selected={item.id === selected} onSelect={onSelect} projection={projection} baselineEffects={baselineEffects} />)}
        </div>
      </div>
      {footer}
      {picked ? <div className="ui-choice__evidence"><Detail item={picked} /></div> : null}
      {projection?.detail ? <div className="ui-choice__projection-detail">{projection.detail}</div> : null}
    </>
  );
}
