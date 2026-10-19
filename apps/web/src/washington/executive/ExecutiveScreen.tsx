import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { PLACES, executiveOverview, executiveTree, formatDate, place } from "@admin/player-core";
import { EmptyState, Tabs } from "@admin/ui-web";
import { usePreferences } from "../../app/hooks";
import { DoorTile } from "../../shell/DoorTile";
import { Screen } from "../../shell/Screen";
import { Cabinet } from "./Cabinet";
import { ExecutivePulse } from "./ExecutivePulse";
import "./overview.css";
import "./command-workspace.css";
import type { ExecutiveSearch } from "./cabinet-view";
export type { ExecutiveSearch } from "./cabinet-view";
import { Delivery } from "./Delivery";
import { RosterTable } from "./RosterTable";
import { ServicesPanel } from "./Services";
import { onlyNeedingYou, rosterScopes } from "./roster";


type Props = {
  readonly campaign: Campaign;
  readonly search: ExecutiveSearch;
  readonly onSearch: (next: ExecutiveSearch) => void;
};

function Branches() {
  const doors = [
    { key: "congress", href: place.congress(), icon: "subjectChamber" as const, title: PLACES.congress.title, description: "Chambers · legislation · support" },
    { key: "courts", href: place.courts(), icon: "court" as const, title: PLACES.courts.title, description: "Justices · cases · appointments" },
    { key: "oversight", href: place.oversight(), icon: "review" as const, title: PLACES.oversight.title, description: "Inquiries · directives · inspectors" },
  ];
  return (
    <nav className="executive-branches" aria-label="The other branches">
      <ul className="ui-door-tiles">
        {doors.map((door) => (
          <li key={door.key}>
            <DoorTile href={door.href} icon={door.icon} title={door.title} description={door.description} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The executive branch as an operations overview: the headline readings, the
 * lead chairs, delivery by office, the services and the full roster. What waits
 * on the President is drawn by the screen frame; the matter count here links to it.
 */
export function ExecutiveScreen({ campaign, search, onSearch }: Props) {
  const { preferences } = usePreferences();
  const overview = useMemo(() => executiveOverview(campaign, preferences.attentionByKind), [campaign, preferences.attentionByKind]);
  const scopes = useMemo(() => rosterScopes(campaign, executiveTree(campaign)), [campaign]);
  const need = search.need === true;
  const shown = need ? scopes.map(onlyNeedingYou).filter((scope) => scope.rows.length > 0) : scopes;
  const current = shown.find((scope) => scope.key === search.scope) ?? shown.find((scope) => scope.key === "departments") ?? shown[0];

  return (
    <Screen title="Executive" icon="westWing" eyebrow={`${formatDate(campaign.calendar)} · Washington`} screenClass="workspace" measure="data" camera="keep" compactAttention>
      <div className="exec">
        <ExecutivePulse overview={overview} />
        <Tabs label="Executive views" selected={search.view ?? "offices"} tabs={[{ id: "offices", label: "Office board", icon: "westWing" }, { id: "delivery", label: "Delivery evidence", icon: "graph" }, { id: "services", label: "Public services", icon: "building" }, { id: "roster", label: "Full roster", icon: "subjectPerson" }]} onSelect={(view) => { const { view: _old, ...rest } = search; onSearch(view === "offices" ? rest : { ...rest, view: view as "delivery" | "services" | "roster" }); }}>
          {search.view === "delivery" ? <Delivery reading={overview.delivery} bodiesCounted={overview.bodiesCounted} /> : search.view === "services" ? <ServicesPanel reading={overview.services} /> : search.view === "roster" ? <section className="exec-panel"><h2 className="exec__heading">Every chair and its agencies</h2>{current ? <Tabs label="Scope of the roster" tabs={shown.map((scope) => ({ id: scope.key, label: scope.title, count: scope.rows.length }))} selected={current.key} onSelect={(scope) => onSearch({ ...search, scope })}><p className="exec__lead">{current.lead}</p><RosterTable campaign={campaign} rows={current.rows} caption={`${current.title}: ${current.rows.length} chairs`} /></Tabs> : <EmptyState title="No chairs match this scope" />}</section> : <Cabinet campaign={campaign} sections={overview.sections} search={search} onSearch={onSearch} />}
        </Tabs>
        <Branches />
      </div>
    </Screen>
  );
}
