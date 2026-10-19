import { useMemo } from "react";
import { router } from "expo-router";
import type { Campaign } from "@admin/engine";
import { abroadRows, coverageByWeek, coverageRows, deskRows, formatDate, pressKpis, pressLede, sealFor } from "@admin/player-core";
import { Column, HelpButton, Page, Seal, type HelpContent } from "@admin/ui";
import { ViewTabs, type ViewTab } from "@admin/ui/nation";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { ReviewBoundary } from "../review/PresidentialReview";
import { AbroadView } from "./AbroadView";
import { DesksView } from "./DesksView";
import { FeedView } from "./FeedView";
import { FrontPageView } from "./FrontPageView";
import { usePressCommit } from "./PressAct";
import { PressKpisBand } from "./PressKpis";
import { RespondView } from "./RespondView";
import { routerParams, type PressParams, type PressView } from "./press-params";

const VIEWS: readonly ViewTab<PressView>[] = [
  { id: "front", label: "Front page", icon: "press" },
  { id: "feed", label: "Feed", icon: "dossier" },
  { id: "desks", label: "Outlets", icon: "building" },
  { id: "respond", label: "Respond", icon: "microphone" },
  { id: "abroad", label: "Abroad", icon: "world" },
];

function useHelp(): HelpContent {
  const open = useOpenAuthority();
  return {
    title: "The press",
    meaning: "Each news outlet has its own opinion of you, and the main number is the average of them all. An outlet's opinion changes with what it already believes and with what you do. Its lean is how it sees the world, no matter who is President. If you go weeks without answering reporters' questions, your silence becomes the story.",
    steps: ["Read the front page and the feed to see what news outlets are writing about you.", "Pick a way to respond. You'll see how each one compares with saying nothing.", "Confirm your choice in the review. What you did and what happened go into the Record."],
    law: [{ cite: "U.S. Const. art. II, §1", title: "The Vesting Clause", summary: "Speaking for your government is part of the President's job under the Constitution. No law sets rules for it.", onOpen: () => open("U.S. Const. art. II, §1") }],
  };
}

type Props = { readonly campaign: Campaign; readonly params: PressParams };

/** The press: the front page, every story filed, the desks and their weeks, the response desk and the press abroad, on one address. */
export function PressScreen({ campaign, params }: Props) {
  const kpis = useMemo(() => pressKpis(campaign), [campaign]);
  const desks = useMemo(() => deskRows(campaign), [campaign]);
  const weeks = useMemo(() => coverageByWeek(campaign), [campaign]);
  const rows = useMemo(() => coverageRows(campaign), [campaign]);
  const abroad = useMemo(() => abroadRows(campaign), [campaign]);
  const acts = usePressCommit(campaign);
  const help = useHelp();
  const view = params.view ?? "front";
  const set = (next: PressParams) => router.setParams(routerParams(next));
  const pick = (next: PressView) => set({ ...(next === "front" ? {} : { view: next }) });
  const open = (next: PressView, week?: string) => set(week ? { view: next, week: Number(week) } : { view: next });
  return (
    <Page eyebrow={`The White House · Office of the Press Secretary · ${formatDate(campaign.calendar)}`} icon="press" title="The press" lede={pressLede(kpis)} emblem={<Seal spec={sealFor("SEAL-WHITE-HOUSE")} size={64} label="The White House" />} actions={<HelpButton content={help} />}>
      <ViewTabs label="Press sections" tabs={VIEWS} selected={view} onSelect={pick} />
      <PressKpisBand kpis={kpis} section={view === "respond" ? "response" : "coverage"} open={open} />
      <Column gap="xl">
        {view === "front" ? <FrontPageView campaign={campaign} rows={rows} desks={desks} /> : null}
        {view === "feed" ? <FeedView rows={rows} desks={desks} params={params} onParams={(next) => set({ ...next, view: "feed" })} /> : null}
        {view === "desks" ? <DesksView desks={desks} weeks={weeks} {...(params.week !== undefined ? { selectedWeek: params.week } : {})} /> : null}
        {view === "respond" ? <RespondView campaign={campaign} acts={acts} /> : null}
        {view === "abroad" ? <AbroadView rows={abroad} /> : null}
      </Column>
    </Page>
  );
}

/** The screen inside the review it authorizes through. */
export function PressDesk(props: Props) {
  return (
    <ReviewBoundary>
      <PressScreen {...props} />
    </ReviewBoundary>
  );
}
