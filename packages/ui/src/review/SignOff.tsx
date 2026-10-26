import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { motion } from "@admin/design";
import { LegalCitation, type CitationView } from "../context/LegalCitation";
import { Icon } from "../icons/Icon";
import { Button } from "../primitives/Button";
import { useReducedMotion } from "../primitives/motion";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import { TermLines } from "./ReviewSheet";
import { Stages, type StageView } from "./Stages";
import type { ReviewLineView, ReviewPhase, ReviewResultView } from "./types";

export type SignOffProps = {
  /** The act's name; left out where the sheet around it already says it. */
  readonly title?: string;
  /** Where the act goes once signed: "Takes effect when you sign; no vote is needed". */
  readonly route: string;
  /** The law that grants the power (DECISIONS §8.12), resolved by the screen. */
  readonly citation?: CitationView;
  readonly onOpenLaw?: () => void;
  /** What happens, in order; a package lists its steps in the order they apply. */
  readonly lines: readonly ReviewLineView[];
  /** Said above the terms when they were priced again because things changed since the draft. */
  readonly notice?: string;
  /** The one named verb: "Sign the order", "Send to Congress". */
  readonly verb: string;
  /** Force or the irreversible: the verb is drawn as danger. */
  readonly danger?: boolean;
  readonly phase: ReviewPhase;
  readonly result?: ReviewResultView;
  readonly onSign: () => void;
  readonly onBack: () => void;
  /** Offered when the act went through and the device refused the save; it writes again and applies nothing. */
  readonly onRetrySave?: () => void;
  readonly onOpenRecord?: (eventId: string) => void;
};

function stagesOf(result: ReviewResultView | undefined): readonly StageView[] {
  const applied = !result ? "now" : result.kind === "refused" ? "ended" : "done";
  const saved = result?.kind !== "applied" ? "ahead" : result.saveError ? "ended" : "done";
  return [
    { id: "signed", label: "Signed", state: "done" },
    { id: "applied", label: "Carried out", state: applied, ...(result?.kind === "applied" ? { note: result.date } : {}) },
    { id: "saved", label: "Saved on this device", state: saved },
  ];
}

/** The seal set on a signed act. It plays once the act has gone through and never stands between the press and the commit. */
function Stamp({ date }: { readonly date: string }) {
  const reduced = useReducedMotion();
  const shown = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(shown, { toValue: 1, duration: reduced ? 0 : motion.duration.settle, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, [reduced, shown]);
  const scale = shown.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] });
  return (
    <Animated.View style={{ opacity: shown, transform: [{ scale }, { rotate: "-3deg" }], alignSelf: "flex-start" }}>
      <Row gap="sm" paddingHorizontal="md" paddingVertical="xs" borderWidth={2} borderColor="goldRule" borderRadius="control">
        <Icon name="sign" size={20} tone="gold" weight="fill" />
        <Column>
          <Text variant="eyebrow" tone="gold">
            Signed
          </Text>
          <Text variant="caption" tone="secondary" tabular>
            {date}
          </Text>
        </Column>
      </Row>
    </Animated.View>
  );
}

function Outcome({ result, onRetrySave, onOpenRecord }: Pick<SignOffProps, "result" | "onRetrySave" | "onOpenRecord">) {
  if (!result) return <Stages label="Progress" stages={stagesOf(undefined)} vertical />;
  if (result.kind !== "applied") {
    return (
      <Text variant="body" tone={result.kind === "refused" ? "danger" : "warning"} role="alert">
        {result.words}
      </Text>
    );
  }
  return (
    <Column gap="md" aria-live="polite">
      <Stamp date={result.date} />
      {result.saveError ? (
        <Surface level="raised" pad="md" accentEdge="warning">
          <Column gap="sm">
            <Text variant="body" tone="warning">{`This went through, but your game wasn't saved. ${result.saveError} Saving again won't make it happen twice.`}</Text>
            {onRetrySave ? (
              <Button kind="secondary" icon="return" onPress={onRetrySave}>
                Save again
              </Button>
            ) : null}
          </Column>
        </Surface>
      ) : null}
      {result.eventId && onOpenRecord ? (
        <Button kind="secondary" icon="record" onPress={() => onOpenRecord(result.eventId!)}>
          See it in the Record
        </Button>
      ) : null}
    </Column>
  );
}

/**
 * The last step of a draft: what will happen, where it goes, the law behind
 * it, and one ordinary press of its named verb. No hold and no second dialog;
 * the stamp plays after the commit. "Go back" comes first in the reading
 * order, so a key press carried over from the press that opened this cannot
 * sign it.
 */
export function SignOff({ title, route, citation, onOpenLaw, lines, notice, verb, danger, phase, result, onSign, onBack, onRetrySave, onOpenRecord }: SignOffProps) {
  return (
    <Column gap="md" role="region" aria-label={title ? `Sign-off: ${title}` : "Sign-off"}>
      {notice ? (
        <Surface level="raised" pad="md" accentEdge="warning">
          <Row gap="sm" top>
            <Icon name="caution" size={20} tone="warningInk" />
            <Text variant="body" flex={1}>
              {notice}
            </Text>
          </Row>
        </Surface>
      ) : null}
      <Column gap="2xs">
        {title ? (
          <Text variant="title" role="heading" aria-level={3}>
            {title}
          </Text>
        ) : null}
        <Row gap="xs" top>
          <Icon name="dispatch" size={16} tone="colorSecondary" />
          <Text variant="label" tone="secondary" flex={1}>
            {route}
          </Text>
        </Row>
      </Column>
      {citation ? <LegalCitation citation={citation} {...(onOpenLaw ? { onPress: onOpenLaw } : {})} /> : null}
      <TermLines lines={lines} />
      {phase === "ready" ? (
        <Row gap="sm" wrap justifyContent="flex-end">
          <Button kind="secondary" onPress={onBack}>
            Go back
          </Button>
          <Button kind={danger ? "danger" : "primary"} icon="sign" onPress={onSign}>
            {verb}
          </Button>
        </Row>
      ) : (
        <Column gap="md">
          <Outcome result={phase === "result" ? result : undefined} {...(onRetrySave ? { onRetrySave } : {})} {...(onOpenRecord ? { onOpenRecord } : {})} />
          {phase === "result" ? (
            <Button kind="secondary" onPress={onBack}>
              Back to your drafts
            </Button>
          ) : null}
        </Column>
      )}
    </Column>
  );
}
