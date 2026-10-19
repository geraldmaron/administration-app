import { useEffect, useMemo, useRef, useState } from "react";
import type { Campaign } from "@admin/engine";
import {
  WAR_POWERS_ANCHOR,
  extensionComparison,
  extensionGrounds,
  extensionNotices,
  extensionPacket,
  type ExtensionNotice,
  type WarAuthorization,
  type WarPaper,
} from "@admin/player-core";
import { Choice, Gauge, Icon } from "@admin/ui-web";
import type { NationCommit } from "../../nation/economy/commit";
import { SetAct } from "../set/SetAct";
import { AuthorizationAct, PaperActs } from "./WarActs";

type Acts = { readonly acts: NationCommit };

/** Certifying the thirty days on one of a fixed set of grounds, against letting the sixty run out. */
function ExtensionAct({ campaign, notice, acts }: { readonly campaign: Campaign; readonly notice: ExtensionNotice } & Acts) {
  const grounds = useMemo(() => extensionGrounds(notice.target), [notice.target]);
  const [necessity, setNecessity] = useState<string>(grounds[0]!.value);
  if (notice.certified !== undefined) {
    return (
      <p className="set-note">
        <strong>Thirty more days certified:</strong> {notice.certified}
      </p>
    );
  }
  if (notice.refusal) {
    return (
      <p className="set-note">
        <strong>Certify thirty more days:</strong> {notice.refusal}
      </p>
    );
  }
  return (
    <SetAct
      title={`Compare certifying the extension on ${notice.target} and letting the clock run`}
      comparison={extensionComparison(notice)}
      acts={acts}
      tone="danger"
      packet={() => extensionPacket(campaign, notice.id, necessity)}
      receiptTitle={() => "Thirty-day extension certified"}
      terms={<Choice legend="The necessity you certify" options={grounds} value={necessity} onChange={setNecessity} layout="cards" hint="Congress holds you to this sentence." />}
    />
  );
}

function AuthorizationLine({ campaign, authorization, acts }: { readonly campaign: Campaign; readonly authorization: WarAuthorization } & Acts) {
  if (authorization.state === "open") return <AuthorizationAct campaign={campaign} authorization={authorization} acts={acts} />;
  return (
    <p className="set-note">
      {authorization.state === "covered" ? `${authorization.title ?? "An authorization"} covers force against ${authorization.name}.` : `An authorization against ${authorization.name} is before Congress. Continue brings the vote.`}
    </p>
  );
}

function clockValue(paper: WarPaper): { readonly value: number; readonly text: string } | undefined {
  const clock = paper.withdrawal;
  return clock ? { value: clock.daysRemaining / clock.windowDays, text: clock.daysRemaining >= 0 ? `${clock.daysRemaining} days left` : `${-clock.daysRemaining} days past` } : undefined;
}

/**
 * One introduction of force and everything the statute lets the President do
 * about it, in the order a President on the clock reaches for them: report it,
 * ask Congress to authorize it, certify more time to withdraw, or bring it out.
 */
function Paper({ campaign, paper, notice, asksCongress, acts }: { readonly campaign: Campaign; readonly paper: WarPaper; readonly notice: ExtensionNotice | undefined; readonly asksCongress: boolean } & Acts) {
  const clock = clockValue(paper);
  return (
    <li className="set-paper">
      <p className="set-paper__title">{paper.description}</p>
      <p className="set-note">
        Report to Congress: <strong>{paper.report}</strong>
        {paper.reportClock ? `. ${paper.reportClock.dueLabel}` : ""}
      </p>
      {clock ? <Gauge shape="meter" label="Sixty days without a vote" value={clock.value} valueText={clock.text} tone={clock.value <= 0.25 ? "bad" : clock.value <= 0.5 ? "watch" : "good"} caption={paper.withdrawal?.dueLabel} /> : <p className="set-note">No withdrawal clock runs: force is covered by an authorization.</p>}
      <PaperActs campaign={campaign} paper={paper} acts={acts} phase="report" />
      {asksCongress ? <AuthorizationLine campaign={campaign} authorization={paper.authorization} acts={acts} /> : null}
      {notice ? <ExtensionAct campaign={campaign} notice={notice} acts={acts} /> : null}
      <PaperActs campaign={campaign} paper={paper} acts={acts} phase="withdraw" />
    </li>
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
  const root = useRef<HTMLElement | null>(null);
  const present = papers.length > 0;
  // A reload or a pasted link reaches this anchor before the campaign has loaded,
  // so the browser's own jump finds nothing; take it once the section exists.
  useEffect(() => {
    if (present && window.location.hash === `#${WAR_POWERS_ANCHOR}`) root.current?.scrollIntoView({ block: "start" });
  }, [present]);
  if (!present) return null;
  return (
    <section ref={root} className="set-section" aria-labelledby={WAR_POWERS_ANCHOR}>
      <h2 id={WAR_POWERS_ANCHOR} className="set-section__title">
        <Icon name="gavel" size={20} /> Authority: War Powers
      </h2>
      <ul className="set-papers">
        {papers.map((paper) => (
          <Paper key={paper.id} campaign={campaign} paper={paper} notice={notices.get(paper.id)} asksCongress={asking.has(paper.id)} acts={acts} />
        ))}
      </ul>
    </section>
  );
}
