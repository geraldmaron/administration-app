import { formatDate } from "@admin/player-core";
import type { Campaign } from "@admin/engine";
import { Column, Row, Text, useMedia } from "@admin/ui";
import { ContinueNotice } from "./ContinueNotice";

/** The top of every working screen: where in the presidency this is, and why time is paused or what the last run did. Actions join it as they are built. */
export function SituationBar({ campaign, actions }: { readonly campaign: Campaign | undefined; readonly actions?: React.ReactNode }) {
  const media = useMedia();
  return (
    <Column>
      <Row gap="md" paddingHorizontal={media.phone ? "md" : "lg"} minHeight={media.phone ? "barPhone" : "bar"} between>
        <Row gap="sm">
          {campaign ? (
            <Column>
              <Text variant={media.phone ? "label" : "title"} weight="strong" numberOfLines={1}>
                {formatDate(campaign.calendar)}
              </Text>
              {!media.phone ? (
                <Text variant="caption" tone="secondary">
                  Week {campaign.turn} · President {campaign.founding.leader.name}
                </Text>
              ) : null}
            </Column>
          ) : (
            <Text variant="label" tone="secondary">
              No game open
            </Text>
          )}
        </Row>
        <Row gap="sm">{actions}</Row>
      </Row>
      {campaign ? <ContinueNotice campaign={campaign} /> : null}
    </Column>
  );
}
