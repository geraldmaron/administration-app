import { EvidencePanel } from "@admin/ui-web";
import { useState, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import type { ActAssessment, ActGoal, AssessmentCell, AssessmentItem, ModelingAct } from "@admin/player-core";
import { CompareAuthorize, Icon, isIconName, type CompareOption, type CompareRow, type IconBadgeTone, type IconName } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { AssetGlyph } from "../forces/AssetFigure";


// Longer evidence opens beside its comparison without changing the table geometry.
const SHORT_REASON = 90;

/** Each goal's character on its column head: accord blue, trade and pressure gold, the covert plain, force red. */
const GOAL_LOOK: Readonly<Record<ActGoal, { readonly icon: IconName; readonly accent: IconBadgeTone }>> = {
  ties: { icon: "summit", accent: "blue" },
  trade: { icon: "subjectTrade", accent: "gold" },
  pressure: { icon: "instrumentEconomic", accent: "gold" },
  covert: { icon: "instrumentCovert", accent: "neutral" },
  force: { icon: "instrumentMilitary", accent: "red" },
};

const ROW_MARK: Readonly<Record<string, IconName>> = {
  "What it does": "dispatch",
  "Chance it works": "layerReading",
  "Cost now": "budget",
  When: "schedule",
  "What it sends": "instrumentMilitary",
  "Who stands with you": "summit",
  "Who reacts": "world",
  "If it goes wrong": "caution",
  Escalation: "escalate",
  "Civilian exposure": "shield",
  "Who is consulted": "subjectSeal",
  "Would they accept": "summit",
  "Would they sign": "sign",
  "The relationship if they accept": "layerTrust",
  "If they decline": "caution",
  Congress: "subjectCapitol",
  "Congress says yes": "subjectCapitol",
  "Responsible department": "subjectPerson",
  Envoy: "subjectPerson",
  "Without it": "neutral",
  Revenue: "budget",
  "Prices at home": "economyInflation",
  "Trade with them": "subjectTrade",
  "Chance they hit back": "adverse",
};

/** A chance as five pips lit to its step, colored by whether that chance is good news. */
function Pips({ step, tone }: { readonly step: number; readonly tone: string | undefined }) {
  return (
    <span className="assess-pips" data-stance={tone} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((pip) => (
        <span key={pip} data-lit={pip <= step ? "true" : undefined} />
      ))}
    </span>
  );
}

/** The governments a line names, as a run of flags; each flag's title carries its line. */
function Flags({ items }: { readonly items: readonly AssessmentItem[] }) {
  return (
    <span className="assess-flags">
      {items.map((item) => {
        const src = item.nation ? nationFlagUrl(item.nation) : undefined;
        return (
          <span key={item.text} className="assess-flag" data-stance={item.stance} title={item.text}>
            {src ? <img src={src} alt="" /> : null}
            <span className="assess-flag__name">{item.text.split(/[,:]/)[0]}</span>
          </span>
        );
      })}
    </span>
  );
}

function ItemLine({ item }: { readonly item: AssessmentItem }) {
  if (item.likelihood !== undefined) {
    return (
      <li className="assess-item">
        <Pips step={item.likelihood} tone="adverse" />
        <span>{item.text}</span>
      </li>
    );
  }
  if (item.direction) {
    return (
      <li className="assess-item assess-item--delta" data-direction={item.direction}>
        <Icon name={item.direction === "up" ? "favorable" : "adverse"} size={14} weight="bold" />
        <span>{item.text}</span>
      </li>
    );
  }
  if (item.emblem) {
    return (
      <li className="assess-item assess-item--chip">
        <Icon name={isIconName(item.emblem) ? item.emblem : "building"} size={14} />
        <span>{item.text}</span>
      </li>
    );
  }
  return <li className="assess-item">{item.text}</li>;
}

/** The reasons under an answer: on the face when short, folded under "Why" when they would bury the answer. */
function Reasons({ lines }: { readonly lines: readonly string[] }) {
  if (lines.every((line) => line.length <= SHORT_REASON)) {
    return (
      <ul className="assess__detail">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    );
  }
  return (
    <EvidencePanel title="Assessment reasoning" label="Assessment evidence">
      <ul className="assess__detail">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </EvidencePanel>
  );
}

function Items({ items }: { readonly items: readonly AssessmentItem[] }) {
  if (items.every((item) => item.nation)) {
    return (
      <>
        <Flags items={items} />
        {items.some((item) => item.text.includes(":")) ? <Reasons lines={items.map((item) => item.text)} /> : null}
      </>
    );
  }
  const chips = items.every((item) => item.emblem || item.direction);
  return (
    <ul className={chips ? "assess-items assess-items--chips" : "assess-items"}>
      {items.map((item) => (
        <ItemLine key={item.text} item={item} />
      ))}
    </ul>
  );
}

const STANCE_VALENCE = { favorable: "good", caution: "watch", adverse: "bad" } as const;

/** The reasons, flags and chips under a reading, drawn as the cell has always drawn them. */
function Under({ cell }: { readonly cell: AssessmentCell }): ReactNode {
  if (cell.items?.length) return <Items items={cell.items} />;
  if (cell.detail?.length) return <Reasons lines={cell.detail} />;
  return null;
}

/** One cell of the comparison: a chance on a five-step scale, a word in its stance's color, or the cell's own drawing where it has one (consulted bodies, force counts). */
function cellOf(cell: AssessmentCell): ReactNode {
  const valence = cell.stance ? STANCE_VALENCE[cell.stance] : "neutral";
  if (cell.unitType !== undefined || (cell.items?.every((item) => item.emblem) ?? false)) {
    return (
      <div className="assess" data-stance={cell.stance}>
        {cell.items?.every((item) => item.emblem) ? null : (
          <span className="assess__lead">
            <span className="assess__text">
              {cell.unitType ? <AssetGlyph unitType={cell.unitType} size={20} /> : null} {cell.text}
            </span>
          </span>
        )}
        <Under cell={cell} />
      </div>
    );
  }
  return (
    <div className="assess" data-stance={cell.stance}>
      <span className="assess__lead">
        {cell.likelihood !== undefined ? <Pips step={cell.likelihood} tone={cell.stance} /> : null}
        <span className="assess__text ui-valence-ink" data-valence={valence}>
          {cell.text}
        </span>
      </span>
      <Under cell={cell} />
    </div>
  );
}

export type ActCompareProps = {
  readonly assessment: ActAssessment;
  /** The act as the projection builds it, on the campaign the screen priced it against. Absent, the list has no projection. */
  readonly projectAs?: { readonly campaign: Campaign; readonly act: ModelingAct };
  readonly busy: boolean;
  readonly onAuthorize: () => void;
  readonly title?: string;
};

/**
 * The integrated assessment: the chosen act read row by row as its change
 * from today, with the verb and its review at the foot.
 */
export function ActCompare({ assessment, projectAs, busy, onAuthorize, title = "What the act would do" }: ActCompareProps) {
  const [selected, setSelected] = useState<string | undefined>(assessment.option.id);
  const projection = useChoiceProjection(
    projectAs?.campaign,
    projectAs ? actsChoice(assessment.option.name, "doing nothing", "Doing nothing: no act goes out.", [{ id: assessment.option.id, label: assessment.option.name, act: projectAs.act }]) : undefined,
    selected,
  );
  const options: readonly CompareOption[] = [
    { id: assessment.option.id, label: assessment.option.name, ...GOAL_LOOK[assessment.option.goal], ...(assessment.locked ? { unavailable: `Not available: ${assessment.locked}` } : {}) },
  ];
  const rows: readonly CompareRow[] = assessment.rows.map((row) => {
    const mark = ROW_MARK[row.label];
    return {
      label: row.label,
      ...(mark ? { icon: mark } : {}),
      ...(row.label === "What it does" ? { kind: "lead" as const } : {}),
      cells: { [assessment.option.id]: cellOf(row.act) },
    };
  });
  return (
    <CompareAuthorize
      title={title}
      options={options}
      rows={rows}
      selected={selected}
      onSelect={setSelected}
      verb={assessment.verb}
      tone={assessment.tone}
      onAuthorize={onAuthorize}
      review={assessment.review}
      busy={busy}
      docked
      {...(projection ? { projection } : {})}
    />
  );
}
