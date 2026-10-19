import { useMemo, useState } from "react";
import { actForText, amendableAct, committeeName, hasLawRevisionTakenEffect, hasReconciliationInstruction, proposeBillText, reconciliationSubject, requestBudgetResolution, recommendBillConferenceText, selectCurrentLaws, selectDateOfTurn, selectSigningWindow, type Bill, type BillText, type Campaign, type HillPostId, type LegislativeAct } from "@admin/engine";
import {
  actEffects,
  BILL_STAGE_NAME,
  billPipeline,
  billFundingLines,
  billRestingLines,
  billStageReading,
  billStatusLine,
  deskComparison,
  deskPacket,
  formatDate,
  hillPosts,
  lawBindings,
  overrideReading,
  place,
  sponsorWords,
  whipCount,
  type ActComparison,
} from "@admin/player-core";
import { NativeSelect, Button, Card, CardContent, Collection, Document, Field, Icon, Tag, type DocumentSection, type DocumentState } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import { valenceOf } from "../../shell/valence";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { BillCount } from "./BillCount";
import { HillAct, useHillCommit, type HillCommit } from "./HillAct";
import { LobbyActs } from "./LobbyActs";
import "./congress.css";
import "./tables.css";

function Identity({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  const steps = billPipeline(bill);
  const current = steps.find((step) => step.state === "current");
  const successor = Object.values(campaign.bills).find((entry) => entry.status === "law"
    && entry.revises?.billId === bill.id && hasLawRevisionTakenEffect(campaign, entry.id));
  const inForce = selectCurrentLaws(campaign).some((entry) => entry.id === bill.id);
  const stale = bill.revises && !hasLawRevisionTakenEffect(campaign, bill.id);
  return (
    <Card role="region" aria-labelledby="bill-stage"><CardContent className="grid gap-4 pt-5">
      <h2 id="bill-stage" className="hill-section__title">
        <Icon name="layerReading" size={20} /> Where it stands
      </h2>
      <dl className="identity">
        <div>
          <dt>Introduced</dt>
          <dd>{formatDate(selectDateOfTurn(campaign, bill.introducedTurn))}</dd>
        </div>
        <div>
          <dt>Sponsor</dt>
          <dd>{sponsorWords(campaign, bill.sponsor)}</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>{current?.label}</dd>
        </div>
      </dl>
      <ol className="pipeline" aria-label={`Stage: ${current?.label ?? ""}`}>
        {steps.map((step) => (
          <li key={step.key} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined}>
            <Icon name={step.state === "done" ? "approve" : step.state === "current" ? "pending" : "schedule"} size={16} />
            {step.label}
            <span className="ui-visually-hidden">{step.state === "done" ? ", completed" : step.state === "current" ? ", current" : ", not reached"}</span>
          </li>
        ))}
      </ol>
      <p className="hill-note">{billStatusLine(bill)}</p>
      {bill.status === "law" && (stale || (!inForce && bill.revises?.kind !== "repeal")) ? <p className="hill-note">
        {stale ? "It was enacted after its predecessor was superseded, so it did not change current law."
          : successor ? `Its continuing provisions ended when ${successor.title} became law. The enactment remains on the record.`
            : "Its continuing provisions have ended. The enactment remains on the record."}
      </p> : null}
    </CardContent></Card>
  );
}

function DeskActs({ campaign, bill, acts }: { readonly campaign: Campaign; readonly bill: Bill; readonly acts: HillCommit }) {
  const comparison = useMemo(() => deskComparison(campaign, bill.id), [campaign, bill.id]);
  const [reason, setReason] = useState("");
  const act = actForText(bill.act, bill.text?.enrolled ?? "base");
  const objections = [
    { id: "policy", label: "Reject the policy approach", message: `I return the ${bill.title} to Congress because I disagree with its policy approach.` },
    ...(act && billFundingLines(campaign, act, bill).length ? [{ id: "fiscal", label: "Reject the fiscal terms", message: `I return the ${bill.title} to Congress because I object to the fiscal terms in this measure.` }] : []),
    { id: "revision", label: "Request revised provisions", message: `I return the ${bill.title} to Congress and ask that its present provisions be reconsidered before I can approve it.` },
  ];
  const objection = objections.find((entry) => entry.id === reason)?.message ?? "";
  const received = acts.committed && acts.by === "desk" ? acts.committed : undefined;
  if (!comparison && !received) return null;
  const override = bill.status === "on-the-desk" ? overrideReading(campaign, bill) : undefined;
  const deadline = bill.status === "on-the-desk" ? formatDate(selectSigningWindow(campaign, bill).deadline) : undefined;
  return (
    <Card role="region" aria-labelledby="bill-desk"><CardContent className="grid gap-4 pt-5">
      <h2 id="bill-desk" className="hill-section__title">
        <Icon name="sign" size={20} /> Presidential decision
      </h2>
      {deadline && !received ? (
        <p className="deadline">
          <Tag tone="caution" icon="schedule">
            Deadline {deadline}
          </Tag>{" "}
          Sign or return it by then, or it becomes law without your signature.
        </p>
      ) : null}
      {override && !received ? (
        <div className="ledger__row" data-valence={valenceOf(override.stance)}>
          <span className="ledger__title ui-valence-ink" data-valence={valenceOf(override.stance)}>
            {override.headline}
          </span>
          <p className="ledger__line">{override.detail}</p>
        </div>
      ) : null}
      {received ? (
        <ActReceipt committed={received} again="Back to the bill" onAgain={acts.dismiss} mapNote={null} />
      ) : comparison ? (
        <HillAct tier="full"
          id="desk"
          title="Compare signing and vetoing"
          comparison={comparison}
          acts={acts}
          packet={(option) => deskPacket(campaign, bill.id, option === "veto" ? "veto" : "sign", objection)}
          pending={(option) => (option === "veto" && objection.trim() === "" ? "Choose a veto objection above before you return it." : undefined)}
          projectAs={{ campaign, act: (option) => ({ act: "bill-desk", bill: bill.id, choice: option === "veto" ? "veto" : "sign", objection }) }}
          again="Back to the bill"
          receiptTitle={(column) => `${column.id === "veto" ? "Vetoed" : "Signed into law"}: ${bill.title}`}
          terms={
            <div className="grid gap-3">
              <Field label="Veto objection" hint="Choose an objection if you intend to veto. Signing does not need one.">{(control) => <NativeSelect {...control} value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Choose an objection</option>{objections.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</NativeSelect>}</Field>
              {objection ? <p className="m-0 rounded-md bg-muted p-3 text-sm" aria-live="polite">{objection}</p> : null}
              {act?.tradeoff ? <p className="m-0 text-xs text-muted-foreground">Policy context: {act.tradeoff}</p> : null}
            </div>
          }
        />
      ) : null}
    </CardContent></Card>
  );
}

const STATE_OF: Readonly<Record<Bill["status"], DocumentState>> = { "in-progress": "pending", "on-the-desk": "pending", law: "in-effect", vetoed: "vetoed", dead: "expired" };

function stateLabel(campaign: Campaign, bill: Bill): string {
  if (bill.status === "in-progress") return "In Congress";
  if (bill.status === "on-the-desk") return "Awaiting signature";
  if (bill.status === "dead") return "Died in Congress";
  if (bill.status === "vetoed") return "Vetoed";
  if (bill.revises && !hasLawRevisionTakenEffect(campaign, bill.id)) return "Enacted without effect";
  if (bill.revises?.kind === "repeal") return "Repeal enacted";
  if (!selectCurrentLaws(campaign).some((entry) => entry.id === bill.id)) return "Superseded law";
  return bill.enactedBy === "unsigned" ? "Law without signature" : bill.enactedBy === "veto-overridden" ? "Law over veto" : "Law";
}

function sectionsOf(campaign: Campaign, bill: Bill, act: LegislativeAct): readonly DocumentSection[] {
  const effects = actEffects(campaign, act);
  const funding = billFundingLines(campaign, act, bill);
  const resting = billRestingLines(act, bill);
  const binds = lawBindings(campaign).find((entry) => entry.bill.id === bill.id)?.binds ?? [];
  return [
    { heading: "Summary", body: <p>{act.summary}</p> },
    ...(act.tradeoff ? [{ heading: "Competing interests", body: <p>{act.tradeoff}</p> }] : []),
    {
      heading: "Estimated fiscal and national effects",
      body:
        effects.length > 0 || funding.length > 0 || resting.length > 0 ? (
          <ul className="effects" aria-label="What it moves">
            {funding.map((line) => <li key={line}><span>{line}</span></li>)}
            {resting.map((line) => <li key={line}><span>{line}</span></li>)}
            {effects.map((effect) => (
              <li key={effect.label}>
                <span>{effect.label}</span>
                <strong>{effect.value}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>No direct fiscal or national effect is modeled.</p>
        ),
    },
    ...(binds.length > 0 ? [{ heading: "Limits on the presidency", body: <ul>{binds.map((line) => <li key={line}>{line}</li>)}</ul> }] : []),
  ];
}

const TEXT_NAMES: Readonly<Record<string, Readonly<Record<BillText, string>>>> = {
  "act-housing-supply": { base: "Original grants", targeted: "Targeted grants" },
  "act-health-coverage": { base: "Broad premium assistance", targeted: "Lower-income assistance" },
  "act-clean-grid": { base: "New routes and hardening", targeted: "Existing-corridor hardening" },
};
const textName = (bill: Bill, text: BillText) => TEXT_NAMES[bill.act]?.[text] ?? (text === "base" ? "Original text" : "Targeted text");

function BillTextControl({ campaign, bill, acts }: { readonly campaign: Campaign; readonly bill: Bill; readonly acts: HillCommit }) {
  if (!amendableAct(bill.act)) return null;
  const text = bill.text;
  const inMarkup = bill.status === "in-progress" && bill.stage === "markup";
  const inConference = bill.status === "in-progress" && bill.stage === "conference";
  const options: readonly BillText[] = inConference ? ["base", "targeted"] : ["targeted"];
  const comparison: ActComparison = {
    rows: [{ key: "scope", label: "Provisions" }, { key: "books", label: "Annual funding" }, { key: "votes", label: "What happens next" }],
    columns: [
      ...options.map((choice) => {
        const offered: Bill = { ...bill, text: { ...text, enrolled: choice } };
        const variant = actForText(bill.act, choice)!;
        const annual = billFundingLines(campaign, variant, offered);
        const result = inConference ? recommendBillConferenceText(campaign, bill.id, choice) : proposeBillText(campaign, bill.id);
        return {
          id: choice, label: textName(bill, choice), verb: inConference ? `Recommend ${textName(bill, choice).toLowerCase()}` : "Propose targeted amendment",
          ...(result.ok ? {} : { refusal: result.reason }),
          review: inConference ? `Recommend ${textName(bill, choice).toLowerCase()} for a new vote in both chambers.` : "Ask the Senate to consider the narrower provisions in markup.",
          cells: { scope: { lines: [variant.summary, variant.tradeoff ?? ""] }, books: { lines: annual }, votes: { lines: ["Congress must approve the text; this recommendation does not pass the bill."] } },
        };
      }),
    ],
    waiting: "Without a recommendation, Congress continues on its present course.",
  };
  return (
    <Card role="region" aria-labelledby="bill-text"><CardContent className="grid gap-4 pt-5">
      <h2 id="bill-text" className="hill-section__title"><Icon name="layerReading" size={20} /> Bill provisions</h2>
      <p className="hill-note">House: {text?.house ? textName(bill, text.house) : "No recorded vote"}. Senate: {text?.senate ? textName(bill, text.senate) : "No recorded vote"}. {text?.enrolled ? `Enrolled: ${textName(bill, text.enrolled)}.` : inConference ? `Different texts passed; no bill can reach the President until both chambers pass the same text.${text?.conference ? ` Recommended: ${textName(bill, text.conference)}.` : ""}` : text?.proposed ? "Targeted amendment proposed; Congress has not adopted it." : "Original provisions are before Congress."}</p>
      {text?.initialPassage?.map((vote) => <p className="hill-note" key={vote.chamber}>{vote.chamber === "house" ? "House" : "Senate"}: {vote.yeas} for, {vote.nays} against.</p>)}
      {(inMarkup && !text?.proposed) || (inConference && !text?.conference) ? (
        <HillAct tier="confirm" id="bill-text" title={inConference ? "Recommend a common text" : "Propose an amendment"} comparison={comparison} acts={acts}
          packet={(choice) => {
            const result = inConference ? recommendBillConferenceText(campaign, bill.id, choice as BillText) : proposeBillText(campaign, bill.id);
            if (!result.ok) throw new Error(result.reason);
            return result.packet;
          }} again="Back to the bill" />
      ) : null}
    </CardContent></Card>
  );
}

function NextStage({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  const reading = billStageReading(campaign, bill);
  if (!reading) return null;
  return (
    <Card role="region" aria-labelledby="bill-week"><CardContent className="grid gap-4 pt-5">
      <h2 id="bill-week" className="hill-section__title">
        <Icon name="schedule" size={20} /> Assessed next stage
      </h2>
      <p className="hill-note">{reading.where}</p>
      <dl className="stage-rows">
        {reading.rows.map((row) => (
          <div key={row.label} className="stage-row" data-valence={valenceOf(row.stance)}>
            <dt>{row.label}</dt>
            <dd className="stage-row__value ui-valence-ink" data-valence={valenceOf(row.stance)}>
              {row.value}
            </dd>
            <dd className="ledger__line">{row.detail}</dd>
          </div>
        ))}
      </dl>
    </CardContent></Card>
  );
}

function BudgetInstruction({ campaign, bill, act, acts }: { readonly campaign: Campaign; readonly bill: Bill; readonly act: LegislativeAct; readonly acts: HillCommit }) {
  const subject = reconciliationSubject(act);
  if (!subject) return null;
  const records = (campaign.congress.budgetResolutions ?? []).filter((entry) => entry.billId === bill.id);
  const current = records[records.length - 1];
  const active = hasReconciliationInstruction(campaign, act, bill.id);
  const request = requestBudgetResolution(campaign, bill.id);
  const comparison: ActComparison = { rows: [
    { key: "procedure", label: "Senate procedure" },
    { key: "vote", label: "Congressional decision" },
  ], columns: [
    { id: "request", label: "Ask for a budget instruction", verb: "Ask Congress to vote",
      ...(request.ok ? {} : { refusal: request.reason }),
      review: `Ask both chambers for a ${subject} instruction to the ${committeeName(act.committee ?? "")}. The concurrent resolution is Congress's decision; it does not become law or grant the bill's benefits.`,
      cells: { procedure: { lines: ["A matching instruction permits a Senate majority route only if both chambers adopt it."] },
        vote: { lines: [request.ok ? "The House and Senate each vote; their counts are recorded after the decision." : "No vote available now."] } } },
  ], waiting: "Without an instruction, the bill stays on the ordinary path, with a separate Senate cloture vote." };
  return (
    <Card role="region" aria-labelledby="bill-budget-instruction"><CardContent className="grid gap-4 pt-5">
      <h2 id="bill-budget-instruction" className="hill-section__title"><Icon name="subjectChamber" size={20} /> Budget instruction</h2>
      <p className="hill-note">{current ? `${current.adopted ? "Adopted" : "Rejected"} for fiscal year ${current.fiscalYear}. ${active ? "This bill can use reconciliation." : "This bill remains on the ordinary route unless Congress adopts a current instruction."}` : "No budget instruction has been adopted for this bill. Its Senate route still needs cloture."}</p>
      {current?.votes.map((vote) => <p className="hill-note" key={vote.chamber}>{vote.chamber === "house" ? "House" : "Senate"}: {vote.yeas} for, {vote.nays} against.</p>)}
      {bill.status === "in-progress" && !active ? <HillAct tier="confirm" id="budget-instruction" title="Ask Congress for a budget instruction" comparison={comparison} acts={acts}
        packet={() => {
          const result = requestBudgetResolution(campaign, bill.id);
          if (!result.ok) throw new Error(result.reason);
          return result.packet;
        }} again="Back to the bill" /> : null}
    </CardContent></Card>
  );
}

function Outreach({ campaign, bill, acts }: { readonly campaign: Campaign; readonly bill: Bill; readonly acts: HillCommit }) {
  const posts = hillPosts(campaign);
  const [post, setPost] = useState<HillPostId | undefined>(posts[0]?.id);
  if (!post) return null;
  const chosen = posts.find((entry) => entry.id === post);
  return (
    <Card role="region" aria-labelledby="bill-lobby"><CardContent className="grid gap-4 pt-5">
      <h2 id="bill-lobby" className="hill-section__title">
        <Icon name="ballot" size={20} /> Legislative outreach
      </h2>
      <Field label="Member to work">
        {(control) => (
          <NativeSelect {...control} className="ui-input" value={post} onChange={(event) => setPost(event.target.value as HillPostId)}>
            {posts.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}, {entry.title}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      {chosen ? (
        <p className="hill-note">
          <Button asChild kind="secondary"><Door href={`${place.post(chosen.id)}?bill=${encodeURIComponent(bill.id)}`}>{chosen.title}<Icon name="chevron" size={16} /></Door></Button>
        </p>
      ) : null}
      <LobbyActs campaign={campaign} acts={acts} post={post} />
    </CardContent></Card>
  );
}

function History({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  const beats = [...(bill.beats ?? [])].reverse();
  return (
    <Card role="region" aria-labelledby="bill-history"><CardContent className="grid gap-4 pt-5">
      <h2 id="bill-history" className="hill-section__title">
        <Icon name="record" size={20} /> History
      </h2>
      <Collection
        items={beats}
        initial={6}
        noun="entries"
        className="ledger"
        empty="No weekly action has been recorded on this bill yet."
        render={(beat) => (
          <li key={`${beat.turn}-${beat.stage}`} className="ledger__row">
            <div className="ledger__head">
              <span className="ledger__title">{formatDate(selectDateOfTurn(campaign, beat.turn))}</span>
              <span className="ledger__meta">{BILL_STAGE_NAME[beat.stage]}</span>
            </div>
            <p className="ledger__line">{beat.account}</p>
          </li>
        )}
      />
    </CardContent></Card>
  );
}

/** A bill as a formal instrument: identity and stage rail, the presidential decision when it is due, the text and its effects, the assessed next stage, outreach and history. */
export function BillScreen({ campaign, bill, act }: { readonly campaign: Campaign; readonly bill: Bill; readonly act: LegislativeAct }) {
  const acts = useHillCommit(campaign);
  const whip = useMemo(() => whipCount(campaign, bill), [campaign, bill]);
  const open = bill.status === "in-progress" || bill.status === "on-the-desk";
  return (
    <Screen icon="law" title={bill.title} eyebrow={sponsorWords(campaign, bill.sponsor)} lede={<Button asChild kind="ghost" size="sm"><Door href="/washington/congress">Congress<Icon name="chevron" size={14} /></Door></Button>} screenClass="workspace" camera="us">
      <div className="hill-room">
        <Identity campaign={campaign} bill={bill} />
        <BillTextControl campaign={campaign} bill={bill} acts={acts} />
        <BudgetInstruction campaign={campaign} bill={bill} act={act} acts={acts} />
        <DeskActs campaign={campaign} bill={bill} acts={acts} />
        <div className="bill-grid">
          <div className="bill-grid__main">
            <Document
              issuer="United States Congress"
              kind="Bill"
              title={bill.title}
              dated={`Introduced ${formatDate(selectDateOfTurn(campaign, bill.introducedTurn))}`}
              state={bill.status === "law" && (bill.revises && !hasLawRevisionTakenEffect(campaign, bill.id)
                || bill.revises?.kind !== "repeal" && !selectCurrentLaws(campaign).some((entry) => entry.id === bill.id))
                ? "expired" : STATE_OF[bill.status]}
              stateLabel={stateLabel(campaign, bill)}
              sections={sectionsOf(campaign, bill, act)}
            />
            <History campaign={campaign} bill={bill} />
          </div>
          <div className="bill-grid__rail">
            <NextStage campaign={campaign} bill={bill} />
            <BillCount campaign={campaign} bill={bill} whip={whip} />
            {open ? <Outreach campaign={campaign} bill={bill} acts={acts} /> : null}
          </div>
        </div>
      </div>
    </Screen>
  );
}
