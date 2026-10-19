import type { ReactNode } from "react";
import { Icon, Portrait, isIconName } from "@admin/ui-web";
import "./person-card.css";

/** What colors the card's edge and the ring round the face: how the chair is held, or the holder's party. */
export type CardInk = "gold" | "blue" | "red" | "democrat" | "republican" | "independent" | "neutral";

export type CardFace = { readonly name: string; readonly src?: string; readonly monogram: string };

export type PersonCardProps = {
  /** The face in the chair; none draws the emblem alone, an empty chair. */
  readonly face: CardFace | null;
  /** The office's or the seat's glyph, badged on the ring. */
  readonly emblem: string;
  readonly ink: CardInk;
  /** The post, over the name, in small capitals. */
  readonly eyebrow: ReactNode;
  readonly name: ReactNode;
  /** One quiet line: how the chair is held, where, which side. */
  readonly meta?: ReactNode;
  /** The reads on the holder as dials, beside the name. */
  readonly readings?: ReactNode;
  /** What waits from it, under the rest. */
  readonly foot?: ReactNode;
  /** The card is the door: one `ui-card-door__link` inside it opens the whole card. */
  readonly door?: boolean;
  readonly current?: boolean;
  readonly agency?: boolean;
  /** A screen's own class and data attributes for the card, which its specs and styles read. */
  readonly className?: string;
  readonly data?: Readonly<Record<`data-${string}`, string | undefined>>;
};

const glyph = (name: string) => (isIconName(name) ? name : "building");

/**
 * A person in a post, compact and with depth: the face ringed in the card's
 * ink with the post's emblem on the ring, the post over the name, one quiet
 * line, and the reads on them as small dials. Used for every chair the
 * President deals with by name: the executive, the bench and the Hill.
 */
export function PersonCard({ face, emblem, ink, eyebrow, name, meta, readings, foot, door = true, current = false, agency = false, className, data }: PersonCardProps) {
  const classes = ["person-card", door ? "ui-card-door" : "", agency ? "person-card--agency" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={classes} data-ink={ink} {...data} {...(current ? { "aria-current": "true" as const } : {})}>
      <span className="person-card__seat" aria-hidden="true">
        {face ? (
          <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="md" decorative />
        ) : (
          <span className="person-card__empty">
            <Icon name={glyph(emblem)} size={24} />
          </span>
        )}
        {face ? (
          <span className="person-card__badge">
            <Icon name={glyph(emblem)} size={14} />
          </span>
        ) : null}
      </span>
      <div className="person-card__who">
        <p className="person-card__eyebrow">{eyebrow}</p>
        <p className="person-card__name">{name}</p>
        {meta ? <p className="person-card__meta">{meta}</p> : null}
      </div>
      {readings ? <div className="person-card__readings">{readings}</div> : null}
      {foot ? <div className="person-card__foot">{foot}</div> : null}
    </div>
  );
}

const CX = 20;
const CY = 20;
const R = 16;

function arcPoint(share: number): string {
  const angle = Math.PI * (1 - share);
  return `${(CX + R * Math.cos(angle)).toFixed(2)} ${(CY - R * Math.sin(angle)).toFixed(2)}`;
}

function arc(from: number, to: number): string {
  return `M ${arcPoint(from)} A ${R} ${R} 0 0 1 ${arcPoint(to)}`;
}

/** `risk` and `reading` are the older two tones; good, watch and bad are the valence scale. */
export type DialTone = "reading" | "risk" | "good" | "watch" | "bad";

type DialFrame = { readonly label: string; readonly word: string; readonly tone: DialTone; readonly faint?: boolean; readonly meter: { readonly now: number; readonly min: number; readonly max: number; readonly text: string } };

function Dial({ frame, children }: { readonly frame: DialFrame; readonly children: ReactNode }) {
  const { meter } = frame;
  return (
    <div className="person-dial" data-tone={frame.tone} data-faint={frame.faint ? "true" : undefined} role="meter" aria-label={frame.label} aria-valuemin={meter.min} aria-valuemax={meter.max} aria-valuenow={meter.now} aria-valuetext={meter.text}>
      <svg viewBox="0 0 40 24" aria-hidden="true" focusable="false">
        {children}
      </svg>
      <span className="person-dial__word" aria-hidden="true">
        {frame.word}
      </span>
      <span className="person-dial__label" aria-hidden="true">
        {frame.label}
      </span>
    </div>
  );
}

/** A reading that is one of four bands: four segments lit up to the band reached. A thin read is drawn faint. */
export function BandDial({ label, band, word, adverse = false, tone, faint, text }: { readonly label: string; readonly band: 0 | 1 | 2 | 3; readonly word: string; readonly adverse?: boolean; readonly tone?: DialTone; readonly faint: boolean; readonly text: string }) {
  const lit = band + 1;
  return (
    <Dial frame={{ label, word, tone: tone ?? (adverse ? "risk" : "reading"), faint, meter: { now: lit, min: 1, max: 4, text } }}>
      {[0, 1, 2, 3].map((index) => (
        <path key={index} className="person-dial__band" data-lit={index < lit ? "true" : undefined} d={arc(index / 4 + 0.012, (index + 1) / 4 - 0.012)} />
      ))}
    </Dial>
  );
}

/** A share, 0..1, filled round the half circle. */
export function ShareDial({ label, value, word, adverse = false, tone, text }: { readonly label: string; readonly value: number; readonly word: string; readonly adverse?: boolean; readonly tone?: DialTone; readonly text: string }) {
  const share = Math.min(1, Math.max(0, value));
  return (
    <Dial frame={{ label, word, tone: tone ?? (adverse ? "risk" : "reading"), meter: { now: Math.round(share * 100), min: 0, max: 100, text } }}>
      <path className="person-dial__band" d={arc(0, 1)} />
      {share > 0.01 ? <path className="person-dial__band" data-lit="true" d={arc(0, share)} /> : null}
    </Dial>
  );
}

/** A place between two named ends, -1..1: a needle, not an amount. */
export function LeanDial({ label, lean, word, tone = "reading", text }: { readonly tone?: DialTone; readonly label: string; readonly lean: number; readonly word: string; readonly text: string }) {
  const share = (Math.min(1, Math.max(-1, lean)) + 1) / 2;
  const angle = Math.PI * (1 - share);
  return (
    <Dial frame={{ label, word, tone, meter: { now: Math.round(lean * 100), min: -100, max: 100, text } }}>
      <path className="person-dial__band person-dial__band--ends" d={arc(0, 1)} />
      <line className="person-dial__needle" x1={CX} y1={CY} x2={(CX + (R - 2) * Math.cos(angle)).toFixed(2)} y2={(CY - (R - 2) * Math.sin(angle)).toFixed(2)} />
      <circle className="person-dial__hub" cx={CX} cy={CY} r={2.2} />
    </Dial>
  );
}
