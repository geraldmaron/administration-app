import type { ReactNode } from "react";
import { authorityById, place, sealFor, type Authority, type Stance } from "@admin/player-core";
import { Column, EntityLink, Field, Icon, LawHelp, LegalCitation, Peek, Pressable, ReadingFrame, Row, Seal, Segmented, Select, Text, View, useMedia, type KeyEntry } from "@admin/ui";
import { Flag, type ReadingValence } from "@admin/ui/world";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { termDoor } from "../handbook/term-door";
import { nationFlag } from "./flags";
import { topicAuthorities, type LawTopic } from "./law";
import { go } from "../shell/navigate";
import { useLawViews } from "../law/LawHelp";

export { go };

/**
 * Sizing for one column of a two-column screen. On a phone the basis is the
 * whole row so the columns stack; `flex` would set a zero basis and keep them
 * side by side at a fraction of the width.
 */
export function splitColumn(desktop: boolean, grow = 1) {
  return { flexGrow: grow, flexShrink: 1, flexBasis: desktop ? 0 : "100%", minWidth: 0 } as const;
}


const STANCE_VALENCE: Readonly<Record<Stance | "unread", ReadingValence>> = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad", unread: "neutral" };

export function stanceValence(stance: Stance | "unread" | undefined): ReadingValence {
  return stance ? STANCE_VALENCE[stance] : "neutral";
}

/** A government's flag, from the vendored artwork. */
export function FlagOf({ nation, name, height = 18 }: { readonly nation: string; readonly name: string; readonly height?: number }) {
  const source = nationFlag(nation);
  return <Flag name={name} {...(source !== undefined ? { source } : {})} height={height} decorative />;
}

/** A government named in a row: its flag and its name as the door to its file. */
export function NationLink({ nation, name, height = 18 }: { readonly nation: string; readonly name: string; readonly height?: number }) {
  return (
    <Row gap="xs" flexShrink={1}>
      <FlagOf nation={nation} name={name} height={height} />
      <EntityLink label={name} href={place.country(nation)} onPress={() => go(place.country(nation))} />
    </Row>
  );
}

/** A government named inside a row or card that is itself the door: its name opens a quick look, and the row's own door keeps working. */
export function NationName({ nation, name, height = 18, role }: { readonly nation: string; readonly name: string; readonly height?: number; readonly role?: string }) {
  return (
    <Row gap="xs" flexShrink={1}>
      <FlagOf nation={nation} name={name} height={height} />
      <Peek name={name} identity={<FlagOf nation={nation} name={name} height={28} />} {...(role ? { role } : {})} onOpen={() => go(place.country(nation))} openLabel={`Open ${name}'s file`} />
    </Row>
  );
}

export { CardTo, RowTo } from "../executive/parts";

/** A government as a chip: flag and name, one press to its file. */
export function NationChip({ nation, name, word }: { readonly nation: string; readonly name: string; readonly word?: string }) {
  return (
    <Pressable href={place.country(nation)} onPress={() => go(place.country(nation))} role="link" aria-label={`${name}${word ? `, ${word}` : ""}. Open its page`} flexDirection="row" alignItems="center" gap="xs" paddingHorizontal="sm" paddingVertical="2xs" borderRadius="pill" borderWidth={1} borderColor="borderColor">
      <FlagOf nation={nation} name={name} height={14} />
      <Text variant="caption" weight="strong">
        {name}
      </Text>
      {word ? (
        <Text variant="caption" tone="secondary">
          {word}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** An institution's emblem, from the seal registry; decorative where its name is printed beside it. */
export function SealOf({ id, name, size = 40, label }: { readonly id: string; readonly name?: string; readonly size?: number; readonly label?: string }) {
  return <Seal spec={sealFor(id, name)} size={size} {...(label ? { label } : {})} />;
}

/** The law behind an act, each citation opening its authority. */
export function LawChips({ authorities, compact }: { readonly authorities: readonly Authority[]; readonly compact?: boolean }) {
  const open = useOpenAuthority();
  if (authorities.length === 0) return null;
  return (
    <Row gap="sm" wrap flexShrink={1} maxWidth="100%" role="list" aria-label="The law behind it">
      {authorities.map((authority) => (
        <View key={authority.id} maxWidth="100%" flexShrink={1}>
          <LegalCitation citation={{ cite: authority.cite, title: authority.shortTitle ?? authority.title }} onPress={() => open(authority.cite)} compact={compact} />
        </View>
      ))}
    </Row>
  );
}

/** One registry record's citation by id, for a sentence that names a statute. */
export function CiteById({ id, compact }: { readonly id: string; readonly compact?: boolean }) {
  const authority = authorityById(id);
  return authority ? <LawChips authorities={[authority]} compact={compact} /> : null;
}

const TOPIC_HELP: Readonly<Record<LawTopic, { readonly title: string; readonly meaning: string; readonly steps?: readonly string[] }>> = {
  "war-powers": {
    title: "Using force, and the War Powers deadlines",
    meaning: "You command the military, but Congress declares war and pays for it. If you send troops into fighting without Congress's approval, you have 48 hours to tell Congress, and the troops have to come home within 60 days unless Congress votes to let them stay.",
    steps: ["Tell the Speaker of the House and the Senate's presiding officer within 48 hours (50 U.S.C. §1543).", "Ask Congress to approve the use of force, or the 60-day deadline keeps running (50 U.S.C. §1544(b)).", "You can add up to 30 more days, but only to keep the troops safe while they leave."],
  },
  tariffs: { title: "Where tariff power comes from", meaning: "A tariff is a tax on goods coming into the country. Congress has the power to set them, and it has passed laws that let you use some of that power. Each tariff order here covers one kind of goods and adds one rate." },
  sanctions: { title: "Sanctions and national emergencies", meaning: "To freeze a country's money or cut off trade, you first declare a national emergency over a serious threat from abroad. You have to tell Congress, renew the emergency every year, and Congress can vote to end it." },
  treaties: { title: "Treaties and agreements", meaning: "A treaty only counts once two thirds of the senators present vote yes. Other kinds of agreements don't need that vote, but you still have to tell Congress about them." },
  "intelligence-collection": { title: "Limits on gathering intelligence", meaning: "You direct how our spy agencies gather information about other countries, within the laws that limit them. If you try to spy on Americans or American politics, your lawyers will refuse, and the attempt stays on the record." },
  "intelligence-findings": { title: "Secret operations and who must be told", meaning: "A secret operation needs your written approval, called a finding, and you have to tell the intelligence committees in Congress. A finding can't approve anything that breaks the Constitution or the law." },
  classification: { title: "Classified material", meaning: "Secret documents are labeled by how secret they are, following a presidential order on classified information. The label you see shows the level this game gave the document. It's never added just for show." },
  commands: { title: "Military commands", meaning: "Your orders go from you to the Secretary of Defense, then to the generals and admirals who lead each command. A plan called the Unified Command Plan says which command covers which part of the world." },
  arms: { title: "Arms sales and Congress", meaning: "Before a big sale of weapons to another country goes ahead, Congress has to be told. Congress can block the sale if both chambers vote to stop it." },
  diplomacy: { title: "Diplomacy and recognizing other governments", meaning: "You welcome other countries' ambassadors, and that's how the United States officially recognizes a foreign government. You also choose our own ambassadors, and the Senate has to approve them." },
};

/** A topic's law as citations with its help beside them, for a panel's head. */
export function TopicLaw({ topic }: { readonly topic: LawTopic }) {
  const help = TOPIC_HELP[topic];
  const law = useLawViews(topicAuthorities(topic).map((authority) => authority.cite));
  return (
    <Row gap="xs" wrap flexShrink={1} maxWidth="100%">
      <LawChips authorities={topicAuthorities(topic).slice(0, 2)} compact />
      <LawHelp title={help.title} meaning={help.meaning} {...(help.steps ? { steps: help.steps } : {})} law={law} />
    </Row>
  );
}

/** The three inks a statute clock's bar takes, by how much of its window is left. */
export const CLOCK_KEY: readonly KeyEntry[] = [
  { id: "plenty", kind: "swatch", label: "More than half the window left", ink: "successInk" },
  { id: "close", kind: "swatch", label: "Half the window or less left", ink: "warningInk" },
  { id: "late", kind: "swatch", label: "A quarter or less left, or overdue", ink: "danger" },
];

/** A group of banded readings (trust, tension, force levels), framed with how the steps and the word beside each are read. */
export function BandFrame({ title, meaning, unit = "Steps lit on a ladder, the word beside each bar says which", term, children }: { readonly title: string; readonly meaning: string; readonly unit?: string; readonly term?: { readonly id: string; readonly label: string }; readonly children: ReactNode }) {
  return (
    <ReadingFrame title={title} unit={unit} help={{ meaning, ...(term ? { term: termDoor(term.id, term.label) } : {}) }}>
      <Column gap="sm">{children}</Column>
    </ReadingFrame>
  );
}

/** The ladder each relationship bar sits on, printed under its title so no band word stands bare. */
export const RELATIONSHIP_LADDER = "Four steps. Trust: Hostile, Wary, Neutral, Trusts you. Tension: Low, Manageable, Rising, High (more is worse)";

/** What the relationship readings mean: trust runs hostile to trusting, tension low to high. */
export const RELATIONSHIP_BANDS = "Each bar has four steps and the word beside it says which step the reading is on. Trust runs from Hostile through Wary and Neutral to Trusts you. Tension runs from Low through Manageable and Rising to High, and for tension more steps is worse. The estimate comes from your intelligence agencies, so it can be wrong.";

export { MapPanelSlot, type MapLensOption, type MapPanelSlotProps } from "../nation/MapPanelSlot";


/** An act's refusal, in the engine's or the store's own words. */
export function Problem({ problem }: { readonly problem: string }) {
  if (!problem) return null;
  return (
    <Row gap="xs" top role="alert">
      <Icon name="caution" size={16} tone="danger" />
      <Text variant="body" tone="danger" flex={1}>
        {problem}
      </Text>
    </Row>
  );
}

/** One of a few options: segments where they fit on one line, a select where they would not. */
export function ChooseOne<T extends string>({ label, value, onChange, options, help }: { readonly label: string; readonly value: T | undefined; readonly onChange: (value: T) => void; readonly options: readonly { readonly value: T; readonly label: string }[]; readonly help?: string }) {
  const media = useMedia();
  const width = options.reduce((sum, option) => sum + option.label.length * 9 + 32, 0);
  if (width <= (media.phone ? 340 : media.desktop ? 900 : 620)) return <Segmented label={label} value={value} onChange={onChange} options={options} {...(help ? { help } : {})} />;
  return (
    <Field label={label} {...(help ? { help } : {})}>
      {(control) => <Select {...control} label={label} value={value} onChange={onChange} options={options} />}
    </Field>
  );
}
