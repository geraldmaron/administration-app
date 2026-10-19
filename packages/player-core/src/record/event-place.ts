import type { ActionRecord, Campaign } from "@admin/engine";
import { cityPlace, settlementPlace, placeAt, stateById, type NationId, type StateId } from "@admin/world";

/** Where an entry happened, as the map frames it, and the point a pulse is drawn at. */
export type EventPlace = {
  /** The map's framing for the entry: its first US state, else its first government, else the country. */
  readonly camera: string;
  readonly selection?: string;
  /** The place in words and its point, where the entry has a place of its own. */
  readonly pin?: { readonly where: string; readonly lon: number; readonly lat: number };
  /** The state or government the entry is about, for the timeline's subject filter. */
  readonly subject?: { readonly id: string; readonly label: string };
};

function placed(ref: string, label: string, place: ReturnType<typeof placeAt>): EventPlace {
  return {
    camera: ref,
    selection: ref,
    ...(place ? { pin: { where: place.name, lon: place.lon, lat: place.lat } } : {}),
    subject: { id: ref, label },
  };
}

/**
 * The first place the entry's causal stamp names: a US state, else a
 * government other than the President's own, else nowhere in particular and
 * the country is framed. Read off the stamp, never searched for in prose. The
 * pin stands on the stamp's own city when it names one inside that state or
 * government, which is where a decision's briefing was datelined, and on the
 * state's or government's seat otherwise.
 */
export function eventPlace(campaign: Campaign, entry: ActionRecord): EventPlace {
  const ids = [...(entry.causal?.locales ?? []), ...(entry.causal?.entities ?? [])];
  const city = ids.map((id) => cityPlace(id)).find((place) => place !== undefined);
  const settlement = ids.map((id) => settlementPlace(id)).find((place) => place !== undefined);
  const state = ids.find((id) => stateById.has(id as never)) ?? settlement?.state;
  if (state) {
    const pin = settlement?.state === state ? settlement : city?.state === state ? city : placeAt({ nation: campaign.founding.nation, state: state as StateId });
    return placed(`state:${state}`, stateById.get(state as never)?.name ?? state, pin);
  }
  const nation = ids.find((id) => id !== campaign.founding.nation && campaign.nations[id as keyof Campaign["nations"]] !== undefined);
  if (nation) {
    const name = campaign.nations[nation as keyof Campaign["nations"]]?.base.identity.name ?? nation;
    return placed(`nation:${nation}`, name, city?.nation === nation ? city : placeAt({ nation: nation as NationId }));
  }
  return { camera: "us" };
}
