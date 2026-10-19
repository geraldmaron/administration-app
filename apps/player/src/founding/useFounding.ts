import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FoundingRejection } from "@admin/engine";
import { FOUNDING_STAGE_IDS, leaderStageFor, routeRejections, type FoundingStageId, type RoutedRejection } from "@admin/player-core";
import { openingDraft, type FoundingDraft, type ResolvedFounding } from "./draft";
import { previewOath, refusalsOf, resolveDraft, type OathPreview } from "./seal";
import { readableSeed } from "./seed";

// The founding screen's state: the draft, the stage, the shortlists the draft
// opens, and, on the oath stage, the campaign it would seal. A preview is a
// whole seal, so it is read only on the oath stage, a beat after the last
// change, and only the newest answer is kept.

const PREVIEW_DELAY_MS = 120;

export type OathState =
  | { readonly status: "idle" }
  | { readonly status: "reading" }
  | { readonly status: "read"; readonly draft: FoundingDraft; readonly preview: OathPreview }
  | { readonly status: "failed"; readonly message: string };

export type Founding = {
  readonly draft: FoundingDraft;
  readonly update: (change: (draft: FoundingDraft) => FoundingDraft) => void;
  readonly resolved: ResolvedFounding;
  readonly routed: readonly RoutedRejection[];
  readonly stage: FoundingStageId;
  readonly goTo: (stage: FoundingStageId) => void;
  readonly oath: OathState;
  /** The preview, only while it still describes the draft as it stands. */
  readonly currentPreview: OathPreview | undefined;
};

function useOathPreview(draft: FoundingDraft, active: boolean): OathState {
  const [state, setState] = useState<OathState>({ status: "idle" });
  const ask = useRef(0);
  useEffect(() => {
    if (!active) return;
    const mine = ++ask.current;
    setState({ status: "reading" });
    const timer = setTimeout(() => {
      try {
        const preview = previewOath(draft);
        if (mine === ask.current) setState({ status: "read", draft, preview });
      } catch (cause) {
        if (mine === ask.current) setState({ status: "failed", message: cause instanceof Error ? cause.message : String(cause) });
      }
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, active]);
  return state;
}

export function useFounding(): Founding {
  const [draft, setDraft] = useState<FoundingDraft>(() => openingDraft(readableSeed()));
  const [stage, setStage] = useState<FoundingStageId>(FOUNDING_STAGE_IDS[0]);
  const resolved = useMemo(() => resolveDraft(draft), [draft]);
  const refusals = useMemo<readonly FoundingRejection[]>(() => refusalsOf(draft, resolved), [draft, resolved]);
  const routed = useMemo(
    () => routeRejections(refusals, { departments: resolved.seats.departments.map((role) => role as string), leaderStage: leaderStageFor(draft.leader) }),
    [refusals, resolved.seats.departments, draft.leader],
  );
  const oath = useOathPreview(draft, stage === "oath");
  const update = useCallback((change: (current: FoundingDraft) => FoundingDraft) => setDraft(change), []);
  const currentPreview = oath.status === "read" && oath.draft === draft ? oath.preview : undefined;
  return { draft, update, resolved, routed, stage, goTo: setStage, oath, currentPreview };
}
