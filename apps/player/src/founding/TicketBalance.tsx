import { stateRegion, type RunningMateCandidate } from "@admin/engine";
import { attributeVerdict } from "@admin/player-core";
import { IDEOLOGY_AXES, stateById, type IdeologyAxis } from "@admin/world";
import { Column, Key, ReadingHead, Row, Text, View, type KeyEntry } from "@admin/ui";
import { BandSteps, type ReadTone } from "@admin/ui/dossier";
import { ticketReasons, type TicketTop } from "./ticket-reasons";

// A running mate set against the top of the ticket, drawn: where each of you
// is from, where each of you stands, how far apart your ages are, and how much
// they have done. The same facts the shortlist is ranked on, so the picture
// and the order agree.

const SHORT_AXIS: Readonly<Record<IdeologyAxis, string>> = {
  economicLeftRight: "Economy",
  authLibertarian: "Authority",
  nationalistGlobalist: "World",
};

const REGION_WORD: Readonly<Record<string, string>> = { northeast: "Northeast", midwest: "Midwest", south: "South", west: "West" };

/** The two ends of the age line: the youngest and oldest a ticket plausibly carries. */
const AGE_FLOOR = 35;
const AGE_CEILING = 85;

const onAxis = (value: number): `${number}%` => `${((value + 1) / 2) * 100}%`;
const onAgeLine = (age: number): `${number}%` => `${((Math.min(AGE_CEILING, Math.max(AGE_FLOOR, age)) - AGE_FLOOR) / (AGE_CEILING - AGE_FLOOR)) * 100}%`;

/** Four quarters of the competence scale, so experience reads as steps rather than a figure. */
function experienceSteps(competence: number): number {
  return Math.min(4, Math.max(1, Math.ceil(competence * 4)));
}

/** Where the gap between two marks starts and how wide it is, both as shares of the bar. */
function gapBetween(you: `${number}%`, mate: `${number}%`): { readonly left: `${number}%`; readonly width: `${number}%` } {
  const [a, b] = [parseFloat(you), parseFloat(mate)].sort((x, y) => x - y) as [number, number];
  return { left: `${a}%`, width: `${b - a}%` };
}

function BalanceTrack({ name, you, mate, label }: { readonly name: string; readonly you: `${number}%`; readonly mate: `${number}%`; readonly label: string }) {
  const gap = gapBetween(you, mate);
  return (
    <Row gap="sm" role="img" aria-label={label}>
      <Text variant="caption" tone="secondary" width={68}>
        {name}
      </Text>
      <View flex={1} height={8} borderRadius="pill" backgroundColor="borderColor" position="relative">
        <View position="absolute" top={0} left={gap.left} width={gap.width} height={8} backgroundColor="borderColorStrong" />
        <View position="absolute" top={-4} left={you} x={-3} width={6} height={16} borderRadius="chip" backgroundColor="gold" />
        <View position="absolute" top={-4} left={mate} x={-3} width={6} height={16} borderRadius="chip" backgroundColor="accent" />
      </View>
    </Row>
  );
}

/** A running mate's home state and region, the place the ticket is balanced on. */
export function homePlace(candidate: RunningMateCandidate): string {
  const mate = candidate.homeState;
  if (!mate) return "Home state not known";
  const region = stateRegion(mate);
  return `${stateById.get(mate)?.name ?? mate}${region ? ` · ${REGION_WORD[region] ?? region}` : ""}`;
}

function Group({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <Column gap="sm" flexGrow={1} flexBasis={260} minWidth={0}>
      <Text variant="eyebrow" tone="secondary">
        {title}
      </Text>
      {children}
    </Column>
  );
}

export function TicketBalance({ top, candidate }: { readonly top: TicketTop; readonly candidate: RunningMateCandidate }) {
  const reasons = ticketReasons(top, candidate);
  const { person } = candidate;
  const verdict = attributeVerdict(person.competence);
  return (
    <Row gap="xl" wrap top>
      <Group title="Beliefs next to yours">
        {IDEOLOGY_AXES.map((axis) => (
          <BalanceTrack key={axis} name={SHORT_AXIS[axis]} you={onAxis(top.ideology[axis])} mate={onAxis(person.ideology[axis])} label={reasons.find((line) => line.startsWith("Politics")) ?? "Politics"} />
        ))}
      </Group>
      <Group title="Age and experience">
        <BalanceTrack name="Age" you={onAgeLine(top.age)} mate={onAgeLine(person.age)} label={reasons.find((line) => line.includes("years")) ?? `Age ${person.age}, you are ${top.age}`} />
        <BandSteps label="Experience in government" lit={experienceSteps(person.competence)} word={verdict} tone={EXPERIENCE_TONE[experienceSteps(person.competence)] ?? "fair"} />
      </Group>
    </Row>
  );
}

const EXPERIENCE_TONE: Readonly<Record<number, ReadTone>> = { 1: "watch", 2: "fair", 3: "good", 4: "good" };

const TICKET_KEY: readonly KeyEntry[] = [
  { id: "you", kind: "tick", label: "You", ink: "gold", weight: 4 },
  { id: "mate", kind: "tick", label: "Running mate", ink: "accent", weight: 4 },
  { id: "gap", kind: "swatch", label: "The gap between you", ink: "borderColorStrong" },
];

/** What the marks on every card mean and how to read the bars, said once above the list. */
export function TicketKey() {
  return (
    <Column gap="xs">
      <ReadingHead
        title="How each running mate compares with you"
        unit="Position on each bar, from one end to the other"
        help={{ meaning: "Each card draws the same facts the list is ranked on. On the three belief bars, the two marks show where you and your running mate stand between the two ends, and the darker stretch between them is how far apart you are. The age bar shows how far apart your ages are, and the steps show how much experience they have.", steps: ["The closer the two marks, the more you agree.", "More filled steps mean more experience in government."] }}
      />
      <Key entries={TICKET_KEY} label="Key: the marks on each card" />
    </Column>
  );
}
