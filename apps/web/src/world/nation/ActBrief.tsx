import type { ActAssessment, OptionView } from "@admin/player-core";
import { Icon, Steps, type IconName } from "@admin/ui-web";

const ORDINAL = ["remote", "unlikely", "roughly even", "likely", "almost certain"];

/** The engine's price, time and likelihood stay visible before configuration. */
export function ActBrief({ assessment, chosen }: { readonly assessment: ActAssessment; readonly chosen: OptionView }) {
  const row = (label: string) => assessment.rows.find((entry) => entry.label === label)?.act;
  const cost = row("Cost now") ?? row("Revenue");
  const timing = row("When");
  const odds = chosen.preview.odds;
  const escalation = row("Escalation");
  const facts: readonly { label: string; icon: IconName; text: string; stance?: string }[] = [
    ...(cost ? [{ label: row("Cost now") ? "Cost now" : "Revenue", icon: "budget" as const, text: cost.text, stance: cost.stance }] : []),
    ...(timing ? [{ label: "Timing", icon: "schedule" as const, text: timing.text }] : []),
    ...(escalation ? [{ label: "Escalation", icon: "escalate" as const, text: escalation.text, stance: escalation.stance }] : []),
  ];
  return <section className="act-brief" aria-label="Selected action at a glance">
    <dl className="act-brief__facts">{facts.map((fact) => <div key={fact.label} data-stance={fact.stance}>
      <dt><Icon name={fact.icon} size={16} />{fact.label}</dt><dd>{fact.text}</dd>
    </div>)}{odds ? <div data-stance={odds.stance}><dt><Icon name="layerReading" size={16} />{odds.label}</dt><dd><Steps label={odds.label} lit={ORDINAL.indexOf(odds.word) + 1} steps={5} word={odds.word} tone="neutral" /></dd></div> : null}</dl>
    {chosen.preview.scale ? <div className="act-brief__scale"><Steps label={chosen.preview.scale.label} lit={chosen.preview.scale.level} steps={chosen.preview.scale.of} word="Instrument scale" tone="neutral" /><p>Instrument intensity, not a success probability.</p></div> : null}
    {chosen.preview.basis ? <p className="act-brief__basis">{chosen.preview.basis}</p> : null}
    {assessment.locked ? <p role="status"><Icon name="locked" size={16} /> {assessment.locked}</p> : null}
  </section>;
}
