import { cityPlace, settlementPlace, placeAt, stateById } from "@admin/world";
function placed(ref, label, place) {
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
export function eventPlace(campaign, entry) {
    const ids = [...(entry.causal?.locales ?? []), ...(entry.causal?.entities ?? [])];
    const city = ids.map((id) => cityPlace(id)).find((place) => place !== undefined);
    const settlement = ids.map((id) => settlementPlace(id)).find((place) => place !== undefined);
    const state = ids.find((id) => stateById.has(id)) ?? settlement?.state;
    if (state) {
        const pin = settlement?.state === state ? settlement : city?.state === state ? city : placeAt({ nation: campaign.founding.nation, state: state });
        return placed(`state:${state}`, stateById.get(state)?.name ?? state, pin);
    }
    const nation = ids.find((id) => id !== campaign.founding.nation && campaign.nations[id] !== undefined);
    if (nation) {
        const name = campaign.nations[nation]?.base.identity.name ?? nation;
        return placed(`nation:${nation}`, name, city?.nation === nation ? city : placeAt({ nation: nation }));
    }
    return { camera: "us" };
}
