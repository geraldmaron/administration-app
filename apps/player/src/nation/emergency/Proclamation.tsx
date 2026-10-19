import { sealFor, type DeclarationRow } from "@admin/player-core";
import { ProclamationPaper, Seal, witnessDate } from "@admin/ui";

// A declaration in force as the proclamation that made it: under the
// National Emergencies Act the President declares by proclamation, finding
// the emergency, naming where it reaches and why, and transmitting it to
// Congress. The date is the one the declaration was made; the lapse clock and
// the weekly cost stay on the card beside it, because the proclamation says
// neither.

function titleOf(row: DeclarationRow): string {
  return row.scope.kind === "state" ? `Declaring an Emergency in the State of ${row.where}` : `Declaring a National Emergency Concerning ${row.causeLabel}`;
}

export function Proclamation({ row, signer }: { readonly row: DeclarationRow; readonly signer: string }) {
  const where = row.scope.kind === "state" ? `in the State of ${row.where}` : "throughout the United States";
  return (
    <ProclamationPaper
      seal={<Seal spec={sealFor("SEAL-PRESIDENT")} size={64} label="Seal of the President of the United States" />}
      title={titleOf(row)}
      operative={`by the authority vested in me by the Constitution and the laws of the United States of America, including the National Emergencies Act (50 U.S.C. 1601 et seq.), do hereby find and declare that an emergency exists ${where} by reason of ${row.causeLabel.toLowerCase()}.`}
      further={["This proclamation shall be published in the Federal Register and transmitted to the Congress."]}
      signer={signer}
      witnessed={witnessDate(row.declared)}
    />
  );
}
