import { useMemo, useState } from "react";
import { actForText, amendableAct, committeeName, hasReconciliationInstruction, proposeBillText, reconciliationSubject, recommendBillConferenceText, requestBudgetResolution, selectSigningWindow, type Bill, type BillText, type Campaign, type HillPostId, type LegislativeAct } from "@admin/engine";
import { LOBBY_APPROACHES, billFundingLines, deskComparison, deskPacket, formatDate, hillPosts, lobbyComparison, lobbyPacket, overrideReading, place, type ActComparison } from "@admin/player-core";
import { Badge, Card, Column, Select, Surface, Text } from "@admin/ui";
import { ActChooser, STANCE_TONE } from "./ActChooser";
import type { ActCommit } from "./commit";
import { LAW, textName, vetoObjections } from "./model";
import { Door, Note } from "./parts";
import { CitedLawHelp } from "../law/LawHelp";

/** Signing against returning it with objections: the deadline, the override count, and one named verb, through the review. */
export function DeskActs({ campaign, bill, acts }: { readonly campaign: Campaign; readonly bill: Bill; readonly acts: ActCommit }) {
  const comparison = useMemo(() => deskComparison(campaign, bill.id), [campaign, bill.id]);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const act = actForText(bill.act, bill.text?.enrolled ?? "base");
  const objections = vetoObjections(bill.title, act ? billFundingLines(campaign, act, bill).length > 0 : false);
  const objection = objections.find((entry) => entry.id === reason)?.message ?? "";
  const received = acts.committed && acts.by === "desk";
  if (!comparison && !received) return null;
  const onDesk = bill.status === "on-the-desk";
  const override = onDesk ? overrideReading(campaign, bill) : undefined;
  return (
    <Card id="bill-desk" title="Your decision" icon="sign" edge="gold" help={<CitedLawHelp title="Signing or vetoing a bill" meaning="Once a bill passes both the House and the Senate, it comes to you. If you sign it, it becomes law. If you veto it, you send it back with your reasons, and it becomes law only if two-thirds of each chamber vote to override you. If you do neither for ten days (not counting Sundays) while Congress is in session, it becomes law without your signature." cites={[LAW.presentment]} />}>
      {onDesk && !received ? <Badge status="warning" icon="schedule">{`Decide by ${formatDate(selectSigningWindow(campaign, bill).deadline)}`}</Badge> : null}
      {onDesk && !received ? <Note>If you don't sign or veto it by then, it becomes law without your signature.</Note> : null}
      {override && !received ? (
        <Surface level="sunken" pad="md">
          <Column gap="2xs">
            <Text variant="label" tone={STANCE_TONE[override.stance]}>{override.headline}</Text>
            <Text variant="caption">{override.detail}</Text>
          </Column>
        </Surface>
      ) : null}
      {comparison || received ? (
        <ActChooser
          id="desk"
          title="Compare signing and vetoing"
          comparison={comparison ?? { rows: [], columns: [] }}
          acts={acts}
          authority={LAW.presentment}
          packet={(option) => deskPacket(campaign, bill.id, option === "veto" ? "veto" : "sign", objection)}
          pending={(option) => (option === "veto" && objection.trim() === "" ? "Pick a reason for your veto first, then send the bill back." : undefined)}
          danger={(option) => option === "veto"}
          again="Back to the bill"
          receiptTitle={(column) => `${column.id === "veto" ? "Vetoed" : "Signed into law"}: ${bill.title}`}
          terms={
            <Column gap="sm">
              <Select label="Your reason for a veto (you don't need one to sign)" options={objections.map((entry) => ({ value: entry.id, label: entry.label, detail: entry.message }))} value={reason} onChange={setReason} placeholder="Pick a reason" />
              {act?.tradeoff ? <Note tone="tertiary">{act.tradeoff}</Note> : null}
            </Column>
          }
        />
      ) : null}
    </Card>
  );
}

/** Proposing a narrower text in markup, or recommending a common text in conference; Congress must still pass it. */
export function BillTextControl({ campaign, bill, acts }: { readonly campaign: Campaign; readonly bill: Bill; readonly acts: ActCommit }) {
  if (!amendableAct(bill.act)) return null;
  const text = bill.text;
  const inMarkup = bill.status === "in-progress" && bill.stage === "markup";
  const inConference = bill.status === "in-progress" && bill.stage === "conference";
  const options: readonly BillText[] = inConference ? ["base", "targeted"] : ["targeted"];
  const comparison: ActComparison = {
    rows: [{ key: "scope", label: "What it does" }, { key: "books", label: "Funding each year" }, { key: "votes", label: "What happens next" }],
    columns: [
      ...options.map((choice) => {
        const variant = actForText(bill.act, choice)!;
        const result = inConference ? recommendBillConferenceText(campaign, bill.id, choice) : proposeBillText(campaign, bill.id);
        return {
          id: choice,
          label: textName(bill, choice),
          verb: inConference ? `Recommend ${textName(bill, choice).toLowerCase()}` : "Propose the narrower version",
          ...(result.ok ? {} : { refusal: result.reason }),
          review: inConference ? `Ask both chambers to vote again, this time on ${textName(bill, choice).toLowerCase()}.` : "Ask the Senate committee working on the bill to consider a narrower version.",
          cells: { scope: { lines: [variant.summary, variant.tradeoff ?? ""] }, books: { lines: billFundingLines(campaign, variant, { ...bill, text: { ...text, enrolled: choice } }) }, votes: { lines: ["Congress still has to vote on it. Your suggestion alone doesn't pass the bill."] } },
        };
      }),
    ],
  };
  const status = text?.enrolled ? `Final version: ${textName(bill, text.enrolled)}.` : inConference ? `The House and Senate passed different versions. The bill can't reach you until both pass the same one.${text?.conference ? ` You suggested ${textName(bill, text.conference).toLowerCase()}.` : ""}` : text?.proposed ? "You proposed a narrower version. Congress hasn't accepted it yet." : "Congress is working on the original version.";
  return (
    <Card title="What's in the bill" icon="layerReading">
      <Note>House: {text?.house ? textName(bill, text.house) : "Hasn't voted"}. Senate: {text?.senate ? textName(bill, text.senate) : "Hasn't voted"}. {status}</Note>
      {text?.initialPassage?.map((vote) => <Note key={vote.chamber}>{vote.chamber === "house" ? "House" : "Senate"}: {vote.yeas} for, {vote.nays} against.</Note>)}
      {(inMarkup && !text?.proposed) || (inConference && !text?.conference) ? (
        <ActChooser id="bill-text" title={inConference ? "Suggest one version for both chambers" : "Propose a change"} comparison={comparison} acts={acts} authority={LAW.recommend} again="Back to the bill"
          packet={(choice) => {
            const result = inConference ? recommendBillConferenceText(campaign, bill.id, choice as BillText) : proposeBillText(campaign, bill.id);
            if (!result.ok) throw new Error(result.reason);
            return result.packet;
          }} />
      ) : null}
    </Card>
  );
}

/** Asking both chambers for a budget instruction that would let the Senate pass this bill by majority under reconciliation. */
export function BudgetInstruction({ campaign, bill, act, acts }: { readonly campaign: Campaign; readonly bill: Bill; readonly act: LegislativeAct; readonly acts: ActCommit }) {
  const subject = reconciliationSubject(act);
  if (!subject) return null;
  const records = (campaign.congress.budgetResolutions ?? []).filter((entry) => entry.billId === bill.id);
  const current = records[records.length - 1];
  const active = hasReconciliationInstruction(campaign, act, bill.id);
  const request = requestBudgetResolution(campaign, bill.id);
  const comparison: ActComparison = {
    rows: [{ key: "procedure", label: "How the Senate handles it" }, { key: "vote", label: "What Congress votes on" }],
    columns: [
      { id: "request", label: "Ask for a budget instruction", verb: "Ask Congress to vote", ...(request.ok ? {} : { refusal: request.reason }), review: `Ask the House and Senate to pass a budget plan with a ${subject} instruction to the ${committeeName(act.committee ?? "")}. Whether they pass it is up to Congress. The plan isn't a law, and it doesn't deliver anything the bill promises.`, cells: { procedure: { lines: ["If both chambers pass the same instruction, the Senate can pass this bill with a simple majority."] }, vote: { lines: [request.ok ? "The House and Senate each vote on it, and you'll see the results afterward." : "Congress can't vote on this right now."] } } },
    ],
  };
  return (
    <Card title="Budget instruction" icon="subjectChamber">
      <Note>{current ? `Congress ${current.adopted ? "passed" : "turned down"} a budget instruction for fiscal year ${current.fiscalYear}. ${active ? "This bill can now pass the Senate with a simple majority." : "This bill keeps to the usual process unless Congress passes a new instruction."}` : "Congress hasn't passed a budget instruction for this bill. Without one, three-fifths of the Senate must vote to end debate before it can pass."}</Note>
      {current?.votes.map((vote) => <Note key={vote.chamber}>{vote.chamber === "house" ? "House" : "Senate"}: {vote.yeas} for, {vote.nays} against.</Note>)}
      {bill.status === "in-progress" && !active ? (
        <ActChooser id="budget-instruction" title="Ask Congress for a budget instruction" comparison={comparison} acts={acts} authority={LAW.reconciliation} again="Back to the bill"
          packet={() => {
            const result = requestBudgetResolution(campaign, bill.id);
            if (!result.ok) throw new Error(result.reason);
            return result.packet;
          }} />
      ) : null}
    </Card>
  );
}

/** Every way to work one member, against leaving them be. */
export function LobbyActs({ campaign, acts, post }: { readonly campaign: Campaign; readonly acts: ActCommit; readonly post: HillPostId }) {
  const comparison = useMemo(() => lobbyComparison(campaign, post), [campaign, post]);
  if (!comparison) return <Note>This post is empty right now, so there's no one to reach out to.</Note>;
  return (
    <ActChooser key={post} id={`lobby:${post}`} title="Compare ways to reach out" comparison={comparison} acts={acts} authority={LAW.recommend} again="Compare again"
      packet={(option) => {
        const approach = LOBBY_APPROACHES.find((entry) => entry === option);
        if (!approach) throw new Error("Pick a way to reach out first.");
        return lobbyPacket(campaign, post, approach);
      }} />
  );
}

/** The member to work on this bill, their post's screen, and the approaches. */
export function Outreach({ campaign, bill, acts }: { readonly campaign: Campaign; readonly bill: Bill; readonly acts: ActCommit }) {
  const posts = hillPosts(campaign);
  const [post, setPost] = useState<HillPostId | undefined>(posts[0]?.id);
  const chosen = posts.find((entry) => entry.id === post);
  if (!post) return null;
  return (
    <Card title="Reach out to Congress" icon="ballot">
      <Select label="Member to reach out to" options={posts.map((entry) => ({ value: entry.id, label: `${entry.name}, ${entry.title}` }))} value={post} onChange={setPost} />
      {chosen ? <Door href={`${place.post(chosen.id)}?bill=${encodeURIComponent(bill.id)}`} title={chosen.title} detail={`${chosen.name} · ${chosen.standing.word} ${chosen.standing.percent} toward you`} icon="subjectPerson" /> : null}
      <LobbyActs campaign={campaign} acts={acts} post={post} />
    </Card>
  );
}
