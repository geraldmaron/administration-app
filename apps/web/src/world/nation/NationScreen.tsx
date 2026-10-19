import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { nationFile, place } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { EmptyState, Tabs, buttonClass, type TabSpec } from "@admin/ui-web";
import { MapView } from "../../map/MapView";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import { ExplainerNote } from "../../shell/ExplainerNote";
import "../../nation/state/state.css";
import { CountryHead, CountryIdentity } from "./CountryHead";
import { EconomyView } from "./CountryEconomy";
import { SecurityView } from "./CountryForces";
import { CountryWarPowers } from "./CountryWarPowers";
import { ActivityView, IntelligenceView } from "./CountryMoves";
import { DiplomacyView } from "./Relationship";
import { Overview } from "./Overview";
import { COUNTRY_VIEW_LABELS } from "./country-views";
import { COUNTRY_VIEWS, countryActHref, isCountryView, type CountryView } from "./country-search";
import "./nation.css";
import "./country.css";

export type NationScreenProps = {
  readonly campaign: Campaign;
  readonly id: NationId;
  readonly view?: CountryView;
  readonly onView?: (view: CountryView) => void;
  /** The goods the trade view has picked, kept in the address. */
  readonly sector?: string;
  readonly onSector?: (sector: string | undefined) => void;
};

const noop = () => undefined;

/** A country's selected workspace, with full identity and geographic evidence on Overview. */
export function NationScreen({ campaign, id, view = "overview", onView = noop, sector, onSector = noop }: NationScreenProps) {
  const file = useMemo(() => nationFile(campaign, id), [campaign, id]);
  if (!file) return <NoSuchNation />;
  const tabs: readonly TabSpec[] = COUNTRY_VIEWS.map((entry) => ({
    id: entry,
    label: COUNTRY_VIEW_LABELS[entry],
    ...(entry === "diplomacy" && file.trade.measures.length + file.commitments.length > 0 ? { count: file.trade.measures.length + file.commitments.length } : entry === "activity" && file.recent.length > 0 ? { count: file.recent.length } : {}),
  }));
  return (
    <Screen
      title={file.name}
      eyebrow="Government"
      lede={`${file.leader.government}. ${file.posture.posture.word}.`}
      screenClass="workspace"
      camera="keep"
      footer={
        <Door href={countryActHref(id, {}, { view, ...(sector ? { sector } : {}) })} className={buttonClass("primary")}>
          Act on {file.name}
        </Door>
      }
    >
      <div className="country">
        {view !== "overview" ? <CountryIdentity file={file} onOverview={() => onView("overview")} /> : null}
        <Tabs label={`Views of ${file.name}`} tabs={tabs} selected={view} onSelect={(next) => (isCountryView(next) ? onView(next) : undefined)}>
          {view === "overview" ? <>
            <div className="country-context">
              <CountryHead campaign={campaign} file={file} onView={onView} />
              <MapView title={`${file.name}: geography and US presence`} lens="relations" marks="forces" camera={`nation:${id}`} selection={`nation:${id}`} note="Government relations with the United States; force markers open their location." height={260} />
            </div>
            <Overview file={file} onView={onView} />
          </> : null}
          {view === "diplomacy" ? <><DiplomacyView file={file} /><ExplainerNote id="trust-in-us" /></> : null}
          {view === "economy" ? <EconomyView file={file} sector={sector} onSector={onSector} /> : null}
          {view === "security" ? (
            <>
              <CountryWarPowers campaign={campaign} id={id} name={file.name} />
              <SecurityView file={file} />
            </>
          ) : null}
          {view === "intelligence" ? <IntelligenceView file={file} /> : null}
          {view === "activity" ? <ActivityView campaign={campaign} file={file} /> : null}
        </Tabs>
      </div>
    </Screen>
  );
}

/** A government address the game carries no government for, or the President's own country, which has the Nation instead. */
export function NoSuchNation() {
  return (
    <Screen title="No such government" eyebrow="Government" screenClass="workspace" camera="keep">
      <EmptyState icon="emptyRecord" title="This is not a government the game carries">
        <Door href={place.world()}>Back to the World</Door>
      </EmptyState>
    </Screen>
  );
}
