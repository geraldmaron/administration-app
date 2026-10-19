import { Slot, usePathname } from "expo-router";
import { AppShell, View, WorkspaceStrip } from "@admin/ui";
import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { SEAL_PRESIDENT, sealFor, waitingOnYou } from "@admin/player-core";
import { useCampaignState, usePreferences } from "../../src/device/hooks";
import { RouterLink } from "../../src/shell/RouterLink";
import { ContinueButton } from "../../src/shell/ContinueButton";
import { say } from "../../src/shell/said";
import { SituationBar } from "../../src/shell/SituationBar";
import { activeNavId, navGroups, navUtilities, phoneCounts, phoneItemFor, phoneItems, mattersByPlace, type NavCounts } from "../../src/shell/nav";
import { BarActions } from "../../src/shell/BarActions";
import { ClassificationProvider, ShellClassificationBar } from "../../src/shell/classification";
import { isDevelopmentBuild } from "../../src/shell/build-flavor";
import { cameFrom, useTrail } from "../../src/shell/navigate";

const PRESIDENT_SEAL = sealFor(SEAL_PRESIDENT);

function FrameTop() {
  return (
    <View>
      <ShellClassificationBar edge="top" />
      <WorkspaceStrip seal={PRESIDENT_SEAL} workspace="The Administration" office="Office of the President" development={isDevelopmentBuild} />
    </View>
  );
}

/** The badges the navigation carries: each matter owed the President, counted on the place its row opens. */
function useWaitingCounts(campaign: Campaign | undefined): NavCounts {
  const { preferences } = usePreferences();
  return useMemo(() => {
    if (!campaign) return {};
    return mattersByPlace(waitingOnYou(campaign, preferences.attentionByKind).matters);
  }, [campaign, preferences.attentionByKind]);
}

/** Every working screen sits in this frame: the markings, the navigation, the situation bar and the page. */
export default function GameLayout() {
  return (
    <ClassificationProvider>
      <GameFrame />
    </ClassificationProvider>
  );
}

// Pages a player reaches before or between presidencies: they join the frame
// while a presidency is open and stand on their own when none is.
const OUTSIDE_A_TERM = /^\/(settings|administrations|handbook)(\/|$)/;

function GameFrame() {
  useTrail();
  const pathname = usePathname();
  const state = useCampaignState();
  const campaign = state.status === "ready" ? state.campaign : undefined;
  // A person's file serves every branch, so the rail keeps the place the President opened it from.
  const shared = pathname.startsWith("/washington/person/");
  const place = (shared ? activeNavId(cameFrom(pathname) ?? pathname) : undefined) ?? activeNavId(pathname);
  const counts = useWaitingCounts(campaign);
  const groups = navGroups(counts);
  if (state.status === "empty" && OUTSIDE_A_TERM.test(pathname)) return <Slot />;
  return (
    <AppShell
      groups={groups}
      utilities={navUtilities()}
      phoneItems={phoneItems(phoneCounts(counts))}
      activeId={place}
      phoneActiveId={phoneItemFor(place as Parameters<typeof phoneItemFor>[0])}
      Link={RouterLink}
      frameTop={<FrameTop />}
      frameBottom={<ShellClassificationBar edge="bottom" />}
      bar={<SituationBar campaign={campaign} actions={campaign ? <BarActions campaign={campaign} continueControl={<ContinueButton campaign={campaign} onSaid={say} />} /> : null} />}
    >
      <Slot />
    </AppShell>
  );
}
