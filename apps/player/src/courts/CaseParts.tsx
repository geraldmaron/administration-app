import { answerLowerOrderReview, isOpenCase, prospectiveOrderAuthority, selectDateOfTurn, solicitorGeneralAssessment, type Campaign, type ProspectiveOrderAuthority } from "@admin/engine";
import { formatDate, place, type CaseFile, type CaseProcess } from "@admin/player-core";
import { Card, Column, Row, Surface, Text, View } from "@admin/ui";
import { StagePath } from "@admin/ui/legislature";
import { ActChooser } from "../congress/ActChooser";
import type { ActCommit } from "../congress/commit";
import { Door, Note, RowLink } from "../congress/parts";
import { CitedLawHelp } from "../law/LawHelp";
import { LAW, STEP_STATE, STEP_WORDS, circuitCourt, dueWords, forumOf, governingWords, weeksWords } from "./model";

const OPERATIVE_WORDS: Readonly<Record<ProspectiveOrderAuthority, string>> = {
  ended: "It no longer has any legal force.",
  suspended: "It's on hold for now.",
  "not-yet-effective": "It hasn't taken effect yet.",
  operative: "It can go ahead, as long as it's funded and carried out.",
};

/** The case's path with what the record holds at each step, and beside it what is contested against what governs now. */
export function CasePath({ process, contested, ground }: { readonly process: CaseProcess; readonly contested: string; readonly ground: string }) {
  const governing = governingWords(process.governing, process.operative ? "the order" : "the challenged action");
  const steps = process.steps.map((step) => ({
    id: step.id,
    label: `${STEP_WORDS[step.id]}${step.id === "district" && process.remanded ? " (sent back)" : ""}`,
    state: STEP_STATE[step.state],
    detail: (
      <Column gap="2xs">
        {step.moments.map((moment) => <Text key={moment.date + moment.text} variant="caption"><Text variant="caption" weight="strong">{moment.date}</Text> {moment.text}</Text>)}
        {step.state === "now" && process.next ? <Text variant="caption" tone="accent">Next: {process.next.date}, {weeksWords(process.next.weeks)}</Text> : null}
        {step.state === "now" && process.response ? <Text variant="caption" tone="danger">Your answer due {process.response.date}, {weeksWords(process.response.weeks)}</Text> : null}
      </Column>
    ),
  }));
  return (
    <Card title="Where this case stands" icon="layerReading" help={<CitedLawHelp title="The case path" meaning="Steps with dates have already happened. The highlighted step is where the case is now. The case may never reach the later steps. Sometimes a higher court sends a case back to the district court to look at again." />}>
      <StagePath label="Case path" steps={steps} />
      <Row gap="md" top wrap>
        <Surface level="sunken" pad="md" flex={1} minWidth={240}>
          <Column gap="2xs">
            <Text variant="eyebrow" tone="secondary">What's being challenged</Text>
            <Text variant="label">{contested}</Text>
            <Text variant="caption">{ground}</Text>
          </Column>
        </Surface>
        <Surface level="raised" pad="md" flex={1} minWidth={240} accentEdge={process.governing.kind === "none" ? "success" : process.governing.kind === "final" ? "gold" : "warning"}>
          <Column gap="2xs">
            <Text variant="eyebrow" tone="secondary">What applies right now</Text>
            <Text variant="label">{governing.title}</Text>
            <Text variant="caption">{governing.detail}</Text>
            {process.operative ? <Text variant="caption" weight="strong">The order: {OPERATIVE_WORDS[process.operative]}</Text> : null}
          </Column>
        </Surface>
      </Row>
      {process.stay ? <Note>You asked the court to pause the ruling on {process.stay.requested}. {process.stay.status === "pending" ? "The court hasn't decided yet or set a date." : `It was ${process.stay.status} ${process.stay.decided ?? ""}. A pause is temporary and doesn't decide the case.`}{process.stay.superseded ? " A newer ruling has since replaced the one it paused, so the pause no longer applies." : ""}</Note> : null}
    </Card>
  );
}

/** Answering a lower court that set the order aside: seek review, seek review and a stay, or accept the judgment. */
export function ReviewActions({ campaign, id, acts }: { readonly campaign: Campaign; readonly id: string; readonly acts: ActCommit }) {
  const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order" && entry.subject.recordId === id);
  const response = proceeding && campaign.cases?.[`case:review:${proceeding.id}`];
  if (proceeding?.stage !== "appeal" || proceeding.lower?.holding !== "struck-down" || proceeding.lower.enforcement !== "in-force" || proceeding.governmentReview || !response || !isOpenCase(response.status)) return <StayRequest campaign={campaign} id={id} />;
  const proceedingId = proceeding.id;
  const option = (choice: "seek" | "seek-with-stay" | "accept", label: string, verb: string, review: string, asks: string) => {
    const result = answerLowerOrderReview(campaign, proceedingId, choice);
    return { id: choice, label, verb, review, ...(result.ok ? {} : { refusal: result.reason }), cells: { asks: { lines: [asks] }, follows: { lines: [review] } } };
  };
  return (
    <Card title="Your answer to the lower court" icon="decision" edge="danger">
      <Text variant="body">A lower court has struck down your order, so it's on hold. You can have the Solicitor General, your lawyer before the courts, ask a higher court to review the ruling. You can also ask the court to pause the ruling while it decides. Or you can accept the ruling.</Text>
      <Note>A stay pauses the lower court's ruling while a higher court decides whether to review it. Asking for one doesn't mean you'll get it. The court looks at how strong your legal case is, whether waiting would cause harm that can't be undone, the harm to others, and what's best for the public. If you don't answer by the date on the Desk, the ruling becomes final.</Note>
      <ActChooser id="case-response" title="Answer the lower court" acts={acts} authority={LAW.litigation} again="Back to the case" danger={(choice) => choice === "accept"}
        comparison={{
          rows: [{ key: "asks", label: "What the government asks" }, { key: "follows", label: "What happens next" }],
          waiting: "Your answer is due by the date on the Desk. If you don't answer by then, the ruling becomes final.",
          columns: [
            option("seek", "Ask for a review", "Ask for a review", "The Solicitor General asks a higher court to review the ruling. The ruling still applies in the meantime.", "A review of the ruling"),
            option("seek-with-stay", "Ask for a review and a pause", "Ask for a review and a pause", "The Solicitor General asks a higher court to review the ruling and to pause it in the meantime.", "A review and a pause"),
            option("accept", "Accept the ruling", "Accept the ruling", "Your order stays struck down, and the ruling becomes final.", "Nothing. You accept the ruling"),
          ],
        }}
        receiptTitle={(column) => (column.id === "seek-with-stay" ? "Review and a pause requested" : column.id === "seek" ? "Review requested" : "Ruling accepted")}
        packet={(choice) => {
          const result = answerLowerOrderReview(campaign, proceedingId, choice as "seek" | "seek-with-stay" | "accept");
          if (!result.ok) throw new Error(result.reason);
          return result.packet;
        }} />
    </Card>
  );
}

/** The Supreme Court calendar, the Solicitor General's record and any stay on this case, with what the order may do now. */
function StayRequest({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order" && entry.subject.recordId === id);
  const request = proceeding?.stayApplication;
  if (!request && !proceeding?.calendar && !proceeding?.reviewDecision) return null;
  const counsel = campaign.judiciary.solicitorGeneral?.events.filter((event) => event.proceedingId === proceeding?.id) ?? [];
  const authority = prospectiveOrderAuthority(campaign, id);
  const date = (turn: number) => formatDate(selectDateOfTurn(campaign, turn));
  return (
    <Card title="Court dates and requests to pause" icon="court">
      {proceeding?.calendar ? <Text variant="caption">Term starting October {proceeding.calendar.termYear}. Arguments on {date(proceeding.calendar.argumentTurn)}. The ruling is expected {date(proceeding.calendar.opinionTurn)}, if enough justices can take part. The Court's usual late-June target this term is {date(proceeding.calendar.opinionTargetTurn)}.{proceeding.calendar.status === "carried" ? " Too few justices could take part, so this case moved to a later term." : ""}</Text> : null}
      {proceeding?.reviewDecision ? <Text variant="caption">When the Court looked at taking the case, your Solicitor General's standing with it was {solicitorGeneralAssessment(proceeding.reviewDecision.solicitorGeneralStanding)}.</Text> : null}
      {counsel.map((event) => <Text key={event.kind} variant="caption">{date(event.turn)}: {event.account}</Text>)}
      {request ? <Text variant="caption">Pause requested {date(request.requestedTurn)}{request.decidedTurn === undefined ? "" : `, decided ${date(request.decidedTurn)}`}. {request.status === "pending" ? "There's no decision yet. Asking for a pause didn't pause the lower court's ruling by itself." : request.status === "granted" ? "The court paused the lower court's ruling during the review. This isn't a final decision on the case." : "The court said no to the pause. Asking for a review didn't put the ruling on hold."}</Text> : null}
      <Note>{proceeding?.stage === "final" ? "The final ruling applies now. This request stays in the case history." : "A pause only affects this ruling, and only for now. Other court limits, funding rules, and the order's end date still apply."}</Note>
      <Text variant="caption" weight="strong">{OPERATIVE_WORDS[authority === "ended" || authority === "suspended" || authority === "not-yet-effective" ? authority : "operative"]}</Text>
    </Card>
  );
}

/** The case's identity: court, what was challenged, the ground, and where it is in time. */
export function Identity({ file }: { readonly file: CaseFile }) {
  const fact = (label: string, value: string) => <Column gap="2xs" minWidth={200} flex={1}><Text variant="eyebrow" tone="secondary">{label}</Text><Text variant="caption">{value}</Text></Column>;
  return (
    <Card id="case-identity" title="The case" icon="court">
      <Row wrap gap="md" top>
        {fact("Court", forumOf(file))}
        {fact(file.order ? "Order challenged" : "Case filed", `${file.orderName}, ${file.order ? "signed" : "filed"} ${file.signed}`)}
        {fact("Grounds for the challenge", file.groundWords)}
        {fact(file.status === "pending" ? "Next step" : "Ruled", file.status === "pending" ? dueWords(file) : file.ruled ?? "Date not known")}
      </Row>
      {file.order ? <Door href={place.order(file.order)} title={`Read ${file.orderName}`} icon="order" /> : null}
      {file.lower ? <Note>The lower court {file.lower.holding === "struck-down" ? "struck down" : "upheld"} {file.order ? "the order" : "the challenged practice"}. {file.status === "pending" ? (file.lower.enforcement === "in-force" ? "The order can't start or keep going while this ruling stands." : "That ruling is paused while the appeal goes on.") : file.appeal === "equally-divided" ? "The Supreme Court split evenly, so that ruling stands, but it doesn't set a rule for future cases." : "That ruling is part of the final record."}</Note> : null}
      {file.dismissedAtThreshold ? <Note>The case was thrown out early. No court ruled on whether the order was lawful.</Note> : null}
      {file.interim === "rule-stayed" ? <Note>The rule, which hasn't taken effect yet, is on hold while the case goes on.</Note> : null}
      {file.interim === "rule-paused" && file.partyRelief?.active ? <Note>The rule's effects are on hold while the court reviews how the agency made it.</Note> : null}
      {file.interim === "state-compliance-ordered" ? <Note>The state has to install accessible equipment before Election Day while the case goes on.</Note> : null}
      {file.interim === "construction-obligations-stayed" ? <Note>A temporary court order stops new promises to pay for emergency construction. Work that was already promised can still be paid for.</Note> : null}
      {file.partyRelief?.unquantified ? <Note>The court granted a temporary order, but this game can't tell which of its effects to hold back.</Note> : null}
      {file.endReason ? <Note tone="warning">The order {file.endReason === "sunset" ? "expired" : "was canceled"}{file.ended ? ` on ${file.ended}` : ""}, so it no longer has any effect. The case stays on the court record.</Note> : null}
    </Card>
  );
}

/** A matter brought by parties rather than against an order: who, why the court can hear it, and what is asked. */
export function MatterDetails({ file }: { readonly file: CaseFile }) {
  const matter = file.matter!;
  const subject = file.subject;
  const fact = (label: string, value: string) => <Column key={label + value} gap="2xs" paddingVertical="2xs" borderBottomWidth={1} borderColor="borderColor"><Text variant="eyebrow" tone="secondary">{label}</Text><Text variant="caption">{value}</Text></Column>;
  return (
    <Card id="case-identity" title="The case" icon="record">
      {fact("Parties", matter.parties.map((party) => `${party.name} (${party.role})`).join(", "))}
      {fact("Court", forumOf(file))}
      {fact("Why this court can hear it", matter.jurisdiction)}
      {fact("The harm claimed", matter.injury)}
      {fact(file.status === "pending" ? "Next step" : "Ruled", file.status === "pending" ? dueWords(file) : file.ruled ?? "Date not known")}
      <Text variant="body">{matter.question}</Text>
      {fact("The law at issue", matter.authority)}
      {fact("Facts in dispute", matter.disputedFacts)}
      {fact("What they're asking for", matter.reliefSought)}
      {fact("Who's affected", matter.affected)}
      {matter.evidence?.map((item) => fact("Evidence", item))}
      {file.unreversed ? <Note>{file.unreversed}</Note> : null}
      {file.partyEffects?.map((effect) => <Text key={effect.label} variant="caption">{effect.label}: <Text variant="caption" weight="strong">{effect.value} withheld</Text></Text>)}
      {subject?.kind === "statutory-authority" ? <Row gap="sm" wrap><Door href={place.bill(subject.billId)} title="Read the Act" icon="law" /><Door href={place.order(subject.orderId)} title="Read the priority order" icon="order" /></Row> : null}
      {subject?.kind === "executive-order" ? <Door href={place.order(subject.orderId)} title="Read the challenged order" icon="order" /> : null}
    </Card>
  );
}

/** The question asked and what a ruling does to the government's action. */
export function Issue({ file }: { readonly file: CaseFile }) {
  return (
    <Card title="The question and what's at stake" icon="order">
      <Text variant="body">{file.question}</Text>
      <Note>{file.summary}</Note>
      <Text variant="label">{file.subject?.kind === "state-election-access" ? "What the court order changes" : file.endReason ? "What ended the order's effects" : file.status === "pending" ? "If the Court strikes it down" : file.status === "struck-down" ? "What the ruling undid" : "What striking it down would have undone"}</Text>
      {file.reversedNote ? <Note>{file.reversedNote}</Note> : null}
      {file.reversed.map((effect) => <Row key={effect.label} between gap="sm"><Text variant="caption" flex={1}>{effect.label}</Text><Text variant="caption" weight="strong" tone="danger">{effect.value} undone</Text></Row>)}
      <Note>{file.unreversed ?? "The order didn't spend any federal money, so there's no spending a ruling would leave behind."}</Note>
      {file.status === "pending" ? <Note>Losing in court also costs you some standing and some stability{file.endReason ? "." : ", on top of losing the order."}</Note> : null}
    </Card>
  );
}

/** The district bench's composition and the circuit panel, assigned and as it voted. */
export function LowerBench({ campaign, file }: { readonly campaign: Campaign; readonly file: CaseFile }) {
  if (!file.lowerForum && !file.circuitPanel && !file.circuit) return null;
  const circuit = file.lowerForum?.circuit ?? file.circuit?.court;
  const vacancies = circuit ? Object.values(campaign.institutions).filter((seat) => seat.lowerBenchSeat?.circuit === circuit && seat.vacancy).length : 0;
  const forum = file.lowerForum;
  const person = (id: string) => campaign.people[id as keyof Campaign["people"]];
  return (
    <Card title="The lower courts" icon="court">
      {forum ? (
        <Column gap="xs">
          <Text variant="label">{forum.court}</Text>
          <Text variant="caption">{forum.authorized} judge seats · {forum.vacancies} empty</Text>
          <View height={10} flexDirection="row" borderRadius="chip" overflow="hidden" backgroundColor="borderColor" role="img" aria-label={`${forum.activeDemocratic} judges picked by Democratic presidents and ${forum.activeRepublican} by Republican presidents, out of ${forum.authorized} seats`}>
            <View flexGrow={forum.activeDemocratic} flexBasis={0} backgroundColor="partyDem" />
            <View flexGrow={Math.max(0, forum.authorized - forum.activeDemocratic - forum.activeRepublican)} flexBasis={0} />
            <View flexGrow={forum.activeRepublican} flexBasis={0} backgroundColor="partyRep" />
          </View>
          <Text variant="caption">{forum.activeDemocratic} picked by Democrats · {forum.activeRepublican} picked by Republicans</Text>
          <Note tone="tertiary">As of {forum.sourceDate}. Which party picked a judge tells you who's on the court, not how a judge will rule.</Note>
        </Column>
      ) : null}
      {file.circuitPanel ? (
        <Column gap="2xs">
          <Text variant="caption">Three appeals judges were assigned to the case on {formatDate(selectDateOfTurn(campaign, file.circuitPanel.assignedTurn))}. For the court to rule, at least two of them have to take part, and two have to agree.</Text>
          {file.circuitPanel.assigned.map(({ seatId, judge }) => {
            const who = person(judge);
            const voted = file.circuit?.votes.some((vote) => vote.judge === judge && vote.seatId === seatId);
            const seat = campaign.institutions[seatId];
            const available = seat?.vacancy === false && seat.leader === judge && who?.alive;
            const status = file.circuit ? (voted ? "Took part" : "Didn't take part") : available ? "Assigned" : "Can no longer take part";
            const body = <Row gap="sm" between><Text variant="label" flexShrink={1}>{who?.base.name ?? "Appeals judge"}</Text><Text variant="caption" tone="secondary">{status}</Text></Row>;
            return who?.alive ? <RowLink key={seatId} label={`Open ${who.base.name}'s file. ${status}`} href={place.person(judge)}>{body}</RowLink> : <View key={seatId} padding="sm">{body}</View>;
          })}
          {file.circuitPanel.recusals.map(({ seatId, judge, turn }) => <Note key={`${seatId}:${judge}`}>{person(judge)?.base.name ?? "Appeals judge"} stepped aside on {formatDate(selectDateOfTurn(campaign, turn))} after earlier advising the government on this order.</Note>)}
        </Column>
      ) : null}
      {file.circuit ? (
        <Column gap="2xs">
          <Text variant="caption">The judges of the {circuitCourt(file.circuit.court)} {file.circuit.holding === "struck-down" ? "struck down" : "upheld"} the order.</Text>
          {file.circuitVotes?.map((vote, index) => {
            const key = file.circuit!.votes[index]?.seatId ?? vote.name;
            const verdict = vote.vote === "strike" ? "Strike down" : "Uphold";
            const body = <Row gap="sm" between><Text variant="label" flexShrink={1}>{vote.name}</Text><Text variant="caption" weight="strong">{verdict}</Text></Row>;
            return vote.href ? <RowLink key={key} label={`Open ${vote.name}'s file. Voted to ${verdict.toLowerCase()}`} href={vote.href}>{body}</RowLink> : <View key={key} padding="sm">{body}</View>;
          })}
        </Column>
      ) : null}
      {file.status === "pending" && vacancies > 0 ? <Door href={place.appointments()} title={`${vacancies} judge ${vacancies === 1 ? "seat is" : "seats are"} empty in this region`} detail="Open appointments" icon="appoint" /> : null}
    </Card>
  );
}

/** Related federal acts and the case's remaining steps. */
export function Related({ file }: { readonly file: CaseFile }) {
  return (
    <Card title="What you can still do" icon="decision" help={<CitedLawHelp title="Your options during a case" meaning="You can cancel an order while a challenge to it goes on. The court rules on the facts in the record. Congress can also pass a law that gives an order the legal power a court said it didn't have." cites={[LAW.takeCare, LAW.limits]} />}>
      {file.order ? <Door href={place.order(file.order)} title={file.orderName} detail="The executive order being challenged" icon="order" /> : null}
      {file.status === "pending" ? (
        <>
          <Note>{file.subject?.kind === "state-election-access" ? (file.interim === "state-compliance-ordered" ? "A court has ordered the state to make changes going forward. The installation and the federal case each move on their own schedule before Election Day." : "The state's review, its answer, and the federal case each happen on different dates. The court can order the equipment installed before Election Day.") : file.endReason ? "The order no longer has any effect, but the court still has to decide the case." : "You can cancel the order while the case goes on. The court rules on the facts in the record."}</Note>
          {file.paths.length === 0 && file.order ? <Note>Nothing you can do right now changes your staff's estimate before the ruling.</Note> : null}
          {file.paths.map((path) => <Door key={path.key} href={path.href} title={path.title} detail={path.detail} icon="decision" />)}
        </>
      ) : null}
    </Card>
  );
}
