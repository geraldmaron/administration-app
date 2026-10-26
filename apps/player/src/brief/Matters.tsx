import type { ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { deferMatterPacket, formatDate, type BriefMatter } from "@admin/player-core";
import { Button, Column, Icon, MatterCard, PressRow, Row, Surface, Tag, Text, Theme, isIconName, useMedia, type DeadlineProps } from "@admin/ui";
import { useAuthorize } from "../review/use-authorize";
import { go } from "../shell/navigate";

/** The deadline in the order a President weighs it: the game date, the days left, and how much of the window is gone. */
function clockWords(matter: BriefMatter): string | undefined {
  const { clock } = matter;
  if (clock) {
    const unit = `${clock.unit}${clock.left === 1 ? "" : "s"}`;
    const used = clock.window > 0 ? ` · ${Math.round(((clock.window - clock.left) / clock.window) * 100)}% of ${clock.window} ${clock.unit}${clock.window === 1 ? "" : "s"} used` : "";
    const due = clock.due ?? matter.due;
    return `${due ? `Due ${formatDate(due)} · ` : ""}${clock.left} ${unit} left${used} · ${clock.label}`;
  }
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

const PRIORITY = { hard: "due", soft: "soon", ambient: "ongoing" } as const;

/** The matter's clock as a Deadline: the date and days left with the window used, or the date or age alone when there is no window. */
function deadlineOf(matter: BriefMatter): DeadlineProps | undefined {
  const { clock } = matter;
  const due = clock?.due ?? matter.due;
  if (clock) return { label: clock.label, ...(due ? { date: formatDate(due) } : {}), left: clock.left, unit: clock.unit, ...(clock.window > 0 ? { total: clock.window } : {}) };
  if (due) return { label: "Due", date: formatDate(due) };
  return matter.age ? { label: matter.age } : undefined;
}

/** The lead matter, set on the watch-floor surface so the most urgent thing on the desk reads as such. */
export function PriorityCard({ campaign, matter }: { readonly campaign: Campaign; readonly matter: BriefMatter }) {
  const media = useMedia();
  const deadline = deadlineOf(matter);
  const href = matter.href;
  return (
    <Theme name="situation">
      <MatterCard
        priority={PRIORITY[matter.urgency]}
        kind={matter.kindLabel}
        kindIcon={isIconName(matter.kindIcon) ? matter.kindIcon : "decision"}
        title={matter.title}
        summary={matter.reason}
        holdsTime={matter.holds}
        holdsNote="Stops time: Continue stays off until you answer this or put it off."
        {...(deadline ? { deadline } : {})}
        {...(href ? { href, onOpen: () => go(href), label: `Take up ${matter.title}` } : {})}
        pad={media.phone ? "lg" : "xl"}
        actions={
          href || matter.putOff ? (
            <>
              {href ? (
                <Button kind="primary" icon="review" onPress={() => go(href)}>
                  Take it up
                </Button>
              ) : null}
              <PutOff campaign={campaign} matter={matter} compact={false} />
            </>
          ) : undefined
        }
      />
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
                      {matter.holds ? <Tag tone="warning" icon="paused">Stops time</Tag> : null}
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
          Nothing needs you on {formatDate(campaign.calendar)}, and no deadline is close. Time moves forward from here until something does.
        </Text>
      </Column>
    </Surface>
  );
}
