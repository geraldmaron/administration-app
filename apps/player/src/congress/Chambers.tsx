import type { Campaign } from "@admin/engine";
import { sealFor, type CongressChamber, type CongressSystem } from "@admin/player-core";
import { Button, Column, ReadingFrame, Row, Seal, Select, Surface, Text, View, type KeyEntry } from "@admin/ui";
import { Hemicycle, PARTY_INK, ThresholdBar, seatKeyEntries, type SeatView } from "@admin/ui/legislature";
import { LAW, holderOf, voteOf, type CongressSelection, type SeatMode } from "./model";
import { Authority } from "./ActChooser";
import { Note, RowLink, go } from "./parts";
import { PersonName } from "../dossier/PersonPeek";
import { useLawViews } from "../law/LawHelp";
import { termDoor } from "../handbook/term-door";

type SeatProps = { readonly chamber: CongressChamber; readonly mode: SeatMode; readonly selection: CongressSelection; readonly onSelect: (next: CongressSelection) => void };

const SEAL_ID = { house: "SEAL-HOUSE", senate: "SEAL-SENATE" } as const;

function seatViews({ chamber, mode, selection }: SeatProps): readonly SeatView[] {
  const roll = mode === "vote" ? chamber.lastRoll : undefined;
  const members = chamber.members.map((member): SeatView => ({
    id: member.seat,
    party: member.party,
    ...(roll ? { vote: voteOf(roll, member.seat) } : {}),
    selected: selection.seat === member.seat,
    dimmed: selection.state !== undefined && member.state !== selection.state,
    leader: member.post !== undefined,
    vacant: member.vacant,
  }));
  return [...members, ...Array.from({ length: chamber.unrecorded }, (_, i): SeatView => ({ id: `open-${i}` }))];
}

function RollLine({ chamber }: { readonly chamber: CongressChamber }) {
  const roll = chamber.lastRoll;
  if (!roll) return <Note>{chamber.name.replace(/^the /, "The ")} hasn't voted on anything yet.</Note>;
  return (
    <RowLink label={`Open ${roll.title}. ${roll.yeas} yea, ${roll.nays} nay, it ${roll.passed ? "passed" : "failed"}`} href={roll.href}>
      <Column gap="2xs">
        <Text variant="label">{roll.title}</Text>
        <Text variant="caption">
          {roll.question}, {roll.date}. <Text variant="caption" weight="strong">{roll.yeas} yea, {roll.nays} nay</Text>. It needed {roll.required}, so it {roll.passed ? "passed" : "failed"}.
        </Text>
      </Column>
    </RowLink>
  );
}

/** One chamber: its seal, who holds it, its seats as they sit, and the lines its caucus can or cannot carry alone. */
export function ChamberPanel(props: SeatProps) {
  const { chamber, mode, selection, onSelect } = props;
  const holder = holderOf(chamber);
  const lead = Math.max(chamber.caucus.seats, chamber.caucus.opposing);
  const trail = Math.min(chamber.caucus.seats, chamber.caucus.opposing);
  const name = chamber.name.replace(/^the /, "The ");
  const ours = chamber.caucus.parties[0] === "republican" ? "republican" : "democrat";
  const presentment = useLawViews([LAW.presentment]);
  const majority = chamber.thresholds.find((line) => line.key === "majority")?.votes;
  const onSeat = (seat: string) => {
    const member = chamber.members.find((entry) => entry.seat === seat);
    if (!member?.href) return;
    onSelect({ state: member.state, seat: member.seat });
    go(member.href);
  };
  return (
    <Surface level="raised" pad="md" flexGrow={1}>
      <Column gap="md">
        <Row gap="md">
          <Seal spec={sealFor(SEAL_ID[chamber.chamber])} size={56} />
          <Column flex={1} gap="2xs">
            <Text variant="title" role="heading" aria-level={3}>
              {name} <Text variant="title" tabular tone={holder === "democrat" ? "info" : "danger"}>{lead}–{trail}</Text>
            </Text>
            <Text variant="caption" tone="secondary">{chamber.majorityLine}</Text>
          </Column>
        </Row>
        <ReadingFrame
          title={`Seats in ${name}`}
          unit={`${chamber.seats} seats, one dot each`}
          period="As seated now"
          legend={seatKeyEntries(chamber.parties, { ...(mode === "vote" && chamber.lastRoll ? { votes: true } : { leaders: true }), ...(selection.seat ? { selected: true } : {}), ...(chamber.members.some((member) => member.vacant) ? { vacant: true } : {}), ...(majority ? { majority } : {}) })}
          pressHint="Press a seat to open that member's page."
          help={{ meaning: "Each dot is one member, seated left to right by party and then by where they stand on the economy. The dashed line marks how many seats make a majority.", term: termDoor("majority", "majority") }}
        >
          <Hemicycle
            label={`${name}: ${chamber.parties.map((party) => `${party.label} ${party.seats}`).join(", ")} of ${chamber.seats}${mode === "vote" && chamber.lastRoll ? `, colored by how each member voted on ${chamber.lastRoll.title}` : ""}.`}
            seats={seatViews(props)}
            {...(majority ? { majority } : {})}
            onSeat={onSeat}
          />
        </ReadingFrame>
        {chamber.recordsDisagree ? <Note tone="warning">The members shown here don't add up to the official count of {chamber.caucus.seats} to {chamber.caucus.opposing}. Votes use the official count. The seats show the members we have on record.</Note> : null}
        {mode === "vote" ? <RollLine chamber={chamber} /> : null}
        <ReadingFrame
          title={`What the ${chamber.caucus.name} can pass on its own`}
          unit={`Votes, of ${chamber.seats} seats`}
          period="With every seat filled and everyone voting"
          legend={thresholdKey(chamber, ours)}
          help={{ meaning: "These bars count seats. They don't predict votes. Members vote one by one, so a party can lose some of its own members or win over some from the other side. Each tick shows how many votes something needs. Passing a bill takes a majority. Ending debate in the Senate takes three-fifths. Overriding a veto takes two-thirds of each chamber.", law: presentment, term: termDoor("two-thirds", "two-thirds vote") }}
        >
          <ThresholdBar
            label={`What the ${chamber.caucus.name} can pass on its own in ${chamber.name}`}
            seats={chamber.seats}
            ours={{ party: ours, seats: chamber.caucus.seats, name: chamber.caucus.name }}
            theirs={{ party: ours === "democrat" ? "republican" : "democrat", seats: chamber.caucus.opposing }}
            unrecorded={chamber.unrecorded}
            lines={chamber.thresholds.map((line) => ({ id: line.key, label: line.label, votes: line.votes, cleared: line.short === 0, note: line.tieBreak ? "With the Vice President breaking a tie" : line.short === 0 ? "Enough on its own" : `${line.short} short on its own` }))}
          />
        </ReadingFrame>
        {chamber.thresholds.some((line) => line.key === "override") ? <Authority cite={LAW.presentment} compact /> : null}
      </Column>
    </Surface>
  );
}

/** The bar's key: each side's seats as the fill that draws them, and the tick for a question's required votes. */
function thresholdKey(chamber: CongressChamber, ours: "democrat" | "republican"): readonly KeyEntry[] {
  const other = ours === "democrat" ? "republican" : "democrat";
  return [
    { id: "ours", kind: "swatch", label: `${chamber.caucus.name}, filling from the left`, ink: PARTY_INK[ours], figure: chamber.caucus.seats },
    { id: "theirs", kind: "swatch", label: "The other side, from the right", ink: PARTY_INK[other], figure: chamber.caucus.opposing },
    { id: "line", kind: "tick", label: "Votes a question needs (green when your side clears it alone)", ink: "color", weight: 2 },
  ];
}

type ChamberMember = CongressChamber["members"][number];

/** One member of the chosen state: the whole row opens their file. */
function StateMember({ campaign, member, vote, selected }: { readonly campaign: Campaign; readonly member: ChamberMember; readonly vote: ReturnType<typeof voteOf> | undefined; readonly selected: boolean }) {
  const body = (
    <Row gap="sm" top>
      <Column flex={1} gap="2xs">
        <PersonName campaign={campaign} id={member.personId} name={member.name} />
        <Text variant="caption" tone="secondary">
          {member.chamber === "house" ? `House, ${member.seat}` : `Senate${member.seatClass ? `, class ${member.seatClass}` : ""}`}
          {member.post ? ` · ${member.post}` : ""}
          {member.vacant ? " · seat empty until someone is chosen" : ""}
        </Text>
      </Column>
      {vote ? <Text variant="caption" weight="strong">{vote === "none" ? "No vote" : vote === "yea" ? "Yea" : "Nay"}</Text> : null}
    </Row>
  );
  if (!member.href) return <View padding="sm">{body}</View>;
  return <RowLink label={`Open ${member.name}'s file`} href={member.href} selected={selected}>{body}</RowLink>;
}

/** Every member from the chosen state, with a picker that reaches the same files by keyboard as the seats do by pointer. */
export function SelectionCard({ campaign, system, mode, selection, onSelect }: { readonly campaign: Campaign; readonly system: CongressSystem; readonly mode: SeatMode; readonly selection: CongressSelection; readonly onSelect: (next: CongressSelection) => void }) {
  const state = selection.state;
  const delegation = state ? system.delegations.find((entry) => entry.state === state) : undefined;
  const members = system.chambers.flatMap((chamber) => chamber.members).filter((member) => member.state === state).sort((a, b) => a.chamber.localeCompare(b.chamber) || a.seat.localeCompare(b.seat));
  return (
    <Surface level="sunken" pad="md" alignSelf="stretch" aria-live="polite">
      <Column gap="sm">
        <Text variant="title">{delegation ? delegation.name : "No state picked"}</Text>
        <Select label="Show a state's members" options={system.delegations.map((entry) => ({ value: entry.state, label: entry.name }))} value={state} onChange={(next) => onSelect({ state: next })} placeholder="All states" />
        {delegation ? (
          <>
            <Note>How this state's members feel about you: {delegation.standing.word.toLowerCase()} ({delegation.standing.percent}).</Note>
            {members.map((member) => {
              const roll = system.chambers.find((chamber) => chamber.chamber === member.chamber)?.lastRoll;
              return <StateMember key={member.seat} campaign={campaign} member={member} vote={mode === "vote" && roll ? voteOf(roll, member.seat) : undefined} selected={selection.seat === member.seat} />;
            })}
            <Row>
              <Button kind="quiet" size="compact" icon="close" onPress={() => onSelect({})}>
                Clear the selection
              </Button>
            </Row>
          </>
        ) : (
          <Note>No state is picked, so every member shows in both chambers.</Note>
        )}
      </Column>
    </Surface>
  );
}
