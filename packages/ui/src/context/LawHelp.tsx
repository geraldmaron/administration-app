import { Icon } from "../icons/Icon";
import { Surface } from "../primitives/Surface";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { HelpButton, type HelpContent } from "./HelpSheet";
import { LegalCitation } from "./LegalCitation";

/** One authority as help shows it: its citation, a line on what it does, and the door into its record. */
export type LawView = NonNullable<HelpContent["law"]>[number];

export type LawHelpProps = {
  readonly title: string;
  /** What the power is and what it lets the President do, in plain words. */
  readonly meaning: string;
  readonly steps?: readonly string[];
  /** Every authority behind it, resolved by the screen (the design system never reads the law registry). */
  readonly law: readonly LawView[];
  /**
   * `button` is the "?" alone, for a panel's head. `card` sets the law beside
   * an act: the title, `lede` (its limits in a line), the "?" and every
   * citation as a chip.
   */
  readonly presentation?: "button" | "card";
  readonly lede?: string;
};

/**
 * The one help that names the law: what a power means, how it runs, and each
 * authority opening its record, so help never paraphrases a power without
 * citing its source.
 */
export function LawHelp({ title, meaning, steps, law, presentation = "button", lede }: LawHelpProps) {
  const button = <HelpButton label={`About ${title}`} content={{ title, meaning, ...(steps ? { steps } : {}), law }} />;
  if (presentation === "button") return button;
  return (
    <Surface level="raised" pad="md" accentEdge="gold">
      <Column gap="sm">
        <Row gap="sm" between>
          <Row gap="xs" flex={1}>
            <Icon name="gavel" size={22} tone="gold" weight="fill" />
            <Text variant="title" role="heading" aria-level={3} flex={1}>
              {title}
            </Text>
          </Row>
          {button}
        </Row>
        {lede ? (
          <Text variant="label" tone="secondary">
            {lede}
          </Text>
        ) : null}
        <Row gap="xs" wrap>
          {law.map((entry) => (
            <LegalCitation key={entry.cite} citation={entry} onPress={entry.onOpen} />
          ))}
        </Row>
      </Column>
    </Surface>
  );
}
