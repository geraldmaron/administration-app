import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { nationFile, place, type NationFile } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Button, Column, Empty, Page, Row, Text, useMedia } from "@admin/ui";
import { ViewTabs } from "@admin/ui/nation";
import { BackButton } from "../../shell/BackButton";
import { FlagOf, go, MapPanelSlot, NationChip, splitColumn, stanceValence, TopicLaw } from "../parts";
import { COUNTRY_VIEWS, COUNTRY_VIEW_LABELS, countryActHref, type CountryView } from "../params";
import { CompareSection } from "./Compare";
import { DiplomacyView } from "./Diplomacy";
import { EconomyView } from "./Economy";
import { CountryHead, CountryIdentity } from "./Head";
import { COUNTRY_VIEW_GLYPH, Overview } from "./Overview";
import { ActivityView, IntelligenceView, SecurityView } from "./Views";
import { StateChip } from "@admin/ui/world";

export type NationScreenProps = {
  readonly campaign: Campaign;
  readonly id: NationId;
  readonly view: CountryView;
  readonly onView: (view: CountryView) => void;
  /** The goods the trade view has picked, kept in the address. */
  readonly sector?: string;
  readonly onSector: (sector: string | undefined) => void;
};

/** The geography slot: until the map lands, the government's ties and US presence as the same rows the relations lens reads. */
function Geography({ file }: { readonly file: NationFile }) {
  return (
    <MapPanelSlot title={`${file.name} on the map`} lens="relations" marks="forces" camera={`nation:${file.nation}`} selection={`nation:${file.nation}`} note="Each country is shaded by how it sees the United States, with US forces marked where they are stationed.">
      <Row gap="sm" wrap>
        <StateChip valence={stanceValence(file.boardStance)}>{file.standing.theirs?.trust.word ?? "Unknown"}</StateChip>
        <Text variant="caption" tone="secondary">
          {file.presence.length === 0 ? "No US forces here." : `US forces in ${file.presence.length} ${file.presence.length === 1 ? "location" : "locations"} here.`}
        </Text>
      </Row>
      {file.ties.length > 0 ? (
        <Row gap="xs" wrap>
          {file.ties.slice(0, 8).map((tie) => (
            <NationChip key={tie.nation} nation={tie.nation} name={tie.name} word={tie.kind === "ally" ? "friend" : "rival"} />
          ))}
        </Row>
      ) : null}
    </MapPanelSlot>
  );
}

function Body({ campaign, file, view, onView, sector, onSector }: { readonly campaign: Campaign; readonly file: NationFile } & Omit<NationScreenProps, "campaign" | "id">) {
  const media = useMedia();
  switch (view) {
    case "overview":
      return (
        <Column gap="lg">
          <Row gap="lg" top wrap={!media.desktop}>
            <Column {...splitColumn(media.desktop, 1)} gap="lg">
              <CountryHead campaign={campaign} file={file} onView={onView} />
            </Column>
            <Column {...splitColumn(media.desktop, 1)} gap="lg">
              <Geography file={file} />
            </Column>
          </Row>
          <Overview file={file} onView={onView} />
          <CompareSection campaign={campaign} nation={file.nation} name={file.name} />
        </Column>
      );
    case "diplomacy":
      return <DiplomacyView file={file} />;
    case "economy":
      return <EconomyView file={file} sector={sector} onSector={onSector} />;
    case "security":
      return <SecurityView campaign={campaign} file={file} />;
    case "intelligence":
      return <IntelligenceView file={file} />;
    case "activity":
      return <ActivityView campaign={campaign} file={file} />;
  }
}

/** A foreign government's file: who it is and how it stands with you, then the view chosen, and the way to act on it. */
export function NationScreen({ campaign, id, view, onView, sector, onSector }: NationScreenProps) {
  const file = useMemo(() => nationFile(campaign, id), [campaign, id]);
  if (!file) return <NoSuchNation />;
  const tabs = COUNTRY_VIEWS.map((entry) => {
    const count = entry === "diplomacy" ? file.trade.measures.length + file.commitments.length : entry === "activity" ? file.recent.length : 0;
    return { id: entry, label: COUNTRY_VIEW_LABELS[entry], icon: COUNTRY_VIEW_GLYPH[entry], ...(count > 0 ? { count } : {}) };
  });
  const act = (
    <Button kind="primary" icon="dispatch" onPress={() => go(countryActHref(id, {}, { view, ...(sector ? { sector } : {}) }))}>
      {`Take action on ${file.name}`}
    </Button>
  );
  return (
    <Page eyebrow="Foreign government" title={file.name} lede={file.atWarWith.length > 0 ? "At war with the United States." : file.standing.theirs ? `Their view of the United States is ${file.standing.theirs.trust.word.toLowerCase()}.` : "Your intelligence agencies cannot yet read this government's standing toward the United States."} emblem={<FlagOf nation={id} name={file.name} height={44} />} actions={<><BackButton parent={place.world()} parentLabel="World" />{act}<TopicLaw topic="diplomacy" /></>} wide>
      <CountryIdentity file={file} {...(view === "overview" ? {} : { onOverview: () => onView("overview") })} />
      <ViewTabs label={`Sections about ${file.name}`} tabs={tabs} selected={view} onSelect={onView} />
      <Body campaign={campaign} file={file} view={view} onView={onView} {...(sector ? { sector } : {})} onSector={onSector} />
    </Page>
  );
}

/** A government address the game carries no government for. */
export function NoSuchNation() {
  return (
    <Page title="Country not found" eyebrow="Foreign government" icon="world" actions={<BackButton parent={place.world()} parentLabel="World" />}>
      <Empty title="This isn't one of the countries in the game" />
    </Page>
  );
}
