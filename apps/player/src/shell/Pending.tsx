import type { Campaign } from "@admin/engine";
import { formatDate, pendingAbout, pendingSpoken, selectPending, type PendingItem } from "@admin/player-core";
import { Card, Column, Text, type IconName } from "@admin/ui";
import { Countdown } from "@admin/ui/world";
import { go } from "./navigate";

// The one way a screen shows what the game is waiting on: each wait as a
// countdown that opens the thing it waits on. A subject's page shows the waits
// about it; the Brief shows them all.

/** The anchor a pending row carries, so a link can land on that exact row. */
export const pendingAnchor = (id: string): string => `pending-${id.replace(/[^A-Za-z0-9_-]/g, "-")}`;

export function PendingRows({ items, focus, label = "Waiting on" }: { readonly items: readonly PendingItem[]; readonly focus?: string; readonly label?: string }) {
  return (
    <Column gap="xs" role="list" aria-label={label}>
      {items.map((item) => (
        <Countdown
          key={item.id}
          id={pendingAnchor(item.id)}
          title={item.title}
          {...(item.waitingOn ? { waitingOn: item.waitingOn } : {})}
          line={item.line}
          due={`Due ${formatDate(item.dueDate)}`}
          daysLeft={item.daysLeft}
          {...(item.windowDays !== undefined ? { windowDays: item.windowDays } : {})}
          {...(item.progress !== undefined ? { progress: item.progress } : {})}
          stops={item.stops}
          {...(item.icon ? { icon: item.icon as IconName } : {})}
          spoken={pendingSpoken(item)}
          focused={item.id === focus}
          onPress={() => go(item.href)}
        />
      ))}
    </Column>
  );
}

/**
 * A card of the waits about one subject, or every wait when no subject is
 * given. Draws nothing when nothing is pending unless the screen asks for the
 * empty sentence, so a country with no business under way keeps its page.
 */
export function PendingCard({ campaign, about, title = "Waiting on", empty, focus, limit, only }: { readonly campaign: Campaign; readonly about?: string; readonly title?: string; readonly empty?: string; readonly focus?: string; readonly limit?: number; readonly only?: (item: PendingItem) => boolean }) {
  const all = (about ? pendingAbout(campaign, about) : selectPending(campaign)).filter((item) => !only || only(item));
  if (all.length === 0 && !empty) return null;
  const items = limit === undefined ? all : all.slice(0, limit);
  const due = all.some((item) => item.daysLeft <= 0);
  return (
    <Card title={title} icon="pending" {...(due ? { edge: "warning" as const } : {})} id="pending">
      {all.length === 0 ? (
        <Text variant="body" tone="secondary">
          {empty}
        </Text>
      ) : (
        <PendingRows items={items} {...(focus ? { focus } : {})} label={title} />
      )}
      {limit !== undefined && all.length > limit ? (
        <Text variant="caption" tone="tertiary">{`${all.length - limit} more on the calendar.`}</Text>
      ) : null}
    </Card>
  );
}
