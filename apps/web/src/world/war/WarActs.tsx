import { useMemo, useState } from "react";
import type { Campaign, ConflictSide } from "@admin/engine";
import {
  REPORT_AUTHORITIES,
  REPORT_WEEKS,
  callComparison,
  callPacket,
  terminatePacket,
  endComparison,
  endPacket,
  joinComparison,
  joinPacket,
  reportComparison,
  reportPacket,
  terminateComparison,
  authorizationComparison,
  authorizationPacket,
  type WarAuthorization,
  type WarCompact,
  type WarPaper,
  type WarScreenReading,
} from "@admin/player-core";
import { Choice } from "@admin/ui-web";
import { SetAct, type SetActProps } from "../set/SetAct";
import type { NationCommit } from "../../nation/economy/commit";

type Acts = { readonly acts: NationCommit };

/** Joining either side of a war the United States is outside, against staying out. */
export function JoinAct({ campaign, reading, acts }: { readonly campaign: Campaign; readonly reading: WarScreenReading } & Acts) {
  const comparison = useMemo(() => joinComparison(campaign, reading.id), [campaign, reading.id]);
  if (!comparison) return null;
  return (
    <SetAct
      title="Compare entering this war and staying out"
      comparison={comparison}
      acts={acts}
      tone="danger"
      packet={(option) => joinPacket(campaign, reading.id, option as ConflictSide)}
      receiptTitle={(column) => `${column.label}: forces committed`}
    />
  );
}

/** Asking Congress for the authority to fight a belligerent, so going in does not start the sixty-day clock. */
export function AuthorizationAct({ campaign, authorization, acts }: { readonly campaign: Campaign; readonly authorization: WarAuthorization } & Acts) {
  const comparison = useMemo(() => authorizationComparison(campaign, authorization.nation), [campaign, authorization.nation]);
  return (
    <SetAct
      title={`Compare asking Congress about force against ${authorization.name} and going without`}
      comparison={comparison}
      acts={acts}
      packet={() => authorizationPacket(campaign, authorization.nation)}
      receiptTitle={() => `Congress asked about ${authorization.name}`}
    />
  );
}

/** Cooling the front, putting terms, settling or leaving, against letting the war run. */
export function EndAct({ campaign, reading, acts }: { readonly campaign: Campaign; readonly reading: WarScreenReading } & Acts) {
  const role = reading.usRole === "joined" ? "joined" : "principal";
  const comparison = useMemo(() => endComparison(campaign, reading.id, role, reading.peace ? reading.peace.forecast : undefined), [campaign, reading.id, role, reading.peace]);
  const props: Omit<SetActProps, "title"> = {
    comparison,
    acts,
    packet: (option) => endPacket(campaign, reading.id, option),
    receiptTitle: (column) => column.label,
  };
  return <SetAct title={role === "joined" ? "Compare leaving this war and staying in" : "Compare ways to end this war and letting it run"} {...props} />;
}

/** Filing the report Congress is owed, or bringing the force out, each against leaving things as they are. */
export function PaperActs({ campaign, paper, acts, phase }: { readonly campaign: Campaign; readonly paper: WarPaper; readonly phase: "report" | "withdraw" } & Acts) {
  const obligation = campaign.security.warPowers.obligations.find((entry) => entry.id === paper.id);
  const [authority, setAuthority] = useState<string>(REPORT_AUTHORITIES[0].value);
  const [weeks, setWeeks] = useState<string>("8");
  const terms = { authority, weeks: Number(weeks) };
  const filing = useMemo(() => (obligation ? reportComparison(campaign, obligation, terms) : undefined), [campaign, obligation, authority, weeks]);
  const bringing = useMemo(() => (obligation ? terminateComparison(campaign, obligation) : undefined), [campaign, obligation]);
  if (!obligation) return null;
  return (
    <>
      {phase === "report" && (paper.report === "Owed" || paper.report === "Missed") ? (
        <SetAct
          title="Compare filing the War Powers report and leaving it unfiled"
          comparison={filing!}
          acts={acts}
          packet={() => reportPacket(campaign, obligation, terms)}
          receiptTitle={() => "War Powers report filed"}
          terms={
            <>
              <Choice legend="The authority you rely on" options={REPORT_AUTHORITIES} value={authority} onChange={setAuthority} layout="cards" />
              <Choice legend="How long you estimate" options={REPORT_WEEKS.map((count) => ({ value: String(count), label: `${count} weeks` }))} value={weeks} onChange={setWeeks} hint="The estimate is on the record if it is exceeded." />
            </>
          }
        />
      ) : null}
      {phase === "withdraw" && paper.withdrawal ? (
        <SetAct
          title="Compare bringing the force out and leaving it committed"
          comparison={bringing!}
          acts={acts}
          packet={() => terminatePacket(campaign, obligation)}
          receiptTitle={() => "Use of force terminated"}
          tone="danger"
        />
      ) : null}
    </>
  );
}

/** Calling a defense compact to answer the attack, against fighting on alone. */
export function CompactActs({ campaign, reading, compact, acts }: { readonly campaign: Campaign; readonly reading: WarScreenReading; readonly compact: WarCompact } & Acts) {
  const comparison = useMemo(() => callComparison(campaign, reading.id, compact.org, compact.name, compact.answers), [campaign, reading.id, compact]);
  return (
    <SetAct
      title={`Compare calling the ${compact.name} and fighting on alone`}
      comparison={comparison}
      acts={acts}
      packet={() => callPacket(campaign, compact.org, reading.id)}
      receiptTitle={() => `${compact.name} called`}
    />
  );
}
