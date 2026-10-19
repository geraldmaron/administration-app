import { useMemo, useState, type ReactNode } from "react";
import type { Campaign, InstitutionId } from "@admin/engine";
import { removableOfficers, REMOVAL_CAUSES, removalPacket, removalTerms, type RemovableOfficer, type RemovalTerms } from "@admin/player-core";
import { CompareAuthorize, Field, type CompareOption, type CompareRow, Icon } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type NationCommit } from "../../nation/economy/commit";
import { CostCell } from "../courts/Nominations";
import { MovedMeter } from "./DirectiveComposer";

const AT_WILL = "at-will";

const RULE_WORDS = { "at-will": "Serves at your pleasure. No cause is needed.", "for-cause": "Removable only for a stated cause, and each cause bends the body by its own amount." } as const;

type Column = { readonly id: string; readonly label: string; readonly cause?: string; readonly terms: RemovalTerms | { readonly refusal: string } };

/** One column per way the office can be emptied: one for an at-will office, one per statutory cause for a for-cause office. */
function columnsFor(campaign: Campaign, officer: RemovableOfficer): readonly Column[] {
  if (officer.removal === "at-will") return [{ id: AT_WILL, label: "Remove", terms: removalTerms(campaign, officer.institution) }];
  return REMOVAL_CAUSES.map((cause) => ({ id: cause, label: `For ${cause.toLowerCase()}`, cause, terms: removalTerms(campaign, officer.institution, cause) }));
}

function rowsFor(columns: readonly Column[]): readonly CompareRow[] {
  const each = (cell: (terms: RemovalTerms) => ReactNode) => Object.fromEntries(columns.map((column) => [column.id, "refusal" in column.terms ? column.terms.refusal : cell(column.terms)]));
  return [
    { label: "The office", icon: "building", cells: { ...each(() => "Left open until the Senate confirms a successor") } },
    { label: "Bent toward your politics", icon: "layerLean", cells: { ...each((terms) => <MovedMeter label="Politicization" before={terms.politicization.before} after={terms.politicization.after} />) } },
    { label: "Cost now", icon: "budget", cells: { ...each((terms) => <CostCell cost={terms.cost} />) } },
  ];
}

function RemovalCompare({ campaign, officer, acts }: { readonly campaign: Campaign; readonly officer: RemovableOfficer; readonly acts: NationCommit }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const columns = useMemo(() => columnsFor(campaign, officer), [campaign, officer]);
  const options: readonly CompareOption[] = columns.map((column) => ({ id: column.id, label: column.label, icon: "reject" as const, accent: "red" as const, ...("refusal" in column.terms ? { unavailable: column.terms.refusal } : {}) }));
  const column = columns.find((entry) => entry.id === selected);
  const projection = useChoiceProjection(
    campaign,
    actsChoice("Removal", "keeping them", "Keeping them in office.", columns.map((entry) => ({ id: entry.id, label: entry.label, ...("refusal" in entry.terms ? { refused: entry.terms.refusal } : { act: { act: "remove-officer" as const, institution: officer.institution, ...(entry.cause ? { cause: entry.cause } : {}) } }) }))),
    selected,
  );
  return (
    <CompareAuthorize
      title={`Compare removing ${officer.holder}`}
      options={options}
      rows={rowsFor(columns)}
      selected={selected}
      onSelect={setSelected}
      verb="Remove the officer"
      tone="danger"
      onAuthorize={() =>
        void acts.commit({
          review: { tier: "full", title: `Remove ${officer.holder} as ${officer.title}`, verb: "Confirm the removal", danger: true },
          title: `${officer.holder} removed as ${officer.title}`,
          lines: [{ label: "Stated cause", value: column?.cause ?? "None needed" }, { label: "The office", value: "Left open" }],
          packet: () => removalPacket(campaign, officer.institution, column?.cause),
        })
      }
      review={`${officer.holder} leaves today and ${officer.body} runs without a confirmed head. It goes on the Record.`}
      busy={acts.busy}
      {...(projection ? { projection } : {})}
    />
  );
}

/** The officers below the cabinet a President may remove, one chosen and its removal compared. */
export function Officers({ campaign }: { readonly campaign: Campaign }) {
  const officers = useMemo(() => removableOfficers(campaign), [campaign]);
  const acts = useNationCommit(campaign);
  const [institution, setInstitution] = useState<InstitutionId>(officers[0]?.institution ?? "");
  const officer = officers.find((row) => row.institution === institution) ?? officers[0];
  return (
    <section className="nation-section" aria-labelledby="oversight-officers">
      <h2 id="oversight-officers" className="nation-section__title">
        <Icon name="reject" size={20} /> Remove an officer
      </h2>
      {acts.committed ? <ActReceipt committed={acts.committed} again="Back to the officers" onAgain={acts.dismiss} mapNote={null} /> : null}
      {!acts.committed && officer ? (
        <div className="composer">
          <Field label="Officer" hint={RULE_WORDS[officer.removal === "for-cause" ? "for-cause" : "at-will"]}>
            {(props) => (
              <select {...props} className="ui-input" value={officer.institution} onChange={(event) => setInstitution(event.target.value)}>
                {officers.map((row) => (
                  <option key={row.institution} value={row.institution}>
                    {`${row.body}: ${row.holder}`}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <RemovalCompare key={officer.institution} campaign={campaign} officer={officer} acts={acts} />
        </div>
      ) : null}
      {!acts.committed && !officer ? <p className="nation-note">No officer below the cabinet is in a chair you can empty.</p> : null}
      {acts.problem ? (
        <p className="nation-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </section>
  );
}
