import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { committeeNoticePacket, noticesOwed, type ActComparison, type NoticeOwed } from "@admin/player-core";
import { Card, Column, Select, Surface, Text } from "@admin/ui";
import { ActChooser } from "../congress/ActChooser";
import type { ActCommit } from "../congress/commit";
import { Note } from "../congress/parts";
import { CitedLawHelp } from "../law/LawHelp";
import { LAW } from "./model";

function comparison(notice: NoticeOwed): ActComparison {
  return {
    rows: [{ key: "who", label: "Who knows" }, { key: "late", label: "How late" }, { key: "cost", label: "Cost" }],
    waiting: `Until you tell them, the committees don't know, and the notice is ${notice.daysLate} days late and counting.`,
    columns: [
      { id: "notify", label: "Tell the committees", verb: "Notify the committees", review: "The committees learn of the finding today, with your reasons for the delay.", cells: { who: { lines: ["The intelligence committees, today"] }, late: { lines: [`${notice.daysLate} days late, on the record`] }, cost: { lines: ["Nothing"] } } },
    ],
  };
}

function OwedNotice({ campaign, notice, acts }: { readonly campaign: Campaign; readonly notice: NoticeOwed; readonly acts: ActCommit }) {
  const reasons = [notice.reasonsWithheld, "The delay followed the decision to withhold notification. No additional reason is recorded."].filter((value): value is string => Boolean(value));
  const [statement, setStatement] = useState<string | undefined>(undefined);
  return (
    <Surface level="raised" pad="md" accentEdge="warning">
      <Column gap="md">
        <Text variant="caption">
          You signed a finding on {notice.target} on {notice.signed}. Goal: {notice.objective}. You've held back telling the committees for {notice.daysLate} {notice.daysLate === 1 ? "day" : "days"}{notice.reasonsWithheld ? `, because ${notice.reasonsWithheld.replace(/\.$/, "")}` : ""}.
        </Text>
        <ActChooser id={`notice:${notice.id}`} title={`Tell the committees about ${notice.target}`} comparison={comparison(notice)} acts={acts} authority={LAW.covertNotice} again="Back to the notices"
          pending={() => (statement ? undefined : "Pick your reason for the delay first.")}
          receiptTitle={() => `The committees are told of the finding on ${notice.target}`}
          packet={() => committeeNoticePacket(campaign, notice.id, statement ?? "")}
          terms={<Select label="Your reason for the delay" options={reasons.map((reason) => ({ value: reason, label: reason }))} value={statement} onChange={setStatement} placeholder="Pick a statement" />} />
        <Note tone="tertiary">Sending a standard statement doesn't prove the delay was legal.</Note>
      </Column>
    </Surface>
  );
}

/** Notices the law says the President owes the intelligence committees, each against keeping it withheld. */
export function NoticesOwed({ campaign, acts }: { readonly campaign: Campaign; readonly acts: ActCommit }) {
  const owed = useMemo(() => noticesOwed(campaign), [campaign]);
  if (owed.length === 0) return <Note>You don't owe the intelligence committees any reports. If you sign a secret finding and hold back telling them, it shows up here until you do.</Note>;
  return (
    <Card title="Reports you owe the intelligence committees" icon="brief" edge={owed.length ? "warning" : undefined} help={<CitedLawHelp title="Secret operations" meaning="A covert action is a secret operation. Before one starts, you sign a written order, called a finding, and report it to the intelligence committees in Congress. In rare emergencies you can limit who's told or wait to tell them. But then you have to tell them soon and explain why you waited." cites={[LAW.covertNotice]} />}>
      {owed.map((notice) => <OwedNotice key={notice.id} campaign={campaign} notice={notice} acts={acts} />)}
    </Card>
  );
}
