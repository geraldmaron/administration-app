import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { closestCalls, compareSeries, electorsReading, finaleChamberParties, finaleReading, formatRatio, legacyReading, place, sealFor, type FinaleContest, type FinaleReading, type LegacyMark, type LegacyReading } from "@admin/player-core";
import { Badge, BenchmarkChart, Button, CardLink, Column, Icon, Meter, Page, PressRow, ReadingFrame, Row, Seal, Text, View, useMedia } from "@admin/ui";
import { StackedBar, segmentKeyEntries } from "@admin/ui/news";
import { TermLine } from "@admin/ui/record";
import { termDoor } from "../handbook/term-door";
import { go } from "../news/story-parts";
import { RecordArea } from "../record/Panel";
import { Haiku } from "../title/Haiku";
import { SelfComparison } from "../record/RecordSections";
import { KIND_WORD, MARK_STATUS, NotYet, PARTY_INK, TERM_MARK_KEY } from "./parts";

/** The night that settled it: the electors on one bar against the majority, the popular vote, and the states it came down to. */
function Night({ campaign, contest }: { readonly campaign: Campaign; readonly contest: FinaleContest }) {
  const electors = electorsReading(campaign, contest);
  const [shown, setShown] = useState(8);
  const calls = closestCalls(contest);
  const electorSegments = electors.parties.map((party) => ({ key: party.party, count: party.seats, label: party.label, ink: PARTY_INK[party.party] }));
  const tiedMarks = [{ id: "even", label: "Tied at 50%", at: 0.5, kind: "historical" as const }];
  return (
    <RecordArea id="election" icon="election" title="How the election was decided">
      {electors.total > 0 ? (
        <ReadingFrame
          title="Electoral votes won by each party"
          unit="Electoral votes"
          period="Election night"
          legend={[...segmentKeyEntries(electorSegments), { id: "majority", kind: "tick", label: `Line: ${electors.majority} electoral votes win`, ink: "color", weight: 2 }]}
          help={{ meaning: "The bar is every electoral vote, split by the party that won it. The line across it is the number needed to win the presidency.", term: termDoor("electoral-college", "Electoral College") }}
        >
          <StackedBar label="The Electoral College" height={18} segments={electorSegments} mark={{ at: electors.majority / electors.total, label: `${electors.majority} to win · ${electors.verdict}` }} />
        </ReadingFrame>
      ) : null}
      <ReadingFrame title="Share of the votes for the two main candidates" unit="% of their combined votes" period="Election night" legend={[{ id: "share", kind: "swatch", label: "Your share", ink: "accent", figure: formatRatio(contest.share) }, { id: "tie", kind: "tick", label: "Line: a tie at 50%", ink: "gold", weight: 2 }]} help={{ meaning: "The filled part of the bar is your share of the votes cast for you and the other main candidate. The line at the middle is a tie.", term: termDoor("vote-share", "Vote share") }}>
        <Meter label="Your share" value={contest.share} figure={formatRatio(contest.share)} tone="accent" marks={tiedMarks} />
      </ReadingFrame>
      {contest.opponent ? <Text variant="body" tone="secondary">{contest.opponent.introduction}</Text> : null}
      {electors.splitStates > 0 ? <Text variant="caption" tone="secondary">{`${electors.splitStates} ${electors.splitStates === 1 ? "state split its electoral votes" : "states split their electoral votes"} by district.`}</Text> : null}
      <Text variant="eyebrow" tone="secondary">Closest states</Text>
      <Column>
        {calls.slice(0, shown).map((row) => (
          <PressRow key={row.state} label={`Open ${row.name}`} href={place.state(row.state)} onPress={() => go(place.state(row.state))} flexDirection="row" alignItems="center" gap="sm" paddingVertical="xs" paddingHorizontal="xs" minHeight={44} borderRadius="control">
            <View width={52}><Badge status={row.forYou ? "success" : "danger"}>{row.forYou ? "Won" : "Lost"}</Badge></View>
            <Column flex={1} minWidth={0} gap="2xs">
              <Text variant="label">{row.name}</Text>
              <Text variant="caption" tone="secondary">{`${row.electoralVotes} electoral ${row.electoralVotes === 1 ? "vote" : "votes"}. ${row.margin}.`}</Text>
            </Column>
            <Icon name="chevron" size={16} tone="colorTertiary" />
          </PressRow>
        ))}
      </Column>
      {calls.length > shown ? <Row><Button kind="secondary" size="compact" onPress={() => setShown(calls.length)}>{`Show all ${calls.length} states`}</Button></Row> : null}
    </RecordArea>
  );
}

/** The Congress the next President meets, each chamber by party against its majority. */
function Chambers({ finale }: { readonly finale: FinaleReading }) {
  return (
    <RecordArea id="congress" icon="subjectChamber" title="The Congress the next President will work with">
      {finale.chambers.map((chamber) => {
        const seats = chamber.composition.administration + chamber.composition.opposition + chamber.composition.independent;
        const parties = finaleChamberParties(chamber).map((party) => ({ key: party.party, count: party.seats, label: party.label, ink: PARTY_INK[party.party] }));
        const majority = Math.floor(seats / 2) + 1;
        const verdict = chamber.swing === undefined ? undefined : chamber.swing === 0 ? "The last election didn't change any seats." : `Your side of Congress ${chamber.swing > 0 ? "gained" : "lost"} ${Math.abs(chamber.swing)} seats in the last election.`;
        return (
          <Column key={chamber.chamber} gap="xs">
            <Row gap="sm"><Seal spec={sealFor(chamber.chamber === "house" ? "SEAL-HOUSE" : "SEAL-SENATE")} size={28} /><Text variant="label">{chamber.name}</Text></Row>
            <ReadingFrame title="Seats by party" unit="Seats" period="After the last election" legend={[...segmentKeyEntries(parties), { id: "majority", kind: "tick", label: `Line: ${majority} seats make a majority`, ink: "color", weight: 2 }]} help={{ meaning: "The bar is every seat in the chamber, split by party. The line across it is the number needed for a majority.", term: termDoor("congress", "Congress") }}>
              <StackedBar label={chamber.name} height={14} segments={parties} mark={{ at: majority / Math.max(1, seats), label: `${majority} seats make a majority${verdict ? ` · ${verdict}` : ""}` }} />
            </ReadingFrame>
          </Column>
        );
      })}
    </RecordArea>
  );
}

function Marks({ marks, legacy }: { readonly marks: readonly LegacyMark[]; readonly legacy: LegacyReading }) {
  const [shown, setShown] = useState(6);
  const latest = [...marks].reverse();
  return (
    <RecordArea id="decisions" icon="decision" title="Big decisions and what followed">
      <ReadingFrame title="Marked decisions across your term" unit="One dot for each marked decision" period={`${legacy.from} to ${legacy.to}`} legend={TERM_MARK_KEY} help={{ meaning: "The line is your whole term, from the oath to the last day. Each dot is a decision or event the game marked, placed on the day it happened. The list below names each one." }}>
        <TermLine marks={marks.map((mark) => ({ key: mark.key, at: mark.at, label: mark.label, tone: mark.tone }))} span={legacy.span} from={legacy.from} to={legacy.to} />
      </ReadingFrame>
      {latest.length === 0 ? <Text variant="body" tone="secondary">No decisions were marked this term.</Text> : null}
      {latest.slice(0, shown).map((mark) => (
        <Row key={mark.key} gap="sm" top>
          <View width={80}><Badge status={MARK_STATUS[mark.tone]}>{KIND_WORD[mark.kind]}</Badge></View>
          <Column flex={1}><Text variant="label">{mark.label}</Text><Text variant="caption" tone="tertiary">{mark.date}</Text></Column>
        </Row>
      ))}
      {latest.length > shown ? <Row><Button kind="secondary" size="compact" onPress={() => setShown(latest.length)}>{`Show all ${latest.length}`}</Button></Row> : null}
    </RecordArea>
  );
}

/** Approval from the oath to the last day, against the lines history draws, and the President against their own past. */
const oathMarks = (value: number, format: (ratio: number) => string) => [{ id: "oath", label: `At the oath, ${format(value / 100)}`, at: value / 100, kind: "historical" as const }];

function Term({ campaign, legacy }: { readonly campaign: Campaign; readonly legacy: LegacyReading }) {
  const first = legacy.approval[0];
  const last = legacy.approval.at(-1);
  const benchmarks = useMemo(() => compareSeries(campaign, "approval", [{ kind: "self" }], "term").benchmarks, [campaign]);
  return (
    <RecordArea id="term" icon="graph" title="From the oath to the last day">
      <Text variant="body" tone="secondary">{`${legacy.from} to ${legacy.to}, ${Math.max(1, Math.round(legacy.span / 7))} weeks. ${legacy.laws.line} ${legacy.promises.line}`}</Text>
      {first && last ? (
        <ReadingFrame title="Approval on the last day" unit="% of adults who approve" period="Last day, against the oath" legend={[{ id: "approval", kind: "swatch", label: "Approval on the last day", ink: "accent", figure: formatRatio(last.value / 100) }, { id: "oath", kind: "tick", label: "Line: where approval stood at your oath", ink: "gold", weight: 2 }]} help={{ meaning: "The filled part of the bar is the share of adults who approved of you on your last day. The gold line is where it stood at your oath.", term: termDoor("approval-rating", "Approval rating") }}>
          <Meter label="Approval on the last day" value={last.value / 100} figure={formatRatio(last.value / 100)} tone="accent" marks={oathMarks(first.value, formatRatio)} />
        </ReadingFrame>
      ) : null}
      {legacy.approval.length > 2 ? <BenchmarkChart title="Approval, week by week" unit="% of adults who approve" period="Oath to last day" help={{ meaning: "Your approval rating each week of the term, with the lines past presidents reached beside it.", term: termDoor("approval-rating", "Approval rating") }} x={legacy.approval.map((point) => point.label)} series={[{ id: "own", label: "Your presidency", values: legacy.approval.map((point) => point.value / 100), kind: "self" }]} benchmarks={benchmarks} domain={[0, 1]} format={formatRatio} better="up" /> : null}
            <Text variant="label" tone="secondary" role="heading" aria-level={3}>Compared with history and your own earlier weeks</Text>
      <SelfComparison campaign={campaign} metrics={["approval"]} />
    </RecordArea>
  );
}

/** The next President, the whole card a door to their file. */
function Successor({ successor }: { readonly successor: NonNullable<FinaleReading["successor"]> }) {
  return (
    <CardLink label={`Open ${successor.name}'s file`} href={place.person(successor.id)} onPress={() => go(place.person(successor.id))}>
      <Column gap="md">
        <Row gap="sm"><Icon name="subjectPerson" size={22} tone="colorSecondary" /><Text variant="heading" role="heading" aria-level={2} flex={1}>{`${successor.name} takes the oath`}</Text><Icon name="chevron" size={18} tone="colorTertiary" /></Row>
        {successor.lines.map((line) => <Text key={line} variant="body">{line}</Text>)}
      </Column>
    </CardLink>
  );
}

/** How the presidency ended: the outcome and why, the electors counted, the decisions that marked the term, the term against history, and the Congress left behind. */
export function Ending({ campaign }: { readonly campaign: Campaign }) {
  const media = useMedia();
  const finale = finaleReading(campaign);
  const legacy = legacyReading(campaign);
  if (!finale || !legacy) return <NotYet eyebrow="The ending" title="There's no ending to read yet" body="Your ending appears here once your time in office is over." door={{ label: "Back to the Brief", href: place.brief() }} />;
  return (
    <Page eyebrow={`The ending · ${finale.when}`} icon="record" title={finale.title} lede={finale.opening} emblem={<Seal spec={sealFor("SEAL-PRESIDENT")} size={media.phone ? 56 : 80} label="Seal of the President of the United States" />}>
      {finale.account ? <Text variant="title" serif weight="regular">{finale.account}</Text> : null}
      {finale.contest ? <Night campaign={campaign} contest={finale.contest} /> : null}
      {finale.successor ? <Successor successor={finale.successor} /> : null}
      <Marks marks={legacy.marks} legacy={legacy} />
      <Term campaign={campaign} legacy={legacy} />
      <Chambers finale={finale} />
      <Text variant="title" serif weight="regular">{finale.closing}</Text>
      <Text variant="body" tone="secondary">Read your legacy next, or look back over the whole term in the Record.</Text>
      <Haiku id="term-end" />
      <Row gap="sm" wrap role="navigation" aria-label="What comes next">
        <Button kind="gold" icon="record" onPress={() => go(place.legacy())}>Read the legacy</Button>
        <Button kind="secondary" icon="record" onPress={() => go(place.record())}>Open the Record</Button>
        <Button kind="quiet" icon="archive" onPress={() => go(place.administrations())}>Your administrations</Button>
      </Row>
    </Page>
  );
}
