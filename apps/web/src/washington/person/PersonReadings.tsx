import { useId, useState } from "react";
import "./person-readings.css";
import type { PersonReading } from "@admin/player-core";
import { Icon, Sheet, Steps } from "@admin/ui-web";
import { toneOf, valenceOf } from "../../shell/valence";
import { READING_MARK } from "./PersonVisuals";

const CONFIDENCE_WORDS = { low: "Low confidence", moderate: "Moderate confidence", high: "High confidence" } as const;
const CONFIDENCE_PIPS = { low: 1, moderate: 2, high: 3 } as const;

/** How sure the read is, drawn as three steps with the word beside them; the basis rides in the title. */
function Confidence({ reading }: { readonly reading: PersonReading }) {
  if (reading.kind === "pressure") return <span className="person-reading__confidence">Pressure, not a grade</span>;
  if (!reading.confidence) return null;
  const lit = CONFIDENCE_PIPS[reading.confidence];
  return (
    <div className="person-reading__confidence" title={`Read ${reading.basis}`}>
      <Steps label="Confidence in the read" labelHidden steps={3} lit={lit} word={CONFIDENCE_WORDS[reading.confidence]} tone="neutral" />
      <span className="ui-visually-hidden">, read {reading.basis}</span>
    </div>
  );
}

/**
 * The five readings on a person as discrete bands: the word, what it moves
 * in the simulation, how sure the read is, and which way loyalty has gone
 * since they were seated. Ambition is drawn as pressure toward a mark, never
 * graded good or bad.
 */
export function PersonReadings({ readings, title, titleHidden = false }: { readonly readings: readonly PersonReading[]; readonly title: string; readonly titleHidden?: boolean }) {
  const id = useId();
  const [selected, setSelected] = useState<PersonReading>();
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={titleHidden ? "ui-visually-hidden" : "exec__heading"}>
        {title}
      </h2>
      <ul className="person-readings">
        {readings.map((reading) => (
          <li key={reading.key} data-kind={reading.kind} {...(reading.kind === "pressure" ? {} : { "data-valence": valenceOf(reading.stance) })}>
            <button type="button" className="person-reading" onClick={() => setSelected(reading)} aria-label={`${reading.label}: ${reading.word}. Open assessment evidence`}>
              <Icon name={READING_MARK[reading.key] ?? "layerReading"} size={20} className="person-reading__mark" />
              <Steps showBand label={reading.label} lit={reading.band + 1} word={reading.word} tone={reading.kind === "pressure" ? "reading" : toneOf(reading.stance)} />
              <Confidence reading={reading} />
              {reading.trend ? <span className="person-reading__trend" data-trend={reading.trend}><Icon name={reading.trend === "rising" ? "favorable" : "adverse"} size={14} />{reading.trendText}</span> : null}
              <span className="person-reading__open"><Icon name="info" size={16} /> Evidence and limits</span>
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={!!selected} onClose={() => setSelected(undefined)} title={selected ? `${selected.label} · assessment evidence` : "Assessment evidence"} placement="side" lead="A qualitative staff assessment, not a measured probability or a verified personal fact.">
        {selected ? <div className="assessment-evidence"><Steps showBand label={selected.label} lit={selected.band + 1} word={selected.word} tone={selected.kind === "pressure" ? "reading" : toneOf(selected.stance)} /><Confidence reading={selected} /><h3>Basis and modeled consequences</h3><p>{selected.consequence}</p>{selected.basis ? <p className="assessment-evidence__basis">Staff basis: {selected.basis}</p> : null}{selected.trendText ? <p>{selected.trendText}</p> : null}</div> : null}
      </Sheet>
    </section>
  );
}
