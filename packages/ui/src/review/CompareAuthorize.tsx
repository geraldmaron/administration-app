import { useEffect, useId, type ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Button } from "../primitives/Button";
import { Column, Divider, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import { sharedLock } from "./axis";
import { outcomeScales, type OutcomeScales } from "./outcome-readings";
import { AnswerCard } from "./AnswerCard";
import { Key } from "../data/Key";
import type { KeyEntry } from "../data/key-entries";
import type { CompareLine, CompareOption, CompareProjection } from "./types";

export type CompareAuthorizeProps = {
  readonly title: string;
  readonly options: readonly CompareOption[];
  /** The option picked, or none yet: not acting is approving nothing. */
  readonly selected: string | undefined;
  readonly onSelect: (id: string) => void;
  /** The one named verb: "Give this answer", "Sign the order". */
  readonly verb: string;
  readonly onAuthorize: () => void;
  /** `danger` for an irreversible or forceful act. */
  readonly tone?: "commit" | "danger";
  /** What authorizing will do, in one line, shown beside the verb. */
  readonly review?: string;
  /** What happens on its own if nothing is approved, where that has a clock (an offer that expires, a story that runs). Said beside the options, never as one. */
  readonly waiting?: string;
  readonly busy?: boolean;
  /** Set under the list: what folded away, a source line, the staff's caveat. */
  readonly footnote?: ReactNode;
  readonly projection?: CompareProjection;
};

function Lines({ lines }: { readonly lines: readonly CompareLine[] }) {
  return (
    <Row gap="md" wrap>
      {lines.map((line) => (
        <Column key={line.label} gap="2xs" flexBasis={200} flexGrow={1} minWidth={0}>
          <Text variant="eyebrow" tone="secondary">
            {line.label}
          </Text>
          {typeof line.value === "string" ? <Text variant="caption">{line.value}</Text> : line.value}
        </Column>
      ))}
    </Row>
  );
}

/** What a card carries under its readings: its lines where it has no drawn readings, and once it is picked, what could go wrong, the forecast and its foot. */
function Below({ option, picked, projection }: { readonly option: CompareOption; readonly picked: boolean; readonly projection: CompareProjection | undefined }) {
  const parts = [
    option.lines && option.lines.length > 0 && (picked || !option.outcome) ? <Lines lines={option.lines} /> : null,
    picked && option.outcome?.worstCase ? (
      <Surface level="sunken" pad="sm" accentEdge="danger" radius="chip">
        <Text variant="eyebrow" tone="secondary">What could go wrong</Text>
        <Text variant="caption">{option.outcome.worstCase}</Text>
      </Surface>
    ) : null,
    projection?.perItem[option.id] ?? null,
    picked && option.foot ? option.foot : null,
  ].filter((part) => part !== null);
  if (parts.length === 0) return null;
  return <Column gap="sm">{parts.map((part, index) => <View key={index}>{part}</View>)}</Column>;
}

const READING_KEY: readonly KeyEntry[] = [
  { id: "odds", kind: "swatch", label: "Five steps: the chance it works", ink: "successInk" },
  { id: "today", kind: "tick", label: "The middle line is where things stand today. A bar to its right is a rise, and to its left a fall", ink: "color", weight: 2 },
  { id: "good", kind: "swatch", label: "Good for you", ink: "successInk" },
  { id: "watch", kind: "swatch", label: "Costs you something", ink: "warningInk" },
  { id: "bad", kind: "swatch", label: "Bad for you", ink: "danger" },
];

/**
 * Every consequential act (DECISIONS §8.9, §8.13): the options as a list of
 * answer cards, each drawn as its change from today under one key, one picked, what it will do in a
 * line, and one named verb. There is no row for doing nothing; the verb stays
 * off until an open option is picked.
 */
export function CompareAuthorize({ title, options, selected, onSelect, verb, onAuthorize, tone = "commit", review, waiting, busy = false, footnote, projection }: CompareAuthorizeProps) {
  const id = useId();
  const open = options.filter((option) => !option.unavailable);
  const sole = open.length === 1 && options.length === 1 ? open[0]!.id : undefined;
  // A lone open option is picked for the President, since a press that only picks it would be a step that decides nothing.
  useEffect(() => {
    if (selected === undefined && sole !== undefined) onSelect(sole);
  }, [selected, sole, onSelect]);
  const scales = outcomeScales(options.map((option) => option.outcome));
  const lockShared = sharedLock(options.map((option) => option.unavailable));
  const picked = options.find((option) => option.id === selected);
  const locked = picked?.unavailable;
  const line = picked ? (locked ?? review) : open.length === 0 ? "Nothing here can be approved yet. Each option says what it waits on." : "No option picked yet. Each one shows what it does before anything is approved.";
  return (
    <Column gap="md" role="group" aria-labelledby={`${id}-title`}>
      <Text id={`${id}-title`} variant="heading" role="heading" aria-level={2}>
        {title}
      </Text>
      {lockShared ? (
        <Row gap="xs">
          <Icon name="locked" size={16} tone="warningInk" />
          <Text variant="label" tone="warning">{`Locked. ${lockShared}`}</Text>
        </Row>
      ) : null}
      {waiting ? <Waiting text={waiting} /> : null}
      {projection ? projection.control : null}
      <Options title={title} options={options} selected={selected} onSelect={onSelect} scales={scales} lockShared={lockShared} projection={projection} />
      {footnote ? <View>{footnote}</View> : null}
      <Act line={line} verb={verb} tone={tone} disabled={!picked || locked !== undefined || busy} busy={busy} onPress={() => {
        if (!picked) return;
        projection?.onAuthorize?.(picked.id);
        onAuthorize();
      }} />
      {picked?.outcome && picked.outcome.details.length > 0 ? <Details option={picked} /> : null}
      {projection?.detail ? <View>{projection.detail}</View> : null}
    </Column>
  );
}

type OptionsProps = Pick<CompareAuthorizeProps, "title" | "options" | "selected" | "onSelect"> & {
  readonly scales: OutcomeScales;
  readonly lockShared: string | undefined;
  readonly projection: CompareProjection | undefined;
};

function Options({ title, options, selected, onSelect, scales, lockShared, projection }: OptionsProps) {
  return (
    <Column gap="sm">
      {options.some((option) => option.outcome) ? <Key entries={READING_KEY} title="the readings on each answer" /> : null}
      <Column gap="sm" role="list" aria-label={title}>
        {options.map((option) => (
          <View key={option.id} role="listitem">
            <AnswerCard
              option={option}
              scales={scales}
              selected={option.id === selected}
              onSelect={() => onSelect(option.id)}
              {...(option.unavailable && option.unavailable !== lockShared ? { lock: option.unavailable } : {})}
              below={<Below option={option} picked={option.id === selected} projection={projection} />}
            />
          </View>
        ))}
      </Column>
    </Column>
  );
}

/** A wait that has its own consequence, said as a line beside the options. */
export function Waiting({ text }: { readonly text: string }) {
  return (
    <Row gap="xs" top role="note">
      <Icon name="schedule" size={16} tone="colorSecondary" />
      <Text variant="caption" tone="secondary" flex={1}>
        {text}
      </Text>
    </Row>
  );
}

function Act({ line, verb, tone, disabled, busy, onPress }: { readonly line: string | undefined; readonly verb: string; readonly tone: "commit" | "danger"; readonly disabled: boolean; readonly busy: boolean; readonly onPress: () => void }) {
  const media = useMedia();
  return (
    <Surface level="raised" pad="md" elevated accentEdge={tone === "danger" ? "danger" : "gold"}>
      <View flexDirection={media.phone ? "column" : "row"} alignItems={media.phone ? "stretch" : "center"} gap="md">
        <Row gap="sm" flex={media.phone ? undefined : 1} top aria-live="polite">
          <Icon name="sign" size={20} tone="gold" />
          <Text variant="body" flex={1}>
            {line ?? ""}
          </Text>
        </Row>
        <Button kind={tone === "danger" ? "danger" : "primary"} size="large" icon="sign" disabled={disabled} label={`${verb}. You'll get one last look first, and nothing happens until you confirm.`} onPress={onPress}>
          {busy ? "Working…" : verb}
        </Button>
      </View>
    </Surface>
  );
}

function Details({ option }: { readonly option: CompareOption }) {
  return (
    <Surface level="base" pad="lg">
      <Column gap="sm">
        <Text variant="eyebrow" tone="secondary">
          {`${option.label}, all the details`}
        </Text>
        <Divider />
        {option.outcome!.details.map((detail) => (
          <Row key={detail.label} gap="md" top wrap>
            <Text variant="label" tone="secondary" width={180}>
              {detail.label}
            </Text>
            {typeof detail.text === "string" ? <Text variant="body" flex={1} minWidth={200}>{detail.text}</Text> : <View flex={1}>{detail.text}</View>}
          </Row>
        ))}
      </Column>
    </Surface>
  );
}
