import type { ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { deferMatterPacket, formatDate, type BriefMatter } from "@admin/player-core";
import { Badge, Button, CardLink, Column, Icon, PressRow, Row, Surface, Text, Theme, isIconName, useMedia } from "@admin/ui";
import { useAuthorize } from "../review/use-authorize";
import { go } from "../shell/navigate";

const URGENCY = { hard: { status: "danger", word: "Due" }, soft: { status: "warning", word: "Soon" }, ambient: { status: "pending", word: "Ongoing" } } as const;

function clockWords(matter: BriefMatter): string | undefined {
  if (matter.clock) return `${matter.clock.left} of ${matter.clock.window} ${matter.clock.unit}${matter.clock.window === 1 ? "" : "s"} left · ${matter.clock.label}`;
  if (matter.due) return `Due ${formatDate(matter.due)}`;
  return matter.age;
}

/**
 * Puts a matter off from its row. A matter that stops time because its news is
 * new would otherwise hold Continue for good: only a turn makes it old, and a
 * held Continue spends none. Putting it off is a recorded answer.
 */
function PutOff({ campaign, matter, compact }: { readonly campaign: Campaign; readonly matter: BriefMatter; readonly compact: boolean }) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  if (!matter.putOff || !matter.putOffUntil) return null;
  const putOff = matter.putOff;
  const until = formatDate(matter.putOffUntil);
  const lines = [{ label: "Comes back", value: until }, ...(matter.holds ? [{ label: "Until then", value: "It no longer stops time." }] : [])];
  const take = () => void authorize(() => ({ packet: deferMatterPacket(campaign, putOff) }), { tier: "confirm", title: `Put off: ${matter.title}`, lines, verb: "Put off" }, { camera: "us" });
  return (
    <Column gap="2xs" alignItems="flex-start" flexShrink={1} minWidth={0} maxWidth="100%">
      <Button kind="secondary" size="compact" icon="schedule" disabled={busy} label={`Put off ${matter.title} until ${until}`} onPress={take}>
        {compact ? "Put off" : `Put off until ${until}`}
      </Button>
      {problem ? (
        <Text variant="caption" tone="danger">
          {problem}
        </Text>
      ) : null}
    </Column>
  );
}

/** The lead matter's box: the whole card opens it when it has a place to be answered. */
function Lead({ href, label, pad, children }: { readonly href: string | undefined; readonly label: string; readonly pad: "lg" | "xl"; readonly children: ReactNode }) {
  if (!href) {
    return (
      <Surface level="base" pad={pad} radius="sheet" elevated>
        {children}
      </Surface>
    );
  }
  return (
    <CardLink label={label} href={href} onPress={() => go(href)} level="base" pad={pad} radius="sheet" elevated>
      {children}
    </CardLink>
  );
}

/** The lead matter, set on the watch-floor surface so the most urgent thing on the desk reads as such. */
export function PriorityCard({ campaign, matter }: { readonly campaign: Campaign; readonly matter: BriefMatter }) {
  const media = useMedia();
  const urgency = URGENCY[matter.urgency];
  const clock = clockWords(matter);
  return (
    <Theme name="situation">
      <Lead href={matter.href} label={`Take up ${matter.title}`} pad={media.phone ? "lg" : "xl"}>
        <Column gap="md">
          <Row gap="sm" wrap>
            <Badge status={urgency.status} icon="escalate">
              {`Priority · ${urgency.word}`}
            </Badge>
            <Text variant="eyebrow" tone="secondary">
              {matter.kindLabel}
            </Text>
            {matter.holds ? (
              <Badge status="outline" icon="paused">
                Stops time
              </Badge>
            ) : null}
          </Row>
          <Row gap="md" top>
            <Icon name={isIconName(matter.kindIcon) ? matter.kindIcon : "decision"} size={32} tone="gold" weight="fill" />
            <Column gap="xs" flex={1}>
              <Text variant={media.phone ? "heading" : "display"} role="heading" aria-level={3}>
                {matter.title}
              </Text>
              <Text variant="body" tone="secondary">
                {matter.reason}
              </Text>
              {matter.holds ? (
                <Text variant="caption" tone="secondary">
                  Stops time: Continue stays off until you answer this or put it off.
                </Text>
              ) : null}
              {clock ? (
                <Text variant="label" tone="gold">
                  {clock}
                </Text>
              ) : null}
            </Column>
          </Row>
          {matter.href || matter.putOff ? (
            <Row gap="sm" wrap>
              {matter.href ? (
                <Button kind="primary" icon="review" onPress={() => go(matter.href!)}>
                  Take it up
                </Button>
              ) : null}
              <PutOff campaign={campaign} matter={matter} compact={false} />
            </Row>
          ) : null}
        </Column>
      </Lead>
    </Theme>
  );
}

const ROW = { padding: "md", borderTopColor: "borderColor", flexDirection: "row", alignItems: "center", gap: "md" } as const;

/** A queue line: the whole line opens the matter, or it sits still when there is nowhere to answer it. */
function QueueRow({ href, label, first, children }: { readonly href: string | undefined; readonly label: string; readonly first: boolean; readonly children: ReactNode }) {
  if (!href) {
    return (
      <Row {...ROW} borderTopWidth={first ? 0 : 1}>
        {children}
      </Row>
    );
  }
  return (
    <PressRow label={label} href={href} onPress={() => go(href)} {...ROW} borderTopWidth={first ? 0 : 1}>
      {children}
    </PressRow>
  );
}

/** Everything else waiting, ranked as the desk ranks it, each a door to where it is answered. */
export function MatterQueue({ campaign, matters }: { readonly campaign: Campaign; readonly matters: readonly BriefMatter[] }) {
  const media = useMedia();
  if (matters.length === 0) return null;
  return (
    <Column gap="sm">
      <Text variant="heading" role="heading" aria-level={3}>
        Also waiting
      </Text>
      {matters.some((matter) => matter.holds) ? (
        <Text variant="caption" tone="secondary">
          Stops time: Continue stays off until you answer that matter or put it off.
        </Text>
      ) : null}
      <Surface level="raised" pad="none">
        {matters.map((matter, i) => {
          const clock = clockWords(matter);
          return (
            <Row key={matter.id} borderTopColor="borderColor" borderTopWidth={i === 0 ? 0 : 1} alignItems="center" gap="sm" paddingRight={matter.putOff ? "md" : 0}>
              <Column flex={1} minWidth={0}>
                <QueueRow href={matter.href} label={`Open ${matter.title}`} first>
                  <Icon name={isIconName(matter.kindIcon) ? matter.kindIcon : "decision"} size={22} tone={matter.urgency === "hard" ? "danger" : "colorSecondary"} />
                  <Column flexGrow={1} flexShrink={1} flexBasis={0} minWidth={0} gap="2xs">
                    <Text variant="label" numberOfLines={3}>
                      {matter.title}
                    </Text>
                    <Row gap="sm" wrap>
                      <Text variant="caption" tone="secondary" numberOfLines={2} flexShrink={1}>
                        {matter.kindLabel}
                        {clock ? ` · ${clock}` : ""}
                      </Text>
                      {matter.holds ? <Badge status="warning" icon="paused">Stops time</Badge> : null}
                    </Row>
                  </Column>
                  {matter.href ? <Icon name="chevron" size={16} tone="colorTertiary" /> : null}
                </QueueRow>
              </Column>
              <PutOff campaign={campaign} matter={matter} compact={media.phone} />
            </Row>
          );
        })}
      </Surface>
    </Column>
  );
}

/** A day with nothing on the desk says so, and says how to spend it. */
export function QuietDay({ campaign }: { readonly campaign: Campaign }) {
  return (
    <Surface level="raised" pad="xl" radius="sheet">
      <Column gap="sm">
        <Row gap="sm">
          <Icon name="emptyInbox" size={24} tone="gold" />
          <Text variant="heading">Nothing waiting</Text>
        </Row>
        <Text variant="body" tone="secondary">
          Nothing needs you on {formatDate(campaign.calendar)}, and no deadline is close. Press Continue and time will move forward until something needs you.
        </Text>
      </Column>
    </Surface>
  );
}
