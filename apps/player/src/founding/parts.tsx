import { useId, type ReactNode } from "react";
import { usPartyOfPerson } from "@admin/engine";
import { monogramFor, roleTitle } from "@admin/player-core";
import type { Person } from "@admin/world";
import { Badge, Column, Icon, Row, Surface, Text, View, useMedia, type IconName } from "@admin/ui";
import { BandSteps, type ReadTone } from "@admin/ui/dossier";
import { ChoiceMark, Legend, OptionCard, useRoving } from "@admin/ui/forms";
import { PARTY_INK, PartyMark } from "./glyphs";

const FIT_WORD: Readonly<Record<string, string>> = { strong: "Strongest fit", good: "Good fit", fair: "Fair fit", poor: "Poor fit" };
const FIT_STEPS: Readonly<Record<string, number>> = { strong: 4, good: 3, fair: 2, poor: 1 };
const FIT_TONE: Readonly<Record<string, ReadTone>> = { strong: "good", good: "fair", fair: "watch", poor: "bad" };
const PARTY_WORD: Readonly<Record<string, string>> = { democrat: "Democrat", republican: "Republican", independent: "Independent" };

/**
 * A redacted portrait: the initials on a sealed card, ringed in the party's
 * color. Candidate identity uses it until approved imagery is available; a
 * face is never fabricated from demographic choices.
 */
export function RedactedPortrait({ name, party, size = 48 }: { readonly name: string; readonly party?: "democrat" | "republican" | "independent"; readonly size?: number }) {
  return (
    <View width={size} height={size} borderRadius="pill" borderWidth={3} borderColor={party ? PARTY_INK[party] : "borderColorStrong"} backgroundColor="backgroundStrong" alignItems="center" justifyContent="center" aria-hidden>
      <Text variant={size >= 96 ? "display" : size >= 64 ? "heading" : "label"} tone="secondary" serif>
        {monogramFor(name)}
      </Text>
    </View>
  );
}

export function PersonFace({ person, size = 48 }: { readonly person: Person; readonly size?: number }) {
  const party = usPartyOfPerson(person);
  return <RedactedPortrait name={person.name} size={size} {...(party ? { party } : {})} />;
}

export type Candidate = {
  readonly person: Person;
  readonly fit?: string;
  readonly crossesTheAisle?: boolean;
  /** Where they count as from, when that is not simply their birthplace: a running mate's home state and region. */
  readonly place?: string;
  /** The card's readings: how they set against the President, or how they would hold the chair. */
  readonly extra?: ReactNode;
};

/** One fact about a person as a chip: a mark or glyph, then the words. */
export function FactChip({ icon, mark, children }: { readonly icon?: IconName; readonly mark?: ReactNode; readonly children: string }) {
  return (
    <Row gap="xs" paddingHorizontal="sm" paddingVertical="2xs" borderRadius="chip" backgroundColor="backgroundStrong" borderWidth={1} borderColor="borderColor" maxWidth="100%">
      {mark ?? (icon ? <Icon name={icon} size={14} tone="colorSecondary" /> : null)}
      <Text variant="caption" flexShrink={1} numberOfLines={1}>
        {children}
      </Text>
    </Row>
  );
}

/** How well someone fits the post, drawn as steps rather than said as a ranking. */
export function FitReading({ fit }: { readonly fit: string }) {
  return <BandSteps label="Fit for the post" labelHidden lit={FIT_STEPS[fit] ?? 0} word={FIT_WORD[fit] ?? fit} tone={FIT_TONE[fit] ?? "neutral"} />;
}

function PersonFacts({ candidate }: { readonly candidate: Candidate }) {
  const { person, crossesTheAisle, place } = candidate;
  const party = usPartyOfPerson(person);
  return (
    <Row gap="xs" wrap>
      {party ? <FactChip mark={<PartyMark party={party} size={12} />}>{PARTY_WORD[party] ?? party}</FactChip> : null}
      <FactChip icon="subjectPerson">{`Age ${person.age}`}</FactChip>
      <FactChip icon="mapPin">{place ?? person.birthplace ?? "Birthplace not on file"}</FactChip>
      {crossesTheAisle ? <Badge status="info">From the other party</Badge> : null}
    </Row>
  );
}

/**
 * A person offered for a post, laid out picture first: the face and name, how
 * well they fit drawn as steps, the facts as chips, and the card's own
 * readings in a band beneath. The whole card is the choice.
 */
function CandidateBody({ candidate, withSeat, selected }: { readonly candidate: Candidate; readonly withSeat: boolean; readonly selected: boolean }) {
  const media = useMedia();
  const { person, fit, extra } = candidate;
  const seat = withSeat ? person.eligibleRoles[0] : undefined;
  const fitReading = fit ? (
    <View width={media.phone ? "100%" : 150} flexShrink={0}>
      <FitReading fit={fit} />
    </View>
  ) : null;
  return (
    <Column flex={1} gap="md" minWidth={0}>
      <Row gap="md" top>
        <PersonFace person={person} size={media.phone ? 48 : 56} />
        <Column flex={1} gap="2xs" minWidth={0}>
          <Text variant="title">{person.name}</Text>
          {seat ? (
            <Text variant="caption" tone="secondary">
              {roleTitle(seat as string)}
            </Text>
          ) : null}
        </Column>
        {media.phone ? null : fitReading}
        <ChoiceMark selected={selected} shape="radio" />
      </Row>
      {media.phone ? fitReading : null}
      <PersonFacts candidate={candidate} />
      {extra ? (
        <Column gap="sm" paddingTop="md" borderTopWidth={1} borderTopColor="borderColor">
          {extra}
        </Column>
      ) : null}
    </Column>
  );
}

/** A shortlist: one name chosen, each card with the face, the facts and the readings it is offered on. */
export function CandidateList({ label, help, candidates, chosen, onChoose, withSeat = false }: { readonly label: string; readonly help?: string; readonly candidates: readonly Candidate[]; readonly chosen: string | undefined; readonly onChoose: (id: string) => void; readonly withSeat?: boolean }) {
  const legend = useId();
  const ids = candidates.map((candidate) => candidate.person.id as string);
  const roving = useRoving(ids, chosen, onChoose);
  return (
    <Column gap="sm">
      <Legend id={legend} label={label} help={help} />
      <Column gap="sm" role="radiogroup" aria-labelledby={legend}>
        {candidates.map((candidate, index) => {
          const selected = chosen === ids[index];
          return (
            <OptionCard key={ids[index]} role="radio" ref={roving.refFor(index)} selected={selected} aria-checked={selected} tabIndex={roving.tabIndexFor(index)} onKeyDown={roving.keyDownFor(index)} onPress={() => onChoose(ids[index]!)}>
              <CandidateBody candidate={candidate} withSeat={withSeat} selected={selected} />
            </OptionCard>
          );
        })}
      </Column>
    </Column>
  );
}

/** A stage's opening line: what this stage commits the President to. */
export function Commits({ children }: { readonly children: ReactNode }) {
  return (
    <Surface level="flat" pad="none" borderLeftWidth={3} borderLeftColor="goldRule" paddingLeft="md" borderRadius={0}>
      <Text variant="eyebrow" tone="gold">
        What this commits you to
      </Text>
      <Text variant="body" tone="secondary">
        {children}
      </Text>
    </Surface>
  );
}

/** The stage's controls and, beside them on a wide screen or under them on a phone, what they add up to; `stickySide` keeps a long side panel in view. */
export function StageGrid({ main, side, stickySide = false }: { readonly main: ReactNode; readonly side?: ReactNode; readonly stickySide?: boolean }) {
  const media = useMedia();
  const stacked = !media.desktop;
  return (
    <View flexDirection={stacked ? "column" : "row"} gap="xl" alignItems="flex-start">
      <Column gap="xl" flex={stacked ? undefined : 3} width={stacked ? "100%" : undefined} minWidth={0}>
        {main}
      </Column>
      {side ? (
        // A pinned side panel needs the column to run the main column's full height, or it has nowhere to travel.
        <Column gap="lg" flex={stacked ? undefined : 2} width={stacked ? "100%" : undefined} minWidth={0} alignSelf={stickySide && !stacked ? "stretch" : undefined}>
          {side}
        </Column>
      ) : null}
    </View>
  );
}

/** A side panel's card: a reading of the draft, never a control. */
export function Reading({ icon, title, children }: { readonly icon?: Parameters<typeof Icon>[0]["name"]; readonly title: string; readonly children: ReactNode }) {
  return (
    <Surface level="raised" pad="lg" role="region" aria-label={title}>
      <Column gap="md">
        <Row gap="sm">
          {icon ? <Icon name={icon} size={20} tone="gold" /> : null}
          <Text variant="label" weight="strong">
            {title}
          </Text>
        </Row>
        {children}
      </Column>
    </Surface>
  );
}
