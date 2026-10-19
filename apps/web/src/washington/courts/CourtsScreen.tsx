import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { benchReading, courtDocket, judicialNominations, vacancyBoard } from "@admin/player-core";
import { Tabs, type TabSpec } from "@admin/ui-web";
import { AuthorityHelp } from "../../help/AuthorityHelp";
import { Screen } from "../../shell/Screen";
import { Nominations } from "./Nominations";
import { CourtSystemView } from "./CourtSystemView";
import type { CourtsView } from "./views";
import "../../nation/economy/economy.css";
import "./courts.css";
import "../congress/tables.css";

/** Route-backed court workspaces share one operating picture and exact subject links. */
export function CourtsScreen({ campaign, view, onView }: { readonly campaign: Campaign; readonly view: CourtsView; readonly onView: (view: CourtsView) => void }) {
  const bench = useMemo(() => benchReading(campaign), [campaign]);
  const docket = useMemo(() => courtDocket(campaign), [campaign]);
  const pending = useMemo(() => judicialNominations(campaign), [campaign]);
  // Open seats on the Supreme Court and the courts of appeals with nobody sent up for them: the desk's own court rows.
  const openSeats = useMemo(() => vacancyBoard(campaign).open.filter((row) => campaign.institutions[row.institution]?.lowerBenchSeat).length + bench.seats.filter((seat) => seat.vacant && !seat.pending).length, [campaign, bench]);
  const tabs: readonly TabSpec[] = [
    { id: "bench", label: "Bench", icon: "court", count: bench.seated },
    { id: "docket", label: "Docket", icon: "order", count: docket.pending.length + docket.ruled.length },
    { id: "nominations", label: "Nominations", icon: "appoint", count: openSeats + pending.length },
  ];
  return (
    <Screen icon="court" title="Courts" eyebrow="Washington" lede="Judicial review, the federal bench, and the decisions that require your response." screenClass="workspace" measure="data" camera="us">
      <div className="nation-room courts">
        <AuthorityHelp topic={view === "nominations" ? "appointments" : "judicial-review"} compact />
        <Tabs label="Courts views" tabs={tabs} selected={view} onSelect={(id) => onView(id as CourtsView)}>
          <CourtSystemView campaign={campaign} mode={view} />
          {view === "nominations" ? <Nominations campaign={campaign} /> : null}
        </Tabs>
      </div>
    </Screen>
  );
}
