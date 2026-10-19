import { useMemo, useState } from "react";
import type { Campaign, InstitutionId } from "@admin/engine";
import { REMOVAL_CAUSES, costLines, removableOfficers, removalPacket, removalTerms, sealFor, type ActColumn, type ActComparison, type RemovableOfficer } from "@admin/player-core";
import { Card, Empty, Row, Seal, Select, Text } from "@admin/ui";
import { ActChooser } from "../congress/ActChooser";
import type { ActCommit } from "../congress/commit";

import { CitedLawHelp } from "../law/LawHelp";
import { LAW, movedWords } from "./model";

const RULE_WORDS = { "at-will": "You can remove them at any time, for any reason.", "for-cause": "You can remove them only for a reason the law allows. Each reason makes the agency look more political by a different amount." } as const;

/** One column per way the office can be emptied: one for an at-will office, one per statutory cause for a for-cause office. */
function comparison(campaign: Campaign, officer: RemovableOfficer): ActComparison {
  const ways = officer.removal === "at-will" ? [{ id: "at-will", label: "Remove", cause: undefined as string | undefined }] : REMOVAL_CAUSES.map((cause) => ({ id: cause, label: `For ${cause.toLowerCase()}`, cause }));
  const priced = ways.map((way) => ({ way, terms: removalTerms(campaign, officer.institution, way.cause) }));
  const columns = priced.map(({ way, terms }): ActColumn => {
    if ("refusal" in terms) return { id: way.id, label: way.label, verb: "Remove the officer", refusal: terms.refusal, review: terms.refusal, cells: {} };
    return {
      id: way.id, label: way.label, verb: "Remove the officer",
      review: `${officer.holder} leaves today, and ${officer.body} has no Senate-approved leader until the job is filled. It goes into the Record.`,
      cells: { office: { lines: ["Empty until the Senate approves a replacement"] }, politics: { lines: [movedWords(terms.politicization.before, terms.politicization.after)], stance: terms.politicization.after > terms.politicization.before ? "adverse" : "neutral" }, cost: { lines: costLines(terms.cost).length ? costLines(terms.cost) : ["Nothing"], stance: "caution" } },
    };
  });
  return {
    rows: [{ key: "office", label: "The office" }, { key: "politics", label: "How political it looks" }, { key: "cost", label: "Cost" }],
    columns,
  };
}

/** The officers below the cabinet a President may remove, one chosen and each way of removing them read as its change from today. */
export function Officers({ campaign, acts }: { readonly campaign: Campaign; readonly acts: ActCommit }) {
  const officers = useMemo(() => removableOfficers(campaign), [campaign]);
  const [institution, setInstitution] = useState<InstitutionId | undefined>(officers[0]?.institution);
  const officer = officers.find((row) => row.institution === institution) ?? officers[0];
  return (
    <Card title="Remove an officer" icon="reject" help={<CitedLawHelp title="Removing officials" meaning="Most officials who carry out the law answer to you, and you can remove them whenever you want. For some independent agencies, Congress has set a rule that you can remove the leader only for certain reasons." cites={[LAW.executivePower, LAW.takeCare]} />}>
      {!officer ? <Empty title="No official can be removed right now" detail="Officials below the Cabinet who you may remove will be listed here." /> : (
        <ActChooser key={officer.institution} id="removal" title={`Compare removing ${officer.holder}`} comparison={comparison(campaign, officer)} acts={acts} authority={LAW.executivePower} danger again="Back to the officers"
          receiptTitle={() => `${officer.holder} removed as ${officer.title}`}
          packet={(option) => removalPacket(campaign, officer.institution, option === "at-will" ? undefined : option)}
          terms={
            <>
              <Select label="Officer" options={officers.map((row) => ({ value: row.institution, label: `${row.body}: ${row.holder}` }))} value={officer.institution} onChange={setInstitution} />
              <Row gap="sm">
                <Seal spec={sealFor(officer.institution, officer.body)} size={40} />
                <Text variant="caption" flex={1}>{officer.title}, {officer.body}. {RULE_WORDS[officer.removal === "for-cause" ? "for-cause" : "at-will"]}</Text>
              </Row>
            </>
          } />
      )}
    </Card>
  );
}
