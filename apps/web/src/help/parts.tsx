import { Bar, IconBadge, isIconName } from "@admin/ui-web";
import type { Explainer, ExplainerCastMember, ExplainerExample, ExplainerLink, ExplainerStep, ExplainerThreshold } from "@admin/player-core";

// The drawn parts of an explanation. Each takes only its own slice of the
// Explainer and draws nothing when the slice is empty, so the view above can
// list them in order without checking.

type Slice<K extends keyof Explainer> = NonNullable<Explainer[K]>;

export function Cast({ cast }: { readonly cast: Slice<"cast"> }) {
  return (
    <ul className="help-cast">
      {cast.map((member: ExplainerCastMember) => (
        <li key={member.label} className="help-cast__member">
          <IconBadge name={isIconName(member.icon) ? member.icon : "info"} tone="blue" size={36} />
          <span className="help-cast__text">
            <strong>{member.label}</strong>
            <span>{member.role}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Step({ step, index }: { readonly step: ExplainerStep; readonly index: number }) {
  return (
    <li className="help-step">
      <span className="help-step__node" aria-hidden="true">{index + 1}</span>
      <div className="help-step__body">
        <div className="help-step__head">
          <strong className="help-step__label">{step.label}</strong>
          {step.duration ? <span className="help-chip">{step.duration}</span> : null}
        </div>
        <p>{step.detail}</p>
        {step.exit ? (
          <p className="help-step__exit">
            <span className="help-step__branch" aria-hidden="true" />
            <strong>Can end here</strong> {step.exit}
          </p>
        ) : null}
        {step.youCan ? <p className="help-step__act"><strong>Your move</strong> {step.youCan}</p> : null}
      </div>
    </li>
  );
}

export function Steps({ steps }: { readonly steps: Slice<"steps"> }) {
  return <ol className="help-steps">{steps.map((step, index) => <Step key={step.label} step={step} index={index} />)}</ol>;
}

const pct = (value: number, of: number): number => (of > 0 ? Math.min(1, Math.max(0, value / of)) : 0);

function Threshold({ threshold }: { readonly threshold: ExplainerThreshold }) {
  const at = pct(threshold.needed, threshold.of);
  const figure = `${threshold.needed} of ${threshold.of}`;
  return (
    <li className="help-threshold">
      <div className="help-threshold__head">
        <strong>{threshold.label}</strong>
        <span className="help-threshold__figure">{figure}</span>
      </div>
      <Bar label={`${threshold.label}: ${figure}`} value={at} marks={[{ at, label: `${threshold.needed} needed` }]} />
      <span className="help-threshold__scale" aria-hidden="true">
        <span>0</span>
        <span className="help-threshold__needed" data-side={at > 0.5 ? "end" : "start"} style={{ insetInlineStart: `${(at * 100).toFixed(2)}%` }}>{threshold.needed} needed</span>
        <span>{threshold.of}</span>
      </span>
      <p>{threshold.note}</p>
    </li>
  );
}

export function Thresholds({ thresholds }: { readonly thresholds: Slice<"thresholds"> }) {
  return <ul className="help-thresholds">{thresholds.map((threshold) => <Threshold key={threshold.label} threshold={threshold} />)}</ul>;
}

const VERB = { raises: "Raises it", lowers: "Lowers it", shifts: "Shifts it" } as const;
const AMOUNT = { strong: "a lot", moderate: "somewhat", weak: "a little" } as const;
const VERDICT = { helps: "Good for you.", hurts: "Bad for you." } as const;

/** "Raises it a lot. Bad for you." The drawing's weight and color, said in words. */
export function linkKind(link: ExplainerLink): string {
  return `${VERB[link.direction]} ${AMOUNT[link.weight]}.${link.outcome ? ` ${VERDICT[link.outcome]}` : ""}`;
}
const STROKE = { strong: 4, moderate: 2.5, weak: 1.5 } as const;

/** A shaft whose thickness is the weight, ending in a head; the box is fixed so rows align. */
function Arrow({ weight }: { readonly weight: ExplainerLink["weight"] }) {
  const width = STROKE[weight];
  return (
    <svg className="help-arrow" viewBox="0 0 48 16" aria-hidden="true" focusable="false">
      <line x1="2" y1="8" x2="38" y2="8" stroke="currentColor" strokeWidth={width} strokeLinecap="butt" />
      <path d="M36 2 L46 8 L36 14 Z" fill="currentColor" />
    </svg>
  );
}

function Direction({ direction }: { readonly direction: ExplainerLink["direction"] }) {
  const path = direction === "raises" ? "M3 12 L8 4 L13 12" : direction === "lowers" ? "M3 4 L8 12 L13 4" : "M3 5 H13 M10 2 L13 5 L10 8 M13 11 H3 M6 8 L3 11 L6 14";
  return (
    <svg className="help-direction" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function Link({ link }: { readonly link: ExplainerLink }) {
  return (
    <li className="help-link" data-outcome={link.outcome} data-weight={link.weight}>
      <div className="help-link__draw" role="img" aria-label={`${link.from} to ${link.to}. ${linkKind(link)}`}>
        <span className="help-link__end">{link.from}</span>
        <span className="help-link__mid">
          <Direction direction={link.direction} />
          <Arrow weight={link.weight} />
        </span>
        <span className="help-link__end">{link.to}</span>
      </div>
      <p className="help-link__how">
        <span className="help-link__kind">{linkKind(link)}</span> {link.how}
      </p>
    </li>
  );
}

export function Links({ links }: { readonly links: Slice<"links"> }) {
  return <ul className="help-links">{links.map((link) => <Link key={`${link.from}>${link.to}`} link={link} />)}</ul>;
}

export function Examples({ examples }: { readonly examples: readonly ExplainerExample[] }) {
  return (
    <>
      {examples.map((example) => (
        <section key={example.title} className="help-example" data-kind={example.kind}>
          <h4>{example.title}</h4>
          {example.lines.map((line) => <p key={line}>{line}</p>)}
        </section>
      ))}
    </>
  );
}
