import { OFFSHORE_REVIEW_OBLIGATION_USD_MILLIONS, activeDefensePriorityContractId, activeExternalEmergency, availableOffshoreLeaseActions, buyFederalCleanPower, declareArmedForcesEmergency, declareExternalEmergency, declareStaffordDisaster, eligibleExternalThreats, executiveOrder, findingForThreat, isTradeMeasureEffective, leasePlanningArea, offshoreLeaseSaleAction, rescindOrder, selectActiveConflicts, selectOffshoreLeaseSale, staffordRequestsAwaitingDeclaration, type Campaign, type OrderSubject } from "@admin/engine";
import { formatDate, formatRatio, orderSignatures } from "@admin/player-core";
import { Pane, Button, Column, Text } from "@admin/ui";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct, type NationAct } from "../act";
import { Cites } from "../Law";

function Outcome({ act }: { readonly act: NationAct }) {
  return (
    <>
      {act.layer}
      <ActProblem problem={act.problem} />
      {act.done ? <ActDone done={act.done} onBack={act.dismiss} backLabel="Back to the order" /> : null}
    </>
  );
}

/** Rescission ends an order's future operation; what it already spent and any pending case stay on the record. */
export function Rescind({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const act = useNationAct(campaign);
  const active = campaign.orders.filter((record) => record.order === id && record.rescindedTurn === undefined && record.review?.status !== "struck-down");
  if (active.length === 0 && !act.done) return null;
  const signatures = orderSignatures(campaign, id);
  return (
    <Pane title="Cancel this order" icon="archive" line="Canceling (rescinding) an order stops it from here on. Money already spent and any open court case stay on the record.">
      {active.map((record) => {
        const signature = signatures.find((entry) => entry.id === record.id);
        return (
          <Button key={record.id} kind="secondary" size="compact" icon="reject" disabled={act.busy} onPress={() => void act.run(() => {
            const result = rescindOrder(campaign, record.id);
            if (!result.ok) throw new Error(result.reason);
            return { packet: result.packet, title: "Order canceled" };
          }, { tier: "full", title: "Cancel this order", lines: [{ label: "Order", value: executiveOrder(record.order)?.name ?? record.order }], verb: "Confirm and cancel", danger: true })}>
            {`Cancel the order${signature?.signed ? ` signed ${formatDate(signature.signed)}` : ""}`}
          </Button>
        );
      })}
      <Outcome act={act} />
    </Pane>
  );
}

/** Completed reviews of agency rules, and the separate act that repeals a rule the review faulted. */
export function ReviewFindings({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const act = useNationAct(campaign);
  const findings = id === "order-regulatory-review" ? campaign.pendingRules.filter((rule) => rule.order === id && rule.reviewFinding) : [];
  if (findings.length === 0) return null;
  return (
    <Pane title="What the review found" icon="review">
      {findings.map((rule) => {
        const finding = rule.reviewFinding!;
        const target = campaign.orders.find((record) => record.id === finding.targetRuleId);
        const operative = target && target.rescindedTurn === undefined && target.review?.status !== "struck-down" && campaign.pendingRules.some((entry) => entry.id === target.id && entry.status === "in-effect");
        const outcome = finding.disposition === "retain" ? "The review found no problem with how the rule was made." : finding.disposition === "recommend-revision" ? "The review found a problem with how the rule was made and suggests changing it." : "The rule ended before the review finished.";
        const name = target ? (executiveOrder(target.order)?.name ?? target.order) : finding.targetRuleId;
        return (
          <Column key={rule.id} gap="xs">
            <Text variant="body"><Text weight="strong">{name}</Text>: {outcome} The review by itself didn't end the rule.</Text>
            {operative && target ? (
              <Button kind="secondary" size="compact" icon="reject" disabled={act.busy} onPress={() => void act.run(() => {
                const result = rescindOrder(campaign, target.id);
                if (!result.ok) throw new Error(result.reason);
                return { packet: result.packet, title: "Rule canceled" };
              }, { tier: "full", title: "Cancel the rule", lines: [{ label: "Rule", value: name }], verb: "Confirm and cancel", danger: true })}>
                Cancel the rule
              </Button>
            ) : null}
          </Column>
        );
      })}
      <Outcome act={act} />
    </Pane>
  );
}

const SALE_WORDS = { "initiate-sale": ["Start the lease sale review", "Lease sale review started", "Start the lease sale review"], "accept-bid": ["Accept the qualified bid", "Qualified bid accepted", "Accept the qualified bid"], "decline-bid": ["Turn down the bid", "Bid turned down", "Turn down the bid"] } as const;

/** Each planned offshore area's sale and permit record, and the steps open on it. */
export function OffshoreSales({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const act = useNationAct(campaign);
  const areas = id === "order-energy-leasing" ? [...new Set(campaign.orders.flatMap((record) => (record.order === id && record.subject?.kind === "lease-planning" ? [record.subject.areaId] : [])))] : [];
  if (areas.length === 0) return null;
  return (
    <Pane title="Lease sales and drilling permits" icon="sectorEnergyOil">
      <Cites cites={["43 U.S.C. §1344"]} />
      {areas.map((areaId) => {
        const sale = selectOffshoreLeaseSale(campaign, areaId);
        const actions = availableOffshoreLeaseActions(campaign, areaId);
        return (
          <Column key={areaId} gap="xs">
            <Text variant="body"><Text weight="strong">{leasePlanningArea(areaId)?.name ?? areaId}</Text>: {sale ? `${sale.stage.replaceAll("-", " ")}. Exploring: ${sale.exploration?.status.replaceAll("-", " ") ?? "no permit"}.` : "Only planning so far. No sale or permit yet."}</Text>
            {!sale ? <Text variant="caption" tone="secondary">Starting the sale review sets aside ${OFFSHORE_REVIEW_OBLIGATION_USD_MILLIONS} million of your budget authority, the money you can spend. The review doesn't promise a qualified bid or a permit.</Text> : (
              <Column gap="2xs">
                <Text variant="caption">{sale.tract.name}: ${sale.reviewObligationUsdMillions} million set aside for the review. The lowest bid the government will accept is ${sale.modeledFairValueUsdMillions} million.</Text>
                {sale.bids.map((bid) => <Text key={bid.id} variant="caption">{bid.bidder}: ${bid.amountUsdMillions} million, {bid.qualified ? (bid.amountUsdMillions >= sale.modeledFairValueUsdMillions ? "qualified and at or above the minimum" : "qualified but below the minimum") : "not qualified"}.</Text>)}
                {sale.stage === "decision" ? <Text variant="caption">Accepting gives the lease to the highest qualified bid at or above the minimum. Exploring still needs its own plan and review.</Text> : null}
                {sale.bonusReceipt ? <Text variant="caption">Up-front lease payment: ${sale.bonusReceipt.amountUsdMillions} million {sale.bonusReceipt.receivedTurn === undefined ? "owed to the federal government" : "paid to the federal government"}. This money doesn't add to what you can spend.</Text> : null}
                {(sale.pausedWeeks ?? 0) > 0 ? <Text variant="caption">The review has lost {sale.pausedWeeks} weeks because staff weren't available or a court paused it.</Text> : null}
                {sale.reason ? <Text variant="caption">{sale.reason}</Text> : null}
                {sale.exploration?.reason ? <Text variant="caption">{sale.exploration.reason}</Text> : null}
              </Column>
            )}
            {actions.map((action) => (
              <Button key={action} kind="secondary" size="compact" disabled={act.busy} onPress={() => void act.run(() => {
                const result = offshoreLeaseSaleAction(campaign, areaId, action);
                if (!result.ok) throw new Error(result.reason);
                return { packet: result.packet, title: SALE_WORDS[action][1] };
              }, { tier: "confirm", title: SALE_WORDS[action][2] })}>
                {SALE_WORDS[action][0]}
              </Button>
            ))}
          </Column>
        );
      })}
      <Outcome act={act} />
    </Pane>
  );
}

/** Blocked foreign-government property and whether the dealings restriction tied to it still operates. */
export function BlockedAssets({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  if (id !== "order-asset-seizure" || (campaign.blockedAssets?.length ?? 0) === 0) return null;
  return (
    <Pane title="Blocked property" icon="locked">
      <Cites cites={["50 U.S.C. §§1701–1708"]} />
      {campaign.blockedAssets?.map((asset) => (
        <Text key={asset.id} variant="body">
          {campaign.nations[asset.owner]?.base.identity.name ?? asset.owner}: a government account held in the United States, now {asset.status}.
          {asset.status !== "blocked" ? " The ban on doing business with it has been lifted." : isTradeMeasureEffective(campaign, asset.tradeMeasureId) ? " Doing business with it is banned right now." : " The account is still listed as blocked, but the ban on doing business with it isn't in effect right now."}
        </Text>
      ))}
    </Pane>
  );
}

/** The Defense Production Act priority contract and how much of it has been delivered. */
export function DefenseContract({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  if (id !== "order-defense-production" || !campaign.orders.some((record) => record.defenseContract)) return null;
  const today = campaign.calendar.year * 10000 + campaign.calendar.month * 100 + campaign.calendar.day;
  return (
    <Pane title="Contract moved to the front of the line" icon="sectorDefenseIndustrial">
      {campaign.orders.filter((record) => record.defenseContract).map((record) => {
        const contract = record.defenseContract!;
        const outstanding = campaign.munitions?.us[contract.munitionClass]?.onOrder.find((order) => order.priorityContractId === record.id)?.count ?? 0;
        const filled = Math.max(0, contract.initialIndex - outstanding);
        const progress = contract.initialIndex > 0 ? `${formatRatio(filled / contract.initialIndex)} of the restocking order delivered, with ${formatRatio(outstanding / contract.initialIndex)} still to come` : "We don't know how much has been delivered";
        const delayed = outstanding > 0 && today > contract.due.year * 10000 + contract.due.month * 100 + contract.due.day;
        const priority = outstanding <= 0 ? "Everything ordered has been delivered." : record.rescindedTurn !== undefined || record.remedyApplied || record.review?.status === "struck-down" ? "The contract no longer goes first, but some of the order still hasn't arrived." : activeDefensePriorityContractId(campaign) === record.id ? "The contract goes first as long as the legal power holds and the factory has room." : "The contract isn't going first right now, and some of the order still hasn't arrived.";
        return <Text key={record.id} variant="body"><Text weight="strong">{contract.supplier}</Text>: {contract.munitionClass.replaceAll("-", " ")} moved to the front of an existing federal restocking order. {progress}{delayed ? ", and it's running late" : ""}. Due date: {formatDate(contract.due)}. {priority}</Text>;
      })}
    </Pane>
  );
}

/** The federal clean-power purchase: what has been delivered and paid, or the award still to make. */
export function CleanPower({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const act = useNationAct(campaign);
  if (id !== "order-clean-energy" || !campaign.orders.some((record) => record.order === id)) return null;
  const purchases = campaign.cleanPowerPurchases ?? [];
  return (
    <Pane title="Clean power for federal buildings" icon="sectorEnergyRenewables">
      {purchases.map((purchase) => (
        <Text key={purchase.id} variant="body">Federal buildings: {purchase.status}, {purchase.deliveredMwh.toLocaleString("en-US")} of {purchase.quantityMwh.toLocaleString("en-US")} MWh delivered. ${purchase.amountUsdMillions} million set aside, and ${(purchase.paidUsdMillions ?? 0).toFixed(2)} million paid to suppliers so far from the regular yearly budget. {(purchase.paymentTrackingStartMwh === undefined && purchase.deliveredMwh > 0) || (purchase.paymentTrackingStartMwh ?? 0) > 0 ? "We don't know about payments made before tracking began. " : ""}The payments shown are a running total, kept separate from the yearly spending figure.</Text>
      ))}
      {purchases.some((purchase) => purchase.status === "contracted") ? <Text variant="caption" tone="secondary">How much arrives each week depends on how much renewable power is available. A short week delays the next delivery. Ending the order doesn't cancel the contract.</Text> : null}
      {purchases.length === 0 ? (
        <Column gap="xs">
          <Text variant="body">The contract would deliver 700,000 megawatt-hours (MWh) of power to federal buildings over 2 years. It depends on renewable supply and on $94 million that Congress approves for it.</Text>
          <Button kind="secondary" size="compact" disabled={act.busy} onPress={() => void act.run(() => {
            const result = buyFederalCleanPower(campaign);
            if (!result.ok) throw new Error(result.reason);
            return { packet: result.packet, title: "Clean-power contract awarded" };
          }, { tier: "confirm", title: "Award the clean-power purchase", lines: [{ label: "Contract", value: "700,000 MWh delivered over 2 years, subject to $94 million approved by Congress" }], verb: "Confirm the award" })}>
            Award clean-power purchase
          </Button>
        </Column>
      ) : null}
      <Outcome act={act} />
    </Pane>
  );
}

/** The declarations some orders need first: a foreign-threat emergency, a Stafford major disaster, an armed-forces emergency. */
export function Declarations({ campaign, id, subject }: { readonly campaign: Campaign; readonly id: string; readonly subject: OrderSubject | undefined }) {
  const act = useNationAct(campaign);
  const requests = id === "order-relief-program" ? staffordRequestsAwaitingDeclaration(campaign) : [];
  const pursuit = id === "order-asset-seizure" && subject?.kind === "foreign" && !activeExternalEmergency(campaign, subject.nation) ? eligibleExternalThreats(campaign).find((entry) => entry.actor === subject.nation) : undefined;
  const conflict = id === "order-emergency-construction" ? selectActiveConflicts(campaign).find((entry) => entry.aggressor === campaign.founding.nation || entry.defender === campaign.founding.nation) : undefined;
  const armed = conflict && !Object.values(campaign.emergencies).some((record) => record.armedForcesConflictId === conflict.id && record.endedTurn === undefined) ? conflict : undefined;
  if (requests.length === 0 && !pursuit && !armed && !act.done) return null;
  return (
    <Pane title="Declarations this order needs first" icon="order">
      {pursuit ? (
        <Column gap="xs">
          <Cites cites={["50 U.S.C. §§1601–1651", "50 U.S.C. §§1701–1708"]} />
          <Button kind="danger" size="compact" disabled={act.busy} onPress={() => void act.run(() => {
            const finding = findingForThreat(pursuit);
            if (!finding) throw new Error("Nothing so far gives you the legal grounds for this finding.");
            const result = declareExternalEmergency(campaign, pursuit.id, finding);
            if (!result.ok) throw new Error(result.reason);
            return { packet: result.packet, title: "Foreign-threat emergency declared" };
          }, { tier: "full", title: "Declare a national emergency over this threat", verb: "Confirm and declare", danger: true })}>
            Declare a national emergency over this threat
          </Button>
        </Column>
      ) : null}
      {requests.length > 0 ? (
        <Column gap="xs">
          <Text variant="label">Governors waiting on a major-disaster declaration</Text>
          <Cites cites={["42 U.S.C. §5170"]} />
          {requests.map((state) => {
            const name = campaign.states[state]?.base.name ?? state;
            return (
              <Button key={state} kind="secondary" size="compact" disabled={act.busy} onPress={() => void act.run(() => {
                const result = declareStaffordDisaster(campaign, state);
                if (!result.ok) throw new Error(result.reason);
                return { packet: result.packet, title: `Major disaster declared in ${name}` };
              }, { tier: "full", title: `Declare a major disaster in ${name}`, verb: "Confirm and declare" })}>
                {`Declare major disaster in ${name}`}
              </Button>
            );
          })}
        </Column>
      ) : null}
      {armed ? (
        <Column gap="xs">
          <Cites cites={["10 U.S.C. §2808", "50 U.S.C. §§1601–1651"]} />
          <Button kind="danger" size="compact" disabled={act.busy} onPress={() => void act.run(() => {
            const result = declareArmedForcesEmergency(campaign, armed.id);
            if (!result.ok) throw new Error(result.reason);
            return { packet: result.packet, title: "Armed-forces emergency declared" };
          }, { tier: "full", title: "Declare a national emergency requiring the armed forces", verb: "Confirm and declare", danger: true })}>
            Declare a national emergency requiring the armed forces
          </Button>
        </Column>
      ) : null}
      <Outcome act={act} />
    </Pane>
  );
}
