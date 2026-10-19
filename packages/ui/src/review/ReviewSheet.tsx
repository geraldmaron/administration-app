import { Sheet } from "../layers/Sheet";
import { Icon } from "../icons/Icon";
import { Button } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import { Stages, type StageView } from "./Stages";
import type { ReviewPhase, ReviewResultView, ReviewTermsView } from "./types";

export type ReviewSheetProps = {
  readonly phase: ReviewPhase | "closed";
  readonly terms: ReviewTermsView | undefined;
  readonly result?: ReviewResultView;
  readonly onConfirm: () => void;
  /** Cancels a review that is ready; hides one that is resolving or done. */
  readonly onClose: () => void;
  /** Present where the app can open the Record entry the act wrote. */
  readonly onOpenRecord?: (eventId: string) => void;
};

function leadOf(phase: ReviewPhase, tier: ReviewTermsView["tier"], result: ReviewResultView | undefined): string {
  if (phase === "result") return result?.kind === "refused" ? "This didn't go through." : result?.kind === "unread" ? "This went through." : "This is done.";
  if (phase === "resolving") return "Confirmed. This is going through now.";
  return tier === "full" ? "Read this over carefully. Nothing happens until you confirm." : "Check the details. Nothing happens until you confirm.";
}

function stagesOf(result: ReviewResultView | undefined): readonly StageView[] {
  const applied = !result ? "now" : result.kind === "refused" ? "ended" : "done";
  const saved = result?.kind !== "applied" ? "ahead" : result.saveError ? "ended" : "done";
  return [
    { id: "reviewed", label: "Reviewed", state: "done" },
    { id: "confirmed", label: "Confirmed", state: "done" },
    { id: "applied", label: "Carried out", state: applied, ...(result?.kind === "applied" ? { note: result.date } : {}) },
    { id: "saved", label: "Saved on this device", state: saved },
  ];
}

function Terms({ terms }: { readonly terms: ReviewTermsView }) {
  if (terms.lines.length === 0) return null;
  return (
    <Surface level="sunken" pad="md" role="list" aria-label="The details">
      <Column gap="sm">
        {terms.lines.map((line) => (
          <Column key={line.label} gap="2xs" role="listitem">
            <Text variant="eyebrow" tone="secondary">
              {line.label}
            </Text>
            <Text variant="body">{line.value}</Text>
          </Column>
        ))}
      </Column>
    </Surface>
  );
}

function Progress({ result }: { readonly result: ReviewResultView | undefined }) {
  return (
    <Column gap="sm" aria-live="polite">
      <Stages label="Progress" stages={stagesOf(result)} vertical />
      {result && result.kind !== "applied" ? (
        <Text variant="body" tone={result.kind === "refused" ? "danger" : "warning"}>
          {result.words}
        </Text>
      ) : null}
      {result?.kind === "applied" && result.saveError ? (
        <Text variant="body" tone="warning">{`This went through, but your game wasn't saved. ${result.saveError} You can try saving again from Settings. Saving again won't make this happen twice.`}</Text>
      ) : null}
    </Column>
  );
}

function Foot({ phase, terms, result, onConfirm, onClose, onOpenRecord }: Omit<ReviewSheetProps, "phase" | "terms"> & { readonly phase: ReviewPhase; readonly terms: ReviewTermsView }) {
  if (phase === "ready") {
    return (
      <Row gap="sm" wrap justifyContent="flex-end">
        <Button kind="secondary" onPress={onClose}>
          Go back
        </Button>
        <Button kind={terms.danger ? "danger" : "primary"} icon="sign" onPress={onConfirm}>
          {terms.verb}
        </Button>
      </Row>
    );
  }
  const eventId = result?.kind === "applied" ? result.eventId : undefined;
  return (
    <Row gap="sm" wrap justifyContent="flex-end">
      {eventId && onOpenRecord ? (
        <Button kind="secondary" icon="record" onPress={() => onOpenRecord(eventId)}>
          See it in the Record
        </Button>
      ) : null}
      <Button kind="primary" onPress={onClose}>
        {phase === "resolving" ? "Hide this while it finishes" : "Close"}
      </Button>
    </Row>
  );
}

/**
 * The one presidential review (DECISIONS §8.9): the terms as the screen
 * offered them, a named confirmation drawn as danger for a forceful or
 * irreversible act, then the act's real progress and its result. The confirm
 * control is never the first focus, so an Enter carried over from the press
 * that opened the review cannot confirm it.
 */
export function ReviewSheet({ phase, terms, result, onConfirm, onClose, onOpenRecord }: ReviewSheetProps) {
  const open = phase !== "closed" && terms !== undefined;
  return (
    <Sheet open={open} onClose={onClose} title={terms?.title ?? ""} eyebrow={terms?.tier === "full" ? "Presidential review" : "Confirmation"} footer={open ? <Foot phase={phase} terms={terms} result={result} onConfirm={onConfirm} onClose={onClose} {...(onOpenRecord ? { onOpenRecord } : {})} /> : null}>
      {open ? (
        <Column gap="md">
          <Text variant="label" tone={phase === "result" && result?.kind === "refused" ? "danger" : "secondary"}>
            {leadOf(phase, terms.tier, result)}
          </Text>
          <Terms terms={terms} />
          {phase === "ready" && terms.tier === "full" ? (
            <Surface level="raised" pad="md" accentEdge={terms.danger ? "danger" : "gold"}>
              <Row gap="sm" top>
                <Icon name="sign" size={24} tone={terms.danger ? "danger" : "gold"} />
                <Column flex={1} gap="2xs">
                  <Text variant="label">Your approval</Text>
                  <Text variant="body" tone="secondary">
                    {terms.danger ? "This is a serious step. Read the details and what could go wrong before you confirm." : "When you confirm, you're approving this exactly as it's described above."}
                  </Text>
                </Column>
              </Row>
            </Surface>
          ) : null}
          {phase === "resolving" || phase === "result" ? <Progress result={phase === "result" ? result : undefined} /> : null}
        </Column>
      ) : null}
    </Sheet>
  );
}
