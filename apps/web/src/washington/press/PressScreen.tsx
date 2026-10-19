import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { abroadRows, coverageByWeek, coverageRows, deskRows, formatDate, pressKpis, pressLede, runningStories } from "@admin/player-core";
import { Tabs, type TabSpec } from "@admin/ui-web";
import { Screen } from "../../shell/Screen";
import { Desks } from "./Desks";
import { Feed } from "./Feed";
import { PressKpisBand } from "./Kpis";
import { Respond } from "./Respond";
import { Abroad, RunningStories } from "./Stories";
import { Weeks } from "./Weeks";
import type { PressSearch, PressView } from "./press-search";
import "./press.css";

type Props = { readonly campaign: Campaign; readonly search: PressSearch; readonly onSearch: (next: PressSearch) => void };

/** Coverage, analysis and response share one address and the same recorded data. */
export function PressScreen({ campaign, search, onSearch }: Props) {
  const kpis = useMemo(() => pressKpis(campaign), [campaign]);
  const desks = useMemo(() => deskRows(campaign), [campaign]);
  const weeks = useMemo(() => coverageByWeek(campaign), [campaign]);
  const rows = useMemo(() => coverageRows(campaign), [campaign]);
  const stories = useMemo(() => runningStories(campaign), [campaign]);
  const abroad = useMemo(() => abroadRows(campaign), [campaign]);
  const view = search.view ?? "coverage";
  const tabs: readonly TabSpec[] = [
    { id: "coverage", label: "Coverage", icon: "press", count: rows.length },
    { id: "analysis", label: "Desks and trends", icon: "graph" },
    { id: "response", label: "Response", icon: "microphone", count: stories.length },
    { id: "abroad", label: "Abroad", icon: "world", count: abroad.length },
  ];
  return (
    <Screen icon="press" title="Press" eyebrow={`${formatDate(campaign.calendar)} · Washington`} lede={pressLede(kpis)} screenClass="workspace" camera="keep">
      <div className="pr">
        <Tabs label="Press workspace" tabs={tabs} selected={view} onSelect={(next) => onSearch({ ...search, view: next === "coverage" ? undefined : next as PressView })}>
          <div className="pr-view">
            <PressKpisBand kpis={kpis} section={view === "response" ? "response" : "coverage"} />
            {view === "coverage" ? <Feed rows={rows} desks={desks} search={search} onSearch={onSearch} /> : null}
            {view === "analysis" ? <><Weeks weeks={weeks} selected={search.week} /><Desks desks={desks} /></> : null}
            {view === "response" ? <div className="pr-workspace-pair"><RunningStories stories={stories} /><Respond campaign={campaign} /></div> : null}
            {view === "abroad" ? <Abroad rows={abroad} /> : null}
          </div>
        </Tabs>
      </div>
    </Screen>
  );
}
