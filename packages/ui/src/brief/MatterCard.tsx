import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { CardLink } from "../primitives/CardLink";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Tag } from "../primitives/Tag";
import { Text } from "../primitives/Text";
import { Deadline, type DeadlineProps } from "./Deadline";

/** How hard the matter's clock is: a hard deadline, a soft one, or a standing matter with none. */
export type MatterPriority = "due" | "soon" | "ongoing";

const PRIORITY = { due: { tone: "danger", word: "Due" }, soon: { tone: "warning", word: "Soon" }, ongoing: { tone: "pending", word: "Ongoing" } } as const;

export type MatterPerson = {
  readonly name: string;
  readonly role?: string;
  /** The person's face, drawn by the app: a portrait or a monogram. */
  readonly face?: ReactNode;
};

export type MatterCardProps = {
  readonly priority: MatterPriority;
  readonly kind: string;
  readonly kindIcon?: IconName;
  readonly title: string;
  readonly summary?: string;
  /** Stated as a tag, never left to color. */
  readonly holdsTime?: boolean;
  /** Why it holds time, in a sentence under the summary. */
  readonly holdsNote?: string;
  readonly person?: MatterPerson;
  readonly deadline?: DeadlineProps;
  /** The way in and anything beside it: the buttons that take the matter up or put it off. */
  readonly actions?: ReactNode;
  /** With these the whole card opens the matter. */
  readonly href?: string;
  readonly onOpen?: () => void;
  /** What a screen reader says for the card when it is a door. */
  readonly label?: string;
  readonly headingLevel?: number;
  readonly pad?: "lg" | "xl";
};

function Who({ person }: { readonly person: MatterPerson }) {
  return (
    <Row gap="sm" alignItems="center" role="group" aria-label={`Brought by ${person.name}`}>
      {person.face}
      <Column minWidth={0}>
        <Text variant="label">{person.name}</Text>
        {person.role ? (
          <Text variant="caption" tone="secondary">
            {person.role}
          </Text>
        ) : null}
      </Column>
    </Row>
  );
}

function Body(props: MatterCardProps) {
  const { priority, kind, kindIcon, title, summary, holdsTime, holdsNote, person, deadline, actions, headingLevel = 3 } = props;
  const { tone, word } = PRIORITY[priority];
  return (
    <Column gap="md">
      <Row gap="sm" wrap>
        <Tag tone={tone} icon="escalate">
          {`Priority · ${word}`}
        </Tag>
        <Text variant="eyebrow" tone="secondary">
          {kind}
        </Text>
        {holdsTime ? (
          <Tag tone="outline" icon="paused">
            Stops time
          </Tag>
        ) : null}
      </Row>
      <Row gap="md" top>
        {kindIcon ? <Icon name={kindIcon} size={32} tone="gold" weight="fill" /> : null}
        <Column gap="xs" flex={1} minWidth={0}>
          <Text variant="headline" role="heading" aria-level={headingLevel}>
            {title}
          </Text>
          {summary ? (
            <Text variant="body" tone="secondary">
              {summary}
            </Text>
          ) : null}
          {holdsTime && holdsNote ? (
            <Text variant="caption" tone="secondary">
              {holdsNote}
            </Text>
          ) : null}
        </Column>
      </Row>
      {deadline ? <Deadline {...deadline} /> : null}
      {person ? <Who person={person} /> : null}
      {actions ? (
        <Row gap="sm" wrap>
          {actions}
        </Row>
      ) : null}
    </Column>
  );
}

/**
 * A matter story first: how pressing it is, what it is, who brought it, the
 * clock it runs on and the way in. With an `href` the whole card is the door.
 */
export function MatterCard(props: MatterCardProps) {
  const { href, onOpen, label, pad = "lg" } = props;
  if (!href || !onOpen) {
    return (
      <Surface level="base" pad={pad} radius="sheet" elevated>
        <Body {...props} />
      </Surface>
    );
  }
  return (
    <CardLink label={label ?? `Take up ${props.title}`} href={href} onPress={onOpen} level="base" pad={pad} radius="sheet" elevated>
      <Body {...props} />
    </CardLink>
  );
}
