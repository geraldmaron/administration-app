import { useState } from "react";
import { sealFor, type FindingRow } from "@admin/player-core";
import { Button, Column, FindingPaper, Row, Seal, Text } from "@admin/ui";
import { NationLink } from "../world/parts";

// Each open covert finding as the paper the President signed: the section 503
// form, its scope and description, and the date it was signed. How the
// committees were told, how many actions ran under it and whether reasons are
// owed are the record's, not the finding's, so they stay on the row.

function OpenFinding({ row, signer }: { readonly row: FindingRow; readonly signer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Column gap="sm">
      <Row gap="sm" wrap between>
        <Column flex={1} minWidth={200} gap="2xs">
          <NationLink nation={row.target} name={row.targetName} />
          <Text variant="caption" tone="secondary">{`Signed ${row.signed}. ${row.told}. ${row.activities} ${row.activities === 1 ? "action" : "actions"} under it so far.`}</Text>
        </Column>
        <Button kind="quiet" size="compact" icon={open ? "restorePanel" : "dossier"} aria-expanded={open} onPress={() => setOpen(!open)}>
          {open ? "Hide the finding" : "Read the finding"}
        </Button>
      </Row>
      {open ? <FindingPaper seal={<Seal spec={sealFor("SEAL-PRESIDENT")} size={56} label="Seal of the President of the United States" />} scope={row.targetName} description={row.objective} signer={signer} signed={row.signed} /> : null}
    </Column>
  );
}

export function FindingFile({ findings, signer }: { readonly findings: readonly FindingRow[]; readonly signer: string }) {
  if (findings.length === 0) return null;
  return (
    <Column gap="md">
      <Text variant="title">Findings you've signed</Text>
      {findings.map((row) => (
        <OpenFinding key={row.id} row={row} signer={signer} />
      ))}
    </Column>
  );
}
