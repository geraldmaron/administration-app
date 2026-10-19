import { useMemo } from "react";
import { seatKindOf, type Campaign, type OfficeId } from "@admin/engine";
import { inquiryPipeline, inspectorsBoard, noticesOwed, sealFor, vacancyBoard } from "@admin/player-core";
import { Badge, Card, Column, Page, Row, Seal, Stat, StatGrid, Surface, Text } from "@admin/ui";
import { ViewTabs, type ViewTab } from "@admin/ui/nation";
import { Authority } from "../congress/ActChooser";
import { useActCommit } from "../congress/commit";
import { Door, quiet } from "../congress/parts";
import { CitedLawHelp } from "../law/LawHelp";
import { AppointmentDesk } from "./Appointments";
import { Directives } from "./Directives";
import { Inquiries } from "./Inquiries";
import { Inspectors } from "./Inspectors";
import { NoticesOwed } from "./Notices";
import { Officers } from "./Officers";
import { LAW, type OversightView } from "./model";

const OF_YOU = { tag: "Checks on you", basis: "Committees in Congress and the inspectors general (independent watchdogs inside each agency) look into how your government works. You have to answer what the law requires, but you can't stop an investigation." };
const BY_YOU = { tag: "Your checks on your government", basis: "What you tell your own government to do, and the people you appoint or remove to do it. You'll see how each choice compares before you approve it." };

function Basis({ direction }: { readonly direction: typeof OF_YOU }) {
  return (
    <Row gap="sm" wrap>
      <Badge status="outline" icon="review">{direction.tag}</Badge>
      <Text variant="caption" tone="secondary" flex={1} minWidth={220}>{direction.basis}</Text>
    </Row>
  );
}

/** Oversight: what is looking at the government, and what the President directs it to do, as views of one subject held in the address. */
export function OversightScreen({ campaign, view, onView, seat }: { readonly campaign: Campaign; readonly view: OversightView; readonly onView: (view: OversightView) => void; readonly seat?: OfficeId }) {
  const acts = useActCommit(campaign);
  const pipeline = useMemo(() => inquiryPipeline(campaign), [campaign]);
  const owed = useMemo(() => noticesOwed(campaign), [campaign]);
  const inspectors = useMemo(() => inspectorsBoard(campaign), [campaign]);
  // Only the seats the appointments desk can fill: an office the President fills alone has no nomination to send.
  const vacancies = useMemo(() => vacancyBoard(campaign).open.filter((row) => seatKindOf(row.office) !== undefined), [campaign]);
  const open = pipeline.stages.flatMap((stage) => stage.matters);
  const into = open.filter((row) => row.received);
  const directed = open.filter((row) => !row.received);
  const audits = inspectors.filter((row) => row.openMatters > 0 || row.posture !== "in-post").length;
  const obstructed = into.filter((row) => row.obstructed).length;
  const figures = [
    ...(into.length > 0 ? [<Stat key="into" label="Investigations of you" value={String(into.length)} standing={obstructed > 0 ? "watch" : undefined} source={obstructed ? `${obstructed} where someone got in the way` : `${into.filter((row) => row.public).length} public`} size="heading" minWidth={0} />] : []),
    ...(owed.length > 0 ? [<Stat key="owed" label="Reports you owe" value={String(owed.length)} standing="watch" source="To the intelligence committees" size="heading" minWidth={0} />] : []),
    ...(directed.length > 0 ? [<Stat key="directed" label="Reviews you ordered" value={String(directed.length)} size="heading" minWidth={0} />] : []),
    ...(audits > 0 ? [<Stat key="audits" label="Inspectors general at work" value={String(audits)} size="heading" minWidth={0} />] : []),
    ...(vacancies.length > 0 ? [<Stat key="vacant" label="Empty jobs to fill" value={String(vacancies.length)} standing="watch" source="No nominee sent to the Senate" size="heading" minWidth={0} />] : []),
  ];
  const tabs: readonly ViewTab<OversightView>[] = [
    { id: "inquiries", label: "Investigations", icon: "review", count: into.length + owed.length },
    { id: "directives", label: "Instructions", icon: "order", count: directed.length },
    { id: "inspectors", label: "Inspectors general", icon: "departmentInvestigation", count: audits },
    { id: "appointments", label: "Appointments", icon: "appoint", count: vacancies.length },
  ];
  return (
    <Page eyebrow="Accountability" icon="review" title="Oversight" lede="Who's looking into your government, and the instructions you give it." emblem={<Seal spec={sealFor("INST-CONGRESS")} size={72} label="The United States Congress" />}>
      <Surface pad="lg" accentEdge="gold">
        <Column gap="md">
          <Row gap="sm" wrap>
            <Text variant="title" flex={1}>At a glance</Text>
            <Authority cite={LAW.inspectors} compact />
            <Authority cite={LAW.covertNotice} compact />
          </Row>
          {figures.length > 0 ? <StatGrid max={figures.length}>{figures}</StatGrid> : <Text variant="body" tone="secondary">Nothing is open: no investigations of you, no reports owed, no reviews you ordered, no audits running, and no empty jobs to fill.</Text>}
        </Column>
      </Surface>
      <ViewTabs label="Views of oversight" tabs={tabs.map(quiet)} selected={view} onSelect={onView} />
      {view === "inquiries" ? <><Basis direction={OF_YOU} /><NoticesOwed campaign={campaign} acts={acts} /><Inquiries pipeline={pipeline} direction="received" /></> : null}
      {view === "directives" ? <><Basis direction={BY_YOU} /><Directives campaign={campaign} acts={acts} /><Inquiries pipeline={pipeline} direction="directed" /></> : null}
      {view === "inspectors" ? <><Basis direction={BY_YOU} /><Inspectors campaign={campaign} acts={acts} /></> : null}
      {view === "appointments" ? (
        <>
          <Basis direction={BY_YOU} />
          <Card title="Appointments" icon="appoint" help={<CitedLawHelp title="Appointments and empty jobs" meaning="You nominate people for the top jobs in your government, and the Senate has to approve them. While a job is empty, a law called the Vacancies Act limits who can fill in and for how long." cites={[LAW.appointments, LAW.vacancies]} />}>
            {seat ? <Door href="/washington/oversight?view=appointments" title="Showing one seat" detail="See every open seat" icon="appoint" /> : null}
            <AppointmentDesk key={seat ?? "all"} campaign={campaign} acts={acts} pipeline={!seat} {...(seat ? { scope: { office: seat }, focus: seat } : {})} empty={seat ? "That job is filled, or your nominee is already waiting on the Senate." : "Every job that needs Senate approval is filled or has a nominee waiting on the Senate. A job opens up when the person in it leaves."} />
          </Card>
          <Officers campaign={campaign} acts={acts} />
        </>
      ) : null}
      {acts.reviewSheet}
    </Page>
  );
}
