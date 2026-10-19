import { useMemo } from "react";
import { useRouter } from "expo-router";
import type { Campaign } from "@admin/engine";
import { formatRatio, personFile, place, type OverviewOffice } from "@admin/player-core";
import { Button, Column, Icon, Meter, ReadingFrame, Row, Surface, Text, markKeyEntries } from "@admin/ui";
import { termDoor } from "../handbook/term-door";
import { BandSteps, Monogram, StaffingBadge } from "@admin/ui/dossier";
import { DeliveryBar, deliveryKeyEntries } from "./DeliveryBar";
import { CardLabel, CardTo, InstitutionSeal } from "./parts";
import { QUALITY_METER, qualityOf, readingTone } from "./present";

function Delivery({ office, branch }: { readonly office: OverviewOffice; readonly branch: number }) {
  const { delivery } = office;
  if (!delivery) {
    return (
      <Row gap="xs">
        <Icon name="review" size={16} tone="colorTertiary" />
        <Text variant="caption" tone="secondary">
          {office.section === "independent" ? "Independent of the President, so its work isn't scored here" : "This office's work hasn't been measured"}
        </Text>
      </Row>
    );
  }
  return (
    <ReadingFrame title="Work done, compared with the whole government" unit="% of the requested work delivered" period="Now" legend={[...markKeyEntries([{ kind: "historical" }]), ...deliveryKeyEntries([delivery])]} help={{ meaning: "The top bar is how much of its work this office delivers, with a tick where the whole government averages. The bar under it shows what builds that figure and what is lost.", term: termDoor("policy-delivery", "policy delivery") }}>
      <Column gap="xs">
        <Meter label="Work done, compared with the whole government" value={delivery.quality} figure={formatRatio(delivery.quality)} tone={QUALITY_METER[qualityOf(delivery.quality)]} marks={[{ id: "branch", label: `Government average ${formatRatio(branch)}`, at: branch, kind: "historical" }]} />
        <DeliveryBar row={delivery} />
        <Text variant="caption" tone="secondary">
          {delivery.reason}
        </Text>
      </Column>
    </ReadingFrame>
  );
}

function Matters({ office }: { readonly office: OverviewOffice }) {
  const lines = [
    ...(office.services ? [`${office.services.good}/${office.services.total} services keeping up`] : []),
    ...(office.agencies > 0 ? [`${office.agencies} agencies · ${office.agenciesNeedingYou} need you`] : []),
    ...office.node.alerts.map((alert) => alert.text),
    ...(office.nominee ? [`${office.nominee.name} · ${office.nominee.stage}`] : []),
  ];
  if (lines.length === 0) return null;
  return (
    <Column gap="2xs">
      {lines.map((line) => (
        <Row key={line} gap="xs" top>
          <Icon name="caution" size={14} tone="warningInk" />
          <Text variant="caption" flex={1}>
            {line}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

/** Who holds the chair: their whole line opens their file. */
function Holder({ name, holder, title }: { readonly name: string | undefined; readonly holder: string | undefined; readonly title: string }) {
  const line = (
    <Row gap="sm">
      <Monogram name={name ?? "Vacant"} muted={!holder} size={44} />
      <Column flex={1}>
        <Text variant="label">{holder ? (name ?? "The leader") : "Nobody in the job"}</Text>
        <Text variant="caption" tone="secondary">
          {title}
        </Text>
      </Column>
      {holder ? <Icon name="chevron" size={18} tone="colorTertiary" /> : null}
    </Row>
  );
  if (!holder) return line;
  return (
    <CardTo href={place.person(holder)} label={`Open ${name ?? "the leader"}'s file`} pad="sm">
      {line}
    </CardTo>
  );
}

/** The selected office: its seal, who holds it, how it delivers against the branch, how its officer reads, and the doors on. */
export function OfficeInspector({ campaign, office, branch }: { readonly campaign: Campaign; readonly office: OverviewOffice; readonly branch: number }) {
  const router = useRouter();
  const { node } = office;
  const file = useMemo(() => (node.holder ? personFile(campaign, node.holder) : undefined), [campaign, node.holder]);
  return (
    <Surface level="raised" pad="lg" elevated role="region" aria-label={`Selected office: ${node.name}`}>
      <Column gap="md">
        <Row gap="md" top>
          <InstitutionSeal id={node.institution} name={node.name} size={72} />
          <Column flex={1} gap="xs">
            <CardLabel icon="building">Office details</CardLabel>
            <Text variant="title" role="heading" aria-level={3}>
              {node.name}
            </Text>
            <StaffingBadge staffing={node.staffing} />
          </Column>
        </Row>
        <Holder name={node.holderName} holder={node.holder} title={node.title} />
        <Delivery office={office} branch={branch} />
        {file ? (
          <Column gap="sm">
            <CardLabel icon="subjectPerson">How their staff rates them, on a four-step scale</CardLabel>
            {file.readings
              .filter((reading) => reading.key !== "charisma")
              .map((reading) => (
                <BandSteps key={reading.key} label={reading.label} lit={reading.band + 1} word={reading.word} tone={readingTone(reading)} />
              ))}
          </Column>
        ) : null}
        <Matters office={office} />
        <Row gap="sm" wrap>
          <Button kind="primary" iconAfter="open" onPress={() => router.push(node.href as never)}>
            Open the office
          </Button>
          {node.holder ? (
            <Button kind="quiet" icon="record" onPress={() => router.push(`${place.record()}?subject=${encodeURIComponent(`person:${node.holder}`)}` as never)}>
              Their Record
            </Button>
          ) : null}
        </Row>
      </Column>
    </Surface>
  );
}
