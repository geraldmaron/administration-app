import { usePathname } from "expo-router";
import type { Campaign } from "@admin/engine";
import { pendingConversations, presentedItems } from "@admin/player-core";
import { Button, Icon, Row, Surface, Text } from "@admin/ui";
import { usePreferences } from "../device/hooks";
import { continueHold } from "./ContinueButton";
import { say, useSaid } from "./said";

/**
 * Under the bar, away from the Brief: what the last run did when it left the
 * President where they were, until they dismiss it. The Brief says it itself.
 */
export function ContinueNotice({ campaign }: { readonly campaign: Campaign }) {
  const pathname = usePathname();
  const said = useSaid();
  const { preferences } = usePreferences();
  if (pathname === "/brief") return null;
  const hold = continueHold(pendingConversations(campaign).length, presentedItems(campaign, preferences.attentionByKind).map((item) => item.title));
  // A held clock is said by the bar's own control beside Continue; this strip only reports what the last run did.
  if (hold) return null;
  if (!said) return null;
  return (
    <Surface level="raised" pad="sm" accentEdge="accent" role="status">
      <Row gap="sm" wrap top>
        <Icon name="schedule" size={18} tone="colorSecondary" />
        <Text variant="label" weight="regular" flex={1} minWidth={220}>{said}</Text>
        <Button kind="quiet" size="compact" icon="close" onPress={() => say("")}>Dismiss</Button>
      </Row>
    </Surface>
  );
}
