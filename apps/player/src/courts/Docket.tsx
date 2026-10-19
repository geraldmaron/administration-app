import { useMemo } from "react";
import { router } from "expo-router";
import type { Campaign } from "@admin/engine";
import { agenda, buildCalendar, place, type CourtCircuit, type CourtDocket, type CourtSystem, type DocketCase } from "@admin/player-core";
import { Agenda, Badge, Card, CardLink, Column, Empty, Icon, Meter, ReadingFrame, Row, Surface, Text, useMedia, View, type KeyEntry } from "@admin/ui";
import { termDoor } from "../handbook/term-door";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { dateKey, dayLabel, eventRow, relativeDays } from "../calendar/rows";
import { Door, Paged, ProjectionBadge, go } from "../congress/parts";
import { CitedLawHelp } from "../law/LawHelp";
import { LANES, LANE_WORDS, LAW, caseStatusWords, circuitWords, dueWords, strikeVerdict, weeksWords } from "./model";

/** The President's own deadlines first; then the open seats; then stays pending without a date. */
export function NeedsYou({ system }: { readonly system: CourtSystem }) {
  const answers = system.cases.filter((entry) => entry.response).sort((a, b) => a.response!.turn - b.response!.turn);
  const stays = system.cases.filter((entry) => entry.stayPending);
  const open = system.justices.filter((justice) => justice.vacant);
  const unnamed = open.filter((justice) => !justice.pending).length;
  if (answers.length === 0 && open.length === 0 && stays.length === 0) return null;
  return (
    <Card title={answers.length ? "You need to respond" : unnamed ? "You can nominate a judge" : "Nothing from the courts needs you"} icon={answers.length ? "decision" : "court"} edge={answers.length ? "danger" : unnamed ? "warning" : undefined}>
      {answers.map((entry) => <Door key={entry.id} href={entry.href} title={entry.title} detail={`Answer due ${entry.response!.date} · ${weeksWords(entry.response!.weeks)}. If you don't answer, the lower court's ruling becomes final.`} icon="decision" />)}
      {open.length ? <Door href={`${place.courts()}?view=nominations`} title={`${open.length} open Supreme Court ${open.length === 1 ? "seat" : "seats"}`} detail={unnamed ? `${unnamed} waiting for you to pick someone` : "Your nominee is waiting on the Senate"} icon="appoint" /> : null}
      {stays.map((entry) => <Door key={entry.id} href={entry.href} title={entry.title} detail="Request to pause the ruling · No decision date yet" icon="pending" />)}
    </Card>
  );
}

const STRIKE_KEY: readonly KeyEntry[] = [
  { id: "upheld", kind: "swatch", label: "Likely upheld", ink: "successInk" },
  { id: "toss", kind: "swatch", label: "Toss-up", ink: "warningInk" },
  { id: "struck", kind: "swatch", label: "Likely struck down", ink: "danger" },
];

/** A staff reading of the chance a challenged order is struck down, drawn on a meter whose middle is "uncertain". */
export function StrikeMeter({ chance, caption }: { readonly chance: number; readonly caption?: string }) {
  const verdict = strikeVerdict(chance);
  return (
    <Column gap="2xs">
      <ProjectionBadge />
      <ReadingFrame title="Chance it's struck down" unit="Your staff's judgment in three steps, not a percentage" legend={STRIKE_KEY} help={{ meaning: "Your staff reads the justices taking part and the legal argument against the order. The bar sits at one of three places: likely upheld on the left, a toss-up in the middle, likely struck down on the right. It is a judgment, not a measured probability.", term: termDoor("struck-down", "struck down") }}>
        <Meter label="Chance it's struck down" value={verdict.at} figure={verdict.word} tone={verdict.tone === "danger" ? "danger" : verdict.tone === "warning" ? "warningInk" : "successInk"} />
      </ReadingFrame>
      <Text variant="caption" tone="tertiary">{caption ? `This is your staff's judgment, not a measured probability. ${caption}` : "This is your staff's judgment, not a measured probability."}</Text>
    </Column>
  );
}

function CaseRow({ row }: { readonly row: DocketCase }) {
  const status = caseStatusWords(row);
  return (
    <CardLink label={`Open the case on ${row.orderName}`} href={row.href} onPress={() => go(row.href)} pad="md">
      <Column gap="xs">
        <Row between wrap gap="sm">
          <Row gap="xs" flex={1} minWidth={200} top>
            <Icon name="court" size={16} tone="colorSecondary" />
            <Text variant="label" flexShrink={1}>{row.orderName}</Text>
          </Row>
          <Badge status={status.status} icon={row.status === "pending" ? "pending" : row.status === "upheld" ? "statusIssued" : "statusBlocked"}>{status.label}</Badge>
        </Row>
        <Text variant="body">{row.question}</Text>
        <Text variant="caption" tone="secondary">{row.status === "pending" ? `${row.lowerForum?.court ?? "Court not known yet"} · ${dueWords(row)}` : `${row.split ?? "Vote count not known"} · ${row.ruled ?? "Date not known"}`}</Text>
        {row.status === "pending" ? <Text variant="caption">{row.groundWords}</Text> : null}
        {row.status === "pending" && row.strikeChance !== undefined ? <StrikeMeter chance={row.strikeChance} caption="It's based on which justices are taking part and the legal argument against the order." /> : null}
      </Column>
    </CardLink>
  );
}

/** The stage counts as one bar, then each pending case and every ruling handed down. */
export function Docket({ docket, system }: { readonly docket: CourtDocket; readonly system: CourtSystem }) {
  const total = LANES.reduce((sum, lane) => sum + system.lanes[lane], 0);
  return (
    <Card title="Cases before the courts" icon="order" help={<CitedLawHelp title="How courts check you" meaning="Federal courts can rule that something you did breaks the law. A challenge goes through a few steps before it can reach the Supreme Court. First a judge decides whether the case can go forward. The judge may put a temporary order in place. Then the district court rules on the main question. Appeals and Supreme Court review don't happen automatically. Your Attorney General handles your side of every case." cites={[LAW.litigation, LAW.limits]} />}>
      <Row wrap gap="sm" role="list" aria-label="Cases at each step">
        {LANES.map((lane) => (
          <Column key={lane} role="listitem" flex={1} minWidth={110} gap="2xs">
            <Text variant="caption" tone="secondary" numberOfLines={1}>{LANE_WORDS[lane]}</Text>
            <Text variant="heading" tabular>{system.lanes[lane]}</Text>
            <View height={6} borderRadius="chip" backgroundColor="borderColor"><View height={6} borderRadius="chip" backgroundColor={lane === "decision" ? "successInk" : "accent"} width={`${total ? (system.lanes[lane] / total) * 100 : 0}%`} /></View>
          </Column>
        ))}
      </Row>
      {docket.pending.length === 0 ? <Empty title="No cases are open" detail="If someone challenges one of your actions, the case goes through the lower courts before it can reach the Supreme Court." /> : docket.pending.map((row) => <CaseRow key={row.id} row={row} />)}
      <Text variant="label">Rulings</Text>
      <Paged items={docket.ruled} initial={8} noun="rulings" empty="The courts haven't ruled on anything yet." render={(row) => <CaseRow key={row.id} row={row} />} />
    </Card>
  );
}

/** Every live case on the one path it travels, counted once at its current step, and the recent decisions at its end. */
export function CaseFlow({ system }: { readonly system: CourtSystem }) {
  const media = useMedia();
  const live = system.cases.length;
  return (
    <Card title="Where each case stands" icon="layerReading" help={<CitedLawHelp title="The case path" meaning="Each case shows up once, at the step it's on now. A higher court can send a case back to the district court to look at again. A request to pause a ruling is separate from the appeal itself." />}>
      {live === 0 && system.decided.length === 0 ? <Empty title="There are no cases right now" detail="When someone files one, it shows here with its court, its next date, and anything you need to answer." /> : null}
      <Row gap="sm" top wrap={!media.desktop}>
        {LANES.map((lane) => {
          const cases = system.cases.filter((entry) => entry.lane === lane);
          const count = lane === "decision" ? system.decided.length : cases.length;
          if (count === 0) return null;
          return (
            <Surface key={lane} level="sunken" pad="sm" flex={1} minWidth={media.desktop ? 0 : 160}>
              <Column gap="xs">
                <Row between><Text variant="eyebrow" tone="secondary">{LANE_WORDS[lane]}</Text><Text variant="label" tabular>{count}</Text></Row>
                {lane === "decision"
                  ? system.decided.map((entry) => (
                      <CardLink key={entry.href} label={`Open the case on ${entry.title}`} href={entry.href} onPress={() => go(entry.href)} pad="sm" radius="chip" gap="2xs" minHeight={44}>
                        <Text variant="label">{entry.title}</Text>
                        <Text variant="caption" tone="secondary">{entry.upheld ? "Upheld" : "Struck down"}{entry.split ? `, ${entry.split}` : ""} · {entry.ruled}</Text>
                      </CardLink>
                    ))
                  : cases.map((entry) => (
                      <CardLink key={entry.id} label={`Open the case on ${entry.title}`} href={entry.href} onPress={() => go(entry.href)} pad="sm" radius="chip" gap="2xs" minHeight={44}>
                        <Text variant="label">{entry.title}</Text>
                        <Text variant="caption" tone="secondary">{entry.forum}</Text>
                        <Text variant="caption">Next: {entry.next.date}, {weeksWords(entry.next.weeks)}</Text>
                        {entry.response ? <Text variant="caption" tone="danger">Your answer due {entry.response.date}</Text> : null}
                        {entry.stayPending ? <Text variant="caption" tone="warning">Request to pause is pending. No decision date yet.</Text> : null}
                      </CardLink>
                    ))}
              </Column>
            </Surface>
          );
        })}
      </Row>
    </Card>
  );
}

/** The court dates from the one calendar the whole player reads, in the agenda every other screen draws. */
export function CourtAgenda({ campaign, system }: { readonly campaign: Campaign; readonly system: CourtSystem }) {
  const openAuthority = useOpenAuthority();
  const days = useMemo(() => {
    const actions = { go: (href: string) => router.push(href as never), cite: openAuthority, refs: () => null };
    return agenda(buildCalendar(campaign).filter((event) => event.kind === "court"), campaign.calendar, 400).map((day) => ({ key: dateKey(day.date), label: dayLabel(day.date), relative: relativeDays(campaign, day.date), rows: day.events.map((event) => eventRow(event, actions)) }));
  }, [campaign, openAuthority]);
  return (
    <Card title="The year ahead" icon="schedule" help={<CitedLawHelp title="The court calendar" meaning="The Supreme Court's term starts in October. It hears most of its arguments during the term and usually announces its rulings by late June. Emergency requests can be decided at any time. Only dates that are already set show up here." />}>
      {system.terms.map((term) => <Text key={term.label} variant="caption" tone="secondary">{term.label}: {term.start.date} to {term.end.date}</Text>)}
      <Agenda days={days} empty="No court dates are set yet." />
    </Card>
  );
}

const CIRCUIT_KEY: readonly KeyEntry[] = [
  { id: "dem", kind: "swatch", label: "Judges picked by a Democratic President (their appointer's party, not how they lean)", ink: "partyDem" },
  { id: "rep", kind: "swatch", label: "Judges picked by a Republican President", ink: "partyRep" },
  { id: "open", kind: "swatch", label: "Open seat", ink: "borderColorStrong", hollow: true },
];

function CircuitRow({ circuit }: { readonly circuit: CourtCircuit }) {
  const filled = circuit.democratic + circuit.republican;
  return (
    <Row gap="md" wrap paddingVertical="xs" borderBottomWidth={1} borderColor="borderColor">
      <Column minWidth={140} flex={1}>
        <Text variant="label">{circuitWords(circuit.name)}</Text>
        <Text variant="caption" tone="secondary">{circuit.states.join(", ")}</Text>
      </Column>
      <Column minWidth={180} flex={2} gap="2xs">
        <View height={8} flexDirection="row" borderRadius="chip" overflow="hidden" backgroundColor="borderColor" role="img" aria-label={`${circuit.democratic} judges picked by Democratic presidents, ${circuit.republican} by Republican presidents, ${circuit.vacant} open seats`}>
          {circuit.democratic > 0 ? <View flexGrow={circuit.democratic} flexBasis={0} backgroundColor="partyDem" /> : null}
          {circuit.vacant > 0 ? <View flexGrow={circuit.vacant} flexBasis={0} backgroundColor="borderColor" /> : null}
          {circuit.republican > 0 ? <View flexGrow={circuit.republican} flexBasis={0} backgroundColor="partyRep" /> : null}
        </View>
        <Text variant="caption">{filled === 0 ? "No seats filled" : `${circuit.democratic} picked by Democrats · ${circuit.republican} by Republicans`}{circuit.vacant ? ` · ${circuit.vacant} open` : ""}</Text>
      </Column>
      <Text variant="caption" weight="strong" tone={circuit.caseIds.length ? "warning" : "tertiary"}>{circuit.caseIds.length ? `${circuit.caseIds.length} open ${circuit.caseIds.length === 1 ? "case" : "cases"}` : "No open cases"}</Text>
    </Row>
  );
}

/** The thirteen circuits: where cases are filed and the balance of appointing parties, which describes a bench and predicts no ruling. */
export function Circuits({ system }: { readonly system: CourtSystem }) {
  return (
    <Card title="Appeals courts by region" icon="mapPin" help={<CitedLawHelp title="The circuits" meaning="The country is split into regions called circuits, and each one has its own appeals court. The colors show which party's presidents picked the judges. That tells you who the judges are, not how any of them will rule." />}>
      <ReadingFrame title="Who picked each appeals court's judges" unit="Judges per region, by the party of the President who appointed them. Blue and red here name that party, not a judge's lean" legend={CIRCUIT_KEY} help={{ meaning: "Each bar is one appeals court. The colors show which party's presidents picked its judges. That tells you who the judges are, not how any of them will rule. The Supreme Court bench above uses blue and red for something else: how a justice has voted, never who appointed them." }}>
        <Paged items={[...system.circuits].sort((a, b) => b.caseIds.length - a.caseIds.length)} initial={6} noun="circuits" render={(circuit) => <CircuitRow key={circuit.name} circuit={circuit} />} />
      </ReadingFrame>
    </Card>
  );
}
