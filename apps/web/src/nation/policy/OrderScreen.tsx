import { useMemo, useState } from "react";
import { OFFSHORE_REVIEW_OBLIGATION_USD_MILLIONS, activeDefensePriorityContractId, activeExternalEmergency, availableOffshoreLeaseActions, buyFederalCleanPower, constructionOrderSubjects, createRngStreams, declareArmedForcesEmergency, declareExternalEmergency, declareStaffordDisaster, eligibleExternalThreats, energyLeasingOrderSubjects, entryClassOrderSubjects, executiveOrder, federalSiteOrderSubjects, findingForThreat, grantOrderSubjects, isTradeMeasureEffective, leasePlanningArea, likelihoodFromUnitInterval, offshoreLeaseSaleAction, regulatoryReviewOrderSubjects, reliefOrderSubjects, rescindOrder, selectActiveConflicts, selectOffshoreLeaseSale, signOrder, staffordRequestsAwaitingDeclaration, type Campaign, type OrderSubject } from "@admin/engine";
import { FEDERAL_SITES } from "@admin/world";
import { ORDER_SIGN, charterOf, formatDate, formatRatio, orderCamera, orderDesk, orderReview, orderSignatures, place, type OrderDesk, type PipelineRow } from "@admin/player-core";
import { Collection, EmptyState, Gauge, Icon, Tag, buttonClass, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import { useChoiceProjection } from "../../modeling/ChoiceProjection";
import { ActDone } from "./ActDone";
import { ReachBars } from "../electorate/ReachBars";
import { ChoiceCompare } from "./ChoiceCompare";
import { OrderRecord } from "./OrderRecord";
import { OrderDocument } from "./OrderDocument";
import { orderTerms, riskTable, type OrderTerms } from "./order-terms";
import { useAct, type ActHandle } from "./use-act";
import "../electorate/electorate.css";
import "./policy.css";

/** The critical terms, in the order the President weighs them. */
function TermsList({ terms }: { readonly terms: OrderTerms }) {
  const rows: readonly (readonly [string, string, IconName])[] = [
    ["Scope", terms.scope, "mapPin"],
    ["Cost now", terms.costNow, "budget"],
    ["Recurring cost", terms.recurring, "domesticLedger"],
    ["Responsible department", terms.department, "building"],
    ["Effective timing", terms.timing, "schedule"],
    ["Authority as modeled", terms.authority ? `${terms.authority.name}, ${terms.authority.cite}` : "None: it cannot be signed", "law"],
  ];
  return (
    <dl className="order-terms">
      {rows.map(([label, value, icon]) => (
        <div key={label} className="order-terms__row">
          <dt>
            <Icon name={icon} size={18} />
            {label}
          </dt>
          <dd>{value}</dd>
        </div>
      ))}
      {terms.changes.length > 0 ? (
        <div className="order-terms__row">
          <dt>
            <Icon name="graph" size={18} />
            What it changes
          </dt>
          <dd>
            <ul className="order-terms__list">
              {terms.changes.map((line) => (
                <li key={line.label}>
                  {line.label} <span className="choice-cell" data-tone={line.tone}>{line.text}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function PriorSignatures({ rows }: { readonly rows: readonly PipelineRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="order-rail__block" aria-labelledby="order-prior">
      <h2 id="order-prior" className="order-rail__title">
        Earlier signatures
      </h2>
      <Collection
        items={rows}
        initial={3}
        noun="signatures"
        className="order-board__rows"
        render={(row) => (
          <li key={row.id} className="order-board__row ui-valence-bar" data-stage={row.stage} data-valence="good">
            <span className="order-board__line">
              {row.signed ? `Signed ${formatDate(row.signed)}. ` : ""}
              {row.line}
            </span>
          </li>
        )}
      />
    </section>
  );
}

function Authorization({ campaign, desk, subject, acts, onSign }: { readonly campaign: Campaign; readonly desk: OrderDesk; readonly subject?: OrderSubject; readonly acts: ActHandle; readonly onSign: () => void }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const projection = useChoiceProjection(campaign, { kind: "order", id: desk.order.id }, subject ? undefined : selected);
  const sign = () => {
    onSign();
    void acts.run(() => {
      const result = signOrder(campaign, charterOf(campaign), desk.order.id, createRngStreams(campaign.seed), subject);
      if (!result.ok) throw new Error(result.reason);
      const ruling = result.record.review ? result.record.review.dueTurn - campaign.turn : 0;
      const lines = [{ label: "Challenged in court", value: result.contested ? `Yes: review is scheduled to begin in ${ruling} weeks` : "No" }];
      return { packet: result.packet, title: `Signed: ${desk.order.name}`, camera: orderCamera(desk), lines };
    }, { tier: "full", title: `Sign ${desk.order.name}`, verb: "Confirm and sign" });
  };
  return (
    <section className="order-rail__block" aria-label="Authorization">
      <ChoiceCompare
        title="Authorization"
        table={riskTable(desk)}
        selected={selected}
        onSelect={setSelected}
        verb="Sign the order"
        onAuthorize={sign}
        review={selected === ORDER_SIGN ? orderReview(desk) : undefined}
        busy={acts.busy}
        docked
        {...(projection && !subject ? { projection } : {})}
      />
      {acts.problem ? (
        <p className="act-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </section>
  );
}

/**
 * One executive order: the paper in the main column, and beside it the
 * status, the critical terms and the authorization. A draft is a draft until
 * the signature; after it the page shows the terms that were signed, the draft
 * controls are gone, and the receipt stays in context.
 */
export function OrderScreen({ campaign, id, recordId, onCloseRecord = () => undefined }: { readonly campaign: Campaign; readonly id: string; readonly recordId?: string | undefined; readonly onCloseRecord?: () => void }) {
  const reliefSubjects = useMemo(() => id === "order-relief-program" ? reliefOrderSubjects(campaign) : [], [campaign, id]);
  const disasterRequests = useMemo(() => id === "order-relief-program" ? staffordRequestsAwaitingDeclaration(campaign) : [], [campaign, id]);
  const grantSubjects = useMemo(() => id === "order-grant-conditions" ? grantOrderSubjects(campaign) : [], [campaign, id]);
  const reviewSubjects = useMemo(() => id === "order-regulatory-review" ? regulatoryReviewOrderSubjects(campaign) : [], [campaign, id]);
  const leaseSubjects = useMemo(() => id === "order-energy-leasing" ? energyLeasingOrderSubjects(campaign) : [], [campaign, id]);
  const siteSubjects = useMemo(() => id === "order-force-protection" ? federalSiteOrderSubjects(campaign) : [], [campaign, id]);
  const entrySubjects = useMemo(() => id === "order-entry-suspension" ? entryClassOrderSubjects(campaign) : [], [campaign, id]);
  const constructionSubjects = useMemo(() => id === "order-emergency-construction" ? constructionOrderSubjects(campaign) : [], [campaign, id]);
  const foreignThreats = useMemo(() => id === "order-asset-seizure" ? eligibleExternalThreats(campaign) : [], [campaign, id]);
  const foreignTargets = useMemo(() => id === "order-asset-seizure"
    ? [...new Set([...foreignThreats.map((pursuit) => pursuit.actor), ...Object.values(campaign.externalEmergencies ?? {}).filter((record) => record.endedTurn === undefined && campaign.turn < record.expiresTurn).map((record) => record.target)])]
    : [], [campaign, foreignThreats, id]);
  const [subjectKey, setSubjectKey] = useState("");
  const selectedSubject: OrderSubject | undefined = id === "order-relief-program"
    ? reliefSubjects.find((entry) => `${entry.state}:${entry.cause}:${entry.declarationId}:${entry.billId}` === subjectKey) ?? reliefSubjects[0]
    : id === "order-grant-conditions"
      ? grantSubjects.find((entry) => entry.billId === subjectKey) ?? grantSubjects[0]
    : id === "order-regulatory-review"
      ? reviewSubjects.find((entry) => entry.ruleId === subjectKey) ?? reviewSubjects[0]
    : id === "order-energy-leasing"
      ? leaseSubjects.find((entry) => entry.areaId === subjectKey) ?? leaseSubjects[0]
    : id === "order-force-protection"
      ? siteSubjects.find((entry) => entry.institutionId === subjectKey) ?? siteSubjects[0]
    : id === "order-entry-suspension"
      ? entrySubjects.find((entry) => entry.nation === subjectKey) ?? entrySubjects[0]
    : id === "order-border-controls"
      ? { kind: "ports-of-entry", scope: "all-federal-ports" }
    : id === "order-asset-seizure"
      ? (() => { const nation = foreignTargets.find((target) => target === subjectKey) ?? foreignTargets[0]; return nation ? { kind: "foreign" as const, nation } : undefined; })()
      : id === "order-emergency-construction"
        ? constructionSubjects.find((entry) => `${entry.sourceId}:${entry.declarationId}` === subjectKey) ?? constructionSubjects[0]
      : undefined;
  const desk = useMemo(() => orderDesk(campaign, charterOf(campaign), id, selectedSubject), [campaign, id, selectedSubject]);
  const acts = useAct(campaign);
  const declarationActs = useAct(campaign);
  const armedActs = useAct(campaign);
  const withdrawalActs = useAct(campaign);
  const followupActs = useAct(campaign);
  const armedConflict = id === "order-emergency-construction" ? selectActiveConflicts(campaign).find((conflict) =>
    conflict.aggressor === campaign.founding.nation || conflict.defender === campaign.founding.nation) : undefined;
  const [committed, setCommitted] = useState<OrderTerms | undefined>();
  const terms = useMemo(() => (desk ? orderTerms(campaign, desk) : undefined), [campaign, desk]);
  if (!desk || !terms) {
    return (
      <Screen title="No such order" eyebrow="Executive order" screenClass="workspace" camera="us">
        <EmptyState icon="emptyRecord" title="This order is not on file">
          <Door href={place.policy()}>Back to policy</Door>
        </EmptyState>
      </Screen>
    );
  }
  const signatures = orderSignatures(campaign, id);
  const activeRecords = campaign.orders.filter((record) => record.order === id
    && record.rescindedTurn === undefined && record.review?.status !== "struck-down");
  const reviewFindings = id === "order-regulatory-review" ? campaign.pendingRules.filter((rule) =>
    rule.order === id && rule.reviewFinding) : [];
  const plannedAreas = id === "order-energy-leasing" ? [...new Set(campaign.orders.filter((record) =>
    record.order === id && record.subject?.kind === "lease-planning").map((record) =>
    record.subject?.kind === "lease-planning" ? record.subject.areaId : ""))].filter(Boolean) : [];
  const done = acts.done;
  const shown = done && committed ? committed : terms;
  const latest = signatures[0];
  return (
    <Screen icon="order" title={desk.order.name} eyebrow="Policy · Executive order" screenClass="workspace" camera="us">
      <OrderRecord campaign={campaign} order={id} recordId={recordId} onClose={onCloseRecord} />
      <div className="order-layout">
        <aside className="order-rail" aria-label="Status and terms">
          <section className="order-rail__block" aria-labelledby="order-status">
            <h2 id="order-status" className="order-rail__title">
              Status
            </h2>
            <p>
              <Tag tone={done ? "good" : "caution"}>{done ? "Signed" : "Draft"}</Tag>{" "}
              {done ? (latest ? latest.line : "On your Record.") : desk.available ? "Ready for your signature." : `Cannot be signed: it needs ${desk.missing ?? "authority it lacks"}.`}
            </p>
            {done ? null : (
              <Gauge
                shape="meter"
                tone={desk.projection.challengeChance < 0.25 ? "good" : desk.projection.challengeChance < 0.5 ? "watch" : "bad"}
                label="Chance it is challenged in court"
                value={desk.projection.challengeChance}
                valueText={formatRatio(desk.projection.challengeChance)}
                caption={`Assessment: ${likelihoodFromUnitInterval(desk.projection.challengeChance).toLowerCase()}. ${desk.projection.reasoning}`}
              />
            )}
          </section>
          <section className="order-rail__block" aria-labelledby="order-terms">
            <h2 id="order-terms" className="order-rail__title">
              {done ? "Terms signed" : "Critical terms"}
            </h2>
            <TermsList terms={shown} />
          </section>
          {activeRecords.length > 0 ? (
            <section className="order-rail__block" aria-label="Rescind signed order">
              <h2 className="order-rail__title">End future operation</h2>
              <p>Rescission ends future operation. Money already spent and any pending court case stay on the record.</p>
              {activeRecords.map((record) => {
                const signature = signatures.find((entry) => entry.id === record.id);
                return <button key={record.id} className={buttonClass("secondary", "sm")}
                  disabled={withdrawalActs.busy} onClick={() => {
                    void withdrawalActs.run(() => {
                      const result = rescindOrder(campaign, record.id);
                      if (!result.ok) throw new Error(result.reason);
                      return { packet: result.packet, title: "Order rescinded", camera: "us" };
                    }, { tier: "full", title: "Rescind this order", lines: [{ label: "Order", value: executiveOrder(record.order)?.name ?? record.order }], verb: "Confirm and rescind", danger: true });
                  }}>Rescind order{signature?.signed ? ` signed ${formatDate(signature.signed)}` : ""}</button>;
              })}
              {withdrawalActs.problem ? <p className="act-problem" role="alert">{withdrawalActs.problem}</p> : null}
              {withdrawalActs.done ? <ActDone done={withdrawalActs.done} mapNote={null} /> : null}
            </section>
          ) : null}
          {reviewFindings.length > 0 ? (
            <section className="order-rail__block" aria-label="Completed rule reviews">
              <h2 className="order-rail__title">Review findings</h2>
              {reviewFindings.map((rule) => {
                const finding = rule.reviewFinding!;
                const target = campaign.orders.find((record) => record.id === finding.targetRuleId);
                const operative = target && target.rescindedTurn === undefined && target.review?.status !== "struck-down"
                  && campaign.pendingRules.some((entry) => entry.id === target.id && entry.status === "in-effect");
                const outcome = finding.disposition === "retain" ? "Review found no recorded procedural defect."
                  : finding.disposition === "recommend-revision" ? "Review recommends revision for a recorded procedural defect."
                    : "The target rule ended before review concluded.";
                return <div key={rule.id}>
                  <p><strong>{target ? executiveOrder(target.order)?.name ?? target.order : finding.targetRuleId}</strong>: {outcome} Review alone did not repeal the rule.</p>
                  {operative && target ? <button className={buttonClass("secondary", "sm")} disabled={withdrawalActs.busy} onClick={() => {
                    void withdrawalActs.run(() => {
                      const result = rescindOrder(campaign, target.id);
                      if (!result.ok) throw new Error(result.reason);
                      return { packet: result.packet, title: "Target rule rescinded", camera: "us" };
                    }, { tier: "full", title: "Rescind the target rule", lines: [{ label: "Rule", value: executiveOrder(target.order)?.name ?? target.order }], verb: "Confirm and rescind", danger: true });
                  }}>Rescind the target rule</button> : null}
                </div>;
              })}
            </section>
          ) : null}
          {plannedAreas.length > 0 ? (
            <section className="order-rail__block" aria-label="Offshore sale follow-up">
              <h2 className="order-rail__title">Sale and permit record</h2>
              {plannedAreas.map((areaId) => {
                const sale = selectOffshoreLeaseSale(campaign, areaId);
                const actions = availableOffshoreLeaseActions(campaign, areaId);
                return <div key={areaId}>
                  <p><strong>{leasePlanningArea(areaId)?.name ?? areaId}</strong>: {sale ? `${sale.stage.replaceAll("-", " ")}. Exploration: ${sale.exploration?.status.replaceAll("-", " ") ?? "no permit"}.` : "Planning only; no sale or permit."}</p>
                  {!sale ? <p>Beginning sale review obligates ${OFFSHORE_REVIEW_OBLIGATION_USD_MILLIONS} million from available appropriated authority. Review does not guarantee a qualified bid or a permit.</p> : <>
                    <p>{sale.tract.name}: ${sale.reviewObligationUsdMillions} million obligated for review. The modeled minimum acceptable bid is ${sale.modeledFairValueUsdMillions} million.</p>
                    {sale.bids.length > 0 ? <ul>{sale.bids.map((bid) => <li key={bid.id}>
                      {bid.bidder}: ${bid.amountUsdMillions} million; {bid.qualified ? bid.amountUsdMillions >= sale.modeledFairValueUsdMillions ? "qualified and meets the minimum" : "qualified but below the minimum" : "not qualified"}.
                    </li>)}</ul> : null}
                    {sale.stage === "decision" ? <p>Acceptance awards the lease to the highest qualified bid meeting the minimum. Exploration still requires a separate plan and review.</p> : null}
                    {sale.bonusReceipt ? <p>Lease bonus: ${sale.bonusReceipt.amountUsdMillions} million {sale.bonusReceipt.receivedTurn === undefined ? "due to the federal government" : "received by the federal government"}. This revenue does not add spending authority.</p> : null}
                    {(sale.pausedWeeks ?? 0) > 0 ? <p>Review has lost {sale.pausedWeeks} weeks to unavailable capacity or a court pause.</p> : null}
                    {sale.reason ? <p>{sale.reason}</p> : null}
                    {sale.exploration?.reason ? <p>{sale.exploration.reason}</p> : null}
                  </>}
                  {actions.map((action) => <button key={action} className={buttonClass("secondary", "sm")}
                    disabled={followupActs.busy} onClick={() => { void followupActs.run(() => {
                      const result = offshoreLeaseSaleAction(campaign, areaId, action);
                      if (!result.ok) throw new Error(result.reason);
                      return { packet: result.packet, title: action === "initiate-sale" ? "Sale review initiated" : action === "accept-bid" ? "Qualified bid accepted" : "Bid declined", camera: "us" };
                    }, { tier: "confirm", title: action === "initiate-sale" ? "Begin the sale review" : action === "accept-bid" ? "Accept the qualified bid" : "Decline the bid" }); }}>{action === "initiate-sale" ? "Begin sale review" : action === "accept-bid" ? "Accept qualified bid" : "Decline bid"}</button>)}
                </div>;
              })}
              {followupActs.problem ? <p className="act-problem" role="alert">{followupActs.problem}</p> : null}
              {followupActs.done ? <ActDone done={followupActs.done} mapNote={null} /> : null}
            </section>
          ) : null}
          {id === "order-asset-seizure" && (campaign.blockedAssets?.length ?? 0) > 0 ? (
            <section className="order-rail__block" aria-label="Blocked property record">
              <h2 className="order-rail__title">Blocked property</h2>
              {campaign.blockedAssets?.map((asset) => <p key={asset.id}>
                {campaign.nations[asset.owner]?.base.identity.name ?? asset.owner}: modeled U.S.-custodied government account {asset.status}.
                {asset.status !== "blocked" ? " The linked dealings restriction has been lifted."
                  : isTradeMeasureEffective(campaign, asset.tradeMeasureId)
                    ? " Dealings are currently restricted."
                    : " The account remains on the blocked-property record, but the dealings restriction is not currently operative."}
              </p>)}
            </section>
          ) : null}
          {id === "order-defense-production" && campaign.orders.some((record) => record.defenseContract) ? (
            <section className="order-rail__block" aria-label="Defense priority contract">
              <h2 className="order-rail__title">Priority contract</h2>
              {campaign.orders.filter((record) => record.defenseContract).map((record) => {
                const contract = record.defenseContract!;
                const outstanding = campaign.munitions?.us[contract.munitionClass]?.onOrder
                  .find((order) => order.priorityContractId === record.id)?.count ?? 0;
                const filled = Math.max(0, contract.initialIndex - outstanding);
                const progress = contract.initialIndex > 0
                  ? `${formatRatio(filled / contract.initialIndex)} of the contracted replenishment fulfilled; ${formatRatio(outstanding / contract.initialIndex)} outstanding`
                  : "The fulfillment share is unknown";
                const delayed = outstanding > 0 && (campaign.calendar.year * 10000 + campaign.calendar.month * 100 + campaign.calendar.day
                  > contract.due.year * 10000 + contract.due.month * 100 + contract.due.day);
                const priority = outstanding <= 0 ? "The contracted backlog is fulfilled."
                  : record.rescindedTurn !== undefined || record.remedyApplied || record.review?.status === "struck-down"
                    ? "Priority has ended; the contracted backlog remains."
                    : activeDefensePriorityContractId(campaign) === record.id
                      ? "Priority is operating while legal authority stands and the production line has capacity."
                      : "Priority is not currently operating; the contracted backlog remains.";
                return <p key={record.id}><strong>{contract.supplier}</strong>: {contract.munitionClass.replaceAll("-", " ")} priority on an existing federal replenishment contract. {progress}{delayed ? " and delayed" : ""}. General due date: {formatDate(contract.due)}. {priority}</p>;
              })}
            </section>
          ) : null}
          {id === "order-clean-energy" && campaign.orders.some((record) => record.order === id) ? (
            <section className="order-rail__block" aria-label="Federal clean-power delivery">
              <h2 className="order-rail__title">Federal purchase delivery</h2>
              {(campaign.cleanPowerPurchases ?? []).map((purchase) => <p key={purchase.id}>Federal property portfolio: {purchase.status}, {purchase.deliveredMwh.toLocaleString("en-US")} of {purchase.quantityMwh.toLocaleString("en-US")} MWh delivered. ${purchase.amountUsdMillions} million obligated; ${(purchase.paidUsdMillions ?? 0).toFixed(2)} million in supplier payments recorded from the ordinary discretionary budget. {purchase.paymentTrackingStartMwh === undefined && purchase.deliveredMwh > 0 || (purchase.paymentTrackingStartMwh ?? 0) > 0 ? "Payments before tracking began are unknown. " : ""}Recorded payments are cumulative, separate from the annual outlay figure.</p>)}
              {(campaign.cleanPowerPurchases ?? []).some((purchase) => purchase.status === "contracted") ? <p>Weekly delivery depends on renewable supply. A shortfall delays the next installment; ending the order does not cancel the existing contract.</p> : null}
              {(campaign.cleanPowerPurchases?.length ?? 0) === 0 ? <>
                <p>The modeled portfolio contract is 700,000 MWh delivered over two years, subject to renewable supply and a $94 million appropriation.</p>
                <button className={buttonClass("secondary", "sm")} disabled={followupActs.busy} onClick={() => {
                  void followupActs.run(() => { const result = buyFederalCleanPower(campaign);
                    if (!result.ok) throw new Error(result.reason);
                    return { packet: result.packet, title: "Clean-power contract awarded", camera: "us" }; }, { tier: "confirm", title: "Award the clean-power purchase", lines: [{ label: "Contract", value: "700,000 MWh delivered over two years, subject to a $94 million appropriation" }], verb: "Confirm the award" });
                }}>Award clean-power purchase</button></> : null}
              {followupActs.problem ? <p className="act-problem" role="alert">{followupActs.problem}</p> : null}
              {followupActs.done ? <ActDone done={followupActs.done} mapNote={null} /> : null}
            </section>
          ) : null}
          {desk.reachLines.length > 0 ? (
            <section className="order-rail__block" aria-labelledby="order-reach">
              <h2 id="order-reach" className="order-rail__title">
                Who it reaches
              </h2>
              <ReachBars lines={desk.reachLines} />
              {desk.reach ? <p className="ui-visually-hidden">{desk.reach}</p> : null}
            </section>
          ) : null}
          {done ? (
            <ActDone done={done} mapNote={null} />
          ) : (
            <>
              {id === "order-border-controls" ? <section className="order-rail__block" aria-label="Port scope">
                <h2 className="order-rail__title">Federal port scope</h2>
                <p>Applies to admissibility checks at federal ports of entry. It does not authorize interior population enforcement or promise equal staffing at every crossing.</p>
              </section> : null}
              {id === "order-asset-seizure" && foreignTargets.length > 0 ? (
                <section className="order-rail__block" aria-label="Foreign threat">
                  <label htmlFor="order-foreign-subject">Foreign government</label>
                  <select id="order-foreign-subject" value={selectedSubject?.kind === "foreign" ? selectedSubject.nation : ""} onChange={(event) => setSubjectKey(event.target.value)}>
                    {foreignTargets.map((target) => <option key={target} value={target}>{campaign.nations[target]?.base.identity.name ?? target}</option>)}
                  </select>
                  {selectedSubject?.kind === "foreign" && !activeExternalEmergency(campaign, selectedSubject.nation) ? (
                    <button className={buttonClass("secondary", "sm")} disabled={declarationActs.busy} onClick={() => {
                      const pursuit = foreignThreats.find((entry) => entry.actor === selectedSubject.nation);
                      if (!pursuit) return;
                      void declarationActs.run(() => {
                        const finding = findingForThreat(pursuit);
                        if (!finding) throw new Error("The observed campaign supports no statutory finding.");
                        const result = declareExternalEmergency(campaign, pursuit.id, finding);
                        if (!result.ok) throw new Error(result.reason);
                        return { packet: result.packet, title: "Foreign-threat emergency declared", camera: "us" };
                      }, { tier: "full", title: "Declare a national emergency over this threat", verb: "Confirm and declare", danger: true });
                    }}>Declare a national emergency over this threat</button>
                  ) : null}
                  {declarationActs.problem ? <p className="act-problem" role="alert">{declarationActs.problem}</p> : null}
                  {declarationActs.done ? <ActDone done={declarationActs.done} mapNote={null} /> : null}
                </section>
              ) : null}
              {id === "order-relief-program" && reliefSubjects.length > 0 ? (
                <section className="order-rail__block" aria-label="Disaster request">
                  <label htmlFor="order-state-subject">Governor's request</label>
                  <select id="order-state-subject" value={selectedSubject?.kind === "state" ? `${selectedSubject.state}:${selectedSubject.cause}:${selectedSubject.declarationId}:${selectedSubject.billId}` : ""} onChange={(event) => setSubjectKey(event.target.value)}>
                    {reliefSubjects.map((entry) => <option key={`${entry.state}:${entry.cause}:${entry.declarationId}:${entry.billId}`} value={`${entry.state}:${entry.cause}:${entry.declarationId}:${entry.billId}`}>{campaign.states[entry.state]?.base.name ?? entry.state}: {entry.cause} · {campaign.bills[entry.billId]?.title ?? entry.billId}</option>)}
                  </select>
                </section>
              ) : null}
              {id === "order-relief-program" && disasterRequests.length > 0 ? (
                <section className="order-rail__block" aria-label="Stafford declaration">
                  <p>Governor requests awaiting a major-disaster declaration</p>
                  {disasterRequests.map((state) => <button key={state} className={buttonClass("secondary", "sm")}
                    disabled={declarationActs.busy} onClick={() => {
                      void declarationActs.run(() => {
                        const result = declareStaffordDisaster(campaign, state);
                        if (!result.ok) throw new Error(result.reason);
                        return { packet: result.packet, title: `Major disaster declared in ${campaign.states[state]?.base.name ?? state}`, camera: "us" };
                      }, { tier: "full", title: `Declare a major disaster in ${campaign.states[state]?.base.name ?? state}`, verb: "Confirm and declare" });
                    }}>Declare major disaster in {campaign.states[state]?.base.name ?? state}</button>)}
                  {declarationActs.problem ? <p className="act-problem" role="alert">{declarationActs.problem}</p> : null}
                  {declarationActs.done ? <ActDone done={declarationActs.done} mapNote={null} /> : null}
                </section>
              ) : null}
              {id === "order-grant-conditions" && grantSubjects.length > 0 ? (
                <section className="order-rail__block" aria-label="Enacted grant program">
                  <label htmlFor="order-grant-subject">Enacted grant law</label>
                  <select id="order-grant-subject" value={selectedSubject?.kind === "grant" ? selectedSubject.billId : ""} onChange={(event) => setSubjectKey(event.target.value)}>
                    {grantSubjects.map((entry) => <option key={entry.billId} value={entry.billId}>{campaign.bills[entry.billId]?.title ?? entry.billId}</option>)}
                  </select>
                </section>
              ) : null}
              {id === "order-regulatory-review" && reviewSubjects.length > 0 ? (
                <section className="order-rail__block" aria-label="Rule to review">
                  <label htmlFor="order-review-subject">Effective agency rule</label>
                  <select id="order-review-subject" value={selectedSubject?.kind === "rule-review" ? selectedSubject.ruleId : ""} onChange={(event) => setSubjectKey(event.target.value)}>
                    {reviewSubjects.map((entry) => {
                      const target = campaign.orders.find((record) => record.id === entry.ruleId);
                      return <option key={entry.ruleId} value={entry.ruleId}>{target ? executiveOrder(target.order)?.name ?? target.order : entry.ruleId}</option>;
                    })}
                  </select>
                  <p>Review may recommend revision. Changing or repealing the target rule takes a separate action.</p>
                </section>
              ) : null}
              {id === "order-energy-leasing" && leaseSubjects.length > 0 ? (
                <section className="order-rail__block" aria-label="Offshore planning area">
                  <label htmlFor="order-lease-subject">Federal offshore program area</label>
                  <select id="order-lease-subject" value={selectedSubject?.kind === "lease-planning" ? selectedSubject.areaId : ""} onChange={(event) => setSubjectKey(event.target.value)}>
                    {leaseSubjects.map((entry) => <option key={entry.areaId} value={entry.areaId}>{leasePlanningArea(entry.areaId)?.name ?? entry.areaId}</option>)}
                  </select>
                  <p>This directs planning and review. No lease or drilling permit issues on signature.</p>
                </section>
              ) : null}
              {id === "order-force-protection" && siteSubjects.length > 0 ? (
                <section className="order-rail__block" aria-label="Federal site to protect">
                  <label htmlFor="order-site-subject">Federal building or grounds</label>
                  <select id="order-site-subject" value={selectedSubject?.kind === "federal-site" ? selectedSubject.institutionId : ""} onChange={(event) => setSubjectKey(event.target.value)}>
                    {siteSubjects.map((entry) => <option key={entry.institutionId} value={entry.institutionId}>{FEDERAL_SITES.find((site) => site.institution === entry.institutionId)?.site ?? entry.institutionId}</option>)}
                  </select>
                  <p>This authority reaches the selected federal property, not nearby streets or state facilities.</p>
                </section>
              ) : null}
              {id === "order-entry-suspension" && entrySubjects.length > 0 ? (
                <section className="order-rail__block" aria-label="Entry class and finding">
                  <label htmlFor="order-entry-subject">First-time entrants from</label>
                  <select id="order-entry-subject" value={selectedSubject?.kind === "entry-class" ? selectedSubject.nation : ""} onChange={(event) => setSubjectKey(event.target.value)}>
                    {entrySubjects.map((entry) => <option key={entry.nation} value={entry.nation}>{campaign.nations[entry.nation]?.base.identity.name ?? entry.nation}</option>)}
                  </select>
                  <p>The finding cites a recent overt security campaign. This proclamation applies at entry, not to people already admitted.</p>
                </section>
              ) : null}
              {id === "order-emergency-construction" && constructionSubjects.length > 0 ? (
                <section className="order-rail__block" aria-label="Military construction funding">
                  <label htmlFor="order-construction-subject">Project allocation to redirect</label>
                  <select id="order-construction-subject" value={selectedSubject?.kind === "construction" ? `${selectedSubject.sourceId}:${selectedSubject.declarationId}` : ""} onChange={(event) => setSubjectKey(event.target.value)}>
                    {constructionSubjects.map((entry) => <option key={`${entry.sourceId}:${entry.declarationId}`} value={`${entry.sourceId}:${entry.declarationId}`}>{campaign.militaryConstructionProjects?.find((project) => project.id === entry.sourceId)?.name ?? entry.sourceId}</option>)}
                  </select>
                </section>
              ) : null}
              {id === "order-emergency-construction" && armedConflict && !Object.values(campaign.emergencies).some((record) => record.armedForcesConflictId === armedConflict.id && record.endedTurn === undefined) ? (
                <section className="order-rail__block" aria-label="Armed-forces declaration">
                  <button className={buttonClass("secondary", "sm")} disabled={armedActs.busy} onClick={() => {
                    void armedActs.run(() => {
                      const result = declareArmedForcesEmergency(campaign, armedConflict.id);
                      if (!result.ok) throw new Error(result.reason);
                      return { packet: result.packet, title: "Armed-forces emergency declared", camera: "us" };
                    }, { tier: "full", title: "Declare a national emergency requiring the armed forces", verb: "Confirm and declare", danger: true });
                  }}>Declare a national emergency requiring the armed forces</button>
                  {armedActs.problem ? <p className="act-problem" role="alert">{armedActs.problem}</p> : null}
                  {armedActs.done ? <ActDone done={armedActs.done} mapNote={null} /> : null}
                </section>
              ) : null}
              <Authorization campaign={campaign} desk={desk} subject={selectedSubject} acts={acts} onSign={() => setCommitted(terms)} />
              <PriorSignatures rows={signatures} />
            </>
          )}
        </aside>
        <div className="order-paper">
          <OrderDocument campaign={campaign} terms={shown} {...(done ? { signedOn: done.date, ...(latest ? { recordId: latest.id } : {}) } : {})} {...(desk.available ? {} : { blocked: desk.missing ?? "authority it lacks" })} />
          <p>
            <Door href={place.policy()} className={buttonClass("ghost", "sm")}>
              Back to policy
            </Door>
          </p>
        </div>
      </div>
    </Screen>
  );
}
