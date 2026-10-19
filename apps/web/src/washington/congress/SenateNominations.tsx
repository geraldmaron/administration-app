import { committeeName, campaignDay, type Campaign } from "@admin/engine";
import { Card, CardContent, Icon, Tag } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { senateNominations, type SenateNomination } from "./senate-nominations";
import { countValence, ProjectedTally } from "./Tally";

function Row({ row }: { readonly row: SenateNomination }) {
  return (
    <li className="ui-row-target" data-valence={row.vote ? countValence({ chamber: "senate", name: "Senate", yeas: row.vote.yeas, required: row.vote.required, seats: row.vote.yeas + row.vote.nays, passed: row.vote.passed }) : "neutral"}>
      <Card><CardContent className="bill-row pt-5">
      <div className="bill-row__who">
        <Door href={row.personHref} className="bill-row__title ui-row-link text-foreground no-underline hover:no-underline">
          {row.name}
        </Door>
        <span className="bill-row__meta">{row.office}</span>
      </div>
      <div className="bill-row__where">
        <Tag tone={row.vote ? "action" : "neutral"} icon={row.vote ? "appoint" : "pending"}>
          {row.stage}
        </Tag>
        <p className="bill-row__line">
          {row.days} {row.days === 1 ? "day" : "days"} open.{row.committee ? ` Committee: ${committeeName(row.committee)}.` : ""}
          {row.controversies.length > 0 ? ` Raised: ${row.controversies.join("; ")}.` : ""}
        </p>
        {!row.vote ? <p className="bill-row__line">Not yet sent to the Senate; no confirmation vote is scheduled.</p> : null}
      </div>
      {row.vote ? (
        <ProjectedTally counts={[{ chamber: "senate", name: "Senate", yeas: row.vote.yeas, required: row.vote.required, seats: row.vote.yeas + row.vote.nays, passed: row.vote.passed }]} heading="Public confirmation assessment" />
      ) : null}
    </CardContent></Card></li>
  );
}

/** Nominations in the confirmation process: a name is not an appointment until the Senate has voted. */
export function SenateNominationsView({ campaign }: { readonly campaign: Campaign }) {
  const { before, preparing } = senateNominations(campaign, campaignDay(campaign));
  return (
    <section className="hill-section" aria-labelledby="congress-nominations">
      <h2 id="congress-nominations" className="hill-section__title">
        <Icon name="appoint" size={20} /> Nominations
      </h2>
      {before.length === 0 && preparing.length === 0 ? <p className="hill-note">No nomination is open. Every confirmed office is filled or waiting for a name.</p> : null}
      {before.length > 0 ? (
        <div className="hill-section">
          <h3 className="hill-subtitle">With the Senate ({before.length})</h3>
          <ul className="bill-rows" aria-label="Nominations with the Senate">
            {before.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </ul>
        </div>
      ) : null}
      {preparing.length > 0 ? (
        <div className="hill-section">
          <h3 className="hill-subtitle">In preparation, not yet sent ({preparing.length})</h3>
          <ul className="bill-rows" aria-label="Nominations in preparation">
            {preparing.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
