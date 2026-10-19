import type { Campaign } from "@admin/engine";
import { floorSchedule, settledBills, type FloorGroup, type FloorRow } from "@admin/player-core";
import { Card, CardContent, Collection, Icon, Tag, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { valenceOf } from "../../shell/valence";
import { ProjectedTally } from "./Tally";

const STAGE_ICON: Readonly<Record<string, IconName>> = { desk: "sign", floor: "gavel", markup: "review", referral: "dossier" };

/** One bill as an aligned row: the bill and who wrote it, where it stands, then the projected count it faces. */
function BillRow({ row, group }: { readonly row: FloorRow; readonly group: FloorGroup["key"] }) {
  const desk = group === "desk";
  return (
    <li className="ui-row-target" data-valence={valenceOf(row.stance)}>
      <Card><CardContent className="bill-row pt-5">
      <div className="bill-row__who">
        <Door href={row.href} className="bill-row__title ui-row-link text-foreground no-underline hover:no-underline">
          {row.title}
        </Door>
        <span className="bill-row__meta">{row.sponsor}</span>
      </div>
      <div className="bill-row__where">
        <Tag tone={desk ? "caution" : "neutral"} icon={STAGE_ICON[group] ?? "dossier"}>
          {row.stageName}
        </Tag>
        <p className="bill-row__line">{row.line}</p>
      </div>
      <ProjectedTally counts={row.counts} against={desk} heading={desk ? "Public override assessment" : "Public support assessment"} />
    </CardContent></Card></li>
  );
}

function GroupList({ group }: { readonly group: FloorGroup }) {
  return (
    <div className="hill-section">
      <h3 className="hill-subtitle">
        {group.title} <span className="hill-count">({group.rows.length})</span>
      </h3>
      <ul className="bill-rows" aria-label={group.title}>
        {group.rows.map((row) => (
          <BillRow key={row.id} row={row} group={group.key} />
        ))}
      </ul>
    </div>
  );
}

/** Bills awaiting the President, shown above the tabs because they run on a signing deadline. */
export function Urgent({ campaign }: { readonly campaign: Campaign }) {
  const desk = floorSchedule(campaign).find((group) => group.key === "desk");
  return (
    <section className="hill-section hill-panel" aria-labelledby="congress-urgent">
      <h2 id="congress-urgent" className="hill-section__title">
        <Icon name="sign" size={20} /> Awaiting your decision
      </h2>
      {desk ? <GroupList group={desk} /> : <p className="hill-note">No bill is on your desk. Nothing awaits your signature or veto.</p>}
    </section>
  );
}

/** Bills on a chamber's floor, the stage where the next week decides them. */
export function FloorBills({ campaign }: { readonly campaign: Campaign }) {
  const group = floorSchedule(campaign).find((entry) => entry.key === "floor");
  return group ? <GroupList group={group} /> : <p className="hill-note">No bill is waiting on either floor this week.</p>;
}

/** Bills in conference, markup or committee, furthest along first. */
export function CommitteeBills({ campaign }: { readonly campaign: Campaign }) {
  const groups = floorSchedule(campaign).filter((entry) => entry.key === "conference" || entry.key === "markup" || entry.key === "referral");
  if (groups.length === 0) return <p className="hill-note">No bill is in conference, markup or committee.</p>;
  return (
    <>
      {groups.map((group) => (
        <GroupList key={group.key} group={group} />
      ))}
    </>
  );
}

const OUTCOME_TAG: Readonly<Record<string, { readonly tone: "good" | "risk" | "neutral"; readonly icon: IconName }>> = {
  Law: { tone: "good", icon: "statusIssued" },
  "Law without your signature": { tone: "good", icon: "statusIssued" },
  Vetoed: { tone: "risk", icon: "veto" },
  Died: { tone: "neutral", icon: "statusExpired" },
};

/** Every bill that left the chambers this term, newest first, each with the vote as recorded. */
export function SettledBills({ campaign }: { readonly campaign: Campaign }) {
  const settled = settledBills(campaign, Number.POSITIVE_INFINITY);
  return (
    <div className="hill-section">
      <h3 className="hill-subtitle">Settled bills</h3>
      <Collection
        items={settled}
        initial={8}
        noun="settled bills"
        className="bill-rows"
        empty="No bill has become law, been vetoed or died this term."
        render={(row) => {
          const tag = OUTCOME_TAG[row.stageName] ?? { tone: "neutral" as const, icon: "dossier" as const };
          return (
            <li key={row.id} className="ui-row-target">
              <Card><CardContent className="bill-row pt-5">
      <div className="bill-row__who">
                <Door href={row.href} className="bill-row__title ui-row-link text-foreground no-underline hover:no-underline">
                  {row.title}
                </Door>
                <span className="bill-row__meta">{row.sponsor}</span>
              </div>
              <div className="bill-row__where">
                <Tag tone={tag.tone} icon={tag.icon}>
                  {row.stageName}
                </Tag>
              </div>
              <p className="tally tally--recorded tally--inline">
                <Tag tone="identity" icon="statusIssued">
                  Recorded vote
                </Tag>
                <span>{row.counts.length === 0 ? "No vote was taken." : row.line}</span>
              </p>
            </CardContent></Card></li>
          );
        }}
      />
    </div>
  );
}
