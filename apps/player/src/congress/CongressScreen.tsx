import { useMemo } from "react";
import { campaignDay, type Campaign } from "@admin/engine";
import { extensionNotices, floorSchedule, sealFor } from "@admin/player-core";
import { STATE_IDS } from "@admin/world";
import { Column, Page, Seal } from "@admin/ui";
import { ViewTabs, type ViewTab } from "@admin/ui/nation";
import { Bills } from "./Bills";
import { useActCommit } from "./commit";
import { senateNominations, type Caucus, type CongressSelection, type CongressView } from "./model";
import { Overview } from "./Overview";
import { Delegations, Members, Nominations, Powers } from "./Rosters";
import { quiet } from "./parts";

function useTabs(campaign: Campaign): readonly ViewTab<CongressView>[] {
  return useMemo(() => {
    const moving = floorSchedule(campaign).reduce((sum, group) => sum + group.rows.length, 0);
    const noms = senateNominations(campaign, campaignDay(campaign));
    return [
      { id: "overview", label: "Overview", icon: "subjectCapitol" },
      { id: "bills", label: "Bills and agenda", icon: "dossier", count: moving },
      { id: "nominations", label: "Nominations", icon: "appoint", count: noms.before.length + noms.preparing.length },
      { id: "members", label: "Members", icon: "subjectPerson", count: campaign.congress.members?.length ?? 0 },
      { id: "delegations", label: "States", icon: "flag", count: STATE_IDS.length },
      { id: "powers", label: "War powers and funding", icon: "law", count: extensionNotices(campaign).length },
    ];
  }, [campaign]);
}

export type CongressScreenProps = {
  readonly campaign: Campaign;
  readonly view: CongressView;
  readonly onView: (view: CongressView) => void;
  readonly selection: CongressSelection;
  readonly onSelect: (selection: CongressSelection) => void;
  readonly caucus: Caucus | undefined;
  readonly onCaucus: (caucus: Caucus | undefined) => void;
};

/** Congress as a workspace: the chambers drawn as one system first, then the full working lists by view. */
export function CongressScreen({ campaign, view, onView, selection, onSelect, caucus, onCaucus }: CongressScreenProps) {
  const acts = useActCommit(campaign);
  const tabs = useTabs(campaign);
  return (
    <Page eyebrow="United States Congress" icon="subjectCapitol" title="Congress" lede="The House and the Senate, how they feel about you, and the bills and nominees in front of them." emblem={<Seal spec={sealFor("INST-CONGRESS")} size={72} label="The United States Congress" />}>
      <ViewTabs label="Congress views" tabs={tabs.map(quiet)} selected={view} onSelect={onView} />
      <Column gap="xl">
        {view === "overview" ? <Overview campaign={campaign} selection={selection} onSelect={onSelect} onView={onView} /> : null}
        {view === "bills" ? <Bills campaign={campaign} acts={acts} /> : null}
        {view === "nominations" ? <Nominations campaign={campaign} /> : null}
        {view === "members" ? <Members campaign={campaign} caucus={caucus} onCaucus={onCaucus} /> : null}
        {view === "delegations" ? <Delegations campaign={campaign} /> : null}
        {view === "powers" ? <Powers campaign={campaign} /> : null}
      </Column>
      {acts.reviewSheet}
    </Page>
  );
}
