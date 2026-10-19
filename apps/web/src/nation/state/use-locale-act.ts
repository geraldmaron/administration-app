import type { Campaign } from "@admin/engine";
import type { LocaleActOption } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { useAuthorize } from "../../app/use-authorize";

/** What was done, kept beside the receipt so it is said from the commit, not re-read off a board that has moved. */
export type LocaleDone = {
  readonly option: LocaleActOption;
  readonly date: string;
  readonly before: Campaign;
  readonly after: Campaign;
  readonly eventId?: string;
  readonly saveError?: string;
};

/**
 * Commits a locale act's packet against the campaign it was priced on, so a
 * press after the week has moved is refused rather than charged a price
 * nobody was shown, and records the change for the delta lens.
 */
export function useLocaleAct(campaign: Campaign, state: StateId, onDone: (done: LocaleDone) => void) {
  const { busy, problem, authorize } = useAuthorize(campaign);

  async function take(option: LocaleActOption): Promise<void> {
    // A state's own acts are routine plays: a short confirmation, no scan.
    const authorized = await authorize(() => {
      if (!option.packet) throw new Error(option.locked ?? "This act cannot be taken now.");
      return { packet: option.packet };
    }, { tier: "confirm", title: option.name, lines: [{ label: "What it does", value: option.summary }, { label: "Cost", value: option.costText }] }, { camera: `state:${state}`, selection: `state:${state}` });
    if (!authorized) return;
    onDone({
      option,
      date: authorized.date,
      before: authorized.before,
      after: authorized.after,
      ...(authorized.eventId ? { eventId: authorized.eventId } : {}),
      ...(authorized.saveError ? { saveError: authorized.saveError } : {}),
    });
  }

  return { busy, problem, take };
}
