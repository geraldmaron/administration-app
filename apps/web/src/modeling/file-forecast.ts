import type { Campaign, EffectPacket } from "@admin/engine";
import type { CampaignStore } from "@admin/player-core";

// A staff forecast is filed after the act it was made for, never before: the
// act is committed against the campaign it was priced on, and a forecast
// packet ahead of it would make that act stale. So the packet waits here until
// the store publishes a campaign whose ledger has grown in the same week, then
// goes on the Record behind the act. If the week moves on first, the act never
// landed and the forecast is dropped.

type Pending = { readonly packet: EffectPacket; readonly ledger: number; readonly turn: number };

let pending: Pending | undefined;
const watched = new WeakSet<CampaignStore>();

function watch(store: CampaignStore): void {
  if (watched.has(store)) return;
  watched.add(store);
  store.subscribe(() => {
    const state = store.getState();
    if (!pending || state.status !== "ready") return;
    const { campaign } = state;
    if (campaign.turn !== pending.turn) {
      pending = undefined;
      return;
    }
    if (campaign.ledger.length <= pending.ledger) return;
    const { packet } = pending;
    pending = undefined;
    store.commit(packet).catch((error: unknown) => console.warn("The forecast could not be filed", error));
  });
}

/** Holds a forecast until the authorized act lands, then files it on the Record. */
export function fileForecastAfterAct(store: CampaignStore, campaign: Campaign, packet: EffectPacket): void {
  pending = { packet, ledger: campaign.ledger.length, turn: campaign.turn };
  watch(store);
}

/** Forgets a held forecast whose act was canceled or refused, so it never files behind a later act. */
export function dropPendingForecast(): void {
  pending = undefined;
}

/** Whether a forecast is waiting for its act; for tests of the authorize path. */
export function hasPendingForecast(): boolean {
  return pending !== undefined;
}

/** Holds a placeholder forecast without a store to watch; for tests of the authorize path. */
export function setPendingForecastForTest(): void {
  pending = { packet: { kind: "test" } as unknown as EffectPacket, ledger: 0, turn: 0 };
}
