import type { ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Surface } from "../primitives/Surface";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { useAnchor } from "./anchors";
import { pageGutter } from "./gutter";
import { Zone } from "./Zone";

// How a long working page tells the reader where one area ends and the next
// begins. A section heading, a card heading and a table caption once wore the
// same type on the same bordered box, so there are three levels, each with a
// look no other level shares:
//
//   Section  the area. A level-two heading in the heading face with its icon
//            beside it in tertiary ink, one plain helper sentence, and the same
//            space above every one. It draws no box and no rule: space alone
//            separates areas.
//   Card     a unit of work inside a section, on a raised panel. Its title is a
//            level-three heading in the title face, smaller than a section's.
//   Stage    the one area that is a place rather than a list: a full-bleed
//            band on the theater plane (a map, a board) that breaks the page's
//            rhythm on purpose.
//
// SectionNav names the sections in order and lights the one on screen. A
// screen adopts the pattern by giving each area a Section with a stable id,
// putting its panels in Cards, and listing the ids in one SectionNav.

/** The id a section's heading carries, for links that land on it and for the region's name. */
export function sectionTitleId(id: string): string {
  return `${id}-title`;
}

export type SectionHeaderProps = {
  readonly id: string;
  readonly title: string;
  readonly icon: IconName;
  /** One plain sentence: what this area is for. */
  readonly helper?: string;
  /** Controls that act on the whole section, set to the right of the heading. */
  readonly actions?: ReactNode;
  /** How many things in this section are waiting, marked beside the heading so the eye finds the part of the page that needs it. */
  readonly waiting?: number;
};

/** The heading block a Section and a Stage share, so the two read as the same level. */
/** The count beside a heading: how many things in the section are waiting. */
function WaitingMark({ count }: { readonly count: number }) {
  return (
    <View minWidth={24} height={24} paddingHorizontal="xs" borderRadius="pill" backgroundColor="warningFill" borderWidth={1} borderColor="warningInk" alignItems="center" justifyContent="center" role="img" aria-label={`${count} waiting`}>
      <Text variant="caption" weight="strong" tone="warning" tabular>
        {count}
      </Text>
    </View>
  );
}

export function SectionHeader({ id, title, icon, helper, actions, waiting }: SectionHeaderProps) {
  const media = useMedia();
  return (
    <Row gap="md" top wrap>
      <Row gap="md" top flexGrow={1} flexShrink={1} flexBasis={320} minWidth={0}>
        <Column gap="2xs" flex={1} minWidth={0}>
          <Row gap="sm">
            <Icon name={icon} size={18} tone="colorTertiary" />
            <Text variant="heading" role="heading" aria-level={2} id={sectionTitleId(id)} flexShrink={1}>
              {title}
            </Text>
            {waiting ? <WaitingMark count={waiting} /> : null}
          </Row>
          {helper ? (
            <Text variant="body" tone="secondary" maxWidth={760}>
              {helper}
            </Text>
          ) : null}
        </Column>
      </Row>
      {actions && media.desktop ? (
        <Row gap="sm" wrap flexShrink={1} maxWidth="100%">
          {actions}
        </Row>
      ) : null}
      {actions && !media.desktop ? (
        // Below the desktop width the controls take their own full line, so a row of chips wraps instead of pushing past the edge.
        <View width="100%">{actions}</View>
      ) : null}
    </Row>
  );
}

export type SectionProps = SectionHeaderProps & { readonly children: ReactNode };

/** The anchor a section takes when its screen names none: its title, lowercased and hyphenated. */
export function sectionSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * One area of a long page. The id is the anchor a SectionNav chip and a deep
 * link land on; a section no chip or link names may leave it to its title.
 */
export function Section({ children, id, ...rest }: Omit<SectionProps, "id"> & { readonly id?: string }) {
  const header = { ...rest, id: id ?? sectionSlug(rest.title) };
  const anchor = useAnchor(header.id);
  return (
    <View ref={anchor as never} id={header.id} role="region" aria-labelledby={sectionTitleId(header.id)} paddingTop="2xl" gap="lg">
      <SectionHeader {...header} />
      {children}
    </View>
  );
}

/**
 * The page's stage: a section drawn as a band from edge to edge of the page on
 * the theater plane, for the one area that is a place (the map) rather than a
 * list. It keeps the section's heading so it still reads as a section.
 */
export function Stage({ children, ...header }: SectionProps) {
  const media = useMedia();
  const gutter = pageGutter(media);
  const anchor = useAnchor(header.id);
  return (
    <Zone zone="theater">
      <View ref={anchor as never} id={header.id} role="region" aria-labelledby={sectionTitleId(header.id)} marginHorizontal={-gutter} paddingHorizontal={gutter} paddingTop="lg" paddingBottom="xl" gap="lg" backgroundColor="background">
        <SectionHeader {...header} />
        {children}
      </View>
    </Zone>
  );
}

export type CardProps = {
  readonly title: string;
  /** A small glyph beside the title; the section owns the big one. */
  readonly icon?: IconName;
  readonly helper?: string | undefined;
  readonly actions?: ReactNode;
  /** The card's contextual help (a HelpButton or LawHelp), set last in the heading row after the actions. */
  readonly help?: ReactNode;
  readonly children?: ReactNode;
  /** Raised is a panel of work; sunken is a well for a chart or a table. */
  readonly level?: "raised" | "base" | "sunken";
  readonly edge?: "accent" | "gold" | "danger" | "warning" | "success";
  readonly id?: string;
};

/**
 * A unit of work inside a section, on a raised panel. Its title is a level-three
 * heading in the title face, so it never looks like the section it sits in.
 */
export function Card({ title, icon, helper, actions, help, children, level = "raised", edge, id }: CardProps) {
  return (
    <Surface level={level} pad="lg" flexGrow={1} {...(edge ? { accentEdge: edge } : {})} role="region" aria-label={title} {...(id ? { id } : {})}>
      <Column gap="md" flexGrow={1}>
        <Row between gap="sm" wrap>
          <Row gap="xs" flex={1} minWidth={200}>
            {icon ? <Icon name={icon} size={18} tone="colorSecondary" /> : null}
            <Text variant="title" role="heading" aria-level={3} flex={1}>
              {title}
            </Text>
          </Row>
          {actions || help ? (
            <Row gap="xs">
              {actions}
              {help}
            </Row>
          ) : null}
        </Row>
        {helper ? (
          <Text variant="label" tone="secondary" weight="regular">
            {helper}
          </Text>
        ) : null}
        {children}
      </Column>
    </Surface>
  );
}
