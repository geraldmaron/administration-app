import { BILL_LANES, FLOOR_GROUP_TITLE, place, type CongressChamber, type CongressSystem, type HillCommittee, type HillLeader, type RollHistoryEntry, type TermTally } from "@admin/player-core";
import type { Campaign } from "@admin/engine";
import { Badge, Button, Card, CardLink, Column, Empty, Meter, ReadingFrame, Row, Surface, Text, useMedia, View } from "@admin/ui";
import { RollChart, rollKeyEntries } from "@admin/ui/legislature";
import { LAW } from "./model";
import { Authority } from "./ActChooser";
import { Note, Paged, RowLink, go } from "./parts";
import { CitedLawHelp, useLawViews } from "../law/LawHelp";
import { PersonName } from "../dossier/PersonPeek";
import { termDoor } from "../handbook/term-door";
import { moodFrame } from "./mood";
import { Sponsor } from "./Sponsor";

type Ink = "successInk" | "infoInk" | "danger" | "warningInk" | "colorTertiary" | "pendingInk";

const TALLY: readonly { readonly key: keyof TermTally; readonly label: string; readonly ink: Ink }[] = [
  { key: "signed", label: "Signed into law", ink: "successInk" },
  { key: "unsigned", label: "Law without your signature", ink: "infoInk" },
  { key: "overridden", label: "Passed over your veto", ink: "danger" },
  { key: "vetoed", label: "Vetoed, and the veto held", ink: "warningInk" },
  { key: "died", label: "Died in Congress", ink: "colorTertiary" },
  { key: "pending", label: "Still moving", ink: "pendingInk" },
];

export const STANCE_METER = { favorable: "successInk", caution: "warningInk", adverse: "danger", neutral: "accent" } as const;

/** Every bill of the term as one tile, colored by what it came to, with the count beside each name. */
function TermStrip({ tally }: { readonly tally: TermTally }) {
  const total = TALLY.reduce((sum, kind) => sum + tally[kind.key], 0);
  return (
    <ReadingFrame
      title="Your record with this Congress"
      unit={total === 0 ? "No bill yet" : `${total} ${total === 1 ? "bill" : "bills"}, one square each`}
      period="This term"
      legend={TALLY.map((kind) => ({ id: kind.key, kind: "swatch" as const, label: kind.label, ink: kind.ink, figure: tally[kind.key], ...(tally[kind.key] === 0 ? { faint: true } : {}) }))}
      help={{ meaning: "Every bill that reached Congress this term is one square, colored by what it came to. The key counts each outcome.", term: termDoor("bill-to-law", "how a bill becomes law") }}
    >
      {total > 0 ? (
        <Row wrap gap="2xs" role="img" aria-label={TALLY.filter((kind) => tally[kind.key] > 0).map((kind) => `${kind.label} ${tally[kind.key]}`).join(", ")}>
          {TALLY.flatMap((kind) => Array.from({ length: tally[kind.key] }, (_, i) => <View key={`${kind.key}-${i}`} width={14} height={14} borderRadius="chip" backgroundColor={kind.ink} />))}
        </Row>
      ) : (
        <Empty title="No bill has reached Congress yet" detail="Bills that are introduced this term are counted here as they move toward law." />
      )}
    </ReadingFrame>
  );
}

function RollRow({ entry }: { readonly entry: RollHistoryEntry }) {
  return (
    <RowLink label={`Open ${entry.title}. ${entry.chamber === "house" ? "House" : "Senate"} vote on ${entry.date}, ${entry.yeas} to ${entry.nays}, ${entry.passed ? "passed" : "failed"}`} href={entry.href}>
      <Row gap="sm" wrap between>
        <Column flexGrow={1} flexShrink={1} flexBasis={240} gap="2xs">
          <Text variant="caption" tone="secondary">{entry.date} · {entry.chamber === "house" ? "House" : "Senate"} · {entry.question}</Text>
          <Text variant="label">{entry.title}</Text>
        </Column>
        <Column gap="2xs">
          <Text variant="caption" weight="strong" tone={entry.passed ? "success" : "danger"}>
            {entry.yeas}–{entry.nays} {entry.passed ? "passed" : "failed"}
          </Text>
          <Text variant="caption" tone="tertiary">{entry.required} needed</Text>
        </Column>
      </Row>
    </RowLink>
  );
}

/** Every roll call of the term, drawn oldest to newest against the line each needed, then listed newest first. */
export function RollRecord({ history, chambers, tally }: { readonly history: readonly RollHistoryEntry[]; readonly chambers: readonly CongressChamber[]; readonly tally: TermTally }) {
  const presentment = useLawViews([LAW.presentment]);
  const newest = [...history].sort((a, b) => b.turn - a.turn || a.key.localeCompare(b.key));
  return (
    <Card title="Votes this term" icon="record">
      <TermStrip tally={tally} />
      {chambers.map((chamber) => {
        const entries = history.filter((entry) => entry.chamber === chamber.chamber);
        const label = chamber.name.replace(/^the /, "The ");
        return (
          <Column key={chamber.chamber} gap="xs">
            <Text variant="label">{label} · {entries.length} {entries.length === 1 ? "vote" : "votes"}</Text>
            {entries.length === 0 ? (
              <Empty title="No votes yet" detail="Each recorded vote on a bill or nominee will be listed here." />
            ) : (
              <ReadingFrame
                title={`${label}: votes this term`}
                unit={`Members voting, against ${chamber.seats} seats`}
                period="Oldest vote on the left"
                legend={rollKeyEntries(entries)}
                pressHint="Press a column to open its bill."
                help={{ meaning: "Each column is one vote, with the oldest on the left. Yes votes rise above the line and no votes drop below it, in party colors. The taller the bar, the bigger the share of the chamber. The gold line shows how many votes the question needed. A pale column means only the total was kept, without members' names.", law: presentment, term: termDoor("congress-counts", "how votes are counted") }}
              >
                <RollChart label={`${label}: ${entries.filter((entry) => entry.passed).length} of ${entries.length} votes passed.`} seats={chamber.seats} keyed={false} entries={entries.map((entry) => ({ id: entry.key, yeas: entry.yeas, nays: entry.nays, required: entry.required, passed: entry.passed, ...(entry.byParty ? { byParty: entry.byParty } : {}) }))} onEntry={(id) => { const hit = entries.find((entry) => entry.key === id); if (hit) go(hit.href); }} />
              </ReadingFrame>
            )}
          </Column>
        );
      })}
      <Paged items={newest} initial={8} noun="votes" render={(entry) => <RollRow key={entry.key} entry={entry} />} />
    </Card>
  );
}

/** Every bill in the chambers on the one path it travels, counted once where it stands. */
export function BillFlow({ campaign, system, onPropose }: { readonly campaign: Campaign; readonly system: CongressSystem; readonly onPropose: () => void }) {
  const media = useMedia();
  const live = system.bills.length;
  return (
    <Card title="Bills in Congress" icon="dossier" actions={<Button kind="secondary" size="compact" icon="dispatch" onPress={onPropose}>Propose a bill</Button>} help={<CitedLawHelp title="How a bill becomes law" meaning="First a committee studies the bill and makes changes. Then each chamber debates it and votes. If the House and Senate pass different versions, they work out one version together. Then it comes to you. You have ten days (not counting Sundays) to sign it or veto it. Two-thirds of each chamber can pass it over your veto. A bill that gets stuck three times dies." steps={["A committee studies and changes it", "Each chamber votes on it", "The chambers agree on one version", "You sign it, veto it, or let ten days pass", "Two-thirds of each chamber can override a veto"]} cites={[LAW.presentment, LAW.recommend]} />}>
      <Note>{live === 0 ? "No bills are moving in either chamber right now." : `${live} ${live === 1 ? "bill is" : "bills are"} moving through Congress. Each one shows up once, at the step it's on now. A bill that gets stuck three times dies.`}</Note>
      <Row gap="sm" top wrap={!media.desktop}>
        {BILL_LANES.map((lane) => {
          const bills = system.bills.filter((bill) => bill.lane === lane);
          return (
            <Surface key={lane} level={lane === "desk" && bills.length > 0 ? "raised" : "sunken"} pad="sm" flex={1} minWidth={media.desktop ? 0 : 150} {...(lane === "desk" && bills.length > 0 ? { accentEdge: "gold" as const } : {})}>
              <Column gap="xs">
                <Row between>
                  <Text variant="eyebrow" tone="secondary">{FLOOR_GROUP_TITLE[lane]}</Text>
                  <Text variant="label" tabular>{bills.length}</Text>
                </Row>
                {bills.map((bill) => (
                  <CardLink key={bill.id} label={`Open ${bill.title}`} href={bill.href} onPress={() => go(bill.href)} pad="sm" radius="chip" gap="2xs" minHeight={44}>
                    <Text variant="label">{bill.title}</Text>
                    <Sponsor campaign={campaign} words={bill.sponsor} />
                  </CardLink>
                ))}
              </Column>
            </Surface>
          );
        })}
      </Row>
      <Authority cite={LAW.presentment} />
    </Card>
  );
}

function LeaderBody({ campaign, leader }: { readonly campaign: Campaign; readonly leader: HillLeader }) {
  return (
    <Column gap="xs">
      <Text variant="eyebrow" tone="secondary">{leader.title}</Text>
      <PersonName campaign={campaign} id={leader.personId} name={leader.name} role={leader.title} />
      <Text variant="caption" tone="secondary">{leader.following}</Text>
      <Meter label="Mood toward you" value={leader.standing.value} figure={`${leader.standing.word} ${leader.standing.percent}`} tone={STANCE_METER[leader.standing.stance]} />
      <Row>
        <Button kind="secondary" size="compact" icon="ballot" onPress={() => go(leader.href)}>
          {leader.pending ? `Reaching out: ${leader.pending}` : "Reach out"}
        </Button>
      </Row>
    </Column>
  );
}

/** The card opens the leader's file; Reach out stays its own button, since it leads somewhere else. */
function LeaderCard({ campaign, leader }: { readonly campaign: Campaign; readonly leader: HillLeader }) {
  if (!leader.personId) {
    return (
      <Surface level="raised" pad="md" flexGrow={1} flexBasis={240} minWidth={240}>
        <LeaderBody campaign={campaign} leader={leader} />
      </Surface>
    );
  }
  return (
    <CardLink label={`Open ${leader.name}'s file, ${leader.title}`} href={place.person(leader.personId!)} onPress={() => go(place.person(leader.personId!))} pad="md" flexGrow={1} flexBasis={240} minWidth={240}>
      <LeaderBody campaign={campaign} leader={leader} />
    </CardLink>
  );
}

const shortCommittee = (name: string) => name.replace(/^(Select )?Committee on (the )?/, "");

function CommitteeBody({ campaign, committee }: { readonly campaign: Campaign; readonly committee: HillCommittee }) {
  return (
    <Row gap="md" wrap>
      <Column flex={2} minWidth={180} gap="2xs">
        <Text variant="label">{shortCommittee(committee.name)}</Text>
        {committee.chair ? (
          <Row gap="xs">
            <Text variant="caption" tone="secondary">Chair:</Text>
            <PersonName campaign={campaign} id={committee.chairId} name={committee.chair} role={`Chair of ${shortCommittee(committee.name)}`} variant="caption" />
          </Row>
        ) : <Text variant="caption" tone="tertiary">No chair yet</Text>}
        {committee.inquiries.length > 0 ? <Badge status="warning" icon="review">{`Investigating: ${committee.inquiries.join(", ")}`}</Badge> : null}
      </Column>
      <View flex={1} minWidth={180}>
        <Meter label="Mood toward you" value={committee.standing.value} figure={`${committee.standing.word} ${committee.standing.percent}`} tone={STANCE_METER[committee.standing.stance]} />
      </View>
    </Row>
  );
}

/** A committee row opens its chair's file; a committee with no chair yet has nowhere to go, so it is not pressable. */
function CommitteeRow({ campaign, committee }: { readonly campaign: Campaign; readonly committee: HillCommittee }) {
  if (!committee.chair || !committee.chairHref) {
    return (
      <View padding="sm" borderWidth={1} borderColor="borderColor" borderRadius="chip">
        <CommitteeBody campaign={campaign} committee={committee} />
      </View>
    );
  }
  return (
    <RowLink label={`Open ${committee.chair}'s file, chair of the ${shortCommittee(committee.name)} committee`} href={committee.chairHref}>
      <CommitteeBody campaign={campaign} committee={committee} />
    </RowLink>
  );
}

/** The people a President deals with by name: the leaders, then the committee chairs, investigations first. */
export function LeadersAndChairs({ campaign, leaders, committees }: { readonly campaign: Campaign; readonly leaders: readonly HillLeader[]; readonly committees: readonly HillCommittee[] }) {
  const ordered = [...committees].sort((a, b) => b.inquiries.length - a.inquiries.length || a.standing.value - b.standing.value || a.name.localeCompare(b.name));
  return (
    <Card title="The people who run Congress" icon="subjectPerson" help={<CitedLawHelp title="Leaders and chairs" meaning="Each meter shows how a leader or committee feels about you. It's the same number that decides how your bills do in their committee or when their chamber votes. Open a leader to call them, make a deal, or campaign with them." cites={[LAW.recommend]} />}>
      <ReadingFrame {...moodFrame("How the leaders and committees regard you")}>
        <Row wrap gap="sm">
          {leaders.map((leader) => <LeaderCard key={leader.id} campaign={campaign} leader={leader} />)}
        </Row>
        <Text variant="label">Committees</Text>
        <Paged items={ordered} initial={8} noun="committees" render={(committee) => <CommitteeRow key={committee.id} campaign={campaign} committee={committee} />} />
      </ReadingFrame>
    </Card>
  );
}
