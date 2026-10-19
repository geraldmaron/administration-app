import { useMemo } from "react";
import { answerLowerOrderReview, isOpenCase, prospectiveOrderAuthority, selectDateOfTurn, solicitorGeneralAssessment, type Campaign } from "@admin/engine";
import { caseFile, caseProcess, formatDate, place, type CaseFile } from "@admin/player-core";
import { Bar, Button, Document, EmptyState, Icon, Tag, buttonClass, type DocumentSection } from "@admin/ui-web";
import { useBuilt } from "../../shell/built-routes";
import { Door } from "../../shell/Door";
import { AuthorityHelp } from "../../help/AuthorityHelp";
import { Screen } from "../../shell/Screen";
import { CaseProcessView } from "./CaseProcessView";
import { CaseStatus } from "./CaseStatus";
import { ActDone } from "../../nation/policy/ActDone";
import { useAct, type ActHandle } from "../../nation/policy/use-act";
import { dueWords, StrikeMeter } from "./Docket";
import "../../nation/economy/economy.css";
import "./courts.css";
import "./justice-workspace.css";
import "../congress/tables.css";

const COURT = "Supreme Court of the United States";
const circuitName = (circuit: string) => circuit === "District of Columbia"
  ? "United States Court of Appeals for the D.C. Circuit"
  : `United States Court of Appeals for the ${circuit} Circuit`;
const forumOf = (file: CaseFile): string => file.forum === "lower" ? file.lowerForum?.court ?? "Federal district court"
  : file.forum === "circuit" ? circuitName(file.circuit?.court ?? file.lowerForum?.circuit ?? "Federal") : COURT;
const BACK = `${place.courts()}?view=docket`;
const endNote = (file: CaseFile): string | undefined => file.endReason
  ? `The order ${file.endReason === "sunset" ? "expired" : "was rescinded"}${file.ended ? ` on ${file.ended}` : ""}. Its future operation ended. This case remains on the court record.`
  : undefined;

function Identity({ file }: { readonly file: CaseFile }) {
  return (
    <section className="nation-section" aria-labelledby="case-identity">
      <h2 id="case-identity" className="nation-section__title">
        <Icon name="court" size={20} /> The case
      </h2>
      <CaseStatus status={file.status} dismissedAtThreshold={file.dismissedAtThreshold} subject={file.subject} endReason={file.endReason} />
      {endNote(file) ? <p className="nation-note">{endNote(file)}</p> : null}
      <dl className="identity">
        <div>
          <dt>Court</dt>
          <dd>{forumOf(file)}</dd>
        </div>
        <div>
          <dt>{file.order ? "Order challenged" : "Matter filed"}</dt>
          <dd>
            {file.order ? <><Door href={place.order(file.order)}>{file.orderName}</Door>, signed {file.signed}</> : <>{file.orderName}, filed {file.signed}</>}
          </dd>
        </div>
        <div>
          <dt>Ground</dt>
          <dd>{file.groundWords}</dd>
        </div>
        <div>
          <dt>{file.status === "pending" ? "Next step" : "Ruled"}</dt>
          <dd>{file.status === "pending" ? dueWords(file) : (file.ruled ?? "Date not recorded")}</dd>
        </div>
      </dl>
      {file.lower ? <p className="nation-note">The lower court {file.lower.holding === "struck-down" ? "set aside" : "sustained"} {file.order ? "the order" : "the challenged practice"}. {file.status === "pending" ? file.lower.enforcement === "in-force" ? "The challenged order cannot begin or continue its future operation while this judgment stands." : "Enforcement of that judgment is stayed while appeal remains pending." : file.appeal === "equally-divided" ? "An equally divided Supreme Court left that judgment in force without precedent." : "That judgment is part of the final record."}</p> : null}
      {file.dismissedAtThreshold ? <p className="nation-note">The challenge was dismissed at threshold. No court reached the merits of the order.</p> : null}
      {file.interim === "rule-stayed" ? <p className="nation-note">The unimplemented rule is stayed while the challenge continues.</p> : null}
      {file.interim === "rule-paused" && file.partyRelief?.active ? <p className="nation-note">The final rule's recorded effects are paused while the agency record is reviewed.</p> : null}
      {file.interim === "state-compliance-ordered" ? <p className="nation-note">The state must install accessible equipment before Election Day while the case continues.</p> : null}
      {file.interim === "construction-obligations-stayed" ? <p className="nation-note">The preliminary injunction pauses new emergency-construction commitments. Previously obligated work may still be paid.</p> : null}
      {file.partyRelief?.unquantified ? <p className="nation-note">The court granted interim relief, but this save does not identify a stat movement that can be safely withheld.</p> : null}
    </section>
  );
}

/** The question the Court is asked and what the ruling does to the government's action. */
function Issue({ file }: { readonly file: CaseFile }) {
  const lost = file.status === "struck-down";
  return (
    <section className="nation-section" aria-labelledby="case-issue">
      <h2 id="case-issue" className="nation-section__title">
        <Icon name="order" size={20} /> The issue and its effect on government action
      </h2>
      <p>{file.question}</p>
      <p className="nation-note">{file.summary}</p>
      <h3 className="nation-subtitle">{file.subject?.kind === "state-election-access" ? "What the court order changes" : file.endReason ? "What ended the order's effects" : file.status === "pending" ? "If the Court strikes it down" : lost ? "What the ruling undid" : "What a strike-down would have undone"}</h3>
      {file.reversedNote ? <p className="nation-note">{file.reversedNote}</p> : null}
      {file.reversed.length > 0 ? (
        <ul className="case-effects">
          {file.reversed.map((effect) => (
            <li key={effect.label}>
              <span>{effect.label}</span>
              <strong>{effect.value} undone</strong>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="nation-note">{file.unreversed ?? "The order spent nothing from the treasury, so there is nothing a ruling leaves on the books."}</p>
      {file.status === "pending" ? <p className="nation-note">Being overruled by your own courts also costs standing and stability{file.endReason ? "." : ", on top of losing the order."}</p> : null}
    </section>
  );
}

function LowerBenchRecord({ campaign, file }: { readonly campaign: Campaign; readonly file: CaseFile }) {
  if (!file.lowerForum && !file.circuitPanel && !file.circuit) return null;
  const circuit = file.lowerForum?.circuit ?? file.circuit?.court;
  const circuitVacancies = circuit ? Object.values(campaign.institutions).filter((seat) =>
    seat.lowerBenchSeat?.circuit === circuit && seat.vacancy).length : 0;
  return <section className="nation-section" aria-labelledby="case-lower-bench">
    <h2 id="case-lower-bench" className="nation-section__title"><Icon name="court" size={20} /> Lower-court record</h2>
    {file.lowerForum ? <div className="court-forum-evidence"><strong>{file.lowerForum.court}</strong><dl className="justice-readings"><div><dt>Authorized judgeships</dt><dd>{file.lowerForum.authorized}</dd></div><div><dt>Recorded vacancies</dt><dd>{file.lowerForum.vacancies}</dd></div></dl><div className="court-forum-evidence__composition"><span>{file.lowerForum.activeDemocratic} Democratic appointees</span><Bar label={`${file.lowerForum.activeDemocratic} Democratic appointees of ${file.lowerForum.authorized} authorized judgeships`} value={file.lowerForum.activeDemocratic / Math.max(1, file.lowerForum.authorized)} /><span>{file.lowerForum.activeRepublican} Republican appointees</span><Bar label={`${file.lowerForum.activeRepublican} Republican appointees of ${file.lowerForum.authorized} authorized judgeships`} value={file.lowerForum.activeRepublican / Math.max(1, file.lowerForum.authorized)} /></div><p className="nation-note">Source snapshot · {file.lowerForum.sourceDate}. Appointing party describes composition, not how a judge will rule.</p></div> : null}
    {file.lower ? <p className="nation-note">The district court decided the recorded legal ground on the merits. Its ruling remains in the case history even if a higher court reverses it.</p> : null}
    {file.circuitPanel ? <>
      <p>The three-judge circuit assignment was recorded on {formatDate(selectDateOfTurn(campaign, file.circuitPanel.assignedTurn))}. A ruling requires at least two participating judges, and two must agree.</p>
      <ol className="case-votes" aria-label="Assigned circuit panel">{file.circuitPanel.assigned.map(({ seatId, judge }) => {
        const person = campaign.people[judge];
        const voted = file.circuit?.votes.some((vote) => vote.judge === judge && vote.seatId === seatId);
        const seat = campaign.institutions[seatId];
        const available = seat?.vacancy === false && seat.leader === judge && person?.alive;
        const status = file.circuit ? voted ? "Participated" : "Did not participate" : available ? "Assigned" : "No longer eligible";
        return <li key={seatId} className="ui-row-target">{person?.alive ? <Door className="ui-row-link" href={place.person(judge)}>{person.base.name}</Door> : person?.base.name ?? "Circuit judge"}: {status}</li>;
      })}</ol>
      {file.circuitPanel.recusals.length ? <><p className="nation-note">Recorded recusals</p>
        <ul>{file.circuitPanel.recusals.map(({ seatId, judge, turn }) => <li key={`${seatId}:${judge}`}>
          {campaign.people[judge]?.base.name ?? "Circuit judge"} was recused on {formatDate(selectDateOfTurn(campaign, turn))} for prior government advice on this order.
        </li>)}</ul></> : null}
    </> : null}
    {file.circuit ? <><p>The {circuitName(file.circuit.court)} panel {file.circuit.holding === "struck-down" ? "set aside" : "sustained"} the order, {file.circuit.votes.filter((vote) => vote.vote === (file.circuit!.holding === "struck-down" ? "strike" : "uphold")).length} to {file.circuit.votes.filter((vote) => vote.vote !== (file.circuit!.holding === "struck-down" ? "strike" : "uphold")).length}.</p>
      <ol className="case-votes" aria-label="Circuit panel votes">{file.circuitVotes?.map((vote, index) => <li key={file.circuit!.votes[index]!.seatId} className="ui-row-target">{vote.href ? <Door className="ui-row-link" href={vote.href}>{vote.name}</Door> : vote.name}: {vote.vote === "strike" ? "set aside" : "sustain"}</li>)}</ol></> : null}
    {file.status === "pending" && circuitVacancies > 0 ? <p className="nation-note">{circuitVacancies} active {circuitVacancies === 1 ? "seat is" : "seats are"} vacant in this circuit. <Door href={place.appointments()}>Review appointments</Door>.</p> : null}
  </section>;
}

function holdingSections(file: CaseFile): readonly DocumentSection[] {
  if (file.subject?.kind === "statutory-authority") return [
    { heading: file.dismissedAtThreshold ? "Disposition" : "Statutory holding", body: <p>{file.opinion?.majority}</p> },
    ...(file.relief ? [{ heading: "Scope of relief", body: <p>{file.relief === "statutory-construction" ? "The Supreme Court narrows this bill's named authorization for the production-priority order. Other provisions remain in force." : "Relief applies to the named plaintiff suppliers only; the national statutory grant remains in force."}</p> }] : []),
  ];
  const verb = file.status === "struck-down" ? "struck down" : "upheld";
  const holding = file.dismissedAtThreshold ? "The challenge was dismissed at threshold. No merits ruling was reached." : file.appeal === "equally-divided" ? `The lower judgment ${file.status === "struck-down" ? "setting aside" : "sustaining"} the challenged action remains in force after an equal division. The Supreme Court issued no merits holding.` : file.subject?.kind === "fair-housing-enforcement" ? `The provider-specific claim was ${file.status === "struck-down" ? "proved" : "not proved"}.` : file.subject?.kind === "wage-hour-enforcement" ? "The named employer owes worker-specific overtime and liquidated damages." : file.subject?.kind === "unlawful-surveillance" ? "The aggrieved person's §1810 damages claim was proved." : file.endReason ? `The court ${verb} the order${file.split ? `, ${file.split}` : ""}; the order is no longer operative.` : `The order is ${verb}${file.split ? `, ${file.split}` : ""}.`;
  return [
    { heading: file.dismissedAtThreshold ? "Disposition" : "Holding", body: <p>{holding}</p> },
    ...(file.opinion ? [{ heading: file.forum === "lower" ? "Lower-court judgment" : file.appeal === "equally-divided" ? "Disposition" : "Opinion of the Court", body: <><p>{file.opinion.majority}</p>{file.majorityAuthor ? <p className="case-author">{file.majorityAuthor}, for the Court</p> : null}</> }] : []),
    ...(file.opinion?.dissent ? [{ heading: "Dissent", body: <><p>{file.opinion.dissent}</p>{file.dissentAuthor ? <p className="case-author">{file.dissentAuthor}, dissenting</p> : null}</> }] : []),
  ];
}

/** The ruling as an issued page when decided; the open question and the staff projection when not. */
function Holding({ file }: { readonly file: CaseFile }) {
  if (file.status === "pending") {
    return (
      <section className="nation-section" aria-labelledby="case-pending">
        <h2 id="case-pending" className="nation-section__title">
          <Icon name="pending" size={20} /> The pending question
        </h2>
        <p>{file.question}</p>
        {file.strikeChance !== undefined ? <StrikeMeter chance={file.strikeChance} caption={dueWords(file)} /> : null}
        <p className="nation-note">{file.lower ? file.lower.enforcement === "in-force" ? "The lower judgment bars the challenged order’s future operation for now. A request for review does not itself pause that judgment." : "A lower-court judgment is recorded, but its enforcement is stayed pending appeal. No final disposition exists yet." : "No judgment exists yet. Any projection is not a ruling and moves with the bench and statute book."}</p>
      </section>
    );
  }
  return (
    <Document
      issuer={forumOf(file)}
      kind="Ruling"
      title={file.orderName}
      reference={file.id}
      dated={`Ruled ${file.ruled ?? "on a date not recorded"}`}
      state={file.status === "struck-down" ? "revoked" : file.endReason === "sunset" ? "expired" : file.endReason ? "revoked" : "in-effect"}
      stateLabel={file.endReason ? `${file.dismissedAtThreshold ? "Challenge dismissed" : file.subject?.kind === "statutory-authority" ? file.relief === "statutory-construction" ? "Authorization narrowed" : "Statutory challenge decided" : file.status === "struck-down" ? "Order struck down" : "Order upheld"}; order ${file.endReason === "sunset" ? "expired" : "rescinded"}` : file.dismissedAtThreshold ? "Challenge dismissed" : file.appeal === "equally-divided" ? "Lower judgment remains in force" : file.subject?.kind === "fair-housing-enforcement" ? "Housing claim decided" : file.subject?.kind === "wage-hour-enforcement" ? "Overtime recovery ordered" : file.subject?.kind === "unlawful-surveillance" ? "Damages awarded" : file.subject?.kind === "statutory-authority" ? file.relief === "statutory-construction" ? "Authorization narrowed" : "Statutory challenge decided" : file.status === "struck-down" ? "Order struck down" : "Order upheld"}
      sections={holdingSections(file)}
    />
  );
}

function MatterDetails({ file }: { readonly file: CaseFile }) {
  const matter = file.matter!;
  const subject = file.subject!;
  return (
    <>
      <section className="nation-section" aria-labelledby="case-identity">
        <h2 id="case-identity" className="nation-section__title"><Icon name="court" size={20} /> The case</h2>
        <CaseStatus status={file.status} dismissedAtThreshold={file.dismissedAtThreshold} subject={file.subject} endReason={file.endReason} />
        {endNote(file) ? <p className="nation-note">{endNote(file)}</p> : null}
        <dl className="identity">
          <div><dt>Parties</dt><dd>{matter.parties.map((party) => `${party.name} (${party.role})`).join("; ")}</dd></div>
          <div><dt>Forum</dt><dd>{forumOf(file)}</dd></div>
          <div><dt>Jurisdiction and standing</dt><dd>{matter.jurisdiction}</dd></div>
          <div><dt>Injury</dt><dd>{matter.injury}</dd></div>
          <div><dt>{file.status === "pending" ? "Next step" : "Ruled"}</dt><dd>{file.status === "pending" ? dueWords(file) : file.ruled}</dd></div>
        </dl>
        {file.status === "pending" && file.partyRelief?.active ? <p className="nation-note">The interim stay withholds the named plaintiff suppliers' share of the order's recorded effects while this case continues.</p> : null}
        {file.interim === "rule-paused" && file.partyRelief?.active ? <p className="nation-note">The final agency rule's effects are paused pending merits review.</p> : null}
        {file.lower ? <p className="nation-note">The lower court {matter.kind === "election-access"
          ? file.lower.holding === "struck-down" ? "ordered state election administrators to meet the accessible-equipment requirement" : "sustained the state's election-access plan"
          : matter.kind === "emergency-construction"
            ? file.lower.holding === "struck-down" ? "set aside the challenged construction redirection" : "sustained the construction redirection"
            : matter.kind === "fair-housing-enforcement"
              ? file.lower.holding === "struck-down" ? "ordered the respondent to reconsider this housing application" : "found the housing allegation unproved"
            : matter.kind === "wage-hour-enforcement"
              ? file.lower.holding === "struck-down" ? "found unpaid overtime for the named worker" : "found no payroll shortfall"
            : matter.kind === "unlawful-surveillance"
              ? "found the documented interception unlawful"
            : subject.kind === "executive-order" ? file.lower.holding === "struck-down" ? "set aside the challenged order" : "sustained the challenged order"
            : file.lower.holding === "struck-down" ? "limited the priority as to the plaintiffs" : "sustained the priority"}. {file.status === "pending" && file.lower.enforcement === "stayed-pending-appeal" ? "Enforcement of that judgment is stayed while appeal remains pending." : null}</p> : null}
      </section>
      <section className="nation-section" aria-labelledby="case-issue">
        <h2 id="case-issue" className="nation-section__title"><Icon name="record" size={20} /> The legal question</h2>
        <p>{matter.question}</p>
        <dl className="identity">
          <div><dt>Authority</dt><dd>{matter.authority}</dd></div>
          <div><dt>Facts in dispute</dt><dd>{matter.disputedFacts}</dd></div>
          <div><dt>Relief sought</dt><dd>{matter.reliefSought}</dd></div>
          <div><dt>Affected</dt><dd>{matter.affected}</dd></div>
          {matter.evidence?.map((item) => <div key={item}><dt>Record</dt><dd>{item}</dd></div>)}
        </dl>
        {file.unreversed ? <p className="nation-note">{file.unreversed}</p> : null}
        {file.partyEffects?.length ? <ul className="case-effects">{file.partyEffects.map((effect) => <li key={effect.label}><span>{effect.label}</span><strong>{effect.value} withheld</strong></li>)}</ul> : null}
        {subject.kind === "statutory-authority" ? <p><Door href={place.bill(subject.billId)}>Read the Act</Door> · <Door href={place.order(subject.orderId)}>Read the priority order</Door></p> : null}
        {subject.kind === "executive-order" ? <p><Door href={place.order(subject.orderId)}>Read the challenged order</Door></p> : null}
      </section>
    </>
  );
}

function BenchPositions({ file }: { readonly file: CaseFile }) {
  return (
    <section className="nation-section" aria-labelledby="case-bench">
      <h2 id="case-bench" className="nation-section__title">
        <Icon name="gavel" size={20} /> Bench positions
      </h2>
      {file.status === "pending" ? (
        <p className="nation-note">{file.subject?.kind === "fair-housing-enforcement" || file.subject?.kind === "state-election-access" || file.subject?.kind === "wage-hour-enforcement" || file.subject?.kind === "unlawful-surveillance"
          ? "This matter is before a federal lower court. A Supreme Court merits vote is not scheduled."
          : file.stage === "circuit-merits" || file.circuit && file.stage !== "supreme-merits"
            ? "The circuit panel's votes are recorded when it rules. Supreme Court review has not been granted."
            : file.stage === "supreme-merits"
              ? <>Each justice&rsquo;s vote is cast and kept on the day the Supreme Court rules. <Door href={place.courts()}>Open the bench</Door> to see where each justice sits.</>
              : "No Supreme Court merits vote is scheduled yet."}</p>
      ) : file.votes.length === 0 ? (
        <p className="nation-note">{file.forum === "lower" || file.forum === "circuit" ? "The Supreme Court did not vote on this case." : "No individual votes were recorded for this legacy opinion."}</p>
      ) : (
        <>
        <VoteStrip votes={file.votes} />
        <ol className="case-votes" aria-label="How each justice voted">
          {file.votes.map((vote) => (
            <li key={vote.seat} data-vote={vote.vote} className="ui-row-target">
              {vote.href ? (
                <Door href={vote.href} className="ui-row-link">
                  {vote.name}
                </Door>
              ) : <span>{vote.name}</span>}
              <Tag tone={vote.vote === "strike" ? "risk" : "good"} icon={vote.vote === "strike" ? "statusBlocked" : "statusIssued"}>
                {vote.vote === "strike" ? "Strike" : "Uphold"}
              </Tag>
            </li>
          ))}
        </ol>
        </>
      )}
    </section>
  );
}

/**
 * The nine seats as they voted on this case: each recorded vote filled by its
 * direction, any seat with no recorded vote hollow, never guessed. The quorum
 * and the margin are stated beside it.
 */
function VoteStrip({ votes }: { readonly votes: CaseFile["votes"] }) {
  const bySeat = new Map(votes.map((vote) => [vote.seat, vote]));
  const seats = [...new Set([...Array.from({ length: 9 }, (_, index) => index + 1), ...votes.map((vote) => vote.seat)])].sort((a, b) => a - b);
  const strikes = votes.filter((vote) => vote.vote === "strike").length;
  const upholds = votes.length - strikes;
  const unrecorded = seats.length - votes.length;
  return (
    <figure className="case-vote-strip">
      <ol className="case-vote-strip__seats" aria-hidden="true">
        {seats.map((seat) => {
          const vote = bySeat.get(seat);
          const title = vote ? `${vote.name}: ${vote.vote === "strike" ? "strike" : "uphold"}` : "No recorded vote";
          // A recorded seat opens that justice's file; the named list below reaches the same files by keyboard.
          return <li key={seat} data-vote={vote?.vote ?? "none"} title={title}>{vote?.href ? <Door href={vote.href} tabIndex={-1} className="case-vote-strip__link" aria-label={vote.name}><span /></Door> : null}</li>;
        })}
      </ol>
      <figcaption>
        {strikes} to strike, {upholds} to uphold{unrecorded > 0 ? `; ${unrecorded} ${unrecorded === 1 ? "seat has" : "seats have"} no recorded vote` : ""}. Six participating justices are needed for a merits ruling; {votes.length >= 6 ? "this ruling met it" : "this record does not show six"}.
      </figcaption>
    </figure>
  );
}

/** Related federal acts and the case's remaining steps. */
function Related({ file }: { readonly file: CaseFile }) {
  const built = useBuilt();
  return (
    <section className="nation-section" aria-labelledby="case-paths">
      <h2 id="case-paths" className="nation-section__title">
        <Icon name="decision" size={20} /> Related acts
      </h2>
      {file.order ? <Door className="justice-attention-row" href={place.order(file.order)}><Icon name="order" size={20} /><span><strong>{file.orderName}</strong><span>Challenged executive order</span></span><span aria-hidden="true">→</span></Door> : null}
      {file.status === "pending" ? (
        <>
          <p className="nation-note">{file.subject?.kind === "state-election-access"
            ? file.interim === "state-compliance-ordered" ? "The state is under a prospective compliance order. Installation and the federal case advance on their own schedules before Election Day." : "The state audit, response, and federal filing occur on separate dates. The court can order prospective installation before Election Day."
            : file.endReason ? "The order's future operation has ended, but the court still has the recorded challenge to decide."
              : "You can rescind the order while its challenge continues. The court's legal ruling follows the recorded facts."}</p>
          {file.paths.length === 0 && file.order ? <p className="nation-note">No supported administrative action changes the modeled staff assessment before the ruling.</p> : null}
          <ul className="nation-cards nation-cards--two">
            {file.paths.map((path) => (
              <li key={path.key} className="market-card ui-row-target">
                <h3 className="nation-subtitle">{built(path.href) ? <Door href={path.href} className="ui-row-link">{path.title}</Door> : path.title}</h3>
                <p className="nation-note">{path.detail}</p>
                {!built(path.href) ? <p className="nation-note">{path.door} is not available in this version.</p> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function History({ file }: { readonly file: CaseFile }) {
  return (
    <section className="nation-section" aria-labelledby="case-timeline">
      <h2 id="case-timeline" className="nation-section__title">
        <Icon name="record" size={20} /> Procedural history
      </h2>
      <ol className="case-timeline">
        {file.timeline.map((moment) => (
          <li key={moment.date + moment.text}>
            <span className="case-timeline__date">{moment.date}</span>
            <span>{moment.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StayRequest({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order" && entry.subject.recordId === id);
  const request = proceeding?.stayApplication;
  if (!request && !proceeding?.calendar && !proceeding?.reviewDecision) return null;
  const counselRecord = campaign.judiciary.solicitorGeneral?.events.filter((event) => event.proceedingId === proceeding?.id) ?? [];
  const authority = prospectiveOrderAuthority(campaign, id);
  const requested = request ? formatDate(selectDateOfTurn(campaign, request.requestedTurn)) : undefined;
  const decided = request?.decidedTurn === undefined ? undefined : formatDate(selectDateOfTurn(campaign, request.decidedTurn));
  return <section className="nation-section" aria-labelledby="case-stay-request">
    <h2 id="case-stay-request" className="nation-section__title"><Icon name="court" size={20} /> Review calendar and stay</h2>
    {proceeding?.calendar ? <p>October {proceeding.calendar.termYear} term: argument {formatDate(selectDateOfTurn(campaign, proceeding.calendar.argumentTurn))}; opinion expected {formatDate(selectDateOfTurn(campaign, proceeding.calendar.opinionTurn))} if a quorum can sit. The usual late-June opinion target is {formatDate(selectDateOfTurn(campaign, proceeding.calendar.opinionTargetTurn))}. {proceeding.calendar.status === "carried" ? "A lack of quorum carried this case to another term." : null}</p> : null}
    {proceeding?.reviewDecision ? <p>The Solicitor General's standing when review was considered was {solicitorGeneralAssessment(proceeding.reviewDecision.solicitorGeneralStanding)}.</p> : null}
    {counselRecord.length ? <ul>{counselRecord.map((event) => <li key={event.kind}>
      {formatDate(selectDateOfTurn(campaign, event.turn))}: {event.account}
    </li>)}</ul> : null}
    {request ? <><p>Stay requested {requested}{decided ? `; decided ${decided}` : ""}.</p>
    <p>{request.status === "pending" ? "No decision on this stay request is recorded. Filing the request did not itself pause the lower judgment."
      : request.status === "granted" ? "The court granted a stay of the lower judgment during review. This was not a final decision on the legal challenge."
        : "The court denied a stay. Seeking further review did not suspend the lower judgment."}</p></> : null}
    <p className="nation-note">{proceeding?.stage === "final" ? "The final disposition governs now; this request remains part of the case history."
      : "A stay changes only this judgment’s immediate effect. Other court limits, funding requirements and the order’s expiration still apply."}</p>
    <p>{authority === "ended" ? "The challenged order’s authority has ended."
      : authority === "suspended" ? "The challenged order’s future operation is currently suspended."
        : authority === "not-yet-effective" ? "The rule has not yet taken effect."
          : "The challenged order currently has authority to operate, subject to its funding and implementation requirements."}</p>
  </section>;
}

function ReviewActions({ campaign, id, acts }: { readonly campaign: Campaign; readonly id: string; readonly acts: ActHandle }) {
  const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order" && entry.subject.recordId === id);
  const response = proceeding && campaign.cases?.[`case:review:${proceeding.id}`];
  if (proceeding?.stage !== "appeal" || proceeding.lower?.holding !== "struck-down" ||
    proceeding.lower.enforcement !== "in-force" || proceeding.governmentReview || !response || !isOpenCase(response.status)) return <StayRequest campaign={campaign} id={id} />;
  const proceedingId = proceeding.id;
  const take = (choice: "seek" | "seek-with-stay" | "accept") => void acts.run(() => {
    const result = answerLowerOrderReview(campaign, proceedingId, choice);
    if (!result.ok) throw new Error(result.reason);
    return { packet: result.packet, title: choice === "seek-with-stay" ? "Review and a stay requested" : choice === "seek" ? "Further review requested" : "Lower judgment accepted", camera: "us" };
  }, { tier: "full", title: choice === "seek-with-stay" ? "Seek further review and a stay" : choice === "seek" ? "Seek further review" : "Accept the lower judgment", danger: choice === "accept" });
  return <section className="nation-section" aria-labelledby="case-response">
    <h2 id="case-response" className="nation-section__title"><Icon name="decision" size={20} /> Your response to the lower ruling</h2>
    <p>The lower court has set aside the challenged order. Its future operation is paused. Ask the Solicitor General to seek further review, with or without a request to pause the lower judgment, or accept the judgment.</p>
    <p className="nation-note">A stay would pause the lower judgment while review is considered. Requesting one does not grant it. The court weighs the legal case, harm that cannot later be repaired, harm to others, and the public interest. Existing contracts and completed work are not erased.</p>
    <p className="nation-note">If you do not answer by the date on the Desk, the lower judgment becomes final.</p>
    <div className="tray">
      <Button kind="primary" size="sm" busy={acts.busy} onClick={() => take("seek")}>Ask for further review</Button>
      <Button kind="secondary" size="sm" busy={acts.busy} onClick={() => take("seek-with-stay")}>Ask for review and a stay</Button>
      <Button kind="secondary" size="sm" busy={acts.busy} onClick={() => take("accept")}>Accept the lower judgment</Button>
    </div>
    {acts.problem ? <p role="alert">{acts.problem}</p> : null}
  </section>;
}

/** One case: identity and procedural state, the issue and its effect, the holding or the pending question, bench positions, related acts and history. */
export function CaseScreen({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const file = useMemo(() => caseFile(campaign, id), [campaign, id]);
  const process = useMemo(() => caseProcess(campaign, id), [campaign, id]);
  const acts = useAct(campaign);
  if (acts.done) return <Screen icon="court" title={acts.done.title} eyebrow="Court response" screenClass="workspace" measure="data" camera="us"><ActDone done={acts.done} onBack={acts.dismiss} backLabel="Back to the case" mapNote={null} /></Screen>;
  if (!file) {
    return (
      <Screen title="Case not found" eyebrow="Courts" screenClass="workspace" measure="data" camera="us">
        <EmptyState icon="court" title="No such case">
          No order of yours has a case under that name. <Door href={place.courts()}>Open the courts</Door>
        </EmptyState>
      </Screen>
    );
  }
  return <Screen icon="court" title={file.orderName} eyebrow="Federal court case" lede={file.question} screenClass="workspace" measure="data" camera="us">
    <div className="justice-workspace case-workspace">
      <AuthorityHelp topic="judicial-review" compact />
      <header className="case-workspace__header"><Door href={BACK} className={buttonClass("ghost", "sm")}><Icon name="court" size={16} /> Federal docket</Door><CaseStatus status={file.status} dismissedAtThreshold={file.dismissedAtThreshold} subject={file.subject} endReason={file.endReason} /><Tag icon="record">Case record · {file.id}</Tag></header>
      {process ? <CaseProcessView process={process} contested={file.matter?.authority ?? file.orderName} ground={file.groundWords} response={<ReviewActions campaign={campaign} id={file.id} acts={acts} />} /> : <ReviewActions campaign={campaign} id={file.id} acts={acts} />}
      <div className="case-workspace__evidence"><div>{file.matter ? <MatterDetails file={file} /> : <><Identity file={file} /><Issue file={file} /></>}<LowerBenchRecord campaign={campaign} file={file} /></div><aside aria-label="Judicial assessment and decision"><Holding file={file} /><BenchPositions file={file} />{file.matter ? null : <Related file={file} />}</aside></div>
      <History file={file} />
    </div>
  </Screen>;
}
