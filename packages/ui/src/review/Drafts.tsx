import { View } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Button } from "../primitives/Button";
import { CountDot } from "../primitives/CountDot";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Tag } from "../primitives/Tag";
import { Text } from "../primitives/Text";
import { TONE_INK } from "./Readings";
import type { EffectTone } from "./types";

export type DraftItemView = {
  readonly id: string;
  readonly subject: string;
  /** Today's value, struck through. */
  readonly was: string;
  /** The drafted value, in brass. */
  readonly now: string;
  readonly effect: string;
  readonly effectTone: EffectTone;
  /** Terms changed since the draft was made: it must be reviewed again. */
  readonly stale: boolean;
  /** `signing` while its act goes through; `unsaved` when it went through and the device refused the save. */
  readonly state: "pending" | "signing" | "unsaved";
  readonly saveError?: string;
};

export type DraftGroupView = { readonly authority: string; readonly label: string; readonly icon: IconName; readonly items: readonly DraftItemView[] };

export type DraftsTrayProps = {
  readonly groups: readonly DraftGroupView[];
  readonly onReview: (id: string) => void;
  readonly onDiscard: (id: string) => void;
  readonly onRetrySave: (id: string) => void;
  /** The drafts could not be kept on this device; they stand for this session. */
  readonly saveError?: string;
};

function Item({ item, onReview, onDiscard, onRetrySave }: { readonly item: DraftItemView } & Pick<DraftsTrayProps, "onReview" | "onDiscard" | "onRetrySave">) {
  return (
    <Surface level="raised" pad="md" role="listitem" aria-label={`${item.subject}: ${item.was} to ${item.now}${item.stale ? ". Out of date" : ""}`}>
      <Column gap="sm">
        <Row gap="sm" between wrap>
          <Text variant="label" flex={1} minWidth={160}>
            {item.subject}
          </Text>
          {item.state === "unsaved" ? (
            <Tag tone="warning" icon="caution">
              Not saved
            </Tag>
          ) : item.state === "signing" ? (
            <Tag tone="outline" icon="pending">
              Going through
            </Tag>
          ) : item.stale ? (
            <Tag tone="warning" icon="caution">
              Out of date
            </Tag>
          ) : null}
        </Row>
        <Row gap="xs" wrap>
          <Text variant="caption" tone="tertiary" textDecorationLine="line-through">
            {item.was}
          </Text>
          <Icon name="chevron" size={12} tone="colorTertiary" />
          <Text variant="label" tone="gold" tabular>
            {item.now}
          </Text>
        </Row>
        <Text variant="caption" color={TONE_INK[item.effectTone]}>
          {item.effect}
        </Text>
        {item.stale && item.state === "pending" ? (
          <Text variant="caption" tone="secondary">
            Things changed since you drafted this. Review it again to see today's terms.
          </Text>
        ) : null}
        {item.state === "unsaved" && item.saveError ? (
          <Text variant="caption" tone="warning">{`It went through, but your game wasn't saved. ${item.saveError}`}</Text>
        ) : null}
        <Row gap="xs" wrap justifyContent="flex-end">
          {item.state === "unsaved" ? (
            <Button kind="secondary" size="compact" icon="return" onPress={() => onRetrySave(item.id)}>
              Save again
            </Button>
          ) : (
            <>
              <Button kind="quiet" size="compact" disabled={item.state === "signing"} onPress={() => onDiscard(item.id)} label={`Discard the draft: ${item.subject}`}>
                Discard
              </Button>
              <Button kind="primary" size="compact" icon="sign" disabled={item.state === "signing"} onPress={() => onReview(item.id)} label={`Review and sign: ${item.subject}`}>
                {item.stale ? "Review again" : "Review"}
              </Button>
            </>
          )}
        </Row>
      </Column>
    </Surface>
  );
}

/**
 * Every unsigned change, grouped by the authority that would act on it, each
 * with its effect and its own review. Separate powers are never signed as one:
 * each draft goes through its own sign-off.
 */
export function DraftsTray({ groups, onReview, onDiscard, onRetrySave, saveError }: DraftsTrayProps) {
  if (groups.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        No drafts. When you change a budget line or set up an order, it waits here until you sign it.
      </Text>
    );
  }
  return (
    <Column gap="lg">
      {saveError ? (
        <Text variant="caption" tone="warning" role="alert">{`Your drafts couldn't be kept on this device, so they last until you close the game. ${saveError}`}</Text>
      ) : null}
      {groups.map((group) => (
        <Column key={group.authority} gap="sm" role="list" aria-label={group.label}>
          <Row gap="xs">
            <Icon name={group.icon} size={18} tone="gold" />
            <Text variant="eyebrow" tone="secondary" role="heading" aria-level={3}>
              {group.label}
            </Text>
            <Text variant="caption" tone="tertiary">
              {group.items.length}
            </Text>
          </Row>
          {group.items.map((item) => (
            <Item key={item.id} item={item} onReview={onReview} onDiscard={onDiscard} onRetrySave={onRetrySave} />
          ))}
        </Column>
      ))}
    </Column>
  );
}

/** The command bar's door to the tray: brass when anything waits to be signed, with the count. */
export function DraftsButton({ count, onPress }: { readonly count: number; readonly onPress: () => void }) {
  return (
    <View position="relative">
      <Button kind="quiet" size="compact" icon="sign" label={count === 0 ? "Drafts: none" : `Drafts: ${count} waiting to be signed`} onPress={onPress} />
      {count > 0 ? (
        <View position="absolute" top={2} right={2} pointerEvents="none">
          <CountDot count={count} label={`${count} drafts`} tone="gold" />
        </View>
      ) : null}
    </View>
  );
}
