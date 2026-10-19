import { useState, type ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { ChipRow } from "./Chips";
import { CastList, ExampleList, InfluenceList, StepTrack, ThresholdBars } from "./ExplainerParts";
import { GlossaryCard } from "./GlossaryCard";
import type { ExplainerViewModel, GlossaryCardView, NamedRef } from "./types";

function Part({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <Column gap="sm" role="region" aria-label={title}>
      <Text variant="label" tone="secondary" role="heading" aria-level={3}>
        {title}
      </Text>
      {children}
    </Column>
  );
}

function TermChips({ terms, termCard, onLaw }: { readonly terms: readonly NamedRef[]; readonly termCard: (id: string) => GlossaryCardView | undefined; readonly onLaw: (cite: string) => void }) {
  const [open, setOpen] = useState<string | undefined>(undefined);
  const shown = open ? termCard(open) : undefined;
  return (
    <Column gap="sm">
      <ChipRow items={terms} onOpen={(id) => setOpen(id === open ? undefined : id)} selected={open ?? ""} label="Terms in this explanation" />
      {shown ? <GlossaryCard entry={shown} onRelated={setOpen} onLaw={onLaw} /> : null}
    </Column>
  );
}

export type ExplainerBodyProps = {
  readonly explainer: ExplainerViewModel;
  readonly terms: readonly NamedRef[];
  /** The full card for a term chip, opened in place. */
  readonly termCard: (id: string) => GlossaryCardView | undefined;
  readonly next: readonly NamedRef[];
  /** Goes to another explainer; without it, "read next" shows plain names. */
  readonly onNext?: (id: string) => void;
  readonly onLaw: (cite: string) => void;
};

/**
 * A full explainer as a drawn explanation: who is involved, the steps on a
 * track, the counts that decide it, and what moves what. Each part appears
 * only when the explainer has it, and every drawn figure is also in words.
 */
export function ExplainerBody({ explainer, terms, termCard, next, onNext, onLaw }: ExplainerBodyProps) {
  const history = explainer.examples?.filter((example) => example.kind === "history") ?? [];
  const worked = explainer.examples?.filter((example) => example.kind === "illustration") ?? [];
  return (
    <Column gap="lg">
      <Text variant="document">
        {explainer.summary}
      </Text>
      {explainer.cast?.length ? <Part title="Who's involved"><CastList cast={explainer.cast} /></Part> : null}
      {explainer.steps?.length ? <Part title="How it works"><StepTrack steps={explainer.steps} /></Part> : null}
      {explainer.thresholds?.length ? <Part title="The numbers that decide it"><ThresholdBars thresholds={explainer.thresholds} /></Part> : null}
      {explainer.links?.length ? <Part title="What changes what"><InfluenceList links={explainer.links} /></Part> : null}
      {worked.length ? <Part title="An example"><ExampleList examples={worked} /></Part> : null}
      {history.length ? <Part title="From history"><ExampleList examples={history} /></Part> : null}
      {explainer.youCan?.length ? (
        <Part title="What you can do">
          {explainer.youCan.map((act) => (
            <Row key={act} gap="sm" top>
              <Icon name="appoint" size={18} tone="gold" />
              <Text variant="body" flex={1}>
                {act}
              </Text>
            </Row>
          ))}
        </Part>
      ) : null}
      {terms.length ? <Part title="Terms in this explanation"><TermChips terms={terms} termCard={termCard} onLaw={onLaw} /></Part> : null}
      {next.length ? <Part title="Read next"><ChipRow items={next} {...(onNext ? { onOpen: onNext } : {})} label="Read next" /></Part> : null}
    </Column>
  );
}
