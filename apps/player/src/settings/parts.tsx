import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { place } from "@admin/player-core";
import { Button, Column, Icon, Row, Surface, Text, type IconName } from "@admin/ui";
import { useCampaignState } from "../device/hooks";
import { BackButton } from "../shell/BackButton";

/**
 * The way back from a page that stands outside the game's frame: to where
 * the player came from, or to the title when the page was opened directly.
 */
export function ReturnButton({ label = "Back" }: { readonly label?: string }) {
  const router = useRouter();
  return (
    <Button kind="quiet" size="compact" icon="return" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
      {label}
    </Button>
  );
}

/**
 * The way back from a page that opens with or without a game in play: inside
 * the game's frame it is the shared Back, and with no game it is the
 * ReturnButton, which falls back to the title.
 */
export function PageBack({ label }: { readonly label?: string }) {
  const state = useCampaignState();
  if (state.status === "ready") return <BackButton parent={place.brief()} parentLabel="Brief" />;
  return <ReturnButton {...(label ? { label } : {})} />;
}

/** One group of settings under its glyph, title and what it changes. */
export function SettingsGroup({ icon, title, description, children, testID }: { readonly icon: IconName; readonly title: string; readonly description: string; readonly children: ReactNode; readonly testID?: string }) {
  return (
    <Surface level="raised" pad="lg" testID={testID} role="region" aria-label={title}>
      <Column gap="lg">
        <Column gap="2xs">
          <Row gap="sm">
            <Icon name={icon} size={22} tone="gold" />
            <Text variant="title" role="heading" aria-level={2}>
              {title}
            </Text>
          </Row>
          <Text variant="caption" tone="secondary">
            {description}
          </Text>
        </Column>
        {children}
      </Column>
    </Surface>
  );
}

/** A refusal or a confirmation in words, with its glyph; `role` decides whether it interrupts. */
export function Notice({ tone, children }: { readonly tone: "danger" | "info"; readonly children: ReactNode }) {
  return (
    <Surface level="raised" pad="md" accentEdge={tone === "danger" ? "danger" : "accent"} role={tone === "danger" ? "alert" : "status"}>
      <Row gap="sm" top>
        <Icon name={tone === "danger" ? "caution" : "info"} size={18} tone={tone === "danger" ? "danger" : "accent"} weight="bold" />
        <Text variant="body" flex={1}>
          {children}
        </Text>
      </Row>
    </Surface>
  );
}
