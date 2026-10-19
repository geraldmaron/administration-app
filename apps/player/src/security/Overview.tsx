import { useMemo, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { METRIC_MEANINGS, METRIC_PROVENANCE, POSTURE_WORDS, place, recordRows, type AuthorizationRow, type CommandCard, type ReadinessReading, type SecurityOverview, type WarPowersRow } from "@admin/player-core";
import { Badge, CardGrid, CardLink, Column, Empty, Key, ReadingFrame, Row, Stat, Text, View, swatchEntries } from "@admin/ui";
import { BarRow, Panel, Segments, ShareBar, StateChip, StatuteClock, Tile, TileRow } from "@admin/ui/world";
import { CompareChart } from "../compare/CompareChart";
import { termDoor } from "../handbook/term-door";
import { RowLink } from "../decision/parts";
import { CLOCK_KEY, SealOf, TopicLaw, go } from "../world/parts";
import { byUrgency, isOverdue } from "./obligation-order";
import { securityHref, type SecurityView } from "./params";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const pct = (share: number) => `${Math.round(share * 100)}%`;
const POSTURE_VALENCE = { routine: "good", heightened: "watch", surge: "bad" } as const;

const CHARGE_KEY = swatchEntries([
  { key: "heightened", label: "A command at heightened alert", ink: "warningInk" },
  { key: "surge", label: "A command at surge", ink: "danger" },
]);

/** A count against its whole, drawn from empty: a bar that is full at zero would read as an error. */
function CountBar({ count, total, label, what, valence }: { readonly count: number; readonly total: number; readonly label: string; readonly what: string; readonly valence: "good" | "watch" | "bad" }) {
  return (
    <Column gap="xs">
      <ShareBar value={total > 0 ? count / total : 0} valence={valence} label={`${label}: ${count} of ${total}`} />
      <Key entries={swatchEntries([{ key: "count", label: `${what}, out of ${total}`, ink: valence === "bad" ? "danger" : valence === "watch" ? "warningInk" : "successInk" }])} label={`Key: ${label}`} />
    </Column>
  );
}

/** The desk in five supporting readings a President scans first; each opens the view that explains it. */
export function Kpis({ overview, onView }: { readonly overview: SecurityOverview; readonly onView: (view: SecurityView) => void }) {
  const { postures, force, operations, intel, obligations } = overview;
  const raised = postures.surge + postures.heightened;
  const items = intel.urgent + intel.watch + intel.ambient;
  const soonest = obligations.soonest;
  const quiet = [operations.total === 0 ? "No operations are running" : "", obligations.open === 0 ? "no War Powers report or clock is open" : ""].filter(Boolean);
  const quietLine = quiet.length > 0 ? `${quiet.join(", ")}.`.replace(/^./, (c) => c.toUpperCase()) : "";
  return (
    <>
      <TileRow label="National security at a glance">{[
      <Tile key="alert" icon="escalate" label="Commands on high alert" figure={String(raised)} unit={`of ${postures.total}`} valence={postures.surge > 0 ? "bad" : postures.heightened > 0 ? "watch" : "good"} reading={<CountBar count={raised} total={postures.total} label="Commands on high alert" what="Commands on high alert" valence={postures.surge > 0 ? "bad" : "watch"} />} caption={`${postures.surge} surge, ${postures.heightened} heightened. ${postures.engaged === 0 ? "None in action abroad." : `${postures.engaged} in action abroad.`}`} onPress={() => onView("theaters")} />,
      <Tile key="forces" icon="unitGroundFormation" label="Not committed abroad" figure={pct(1 - force.abroad)} valence={force.abroad <= 0.4 ? "good" : force.abroad <= 0.6 ? "watch" : "bad"} reading={<Segments keyed label="Forces" parts={[{ key: "f", count: Math.round(force.ready * 1000), word: "", text: `${pct(force.ready)} free this week`, valence: "good" }, { key: "a", count: Math.round(force.abroad * 1000), word: "", text: `${pct(force.abroad)} committed abroad`, valence: "abroad" }, { key: "n", count: Math.round(force.resting * 1000), word: "", text: `${pct(force.resting)} not ready`, valence: "bad" }]} />} caption={`${pct(force.abroad)} committed abroad, ${pct(force.resting)} not ready, averaged across ${plural(force.lines, "type")} of forces.`} onPress={() => onView("forces")} />,
      ...(operations.total > 0 ? [<Tile key="operations" icon="summit" label="Operations running" figure={String(operations.total)} unit={operations.total === 1 ? "operation" : "operations"} valence={operations.flagged > 0 ? "watch" : "neutral"} caption={`${operations.byKind.map((entry) => `${entry.count} ${entry.label.toLowerCase()}`).join(", ") || "None running"}. ${operations.flagged > 0 ? `${operations.flagged} ${operations.flagged === 1 ? "needs" : "need"} a look. ` : ""}${operations.weeklyBill}.`} onPress={() => onView("operations")} />] : []),
      <Tile key="intel" icon="intel" label="Urgent intelligence" figure={String(intel.urgent)} unit={`of ${plural(items, "item")}`} valence={intel.urgent > 0 ? "bad" : intel.watch > 0 ? "watch" : "good"} reading={<CountBar count={intel.urgent} total={items} label="Urgent intelligence" what="Items that need you now" valence="bad" />} caption={`${plural(intel.reports, "report")} filed${intel.stale > 0 ? `, ${intel.stale} out of date` : ""}. ${plural(intel.taskings, "request")} open.`} onPress={() => onView("intelligence")} />,
      ...(obligations.open > 0 ? [<Tile key="war" icon="gavel" label="War Powers" figure={String(obligations.open)} unit="open" valence={obligations.overdue > 0 ? "bad" : soonest && soonest.left <= 14 ? "watch" : "good"} caption={`${soonest ? `Soonest: ${soonest.target}, ${plural(soonest.left, "day")} left.` : obligations.open > 0 ? "None of these has a 60-day clock running." : "No troops you sent are waiting on a report to Congress."}${obligations.authorizationsWaiting > 0 ? ` ${plural(obligations.authorizationsWaiting, "authorization")} waiting on Congress.` : ""}${obligations.overdue > 0 ? ` ${obligations.overdue} overdue.` : ""}`} onPress={() => go(securityHref("theaters"))} />] : []),
      ]}</TileRow>
      {quietLine ? <Text variant="caption" tone="secondary">{quietLine}</Text> : null}
    </>
  );
}

/** The President's own entries that moved the reading, newest first. */
function ActsThatMoved({ campaign }: { readonly campaign: Campaign }) {
  const rows = useMemo(() => recordRows(campaign, "player").filter((row) => row.moves.some((move) => move.key === "militaryReadiness")).slice(0, 5), [campaign]);
  if (rows.length === 0) return <Empty title="Nothing you've done has changed it yet" detail="It still shifts every week with the military's own work and world events." />;
  return (
    <Column gap="2xs">
      {rows.map((row) => {
        const move = row.moves.find((entry) => entry.key === "militaryReadiness");
        return (
          <RowLink key={row.id} label={`Open the Record entry, ${row.headline}`} href={place.event(row.id)} onPress={() => go(place.event(row.id))}>
            <Text variant="label" weight="regular" flexGrow={1} flexShrink={1} flexBasis={240} minWidth={0}>{row.headline}</Text>
            {move ? <Text variant="caption" weight="strong" tone={move.delta < 0 ? "danger" : "success"}>{move.text}</Text> : null}
          </RowLink>
        );
      })}
    </Column>
  );
}

/** Military readiness: the reading against its benchmarks and own record, the weekly charge of each raised command, and the acts that moved it. */
export function Readiness({ campaign, reading }: { readonly campaign: Campaign; readonly reading: ReadinessReading }) {
  const now = reading.reading;
  const widest = Math.max(...reading.charges.map((charge) => charge.cost), 0);
  const subjects = useMemo(() => [{ kind: "self" as const }], []);
  return (
    <Panel title="Military readiness" icon="shield" emblem={<SealOf id="INST-DOD" size={36} />} lede={METRIC_MEANINGS.militaryReadiness}>
      <Row><Stat label="Readiness now" value={now.figure} source={`Source: ${METRIC_PROVENANCE.militaryReadiness}.`} {...(now.week ? { delta: { text: now.week.text, direction: now.week.direction, better: "up" as const }, period: "this week" } : { period: "Your first week isn't over yet" })} /></Row>
      <CompareChart campaign={campaign} metric="militaryReadiness" subjects={subjects} window="term" title="Military readiness over your term" height={200} />
      {reading.charges.length === 0 ? <Text variant="body" tone="secondary">Every command is at routine, so nothing is lowering readiness each week.</Text> : (
        <ReadingFrame title="What lowers it each week" unit="Points of readiness lost a week, longest bar is the costliest command" legend={CHARGE_KEY} pressHint="Press a command to open it and change its alert level." help={{ meaning: "Each raised command costs readiness every week it stays raised. The bar is that command's weekly cost next to the costliest one, and the figure at the right is the exact number of points.", term: termDoor("military-readiness", "Readiness") }}>
          {reading.charges.map((charge) => (
            <RowLink key={charge.id} label={`Open ${charge.abbr}, at ${POSTURE_WORDS[charge.posture].toLowerCase()}`} href={charge.href} onPress={() => go(charge.href)}>
              <Text variant="label" width={96}>{charge.abbr}</Text>
              <StateChip valence={POSTURE_VALENCE[charge.posture]}>{POSTURE_WORDS[charge.posture]}</StateChip>
              <ShareBar value={widest > 0 ? charge.cost / widest : 0} valence={POSTURE_VALENCE[charge.posture]} />
              <Text variant="caption" weight="strong">−{(charge.cost * 100).toFixed(1)} pts a week</Text>
            </RowLink>
          ))}
        </ReadingFrame>
      )}
      {reading.weeklyCost > 0 ? <Text variant="caption" tone="secondary">Together these alert levels cost {(reading.weeklyCost * 100).toFixed(1)} points a week. You can change a command's alert level on its own page.</Text> : null}
      <Text variant="title" role="heading" aria-level={3}>What your choices did to it</Text>
      <ActsThatMoved campaign={campaign} />
    </Panel>
  );
}

function PaperRow({ row }: { readonly row: WarPowersRow }) {
  const overdue = isOverdue(row);
  return (
    <CardLink label={`Open ${row.target}`} href={row.href} onPress={() => go(row.href)} pad="md" accentEdge={overdue ? "danger" : row.clock && row.clock.left <= 14 ? "warning" : "gold"}>
      <Column gap="sm">
        <Row gap="sm" wrap>
          <Text variant="title" flexShrink={1}>{row.target}</Text>
          {overdue ? <Badge status="danger" icon="caution">Overdue</Badge> : row.clock && row.clock.left <= 14 ? <Badge status="warning" icon="schedule">Soon</Badge> : null}
        </Row>
        <Text variant="body" tone="secondary">{row.description}</Text>
        <Text variant="label" tone={row.missed ? "danger" : row.reported ? "success" : "warning"}>
          {row.missed ? "▼ You missed the report to Congress, and you still owe it." : row.reported ? "✓ Reported to Congress." : "⚠ You owe Congress a report within 48 hours."}
        </Text>
        {row.clock ? (
          <ReadingFrame title="How long you have" unit="Days left in the 60-day window" legend={CLOCK_KEY} help={{ meaning: "The bar is the share of the 60-day window still left, so it shrinks toward empty as the deadline nears. The words say how many days are left.", term: termDoor("sixty-day-clock", "Sixty-day clock") }}>
            <StatuteClock label="Days until the troops must leave unless Congress votes" left={row.clock.left} window={row.clock.window} {...(row.clock.left < 0 ? { due: "Time has run out" } : {})} />
          </ReadingFrame>
        ) : <Text variant="caption" tone="secondary">No 60-day clock applies here.</Text>}
      </Column>
    </CardLink>
  );
}

/** The legal obligations of the forces introduced, most pressing first, and the authorizations Congress holds. A statutory deadline never waits below a feed. */
export function Obligations({ rows, authorizations }: { readonly rows: readonly WarPowersRow[]; readonly authorizations: readonly AuthorizationRow[] }) {
  const ordered = byUrgency(rows);
  return (
    <Panel title="Legal deadlines" icon="gavel" count={ordered.length + authorizations.length} aside={<TopicLaw topic="war-powers" />}>
      {ordered.map((row) => <PaperRow key={row.id} row={row} />)}
      {authorizations.map((row) => (
        <Row key={row.id} gap="sm" wrap>
          <Text variant="label" flex={1} minWidth={200}>{row.title}</Text>
          <StateChip valence={row.standing ? "good" : "watch"} icon={row.standing ? "favorable" : "schedule"}>{row.standing ? "Granted" : "Waiting on the vote"}</StateChip>
          <Text variant="caption" tone="secondary">{row.until}{row.chance ? `. The vote count looks ${row.chance}.` : "."}</Text>
        </Row>
      ))}
    </Panel>
  );
}

const COMMAND_COLUMNS = { phone: 1, tablet: 2, desktop: 3, wide: 4 } as const;

function CommandTile({ card }: { readonly card: CommandCard }) {
  const placed = card.hasArea ? (card.places === 0 ? "None" : `${card.places} ${card.places === 1 ? "place" : "places"}`) : undefined;
  return (
    <CardLink href={card.href} onPress={() => go(card.href)} label={`Open ${card.abbr}, ${card.name}, at ${POSTURE_WORDS[card.effective].toLowerCase()}`} flexGrow={1} pad="md" borderTopWidth={3} borderTopColor={card.effective === "routine" ? "successInk" : card.effective === "heightened" ? "warningInk" : "danger"}>
      <Column gap="xs" flexGrow={1}>
        <Row gap="sm">
          <SealOf id={card.id} name={card.name} size={32} />
          <Text variant="title" flex={1}>{card.abbr}</Text>
          <StateChip valence={POSTURE_VALENCE[card.effective]}>{`${POSTURE_WORDS[card.effective]}${card.effective !== card.ordered ? " (held)" : ""}`}</StateChip>
        </Row>
        <Text variant="caption" tone="secondary" numberOfLines={2}>{card.commander ? `${card.commander.name}${card.commander.acting ? ", acting" : ""}, ${card.commander.service}` : "No commander"}</Text>
        <BarRow label="Orders get through" value={card.chain} figure={pct(card.chain)} valence={card.chain < 0.7 ? "bad" : card.chain < 0.9 ? "watch" : "good"} labelWidth={110} />
        {placed ? <BarRow label="Forces abroad" value={card.weight} figure={placed} labelWidth={110} /> : null}
        <View flexGrow={1} />
        <Text variant="caption" tone="secondary">
          {card.formations} {card.formations === 1 ? "large unit" : "large units"}
          {card.engagedWith.against > 0 ? ` · against ${card.engagedWith.against}` : ""}
          {card.engagedWith.toward > 0 ? ` · committed toward ${card.engagedWith.toward}` : ""}
        </Text>
      </Column>
    </CardLink>
  );
}

/** The geographic commands and the functional ones, each a whole-tile door to its page. */
export function Commands({ commands, functional, area }: { readonly commands: readonly CommandCard[]; readonly functional: readonly CommandCard[]; readonly area: ReactNode }) {
  const all = [...commands, ...functional];
  const count = (posture: CommandCard["effective"]) => all.filter((card) => card.effective === posture).length;
  return (
    <Panel title="Commands" icon="shield" emblem={<SealOf id="INST-JCS" size={36} />} aside={<TopicLaw topic="commands" />}>
      <Segments label="Commands by alert level" keyed parts={[{ key: "s", count: count("surge"), word: "at surge", valence: "bad" }, { key: "h", count: count("heightened"), word: "heightened", valence: "watch" }, { key: "r", count: count("routine"), word: "routine", valence: "good" }]} />
      <Text variant="caption" tone="secondary">Each regional command is in charge of a set of countries and seas. The Unified Command Plan, the Pentagon's map of who covers where, decides which.</Text>
      {area}
      <ReadingFrame title="How each command is doing" unit="Orders get through: 0 to 100%. Forces abroad: against the command with the most" pressHint="Press a command to open it." help={{ meaning: "Orders get through is how much of an order you give carries out down that command's chain, from none to all. Forces abroad compares the people placed in that command's area with the command that has the most, so the heaviest command has a full bar.", term: termDoor("command-posture", "Command posture") }}>
        <CardGrid columns={COMMAND_COLUMNS} role="list" aria-label="Regional commands">{commands.map((card) => <CommandTile key={card.id} card={card} />)}</CardGrid>
        <Text variant="title" role="heading" aria-level={3}>Commands with a worldwide job</Text>
        <CardGrid columns={COMMAND_COLUMNS} role="list" aria-label="Commands with a worldwide job">{functional.map((card) => <CommandTile key={card.id} card={card} />)}</CardGrid>
      </ReadingFrame>
    </Panel>
  );
}
