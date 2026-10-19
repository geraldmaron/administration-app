import "./country.css";
import type { ActAssessment, ActWorkspace } from "@admin/player-core";
import { Flag } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { authorizationSummary } from "./act-summary";

type Props = {
  readonly nation: string;
  readonly name: string;
  readonly chosen: NonNullable<ActWorkspace["chosen"]>;
  readonly terms: ActWorkspace["terms"];
  readonly assessment: ActAssessment;
};

/** The terms of the act as set, read in one place above the comparison and the one verb. */
export function ActSummary({ nation, name, chosen, terms, assessment }: Props) {
  const lines = authorizationSummary({ name, chosen, terms, assessment });
  const src = nationFlagUrl(nation);
  return (
    <dl className="act-summary" aria-label={`The act as set: ${chosen.option.name}`}>
      {lines.map((line) => (
        <div key={line.label} className="act-summary__line">
          <dt>{line.label}</dt>
          <dd>
            {line.label === "Target" ? <Flag name={name} {...(src ? { src } : {})} height={16} decorative /> : null} {line.value}
            {line.basis ? <span className="act-summary__basis">{line.basis}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
