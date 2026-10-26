import type { ReactNode } from "react";
import type { CohortId } from "@admin/world";
import type { Campaign } from "@admin/engine";
import { STATE_GROUP_METHOD, formatRatio, place, statePeople, stateGroupRating, type GroupRating, type Standout, type StateDossier, type StatePeople } from "@admin/player-core";
import { Pane, Button, CardGrid, Column, Icon, ReadingFrame, Row, Surface, Text, type ReadingHelp } from "@admin/ui";
import { FigureBand, Track } from "@admin/ui/nation";
import { go } from "../../shell/navigate";
import { VALENCE_TEXT, VALENCE_TRACK, gapText, percent, valenceOf } from "../format";
import { AXIS_ICON } from "../glyphs";
import { markEntry, toneKey } from "../keys";
import { DemographicProfile } from "./Demographics";

const HOUSE_SEATS = 435;

function share(value: number): string {
  const rounded = Math.round(value * 1000) / 10;
  return rounded < 0.1 ? "under 0.1%" : `${rounded}%`;
}

function Headlines({ dossier, people }: { readonly dossier: StateDossier; readonly people: StatePeople }) {
  const { size } = people;
  const approval = dossier.approval;
  const history = approval?.history.map((point) => point.approval) ?? [];
  const first = history[0];
  const sinceOath = approval && history.length > 1 && first !== undefined ? approval.approval - first : undefined;
  return (
    <FigureBand
      label="Key numbers"
      items={[
        { icon: "subjectPerson", label: "Population", value: dossier.populationText, note: `Ranks ${size.rank} of ${size.of} states, ${share(size.share)} of the country` },
        { icon: "subjectChamber", label: "House seats", value: String(dossier.house.seats), note: `of ${HOUSE_SEATS} · ${share(dossier.house.seats / HOUSE_SEATS)} of the House` },
        ...(approval
          ? [
              {
                icon: "favorable" as const,
                label: "Approval here",
                value: formatRatio(approval.approval),
                tone: approval.approval >= 0.5 ? ("good" as const) : approval.approval >= 0.4 ? ("watch" as const) : ("bad" as const),
                note: sinceOath === undefined ? "Only one week tracked so far." : `${gapText(sinceOath).replace("level", "No change")} since you took office`,
              },
            ]
          : []),
      ]}
    />
  );
}

function StandoutFact({ fact, name }: { readonly fact: Standout; readonly name: string }) {
  return (
    <Surface level="raised" pad="sm" flexGrow={1} role="listitem">
      <Row gap="sm">
        <Icon name={AXIS_ICON[fact.axis]} size={20} tone="gold" />
        <Column flex={1}>
          <Text variant="label">{fact.name}</Text>
          <Text variant="caption" tone="secondary">
            {percent(fact.state)} of {name}, compared with {percent(fact.nation)} nationally
          </Text>
        </Column>
        <Text variant="label" tone="info">
          {gapText(fact.gap)}
        </Text>
      </Row>
    </Surface>
  );
}

function Standouts({ people, name, limit }: { readonly people: StatePeople; readonly name: string; readonly limit?: number }) {
  if (people.standouts.length === 0) return <Text variant="body" tone="secondary">The people of {name} are a lot like the country as a whole.</Text>;
  return (
    <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 3 }} role="list" aria-label={`What sets ${name} apart`}>
      {people.standouts.slice(0, limit ?? people.standouts.length).map((fact) => (
        <StandoutFact key={fact.cohort} fact={fact} name={name} />
      ))}
    </CardGrid>
  );
}

const RATING_HELP: ReadingHelp = { meaning: "For each group, the top bar is its share of the people who live here. The bottom bar is the share of that group who approve of you, and the dark line is how that group feels across the whole country." };

/** The key every group-rating row draws by, set once above them. */
function RatingFrame({ children, name }: { readonly children: ReactNode; readonly name: string }) {
  return (
    <ReadingFrame title={`How groups rate you in ${name}`} unit="% of the group, with a dark line for the whole country" legend={[{ id: "share", kind: "swatch", label: "Share of people who live here", ink: "colorTertiary" }, markEntry("national", "How the group feels nationwide"), ...toneKey({ good: "Group leans your way", watch: "Group is wary", bad: "Group leans against you" })]} help={RATING_HELP}>
      {children}
    </ReadingFrame>
  );
}

function RatingRow({ rating, name }: { readonly rating: GroupRating; readonly name: string }) {
  const valence = valenceOf(rating.stance);
  const national = percent(rating.national);
  const versus = Math.round(rating.gap * 100) === 0 ? `same as nationally (${national})` : `${gapText(rating.gap)} compared with ${national} nationally`;
  return (
    <Surface level="raised" pad="md" role="listitem">
      <Column gap="xs">
        <Row gap="xs">
          <Icon name={AXIS_ICON[rating.axis]} size={18} tone="gold" />
          <Text variant="label">{rating.name}</Text>
        </Row>
        <Row gap="sm">
          <Text variant="caption" tone="secondary" width={120}>
            Share of people here
          </Text>
          <Track value={rating.state} tone="neutral" slim />
          <Text variant="caption" minWidth={48} textAlign="right">
            {percent(rating.state)}
          </Text>
        </Row>
        <Row gap="sm">
          <Text variant="caption" tone="secondary" width={120}>
            Support in {name}
          </Text>
          <Track value={rating.support} tone={VALENCE_TRACK[valence]} slim marks={[{ at: rating.national, label: `Nationally ${national}`, strong: true }]} label={`${rating.name} in ${name}: ${rating.figure}, compared with ${national} nationally`} />
          <Text variant="caption" weight="strong" tone={VALENCE_TEXT[valence]} minWidth={48} textAlign="right">
            {rating.figure}
          </Text>
        </Row>
        <Text variant="caption" tone="secondary">
          {rating.word}, {versus}
        </Text>
      </Column>
    </Surface>
  );
}

/** The People view: size and approval, who lives here against the country, and how those groups rate the President here. */
export function People({ campaign, dossier, cohort }: { readonly campaign: Campaign; readonly dossier: StateDossier; readonly cohort?: CohortId | undefined }) {
  const people = statePeople(campaign, dossier.id);
  const selected = cohort ? stateGroupRating(campaign, dossier.id, cohort) : undefined;
  if (!people) return <Text variant="body" tone="secondary">We don't have a population breakdown for {dossier.name}.</Text>;
  return (
    <Column gap="lg">
      {cohort ? (
        <Pane title={selected ? `${selected.name} in ${dossier.name}` : "No data for this group"} icon="layerBlocs" band="accent" line={selected ? STATE_GROUP_METHOD : undefined}>
          {selected ? <RatingFrame name={dossier.name}><RatingRow rating={selected} name={dossier.name} /></RatingFrame> : <Text variant="body">We don't have an estimate of how this group feels about you in {dossier.name}.</Text>}
        </Pane>
      ) : null}
      <Headlines dossier={dossier} people={people} />
      <Pane title={`What sets ${dossier.name} apart`} icon="layerBlocs">
        <Standouts people={people} name={dossier.name} />
      </Pane>
      <Pane title="Who lives here, compared with the country" icon="graph">
        <DemographicProfile name={dossier.name} axes={people.axes} />
      </Pane>
      {people.ratings.length > 0 ? (
        <Pane title={`How these groups rate you in ${dossier.name}`} icon="layerReading" line="The four groups much more common here than in the country, then the two biggest.">
          <RatingFrame name={dossier.name}>
            <Column gap="sm" role="list">
              {people.ratings.map((rating) => (
                <RatingRow key={rating.cohort} rating={rating} name={dossier.name} />
              ))}
            </Column>
          </RatingFrame>
          <Text variant="caption" tone="tertiary">
            {STATE_GROUP_METHOD}
          </Text>
        </Pane>
      ) : null}
    </Column>
  );
}

/** The most distinctive facts about the people, on the Overview; the People view adds how the groups rate the President. */
export function PeopleStrip({ campaign, dossier }: { readonly campaign: Campaign; readonly dossier: StateDossier }) {
  const people = statePeople(campaign, dossier.id);
  if (!people || people.standouts.length === 0) return null;
  return (
    <Pane title={`What sets ${dossier.name} apart`} icon="subjectPerson" actions={<Button kind="secondary" size="compact" icon="chevron" onPress={() => go(place.stateView(dossier.id, "people"))}>How these groups rate you</Button>}>
      <Standouts people={people} name={dossier.name} limit={4} />
      <DemographicProfile name={dossier.name} axes={people.axes} />
    </Pane>
  );
}
