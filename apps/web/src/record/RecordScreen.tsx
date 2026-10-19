import type { Campaign } from "@admin/engine";
import { Tabs, type TabSpec } from "@admin/ui-web";
import { Screen } from "../shell/Screen";
import { RecordWorkspace } from "./RecordWorkspace";
import { Arcs, Impacts, Promises, Standing } from "./RecordSections";
import type { RecordPatch, RecordSearch, RecordView } from "./search";
import "./record.css";
import "./evidence.css";

const TABS: readonly (TabSpec & { readonly id: RecordView })[] = [
  { id: "acts", label: "Acts and outcomes" },
  { id: "promises", label: "Promises" },
  { id: "arcs", label: "Story arcs" },
  { id: "standing", label: "Where the country stands" },
  { id: "assessments", label: "Assessments" },
];

function View({ campaign, view, search, selectedId, onSearch }: { readonly campaign: Campaign; readonly view: RecordView; readonly search: RecordSearch; readonly selectedId: string | undefined; readonly onSearch: (patch: RecordPatch) => void }) {
  switch (view) {
    case "promises":
      return <Promises campaign={campaign} />;
    case "arcs":
      return <Arcs campaign={campaign} />;
    case "standing":
      return <Standing campaign={campaign} />;
    case "assessments":
      return <Impacts campaign={campaign} />;
    default:
      return <RecordWorkspace campaign={campaign} search={search} selectedId={selectedId} onSearch={onSearch} />;
  }
}

/**
 * The Record: every act and outcome of the term to search, filter and open,
 * and the promises, story arcs, standing and assessments read from the same
 * ledger. The view, the filters and the open entry live in the address.
 */
export function RecordScreen({ campaign, search, selectedId, onSearch }: { readonly campaign: Campaign; readonly search: RecordSearch; readonly selectedId: string | undefined; readonly onSearch: (patch: RecordPatch) => void }) {
  const view = search.view ?? "acts";
  return (
    <Screen title="Record" icon="record" eyebrow="What happened and why" screenClass="workspace" camera="us">
      <div className="rec">
        <Tabs compact label="Views of the Record" tabs={TABS} selected={view} onSelect={(next) => onSearch({ view: next === "acts" ? undefined : (next as RecordView), entry: undefined })}>
          <View campaign={campaign} view={view} search={search} selectedId={selectedId} onSearch={onSearch} />
        </Tabs>
      </div>
    </Screen>
  );
}
