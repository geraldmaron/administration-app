import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import { Fit, fitOf, useMeasuredWidth } from "./Fit";
import { Zone, type ZoneName } from "./Zone";

/** Below this width of its own a pane tightens its padding, so a phone or an inspector keeps its measure. */
const PANE_BREAKS = { regular: 480, wide: 960 } as const;

export type PaneProps = {
  readonly title?: string;
  /** The locator over the title: the mode and place, or what the pane is measured against. */
  readonly kicker?: string;
  /** A small glyph beside the title; it labels, it never decorates. */
  readonly icon?: IconName;
  /** An emblem before the title: the seal of the body the pane speaks for. */
  readonly emblem?: ReactNode;
  /** A count beside the title: how many rows the pane holds. */
  readonly count?: number;
  /** Controls at the head's right: a help, a switch, a citation. */
  readonly actions?: ReactNode;
  /** One sentence under the title. */
  readonly line?: string;
  readonly zone?: ZoneName;
  /** No body padding, for a table or a map that runs to the pane's edges. */
  readonly flush?: boolean;
  /** The pane's character as a band across its top. */
  readonly band?: "accent" | "gold" | "danger" | "warning" | "success";
  readonly level?: "base" | "raised" | "sunken";
  readonly children?: ReactNode;
  readonly testID?: string;
  /** The anchor a link that names this part of the page lands on. */
  readonly id?: string;
};

/**
 * A lit plane on the desk: an optional kicker, title and actions, then the body.
 * The body is a `Fit`, so what sits inside adapts to the pane, not the window.
 */
export function Pane({ title, kicker, icon, emblem, count, actions, line, zone = "desk", flush, band, level = "base", children, testID, id }: PaneProps) {
  const [width, onLayout] = useMeasuredWidth();
  const pad = fitOf(width, PANE_BREAKS) === "compact" ? "lg" : "xl";
  const head = title || kicker || actions;
  return (
    <Zone zone={zone}>
      <Surface level={level} pad="none" role="region" aria-label={title ?? kicker} testID={testID} onLayout={onLayout} {...(id ? { id } : {})} {...(band ? { accentEdge: band } : {})}>
        {head ? (
          <Row gap="md" between wrap top paddingHorizontal={pad} paddingTop={pad === "xl" ? "lg" : "md"}>
            <Column gap="2xs" flexShrink={1} minWidth={0}>
              {kicker ? (
                <Text variant="eyebrow" tone="accent" numberOfLines={1}>
                  {kicker}
                </Text>
              ) : null}
              {title ? (
                <Row gap="sm" flexShrink={1}>
                  {emblem}
                  {!emblem && icon ? <Icon name={icon} size={18} tone="colorTertiary" /> : null}
                  <Text variant="heading" role="heading" aria-level={2} flexShrink={1}>
                    {title}
                  </Text>
                  {count !== undefined ? (
                    <Text variant="label" tone="tertiary" tabular>
                      {count}
                    </Text>
                  ) : null}
                </Row>
              ) : null}
            </Column>
            {actions ? (
              <Row gap="sm" wrap flexShrink={1} maxWidth="100%">
                {actions}
              </Row>
            ) : null}
          </Row>
        ) : null}
        <Fit paddingHorizontal={flush ? 0 : pad} paddingBottom={flush ? 0 : pad} paddingTop={flush ? 0 : head ? "md" : pad}>
          <Column gap="md">
            {line ? (
              <Text variant="body" tone="secondary">
                {line}
              </Text>
            ) : null}
            {children}
          </Column>
        </Fit>
      </Surface>
    </Zone>
  );
}

