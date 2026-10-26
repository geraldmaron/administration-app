import { useState } from "react";
import { actHref, place, type CommitmentRow, type NationFile } from "@admin/player-core";
import { Pane, Tag, Button, Column, Empty, EntityLink, Icon, Pressable, Row, Text, type IconName } from "@admin/ui";
import { StepReading, Unread } from "@admin/ui/world";
import { BandFrame, CiteById, RELATIONSHIP_BANDS, SealOf, TopicLaw, go, stanceValence } from "../parts";
import { TieFlags } from "./Figures";
import { TARIFF_LAW } from "../law";

const COMMITMENT_WORDS: Readonly<Record<CommitmentRow["kind"], string>> = { aid: "Aid", arms: "Arms", deployment: "Troops sent", basing: "Bases", sustainment: "Supplies", program: "Program" };
const COMMITMENT_GLYPH: Readonly<Record<CommitmentRow["kind"], IconName>> = { aid: "instrumentAssistance", arms: "unitMissile", deployment: "unitGroundFormation", basing: "mapPin", sustainment: "unitTransportAircraft", program: "folder" };
const MEASURE_GLYPH: Readonly<Record<string, IconName>> = { tariff: "subjectTrade", sanctions: "instrumentEconomic", "asset-restriction": "locked", "export-control": "statusBlocked", embargo: "statusBlocked" };
/** The statute each kind of measure in force rests on, by registry id. */
const MEASURE_LAW: Readonly<Record<string, string>> = { tariff: "trade-act-301", sanctions: "ieepa", "asset-restriction": "ieepa", embargo: "ieepa" };

/** What the head of the file does not already say: the common aims and the threat read. */
function StandingReadings({ file }: { readonly file: NationFile }) {
  const { standing } = file;
  if (!standing.aims && !standing.threat) return null;
  return (
    <Pane title="What else our intelligence agencies see" icon="intel">
      <BandFrame title="Goals and threat" meaning={RELATIONSHIP_BANDS}>
        {standing.aims ? <StepReading icon="summit" label="Goals we share" lit={standing.aims.level} word={standing.aims.word} valence={stanceValence(standing.aims.stance)} /> : null}
        {standing.threat ? <StepReading icon="escalate" label="How much of a threat they are" lit={standing.threat.level} word={standing.threat.word} valence={stanceValence(standing.threat.stance)} /> : null}
      </BandFrame>
    </Pane>
  );
}

function Measures({ file }: { readonly file: NationFile }) {
  const { measures } = file.trade;
  return (
    <Pane title="Trade penalties in place" icon="subjectTrade" count={measures.length} actions={<TopicLaw topic="sanctions" />}>
      {measures.length === 0 ? (
        <Empty title="No trade penalties in place" detail="Neither government has a tariff, sanction, or embargo in force against the other." />
      ) : (
        <Column gap="sm" role="list" aria-label="Trade penalties in place">
          {measures.map((measure) => (
            <Row key={measure.id} gap="sm" wrap role="listitem" paddingVertical="xs" borderTopWidth={1} borderTopColor="borderColor">
              <Icon name={MEASURE_GLYPH[measure.kind] ?? "subjectTrade"} size={20} tone={measure.ours ? "accent" : "danger"} />
              <Column flex={1} minWidth={200} gap="2xs">
                <Text variant="label">
                  {measure.kindWord}
                  {measure.rateText ? ` of ${measure.rateText}` : ""} on {measure.sectorName.toLowerCase()}
                </Text>
                <Text variant="caption" tone="secondary">
                  {measure.ours ? "Yours" : "Their response"}, since {measure.since}
                </Text>
              </Column>
              {measure.ours && (TARIFF_LAW[measure.statute ?? ""] ?? MEASURE_LAW[measure.kind]) ? <CiteById id={(TARIFF_LAW[measure.statute ?? ""] ?? MEASURE_LAW[measure.kind])!} compact /> : null}
              {measure.ours ? (
                <Button kind="secondary" size="compact" icon="return" onPress={() => go(actHref(file.nation, { manage: measure.id }))}>
                  Lift it
                </Button>
              ) : null}
            </Row>
          ))}
        </Column>
      )}
    </Pane>
  );
}

function Commitments({ file }: { readonly file: NationFile }) {
  if (file.commitments.length === 0) return null;
  return (
    <Pane title="What you've promised them" icon="sign" count={file.commitments.length}>
      <Column gap="sm" role="list" aria-label="Promises to this country">
        {file.commitments.map((commitment) => (
          <Row key={commitment.id} gap="sm" top wrap role="listitem">
            <Icon name={COMMITMENT_GLYPH[commitment.kind]} size={20} tone="colorSecondary" />
            <Column flex={1} minWidth={200} gap="2xs">
              <Text variant="label">{COMMITMENT_WORDS[commitment.kind]}</Text>
              <Text variant="caption" tone="secondary">
                {commitment.rationale}
              </Text>
            </Column>
            <Tag tone={commitment.status === "active" ? "success" : commitment.status === "suspended" ? "warning" : "outline"}>{commitment.status === "wound-down" ? "Ended" : commitment.status === "suspended" ? "Paused" : commitment.status.charAt(0).toUpperCase() + commitment.status.slice(1)}</Tag>
          </Row>
        ))}
      </Column>
      <EntityLink label="National security commitments" icon="shield" href={place.security()} onPress={() => go(place.security())} />
    </Pane>
  );
}

const ORGS_FIRST = 8;

/** The bodies it sits in, each with its emblem, each a door to the body's screen. */
function Organizations({ file }: { readonly file: NationFile }) {
  const [all, setAll] = useState(false);
  const shown = all ? file.organizations : file.organizations.slice(0, ORGS_FIRST);
  return (
    <Pane title="Organizations" icon="building" count={file.organizations.length}>
      {file.organizations.length === 0 ? (
        <Text variant="body" tone="secondary">It isn't part of any group the game tracks.</Text>
      ) : (
        <Row gap="sm" wrap role="list" aria-label="Organizations">
          {shown.map((org) => (
            <Pressable key={org.id} href={org.href} onPress={() => go(org.href)} role="link" aria-label={`${org.name}. Open its page`} flexDirection="row" alignItems="center" gap="sm" padding="xs" paddingRight="md" borderRadius="pill" borderWidth={1} borderColor="borderColor">
              <SealOf id={org.id} name={org.name} size={32} />
              <Text variant="label">{org.name}</Text>
            </Pressable>
          ))}
        </Row>
      )}
      {file.organizations.length > ORGS_FIRST ? (
        <Button kind="quiet" size="compact" onPress={() => setAll((open) => !open)}>
          {all ? "Show fewer" : `Show all ${file.organizations.length}`}
        </Button>
      ) : null}
    </Pane>
  );
}

/** Standing both ways, rapport and the envoy, the measures in force, what has been promised, and who it keeps company with. */
export function DiplomacyView({ file }: { readonly file: NationFile }) {
  return (
    <Column gap="lg">
      <StandingReadings file={file} />
      <Pane title="Personal ties and our representative" icon="summit" actions={<TopicLaw topic="diplomacy" />}>
        {file.rapport ? <Text variant="body">{file.rapport}</Text> : null}
        <Row gap="sm" top>
          <SealOf id="INST-STATE" size={32} />
          <Text variant="body" flex={1}>
            {file.envoy.line}
          </Text>
        </Row>
      </Pane>
      <Measures file={file} />
      <Commitments file={file} />
      <Pane title="Its friends and rivals" icon="layerBlocs">
        {file.ties.length > 0 ? <TieFlags ties={file.ties} limit={999} /> : <Text variant="body" tone="secondary">No close friend or rival stands out.</Text>}
        <Unread>There may be ties between other countries that we don't know about.</Unread>
      </Pane>
      <Organizations file={file} />
    </Column>
  );
}
