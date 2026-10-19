import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { committeeNoticePacket, noticesOwed, type NoticeOwed } from "@admin/player-core";
import { CompareAuthorize, Field, Icon } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { useSettled } from "../../modeling/useSettled";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type NationCommit } from "../../nation/economy/commit";
import { NoneCell } from "../courts/Nominations";

const NOTIFY = "notify";

function OwedNotice({ campaign, notice, acts }: { readonly campaign: Campaign; readonly notice: NoticeOwed; readonly acts: NationCommit }) {
  const [statement, setStatement] = useState("");
  const reasons = [notice.reasonsWithheld, "The delay followed the decision to withhold notification. No additional reason is recorded."].filter((value): value is string => !!value);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const settled = useSettled(statement.trim(), 700);
  const projection = useChoiceProjection(
    campaign,
    actsChoice("Notice to the committees", "withholding it", "Keeping notice withheld.", [
      { id: NOTIFY, label: "Tell the committees", ...(settled ? { act: { act: "committee-notice" as const, finding: notice.id, statement: settled } } : { refused: "Write the statement of reasons first." }) },
    ]),
    selected,
  );
  return (
    <div className="composer">
      <p className="nation-note">
        A finding on {notice.target}, signed {notice.signed}: {notice.objective}. Notice withheld {notice.daysLate} {notice.daysLate === 1 ? "day" : "days"} ago
        {notice.reasonsWithheld ? `, because ${notice.reasonsWithheld.replace(/\.$/, "")}` : ""}.
      </p>
      <Field label="Statement of reasons for the delay" hint="Select the existing recorded reason or state that no additional reason is recorded. A template is not proof that the delay complied with law.">
        {(props) => <select {...props} className="ui-input" value={statement} onChange={(event) => setStatement(event.target.value)}><option value="">Select the statement to transmit</option>{reasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select>}
      </Field>
      <CompareAuthorize
        title={`Compare telling the committees about ${notice.target}`}
        options={[{ id: NOTIFY, label: "Tell the committees", icon: "dispatch", ...(statement.trim() ? {} : { unavailable: "Not available: write the statement of reasons first." }) }]}
        rows={[
          { label: "Who knows", icon: "dossier", cells: { [NOTIFY]: "The intelligence committees, today" } },
          { label: "How late", icon: "schedule", cells: { [NOTIFY]: `${notice.daysLate} days, on the record` } },
          { label: "Cost now", icon: "budget", cells: { [NOTIFY]: <NoneCell>Nothing</NoneCell> } },
        ]}
        selected={selected}
        onSelect={setSelected}
        verb="Notify the committees"
        onAuthorize={() =>
          void acts.commit({
            review: { tier: "confirm", title: `Notify the committees of the finding on ${notice.target}` },
            title: `The committees are told of the finding on ${notice.target}`,
            lines: [{ label: "Days late", value: String(notice.daysLate) }, { label: "Statement", value: statement.trim() }],
            packet: () => committeeNoticePacket(campaign, notice.id, statement.trim()),
          })
        }
        review="The committees learn of the finding today, with your reasons for the delay."
        baselineReview={`Until you tell them, the committees don't know, and the notice is ${notice.daysLate} days late and counting.`}
        busy={acts.busy}
        {...(projection ? { projection } : {})}
      />
    </div>
  );
}

/** Notices the law says you owe the intelligence committees, each with what the delay is costing. */
export function NoticesOwed({ campaign }: { readonly campaign: Campaign }) {
  const owed = useMemo(() => noticesOwed(campaign), [campaign]);
  const acts = useNationCommit(campaign);
  return (
    <section className="nation-section" aria-labelledby="oversight-notices">
      <h2 id="oversight-notices" className="nation-section__title">
        <Icon name="brief" size={20} /> Notices owed to the committees
      </h2>
      {acts.committed ? <ActReceipt committed={acts.committed} again="Back to the notices" onAgain={acts.dismiss} mapNote={null} /> : null}
      {!acts.committed && owed.length === 0 ? <p className="nation-note">You owe the committees no notice. A covert finding signed with notice withheld appears here until you tell them.</p> : null}
      {!acts.committed ? owed.map((notice) => <OwedNotice key={notice.id} campaign={campaign} notice={notice} acts={acts} />) : null}
      {acts.problem ? (
        <p className="nation-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </section>
  );
}
