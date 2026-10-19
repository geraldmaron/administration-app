import { useMemo, useState, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { buildInbox, formatDate, markSeen, pruneSeen, type InboxItem } from "@admin/player-core";
import { BellButton, NotificationList, Sheet, type IconName, type NotificationView } from "@admin/ui";
import { usePreferences } from "../device/hooks";
import { go } from "./navigate";
import { refDoors } from "./RefDoors";

const SOURCE: Readonly<Record<string, { readonly label: string; readonly icon: IconName }>> = {
  desk: { label: "Waiting on you", icon: "brief" },
  news: { label: "News", icon: "press" },
  calendar: { label: "Calendar", icon: "schedule" },
};

/** The bell and its inbox: what waits at the desk, what the wire reports, and what is coming due. */
export function InboxButton({ campaign }: { readonly campaign: Campaign }) {
  const { preferences, update } = usePreferences();
  const [open, setOpen] = useState(false);
  const seenIds = preferences.inboxSeen?.[String(campaign.seed)];
  const seen = useMemo(() => new Set(seenIds ?? []), [seenIds]);
  const inbox = useMemo(() => buildInbox(campaign, seen, { attention: preferences.attentionByKind }), [campaign, seen, preferences.attentionByKind]);
  const keep = (ids: readonly string[]) => {
    const next = pruneSeen(markSeen(seen, ids), inbox);
    update({ inboxSeen: { ...preferences.inboxSeen, [String(campaign.seed)]: [...next] } });
  };
  const view = (item: InboxItem): NotificationView & { readonly refs?: ReactNode } => {
    const source = SOURCE[item.source] ?? { label: item.source, icon: "notificationStack" as const };
    const refs = refDoors(campaign, item.entityRefs);
    return {
      id: item.id,
      href: item.href,
      title: item.title,
      summary: item.summary,
      dateLabel: formatDate(item.date),
      sourceLabel: source.label,
      icon: source.icon,
      urgency: item.urgency,
      read: item.read,
      actionable: item.actionable,
      ...(refs ? { refs } : {}),
      onPress: () => {
        keep([item.id]);
        if (item.href) {
          setOpen(false);
          go(item.href);
        }
      },
    };
  };
  return (
    <>
      <BellButton count={inbox.unread} onPress={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications" eyebrow={formatDate(campaign.calendar)}>
        {/* A desk row stays unread until it is answered, so marking is offered only while a story or a date is unread. */}
        <NotificationList items={inbox.items.map(view)} {...(inbox.items.some((item) => item.source !== "desk" && !item.read) ? { onMarkAllRead: () => keep(inbox.items.map((item) => item.id)) } : {})} />
      </Sheet>
    </>
  );
}
