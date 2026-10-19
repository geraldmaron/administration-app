import type { AttributeJudgment } from "@admin/player-core";
import { Steps } from "@admin/ui-web";
import { toneOf } from "../../shell/valence";

const CONFIDENCE_WORDS = { low: "Low confidence", moderate: "Moderate confidence", high: "High confidence" } as const;

/**
 * A reading of a person drawn as the band it falls in, never as the figure
 * behind it: four steps on a meter, the word beside it, and how sure the read
 * is. Nothing in the office hands a President a number for a person.
 */
export function BandMeter({ judgment, labelHidden = false, withBasis = false }: { readonly judgment: AttributeJudgment; readonly labelHidden?: boolean; readonly withBasis?: boolean }) {
  return (
    <Steps
      label={judgment.label}
      labelHidden={labelHidden}
      lit={judgment.band + 1}
      word={judgment.word}
      tone={toneOf(judgment.stance)}
      {...(withBasis ? { caption: `${CONFIDENCE_WORDS[judgment.confidence]}, ${judgment.basis}` } : {})}
    />
  );
}
