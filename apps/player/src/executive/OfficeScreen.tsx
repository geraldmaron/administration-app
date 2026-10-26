import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { formatDate, officeFile, personFile, place, type OfficeFile } from "@admin/player-core";
import { Tag, Button, Column, Icon, Page, Row, Surface, Text, useMedia } from "@admin/ui";
import { ViewTabs, type ViewTab } from "@admin/ui/nation";
import { Dossier, DossierSection, IdPlate, StaffingBadge } from "@admin/ui/dossier";
import { PersonFace } from "../dossier/PersonFace";
import { PersonReadings } from "../dossier/PersonReadings";
import { ActReceipt } from "./ActReceipt";
import { AgendaActs } from "./AgendaActs";
import { ChairActsPanel, FillChair } from "./ChairActs";
import { OfficeOrganization, OfficeRecord } from "./OfficeOrganization";
import { OfficeOverview } from "./OfficeOverview";
import { useChairActs, type ChairActDone, type ChairActs } from "./acts";
import { officeAttention, officeLede, type FillAct, type OfficeView } from "./office-view";
import { BackButton } from "../shell/BackButton";
import { CardTo, InstitutionSeal, LinkText, Problem } from "./parts";

function Attention({ file, onAction }: { readonly file: OfficeFile; readonly onAction: () => void }) {
  const reasons = officeAttention(file);
  if (reasons.length === 0) return null;
  return (
    <Surface level="raised" pad="md" accentEdge="warning" role="region" aria-label="Why this needs your attention">
      <Column gap="sm">
        <Row gap="sm">
          <Icon name="caution" size={20} tone="warningInk" />
          <Text variant="label">Why this needs your attention</Text>
        </Row>
        {reasons.map((reason) => (
          <Text key={reason} variant="body">
            {reason}
          </Text>
        ))}
        <Row>
          <Button kind="secondary" icon="appoint" onPress={onAction}>
            See what you can do
          </Button>
        </Row>
      </Column>
    </Surface>
  );
}

function Plate({ file, asOf }: { readonly file: OfficeFile; readonly asOf: string }) {
  const media = useMedia();
  const site = file.site.kind === "sourced" ? `Headquarters: ${file.site.name}, ${file.site.state === "DC" ? "Washington, D.C." : file.site.state}` : `Headquarters not on record. ${file.site.reason}`;
  return (
    <IdPlate
      title={file.name}
      reference={{ id: file.office.id, dated: asOf }}
      mark={<InstitutionSeal id={file.institution.id} name={file.name} size={media.phone ? 56 : 72} />}
      door={file.office.title === file.name ? undefined : file.office.title}
      tags={
        <>
          <StaffingBadge staffing={file.staffing} />
          {file.chips.map((chip) => (
            <Tag key={chip.key} tone="outline">
              {chip.label}
            </Tag>
          ))}
          {file.holder ? <LinkText href={place.person(file.holder)} label={`Open ${file.holderName ?? "the leader"}'s profile`}>{file.holderName ?? "The leader"}</LinkText> : null}
        </>
      }
      line={site}
    />
  );
}

function Leadership({ campaign, file }: { readonly campaign: Campaign; readonly file: OfficeFile }) {
  const holder = useMemo(() => (file.holder ? personFile(campaign, file.holder) : undefined), [campaign, file.holder]);
  if (!holder) return <Text variant="body" tone="secondary">Nobody is leading this office right now.</Text>;
  return (
    <DossierSection n={1} icon="subjectPerson" title="How the leader rates" note="What staff say about this person and how sure they are. This is kept separate from what the office has actually done.">
      <CardTo href={place.person(holder.person.id)} label={`Open ${holder.person.name}'s file`} pad="sm">
        <Row gap="sm">
          <PersonFace campaign={campaign} id={holder.person.id} name={holder.person.name} size={40} />
          <Text variant="label" flex={1}>
            {holder.person.name}
          </Text>
          <Icon name="chevron" size={18} tone="colorTertiary" />
        </Row>
      </CardTo>
      <PersonReadings readings={holder.readings} />
    </DossierSection>
  );
}

const TABS: readonly ViewTab<OfficeView>[] = [
  { id: "overview", label: "Overview", icon: "graph" },
  { id: "leadership", label: "Leadership", icon: "subjectPerson" },
  { id: "organization", label: "Organization", icon: "building" },
  { id: "actions", label: "Actions", icon: "appoint" },
  { id: "record", label: "Record", icon: "record" },
];

function Views({ view, onView }: { readonly view: OfficeView; readonly onView: (view: OfficeView) => void }) {
  return <ViewTabs<OfficeView> label="Office views" tabs={TABS} selected={view} onSelect={onView} />;
}

type DeskProps = { readonly campaign: Campaign; readonly file: OfficeFile; readonly view: OfficeView; readonly onView: (view: OfficeView) => void; readonly fill: FillAct | undefined; readonly onFill: (act: FillAct | undefined) => void; readonly acts: ChairActs };

function Body({ campaign, file, view, onFill, acts }: Omit<DeskProps, "fill" | "onView">) {
  if (view === "leadership") return <Leadership campaign={campaign} file={file} />;
  if (view === "organization") return <OfficeOrganization campaign={campaign} file={file} />;
  if (view === "record") return <OfficeRecord file={file} />;
  if (view === "actions") {
    return (
      <Column id="office-actions">
        <DossierSection n={1} icon="appoint" title="What you can do" note="Each choice shows what it changes from today before you confirm it, and the law behind it.">
          <AgendaActs campaign={campaign} proposals={file.proposals} offers={file.offers} factions={file.factions} acts={acts} />
          <ChairActsPanel campaign={campaign} file={file} acts={acts} onFill={onFill} />
          {file.proposals.length + file.offers.length + file.factions.length === 0 && file.lever === "none" ? <Text variant="body" tone="secondary">There's nothing you can do about this office today.</Text> : null}
        </DossierSection>
      </Column>
    );
  }
  return <OfficeOverview campaign={campaign} file={file} />;
}

function OfficeDesk({ campaign, file, view, onView, fill, onFill, acts }: DeskProps) {
  const media = useMedia();
  const asOf = formatDate(campaign.calendar);
  const seal = <InstitutionSeal id={file.institution.id} name={file.name} size={media.phone ? 56 : 88} labeled />;
  return (
    <Page title={fill ? `Fill the job: ${file.office.title}` : file.name} {...(fill ? { eyebrow: file.name === file.office.title ? "Office" : file.office.title, lede: officeLede(file), emblem: seal, actions: <BackButton parent={place.office(file.office.id)} parentLabel="Office" /> } : { bare: true })}>
      <Problem text={acts.problem} />
      {fill ? (
        <FillChair campaign={campaign} file={file} acts={acts} act={fill} onAct={onFill} />
      ) : (
        <Dossier kind="Office file">
          <Plate file={file} asOf={asOf} />
          <Attention file={file} onAction={() => onView("actions")} />
          <Views view={view} onView={onView} />
          <Body campaign={campaign} file={file} view={view} onFill={onFill} acts={acts} />
        </Dossier>
      )}
      {acts.sheet}
    </Page>
  );
}

export type OfficeScreenProps = { readonly campaign: Campaign; readonly id: string; readonly view: OfficeView; readonly onView: (view: OfficeView) => void; readonly fill: FillAct | undefined; readonly onFill: (act: FillAct | undefined) => void };

/** One office: its seal and headquarters, who holds it, how it runs against the branch, what waits from it, and every act on the chair compared before it is done. */
export function OfficeScreen({ campaign, id, view, onView, fill, onFill }: OfficeScreenProps) {
  const [done, setDone] = useState<ChairActDone | undefined>(undefined);
  const file = useMemo(() => officeFile(campaign, id), [campaign, id]);
  const acts = useChairActs(campaign, setDone);
  if (done) return <ActReceipt done={done} subject={file?.name ?? "Office"} backLabel="Back to the office" onBack={() => { setDone(undefined); onFill(undefined); }} />;
  if (!file) {
    return (
      <Page title="We couldn't find this office" eyebrow="Executive">
        <Text variant="body">This office isn't part of your government. It may come from an old link.</Text>
        <BackButton parent={place.washington()} parentLabel="Executive" />
      </Page>
    );
  }
  return <OfficeDesk campaign={campaign} file={file} view={view} onView={onView} fill={fill} onFill={onFill} acts={acts} />;
}
