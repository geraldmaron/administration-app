import type { Campaign } from "@admin/engine";
import { localeMissions, type LocaleMissionView } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Column, Icon, Row, Surface, Tag, Text, type IconName, type InkRole, type TagTone } from "@admin/ui";
import { weeks } from "../format";

// The federal missions sent into one state and what became of each: still in
// force, waiting to take effect, stopped by a court while a suit runs, or run
// to its end. A mission a court paused stops its weekly bill and frees its
// forces, so the President reads it here before sending another.

type Status = LocaleMissionView["status"];

const LOOK: Readonly<Record<Status, { readonly icon: IconName; readonly tone: TagTone; readonly ink: InkRole; readonly word: string }>> = {
  "in force": { icon: "active", tone: "success", ink: "successInk", word: "In force" },
  "not yet in force": { icon: "pending", tone: "pending", ink: "colorSecondary", word: "Not yet in force" },
  "paused by a court": { icon: "paused", tone: "warning", ink: "warningInk", word: "Paused by a court" },
  ended: { icon: "statusExpired", tone: "outline", ink: "colorTertiary", word: "Ended" },
};

const sinceWords = (since: number, turn: number): string => (turn - since <= 0 ? "Ordered this week" : `Ordered ${weeks(turn - since)} ago`);

function MissionRow({ mission, turn }: { readonly mission: LocaleMissionView; readonly turn: number }) {
  const look = LOOK[mission.status];
  return (
    <Row gap="sm" wrap role="listitem" aria-label={`${mission.name}: ${look.word}. ${sinceWords(mission.since, turn)}`} paddingVertical="xs" borderTopWidth={1} borderTopColor="borderColor">
      <Icon name={look.icon} size={18} tone={look.ink} />
      <Column flex={1} minWidth={160} gap="2xs">
        <Text variant="label" tone={mission.status === "ended" ? "secondary" : "primary"}>
          {mission.name}
        </Text>
        <Text variant="caption" tone="secondary">
          {sinceWords(mission.since, turn)}
        </Text>
      </Column>
      <Tag tone={look.tone} icon={look.icon}>
        {look.word}
      </Tag>
    </Row>
  );
}

/** Every federal mission in the state with its standing; an empty state says so in a line rather than drawing an empty list. */
export function LiveMissions({ campaign, state }: { readonly campaign: Campaign; readonly state: StateId }) {
  const missions = localeMissions(campaign, state);
  const name = campaign.states[state]?.base.name ?? state;
  return (
    <Surface level="raised" pad="md" role="region" aria-label={`Federal missions in ${name}`}>
      <Column gap="xs">
        <Row gap="xs">
          <Icon name="shield" size={18} tone="gold" />
          <Text variant="title" role="heading" aria-level={3} flex={1}>
            Federal missions here
          </Text>
        </Row>
        {missions.length === 0 ? (
          <Text variant="caption" tone="secondary">{`No federal mission has been sent into ${name}.`}</Text>
        ) : (
          <Column role="list" aria-label={`Federal missions in ${name}`}>
            {missions.map((mission) => (
              <MissionRow key={`${mission.act}-${mission.since}`} mission={mission} turn={campaign.turn} />
            ))}
          </Column>
        )}
        {missions.some((mission) => mission.status === "paused by a court") ? (
          <Text variant="caption" tone="secondary">A paused mission has stopped. Its forces come home and its weekly bill ends. Sending them back takes a new order.</Text>
        ) : null}
      </Column>
    </Surface>
  );
}
