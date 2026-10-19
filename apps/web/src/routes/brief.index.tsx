import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Campaign } from "@admin/engine";
import { briefMatters, formatDate, spanWords, stopWords } from "@admin/player-core";
import { Icon, Receipt, Tabs } from "@admin/ui-web";
import { useCampaignState, usePreferences } from "../app/hooks";
import { oathReceiptFor } from "../app/session";
import { PriorityAlert } from "../brief/PriorityAlert";
import { Queue } from "../brief/Queue";
import { NowStrip } from "../brief/NowStrip";
import { LastRun, RecentOutcomes, RunningClocks, Standing } from "../brief/Sections";
import { TimeControls } from "../brief/TimeControls";
import { BriefCalendar } from "../brief/BriefCalendar";
import { BriefHistory } from "../brief/BriefHistory";
import { parseBriefSearch, type BriefSearch, type BriefView } from "../brief/search";
import { LastWeek } from "../brief/WeekDigest";
import { InTerm } from "../shell/InTerm";
import { Screen } from "../shell/Screen";

function SwornIn({ campaign }: { readonly campaign: Campaign }) {
  const receipt = oathReceiptFor(campaign);
  if (!receipt) return null;
  const vicePresident = campaign.vicePresident ? campaign.people[campaign.vicePresident]?.base.name : undefined;
  return (
    <Receipt
      title={`Sworn in as President, ${campaign.founding.leader.name}`}
      date={formatDate(campaign.foundingDate ?? campaign.calendar)}
      lines={[
        ...(vicePresident ? [{ label: "Vice President", value: vicePresident }] : []),
        { label: "Orders signed", value: receipt.orders.length > 0 ? receipt.orders.join("; ") : "None" },
      ]}
      record="The oath, and every order signed with it, are the first entries on your Record."
    />
  );
}

/** What the run that just ended said, until the digest is read; or the last thing a time control said. */
function useRunSentence(said: string) {
  const state = useCampaignState();
  const brief = state.status === "ready" && state.brief && !state.briefAcknowledged ? state.brief : undefined;
  const sentence = said || (brief ? `Time moved ${spanWords(brief)}. ${stopWords(brief)}` : "");
  return { brief, sentence };
}

function BriefScreen({ campaign, search, onView }: { readonly campaign: Campaign; readonly search: BriefSearch; readonly onView: (view: BriefView) => void }) {
  const { preferences } = usePreferences();
  const [said, setSaid] = useState("");
  const { brief, sentence } = useRunSentence(said);
  const matters = briefMatters(campaign, preferences.attentionByKind);
  const [lead, ...rest] = matters;
  const holding = matters.filter((matter) => matter.holds).length;
  return (
    <Screen
      title="President’s Brief"
      icon="brief"
      eyebrow="Executive Office of the President"
      lede={
        matters.length === 0
          ? "Nothing is waiting on you."
          : `${matters.length} ${matters.length === 1 ? "matter waits" : "matters wait"} on you${holding > 0 ? `, and ${holding} ${holding === 1 ? "holds" : "hold"} time` : ""}.`
      }
      screenClass="workspace"
      camera="us"
    >
      <Tabs label="President’s Brief views" selected={search.view ?? "today"} onSelect={(id) => onView(id as BriefView)} tabs={[
        { id: "today", label: "Today", icon: "brief", count: matters.length },
        { id: "calendar", label: "Calendar", icon: "pending" },
        { id: "history", label: "Briefing history", icon: "record" },
      ]}>
      {search.view === "history" ? <BriefHistory campaign={campaign} week={search.week} /> : search.view === "calendar" ? <BriefCalendar campaign={campaign} /> : <div className="brief">
        <SwornIn campaign={campaign} />
        {brief ? (
          <LastRun brief={brief} sentence={sentence} />
        ) : said ? (
          <p className="brief__said" role="status">
            {said}
          </p>
        ) : null}
        <div className="desk">
          <div className="desk__main">
            {lead ? (
              <PriorityAlert campaign={campaign} matter={lead} />
            ) : (
              <section className="quiet" aria-labelledby="quiet-title">
                <h2 id="quiet-title" className="brief-section__title">
                  <Icon name="emptyInbox" size={20} /> A quiet day
                </h2>
                <p>Nothing is waiting on you, and no deadline is close enough to stop the clock. Continue in the top bar runs time until something needs you.</p>
                <TimeControls campaign={campaign} onSettled={setSaid} quiet />
              </section>
            )}
            <NowStrip campaign={campaign} />
            {rest.length > 0 ? <Queue campaign={campaign} matters={rest} onSettled={setSaid} /> : null}
          </div>
          <div className="desk__side">
            <LastWeek campaign={campaign} />
            <RunningClocks campaign={campaign} />
            <RecentOutcomes campaign={campaign} />
          </div>
        </div>
        <Standing campaign={campaign} />
        {lead ? <TimeControls campaign={campaign} onSettled={setSaid} /> : null}
      </div>}
      </Tabs>
    </Screen>
  );
}

/** The Brief: what needs the President now, what is running, and the readings that moved. */
function Brief() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/brief/" });
  return <InTerm>{(campaign) => <BriefScreen campaign={campaign} search={search} onView={(view) => { void navigate({ search: { ...search, view }, resetScroll: false }); }} />}</InTerm>;
}

export const Route = createFileRoute("/brief/")({
  validateSearch: parseBriefSearch,
  component: Brief,
});
