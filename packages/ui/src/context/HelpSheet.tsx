import { useState, type ReactNode } from "react";
import { Button } from "../primitives/Button";
import { Surface } from "../primitives/Surface";
import { Column } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { Sheet } from "../layers/Sheet";
import { LegalCitation, type CitationView } from "./LegalCitation";

export type HelpContent = {
  readonly title: string;
  /** What the term means for the President's decisions, in plain words. */
  readonly meaning: string;
  /** How the process runs, step by step, where there is one. */
  readonly steps?: readonly string[];
  /** The law that grants or limits the power, each opening its authority. */
  readonly law?: readonly (CitationView & { readonly summary?: string; readonly onOpen?: () => void })[];
  /** Further reading inside the game: Handbook chapters, related terms. */
  readonly related?: ReactNode;
};

/**
 * The one "?" in the player. It opens a sheet that keeps the page in view and
 * holds three things in a fixed order: what the term means, how the process
 * runs, and the law behind it, so help never paraphrases a power without
 * naming its source. `text` prints the button's words beside the glyph.
 */
export function HelpButton({ content, label, text }: { readonly content: HelpContent; readonly label?: string; readonly text?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button kind="quiet" size="compact" icon="info" label={label ?? `About ${content.title}`} onPress={() => setOpen(true)}>
        {text}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={content.title} eyebrow="Help">
        <Text variant="body">{content.meaning}</Text>
        {content.steps?.length ? (
          <Column gap="xs">
            <Text variant="eyebrow" tone="secondary">
              How it works
            </Text>
            {content.steps.map((step, i) => (
              <Text key={step} variant="body">
                {i + 1}. {step}
              </Text>
            ))}
          </Column>
        ) : null}
        {content.law?.length ? (
          <Column gap="sm">
            <Text variant="eyebrow" tone="secondary">
              The law
            </Text>
            {content.law.map((law) => (
              <Surface key={law.cite} level="raised" pad="md" accentEdge="gold">
                <Column gap="xs">
                  <LegalCitation citation={law} onPress={law.onOpen} />
                  {law.summary ? <Text variant="label" tone="secondary" weight="regular">{law.summary}</Text> : null}
                </Column>
              </Surface>
            ))}
          </Column>
        ) : null}
        {content.related}
      </Sheet>
    </>
  );
}
