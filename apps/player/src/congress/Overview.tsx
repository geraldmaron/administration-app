import { useMemo, useState } from "react";
import { campaignDay, type Campaign } from "@admin/engine";
import { appropriationReading, chamberStandings, congressSystem, dispositionReading, electionCountdownReading, extensionNotices, hillCommittees, hillLeaders, nextSenateClass, presidentLean, rollHistory, termTally, warPowersReading, type CongressSystem } from "@admin/player-core";
import { Card, CardGrid, Column, Empty, Meter, ReadingFrame, Row, Segmented, Sticky, Text, useMedia } from "@admin/ui";
import { WhereYouStand } from "./Aisle";
import { ChamberPanel, SelectionCard } from "./Chambers";
import { LAW, senateNominations, type CongressSelection, type CongressView, type SeatMode } from "./model";
import { Authority } from "./ActChooser";
import { BillFlow, LeadersAndChairs, RollRecord, STANCE_METER } from "./Record";
import { Door, Note } from "./parts";
import { MOOD_MARKS, MOOD_TICKS, moodFrame } from "./mood";
import { CitedLawHelp } from "../law/LawHelp";

/** Funding this close to running out is the President's business this week. */
const FUNDING_WATCH_WEEKS = 8;

type WeekItem = { readonly key: string; readonly title: string; readonly detail: string; readonly href?: string; readonly cite?: string };

function weekItems(campaign: Campaign, system: CongressSystem): readonly WeekItem[] {
  const war = warPowersReading(campaign);
  const money = appropriationReading(campaign);
  return [
    ...system.bills.filter((bill) => bill.lane === "desk").map((bill) => ({ key: bill.id, title: bill.title, detail: bill.line, href: bill.href, cite: LAW.presentment })),
    ...(war.unauthorized.length > 0 ? [{ key: "war", title: war.headline, detail: war.detail, cite: LAW.warPowers }] : []),
    ...extensionNotices(campaign).map((notice) => ({ key: notice.id, title: `War Powers clock on ${notice.target}`, detail: notice.line, href: notice.home, cite: LAW.warPowers })),
    ...(money.windowWeeks > 0 && money.weeksLeft <= FUNDING_WATCH_WEEKS ? [{ key: "funding", title: money.headline, detail: money.detail, cite: LAW.appropriations }] : []),
  ];
}

/** The week on the Hill: how Congress regards the administration against an even 50%, what waits on the President, and when the voters next weigh in. */
function HillWeek({ campaign, system }: { readonly campaign: Campaign; readonly system: CongressSystem }) {
  const items = weekItems(campaign, system);
  const room = dispositionReading(campaign);
  const election = electionCountdownReading(campaign);
  const senateClass = nextSenateClass(campaign);
  const floor = system.bills.filter((bill) => bill.lane === "floor").length;
  const desk = system.bills.filter((bill) => bill.lane === "desk").length;
  const nominees = senateNominations(campaign, campaignDay(campaign)).before.length;
  const doors = [
    ...(floor > 0 ? [<Door key="floor" href="/washington/congress?view=bills" title="Bills on the floor" detail={`${floor} this week`} icon="gavel" />] : []),
    ...(nominees > 0 ? [<Door key="noms" href="/washington/congress?view=nominations" title="Nominees waiting on the Senate" detail={`${nominees} waiting`} icon="appoint" />] : []),
    ...(desk > 0 ? [<Door key="desk" href="/washington/congress?view=bills" title="Awaiting your signature" detail={`${desk} to sign`} icon="sign" />] : []),
  ];
  return (
    <Card title="Congress this week" icon="subjectCapitol" edge={items.length > 0 ? "warning" : "gold"}>
      <ReadingFrame {...moodFrame("How Congress regards you", true)}>
        <Column gap="md">
          <Meter label="Congress toward you" value={room.value} figure={`${room.word} ${room.percent}`} tone={STANCE_METER[room.stance]} marks={MOOD_MARKS} />
          {chamberStandings(campaign).map((row) => (
            <Meter key={row.chamber} label={row.name.replace(/^the /, "The ")} value={row.standing.value} figure={`${row.standing.word} ${row.standing.percent}`} tone={STANCE_METER[row.standing.stance]} marks={MOOD_TICKS} />
          ))}
        </Column>
      </ReadingFrame>
      <Text variant="caption" tone="secondary">{room.verdict} This shows how they feel about you, but it doesn't tell you how they'll vote.</Text>
      {doors.length === 0 ? (
        <Empty title="Nothing is waiting on Congress this week" detail="No floor votes are scheduled, no nominee waits on the Senate, and no bill waits for your signature." />
      ) : (
        <CardGrid columns={{ phone: 1, tablet: doors.length, desktop: doors.length, wide: doors.length }} gap="sm">{doors}</CardGrid>
      )}
      {items.length > 0 ? (
        <Column gap="xs">
          <Text variant="label" tone="warning">{desk > 0 ? `${desk} ${desk === 1 ? "bill needs" : "bills need"} your signature` : "Needs your attention"}</Text>
          {items.map((item) => (
            <Column key={item.key} gap="2xs">
              {item.href ? <Door href={item.href} title={item.title} detail={item.detail} icon="caution" /> : <Note tone="warning">{`${item.title}. ${item.detail}`}</Note>}
              {item.cite ? <Authority cite={item.cite} compact /> : null}
            </Column>
          ))}
        </Column>
      ) : null}
      {election ? <Text variant="caption"><Text variant="caption" weight="strong">{election.headline}.</Text> Every House seat{senateClass ? ` and the Class ${senateClass.seatClass} Senate seats` : ""} are up for election.</Text> : null}
    </Card>
  );
}

/** Congress as one system: the week first, the chambers as their members sit beside the state picker, where the President stands among them, the bills on their path, the term's record and the people who run it. */
export function Overview({ campaign, selection, onSelect, onView }: { readonly campaign: Campaign; readonly selection: CongressSelection; readonly onSelect: (next: CongressSelection) => void; readonly onView: (view: CongressView) => void }) {
  const media = useMedia();
  const system = useMemo(() => congressSystem(campaign), [campaign]);
  const story = useMemo(() => ({ tally: termTally(campaign), history: rollHistory(campaign), leaders: hillLeaders(campaign), committees: hillCommittees(campaign), senateClass: nextSenateClass(campaign), you: presidentLean(campaign) }), [campaign]);
  const [mode, setMode] = useState<SeatMode>("party");
  const anyRoll = system.chambers.some((chamber) => chamber.lastRoll);
  return (
    <Column gap="xl">
      <HillWeek campaign={campaign} system={system} />
      <Card id="hill-seats" title="The chambers" icon="subjectChamber" help={<CitedLawHelp title="The seating chart" meaning="Each dot is one member of Congress. They're seated left to right by party, then by where they stand on the economy. Press a dot to open that member's page. Gold rings mark the leaders you'll work with directly. Switch to the last vote to see how each member voted the last time their chamber voted. Pick a state to light up its members." />}>
        <Segmented<SeatMode> label="Color the seats by" options={[{ value: "party", label: "Party", icon: "flag" }, ...(anyRoll ? [{ value: "vote" as const, label: "Last vote", icon: "ballot" as const }] : [])]} value={mode} onChange={setMode} />
        {anyRoll ? null : <Note tone="tertiary">Neither chamber has voted yet, so the seats show party only.</Note>}
        {/* Beside the chambers only where both fit; below that the state card stacks under them rather than squeezing the seating charts. */}
        <Row gap="md" top={Boolean(media.wide)} wrap={!media.wide}>
          <Column flexGrow={1} flexShrink={1} flexBasis={media.wide ? 0 : "100%"} minWidth={0}>
            <CardGrid columns={{ phone: 1, tablet: 1, desktop: 2, wide: 2 }}>
              {system.chambers.map((chamber) => <ChamberPanel key={chamber.chamber} chamber={chamber} mode={mode} selection={selection} onSelect={onSelect} />)}
            </CardGrid>
          </Column>
          <Sticky width={media.wide ? 320 : "100%"}>
            <SelectionCard campaign={campaign} system={system} mode={mode} selection={selection} onSelect={onSelect} />
          </Sticky>
        </Row>
      </Card>
      <WhereYouStand campaign={campaign} chambers={system.chambers} you={story.you} {...(story.senateClass ? { senateClass: story.senateClass } : {})} />
      <BillFlow campaign={campaign} system={system} onPropose={() => onView("bills")} />
      <RollRecord history={story.history} chambers={system.chambers} tally={story.tally} />
      <LeadersAndChairs campaign={campaign} leaders={story.leaders} committees={story.committees} />
    </Column>
  );
}
