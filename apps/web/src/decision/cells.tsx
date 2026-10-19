import type { Campaign, ProjectionImpact } from "@admin/engine";
import type { ComparisonCell } from "@admin/player-core";
import { Gauge, HelpTip, Icon, Movement, Portrait } from "@admin/ui-web";
import { faceOf } from "../media/faces";

const BAND_STEPS = { slight: 1, moderate: 2, major: 3 } as const;
const BAND_WORDS = { slight: "Slight", moderate: "Moderate", major: "Major" } as const;

/**
 * A projected move drawn as what it is: a direction and a band of size, three
 * steps filled for a major move. Favorable and adverse are said in words as
 * well as color, so the meaning never rests on the hue.
 */
function ImpactMark({ impact, favorable }: { readonly impact: ProjectionImpact; readonly favorable: boolean | undefined }) {
  const steps = BAND_STEPS[impact.band];
  const verdict = favorable === undefined ? "" : favorable ? ", in your favor" : ", against you";
  const words = `${BAND_WORDS[impact.band]} ${impact.direction === "up" ? "rise" : "fall"}${verdict}`;
  return (
    <span className="impact" data-favorable={favorable === undefined ? undefined : favorable ? "true" : "false"} role="img" aria-label={words}>
      <span className="impact__arrow" aria-hidden="true">
        {impact.direction === "up" ? "▲" : "▼"}
      </span>
      <span className="impact__steps" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span key={step} className="impact__step" data-on={step <= steps ? "true" : undefined} />
        ))}
      </span>
      <span className="impact__word" aria-hidden="true">
        {words}
      </span>
    </span>
  );
}

export type NamedImpact = { readonly label: string; readonly impact: ProjectionImpact; readonly favorable: boolean | undefined };

/**
 * Every move an answer is projected to make, one bar each from the same zero
 * line, cut into the three bands the staff estimate in: the shape of an answer
 * read at a glance, and the same length meaning the same band in every card.
 */
export function MovesCell({ moves }: { readonly moves: readonly NamedImpact[] }) {
  if (moves.length === 0) return <span className="cell-none">No change expected</span>;
  return (
    <ul className="cell-moves">
      {moves.map((move) => {
        const steps = BAND_STEPS[move.impact.band];
        return (
          <li key={move.label}>
            <Movement
              label={move.label}
              value={move.impact.direction === "up" ? steps : -steps}
              scale={3}
              steps={3}
              text={`${BAND_WORDS[move.impact.band]} ${move.impact.direction === "up" ? "rise" : "fall"}`}
              valence={move.favorable === undefined ? "neutral" : move.favorable ? "good" : "bad"}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** What it costs now as the headline figure, with how it was priced set small beneath it. */
export function CostCell({ campaign, cost, basis }: { readonly campaign: Campaign; readonly cost: ComparisonCell; readonly basis: ComparisonCell | undefined }) {
  return (
    <span className="cell-price">
      <ComparisonCellView campaign={campaign} cell={cost} />
      {basis && basis.kind === "text" ? (
        <HelpTip label="How this estimate is priced"><p>{basis.text}</p></HelpTip>
      ) : null}
    </span>
  );
}

const COUNSEL_WORDS = { for: "Backs it", wary: "Wary", against: "Against it" } as const;

function CounselMark({ campaign, cell }: { readonly campaign: Campaign; readonly cell: Extract<ComparisonCell, { kind: "counsel" }> }) {
  const face = faceOf(campaign, cell.person, cell.name);
  return (
    <span className="cell-counsel" data-stance={cell.stance}>
      <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="sm" decorative />
      <span>
        <span className="cell-counsel__name">{cell.name}</span>
        <span className="cell-counsel__word">{COUNSEL_WORDS[cell.stance]}</span>
      </span>
    </span>
  );
}

/** One comparison cell drawn as the reading it is: money, a band, odds on a meter, a list, an adviser. */
export function ComparisonCellView({ campaign, cell }: { readonly campaign: Campaign; readonly cell: ComparisonCell }) {
  switch (cell.kind) {
    case "money":
      return (
        <strong className="cell-money" data-stance={cell.amount < 0 ? "adverse" : "favorable"}>
          {cell.text}
        </strong>
      );
    case "impact":
      return <ImpactMark impact={cell.impact} favorable={cell.favorable} />;
    case "chance":
      return <Gauge shape="meter" label="Chance it works" labelHidden value={cell.chance} valueText={cell.text} />;
    case "lines":
      return (
        <ul className="cell-lines">
          {cell.lines.map((line) => (
            <li key={line}>
              <Icon name="caution" size={14} />
              {line}
            </li>
          ))}
        </ul>
      );
    case "counsel":
      return <CounselMark campaign={campaign} cell={cell} />;
    case "text":
      return <span>{cell.text}</span>;
    case "none":
      return <span className="cell-none">{cell.text}</span>;
  }
}
