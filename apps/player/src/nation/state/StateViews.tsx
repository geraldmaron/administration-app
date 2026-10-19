import { CLAIM_WINDOW_MAX_TURNS, type Campaign } from "@admin/engine";
import { PARTY_WORDS, formatRatio, leanWords, localeActOptions, peopleWords, place, type DistrictDossier, type LocaleMatter, type StateDossier, type StateVital } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Button, CardGrid, Column, EntityLink, Icon, ReadingFrame, Row, Surface, Text, View, type IconName } from "@admin/ui";
import { Collection, TrackRow } from "@admin/ui/nation";
import { StackedBar, segmentKeyEntries, type BarSegment } from "@admin/ui/news";
import { Panel } from "@admin/ui/world";
import { CompareChart } from "../../compare/CompareChart";
import { go } from "../../shell/navigate";
import { ConditionList } from "../Conditions";
import { markEntry, toneKey } from "../keys";
import { LawTopicHelp } from "../Law";
import { VALENCE_TEXT, valenceOf, weeks } from "../format";

const VITAL_MARK: Readonly<Record<StateVital["key"], IconName>> = { jobs: "economyUnemployment", prices: "economyInflation", crime: "shield" };
const SECTOR_MARK: Readonly<Record<StateDossier["industry"][number]["axis"], IconName>> = {
  industrial: "sectorSteelHeavy",
  agricultural: "sectorAgriculture",
  energy: "sectorEnergyOil",
  tech: "sectorSemiconductors",
  services: "sectorFinance",
  defense: "sectorDefenseIndustrial",
};
const STANCE_STEPS = ["adverse", "caution", "neutral", "favorable"] as const;

/** A state's pulse against the country: four steps from worst to best, the state's own step lit, its word beside it. */
function VitalScale({ vital }: { readonly vital: StateVital }) {
  const at = STANCE_STEPS.indexOf(vital.stance);
  const valence = valenceOf(vital.stance);
  return (
    <Row gap="sm" wrap role="img" aria-label={`${vital.caption}: ${vital.word}, ${at + 1} on a scale of 1 (worst) to 4 (best)`}>
      <Icon name={VITAL_MARK[vital.key]} size={18} tone="colorSecondary" />
      <Text variant="label" flex={1} minWidth={120}>
        {vital.caption}
      </Text>
      <Row gap="2xs">
        {STANCE_STEPS.map((step, index) => (
          <View key={step} width={22} height={10} borderRadius="chip" backgroundColor={index === at ? (index < 2 ? "danger" : index === 2 ? "colorTertiary" : "successInk") : "borderColor"} />
        ))}
      </Row>
      <Text variant="label" tone={VALENCE_TEXT[valence]} minWidth={110} flexGrow={1} textAlign="right">
        {vital.word}
      </Text>
    </Row>
  );
}

/** What the state's economy is made of and how it is doing beside the country, and its largest metros. */
export function StateEconomy({ campaign, dossier }: { readonly campaign: Campaign; readonly dossier: StateDossier }) {
  const largest = Math.max(1, ...dossier.metros.map((metro) => metro.population));
  return (
    <Column gap="lg">
      <Panel title="Compared with the whole country" icon="economyGrowth">
        <ReadingFrame title="How the state is doing against the country" unit="Four steps, from worst to best" legend={[{ id: "worst", kind: "swatch", label: "One of the two worst steps", ink: "danger" }, { id: "even", kind: "swatch", label: "About the same as the country", ink: "colorTertiary" }, { id: "best", kind: "swatch", label: "Better than the country", ink: "successInk" }]} help={{ meaning: "Each row has four steps, from worst on the left to best on the right. The lit step is where the state stands against the whole country, and the word beside it says the same." }}>
          <Column gap="sm">
            {dossier.vitals.map((vital) => (
              <VitalScale key={vital.key} vital={vital} />
            ))}
          </Column>
        </ReadingFrame>
        <CompareChart campaign={campaign} metric="unemployment" subjects={[{ kind: "self" }, { kind: "state", id: dossier.id }]} window="term" title={`Unemployment in ${dossier.name} and the whole country`} />
      </Panel>
      <Panel title="What the economy is made of" icon="building">
        <ReadingFrame title="The state's economy by part" unit="% of the state's economy, income or people" help={{ meaning: "Each bar is a share, from 0% to 100%. The first rows are the parts of the economy. The higher the share of income from federal money, the more the state is hurt if Congress doesn't pass the budget on time." }} legend={[{ id: "share", kind: "swatch", label: "Share of the whole, 0% to 100%", ink: "accent" }]}>
          <Column gap="sm">
            {dossier.industry.map((axis) => (
              <Row key={axis.axis} gap="xs">
                <Icon name={SECTOR_MARK[axis.axis]} size={18} tone="colorSecondary" />
                <View flex={1}>
                  <TrackRow name={axis.label} figure={axis.text} value={axis.share} />
                </View>
              </Row>
            ))}
            <TrackRow name="Income that comes from federal money" figure={formatRatio(dossier.federalDependence)} value={dossier.federalDependence} />
            <TrackRow name="Living in metro areas" figure={formatRatio(dossier.urbanization)} value={dossier.urbanization} />
          </Column>
        </ReadingFrame>
      </Panel>
      {dossier.metros.length > 0 ? (
        <Panel title="Biggest cities" icon="mapPin">
          <ReadingFrame title="Metro areas by population" unit="People, to scale with the biggest" legend={[{ id: "size", kind: "swatch", label: "Longest bar is the biggest metro area", ink: "colorTertiary" }]} help={{ meaning: "Each bar is a metro area's population, scaled so the biggest fills the bar." }}>
            <Collection items={dossier.metros} initial={5} noun="cities" render={(metro) => <TrackRow key={metro.id} name={metro.name} figure={metro.populationText} value={metro.population / largest} tone="neutral" />} />
          </ReadingFrame>
        </Panel>
      ) : null}
    </Column>
  );
}

/** What the state is living through, what it has asked Washington for, the emergencies reaching it, and what it remembers. */
export function StateConditions({ dossier }: { readonly dossier: StateDossier }) {
  return (
    <Column gap="lg">
      <Panel id="state-conditions" title="Problems" icon="caution">
        <ConditionList conditions={dossier.conditions} none={`${dossier.name} has no problems that need you this week.`} />
      </Panel>
      {dossier.claims.length > 0 ? (
        <Panel title="What the state has asked for" icon="pending">
          <ReadingFrame title="Time left to answer each request" unit={`Weeks, out of ${CLAIM_WINDOW_MAX_TURNS}`} legend={toneKey({ reading: "Plenty of time", watch: "4 weeks or fewer", bad: "2 weeks or fewer" })} help={{ meaning: "A state's request stays open for a few weeks. The bar shrinks as time runs out, and turns amber and then red." }}>
            <Column gap="md">
              {dossier.claims.map((claim) => (
                <Column key={claim.signature} gap="2xs">
                  <Text variant="body">{claim.reason}</Text>
                  <TrackRow name="Time left" figure={`${weeks(claim.weeksLeft)} left`} value={Math.min(1, claim.weeksLeft / CLAIM_WINDOW_MAX_TURNS)} tone={claim.weeksLeft <= 2 ? "bad" : claim.weeksLeft <= 4 ? "watch" : "reading"} />
                </Column>
              ))}
            </Column>
          </ReadingFrame>
        </Panel>
      ) : null}
      {dossier.emergencies.length > 0 ? (
        <Panel title="Emergencies that cover it" icon="order">
          {dossier.emergencies.map((emergency) => (
            <Surface key={emergency.id} level="raised" pad="md" accentEdge="gold">
              <Text variant="label">{emergency.title}</Text>
              <Text variant="caption" tone="secondary">
                {emergency.statewide ? "Declared for this state" : "Declared for the whole country"}. Ends in {weeks(emergency.weeksLeft)} unless you renew it.
              </Text>
            </Surface>
          ))}
        </Panel>
      ) : null}
      <Panel title="What the state remembers" icon="record">
        {dossier.marks.length === 0 ? (
          <Text variant="body" tone="secondary">
            The state doesn't remember anything you've done yet, good or bad.
          </Text>
        ) : (
          dossier.marks.map((mark, index) => (
            <Row key={`${mark.signature}-${index}`} gap="sm" top>
              <Icon name={mark.forYou ? "favorable" : "adverse"} size={16} tone={mark.forYou ? "successInk" : "danger"} />
              <Text variant="body" flex={1}>
                <Text weight="strong" tone={mark.forYou ? "success" : "danger"}>
                  {mark.forYou ? "For you" : "Against you"}.{" "}
                </Text>
                {mark.reason}
              </Text>
            </Row>
          ))
        )}
      </Panel>
    </Column>
  );
}

/** Lean as a mark on a short line from D+30 to R+30, so a column of districts reads as a spread. */
function LeanMark({ lean }: { readonly lean: number }) {
  const at = Math.min(1, Math.max(0, 0.5 + lean / 0.6));
  return (
    <View position="relative" width={90} height={12} aria-hidden>
      <View position="absolute" top={5} left={0} right={0} height={2} backgroundColor="borderColor" />
      <View position="absolute" top={0} bottom={0} left="50%" width={1} backgroundColor="borderColorStrong" />
      <View position="absolute" top={1} left={`${at * 100}%`} marginLeft={-5} width={10} height={10} borderRadius="pill" backgroundColor={lean > 0.02 ? "partyRep" : lean < -0.02 ? "partyDem" : "partyInd"} />
    </View>
  );
}

function DistrictLine({ district, current }: { readonly district: DistrictDossier; readonly current: boolean }) {
  return (
    <Row gap="sm" wrap padding="xs" borderRadius="chip" backgroundColor={current ? "infoFill" : "transparent"} borderLeftWidth={4} borderLeftColor={district.holder === "democrat" ? "partyDem" : district.holder === "republican" ? "partyRep" : "partyInd"}>
      <View flex={1} minWidth={160}>
        <EntityLink label={`${district.code}${district.place ? ` · ${district.place}` : ""}`} href={`${place.district(district.id)}&view=representation`} onPress={() => go(`${place.district(district.id)}&view=representation`)} />
      </View>
      <Text variant="caption" minWidth={120}>
        {district.holder ? PARTY_WORDS[district.holder] : "Not held by a major party"}
      </Text>
      <Row gap="xs" minWidth={150}>
        <LeanMark lean={district.lean} />
        <Text variant="caption">{leanWords(district.lean)}</Text>
      </Row>
      <Text variant="caption" tone="secondary" minWidth={80}>
        {peopleWords(district.population)}
      </Text>
    </Row>
  );
}

/** Who the state sends to Congress: its two senators, its House delegation by party, and every district, each a door. */
export function Politics({ dossier, district }: { readonly dossier: StateDossier; readonly district?: string }) {
  const { house } = dossier;
  const houseBar: readonly BarSegment[] = [
    { key: "democrat", label: "Democratic", count: house.democrat, ink: "partyDem", figure: String(house.democrat) },
    { key: "republican", label: "Republican", count: house.republican, ink: "partyRep", figure: String(house.republican) },
    ...(house.unheld > 0 ? [{ key: "other", label: "Other or vacant", count: house.unheld, ink: "partyInd" as const, figure: String(house.unheld) }] : []),
  ];
  return (
    <Panel title="Who represents it in Congress" icon="ballot" lede={`This state has ${dossier.electoralVotes} votes in the Electoral College, the group that picks the President. The number is set by the Constitution and doesn't predict who will win.`}>
      {dossier.senate.length > 0 ? (
        <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 2 }}>
          {dossier.senate.map((seat, index) => (
            <Surface key={index} level="raised" pad="md" flexGrow={1} borderLeftWidth={4} borderLeftColor={seat.party === "democrat" ? "partyDem" : seat.party === "republican" ? "partyRep" : "partyInd"}>
              <Row gap="sm">
                <Icon name="subjectChamber" size={22} tone="colorSecondary" />
                <Column flex={1}>
                  {seat.senator ? <EntityLink label={seat.senator.name} href={seat.senator!.href} onPress={() => go(seat.senator!.href)} /> : null}
                  <Text variant="caption" tone="secondary">
                    {seat.partyWord} · Senate seat, {seat.up}
                  </Text>
                </Column>
              </Row>
            </Surface>
          ))}
        </CardGrid>
      ) : (
        <Text variant="body" tone="secondary">
          Washington, D.C., has no senators.
        </Text>
      )}
      <ReadingFrame title={`Members in the House, ${house.seats} ${house.seats === 1 ? "seat" : "seats"}`} unit="Seats" legend={segmentKeyEntries(houseBar)} help={{ meaning: "The bar is this state's whole House delegation, cut by party. A wider part is more seats." }}>
        <StackedBar label={`Members in the House, ${house.seats} ${house.seats === 1 ? "seat" : "seats"}`} segments={houseBar} height={14} />
      </ReadingFrame>
      {dossier.districts.length > 0 ? (
        <Column gap="xs">
          <Text variant="label">
            {dossier.districts.length} {dossier.districts.length === 1 ? "district" : "districts"}
          </Text>
          <ReadingFrame title="How each district leans" unit="Points toward one party, from D+30 to R+30" legend={[{ id: "dem", kind: "dot", label: "Leans Democratic", ink: "partyDem" }, { id: "rep", kind: "dot", label: "Leans Republican", ink: "partyRep" }, { id: "ind", kind: "dot", label: "About even", ink: "partyInd" }, markEntry("even", "Even: neither party ahead")]} pressHint="Press a district's name to open it." help={{ meaning: "Each dot sits on a short line. The center is an even district, left leans Democratic and right leans Republican. The colored edge is the party that holds the seat now. A figure such as D+30 means Democrats usually win the district by about 30 points." }}>
            <Collection items={dossier.districts} initial={8} noun="districts" gap="2xs" render={(entry) => <DistrictLine key={entry.id} district={entry} current={entry.id === district} />} />
          </ReadingFrame>
        </Column>
      ) : null}
    </Panel>
  );
}

/** The desk for sending federal power into a state with nothing there to answer. */
export const powerHref = (state: StateId): string => place.stateAct(state);

/** The state's act desk for one matter. */
export const actHref = (state: StateId, cause: string): string => place.stateAct(state, cause);

function MatterCard({ campaign, state, matter }: { readonly campaign: Campaign; readonly state: StateId; readonly matter: LocaleMatter }) {
  const options = localeActOptions(campaign, state, matter.cause);
  return (
    <Surface level="raised" pad="md" accentEdge="warning">
      <Column gap="sm">
        <EntityLink icon="caution" label={matter.title} href={actHref(state, matter.cause)} onPress={() => go(actHref(state, matter.cause))} />
        <Text variant="body">{matter.request ? `${matter.request.reason} ${weeks(matter.request.weeksLeft)} left to answer.` : "The state hasn't asked you for help with this."}</Text>
        <Column gap="2xs" role="list" aria-label={`What you can do about the ${matter.title.toLowerCase()}`}>
          {options.map((option) => (
            <Row key={option.id} gap="sm" wrap role="listitem">
              <Text variant="label" flex={1} minWidth={160} tone={option.locked ? "tertiary" : "primary"}>
                {option.name}
              </Text>
              <Text variant="caption" weight="strong" tone={option.locked ? "tertiary" : "danger"}>
                {option.locked ? "Not available" : option.costText}
              </Text>
              {option.locked ? (
                <Text variant="caption" tone="secondary" width="100%">
                  {option.locked}
                </Text>
              ) : null}
            </Row>
          ))}
        </Column>
        <Button kind="secondary" size="compact" icon="sign" onPress={() => go(actHref(state, matter.cause))}>
          {`Compare your choices on the ${matter.title.toLowerCase()}`}
        </Button>
      </Column>
    </Surface>
  );
}

/** What the President can do about this state: each matter open in it, every locale act's price, and what blocks the ones that are blocked. */
export function Acts({ campaign, dossier, matters }: { readonly campaign: Campaign; readonly dossier: StateDossier; readonly matters: readonly LocaleMatter[] }) {
  return (
    <Column gap="lg">
      <Panel title="What you can do" icon="sign" lede="Some actions only work when an emergency has been declared for the state. You declare emergencies on the Emergency screen." aside={<Button kind="quiet" size="compact" icon="caution" onPress={() => go(place.emergency())}>Open Emergency</Button>}>
        <LawTopicHelp topic="domestic-force" compact />
        <Surface level="raised" pad="md" accentEdge="danger">
          <Column gap="xs">
            <EntityLink icon="shield" label={`See what federal forces you could send to ${dossier.name}`} href={powerHref(dossier.id)} onPress={() => go(powerHref(dossier.id))} />
            <Text variant="caption" tone="secondary">
              You can't send in extra federal agents, take command of the state's Guard, or send troops into the state. Each would need a mission, legal findings, and steps the game doesn't track, and an emergency declaration or unrest doesn't supply them. An order to spy on residents will be refused.
            </Text>
          </Column>
        </Surface>
      </Panel>
      {matters.length === 0 ? (
        <Text variant="body" tone="secondary">
          {dossier.name} has no problem or request for you this week. You act on a state to answer one of those, so there's nothing to do here right now.
        </Text>
      ) : (
        matters.map((matter) => <MatterCard key={matter.cause} campaign={campaign} state={dossier.id} matter={matter} />)
      )}
    </Column>
  );
}

