import { useMemo } from "react";
import { campaignDay, type Campaign } from "@admin/engine";
import { extensionNotices, floorSchedule } from "@admin/player-core";
import { STATE_IDS } from "@admin/world";
import { Tabs, type TabSpec } from "@admin/ui-web";
import { Screen } from "../../shell/Screen";
import { CongressSystemView } from "./CongressSystemView";
import { Delegations } from "./Delegations";
import { CommitteeBills, FloorBills, SettledBills, Urgent } from "./FloorBusiness";
import { useHillCommit } from "./HillAct";
import { Transmit } from "./LegislativeAgenda";
import { Notices } from "./Notices";
import { SenateNominationsView } from "./SenateNominations";
import { senateNominations } from "./senate-nominations";
import { Members } from "./Members";
import type { CongressSearch, CongressChange } from "./search";
import type { CongressView } from "./views";
import "./congress.css";
import "./tables.css";

function usePanels(campaign: Campaign): readonly TabSpec[] {
  return useMemo(() => {
    const groups = floorSchedule(campaign);
    const moving = groups.reduce((sum, group) => sum + group.rows.length, 0);
    const noms = senateNominations(campaign, campaignDay(campaign));
    return [
      { id: "overview", label: "Overview", icon: "subjectCapitol" },
      { id: "bills", label: "Bills and agenda", icon: "dossier", count: moving },
      { id: "nominations", label: "Nominations", icon: "appoint", count: noms.before.length + noms.preparing.length },
      { id: "members", label: "Members", icon: "subjectPerson", count: campaign.congress.members?.length ?? 0 },
      { id: "delegations", label: "Delegations", icon: "flag", count: STATE_IDS.length },
      { id: "powers", label: "War powers and funding", icon: "law", count: extensionNotices(campaign).length },
    ] as const;
  }, [campaign]);
}

function Panel({ campaign, view, acts, search, onSearch }: { readonly campaign: Campaign; readonly view: CongressView; readonly acts: ReturnType<typeof useHillCommit>; readonly search?: CongressSearch; readonly onSearch?: CongressChange }) {
  switch (view) {
    case "overview":
      return <CongressSystemView campaign={campaign} search={search} onSearch={onSearch} />;
    case "nominations":
      return <SenateNominationsView campaign={campaign} />;
    case "members":
      return <Members campaign={campaign} search={search} onSearch={onSearch} />;
    case "delegations":
      return <Delegations campaign={campaign} />;
    case "powers":
      return <Notices campaign={campaign} />;
    default:
      return <BillsPanel campaign={campaign} acts={acts} />;
  }
}

/** Every bill in full: the desk and the chambers when anything is moving, the agenda to propose from, and every settled bill. */
function BillsPanel({ campaign, acts }: { readonly campaign: Campaign; readonly acts: ReturnType<typeof useHillCommit> }) {
  const groups = floorSchedule(campaign);
  const has = (...keys: readonly string[]) => groups.some((group) => keys.includes(group.key));
  return (
    <>
      {has("desk") ? <Urgent campaign={campaign} /> : null}
      {has("floor") ? <FloorBills campaign={campaign} /> : null}
      {has("conference", "markup", "referral") ? <CommitteeBills campaign={campaign} /> : null}
      <Transmit campaign={campaign} acts={acts} />
      <SettledBills campaign={campaign} />
    </>
  );
}

/**
 * Congress as a workspace: the chambers drawn as one system first, then the
 * full working lists in tabs. The tab lives in the
 * URL so Back and a reload return to it.
 */
export function CongressScreen({ campaign, view, onView, search, onSearch }: { readonly campaign: Campaign; readonly view: CongressView; readonly onView: (view: CongressView) => void; readonly search?: CongressSearch; readonly onSearch?: CongressChange }) {
  const acts = useHillCommit(campaign);
  const tabs = usePanels(campaign);
  return (
    <Screen icon="subjectCapitol" title="Congress" eyebrow="Washington" lede="The two chambers, what they think of you, and what is in front of them." screenClass="workspace" camera="us">
      <div className="hill-room">
        <Tabs label="Congress views" tabs={tabs} selected={view} onSelect={(id) => onView(id as CongressView)}>
          <div className="hill-room hill-room--tab">
            <Panel campaign={campaign} view={view} acts={acts} search={search} onSearch={onSearch} />
          </div>
        </Tabs>
      </div>
    </Screen>
  );
}
