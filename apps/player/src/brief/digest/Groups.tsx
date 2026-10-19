import { place, type ActGroup, type WireGroup } from "@admin/player-core";
import { Badge, Column, Icon, PressRow, Row, Text } from "@admin/ui";
import { go } from "../../shell/navigate";

/** The entries a week's record holds under one domain: each opens its Record entry, and says what it moved. */
export function ActGroups({ groups, empty }: { readonly groups: readonly ActGroup[]; readonly empty: string }) {
  if (groups.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        {empty}
      </Text>
    );
  }
  return (
    <Column gap="lg">
      {groups.map((group) => (
        <Column key={group.domain} gap="xs" role="list" aria-label={group.label}>
          <Row gap="sm" wrap>
            <Text variant="body" weight="medium" role="heading" aria-level={3}>
              {group.label}
            </Text>
            {group.helped > 0 ? <Badge status="success">{`${group.helped} helped`}</Badge> : null}
            {group.hurt > 0 ? <Badge status="danger">{`${group.hurt} cost you`}</Badge> : null}
          </Row>
          {group.rows.map((row) => (
            <PressRow key={row.id} label={`Open the Record entry: ${row.headline}`} href={place.event(row.id)} onPress={() => go(place.event(row.id))} padding="xs" borderRadius="chip" minHeight={44} flexDirection="row" alignItems="center" gap="sm">
              <Column flex={1} minWidth={0} gap="2xs">
                <Text variant="label">{row.headline}</Text>
                <Text variant="caption" tone="secondary">
                  {[row.actorWord, ...row.moves.map((move) => `${move.label} ${move.text}`)].join(" · ")}
                </Text>
              </Column>
              <Icon name="chevron" size={16} tone="colorTertiary" />
            </PressRow>
          ))}
        </Column>
      ))}
    </Column>
  );
}

/** What the wire filed, by kind; a story that names a government or a board opens it. */
export function WireGroups({ groups, empty }: { readonly groups: readonly WireGroup[]; readonly empty: string }) {
  if (groups.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        {empty}
      </Text>
    );
  }
  return (
    <Column gap="lg">
      {groups.map((group) => (
        <Column key={group.kind} gap="xs" role="list" aria-label={group.label}>
          <Text variant="body" weight="medium" role="heading" aria-level={3}>
            {group.label}
          </Text>
          {group.lines.map((line) =>
            line.href ? (
              <PressRow key={line.index} label={`Open ${line.subject ?? "it"}: ${line.headline}`} href={line.href!} onPress={() => go(line.href!)} padding="xs" borderRadius="chip" minHeight={44} flexDirection="row" alignItems="center" gap="sm">
                <Column flex={1} minWidth={0} gap="2xs">
                  <Text variant="label" weight="regular">{line.headline}</Text>
                  {line.subject ? <Text variant="caption" tone="secondary">{line.intelligence ? `${line.subject} · from intelligence` : line.subject}</Text> : null}
                </Column>
                <Icon name="chevron" size={16} tone="colorTertiary" />
              </PressRow>
            ) : (
              <Column key={line.index} padding="xs" role="listitem">
                <Text variant="label" weight="regular">{line.headline}</Text>
                {line.intelligence ? <Text variant="caption" tone="secondary">From intelligence</Text> : null}
              </Column>
            ),
          )}
        </Column>
      ))}
    </Column>
  );
}
