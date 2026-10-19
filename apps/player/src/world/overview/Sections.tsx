import { place, trustWord, type InFlight, type Mover, type WarDeskRow } from "@admin/player-core";
import { Badge, Column, Icon, ReadingFrame, Row, Text, swatchEntries, type IconName } from "@admin/ui";
import { Panel, ShareBar, StateChip } from "@admin/ui/world";
import { CardTo, FlagOf, NationName, RowTo, stanceValence } from "../parts";

const FLIGHT: Readonly<Record<InFlight["kind"], { readonly icon: IconName; readonly word: string }>> = {
  operation: { icon: "pending", word: "Operation" },
  authorization: { icon: "subjectCapitol", word: "In Congress" },
  treaty: { icon: "sign", word: "Treaty" },
  retaliation: { icon: "caution", word: "Expected response" },
};

function WarLine({ war }: { readonly war: WarDeskRow }) {
  const title = war.sides.map((side) => side.name).join(" and ");
  return (
    <RowTo href={war.href} label={`Open the war between ${title}`} role="link" paddingVertical="sm" paddingHorizontal="xs" gap="xs">
      <Row gap="sm" wrap>
        <Row gap="2xs" aria-hidden>
          {war.sides.map((side) => (
            <FlagOf key={side.nation} nation={side.nation} name={side.name} height={20} />
          ))}
        </Row>
        <Text variant="label" flexShrink={1}>
          {title}
        </Text>
        {war.youAreParty ? <Badge status="danger" icon="conflict">You're fighting</Badge> : null}
        {war.joined > 0 ? (
          <Text variant="caption" tone="secondary">
            {war.joined} joined later
          </Text>
        ) : null}
      </Row>
      <Row gap="sm">
        <Text variant="caption" tone="secondary" width={72}>
          How hot
        </Text>
        <ShareBar value={war.intensity} valence={war.intensityText === "Intense" ? "bad" : "watch"} label={`${title}, how hot: ${war.intensityText}`} />
        <Text variant="caption" weight="strong" minWidth={72}>
          {war.intensityText}
        </Text>
      </Row>
      <Row gap="sm" between>
        <Text variant="caption" tone="secondary" flexShrink={1}>
          {[war.age, war.exposure].filter(Boolean).join(" ")}
        </Text>
        <Icon name="chevron" size={16} tone="colorTertiary" />
      </Row>
    </RowTo>
  );
}

const HEAT_KEY = swatchEntries([
  { key: "watch", label: "Held, simmering or hot, under 70 of 100", ink: "warningInk" },
  { key: "bad", label: "Intense, 70 of 100 or more", ink: "danger" },
]);

/** Every war on the board as a row: who, how hot, how long, and whether American forces stand in it. */
export function Conflicts({ wars }: { readonly wars: readonly WarDeskRow[] }) {
  if (wars.length === 0) return null;
  return (
    <Panel title="Wars" icon="conflict" count={wars.length} edge={wars.some((war) => war.youAreParty) ? "danger" : undefined}>
      <ReadingFrame
        title="How hot each war is"
        unit="Staff estimate of how heavy the fighting is"
        legend={HEAT_KEY}
        pressHint="Press a war to open it."
        help={{ meaning: "The bar fills as the fighting gets heavier. The word at the right is the reading. Held is under 15 of 100, Simmering is 15 to 39, Hot is 40 to 69 and Intense is 70 or more. The bar only places it." }}
      >
        <Column role="group" aria-label="Wars">
          {wars.map((war) => (
            <WarLine key={war.id} war={war} />
          ))}
        </Column>
      </ReadingFrame>
    </Panel>
  );
}

/** What the President already has in motion abroad, each a door to the place it is answered. */
export function Pending({ flight }: { readonly flight: readonly InFlight[] }) {
  if (flight.length === 0) return null;
  return (
    <Panel title="In progress abroad" icon="pending" count={flight.length}>
      <Column role="group" aria-label="In progress">
        {flight.map((item) => (
          <RowTo key={item.id} href={item.href} label={`Open ${item.title}`} flexDirection="row" alignItems="flex-start" gap="sm" paddingVertical="sm" paddingHorizontal="xs">
            <Icon name={FLIGHT[item.kind].icon} size={18} tone="colorSecondary" />
            <Column flexGrow={1} flexShrink={1} flexBasis={0} minWidth={0} gap="2xs">
              <Text variant="label">{item.title}</Text>
              <Text variant="caption" tone="secondary">
                {item.detail}
              </Text>
            </Column>
            <Badge status="outline">{FLIGHT[item.kind].word}</Badge>
          </RowTo>
        ))}
      </Column>
    </Panel>
  );
}

/** The governments that moved in the last four weeks, with what they did. */
export function Developments({ movers }: { readonly movers: readonly Mover[] }) {
  if (movers.length === 0) return null;
  return (
    <Panel title="What's new" icon="press" count={movers.length}>
      <Column role="group" aria-label="Countries that did something new">
        {movers.map((mover) => (
          <RowTo key={mover.nation} href={place.country(mover.nation)} label={`Open ${mover.name}'s file. ${mover.headline}`} gap="2xs" paddingVertical="sm" paddingHorizontal="xs">
            <Row gap="sm" wrap between>
              <NationName nation={mover.nation} name={mover.name} height={14} />
              {mover.stance && mover.stance !== "unread" ? <StateChip valence={stanceValence(mover.stance)}>{trustWord(mover.stance)}</StateChip> : null}
              <Text variant="caption" tone="tertiary">
                {mover.when}
              </Text>
            </Row>
            <Text variant="label" weight="regular">
              {mover.headline}
            </Text>
          </RowTo>
        ))}
      </Column>
    </Panel>
  );
}

/** The door from the World to the national-security desk. */
export function SecurityDoor() {
  return (
    <CardTo href={place.security()} label="Open national security" pad="lg" gap="sm">
      <Row gap="sm">
        <Icon name="shield" size={22} tone="gold" weight="fill" />
        <Text variant="title" role="heading" aria-level={2} flexGrow={1} flexShrink={1}>
          National security
        </Text>
        <Icon name="chevron" size={18} tone="colorTertiary" />
      </Row>
      <Text variant="body" tone="secondary">
        See what our intelligence agencies know, how ready the military is, and what powers you have.
      </Text>
    </CardTo>
  );
}
