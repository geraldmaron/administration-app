import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Campaign } from "@admin/engine";
import { DRAFT_AUTHORITY_LABEL, draftGroups, formatDate, type DraftAuthority, type DraftEntry, type OpenReview } from "@admin/player-core";
import { Sheet, Text, type IconName } from "@admin/ui";
import { DraftsButton, DraftsTray, SignOff, type DraftItemView, type ReviewPhase, type ReviewResultView } from "@admin/ui/review";
import { useCampaignStore, useDraftState, useDraftStore } from "../device/hooks";
import { refusalWords } from "./advance";
import { go } from "./navigate";

// The tray the command bar opens: every draft by the authority that would act
// on it, and the sign-off for one at a time inside the same sheet, so the
// review, the press and the stamp happen in one place and nothing stacks.

const GROUP_ICON: Readonly<Record<DraftAuthority, IconName>> = { "on-signing": "sign", congress: "subjectChamber", senate: "subjectChamber" };

/** Asks the tray to open, at one draft's sign-off when a subject is given; a screen with a draft's verb uses this rather than a second review. */
let request: { readonly subject?: string; readonly at: number } | null = null;
const requestListeners = new Set<() => void>();
export function openDrafts(subject?: string): void {
  request = { ...(subject ? { subject } : {}), at: Date.now() };
  for (const listener of requestListeners) listener();
}
function subscribeRequests(listener: () => void): () => void {
  requestListeners.add(listener);
  return () => requestListeners.delete(listener);
}

type Signing = { readonly review: OpenReview; readonly phase: ReviewPhase; readonly result?: ReviewResultView };

function itemOf(entry: { readonly subject: string; readonly preview: DraftEntry["preview"]; readonly stale: boolean; readonly signing?: DraftEntry["signing"] }): DraftItemView {
  const { preview } = entry;
  return {
    id: entry.subject,
    subject: preview.subject,
    was: preview.was,
    now: preview.now,
    effect: preview.effect,
    effectTone: preview.effectTone,
    stale: entry.stale,
    state: !entry.signing ? "pending" : entry.signing.saveError ? "unsaved" : "signing",
    ...(entry.signing?.saveError ? { saveError: entry.signing.saveError } : {}),
  };
}

const STALE_NOTICE = "Things changed since you drafted this, so it was priced again on how things stand today. Read the terms below before you sign.";

export function DraftsControl({ campaign }: { readonly campaign: Campaign }) {
  const store = useCampaignStore();
  const drafts = useDraftStore();
  const { drafts: list, saveError } = useDraftState();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [signing, setSigning] = useState<Signing | undefined>(undefined);
  const inFlight = useRef(false);
  const asked = useSyncExternalStore(subscribeRequests, () => request, () => request);

  const review = (subject: string) => {
    setProblem("");
    const opened = drafts.review(subject);
    if (!opened.ok) {
      setProblem(opened.reason);
      return;
    }
    setSigning({ review: opened, phase: "ready" });
  };

  useEffect(() => {
    if (!asked) return;
    // Taken once: a bar mounted again (a phone turned, a new width) must not reopen a tray that was closed.
    request = null;
    setOpen(true);
    setSigning(undefined);
    if (asked.subject) review(asked.subject);
    // Each request is answered once, when it arrives; review reads the store, not render state.
  }, [asked]);

  const sign = async () => {
    if (!signing || signing.phase !== "ready" || inFlight.current) return;
    inFlight.current = true;
    const { review: opened } = signing;
    setSigning({ review: opened, phase: "resolving" });
    try {
      const receipt = await drafts.sign(opened);
      const after = store.getState();
      const date = after.status === "ready" ? formatDate(after.campaign.calendar) : formatDate(opened.basis.calendar);
      const eventId = receipt.eventIds.at(-1);
      setSigning({ review: opened, phase: "result", result: { kind: "applied", date, ...(eventId ? { eventId } : {}), ...(receipt.persisted ? {} : { saveError: receipt.saveError ?? "The device didn't say why." }) } });
    } catch (cause) {
      setSigning({ review: opened, phase: "result", result: { kind: "refused", words: refusalWords(cause, opened.basis, store.getState()) } });
    } finally {
      inFlight.current = false;
    }
  };

  const retrySave = async (subject: string) => {
    const receipt = await drafts.retrySave(subject);
    if (!receipt.persisted) {
      setProblem(`Still not saved. ${receipt.saveError ?? ""}`.trim());
      return;
    }
    setProblem("");
    if (signing?.result?.kind === "applied") setSigning({ ...signing, result: { kind: "applied", date: signing.result.date, ...(signing.result.eventId ? { eventId: signing.result.eventId } : {}) } });
  };

  const close = () => {
    if (signing?.phase === "resolving") return;
    setOpen(false);
    setSigning(undefined);
    setProblem("");
  };

  const groups = draftGroups(list, campaign).map((group) => ({ authority: group.authority, label: group.label, icon: GROUP_ICON[group.authority], items: group.items.map(itemOf) }));
  const count = list.filter((entry) => !entry.signing || entry.signing.saveError).length;
  const draft = signing?.review.draft;

  return (
    <>
      <DraftsButton count={count} onPress={() => setOpen(true)} />
      <Sheet open={open} onClose={close} title={draft ? draft.preview.title : "Drafts"} eyebrow={draft ? `Sign-off · ${DRAFT_AUTHORITY_LABEL[draft.authority]}` : count === 0 ? "Nothing to sign" : `${count} waiting to be signed`} detents>
        {problem ? (
          <Text variant="body" tone="danger" role="alert">
            {problem}
          </Text>
        ) : null}
        {signing && draft ? (
          <SignOff
            title={draft.preview.subject === draft.preview.title ? undefined : draft.preview.subject}
            route={draft.preview.route}
            {...(draft.preview.citation ? { citation: { cite: draft.preview.citation.cite, title: draft.preview.citation.title } } : {})}
            lines={draft.preview.steps}
            {...(signing.review.stale ? { notice: STALE_NOTICE } : {})}
            verb={draft.preview.verb}
            phase={signing.phase}
            {...(signing.result ? { result: signing.result } : {})}
            onSign={() => void sign()}
            onBack={() => setSigning(undefined)}
            onRetrySave={() => void retrySave(draft.subject)}
            onOpenRecord={(eventId) => {
              close();
              go(`/record/event/${encodeURIComponent(eventId)}`);
            }}
          />
        ) : (
          <DraftsTray groups={groups} onReview={review} onDiscard={(subject) => void drafts.discard(subject)} onRetrySave={(subject) => void retrySave(subject)} {...(saveError ? { saveError } : {})} />
        )}
      </Sheet>
    </>
  );
}
