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

function hillLede(moving: number, nominees: number): string {
  const parts = [...(moving > 0 ? [`${moving} ${moving === 1 ? "bill is" : "bills are"} moving`] : []), ...(nominees > 0 ? [`${nominees} ${nominees === 1 ? "nominee waits" : "nominees wait"} on the Senate`] : [])];
  return parts.length > 0 ? `${parts.join(" and ")}.` : "Nothing is on the floor and no nominee waits on the Senate.";
}

function useHill(campaign: Campaign): { readonly tabs: readonly ViewTab<CongressView>[]; readonly lede: string } {
  return useMemo(() => {
    const moving = floorSchedule(campaign).reduce((sum, group) => sum + group.rows.length, 0);
    const noms = senateNominations(campaign, campaignDay(campaign));
    const tabs: readonly ViewTab<CongressView>[] = [
      { id: "overview", label: "Overview", icon: "subjectCapitol" },
      { id: "bills", label: "Bills and agenda", icon: "dossier", count: moving },
      { id: "nominations", label: "Nominations", icon: "appoint", count: noms.before.length + noms.preparing.length },
      { id: "members", label: "Members", icon: "subjectPerson", count: campaign.congress.members?.length ?? 0 },
      { id: "delegations", label: "States", icon: "flag", count: STATE_IDS.length },
      { id: "powers", label: "War powers and funding", icon: "law", count: extensionNotices(campaign).length },
    ];
    return { tabs, lede: hillLede(moving, noms.before.length) };
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
  const { tabs, lede } = useHill(campaign);
  return (
    <Page eyebrow="United States Congress" icon="subjectCapitol" title="Congress" lede={lede} emblem={<Seal spec={sealFor("INST-CONGRESS")} size={72} label="The United States Congress" />}>
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
