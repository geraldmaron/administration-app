import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import {
  REPORT_AUTHORITIES,
  REPORT_WEEKS,
  authorizationComparison,
  authorizationPacket,
  extensionComparison,
  extensionGrounds,
  extensionNotices,
  extensionPacket,
  reportComparison,
  reportPacket,
  terminateComparison,
  terminatePacket,
  WAR_POWERS_ANCHOR,
  type ExtensionNotice,
  type WarAuthorization,
  type WarPaper,
} from "@admin/player-core";
import { Pane, ChoiceList, Column, ReadingFrame, Row, Surface, Text } from "@admin/ui";
import { StatuteClock } from "@admin/ui/world";
import { SetAct, type WorldActs } from "../acts";
import { CLOCK_KEY, CiteById, LawChips, TopicLaw } from "../parts";
import { reportAuthority, topicAuthorities } from "../law";

type Acts = { readonly acts: WorldActs };

/** The War Powers Resolution, cited on every act that answers its clocks. */
const WPR = () => topicAuthorities("war-powers").slice(0, 1);

/** Asking Congress for the authority to fight a belligerent, so going in does not start the sixty-day clock. */
export function AuthorizationAct({ campaign, authorization, acts }: { readonly campaign: Campaign; readonly authorization: WarAuthorization } & Acts) {
  const comparison = useMemo(() => authorizationComparison(campaign, authorization.nation), [campaign, authorization.nation]);
  return <SetAct title={`Ask Congress to approve force against ${authorization.name}, or go ahead without asking`} comparison={comparison} acts={acts} packet={() => authorizationPacket(campaign, authorization.nation)} receiptTitle={() => `Congress asked to approve force against ${authorization.name}`} law={topicAuthorities("war-powers")} />;
}

function AuthorizationLine({ campaign, authorization, acts }: { readonly campaign: Campaign; readonly authorization: WarAuthorization } & Acts) {
  if (authorization.state === "open") return <AuthorizationAct campaign={campaign} authorization={authorization} acts={acts} />;
  return (
    <Text variant="body" tone="secondary">
      {authorization.state === "covered" ? `${authorization.title ?? "An authorization"} covers force against ${authorization.name}.` : `Congress is considering a vote to approve force against ${authorization.name}. The vote happens when you continue.`}
    </Text>
  );
}

/** Certifying the thirty days on one of a fixed set of grounds, against letting the sixty run out. */
function ExtensionAct({ campaign, notice, acts }: { readonly campaign: Campaign; readonly notice: ExtensionNotice } & Acts) {
  const grounds = useMemo(() => extensionGrounds(notice.target), [notice.target]);
  const [necessity, setNecessity] = useState<string>(grounds[0]!.value);
  if (notice.certified !== undefined) return <Text variant="body"><Text variant="body" weight="strong">You added 30 days for this reason. </Text>{notice.certified}</Text>;
  if (notice.refusal) return <Text variant="body" tone="secondary"><Text variant="body" weight="strong">You can't add 30 days right now. </Text>{notice.refusal}</Text>;
  return (
    <SetAct
      title={`Add 30 days to the deadline in ${notice.target}, or let it run out`}
      comparison={extensionComparison(notice)}
      acts={acts}
      tone="danger"
      packet={() => extensionPacket(campaign, notice.id, necessity)}
      receiptTitle={() => "30 days added to the deadline"}
      law={WPR()}
      terms={<ChoiceList label="Why you need more time" help="Congress will hold you to the reason you give." options={grounds} value={necessity} onChange={setNecessity} />}
    />
  );
}

/** Filing the report Congress is owed, or bringing the force out, each against leaving things as they are. */
function PaperActs({ campaign, paper, acts, phase }: { readonly campaign: Campaign; readonly paper: WarPaper; readonly phase: "report" | "withdraw" } & Acts) {
  const obligation = campaign.security.warPowers.obligations.find((entry) => entry.id === paper.id);
  const [authority, setAuthority] = useState<string>(REPORT_AUTHORITIES[0].value);
  const [weeks, setWeeks] = useState<string>("8");
  const terms = { authority, weeks: Number(weeks) };
  const filing = useMemo(() => (obligation ? reportComparison(campaign, obligation, terms) : undefined), [campaign, obligation, authority, weeks]);
  const bringing = useMemo(() => (obligation ? terminateComparison(campaign, obligation) : undefined), [campaign, obligation]);
  if (!obligation) return null;
  const claimed = reportAuthority(authority);
  if (phase === "report" && (paper.report === "Owed" || paper.report === "Missed") && filing) {
    return (
      <SetAct
        title="Send Congress the required report, or don't"
        comparison={filing}
        acts={acts}
        packet={() => reportPacket(campaign, obligation, terms)}
        receiptTitle={() => "Report sent to Congress"}
        law={WPR()}
        terms={
          <Column gap="md">
            <ChoiceList label="The law you're acting under" options={REPORT_AUTHORITIES} value={authority} onChange={setAuthority} />
            {claimed ? <LawChips authorities={[claimed]} /> : null}
            <ChoiceList label="How long you expect it to take" help="If it takes longer, people will remember what you said." options={REPORT_WEEKS.map((count) => ({ value: String(count), label: `${count} weeks` }))} value={weeks} onChange={setWeeks} minCardWidth={120} />
          </Column>
        }
      />
    );
  }
  if (phase === "withdraw" && paper.withdrawal && bringing) {
    return <SetAct title="Bring the troops home, or keep them there" comparison={bringing} acts={acts} packet={() => terminatePacket(campaign, obligation)} receiptTitle={() => "Troops brought home"} tone="danger" law={WPR()} />;
  }
  return null;
}

/**
 * One introduction of force and everything the statute lets the President do
 * about it, in the order a President on the clock reaches for them: report it,
 * ask Congress to authorize it, certify more time to withdraw, or bring it out.
 */
function WarReport({ campaign, paper, notice, asksCongress, acts }: { readonly campaign: Campaign; readonly paper: WarPaper; readonly notice: ExtensionNotice | undefined; readonly asksCongress: boolean } & Acts) {
  const clock = paper.withdrawal;
  return (
    <Surface level="raised" pad="md" accentEdge={clock && clock.daysRemaining <= 14 ? "danger" : "gold"}>
      <Column gap="md">
        <Text variant="headline" role="heading" aria-level={3}>{paper.description}</Text>
        <Row gap="sm" wrap>
          <Text variant="label" weight="regular">
            Report to Congress: <Text variant="label" weight="strong">{paper.report}</Text>
            {paper.reportClock ? `. ${paper.reportClock.dueLabel}` : ""}
          </Text>
          <CiteById id="war-powers-resolution" compact />
        </Row>
        <ReadingFrame title="How long you have" unit="Days left in each legal window" legend={CLOCK_KEY} help={{ meaning: "Each bar is a legal window that started when you sent the troops. The filled part is the share of the window still left, so the bar shrinks toward empty, and the words say how many days are left. When a window runs out the law is broken, whether or not anyone acts." }}>
          {paper.reportClock ? <StatuteClock label="48 hours to tell Congress (50 U.S.C. §1543)" left={paper.reportClock.daysRemaining} window={paper.reportClock.windowDays} due={paper.reportClock.dueLabel} /> : null}
          {clock ? <StatuteClock label="60 days unless Congress approves (50 U.S.C. §1544(b))" left={clock.daysRemaining} window={clock.windowDays} due={clock.dueLabel} /> : <Text variant="body" tone="secondary">There's no deadline to bring the troops home, because Congress has approved this use of force.</Text>}
        </ReadingFrame>
        <PaperActs campaign={campaign} paper={paper} acts={acts} phase="report" />
        {asksCongress ? <AuthorizationLine campaign={campaign} authorization={paper.authorization} acts={acts} /> : null}
        {notice ? <ExtensionAct campaign={campaign} notice={notice} acts={acts} /> : null}
        <PaperActs campaign={campaign} paper={paper} acts={acts} phase="withdraw" />
      </Column>
    </Surface>
  );
}

/** The War Powers paper on a war or a country: every introduction still open, each with its decisions beside it. */
export function WarPowersSection({ campaign, papers, acts }: { readonly campaign: Campaign; readonly papers: readonly WarPaper[] } & Acts) {
  const notices = useMemo(() => new Map(extensionNotices(campaign).map((notice) => [notice.id, notice] as const)), [campaign]);
  // One authorization covers every introduction against a government, so it is
  // asked once, beside the first of that government's running clocks.
  const asking = useMemo(() => {
    const seen = new Set<string>();
    return new Set(papers.filter((paper) => paper.withdrawal && !seen.has(paper.against) && seen.add(paper.against)).map((paper) => paper.id));
  }, [papers]);
  if (papers.length === 0) return null;
  return (
    <Pane id={WAR_POWERS_ANCHOR} title="War Powers deadlines" icon="gavel" count={papers.length} actions={<TopicLaw topic="war-powers" />}>
      {papers.map((paper) => (
        <WarReport key={paper.id} campaign={campaign} paper={paper} notice={notices.get(paper.id)} asksCongress={asking.has(paper.id)} acts={acts} />
      ))}
    </Pane>
  );
}
