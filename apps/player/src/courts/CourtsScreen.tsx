import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { benchReading, courtDocket, courtSystem, judicialNominations, sealFor, vacancyBoard } from "@admin/player-core";
import { Column, Page, Row, Seal, Stat, StatGrid, Surface, Text } from "@admin/ui";
import { ViewTabs, type ViewTab } from "@admin/ui/nation";
import { useActCommit } from "../congress/commit";
import { MainAndRail, quiet } from "../congress/parts";
import { Authority } from "../congress/ActChooser";
import { AgreementMatrix, CourtBench } from "./Bench";
import { CaseFlow, Circuits, CourtAgenda, Docket, NeedsYou } from "./Docket";
import { JudicialNominations } from "./Nominations";
import { LAW, type CourtsView } from "./model";

/** The bench, the docket and the nominations as views of one operating picture, each linking to its exact subject. */
export function CourtsScreen({ campaign, view, onView }: { readonly campaign: Campaign; readonly view: CourtsView; readonly onView: (view: CourtsView) => void }) {
  const acts = useActCommit(campaign);
  const system = useMemo(() => courtSystem(campaign), [campaign]);
  const bench = useMemo(() => benchReading(campaign), [campaign]);
  const docket = useMemo(() => courtDocket(campaign), [campaign]);
  const pending = useMemo(() => judicialNominations(campaign), [campaign]);
  // Open seats on the Supreme Court and the courts of appeals with nobody sent up for them.
  const openSeats = useMemo(() => vacancyBoard(campaign).open.filter((row) => campaign.institutions[row.institution]?.lowerBenchSeat).length + bench.seats.filter((seat) => seat.vacant && !seat.pending).length, [campaign, bench]);
  const tabs: readonly ViewTab<CourtsView>[] = [
    { id: "bench", label: "Judges", icon: "court", count: bench.seated },
    { id: "docket", label: "Cases", icon: "order", count: docket.pending.length + docket.ruled.length },
    { id: "nominations", label: "Nominations", icon: "appoint", count: openSeats + pending.length },
  ];
  const open = system.justices.filter((justice) => justice.vacant).length;
  const responses = system.cases.filter((entry) => entry.response).length;
  const figures = [
    ...(system.cases.length > 0 ? [<Stat key="cases" label="Open cases" value={String(system.cases.length)} size="heading" minWidth={0} />] : []),
    // Shown at zero too: the card is a row of readings on one left edge, and a
    // centered empty-state block between them broke that edge.
    <Stat key="you" label="Waiting on you" value={responses > 0 ? String(responses) : "None"} standing={responses > 0 ? "watch" : undefined} size="heading" minWidth={0} />,
    <Stat key="seats" label="Seats filled" value={`${system.justices.length - open} / ${system.justices.length}`} standing={open > 0 ? "watch" : undefined} size="heading" minWidth={0} />,
    <Stat key="next" label="Next court date" value={system.events[0]?.date ?? "Not scheduled"} size="heading" minWidth={0} />,
  ];
  return (
    <Page eyebrow="The federal judiciary" icon="court" title="Courts" lede="The federal courts, the judges who sit on them, and the rulings you need to answer." emblem={<Seal spec={sealFor("SEAL-SUPREME-COURT")} size={72} label="The Supreme Court of the United States" />}>
      <Surface pad="lg" accentEdge="gold">
        <Column gap="md">
          <Row gap="md" wrap>
            <Seal spec={sealFor("SEAL-COURT-OF-APPEALS")} size={40} label="The United States Courts of Appeals" />
            <Text variant="title" flex={1}>Courts rule on their own. You decide how to respond.</Text>
            <Authority cite={LAW.limits} compact />
          </Row>
          <StatGrid max={figures.length}>{figures}</StatGrid>
          <Text variant="caption" tone="secondary">Judges decide each case on their own. Which party appointed them and how they've leaned before tell you about the judges, but neither one decides a ruling. Asking a higher court to review a ruling, or to pause it, doesn't stop the ruling by itself.</Text>
        </Column>
      </Surface>
      <NeedsYou system={system} />
      <ViewTabs label="Courts views" tabs={tabs.map(quiet)} selected={view} onSelect={onView} />
      {view === "nominations" ? <JudicialNominations campaign={campaign} acts={acts} /> : (
        <MainAndRail
          main={view === "bench" ? <><CourtBench campaign={campaign} system={system} /><AgreementMatrix system={system} /></> : <><Docket docket={docket} system={system} /><CaseFlow system={system} /></>}
          rail={<Column gap="xl" width="100%"><CourtAgenda campaign={campaign} system={system} /><Circuits system={system} /></Column>}
        />
      )}
      {acts.reviewSheet}
    </Page>
  );
}
