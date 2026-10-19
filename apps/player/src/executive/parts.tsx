import type { ComponentProps, ReactNode } from "react";
import { useRouter } from "expo-router";
import { sealFor, type ChairRead } from "@admin/player-core";
import { CardLink, Icon, Key, Row, Seal, Surface, Text, View, type IconName, type KeyEntry } from "@admin/ui";
import { ReadBadge, TraitReadout, type PipView } from "@admin/ui/dossier";
import { RouterLink } from "../shell/RouterLink";
import { pipTone } from "./present";

/** An institution's authored emblem (DECISIONS §8.10), labeled only where no visible name stands beside it. */
export function InstitutionSeal({ id, name, size = 40, labeled }: { readonly id: string; readonly name: string; readonly size?: number; readonly labeled?: boolean }) {
  return <Seal spec={sealFor(id, name)} size={size} {...(labeled ? { label: `${name} seal` } : {})} />;
}

/** A name in running text that opens its own screen. */
export function Door({ href, label, children }: { readonly href: string; readonly label: string; readonly children: ReactNode }) {
  return (
    <RouterLink href={href} label={label}>
      {children}
    </RouterLink>
  );
}

/** A link drawn as words: the accent ink and an underline, the target in its label. */
export function LinkText({ href, children, label, variant = "label" }: { readonly href: string; readonly children: string; readonly label?: string; readonly variant?: "label" | "body" | "caption" | "title" }) {
  return (
    <RouterLink href={href} label={label ?? children}>
      <Text variant={variant} tone="accent" textDecorationLine="underline">
        {children}
      </Text>
    </RouterLink>
  );
}

type ToProps = Omit<ComponentProps<typeof CardLink>, "onPress"> & { readonly href: string };

/** A card that opens its screen from anywhere in its box. A control inside it still does its own job. */
export function CardTo({ href, ...card }: ToProps) {
  const router = useRouter();
  return <CardLink href={href} onPress={() => router.push(href as never)} {...card} />;
}

/**
 * A row in a list that opens its screen from anywhere along it: no rounded
 * corners or side borders, so the rows stack as one list, and the focus ring
 * drawn inside the row so a list that clips its corners never hides it. The
 * first row in a boxed list drops its rule, since the box draws that edge.
 * A row with nowhere to go is drawn the same and is not pressable.
 */
export function RowTo({ href, first, label, children, ...row }: Omit<ToProps, "href"> & { readonly href: string | undefined; readonly first?: boolean }) {
  if (!href) {
    return (
      <View borderTopWidth={first ? 0 : 1} borderTopColor="borderColor">
        {children}
      </View>
    );
  }
  return (
    <CardTo href={href} label={label} radius="none" pad="none" borderWidth={0} borderTopWidth={first ? 0 : 1} borderTopColor="borderColor" outlineOffset={-2} {...row}>
      {children}
    </CardTo>
  );
}

/**
 * Holds a control that opens a layer, such as a help sheet, inside a card or
 * row. The layer is drawn elsewhere on the page, but a press inside it still
 * travels up through the card in React, so it is stopped here before it can
 * open the card's screen.
 */
export function OwnLayer({ children }: { readonly children: ReactNode }) {
  return <View onPress={(event: { stopPropagation: () => void }) => event.stopPropagation()}>{children}</View>;
}

/** A card's or panel's label: the page header's gold glyph and a sentence-case name, never a second caps style. */
export function CardLabel({ icon, children }: { readonly icon: IconName; readonly children: ReactNode }) {
  return (
    <Row gap="xs">
      <Icon name={icon} size={16} tone="gold" weight="fill" />
      <Text variant="label" tone="secondary">
        {children}
      </Text>
    </Row>
  );
}

const CHAIR_READ_ENTRIES: readonly KeyEntry[] = [
  { id: "order", kind: "dot", label: "One mark per trait, in order: competence, loyalty, integrity, ambition", ink: "colorSecondary" },
  { id: "sound", kind: "dot", label: "Sound", ink: "successInk" },
  { id: "fair", kind: "dot", label: "Fair", ink: "infoInk" },
  { id: "watch", kind: "dot", label: "Needs watching", ink: "warningInk" },
  { id: "weak", kind: "dot", label: "Weak", ink: "danger" },
  { id: "ambition", kind: "shape", shape: "diamond", label: "The fourth mark is a diamond: ambition. Gold means it is near or past a rival bloc. It is never a grade", ink: "gold" },
];

/** What the dots beside a leader's assessment word mean, once above the list that draws them. */
export function ChairReadKey() {
  return <Key entries={CHAIR_READ_ENTRIES} title="the dots beside each leader's assessment" />;
}

/** A read's pips as the shared marks draw them: ambition as the diamond, every other trait as a dot. */
export function pipViews(read: ChairRead): readonly PipView[] {
  return read.pips.map((pip) => ({ key: pip.key, label: pip.label, word: pip.word, tone: pipTone(pip.tone), ...(pip.key === "ambition" ? { shape: "diamond" as const } : {}) }));
}

export function ChairReadBadge({ read }: { readonly read: ChairRead }) {
  return <ReadBadge word={read.word} tone={read.tone} pips={pipViews(read)} />;
}

/** The read with every pip named, for a card with room to say what each mark is. */
export function ChairTraits({ read }: { readonly read: ChairRead }) {
  return <TraitReadout pips={pipViews(read)} />;
}

/** A refusal in the engine's words, said where the act was offered. */
export function Problem({ text }: { readonly text: string }) {
  if (!text) return null;
  return (
    <Surface level="raised" pad="md" accentEdge="danger" role="alert">
      <Row gap="sm" top>
        <Icon name="caution" size={18} tone="danger" weight="bold" />
        <Text variant="body" flex={1}>
          {text}
        </Text>
      </Row>
    </Surface>
  );
}
