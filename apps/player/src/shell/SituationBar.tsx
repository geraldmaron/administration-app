import { useWindowDimensions } from "react-native";
import { formatDate } from "@admin/player-core";
import type { Campaign } from "@admin/engine";
import { Column, Row, Text, View, useMedia } from "@admin/ui";
import { ContinueNotice } from "./ContinueNotice";
import { useAttention, type Attention } from "./useAttention";

// Below this width the full date and the bar's actions do not share a line, so the date gives up its month name and year first.
const SHORT_DATE_BELOW = 440;

const WORD = { clear: "Clear", waiting: "Waiting", held: "Held" } as const;
const PIP = { clear: "attentionClearPip", waiting: "attentionWaitingPip", held: "attentionHeldPip" } as const;

function shortDate(campaign: Campaign): string {
  const month = formatDate(campaign.calendar).split(" ")[0] ?? "";
  return `${campaign.calendar.day} ${month.slice(0, 3).toUpperCase()}`;
}

function detail(attention: Attention): string | undefined {
  // The full hold sentence lives on Continue; the bar names only how much holds the clock, so one caption line never truncates mid-thought.
  if (attention.state === "held") return `${attention.count} ${attention.count === 1 ? "matter holds" : "matters hold"} the clock`;
  if (attention.state === "waiting") return `${attention.matters} ${attention.matters === 1 ? "matter" : "matters"} waiting`;
  return undefined;
}

/** What the clock is waiting on, in a dot and a word so the color is never the only cue; the reason joins it where there is room. */
function AttentionPip({ attention, reason }: { readonly attention: Attention; readonly reason: boolean }) {
  const why = reason ? detail(attention) : undefined;
  return (
    <Row gap="xs" flexShrink={1} minWidth={0} role="status">
      <View width={8} height={8} borderRadius="pill" backgroundColor={PIP[attention.state]} aria-hidden />
      <Text variant="label" weight="strong" color={PIP[attention.state]}>
        {WORD[attention.state]}
      </Text>
      {why ? (
        <Text variant="caption" tone="secondary" numberOfLines={1} flexShrink={1}>
          {why}
        </Text>
      ) : null}
    </Row>
  );
}

/** The top of every working screen: where in the presidency this is, what the clock is waiting on, and why time is paused or what the last run did. Actions join it as they are built. */
export function SituationBar({ campaign, actions }: { readonly campaign: Campaign | undefined; readonly actions?: React.ReactNode }) {
  const media = useMedia();
  const { width } = useWindowDimensions();
  const attention = useAttention(campaign);
  return (
    <Column>
      <Row gap="md" paddingHorizontal={media.phone ? "md" : "lg"} minHeight={media.phone ? "barPhone" : "bar"} between>
        <Row gap="md" flexShrink={1} minWidth={0}>
          {campaign ? (
            <>
              <Column flexShrink={0}>
                <Text variant="clock" numberOfLines={1} aria-label={formatDate(campaign.calendar)}>
                  {media.phone && width < SHORT_DATE_BELOW ? shortDate(campaign) : formatDate(campaign.calendar)}
                </Text>
                {media.phone ? (
                  <AttentionPip attention={attention} reason={false} />
                ) : (
                  <Text variant="caption" tone="secondary">
                    Week {campaign.turn} · President {campaign.founding.leader.name}
                  </Text>
                )}
              </Column>
              {media.phone ? null : <AttentionPip attention={attention} reason />}
            </>
          ) : (
            <Text variant="label" tone="secondary">
              No game open
            </Text>
          )}
        </Row>
        <Row gap="sm" flexShrink={0}>{actions}</Row>
      </Row>
      {campaign ? <ContinueNotice campaign={campaign} /> : null}
    </Column>
  );
}
