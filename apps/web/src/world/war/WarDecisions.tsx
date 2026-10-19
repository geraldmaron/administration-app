import { Card } from "@admin/ui-web";
import type { Campaign } from "@admin/engine";
import type { WarScreenReading } from "@admin/player-core";
import { Icon } from "@admin/ui-web";
import { useNationCommit } from "../set/SetAct";
import { AuthorizationAct, CompactActs, EndAct, JoinAct } from "./WarActs";

export function WarDecisions({ campaign, reading, acts }: { readonly campaign: Campaign; readonly reading: WarScreenReading; readonly acts: ReturnType<typeof useNationCommit> }) {
  if (reading.over) return null;
  return (
    <>
      {reading.usRole === "outside" ? (
        <Card role="region" className="set-section war-decision-panel" aria-labelledby="war-join">
          <h2 id="war-join" className="set-section__title">
            <Icon name="summit" size={20} /> Enter the war
          </h2>
          <JoinAct campaign={campaign} reading={reading} acts={acts} />
        </Card>
      ) : null}
      {reading.usRole === "outside" && reading.authorizations.length > 0 ? (
        <Card role="region" className="set-section war-decision-panel" aria-labelledby="war-aumf">
          <h2 id="war-aumf" className="set-section__title">
            <Icon name="gavel" size={20} /> Congress and the authority to fight
          </h2>
          {reading.authorizations.map((authorization) =>
            authorization.state === "open" ? (
              <AuthorizationAct key={authorization.nation} campaign={campaign} authorization={authorization} acts={acts} />
            ) : (
              <p key={authorization.nation} className="set-note">
                {authorization.state === "covered" ? `${authorization.title ?? "An authorization"} covers force against ${authorization.name}.` : `An authorization against ${authorization.name} is before Congress. Continue brings the vote.`}
              </p>
            ),
          )}
        </Card>
      ) : null}
      {reading.usRole !== "outside" ? (
        <Card role="region" className="set-section war-decision-panel" aria-labelledby="war-end">
          <h2 id="war-end" className="set-section__title">
            <Icon name="summit" size={20} /> Ending it
          </h2>
          {reading.peace ? (
            <p className="set-lede">
              {reading.peace.offered ? `Terms are on the table with ${reading.peace.counterpart}. ` : ""}
              {reading.peace.reasoning}
            </p>
          ) : null}
          <EndAct campaign={campaign} reading={reading} acts={acts} />
        </Card>
      ) : null}
      {reading.compacts.length > 0 ? (
        <Card role="region" className="set-section war-decision-panel" aria-labelledby="war-compact">
          <h2 id="war-compact" className="set-section__title">
            <Icon name="shield" size={20} /> Call the allies
          </h2>
          {reading.compacts.map((compact) =>
            compact.called ? (
              <p key={compact.org} className="set-note">
                The {compact.name} has been called on in this war. Each member answers in the war&apos;s next week.
              </p>
            ) : (
              <CompactActs key={compact.org} campaign={campaign} reading={reading} compact={compact} acts={acts} />
            ),
          )}
        </Card>
      ) : null}
    </>
  );
}

