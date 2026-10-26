import type { Campaign } from "@admin/engine";
import { POSTURE_WORDS, commandFile, place, type CommandFile, type CommandZoneForces } from "@admin/player-core";
import { Pane, Button, Column, Empty, Icon, Page, ReadingFrame, Row, Sheet, Text } from "@admin/ui";
import { BarRow, BarScale, StateChip, Unread } from "@admin/ui/world";
import { BackButton } from "../shell/BackButton";
import { ActsReceipt, useWorldActs } from "../world/acts";
import { AssetLine } from "../world/forces";
import { figureWords } from "../world/glyphs";
import { MapPanelSlot, NationChip, SealOf, TopicLaw } from "../world/parts";
import { CommandActPanel } from "./CommandActs";
import type { CommandAct } from "./params";

const POSTURE_VALENCE = { routine: "good", heightened: "watch", surge: "bad" } as const;
const pct = (share: number) => `${Math.round(share * 100)}%`;

function Header({ file }: { readonly file: CommandFile }) {
  const { card } = file;
  return (
    <Pane title="Alert level and commander" icon="shield" actions={<TopicLaw topic="commands" />}>
      <Row gap="sm" wrap>
        <StateChip valence={POSTURE_VALENCE[card.effective]} icon={card.effective === "routine" ? "favorable" : card.effective === "heightened" ? "caution" : "adverse"}>{POSTURE_WORDS[card.effective]}</StateChip>
        {card.effective !== card.ordered ? <Text variant="caption" tone="secondary">You ordered {card.ordered}. It stays at {card.effective} while it's in action.</Text> : null}
        {card.hasArea ? null : <Text variant="caption" tone="secondary">This command doesn't cover any part of the map.</Text>}
      </Row>
      <Row gap="lg" wrap>
        <Row gap="xs"><Icon name="subjectPerson" size={16} tone="colorSecondary" /><Text variant="label" weight="regular">{card.commander ? `${card.commander.name}${card.commander.acting ? ", acting commander" : ""}, ${card.commander.service}` : "No commander"}</Text></Row>
        <Row gap="xs"><Icon name="mapPin" size={16} tone="colorSecondary" /><Text variant="label" weight="regular">{file.headquarters}</Text></Row>
      </Row>
      <Text variant="body" tone="secondary">{card.mission}</Text>
      <ReadingFrame title="How well orders get through" unit="Share of an order that carries out, 0 to 100%" help={{ meaning: "The bar shows how much of an order you give carries out down this command's chain, from none to all. Removing commanders makes it slower. Green is 90% or more, amber is 70% to 90%, and red is under 70%." }}>
        <BarScale from="0%" to="100%" unit="Orders carried out" labelWidth={140} />
        <BarRow label="Orders get through" value={card.chain} figure={pct(card.chain)} valence={card.chain < 0.7 ? "bad" : card.chain < 0.9 ? "watch" : "good"} labelWidth={140} />
      </ReadingFrame>
      <Text variant="caption" tone="secondary">{file.chainBreaks.length > 0 ? file.chainBreaks.join(" ") : "Your orders reach this region in full."}</Text>
      {file.engagedAgainst.length + file.engagedToward.length > 0 ? <Text variant="body">In action{file.engagedAgainst.length > 0 ? ` against ${file.engagedAgainst.join(", ")}` : ""}{file.engagedToward.length > 0 ? `${file.engagedAgainst.length > 0 ? ". Forces are also committed toward " : ", with forces committed toward "}${file.engagedToward.join(", ")}` : ""}.</Text> : null}
      {file.reliefs > 0 ? <Text variant="caption" tone="warning">You've removed {file.reliefs} {file.reliefs === 1 ? "commander" : "commanders"} here. Each one makes your orders slower to get through.</Text> : null}
    </Pane>
  );
}

function ForceZone({ zone }: { readonly zone: CommandZoneForces }) {
  return (
    <Column gap="xs" paddingVertical="sm" borderTopWidth={1} borderTopColor="borderColor">
      <Text variant="label">{zone.name}</Text>
      {zone.rows.map((row) => (
        <Column key={row.id} gap="2xs">
          <Row gap="xs" top>
            <Icon name={row.precision === "installation" ? "mapPin" : "layerBlocs"} size={16} tone="colorSecondary" />
            <Text variant="caption" flex={1}>
              <Text variant="caption" weight="strong">{row.precision === "installation" ? row.label : "Somewhere in this zone"}</Text>: {row.what}{row.service ? `, ${row.service}` : ""}{row.band ? `, ${row.band}` : ""}{row.precision === "zone" ? ". Shown somewhere in the zone, not at an exact base." : ""}
            </Text>
          </Row>
          {row.asset ? <AssetLine unitType={row.asset.unitType} text={figureWords(row.asset.unitType, row.asset.count)} /> : null}
        </Column>
      ))}
    </Column>
  );
}

function Forces({ file }: { readonly file: CommandFile }) {
  return (
    <Pane title="Forces by zone and base" icon="mapPin" count={file.zones.length}>
      {file.zones.length === 0 ? <Unread>{`No US forces are recorded in ${file.card.abbr}'s area.`}</Unread> : file.zones.map((zone) => <ForceZone key={zone.zone} zone={zone} />)}
      {file.assignment.length > 0 ? (
        <ReadingFrame title="Forces from each service" unit={`Share of each service's total force that is under ${file.card.abbr}`} help={{ meaning: `Each bar is how much of that service's whole force is assigned to ${file.card.abbr}. Every bar uses the same scale, 0 to 100%.` }}>
          <BarScale from="0%" to="100%" unit="Of the service" labelWidth={140} />
          {file.assignment.map((row) => <BarRow key={row.branch} label={row.label} value={row.share} figure={pct(row.share)} labelWidth={140} />)}
        </ReadingFrame>
      ) : null}
    </Pane>
  );
}

function Area({ file }: { readonly file: CommandFile }) {
  return (
    <Pane title="Area it covers" icon="world" count={file.nations.length}>
      {file.nations.length === 0 ? <Text variant="body" tone="secondary">No country or sea is part of this command's area yet.</Text> : <Row gap="xs" wrap>{file.nations.map((nation) => <NationChip key={nation.id} nation={nation.id} name={nation.name} />)}</Row>}
      {file.amendments.map((row) => <Text key={`${row.nation}-${row.date}`} variant="caption" tone="secondary">{row.date}: {row.nation} moved from {row.from} to {row.to}. {row.rationale}</Text>)}
      {file.missions.length > 0 ? <Text variant="caption" tone="secondary">Ongoing missions: {file.missions.join("; ")}.</Text> : null}
    </Pane>
  );
}

const ACTS: readonly { readonly act: CommandAct; readonly label: string }[] = [
  { act: "posture", label: "Set alert level" },
  { act: "relieve", label: "Remove the commander" },
  { act: "reassign", label: "Move forces" },
  { act: "amend", label: "Move a country" },
];

/** One combatant command: its posture and chain, its area, its zones and anchors, and the four acts on it. */
export function CommandScreen({ campaign, id, action, onAction }: { readonly campaign: Campaign; readonly id: string; readonly action: CommandAct | undefined; readonly onAction: (action: CommandAct | undefined) => void }) {
  const file = commandFile(campaign, id);
  const acts = useWorldActs(campaign, file?.camera ?? "us");
  const open = (next: CommandAct | undefined) => {
    acts.dismiss();
    onAction(next);
  };
  if (!file) {
    return (
      <Page title="Command" eyebrow="World · security" icon="shield" actions={<BackButton parent={place.security()} parentLabel="Security" />}>
        <Empty title="We couldn't find a military command by that name" />
      </Page>
    );
  }
  return (
    <Page title={file.card.name} eyebrow={`World · security · ${file.card.abbr}`} icon="shield" lede={`${POSTURE_WORDS[file.card.effective]} alert${file.card.hasArea ? ` across ${file.nations.length} countries` : " on a worldwide mission"}.`} emblem={<SealOf id={file.card.id} name={file.card.name} size={64} label={`Emblem of ${file.card.name}`} />} wide>
      <Sheet open={action !== undefined} onClose={() => open(undefined)} wide eyebrow={file.card.abbr} title={ACTS.find((entry) => entry.act === action)?.label ?? "Command action"}>
        {acts.committed ? <ActsReceipt acts={{ ...acts, dismiss: () => open(undefined) }} again={`Back to ${file.card.abbr}`} /> : action ? <CommandActPanel key={action} act={action} campaign={campaign} file={file} acts={acts} onClose={() => open(undefined)} /> : null}
      </Sheet>
      <Row><BackButton parent={place.security()} parentLabel="Security" /></Row>
      <MapPanelSlot title={`${file.card.abbr}'s area`} lens="forces" marks="forces" camera={file.camera} {...(file.selection ? { selection: file.selection } : {})} note="Countries in this command's area are highlighted and shaded by how many US forces they host.">
        <Text variant="caption" tone="secondary">{file.nations.length} {file.nations.length === 1 ? "country" : "countries"} in its area. {file.zones.length} {file.zones.length === 1 ? "zone has" : "zones have"} forces.</Text>
      </MapPanelSlot>
      <Header file={file} />
      <Pane title="What you can do" icon="sign">
        <Row gap="sm" wrap>
          {ACTS.filter((entry) => file.card.hasArea || entry.act !== "amend").map((entry) => <Button key={entry.act} kind="secondary" size="compact" onPress={() => open(entry.act)}>{entry.label}</Button>)}
        </Row>
      </Pane>
      <Forces file={file} />
      <Area file={file} />
    </Page>
  );
}
