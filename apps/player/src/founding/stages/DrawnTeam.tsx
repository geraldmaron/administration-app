import { chairRead, roleTitle } from "@admin/player-core";
import type { Person } from "@admin/world";
import { Button, CardGrid, Column, Row, Text } from "@admin/ui";
import { ChairReadBadge, ChairReadKey } from "../../executive/parts";
import { cabinetGroups } from "../cabinet-groups";
import { FactChip, PersonFace, Reading } from "../parts";
import { drawPlayableTeam } from "../seal";
import type { Founding } from "../useFounding";

function Member({ person, post }: { readonly person: Person; readonly post: string }) {
  return (
    <Row gap="sm" padding="sm" borderRadius="card" borderWidth={1} borderColor="borderColor" backgroundColor="surface">
      <PersonFace person={person} size={36} />
      <Column flex={1} minWidth={0} gap="2xs">
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {post}
        </Text>
        <Text variant="label" numberOfLines={1}>
          {person.name}
        </Text>
        <ChairReadBadge read={chairRead(person)} />
      </Column>
    </Row>
  );
}

/**
 * The team a quick start drew, shown before the oath so it is never a
 * surprise: the running mate first, then the Cabinet in the same groups the
 * Cabinet step uses. Drawing again or picking by hand is one press away.
 */
export function DrawnTeam({ founding }: { readonly founding: Founding }) {
  const { resolved } = founding;
  const mate = resolved.runningMates.find((row) => row.person.id === resolved.seated.runningMate)?.person;
  const holder = (role: string) => resolved.cabinetSlates[role]?.find((row) => row.person.id === resolved.seated.cabinet[role])?.person;
  const groups = cabinetGroups(resolved.seats.departments.map((role) => role as string));
  return (
    <Reading icon="appoint" title="Your team, picked at random">
      <Text variant="body" tone="secondary">
        Everyone here came from the same shortlists you'd pick from yourself, and nobody holds two jobs. Your White House staff were picked the same way.
      </Text>
      <Row gap="sm" wrap>
        <Button kind="secondary" icon="shuffle" onPress={() => founding.update((draft) => drawPlayableTeam(draft))} testID="founding-redraw">
          Pick again
        </Button>
        <Button
          kind="quiet"
          icon="appoint"
          onPress={() => {
            founding.update(({ quickStart: _quick, ...rest }) => rest);
            founding.goTo("ticket");
          }}
        >
          Change them myself
        </Button>
      </Row>
      {mate ? (
        <Column gap="xs">
          <Text variant="eyebrow" tone="secondary">
            Running mate
          </Text>
          <Row gap="md">
            <PersonFace person={mate} size={48} />
            <Column flex={1} minWidth={0} gap="xs">
              <Text variant="title">{mate.name}</Text>
              <Row gap="xs" wrap>
                <FactChip icon="subjectPerson">{`Age ${mate.age}`}</FactChip>
                {mate.birthplace ? <FactChip icon="mapPin">{mate.birthplace}</FactChip> : null}
              </Row>
            </Column>
          </Row>
        </Column>
      ) : null}
      <ChairReadKey />
      {groups.map((group) => (
        <Column key={group.key} gap="xs">
          <Text variant="eyebrow" tone="secondary">
            {group.title}
          </Text>
          <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 2 }} gap="xs">
            {group.roles.flatMap((role) => {
              const person = holder(role);
              return person ? [<Member key={role} person={person} post={roleTitle(role, resolved.seats.charter.roleTitles)} />] : [];
            })}
          </CardGrid>
        </Column>
      ))}
    </Reading>
  );
}
