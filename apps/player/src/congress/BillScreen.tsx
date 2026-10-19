import { useMemo } from "react";
import { hasLawRevisionTakenEffect, otherMajorParty, selectCurrentLaws, selectDateOfTurn, usPartyWord, type Bill, type Campaign, type LegislativeAct } from "@admin/engine";
import { BILL_STAGE_NAME, actEffects, billFundingLines, billPipeline, billRestingLines, billStageReading, billStatusLine, formatDate, lawBindings, sealFor, sponsorWords, whipCount } from "@admin/player-core";
import { BillPaper, Card, Column, Page, Row, Seal, Stamp, Text, VetoPaper, type BillSection, type StampTone } from "@admin/ui";
import { billNumber, introducedBy, originOf, paperYear, vetoMessage } from "./bill-paper";
import { StagePath } from "@admin/ui/legislature";
import { STANCE_TONE } from "./ActChooser";
import { BillCount } from "./BillCount";
import { BillTextControl, BudgetInstruction, DeskActs, Outreach } from "./BillActs";
import { useActCommit } from "./commit";
import { billStateLabel } from "./model";
import { MainAndRail, Note, Paged } from "./parts";
import { BackButton } from "../shell/BackButton";
import { Sponsor } from "./Sponsor";

function Identity({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  const steps = billPipeline(bill);
  const successor = Object.values(campaign.bills).find((entry) => entry.status === "law" && entry.revises?.billId === bill.id && hasLawRevisionTakenEffect(campaign, entry.id));
  const inForce = selectCurrentLaws(campaign).some((entry) => entry.id === bill.id);
  const stale = bill.revises && !hasLawRevisionTakenEffect(campaign, bill.id);
  return (
    <Card title="Where it stands" icon="layerReading">
      <Row wrap gap="lg">
        <Column gap="2xs"><Text variant="eyebrow" tone="secondary">Introduced</Text><Text variant="label">{formatDate(selectDateOfTurn(campaign, bill.introducedTurn))}</Text></Column>
        <Column gap="2xs"><Text variant="eyebrow" tone="secondary">Sponsor</Text><Sponsor campaign={campaign} words={sponsorWords(campaign, bill.sponsor)} /></Column>
        <Column gap="2xs"><Text variant="eyebrow" tone="secondary">Status</Text><Text variant="label">{billStateLabel(campaign, bill)}</Text></Column>
      </Row>
      <StagePath label="The bill's path to law" steps={steps.map((step) => ({ id: step.key, label: step.label, state: step.key === "outcome" && bill.status === "law" ? "done" : step.state }))} />
      {bill.status === "law" && (stale || (!inForce && bill.revises?.kind !== "repeal")) ? (
        <Note tone="warning">{stale ? "It became law after the law it meant to change had already been replaced, so it didn't change anything." : successor ? `Its ongoing parts stopped when ${successor.title} became law. It still shows as passed.` : "Its ongoing parts have ended. It still shows as passed."}</Note>
      ) : null}
    </Card>
  );
}

const STAMP: Readonly<Record<Bill["status"], { readonly tone: StampTone; readonly words: string } | undefined>> = {
  "in-progress": undefined,
  "on-the-desk": { tone: "pending", words: "Awaiting signature" },
  law: { tone: "law", words: "Became law" },
  vetoed: { tone: "refused", words: "Vetoed" },
  dead: { tone: "refused", words: "Died" },
};

/** The bill as Congress prints it: introduced while it moves, enrolled once it is law. Only the bill's own words are on the paper. */
function BillDocument({ campaign, bill, act }: { readonly campaign: Campaign; readonly bill: Bill; readonly act: LegislativeAct }) {
  const introduced = selectDateOfTurn(campaign, bill.introducedTurn);
  const { congress, session } = paperYear(introduced);
  const binds = lawBindings(campaign).find((entry) => entry.bill.id === bill.id)?.binds ?? [];
  const funding = billFundingLines(campaign, act, bill);
  const sections: BillSection[] = [
    { heading: "Short title", body: `This Act may be cited as the \u201c${bill.title.replace(/^The\s+/, "")}\u201d.` },
    { heading: "Purpose", body: act.summary },
    ...(funding.length > 0 ? [{ heading: "Funding", body: funding.map((line) => (/[.!?]$/.test(line.trim()) ? line.trim() : `${line.trim()}.`)).join(" ") }] : []),
    ...(binds.length > 0 ? [{ heading: "Limits on the President", body: binds.join(" ") }] : []),
  ];
  const stamp = STAMP[bill.status];
  const party = usPartyWord(otherMajorParty(campaign.congress.caucusAnchor));
  const opposition = `Members of the ${party === "Democrat" ? "Democratic" : party} caucus`;
  const named = bill.title.replace(/^The\s+/, "");
  return (
    <BillPaper
      congress={congress}
      session={session}
      number={billNumber(bill)}
      chamber={originOf(bill)}
      introduced={formatDate(introduced)}
      introducedBy={introducedBy(bill, opposition)}
      title={bill.title}
      longTitle={`To enact the ${named}, and for other purposes.`}
      sections={sections}
      {...(bill.status === "law" ? { enrolled: enrollment(campaign, bill) } : {})}
      {...(stamp ? { stamp: <Stamp tone={stamp.tone}>{stamp.words}</Stamp> } : {})}
    />
  );
}

/** How the law came to be, as the enrolled print records it: the President's signature only when the President signed it. */
function enrollment(campaign: Campaign, bill: Bill): { readonly signer?: string; readonly endorsement: string } {
  if (bill.enactedBy === "unsigned") return { endorsement: "Became law without the President's signature." };
  if (bill.enactedBy === "veto-overridden") return { endorsement: "Passed over the President's veto." };
  return { signer: campaign.founding.leader.name, endorsement: bill.resolvedTurn === undefined ? "Approved." : `Approved ${formatDate(selectDateOfTurn(campaign, bill.resolvedTurn))}.` };
}

/** The message a vetoed bill went back with, as the President returns it to the chamber it came from. */
function VetoMessage({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  if (bill.status !== "vetoed" && bill.enactedBy !== "veto-overridden") return null;
  const message = vetoMessage(campaign.ledger, bill);
  const date = bill.resolvedTurn === undefined ? undefined : formatDate(selectDateOfTurn(campaign, bill.resolvedTurn));
  return (
    <VetoPaper
      seal={<Seal spec={sealFor("SEAL-PRESIDENT")} size={64} label="Seal of the President of the United States" />}
      chamber={originOf(bill)}
      number={billNumber(bill)}
      title={bill.title}
      objections={message ?? "The objections returned with this bill are not on the record."}
      signer={campaign.founding.leader.name}
      date={date ?? "date not on the record"}
    />
  );
}

/** What the staff expect the bill to do, kept off the paper because it is their estimate, not the bill's text. */
function StaffEstimate({ campaign, bill, act }: { readonly campaign: Campaign; readonly bill: Bill; readonly act: LegislativeAct }) {
  const effects = actEffects(campaign, act);
  const lines = billRestingLines(act, bill);
  return (
    <Card title="Your staff's estimate" icon="layerReading">
      {act.tradeoff ? <Text variant="body">{act.tradeoff}</Text> : null}
      {lines.length === 0 && effects.length === 0 ? <Note>No direct cost or nationwide effect is expected.</Note> : null}
      {lines.map((line) => <Text key={line} variant="caption" tone="secondary">{line}</Text>)}
      {effects.map((effect) => (
        <Row key={effect.label} between gap="sm" paddingVertical="2xs" borderBottomWidth={1} borderColor="borderColor">
          <Text variant="body" flex={1}>{effect.label}</Text>
          <Text variant="label" tabular>{effect.value}</Text>
        </Row>
      ))}
    </Card>
  );
}

function NextStage({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  const reading = billStageReading(campaign, bill);
  if (!reading) return null;
  return (
    <Card title="What's next for it" icon="schedule">
      <Note>{reading.where}</Note>
      {reading.rows.map((row) => (
        <Column key={row.label} gap="2xs" paddingVertical="2xs" borderBottomWidth={1} borderColor="borderColor">
          <Row between gap="sm"><Text variant="caption" tone="secondary">{row.label}</Text><Text variant="label" tone={STANCE_TONE[row.stance]}>{row.value}</Text></Row>
          <Text variant="caption">{row.detail}</Text>
        </Column>
      ))}
    </Card>
  );
}

function History({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  const beats = [...(bill.beats ?? [])].reverse();
  return (
    <Card title="History" icon="record">
      <Paged items={beats} initial={6} noun="entries" empty="Nothing has happened with this bill yet. Updates show up here each week." render={(beat) => (
        <Column key={`${beat.turn}-${beat.stage}`} gap="2xs" paddingVertical="xs" borderBottomWidth={1} borderColor="borderColor">
          <Row between gap="sm"><Text variant="label">{formatDate(selectDateOfTurn(campaign, beat.turn))}</Text><Text variant="caption" tone="secondary">{BILL_STAGE_NAME[beat.stage]}</Text></Row>
          <Text variant="caption">{beat.account}</Text>
        </Column>
      )} />
    </Card>
  );
}

/** A bill as a formal instrument: where it stands, the President's decision when it is due, the text, the votes, outreach and history. */
export function BillScreen({ campaign, bill, act }: { readonly campaign: Campaign; readonly bill: Bill; readonly act: LegislativeAct }) {
  const acts = useActCommit(campaign);
  const whip = useMemo(() => whipCount(campaign, bill), [campaign, bill]);
  const open = bill.status === "in-progress" || bill.status === "on-the-desk";
  const rail = (
    <Column gap="xl" width="100%">
      <NextStage campaign={campaign} bill={bill} />
      <BillCount campaign={campaign} bill={bill} whip={whip} />
      {open ? <Outreach campaign={campaign} bill={bill} acts={acts} /> : null}
    </Column>
  );
  return (
    <Page eyebrow="Congress" icon="law" title={bill.title} lede={billStatusLine(bill)} actions={<BackButton parent="/washington/congress?view=bills" parentLabel="Congress" />}>
      <Identity campaign={campaign} bill={bill} />
      <DeskActs campaign={campaign} bill={bill} acts={acts} />
      <BillTextControl campaign={campaign} bill={bill} acts={acts} />
      <BudgetInstruction campaign={campaign} bill={bill} act={act} acts={acts} />
      <MainAndRail
        main={<>
          <BillDocument campaign={campaign} bill={bill} act={act} />
          <VetoMessage campaign={campaign} bill={bill} />
          <StaffEstimate campaign={campaign} bill={bill} act={act} />
          <History campaign={campaign} bill={bill} />
        </>}
        rail={rail}
      />
      {acts.reviewSheet}
    </Page>
  );
}
