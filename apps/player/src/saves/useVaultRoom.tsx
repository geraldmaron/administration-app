import { useCallback, useState, type ReactElement } from "react";
import { isVaultFull, replacementCandidates, type CampaignStore, type ReplacementCandidate } from "@admin/player-core";
import { writeSaveFile } from "../library/save-file";
import { ReplaceSlotSheet } from "./ReplaceSlotSheet";

const words = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

export type RoomRequest = {
  /** What completes once a slot is free, as a verb phrase for the confirmation: "take the oath". */
  readonly then: string;
  /** The vault was full and the chooser is now open; the caller holds its own state until a callback fires. */
  readonly onWaiting?: () => void;
  /** The player closed the chooser; nothing was deleted and nothing ran. */
  readonly onCanceled?: () => void;
  /** The chosen slot is deleted and the action is running again. */
  readonly onResumed?: () => void;
  /** The retried action finished, or failed after the slot was already given up. */
  readonly onSettled?: (error?: Error) => void;
};

type Offer = {
  readonly request: RoomRequest;
  readonly action: () => Promise<void>;
  readonly candidates: readonly ReplacementCandidate[];
};

export type VaultRoom = {
  readonly run: (action: () => Promise<void>, request: RoomRequest) => Promise<"done" | "waiting">;
  readonly sheet: ReactElement;
};

/**
 * Wraps an action that needs a free slot. It runs the action; if the vault
 * refuses because it is full it opens the chooser instead of failing, and on
 * confirmation deletes the chosen administration and runs the same action once
 * more. The action is the caller's own closure, so a pending founding draft or
 * a file already read from disk is exactly as the player left it.
 */
export function useVaultRoom(store: CampaignStore | null): VaultRoom {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<void>, request: RoomRequest): Promise<"done" | "waiting"> => {
      try {
        await action();
        return "done";
      } catch (cause) {
        if (!store || !isVaultFull(cause)) throw cause;
        const { campaigns, activeCampaignId } = await store.saves.list();
        setError(null);
        setOffer({
          request,
          action,
          candidates: replacementCandidates(campaigns, activeCampaignId),
        });
        request.onWaiting?.();
        return "waiting";
      }
    },
    [store],
  );

  const cancel = useCallback(() => {
    const was = offer;
    setOffer(null);
    setError(null);
    was?.request.onCanceled?.();
  }, [offer]);

  const exportCopy = useCallback(
    async (candidate: ReplacementCandidate) => {
      if (!store) return;
      setError(null);
      try {
        await writeSaveFile(candidate.name, await store.saves.exportSave(candidate.id));
      } catch (cause) {
        setError(`We couldn't save a copy of “${candidate.name}”, so nothing was deleted. ${words(cause)}`);
        throw cause;
      }
    },
    [store],
  );

  const replace = useCallback(
    (candidate: ReplacementCandidate) => {
      if (!store || !offer || busy) return;
      setBusy(true);
      setError(null);
      const { request, action } = offer;
      void (async () => {
        try {
          await store.discard(candidate.id);
        } catch (cause) {
          setError(`We couldn't remove “${candidate.name}”, so nothing was changed. ${words(cause)}`);
          setBusy(false);
          return;
        }
        request.onResumed?.();
        setOffer(null);
        setBusy(false);
        try {
          await action();
          request.onSettled?.();
        } catch (cause) {
          request.onSettled?.(new Error(`“${candidate.name}” was removed to make room, but ${request.then} did not finish. ${words(cause)}`));
        }
      })();
    },
    [store, offer, busy],
  );

  const sheet = (
    <ReplaceSlotSheet
      open={offer !== null}
      candidates={offer?.candidates ?? []}
      then={offer?.request.then ?? ""}
      busy={busy}
      error={error}
      onCancel={cancel}
      onExport={exportCopy}
      onReplace={replace}
    />
  );
  return { run, sheet };
}
