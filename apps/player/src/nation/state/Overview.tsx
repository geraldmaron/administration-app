import type { Campaign } from "@admin/engine";
import { formatDate, formatRatio, place, type GovernorReading, type StateDossier } from "@admin/player-core";
import { Badge, Column, EntityLink, ReadingFrame, Row, Surface, Text, View } from "@admin/ui";
import { FigureBand, Track } from "@admin/ui/nation";
import { Panel } from "@admin/ui/world";
import { CompareChart } from "../../compare/CompareChart";
import { go } from "../../shell/navigate";
import { markEntry, toneKey } from "../keys";
import { leanMeaning } from "../format";
import { PeopleStrip } from "./People";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Governor({ governor, personId }: { readonly governor: GovernorReading; readonly personId: string }) {
  return (
    <Surface id="state-governor" level="raised" pad="md">
      <Row gap="md" wrap top>
        <View width={56} height={56} borderRadius="pill" backgroundColor={governor.party === "democrat" ? "partyDem" : governor.party === "republican" ? "partyRep" : "partyInd"} alignItems="center" justifyContent="center" aria-hidden>
          <Text variant="title" tone="inverse">
            {initials(governor.name)}
          </Text>
        </View>
        <Column flex={1} minWidth={180} gap="2xs">
          <Text variant="eyebrow" tone="secondary">
            Governor
          </Text>
          <EntityLink icon="subjectPerson" label={governor.name} href={place.person(personId)} onPress={() => go(place.person(personId))} />
          <Text variant="caption" tone="secondary">
            {governor.partyWord}
          </Text>
        </Column>
        <Column flex={1} minWidth={220} gap="2xs">
          <Row between>
            <Text variant="caption" tone="secondary">
              How they feel about you
            </Text>
            <Text variant="label" tone={governor.assents ? "success" : "danger"}>
              {governor.dispositionWord}
            </Text>
          </Row>
          <ReadingFrame title="How the governor feels about you" unit="From cold to warm" legend={[markEntry("yes", "Past this line, they say yes to requests"), ...toneKey({ good: "Will say yes", bad: "Will say no" })]} help={{ meaning: "The bar is how warmly the governor feels about you. When it reaches the line, they say yes to anything that needs their OK, and below it they say no." }}>
            <Track value={governor.disposition} tone={governor.assents ? "good" : "bad"} marks={[{ at: governor.assentFloor, label: "Says yes to requests", strong: true }]} label={`How they feel about you: ${governor.dispositionWord}`} />
          </ReadingFrame>
          <Text variant="caption" tone="tertiary">
            {governor.assents ? "Will say yes when you ask for something that needs their OK." : "Will say no to anything that needs their OK."}
          </Text>
        </Column>
      </Row>
    </Surface>
  );
}

/** The state's identity and its governor, ahead of any view. */
export function StateHead({ campaign, dossier }: { readonly campaign: Campaign; readonly dossier: StateDossier }) {
  const governorId = campaign.states[dossier.id]?.governor?.person;
  return (
    <Column gap="sm">
      <Row gap="sm" wrap>
        <Badge status="outline" icon="layerLean">
          {`Usual lean ${dossier.leanText}`}
        </Badge>
        {dossier.governor ? (
          <Badge status="info" icon="subjectCapitol">
            {`${dossier.governor.partyWord} governor`}
          </Badge>
        ) : null}
        <Badge status="pending" icon="dossier">
          {`${dossier.id} · ${formatDate(campaign.calendar)}`}
        </Badge>
        {dossier.capitol ? (
          <Text variant="caption" tone="secondary">
            Capital: {dossier.capitol.city}
          </Text>
        ) : null}
      </Row>
      <Text variant="caption" tone="secondary">
        {leanMeaning(dossier.leanText)}
      </Text>
      {dossier.governor && governorId ? <Governor governor={dossier.governor} personId={governorId} /> : null}
    </Column>
  );
}

/** The overview: the state's size, how approval here stands against the country, and who lives here. */
export function Overview({ campaign, dossier }: { readonly campaign: Campaign; readonly dossier: StateDossier }) {
  const approval = dossier.approval;
  return (
    <Column gap="lg">
      <FigureBand
        label="The state at a glance"
        items={[
          { icon: "subjectChamber", label: "House seats", value: String(dossier.house.seats) },
          { icon: "layerLean", label: "Usual party lean", value: dossier.leanText, note: leanMeaning(dossier.leanText) },
          { icon: "subjectPerson", label: "People", value: dossier.populationText },
          { icon: "economyGrowth", label: "Economy a year", value: dossier.grpText },
        ]}
      />
      {approval ? (
        <Panel title={`Approval in ${dossier.name} compared with the country`} icon="favorable" lede={approval.historyNote}>
          <ReadingFrame title="Approval here" unit="% of the state who approve" legend={[markEntry("half", "Half the state"), ...toneKey({ good: "Half or more approve", watch: "40% to 49%", bad: "Under 40%" })]} help={{ meaning: "The bar is the share of people in this state who approve of you. The line is half the state, where approval turns from a minority to a majority." }}>
            <Row gap="sm">
              <Text variant="figure" tone={approval.approval >= 0.5 ? "success" : approval.approval >= 0.4 ? "warning" : "danger"} tabular>
                {formatRatio(approval.approval)}
              </Text>
              <Track value={approval.approval} tone={approval.approval >= 0.5 ? "good" : approval.approval >= 0.4 ? "watch" : "bad"} marks={[{ at: 0.5, label: "Half the state", strong: true }]} label={`Approval here ${formatRatio(approval.approval)}. Half the state is 50%.`} />
            </Row>
          </ReadingFrame>
          {approval.divergence ? <Text variant="body">{approval.divergence}</Text> : null}
          <CompareChart campaign={campaign} metric="approval" subjects={[{ kind: "self" }, { kind: "state", id: dossier.id }]} window="term" title={`${dossier.name} and the country, week by week`} />
        </Panel>
      ) : null}
      <PeopleStrip campaign={campaign} dossier={dossier} />
    </Column>
  );
}
