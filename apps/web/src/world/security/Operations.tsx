import { Card } from "@admin/ui-web";
import { AuthorityHelp } from "../../help/AuthorityHelp";
import { EvidencePanel } from "@admin/ui-web";
import type { CovertReading, OperationRow, OperationsTally } from "@admin/player-core";
import { Button, Collection, Icon } from "@admin/ui-web";
import { OperationsTable } from "./OperationsTable";
import { PanelHeading, NameLink } from "./parts";
import type { SecurityAct } from "./security-act";

type Open = (act: SecurityAct) => void;

/** What was done with no finding behind it, and the findings already closed: both stay on the record. */
function CovertRecord({ covert }: { readonly covert: CovertReading }) {
  return (
    <>
      {covert.unfounded.length > 0 ? (
        <div className="sec-record" data-tone="bad">
          <h3 className="sec__subheading">Done with no finding</h3>
          <Collection
            items={covert.unfounded}
            initial={6}
            noun="acts"
            className="sec-record__list"
            render={(action) => (
              <li key={action.id}>
                <strong>{action.targetName}</strong>: {action.description}
              </li>
            )}
          />
          <p className="sec__note">These stay on the record. The committees eventually ask about them.</p>
        </div>
      ) : null}
      {covert.closed.length > 0 ? (
        <EvidencePanel title="Closed covert findings" label={`${covert.closed.length} closed findings`}>
          <Collection
            items={covert.closed}
            initial={6}
            noun="closed findings"
            className="sec-record__list"
            render={(row) => (
              <li key={row.id} className="ui-row-target">
                <strong>
                  <NameLink href={`/world/nation/${row.target}`}>{row.targetName}</NameLink>
                </strong>
                : {row.objective} <span className="sec__note">Signed {row.signed}; {row.activities} {row.activities === 1 ? "act" : "acts"} taken under it.</span>
              </li>
            )}
          />
        </EvidencePanel>
      ) : null}
    </>
  );
}

/** Covert findings and commitments abroad as one operations picture: a table to sort and page, the week's bill, and the way to sign another finding. */
export function Operations({ rows, tally, covert, onOpen }: { readonly rows: readonly OperationRow[]; readonly tally: OperationsTally; readonly covert: CovertReading; readonly onOpen: Open }) {
  const owed = rows.filter((row) => row.kind === "covert" && row.flag).length;
  return (
    <Card role="region" className="sec-panel" aria-labelledby="security-operations">
      <PanelHeading id="security-operations" icon="summit">
        Operations
      </PanelHeading>
      <p className="sec__lead">
        {tally.total === 0 ? "No operation is open." : `${tally.total} open. ${tally.weeklyBill === "No money paid out weekly" ? "None of them is paid in money." : `The money-paid commitments cost ${tally.weeklyBill} in all.`}`}
        {owed > 0 ? ` The committees are still owed your statement of reasons on ${owed} ${owed === 1 ? "finding" : "findings"}; the oversight screen takes it.` : ""}
      </p>
      <AuthorityHelp topic="intelligence-findings" compact />
      <OperationsTable rows={rows} onOpen={onOpen} />
      <div>
        <Button kind="secondary" size="sm" icon={<Icon name="instrumentCovert" size={16} />} onClick={() => onOpen({ kind: "sign-finding" })}>
          Sign a finding
        </Button>
      </div>
      <CovertRecord covert={covert} />
    </Card>
  );
}
