import { useState, type ReactNode } from "react";
import { Badge, Button, CardLink, Column, Icon, Row, Sticky, Text, useMedia, type IconName } from "@admin/ui";

import type { ViewTab } from "@admin/ui/nation";
import { go } from "../shell/navigate";

export { go };

/** A tab with nothing counted shows no count, so a zero never reads as work waiting. */
export function quiet<T extends string>(tab: ViewTab<T>): ViewTab<T> {
  if (tab.count !== 0) return tab;
  const { count: _zero, ...rest } = tab;
  return rest;
}

/** A row that is a door into another screen: what it is, a line of detail, and where it leads. The whole row is the one press target. */
export function Door({ href, title, detail, icon, badge, emblem }: { readonly href: string; readonly title: string; readonly detail?: string; readonly icon?: IconName; readonly badge?: ReactNode; readonly emblem?: ReactNode }) {
  return (
    <CardLink label={detail ? `${title}. ${detail}` : title} href={href} onPress={() => go(href)} pad="sm" radius="chip" flexDirection="row" alignItems="center" gap="sm" flexGrow={1} minHeight={44}>
      {emblem ?? (icon ? <Icon name={icon} size={20} tone="colorSecondary" /> : null)}
      <Column flex={1} minWidth={0} gap="2xs">
        <Text variant="label">{title}</Text>
        {detail ? (
          <Text variant="caption" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </Column>
      {badge}
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </CardLink>
  );
}

/**
 * One row of a list that opens something: the whole row is the press target,
 * never a name link inside it. A chosen row shows it with an accent edge and
 * says so to a screen reader.
 */
export function RowLink({ label, href, onPress, selected, children }: { readonly label: string; readonly href?: string; readonly onPress?: () => void; readonly selected?: boolean; readonly children: ReactNode }) {
  return (
    <CardLink href={href} label={label} onPress={onPress ?? (() => (href ? go(href) : undefined))} selected={selected} pad="sm" radius="chip" minHeight={44} justifyContent="center" {...(selected ? { accentEdge: "accent" as const } : {})}>
      {children}
    </CardLink>
  );
}

/** Words that stand in for an empty list, said as what would make it fill. */
export function Note({ children, tone = "secondary" }: { readonly children: ReactNode; readonly tone?: "secondary" | "warning" | "danger" | "tertiary" }) {
  return (
    <Text variant="caption" tone={tone}>
      {children}
    </Text>
  );
}

/** A staff projection, labeled as one, so it never reads as a recorded fact. */
export function ProjectionBadge() {
  return (
    <Badge status="outline" icon="pending">
      Your staff's estimate
    </Badge>
  );
}

/** A long list a page at a time, with how many are left said on the control. */
export function Paged<T>({ items, initial, noun, render, empty }: { readonly items: readonly T[]; readonly initial: number; readonly noun: string; readonly render: (item: T, index: number) => ReactNode; readonly empty?: string }) {
  const [shown, setShown] = useState(initial);
  if (items.length === 0) return empty ? <Note>{empty}</Note> : null;
  const left = items.length - shown;
  return (
    <Column gap="xs">
      {items.slice(0, shown).map(render)}
      {left > 0 ? (
        <Row>
          <Button kind="quiet" size="compact" icon="chevron" label={`Show ${Math.min(left, initial)} more ${noun}. ${left} not shown yet`} onPress={() => setShown((value) => value + initial)}>
            {`Show ${Math.min(left, initial)} more · ${left} left`}
          </Button>
        </Row>
      ) : null}
    </Column>
  );
}

/**
 * A long main column with a side rail that stays in view. The rail sits beside
 * the main column only where both fit, and stacks full-width below it
 * otherwise; a wrapping row with a growing child lets the rail squeeze the
 * main column to a sliver at in-between widths.
 */
export function MainAndRail({ main, rail }: { readonly main: ReactNode; readonly rail: ReactNode }) {
  const media = useMedia();
  if (!media.desktop) {
    return (
      <Column gap="xl" width="100%">
        {main}
        {rail}
      </Column>
    );
  }
  return (
    <Row gap="xl" top>
      <Column gap="xl" flexGrow={1} flexShrink={1} flexBasis={0} minWidth={0}>{main}</Column>
      <Sticky width={media.wide ? 420 : 340}>{rail}</Sticky>
    </Row>
  );
}
