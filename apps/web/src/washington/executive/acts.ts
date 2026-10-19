import type { Campaign, EffectPacket } from "@admin/engine";
import { useAuthorize, type ActReview } from "../../app/use-authorize";

/** What an act on a chair or a person did, kept beside its receipt so it is said from the commit, not re-read off a board that has moved. */
export type ChairActDone = {
  readonly title: string;
  readonly date: string;
  readonly before: Campaign;
  readonly after: Campaign;
  readonly eventId?: string;
  readonly saveError?: string;
  readonly camera: string;
  /** What the act set, as the receipt lists it. */
  readonly lines: readonly { readonly label: string; readonly value: string }[];
};

/** The engine's answer to an act: its packet, or the refusal in the engine's own words. */
export type ActBuild = { readonly ok: true; readonly packet: EffectPacket } | { readonly ok: false; readonly reason: string };

/**
 * One commit path for every act on the Washington screens. Each act is built
 * by its engine entry point against the campaign the screen showed and
 * committed with that campaign as its `basis`, so a press on a board that has
 * moved is refused rather than charged a price nobody quoted. The change is
 * recorded for the delta lens and the receipt reads what the commit returned.
 */
export function useChairActs(campaign: Campaign, camera: string, onDone: (done: ChairActDone) => void) {
  const { busy, problem, authorize } = useAuthorize(campaign);

  async function run(title: string, build: () => ActBuild, review: ActReview, lines: ChairActDone["lines"] = []): Promise<void> {
    const authorized = await authorize(() => {
      const built = build();
      if (!built.ok) throw new Error(built.reason);
      return { packet: built.packet };
    }, { title, lines, ...review }, { camera });
    if (!authorized) return;
    onDone({
      title,
      date: authorized.date,
      before: authorized.before,
      after: authorized.after,
      camera,
      lines,
      ...(authorized.eventId ? { eventId: authorized.eventId } : {}),
      ...(authorized.saveError ? { saveError: authorized.saveError } : {}),
    });
  }

  return { busy, problem, run };
}
