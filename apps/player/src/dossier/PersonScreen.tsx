import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { formatDate, personFile, place, type PersonFile } from "@admin/player-core";
import { Column, Page, Text, useMedia } from "@admin/ui";
import { Monogram } from "@admin/ui/dossier";
import { ViewTabs, type ViewTab } from "@admin/ui/nation";
import { ActReceipt } from "../executive/ActReceipt";
import { useChairActs, type ChairActDone, type ChairActs } from "../executive/acts";
import { Problem } from "../executive/parts";
import { BackButton } from "../shell/BackButton";
import { useMarking } from "../shell/classification";
import { Attention, Marking, PersonHeader } from "./PersonHeader";
import { PersonNetwork, type NetworkSearch } from "./PersonNetwork";
import { PersonProfile } from "./PersonProfile";
import { CareerAndCounsel } from "./PersonRecord";
import { houseSeal, type PersonView } from "./person-view";

const TABS: readonly ViewTab<PersonView>[] = [
  { id: "overview", label: "Profile", icon: "subjectPerson" },
  { id: "network", label: "Connections", icon: "layerBlocs" },
  { id: "career", label: "Career and advice", icon: "record" },
];

type DeskProps = { readonly campaign: Campaign; readonly file: PersonFile; readonly view: PersonView; readonly onView: (view: PersonView) => void; readonly network: NetworkSearch; readonly onNetwork: (next: NetworkSearch) => void; readonly acts: ChairActs };

function PersonDesk({ campaign, file, view, onView, network, onNetwork, acts }: DeskProps) {
  const media = useMedia();
  return (
    <Page eyebrow={houseSeal(file.dossier.standing)?.name ?? file.role} icon="subjectPerson" title={file.person.name} emblem={<Monogram name={file.person.name} size={media.phone ? 48 : 72} />} actions={<Marking file={file} />}>
      <Column gap="md">
        <Problem text={acts.problem} />
        <PersonHeader campaign={campaign} file={file} acts={acts} asOf={formatDate(campaign.calendar)} />
        <Attention file={file} />
      </Column>
      <Column gap="lg">
        <ViewTabs<PersonView> label="Personnel record" tabs={TABS} selected={view} onSelect={onView} />
        {view === "overview" ? <PersonProfile campaign={campaign} file={file} /> : null}
        {view === "network" ? <PersonNetwork campaign={campaign} file={file} search={network} onSearch={onNetwork} /> : null}
        {view === "career" ? <CareerAndCounsel file={file} /> : null}
      </Column>
      {acts.sheet}
    </Page>
  );
}

export type PersonScreenProps = { readonly campaign: Campaign; readonly id: string; readonly view: PersonView; readonly onView: (view: PersonView) => void; readonly network: NetworkSearch; readonly onNetwork: (next: NetworkSearch) => void };

/** A person's dossier: who they are, how they read, who they know, what they have done, and the lever over their chair. */
export function PersonScreen({ campaign, id, view, onView, network, onNetwork }: PersonScreenProps) {
  const [done, setDone] = useState<ChairActDone | undefined>(undefined);
  const file = useMemo(() => personFile(campaign, id), [campaign, id]);
  const acts = useChairActs(campaign, setDone);
  // A personnel record carries no classification of its own in the engine, so the shell shows it unclassified.
  useMarking("UNCLASSIFIED");
  if (done) return <ActReceipt done={done} subject={file?.person.name ?? "Profile"} backLabel="Back to their profile" onBack={() => setDone(undefined)} />;
  if (!file) {
    return (
      <Page title="We couldn't find this person" eyebrow="Profile">
        <Text variant="body">This link doesn't match anyone in your game. It may be old or mistyped. You can find everyone who works with you on the Executive screen.</Text>
        <BackButton parent={place.washington()} parentLabel="Executive" />
      </Page>
    );
  }
  return <PersonDesk campaign={campaign} file={file} view={view} onView={onView} network={network} onNetwork={onNetwork} acts={acts} />;
}
