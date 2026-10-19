import { useEffect, useRef } from "react";
import type { Campaign } from "@admin/engine";
import { PARTY_WORDS, assembleDistrictDossier, formatRatio, leanWords, localeMatters, peopleWords, place, stateDossier, type DistrictDossier, type LocaleMatter, type StateDossier } from "@admin/player-core";
import type { CohortId, StateId } from "@admin/world";
import { EmptyState, Icon, Stat, StatRow, Tabs, buttonClass } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { MapView } from "../../map/MapView";
import { Screen } from "../../shell/Screen";
import { Acts, actHref, powerHref } from "./Acts";
import { Economy } from "./Economy";
import { STATE_LENSES, STATE_LENS_NAMES, isStateLens, type StateLensId } from "./lenses";
import { Overview, StateHead } from "./Overview";
import { People } from "./People";
import { Politics } from "./Politics";
import { StateConditions } from "./StateConditions";
import "./state.css";

export const STATE_VIEWS = ["overview", "people", "economy", "conditions", "response", "representation"] as const;
export type StateView = (typeof STATE_VIEWS)[number];

export function isStateView(value: unknown): value is StateView {
  return typeof value === "string" && (STATE_VIEWS as readonly string[]).includes(value);
}

/** The district detached inside its state: who holds it, how it leans, and the state it sits in. */
function DistrictPanel({ district, dossier }: { readonly district: DistrictDossier; readonly dossier: StateDossier }) {
  const panel = useRef<HTMLElement | null>(null);
  // A district is chosen from the list in the Representation view; its own reading sits above the views, so the panel goes there.
  useEffect(() => {
    // A block body: the browser's scrollIntoView now returns a promise, which React would take for a cleanup function.
    void panel.current?.scrollIntoView({ block: "start" });
  }, [district.id]);
  return (
    <section ref={panel} className="district-panel" aria-labelledby="district-title" data-party={district.holder}>
      <p className="district-panel__eyebrow">
        <Icon name="mapPin" size={16} /> {district.code} · {district.name}
      </p>
      <h2 id="district-title" className="district-panel__title">
        {district.place ?? district.name}
      </h2>
      <StatRow layout="comparison">
        <Stat layout="comparison" label="Held by" value={district.holder ? PARTY_WORDS[district.holder] : "No major party"} compact />
        <Stat layout="comparison" label="Lean" value={leanWords(district.lean)} />
        <Stat layout="comparison" label="People" value={peopleWords(district.population)} compact />
      </StatRow>
      <p className="brief-section__note">
        Approval is read for the whole state, {dossier.approval ? formatRatio(dossier.approval.approval) : "unknown"} in {dossier.name}; no district figure would be honest. The state holds {district.claims} open {district.claims === 1 ? "request" : "requests"} and {district.marks} {district.marks === 1 ? "memory" : "memories"} of your administration.
      </p>
      <Door href={`${place.state(dossier.id)}?view=representation`} className={buttonClass("ghost", "sm")}>
        Close the district
      </Door>
    </section>
  );
}

/** The one federal matter that most needs an answer, said above the views so it is never found by hunting for a tab. */
function UrgentMatter({ state, matter }: { readonly state: StateId; readonly matter: LocaleMatter }) {
  const request = matter.request;
  return (
    <section className="state-urgent" aria-labelledby="state-urgent-title">
      <h2 id="state-urgent-title" className="state-urgent__title">
        <Icon name="caution" size={18} /> Needs a federal answer: {matter.title}
      </h2>
      <p className="state-urgent__line">{request ? `${request.reason} ${request.weeksLeft} ${request.weeksLeft === 1 ? "week" : "weeks"} left to answer.` : "Nothing has been asked of Washington over this."}</p>
      <Door href={actHref(state, matter.cause)} className={buttonClass("secondary", "sm")}>
        Compare the acts on the {matter.title.toLowerCase()}
      </Door>
    </section>
  );
}

function stateLede(dossier: StateDossier): string {
  const approval = dossier.approval;
  if (!approval) return "State conditions, communities and federal responsibilities.";
  return `${formatRatio(approval.approval)} approve. Explore state conditions, communities and representation in Congress.`;
}

export type StateScreenProps = {
  readonly campaign: Campaign;
  readonly cohort?: CohortId | undefined;
  readonly id: StateId;
  readonly district?: string;
  readonly lens: StateLensId;
  readonly onLens: (lens: StateLensId) => void;
  readonly view: StateView;
  readonly onView: (view: StateView) => void;
};

/** A state's dossier: its identity and governor, the matter that needs a federal answer, then views of the state, the state detached on the map. */
export function StateScreen({ campaign, id, district, lens, onLens, view, onView, cohort }: StateScreenProps) {
  const dossier = stateDossier(campaign, id);
  if (!dossier) return <NoSuchState />;
  const detached = district ? assembleDistrictDossier(campaign, district) : undefined;
  const inside = detached && detached.stateId === id ? detached : undefined;
  const matters = localeMatters(campaign, id);
  const lead = matters[0];
  const conditionCount = dossier.conditions.length + dossier.emergencies.length + dossier.claims.length;
  return (
    <Screen
      title={dossier.name}
      eyebrow="State"
      lede={stateLede(dossier)}
      screenClass="workspace"
      camera={`state:${id}`}
      footer={
        lead ? (
          <Door href={actHref(id, lead.cause)} className={buttonClass("primary")}>
            Answer the {lead.title.toLowerCase()}
          </Door>
        ) : (
          <Door href={powerHref(id)} className={buttonClass("secondary")}>
            Send federal power
          </Door>
        )
      }
    >
      <div className="state">
        {inside ? <DistrictPanel district={inside} dossier={dossier} /> : null}
        <StateHead campaign={campaign} dossier={dossier} />
        {lead ? <UrgentMatter state={id} matter={lead} /> : null}
        <MapView
          title={`${dossier.name} by ${STATE_LENS_NAMES[lens].toLowerCase()}`}
          lens={lens}
          camera={inside ? `district:${inside.id}` : `state:${id}`}
          selection={inside ? `state:${id}|district:${inside.id}` : `state:${id}`}
          lenses={STATE_LENSES.map((candidate) => ({ id: candidate, label: STATE_LENS_NAMES[candidate] }))}
          onLens={(next) => isStateLens(next) && onLens(next)}
          height={360}
        />
        <Tabs
          label={`Views of ${dossier.name}`}
          compact
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "people", label: "People" },
            { id: "economy", label: "Economy" },
            { id: "conditions", label: "Conditions", count: conditionCount },
            { id: "response", label: "Response" },
            { id: "representation", label: "Districts" },
          ]}
          selected={view}
          onSelect={(next) => onView(next as StateView)}
        >
          {view === "people" ? (
            <People campaign={campaign} dossier={dossier} cohort={cohort} />
          ) : view === "economy" ? (
            <Economy dossier={dossier} />
          ) : view === "conditions" ? (
            <StateConditions dossier={dossier} />
          ) : view === "response" ? (
            <Acts campaign={campaign} dossier={dossier} matters={matters} />
          ) : view === "representation" ? (
            <Politics dossier={dossier} {...(inside ? { district: inside.id } : {})} />
          ) : (
            <Overview campaign={campaign} dossier={dossier} />
          )}
        </Tabs>
      </div>
    </Screen>
  );
}

/** A state address the game carries no state for. */
export function NoSuchState() {
  return (
    <Screen title="No such state" eyebrow="State" screenClass="workspace" camera="us">
      <EmptyState icon="emptyRecord" title="This place is not a state the game carries">
        <Door href={place.nation()}>Back to the Nation</Door>
      </EmptyState>
    </Screen>
  );
}
