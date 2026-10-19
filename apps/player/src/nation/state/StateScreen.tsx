import type { Campaign } from "@admin/engine";
import { PARTY_WORDS, assembleDistrictDossier, formatRatio, leanWords, localeMatters, peopleWords, place, sealFor, stateDossier, type DistrictDossier, type LocaleMatter, type StateDossier } from "@admin/player-core";
import type { CohortId, StateId } from "@admin/world";
import { Button, Column, Empty, Page, ReadingFrame, Seal, Text } from "@admin/ui";
import { FigureBand, TrackRow, ViewTabs } from "@admin/ui/nation";
import { Panel } from "@admin/ui/world";
import { BackButton } from "../../shell/BackButton";
import { go } from "../../shell/navigate";
import { markEntry, toneKey } from "../keys";
import { StateMapPanel } from "./StateMapPanel";
import { leanMeaning, stateEyebrow, weeks } from "../format";
import { Overview, StateHead } from "./Overview";
import { People } from "./People";
import { Acts, Politics, StateConditions, StateEconomy, actHref, powerHref } from "./StateViews";

export const STATE_VIEWS = ["overview", "people", "economy", "conditions", "response", "representation"] as const;
export type StateView = (typeof STATE_VIEWS)[number];
export const isStateView = (value: unknown): value is StateView => typeof value === "string" && (STATE_VIEWS as readonly string[]).includes(value);

export const STATE_LENSES = ["approval", "lean", "call", "house"] as const;
export type StateLensId = (typeof STATE_LENSES)[number];
export const STATE_LENS_NAMES: Readonly<Record<StateLensId, string>> = { approval: "Approval", lean: "Party lean", call: "Who would win", house: "House seats" };
export const isStateLens = (value: unknown): value is StateLensId => typeof value === "string" && (STATE_LENSES as readonly string[]).includes(value);

function DistrictPanel({ district, dossier }: { readonly district: DistrictDossier; readonly dossier: StateDossier }) {
  return (
    <Panel title={district.place ?? district.name} icon="mapPin" edge="accent" lede={`${district.code} · ${district.name}`} aside={<Button kind="quiet" size="compact" icon="close" onPress={() => go(place.stateView(dossier.id, "representation"))}>Close the district</Button>}>
      <FigureBand
        label="The district"
        items={[
          { label: "Held by", value: district.holder ? PARTY_WORDS[district.holder] : "No major party" },
          { label: "Lean", value: leanWords(district.lean), note: leanMeaning(leanWords(district.lean)) },
          { label: "People", value: peopleWords(district.population) },
        ]}
      />
      <Text variant="body" tone="secondary">
        We measure approval for the whole state, not for each district. In {dossier.name}, it's {dossier.approval ? formatRatio(dossier.approval.approval) : "unknown"}. The state has {district.claims} open {district.claims === 1 ? "request" : "requests"} and remembers {district.marks} {district.marks === 1 ? "thing" : "things"} you've done.
      </Text>
    </Panel>
  );
}

/** The one federal matter that most needs an answer, said above the views so it is never found by hunting for a tab. */
function UrgentMatter({ state, matter }: { readonly state: StateId; readonly matter: LocaleMatter }) {
  return (
    <Panel title={`Waiting for your answer: ${matter.title}`} icon="caution" edge="warning" lede={matter.request ? `${matter.request.reason} ${weeks(matter.request.weeksLeft)} left to answer.` : "The state hasn't asked you for help with this."}>
      <Button kind="primary" icon="sign" onPress={() => go(actHref(state, matter.cause))}>
        {`Answer the ${matter.title.toLowerCase()}`}
      </Button>
    </Panel>
  );
}

/** The state on the chosen lens, as the rows the map would color by. */
function LensRows({ dossier, lens }: { readonly dossier: StateDossier; readonly lens: StateLensId }) {
  if (lens === "approval") return dossier.approval ? <ReadingFrame title="Approval here" unit="% of the state who approve" legend={[markEntry("half", "Half the state"), ...toneKey({ good: "Half or more approve", watch: "40% to 49%", bad: "Under 40%" })]} help={{ meaning: "The bar is the share of people in this state who approve of you. The line is half the state." }}><TrackRow name="Approval" figure={formatRatio(dossier.approval.approval)} value={dossier.approval.approval} marks={[{ at: 0.5, label: "Half the state" }]} tone={dossier.approval.approval >= 0.5 ? "good" : dossier.approval.approval >= 0.4 ? "watch" : "bad"} /></ReadingFrame> : <Empty icon="ballot" title="No approval number yet" detail={`We don't have an approval number for ${dossier.name}.`} />;
  if (lens === "lean") return <Text variant="body">{dossier.leanText}. {leanMeaning(dossier.leanText)}</Text>;
  if (lens === "house") return <Text variant="body">{dossier.house.seats} House {dossier.house.seats === 1 ? "seat" : "seats"}: {dossier.house.democrat} Democratic, {dossier.house.republican} Republican{dossier.house.unheld > 0 ? `, ${dossier.house.unheld} other or vacant` : ""}.</Text>;
  return <Text variant="body">{dossier.electoralVotes} electoral votes. {dossier.leanText}.</Text>;
}

export type StateScreenProps = {
  readonly campaign: Campaign;
  readonly id: StateId;
  readonly cohort?: CohortId;
  readonly district?: string;
  readonly lens: StateLensId;
  readonly onLens: (lens: StateLensId) => void;
  readonly view: StateView;
  readonly onView: (view: StateView) => void;
};

/** A state's dossier: its identity and governor, the matter that needs a federal answer, then views of the state. */
export function StateScreen({ campaign, id, district, lens, onLens, view, onView, cohort }: StateScreenProps) {
  const dossier = stateDossier(campaign, id);
  if (!dossier) return <NoSuchState />;
  const detached = district ? assembleDistrictDossier(campaign, district) : undefined;
  const inside = detached && detached.stateId === id ? detached : undefined;
  const matters = localeMatters(campaign, id);
  const lead = matters[0];
  const conditionCount = dossier.conditions.length + dossier.emergencies.length + dossier.claims.length;
  return (
    <Page
      eyebrow={stateEyebrow(id, dossier.name)}
      icon="mapPin"
      title={dossier.name}
      lede={dossier.approval ? `${formatRatio(dossier.approval.approval)} of people here approve of you. See what the state is dealing with, who lives here, and who represents it in Congress.` : "See what the state is dealing with, who lives here, and what it needs from you."}
      emblem={<Seal spec={sealFor("INST-STATES")} size={64} />}
      actions={lead ? null : <Button kind="secondary" size="compact" icon="shield" onPress={() => go(powerHref(id))}>Send federal forces</Button>}
    >
      {inside ? <DistrictPanel district={inside} dossier={dossier} /> : null}
      <StateHead campaign={campaign} dossier={dossier} />
      {lead ? <UrgentMatter state={id} matter={lead} /> : null}
      <StateMapPanel campaign={campaign} state={id} title={`${dossier.name} by ${STATE_LENS_NAMES[lens].toLowerCase()}`} lens={lens} selected={inside ? `district:${inside.id}` : `state:${id}`} lenses={STATE_LENSES.map((candidate) => ({ id: candidate, label: STATE_LENS_NAMES[candidate] }))} onLens={(next) => isStateLens(next) && onLens(next)}>
        <LensRows dossier={dossier} lens={lens} />
      </StateMapPanel>
      <ViewTabs<StateView>
        label={`Views of ${dossier.name}`}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "people", label: "People" },
          { id: "economy", label: "Economy" },
          { id: "conditions", label: "Problems", count: conditionCount },
          { id: "response", label: "What you can do" },
          { id: "representation", label: "Districts" },
        ]}
        selected={view}
        onSelect={onView}
      />
      <Column gap="lg">
        {view === "people" ? (
          <People campaign={campaign} dossier={dossier} cohort={cohort} />
        ) : view === "economy" ? (
          <StateEconomy campaign={campaign} dossier={dossier} />
        ) : view === "conditions" ? (
          <StateConditions dossier={dossier} />
        ) : view === "response" ? (
          <Acts campaign={campaign} dossier={dossier} matters={matters} />
        ) : view === "representation" ? (
          <Politics dossier={dossier} {...(inside ? { district: inside.id } : {})} />
        ) : (
          <Overview campaign={campaign} dossier={dossier} />
        )}
      </Column>
    </Page>
  );
}

/** A state address the game carries no state for. */
export function NoSuchState() {
  return (
    <Page eyebrow="The country" title="No such state" lede="We couldn't find a state at this address.">
      <BackButton parent={place.nation()} parentLabel="Nation" />
    </Page>
  );
}
