import { lazy, useMemo, useState } from "react";
import { EMERGENCY_RENEWAL_TURNS, type Campaign } from "@admin/engine";
import { emergencyBoard, formatDate, formatSignedPoints, lapseWords, sealFor, type ConditionBoardRow, type DeclarationRow, type EmergencyBoard, type GuardRow } from "@admin/player-core";
import { Pane, Tag, Button, Column, Empty, Icon, Page, Pressable, ReadingFrame, Row, Seal, Sheet, Sticky, Surface, Text, useMedia } from "@admin/ui";
import { Collection, CompareChoices, Facts, FigureBand, Track, TrackRow } from "@admin/ui/nation";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct, type NationAct } from "../act";
import { choiceView } from "../choice";
import { CONDITION_GLYPH } from "../glyphs";
import { toneKey } from "../keys";
import { Cite, Cites, LawTopicHelp } from "../Law";
import type { MapPin } from "@admin/ui/map";
import { MapSlot } from "../../map/MapSlot";
import { MapPanelSlot } from "../MapPanelSlot";
import { MetricActs, MetricReading } from "../MetricReading";
import { VALENCE_TEXT, VALENCE_TRACK, valenceOf } from "../format";
import { actSpec, prioritizedIncidents, type EmergencyAct } from "./emergency-acts";
import { Proclamation } from "./Proclamation";

const EmergencyMap = lazy(() => import("./EmergencyMap"));

type Open = (act: EmergencyAct) => void;

/** The pins: a declaration in force outranks a problem still waiting on one. */
function marksOf(board: EmergencyBoard, incidents: readonly ConditionBoardRow[]): ReadonlyMap<string, MapPin["kind"]> {
  const declared = board.declarations.flatMap((row): [string, MapPin["kind"]][] => (row.scope.kind === "state" ? [[`state:${row.scope.state}`, "declared"]] : []));
  const waiting = incidents.flatMap((row): [string, MapPin["kind"]][] => (row.state && !row.covered ? [[`state:${row.state as string}`, "needs"]] : []));
  return new Map([...waiting, ...declared]);
}

const SEVERITY_CUTS = [0.4, 0.7] as const;
const severityKey = [...toneKey({ reading: "Under 40%: minor", watch: "40% to 69%: serious", bad: "70% or more: severe" }), { id: "cuts", kind: "tick" as const, label: "Lines at 40% and 70%", ink: "colorTertiary" as const, weight: 1 }];
const SEVERITY_HELP = { meaning: "How much damage a problem does, as a share of the worst it could do. The bar fills as it gets worse, and the thin lines at 40% and 70% mark where it turns serious and then severe." } as const;

/** One quiet line while nothing is declared and nothing costs standing; the four-figure band only when there is something to count. */
function Summary({ board, incidents }: { readonly board: EmergencyBoard; readonly incidents: readonly ConditionBoardRow[] }) {
  const uncovered = incidents.filter((row) => !row.covered).length;
  if (board.declarations.length === 0 && board.weeklyCost === 0) {
    return (
      <Empty icon="caution" title="No emergency is declared" detail={incidents.length === 0 ? "Nothing is going wrong at home. A declaration appears here once you make one." : `${incidents.length === 1 ? "1 problem is" : `${incidents.length} problems are`} going on at home, and none is covered by a declaration. Declaring one lowers your International Standing each week.`} />
    );
  }
  return (
    <FigureBand
      label="Emergency summary"
      items={[
        { icon: "order", label: "Emergencies declared", value: String(board.declarations.length), note: "Places covered" },
        { icon: "eventEmergency", label: "Problems at home", value: String(incidents.length), tone: incidents.length > 0 ? "watch" : "good", note: incidents.length > 0 ? "Ongoing problems and one-time events" : "None right now" },
        { icon: "caution", label: "Without a declaration", value: String(uncovered), tone: uncovered > 0 ? "watch" : "good", note: uncovered > 0 ? "Problems no emergency covers" : "All covered" },
        { icon: "economyRecession", label: "Cost to standing this week", value: board.weeklyCost > 0 ? `${formatSignedPoints(-board.weeklyCost)} pts` : "None", tone: board.weeklyCost > 0 ? "bad" : "good", note: "International Standing" },
      ]}
    />
  );
}

function IncidentRow({ row, selected, onSelect }: { readonly row: ConditionBoardRow; readonly selected: boolean; readonly onSelect: (id: string) => void }) {
  const valence = valenceOf(row.severity.stance);
  return (
    <Pressable role="radio" aria-checked={selected} aria-label={`${row.headline}, severity ${row.severity.value}`} onPress={() => onSelect(row.id)} padding="md" gap="xs" borderWidth={selected ? 2 : 1} borderColor={selected ? "accent" : "borderColor"} borderRadius="card" backgroundColor={{ default: selected ? "infoFill" : "surface", hover: "surfaceHover" }}>
      <Row gap="sm" top>
        <Icon name={CONDITION_GLYPH[row.kind]} size={24} tone={valence === "bad" ? "danger" : "warningInk"} />
        <Column flex={1} gap="2xs">
          <Text variant="label">{row.headline}</Text>
          <Text variant="caption" tone="secondary">
            {row.standfirst}
          </Text>
          <Row gap="sm">
            <Text variant="caption" tone="secondary">
              Severity
            </Text>
            <Track value={row.severity.fraction} tone={VALENCE_TRACK[valence]} cuts={SEVERITY_CUTS} slim />
            <Text variant="caption" weight="strong" tone={VALENCE_TEXT[valence]}>
              {row.severity.value}
            </Text>
          </Row>
          <Row gap="xs" wrap>
            {row.incident ? <Tag tone="pending">Lasts one afternoon</Tag> : null}
            {row.covered ? <Tag tone="authority" icon="order">Declared</Tag> : null}
          </Row>
        </Column>
      </Row>
    </Pressable>
  );
}

/** The scope, the authority a declaration carries, and the resources that answer it, for the incident selected. */
function Response({ row, guard, onOpen }: { readonly row: ConditionBoardRow; readonly guard: GuardRow | undefined; readonly onOpen: Open }) {
  const valence = valenceOf(row.severity.stance);
  return (
    <Pane title={`Response: ${row.headline}`} icon="sign">
      <ReadingFrame title="How serious it is" unit="% of the worst damage it could do" legend={severityKey} help={SEVERITY_HELP}>
        <TrackRow name={row.severity.label} figure={row.severity.value} value={row.severity.fraction} tone={VALENCE_TRACK[valence]} cuts={SEVERITY_CUTS} />
      </ReadingFrame>
      <Text variant="caption" tone="tertiary">
        {row.severity.note}
      </Text>
      <Facts
        items={[
          { label: "Where a declaration could apply", value: row.covered ? "A declaration already covers it." : row.declarable.length > 0 ? row.declarable.map((option) => option.where).join(" or ") : "Nowhere right now. You can only declare an emergency where the problem is still going on." },
          { label: "What a declaration does", value: "A declaration marks where the emergency is. It doesn't replace the separate legal steps or money each response needs. It lowers your International Standing every week, and it ends unless you renew it." },
          { label: "Help from the state", value: guard ? `You can ask the governor to work with you. Their likely answer: ${guard.forecast.toLowerCase()}.` : "There's no National Guard request you can make for this." },
        ]}
      />
      <LawTopicHelp topic="emergency-relief" compact />
      {guard ? <LawTopicHelp topic="domestic-force" compact /> : null}
      <Row gap="sm" wrap>
        {row.declarable.length > 0 ? (
          <Button kind="danger" size="compact" icon="order" onPress={() => onOpen({ kind: "declare", conditionId: row.id })}>
            Declare an emergency
          </Button>
        ) : null}
        {guard ? (
          <Button kind="secondary" size="compact" icon="dispatch" onPress={() => onOpen({ kind: "guard", state: guard.state })}>
            Ask the governor for help
          </Button>
        ) : null}
      </Row>
    </Pane>
  );
}

/** One declaration in force with its National Emergencies Act clock: when it lapses, when the continuation window opens, and its weekly cost. */
function Declaration({ row, selected, onOpen, signer }: { readonly row: DeclarationRow; readonly selected: boolean; readonly onOpen: Open; readonly signer: string }) {
  const [reading, setReading] = useState(false);
  return (
    <Column gap="sm">
      <Surface level="raised" pad="md" accentEdge={row.renewalOpen ? "warning" : "gold"} borderWidth={selected ? 2 : 1} borderColor={selected ? "accent" : "borderColor"}>
        <Column gap="sm">
          <Row gap="sm">
            <Icon name={row.cause === "armed-conflict" ? "conflict" : CONDITION_GLYPH[row.cause]} size={20} tone="gold" />
            <Text variant="label" flex={1}>
              {row.where}, for {row.causeLabel.toLowerCase()}
            </Text>
            {row.renewalOpen ? <Tag tone="warning">Time to renew</Tag> : null}
          </Row>
          <TrackRow name="Until it ends" figure={lapseWords(row.weeksToLapse)} value={Math.max(0, row.weeksToLapse) / EMERGENCY_RENEWAL_TURNS} tone={row.renewalOpen ? "watch" : "reading"} />
          <Text variant="caption" tone="secondary">
            Declared {formatDate(row.declared)}. It ends {formatDate(row.lapses)} unless you continue it. {row.renewalOpen ? "You can continue it now." : `You can continue it starting in ${row.renewalOpensIn} weeks.`}
          </Text>
          <Row gap="xs" wrap>
            <Text variant="caption" tone="secondary">
              Under the National Emergencies Act, a declaration ends after one year unless you publish a notice continuing it (§1622(d)).
            </Text>
            <Cite cite="50 U.S.C. §§1601–1651" compact />
          </Row>
          <Text variant="caption" tone="danger">
            Changes your International Standing by {formatSignedPoints(-row.weeklyCost)} pts this week{row.causeRunning ? "" : ". The problem it was declared for has ended"}.
          </Text>
          <Row gap="sm" wrap>
            <Button kind="secondary" size="compact" icon="schedule" onPress={() => onOpen({ kind: "renew", id: row.id })}>
              Continue it
            </Button>
            <Button kind="secondary" size="compact" icon="close" onPress={() => onOpen({ kind: "end", id: row.id })}>
              End it
            </Button>
            <Button kind="quiet" size="compact" icon={reading ? "restorePanel" : "dossier"} aria-expanded={reading} onPress={() => setReading(!reading)}>
              {reading ? "Hide the proclamation" : "Read the proclamation"}
            </Button>
          </Row>
        </Column>
      </Surface>
      {reading ? <Proclamation row={row} signer={signer} /> : null}
    </Column>
  );
}

/** One emergency act, its options read as changes from today, with the one verb. */
function ActPanel({ campaign, act, acts }: { readonly campaign: Campaign; readonly act: EmergencyAct; readonly acts: NationAct }) {
  const spec = useMemo(() => actSpec(campaign, act), [campaign, act]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  if (!spec) return <Empty title="This isn't available anymore" detail="It may have ended already." />;
  const view = choiceView(spec.table);
  return (
    <Column gap="md">
      <Text variant="title">{spec.title}</Text>
      <Cites cites={spec.cites} />
      <CompareChoices
        title={view.options.length > 1 ? "Compare the options" : "What it would do"}
        options={view.options}
        rows={view.rows}
        selected={selected}
        onSelect={setSelected}
        verb={spec.verb}
        danger={spec.danger}
        onAuthorize={() => selected && void acts.run(() => spec.build(selected), { tier: "full", title: spec.verb, verb: "Confirm", danger: spec.danger, lines: [{ label: "What you're doing", value: spec.title }, { label: "What it commits you to", value: spec.review(selected) }] })}
        {...(selected ? { review: spec.review(selected) } : {})}
        {...(view.waiting ? { waiting: view.waiting } : {})}
        busy={acts.busy}
      />
      <ActProblem problem={acts.problem} />
    </Column>
  );
}

export type EmergencyScreenProps = { readonly campaign: Campaign; readonly selected: string | undefined; readonly onSelect: (id: string | undefined) => void; readonly declaration?: string | undefined };

/**
 * Emergency powers: the summary, the incidents in the order to look at them,
 * the response open to the one selected, and the declarations in force with
 * their renewal clocks, then the stability they bear on.
 */
export function EmergencyScreen({ campaign, selected, onSelect, declaration }: EmergencyScreenProps) {
  const media = useMedia();
  const board = emergencyBoard(campaign);
  const incidents = useMemo(() => prioritizedIncidents(board), [board]);
  const acts = useNationAct(campaign);
  const [open, setOpen] = useState<EmergencyAct | undefined>();
  const chosen = selected ? incidents.find((row) => row.id === selected) : incidents[0];
  const guard = chosen?.state ? board.guard.find((row) => row.state === chosen.state) : undefined;
  const marks = useMemo(() => marksOf(board, incidents), [board, incidents]);
  const pickState = (state: string) => {
    const first = incidents.find((row) => row.state === state);
    if (first) onSelect(first.id);
  };
  const ordered = [...board.declarations.filter((row) => row.id === declaration), ...board.declarations.filter((row) => row.id !== declaration)];
  const close = () => {
    setOpen(undefined);
    acts.dismiss();
  };
  const where = (
    <Column gap="md">
      <MapPanelSlot title="Where conditions are running" lens="conditions" camera="us" {...(chosen?.state ? { selection: `state:${chosen.state as string}` } : {})} note="Each state's color shows its most serious ongoing problem. Gold marks a declared emergency.">
        <MapSlot height={300} failed="The map can't be drawn on this device. Every problem is in the list, with the same details.">
          {(onFail) => <EmergencyMap campaign={campaign} {...(chosen?.state ? { selected: chosen.state as string } : {})} marks={marks} onState={pickState} onFail={onFail} />}
        </MapSlot>
        <Text variant="body" tone="secondary">
          {chosen ? `${chosen.headline}: ${chosen.standfirst}` : "Nothing is going wrong at home right now."}
        </Text>
      </MapPanelSlot>
      {chosen ? <Response row={chosen} guard={guard} onOpen={setOpen} /> : null}
    </Column>
  );
  return (
    <Page eyebrow="Federal Emergency Management Agency" icon="caution" title="Emergency" lede={board.weeklyCost > 0 ? `Your emergency declarations change your International Standing by ${formatSignedPoints(-board.weeklyCost)} pts this week.` : incidents.length === 0 ? "Nothing is going wrong at home right now." : `${incidents.length} ${incidents.length === 1 ? "problem is" : "problems are"} going on at home.`} emblem={<Seal spec={sealFor("INST-FEMA")} size={72} />}>
      <Sheet open={open !== undefined || acts.done !== undefined} onClose={close} title="Emergency action" eyebrow="Emergency powers" wide>
        {acts.done ? <ActDone done={acts.done} onBack={close} backLabel="Back to emergencies" /> : open ? <ActPanel key={JSON.stringify(open)} campaign={campaign} act={open} acts={acts} /> : null}
      </Sheet>
      {acts.layer}
      <Summary board={board} incidents={incidents} />
      <LawTopicHelp topic="national-emergency" />
      <Row gap="lg" wrap={!media.desktop} top>
        <Column flex={1} minWidth={300} gap="md" {...(media.desktop ? {} : { flexBasis: "100%" as const })}>
          <Pane id="emergency-incidents" title="Problems, most serious first" icon="active" count={incidents.length}>
            <ReadingFrame title="How serious each problem is" unit="% of the worst damage it could do" legend={severityKey} pressHint="Press a problem to see its place on the map and what you can do." help={SEVERITY_HELP}>
            <Collection items={incidents} initial={6} noun="incidents" empty="Nothing is going wrong at home right now. You can declare an emergency only while a problem is still going on." render={(row) => <IncidentRow key={row.id} row={row} selected={row.id === chosen?.id} onSelect={onSelect} />} />
            </ReadingFrame>
          </Pane>
        </Column>
        {media.desktop ? <Sticky width={media.wide ? 560 : 460}>{where}</Sticky> : <Column flexBasis="100%">{where}</Column>}
      </Row>
      <Pane id="emergency-declared" title={`Declared emergencies (${board.declarations.length})`} icon="order">
        <ReadingFrame title="Time left on each declaration" unit={`Weeks, out of ${EMERGENCY_RENEWAL_TURNS}`} legend={toneKey({ reading: "Running", watch: "Time to renew" })} help={{ meaning: "A declaration ends after a year unless you continue it. The bar is how much of that year is left, and it turns amber when you can continue it." }}>
        <Collection items={ordered} initial={4} noun="declarations" empty="No emergency is declared right now. Each problem above shows what the law lets you do. Declaring an emergency doesn't let you do whatever you want." render={(row) => <Declaration key={row.id} row={row} selected={row.id === declaration} onOpen={setOpen} signer={campaign.founding.leader.name} />} />
        </ReadingFrame>
      </Pane>
      <MetricReading campaign={campaign} metric="stability" />
      <MetricActs campaign={campaign} metric="stability" title="What changed stability" empty="Nothing in the Record has changed stability yet." />
    </Page>
  );
}
