import { useState } from "react";
import type { Campaign } from "@admin/engine";
import type { ActBuild, BuiltLine, TariffPackageBuild } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { useAuthorize, type ActReview } from "../../review/use-authorize";

/** What was done, kept beside its receipt so it is said from the commit and not re-read off a board that has moved. */
export type ActDone = {
  readonly title: string;
  readonly date: string;
  readonly before: Campaign;
  readonly after: Campaign;
  readonly lines: readonly BuiltLine[];
  readonly outcome?: "refused";
  readonly eventId?: string;
  readonly saveError?: string;
};

/**
 * Commits an act's packet against the campaign it was priced on, so a press
 * after the week has moved is refused rather than charged a price nobody was
 * shown. The packet is built at press time from that same campaign; a refusal
 * is thrown in the engine's words before any review opens.
 */
export function useActCommit(campaign: Campaign, nation: NationId) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const [done, setDone] = useState<ActDone | undefined>(undefined);
  async function take(build: () => ActBuild | TariffPackageBuild, review: ActReview & { readonly title: string }): Promise<void> {
    const authorized = await authorize(
      () => {
        const built = build();
        if (!built.ok) throw new Error(built.reason);
        return built;
      },
      review,
      { camera: `nation:${nation}`, selection: `nation:${nation}` },
    );
    if (!authorized) return;
    const built = authorized.built;
    setDone({
      title: built.title,
      date: authorized.date,
      before: authorized.before,
      after: authorized.after,
      lines: built.lines,
      ...("outcome" in built && built.outcome ? { outcome: built.outcome } : {}),
      ...(authorized.eventId ? { eventId: authorized.eventId } : {}),
      ...(authorized.saveError ? { saveError: authorized.saveError } : {}),
    });
  }
  return { busy, problem, done, take };
}

export type ActCommit = ReturnType<typeof useActCommit>;
