import { useEffect, useMemo, useState } from "react";
import { candidateStanding, defaultReplacementId, replacementSentence, type ReplacementCandidate } from "@admin/player-core";
import { Button, Column, Row, Sheet, Surface, Tag, Text } from "@admin/ui";
import { ChoiceList, type ChoiceOption } from "@admin/ui/forms";
import { SAVE_FILES_SUPPORTED } from "../library/save-file";

export type ReplaceSlotSheetProps = {
  readonly open: boolean;
  readonly candidates: readonly ReplacementCandidate[];
  /** What the player was doing, as a verb phrase: "take the oath", "open the imported save". */
  readonly then: string;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onExport: (candidate: ReplacementCandidate) => Promise<void>;
  readonly onReplace: (candidate: ReplacementCandidate) => void;
};

const lastSaved = (savedAt: number | null): string =>
  savedAt === null
    ? "not saved yet"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(savedAt);

function optionOf(candidate: ReplacementCandidate): ChoiceOption<string> {
  const detail = candidate.unplayable
    ? "This save can't be opened, so replacing it won't cost you anything you can still play."
    : `${candidate.leader} · in office ${candidate.dateLabel} · last saved ${lastSaved(candidate.savedAt)}`;
  return {
    value: candidate.id,
    label: `${candidate.name} · ${candidateStanding(candidate)}`,
    detail,
  };
}

function Confirm({
  candidate,
  then,
  copyKept,
  busy,
  error,
  onBack,
  onExport,
}: {
  readonly candidate: ReplacementCandidate;
  readonly then: string;
  readonly copyKept: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onBack: () => void;
  readonly onExport: () => void;
}) {
  return (
    <Column gap="md">
      <Surface level="sunken" pad="md" accentEdge="danger" role="alert">
        <Column gap="sm">
          {candidate.inPlay ? (
            <Tag tone="danger" icon="caution">
              The presidency you're playing now
            </Tag>
          ) : null}
          <Text variant="body">{replacementSentence(candidate, { then, copyKept })}</Text>
        </Column>
      </Surface>
      {error ? (
        <Text variant="body" tone="danger" role="alert">
          {error}
        </Text>
      ) : null}
      <Row gap="sm" wrap>
        {SAVE_FILES_SUPPORTED && candidate.exportable ? (
          <Button icon="folder" disabled={busy} onPress={onExport} testID="replace-export">
            {copyKept ? "Save another copy" : "Export a copy first"}
          </Button>
        ) : null}
        <Button kind="quiet" disabled={busy} onPress={onBack}>
          Choose a different one
        </Button>
      </Row>
      <Text variant="caption" tone="secondary">
        {copyKept
          ? "A copy is in your downloads. When there's room, you can import it from Your administrations and keep playing."
          : SAVE_FILES_SUPPORTED && candidate.exportable
            ? "A copy is a file saved to your downloads. You can import it later and keep playing."
            : "This save can't be read, so there's nothing to copy."}
      </Text>
    </Column>
  );
}

/**
 * The chooser for a full vault: every saved administration, the safest one
 * preselected, then a confirmation that names what will be lost. Cancel leaves
 * every save exactly as it was and returns the player to what they were doing.
 */
export function ReplaceSlotSheet({ open, candidates, then, busy, error, onCancel, onExport, onReplace }: ReplaceSlotSheetProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  // A replacement that completes closes the sheet from outside, so the next offer must not open on a stale confirmation.
  useEffect(() => {
    if (open) return;
    setConfirming(false);
    setPicked(null);
    setKept(new Set());
  }, [open]);
  const choice = picked ?? defaultReplacementId(candidates);
  const candidate = candidates.find((entry) => entry.id === choice);
  const options = useMemo(() => candidates.map(optionOf), [candidates]);
  const exportCopy = () => {
    if (candidate)
      void onExport(candidate).then(
        () => setKept((was) => new Set(was).add(candidate.id)),
        () => undefined,
      );
  };
  const close = () => {
    setConfirming(false);
    setPicked(null);
    onCancel();
  };
  return (
    <Sheet
      open={open}
      onClose={busy ? () => undefined : close}
      eyebrow="All save slots are full"
      title={confirming ? "Replace this presidency?" : "Which presidency gives up its slot?"}
      footer={
        <Row gap="sm" wrap>
          {confirming && candidate ? (
            <Button kind="danger" size="large" disabled={busy} onPress={() => onReplace(candidate)} testID="replace-confirm">
              {busy ? "Replacing…" : candidate.inPlay ? "Replace the presidency you're playing" : `Replace and ${then}`}
            </Button>
          ) : (
            <Button kind="primary" size="large" disabled={!candidate} onPress={() => setConfirming(true)} testID="replace-continue">
              Continue
            </Button>
          )}
          <Button kind="quiet" disabled={busy} onPress={close} testID="replace-cancel">
            Cancel
          </Button>
        </Row>
      }
    >
      {confirming && candidate ? (
        <Confirm
          candidate={candidate}
          then={then}
          copyKept={kept.has(candidate.id)}
          busy={busy}
          error={error}
          onBack={() => setConfirming(false)}
          onExport={exportCopy}
        />
      ) : (
        <Column gap="md">
          <Text variant="body" tone="secondary">
            This device already has {candidates.length} saved presidencies, which is the most it can keep. To {then}, you'll need to replace one. Nothing is deleted until you confirm on the next screen.
          </Text>
          <ChoiceList label="Saved presidencies" legendHidden minCardWidth={400} options={options} value={choice ?? undefined} onChange={setPicked} />
        </Column>
      )}
    </Sheet>
  );
}
