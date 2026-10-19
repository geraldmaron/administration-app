import { View } from "@tamagui/core";
import { Theme } from "@tamagui/core";
import { Badge } from "../primitives/Badge";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { Seal, type SealProps } from "../seals/Seal";

export type WorkspaceStripProps = {
  /** An authored emblem; never official artwork. */
  readonly seal: SealProps["spec"];
  readonly workspace: string;
  readonly office: string;
  /** Shown only in a development build, so a player's build never carries it. */
  readonly development: boolean;
};

/** A slim, fixed mark naming the workspace and the President's office. */
export function WorkspaceStrip({ seal, workspace, office, development }: WorkspaceStripProps) {
  return (
    <Theme name="chrome">
      <View backgroundColor="background" borderBottomWidth={1} borderBottomColor="borderColor" paddingHorizontal="md" paddingVertical="2xs">
        <Row gap="sm" between>
          <Row gap="sm" flex={1}>
            <Seal spec={seal} size={20} />
            <Text variant="caption" weight="strong" numberOfLines={1} flexShrink={1}>
              {workspace}
              <Text variant="caption" tone="secondary">
                {" · "}
                {office}
              </Text>
            </Text>
          </Row>
          {development ? <Badge status="warning">DEVELOPMENT</Badge> : null}
        </Row>
      </View>
    </Theme>
  );
}
